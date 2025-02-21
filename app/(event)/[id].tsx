import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RSVPSheet } from '../../components/ui/RSVPSheet';

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
    display_name: string;
    avatar_url: string | null;
    role: string;
    role_verified: boolean;
  };
};

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRSVP, setShowRSVP] = useState(false);
  const [hasRSVP, setHasRSVP] = useState(false);
  const [totalAttendees, setTotalAttendees] = useState(0);

  useEffect(() => {
    fetchEvent();
    checkRSVPStatus();
    fetchAttendeeCount();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          profiles (
            display_name,
            avatar_url,
            role,
            role_verified
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const checkRSVPStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .eq('status', 'attending')
        .single();

      setHasRSVP(!!data);
    } catch (error) {
      console.error('Error checking RSVP status:', error);
    }
  };

  const fetchAttendeeCount = async () => {
    try {
      // Get all RSVPs for this event with their guest counts
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('guest_count')
        .eq('event_id', id)
        .eq('status', 'attending');

      if (error) throw error;

      // Calculate total attendees:
      // Each RSVP counts as 1 person (the person who RSVP'd) plus their guests
      const total = data.reduce((sum, rsvp) => {
        // Add 1 for the RSVP person plus their guests
        return sum + 1 + (parseInt(rsvp.guest_count) || 0);
      }, 0);

      setTotalAttendees(total);
    } catch (error) {
      console.error('Error fetching attendee count:', error);
    }
  };

  const handleShare = async () => {
    if (!event) return;

    try {
      await Share.share({
        message: `Check out ${event.title} on ${new Date(
          event.start_date
        ).toLocaleDateString()}!\n\n${event.description}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLocation = () => {
    if (!event?.location_url) return;
    Linking.openURL(event.location_url);
  };

  const handleRSVPSuccess = () => {
    setHasRSVP(true);
    fetchAttendeeCount();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Event not found'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image_url }} style={styles.image} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
            style={styles.gradient}
          />
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#ffffff"
              />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{event.title}</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleLocation}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color="#b0fb50"
              />
              <Text style={styles.locationText}>{event.location}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateTimeSection}>
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
            <View style={styles.timeDetails}>
              <Text style={styles.timeText}>
                {new Date(event.start_date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
                {' - '}
                {new Date(event.end_date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
              <Text style={styles.attendeeCount}>
                {totalAttendees} {totalAttendees === 1 ? 'person' : 'people'}{' '}
                attending
              </Text>
            </View>
          </View>

          <View style={styles.organizerSection}>
            <Image
              source={{
                uri:
                  event.profiles.avatar_url ||
                  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
              }}
              style={styles.organizerAvatar}
            />
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName}>
                Organized by {event.profiles.display_name}
              </Text>
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons
                  name={
                    event.profiles.role_verified
                      ? 'check-decagram'
                      : 'decagram-outline'
                  }
                  size={16}
                  color={event.profiles.role_verified ? '#b0fb50' : '#666666'}
                />
                <Text style={styles.verifiedText}>
                  {event.profiles.role_verified ? 'Verified' : 'Unverified'}{' '}
                  {event.profiles.role}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to Expect</Text>
            <View style={styles.highlights}>
              {event.highlights.map((highlight, index) => (
                <View key={index} style={styles.highlight}>
                  <MaterialCommunityIcons
                    name={highlight.icon as any}
                    size={24}
                    color="#b0fb50"
                  />
                  <Text style={styles.highlightText}>{highlight.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        {hasRSVP ? (
          <View style={styles.rsvpConfirmed}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#b0fb50"
            />
            <Text style={styles.rsvpConfirmedText}>
              You're attending this event
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.rsvpButton}
            onPress={() => setShowRSVP(true)}
          >
            <Text style={styles.rsvpButtonText}>RSVP Now</Text>
          </TouchableOpacity>
        )}
      </View>

      <RSVPSheet
        visible={showRSVP}
        onClose={() => setShowRSVP(false)}
        event={{
          id: event.id,
          title: event.title,
          start_date: event.start_date,
        }}
        onSuccess={() => {
          handleRSVPSuccess();
          fetchAttendeeCount();
        }}
      />
    </View>
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
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
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
    fontSize: 16,
    marginLeft: 4,
  },
  dateTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  dateBox: {
    backgroundColor: '#b0fb50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 16,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  dateMonth: {
    fontSize: 14,
    color: '#000000',
    textTransform: 'uppercase',
  },
  timeDetails: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  attendeeCount: {
    fontSize: 14,
    color: '#666666',
  },
  organizerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
  },
  highlights: {
    gap: 12,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  highlightText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#000000',
  },
  rsvpButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  rsvpButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  rsvpConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(176, 251, 80, 0.1)',
    paddingVertical: 16,
    borderRadius: 50,
    gap: 8,
  },
  rsvpConfirmedText: {
    color: '#b0fb50',
    fontSize: 16,
    fontWeight: '600',
  },
});