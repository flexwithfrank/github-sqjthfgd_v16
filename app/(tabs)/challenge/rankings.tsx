import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';

type Progress = {
  current_value: number;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

type Challenge = {
  id: string;
  unit: string;
  target_value: number;
};

export default function RankingsScreen() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch active challenge
      const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('id, unit, target_value')
        .eq('status', 'active');

      if (challengeError) throw challengeError;
      
      if (!challenges || challenges.length === 0) {
        setError('No active challenge found');
        return;
      }

      setChallenge(challenges[0]);

      // Fetch challenge progress
      const { data: progressData, error: progressError } = await supabase
        .from('challenge_progress')
        .select(`
          current_value,
          user_id,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('challenge_id', challenges[0].id)
        .order('current_value', { ascending: false });

      if (progressError) throw progressError;
      setProgress(progressData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load rankings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleProfilePress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  if (error || !challenge) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchData}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: Progress; index: number }) => (
    <TouchableOpacity
      style={styles.rankItem}
      onPress={() => handleProfilePress(item.profiles.id)}
    >
      <Text style={styles.rank}>#{index + 1}</Text>
      <Image
        source={{
          uri: item.profiles.avatar_url ||
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
        }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.profiles.display_name}</Text>
        <Text style={styles.username}>@{item.profiles.username}</Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{item.current_value}</Text>
        <Text style={styles.unit}>{challenge.unit}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      style={styles.container}
      data={progress}
      renderItem={renderItem}
      keyExtractor={(item) => item.user_id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#b0fb50"
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No participants yet</Text>
        </View>
      }
    />
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
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  rank: {
    width: 40,
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    color: '#666666',
    fontSize: 14,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    color: '#b0fb50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unit: {
    color: '#666666',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
  },
});