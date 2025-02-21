import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

type Challenge = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  target_value: number;
  unit: string;
  start_date: string;
  end_date: string;
  rules: string[];
  rewards: Array<{
    place: number;
    title: string;
    reward: string;
  }>;
};

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

export default function LeaderboardScreen() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [userProgress, setUserProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCurrentChallenge = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch active challenge
      const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

      if (challengeError) throw challengeError;
      
      // If no active challenge is found, show appropriate message
      if (!challenges) {
        setChallenge(null);
        setError('No active challenge at the moment. Check back soon!');
        setLoading(false);
        return;
      }

      setChallenge(challenges);

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
        .eq('challenge_id', challenges.id)
        .order('current_value', { ascending: false });

      if (progressError) throw progressError;
      setProgress(progressData || []);

      // Set user's progress if they're participating
      if (user) {
        const userProgressData = progressData?.find(p => p.user_id === user.id);
        setUserProgress(userProgressData?.current_value || 0);
      }
    } catch (error) {
      console.error('Error fetching challenge:', error);
      setError('Failed to load challenge data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCurrentChallenge();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCurrentChallenge();
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
          onPress={fetchCurrentChallenge}
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
      <View style={styles.header}>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.subtitle}>{challenge.subtitle}</Text>
        <Text style={styles.description}>{challenge.description}</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${Math.min((userProgress / challenge.target_value) * 100, 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {userProgress} / {challenge.target_value} {challenge.unit}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="calendar" size={20} color="#666666" />
            <Text style={styles.infoText}>
              {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="trophy" size={20} color="#666666" />
            <Text style={styles.infoText}>
              {progress.length} Participants
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rules</Text>
        {challenge.rules.map((rule, index) => (
          <View key={index} style={styles.ruleItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#b0fb50" />
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rewards</Text>
        {challenge.rewards.map((reward, index) => (
          <View key={index} style={styles.rewardItem}>
            <View style={styles.rewardBadge}>
              <MaterialCommunityIcons 
                name={index === 0 ? "trophy" : index === 1 ? "medal" : "star"} 
                size={24} 
                color={index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32"} 
              />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardText}>{reward.reward}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {progress.map((entry, index) => (
          <TouchableOpacity
            key={index}
            style={styles.leaderboardItem}
            onPress={() => handleProfilePress(entry.profiles.id)}
          >
            <Text style={styles.rank}>#{index + 1}</Text>
            <Image
              source={{
                uri: entry.profiles.avatar_url ||
                  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
              }}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.displayName}>{entry.profiles.display_name}</Text>
              <Text style={styles.username}>@{entry.profiles.username}</Text>
            </View>
            <View style={styles.scoreContainer}>
              <Text style={styles.score}>{entry.current_value}</Text>
              <Text style={styles.unit}>{challenge.unit}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#b0fb50',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#b0fb50',
    borderRadius: 4,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'right',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: '#666666',
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rewardBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rewardText: {
    color: '#666666',
    fontSize: 14,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
});