import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../lib/date-utils';
import { router } from 'expo-router';

type NotificationItemProps = {
  type: 'like' | 'comment' | 'follow' | 'event' | 'challenge';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  data: any;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  onPress: () => void;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return 'heart';
    case 'comment':
      return 'comment-text';
    case 'follow':
      return 'account-plus';
    case 'event':
      return 'calendar';
    case 'challenge':
      return 'trophy';
    default:
      return 'bell';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'like':
      return '#ff4444';
    case 'comment':
      return '#1d9bf0';
    case 'follow':
      return '#794bc4';
    case 'event':
      return '#b0fb50';
    case 'challenge':
      return '#ffd700';
    default:
      return '#666666';
  }
};

export function NotificationItem({
  type,
  title,
  message,
  created_at,
  is_read,
  data,
  profiles,
  onPress,
}: NotificationItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, !is_read && styles.unread]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getNotificationColor(type)}20` }]}>
        <MaterialCommunityIcons
          name={getNotificationIcon(type)}
          size={24}
          color={getNotificationColor(type)}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.timestamp}>
            {formatRelativeTime(created_at)}
          </Text>
        </View>

        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        {profiles && (
          <View style={styles.profileContainer}>
            <Image
              source={{
                uri: profiles.avatar_url ||
                  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
              }}
              style={styles.avatar}
            />
            <Text style={styles.profileName}>
              {profiles.display_name}
            </Text>
          </View>
        )}
      </View>

      {!is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  unread: {
    backgroundColor: '#1a1a1a',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
  },
  message: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 20,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  profileName: {
    fontSize: 14,
    color: '#666666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#b0fb50',
    marginLeft: 8,
    alignSelf: 'center',
  },
});