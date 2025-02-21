import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { CreateEventSheet } from '../../components/ui/CreateEventSheet';

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
  created_by: string;
  profiles: {
    role: string;
    role_verified: boolean;
  };
};

export default function UpcomingEventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  useEffect(() => {
    checkUserRole();
    fetchEvents();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, role_verified')
        .eq('id', user.id)
        .single();

      setIsTrainer(profile?.role === 'trainer' && profile?.role_verified);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles (
            role,
            role_verified
          )
        `)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/(event)/${eventId}`);
  };

  const handleShare = async (event: Event) => {
    try {
      await Share.share({
        message: `Check out ${event.title} on ${new Date(event.start_date).toLocaleDateString()}!\n\n${event.description}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLocation = (locationUrl: string) => {
    Linking.openURL(locationUrl);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
        <Text style={styles.loadingText}>Loading events...</Text>
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
            fetchEvents();
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
      {isTrainer && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateSheet(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#000000" />
          <Text style={styles.createButtonText}>Create Event</Text>
        </TouchableOpacity>
      )}

      {events.map((event) => (
        <TouchableOpacity
          key={event.id}
          style={styles.eventCard}
          onPress={() => handleEventPress(event.id)}
          activeOpacity={1}
        >
          <Image
            source={{ uri: event.image_url }}
            style={styles.eventImage}
          />
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
                  {new Date(event.start_date).toLocaleString('default', { month: 'short' })}
                </Text>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => handleLocation(event.location_url)}
                >
                  <MaterialCommunityIcons name="map-marker" size={16} color="#b0fb50" />
                  <Text style={styles.locationText}>{event.location}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShare(event)}
              >
                <MaterialCommunityIcons name="share-variant" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {event.description}
            </Text>

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
              style={styles.rsvpButton}
              onPress={() => handleEventPress(event.id)}
            >
              <Text style={styles.rsvpButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {events.length === 0 && (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color="#666666" />
          <Text style={styles.emptyText}>No upcoming events</Text>
          {isTrainer && (
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => setShowCreateSheet(true)}
            >
              <Text style={styles.createFirstButtonText}>Create First Event</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <CreateEventSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSuccess={() => {
          setShowCreateSheet(false);
          fetchEvents();
        }}
      />
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b0fb50',
    margin: 16,
    padding: 16,
    borderRadius: 50,
    gap: 8,
  },
  createButtonText: {
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
    height: 300,
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: '#b0fb50',
    fontSize: 14,
    marginLeft: 4,
  },
  shareButton: {
    padding: 8,
  },
  description: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 16,
    lineHeight: 20,
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
  rsvpButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
  },
  rsvpButtonText: {
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
  createFirstButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});