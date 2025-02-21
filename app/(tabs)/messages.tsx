import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatRelativeTime } from '../../lib/date-utils';

type Conversation = {
  id: string;
  last_message: string;
  last_message_at: string;
  updated_at: string;
  participants: {
    profiles: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  }[];
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error fetching current user:', userError);
        setError('Authentication error. Please try signing in again.');
        return null;
      }

      if (user) {
        console.log('Current user ID set to:', user.id);
        setCurrentUserId(user.id);
        return user.id;
      } else {
        setError('No user found. Please sign in.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      setError('Failed to authenticate. Please try again.');
      return null;
    }
  };

  const fetchConversations = async () => {
    try {
      const userId = await fetchCurrentUser();
      if (!userId) {
        setLoading(false);
        return;
      }

      console.log('Fetching conversations for user:', userId);

      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select(
          `
          id,
          last_message,
          last_message_at,
          updated_at,
          participants:conversation_participants(
            profiles (
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `
        )
        .eq('conversation_participants.user_id', userId)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError(`Failed to load conversations: ${fetchError.message}`);
        return;
      }

      console.log(`Retrieved ${data?.length || 0} conversations from Supabase`);

      if (!data || data.length === 0) {
        console.log('No conversations found');
        setConversations([]);
      } else {
        // Filter out conversations with no participants or invalid data
        const validConversations = data.filter(
          (conv) =>
            conv.participants &&
            conv.participants.length > 0 &&
            conv.participants.some((p) => p.profiles && p.profiles.id)
        );

        console.log(`Loaded ${validConversations.length} valid conversations`);

        if (validConversations.length === 0 && data.length > 0) {
          console.warn(
            'Found conversations but all were filtered out due to invalid participant data'
          );
        }

        setConversations(validConversations);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const debugConversations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Debugging conversations for user:', user.id);

      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          id,
          last_message,
          last_message_at,
          updated_at,
          participants:conversation_participants(
            profiles (
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `
        )
        .eq('conversation_participants.user_id', user.id)
        .limit(3);

      if (data && data.length > 0) {
        console.log(
          'Debug: First few conversations:',
          JSON.stringify(data, null, 2)
        );
      } else {
        console.log('Debug: No conversations found for user', user.id);
        if (error) console.error('Debug: Error:', error);
      }
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        if (mounted) {
          await fetchConversations();
          await debugConversations(); // Remove in production
        }
      } catch (error) {
        console.error('Initialization error:', error);
        if (mounted) {
          setError('Failed to initialize. Please restart the app.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    // Subscribe to conversation changes
    const conversationsChannel = supabase
      .channel('conversations_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('Conversation change detected:', payload.eventType);
          if (mounted) fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log(`Conversations subscription status: ${status}`);
      });

    // Subscribe to messages changes
    const messagesChannel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Message change detected:', payload.eventType);
          if (mounted) fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log(`Messages subscription status: ${status}`);
      });

    return () => {
      mounted = false;
      conversationsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, []);

  // Debug function to log participant data
  const debugParticipants = (conversation: Conversation) => {
    console.log(`Debugging conversation ${conversation.id}:`);
    console.log(`Current user ID: ${currentUserId}`);
    console.log(
      `Number of participants: ${conversation.participants?.length || 0}`
    );

    if (conversation.participants && conversation.participants.length > 0) {
      conversation.participants.forEach((p, index) => {
        console.log(
          `Participant ${index}:`,
          p.profiles
            ? {
                id: p.profiles.id,
                username: p.profiles.username,
                displayName: p.profiles.display_name,
              }
            : 'No profile data'
        );
      });
    }
  };

  // Completely rewritten getOtherParticipant function
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation.participants || conversation.participants.length === 0) {
      console.warn(`No participants in conversation ${conversation.id}`);
      return null;
    }

    debugParticipants(conversation);

    // Get valid profiles (filter out any that might be null/undefined)
    const validProfiles = conversation.participants
      .filter((p) => p.profiles && p.profiles.id)
      .map((p) => p.profiles);

    if (validProfiles.length === 0) {
      console.warn(`No valid profiles in conversation ${conversation.id}`);
      return null;
    }

    // First, try to find participants that aren't the current user
    const otherProfiles = validProfiles.filter(
      (profile) => profile.id !== currentUserId
    );

    // If we found other participants, return the first one
    if (otherProfiles.length > 0) {
      console.log(
        `Found ${otherProfiles.length} other participants for conversation ${conversation.id}`
      );
      return otherProfiles[0];
    }

    // If all participants are the current user (self-message), return the first one
    console.log(
      `Only found current user in conversation ${conversation.id} - possible self-message`
    );
    return validProfiles[0];
  };

  const renderItem = ({ item: conversation }: { item: Conversation }) => {
    console.log(`Rendering conversation ${conversation.id}`);
    const otherParticipant = getOtherParticipant(conversation);

    if (!otherParticipant) {
      console.warn(
        `No valid participant found for conversation ${conversation.id}`
      );
      return null;
    }

    // Determine if this is a self-message (all participants are current user)
    const isSelfMessage = conversation.participants.every(
      (p) => p.profiles && p.profiles.id === currentUserId
    );

    // Fixed avatar logic
    const avatarUrl =
      conversation.participants.find(
        (p) => p.profiles && p.profiles.id !== currentUserId
      )?.profiles?.avatar_url || otherParticipant.avatar_url;

    console.log('Using participant:', {
      id: otherParticipant.id,
      username: otherParticipant.username,
      displayName: otherParticipant.display_name,
      isCurrentUser: otherParticipant.id === currentUserId,
      isSelfMessage,
      avatarUrl,
    });

    // Format timestamp safely
    const formattedTime = conversation.last_message_at
      ? formatRelativeTime(conversation.last_message_at)
      : 'Unknown time';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`/messages/${conversation.id}`)}
      >
        <Image
          source={{
            uri:
              avatarUrl ||
              'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
          }}
          style={styles.avatar}
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.displayName}>
              {otherParticipant.display_name ||
                otherParticipant.username ||
                'Unknown user'}
            </Text>
            <Text style={styles.timestamp}>{formattedTime}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {conversation.last_message || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter conversations based on search query
  const filteredConversations = searchQuery
    ? conversations.filter((conv) => {
        const otherParticipant = getOtherParticipant(conv);
        if (!otherParticipant) return false;

        // Search by display name, username or in last message
        return (
          (otherParticipant.display_name &&
            otherParticipant.display_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (otherParticipant.username &&
            otherParticipant.username
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (conv.last_message &&
            conv.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      })
    : conversations;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top / 0 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.newMessageButton}
          onPress={() => router.push('/messages/new')}
        >
          <MaterialCommunityIcons
            name="square-edit-outline"
            size={24}
            color="#b0fb50"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages"
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchConversations();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#b0fb50"
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No matching conversations found'
                  : 'No messages yet'}
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push('/messages/new')}
              >
                <Text style={styles.startButtonText}>Start a conversation</Text>
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 25,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: '#b0fb50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
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
});
