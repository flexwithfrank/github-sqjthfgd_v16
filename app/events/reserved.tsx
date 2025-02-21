import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

type Event = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  start_date: string;
  end_date: string;
  location: string;
  location_url: string;
  highlights: Array<{
    icon: string;
    text: string;
  }>;
};

export default function ReservedEventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReservedEvents();
  }, []);

  const fetchReservedEvents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('event_rsvps')
        .select(
          `
          events (
            id,
            title,
            description,
            image_url,
            start_date,
            end_date,
            location,
            location_url,
            highlights
          )
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'attending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract events from the nested structure
      const reservedEvents = data
        .map((rsvp) => rsvp.events)
        .filter((event) => event && new Date(event.end_date) >= new Date());

      setEvents(reservedEvents);
    } catch (error) {
      console.error('Error fetching reserved events:', error);
      setError('Failed to load your events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReservedEvents();
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/(event)/${eventId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
        <Text style={styles.loadingText}>Loading your events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            fetchReservedEvents();
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#b0fb50"
        />
      }
    >
      {events.map((event) => (
        <TouchableOpacity
          key={event.id}
          style={styles.eventCard}
          onPress={() => handleEventPress(event.id)}
        >
          <Image source={{ uri: event.image_url }} style={styles.eventImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
            style={styles.gradient}
          />

          <View style={styles.eventContent}>
            <View style={styles.eventHeader}>
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>
                  {new Date(event.start_date).getDate()}
                </Text>
                <Text style={styles.dateMonth}>
                  {new Date(event.start_date).toLocaleString('default', {
                    month: 'short',
                  })}
                </Text>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={styles.locationContainer}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={16}
                    color="#b0fb50"
                  />
                  <Text style={styles.locationText}>{event.location}</Text>
                </View>
              </View>
            </View>

            <View style={styles.highlights}>
              {event.highlights.map((highlight, index) => (
                <View key={index} style={styles.highlight}>
                  <MaterialCommunityIcons
                    name={highlight.icon as any}
                    size={20}
                    color="#b0fb50"
                  />
                  <Text style={styles.highlightText}>{highlight.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleEventPress(event.id)}
            >
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {events.length === 0 && (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="calendar-blank"
            size={48}
            color="#666666"
          />
          <Text style={styles.emptyText}>No reserved events</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/events/upcoming')}
          >
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  loadingText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#b0fb50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  eventCard: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateBox: {
    backgroundColor: '#b0fb50',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  dateMonth: {
    fontSize: 12,
    color: '#000000',
    textTransform: 'uppercase',
  },
  titleContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: '#b0fb50',
    fontSize: 14,
    marginLeft: 4,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(176, 251, 80, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  highlightText: {
    color: '#ffffff',
    fontSize: 14,
  },
  viewButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  browseButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
