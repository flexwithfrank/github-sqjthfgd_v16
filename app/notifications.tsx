import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatRelativeTime } from '../lib/date-utils';

type Notification = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'event' | 'challenge';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: any;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Add debug log for user fetch
      console.log('Fetched user:', user);
      if (userError) console.error('User fetch error:', userError);

      if (!user) {
        setLoading(false);
        setError('User not authenticated');
        return;
      }

      fetchNotifications(user.id);

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Real-time notification received:', payload);
            fetchNotifications(user.id);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    fetchUser();
  }, []);

  const fetchNotifications = async (userId: string) => {
    try {
      console.log('Fetching notifications for user:', userId);

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          title,
          message,
          is_read,
          created_at,
          data,
          user_id,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('Notifications data received:', data);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchNotifications(user.id);
      }
    };
    fetchUser();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      console.log('Marking notification as read:', notificationId);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    const data = notification.data || {};
    console.log('Handling notification press:', { type: notification.type, data });

    switch (notification.type) {
      case 'like':
      case 'comment':
        if (data.post_id) {
          router.push(`/post/${data.post_id}`);
        }
        break;
      case 'follow':
        if (data.follower_id) {
          router.push(`/profile/${data.follower_id}`);
        }
        break;
      case 'event':
        if (data.event_id) {
          router.push(`/(event)/${data.event_id}`);
        }
        break;
      case 'challenge':
        router.push('/(tabs)/challenge');
        break;
    }
  };

  const renderNotification = ({ item: notification }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.is_read && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <Image
        source={{
          uri: notification.profiles?.avatar_url ||
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
        }}
        style={styles.avatar}
      />
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        <Text style={styles.timestamp}>
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>
      {!notification.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              const fetchUser = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  fetchNotifications(user.id);
                }
              };
              fetchUser();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#b0fb50"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={48}
                color="#666666"
              />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  unreadNotification: {
    backgroundColor: '#1a1a1a',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#b0fb50',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
  },
});