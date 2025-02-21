import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function ChallengeDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Progress[]>([]);
  const [userProgress, setUserProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const fetchCurrentChallenge = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch active challenge
      const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active');

      if (challengeError) throw challengeError;
      
      // If no active challenge is found, show appropriate message
      if (!challenges || challenges.length === 0) {
        setChallenge(null);
        setError('No active challenge at the moment. Check back soon!');
        setLoading(false);
        return;
      }

      setChallenge(challenges[0]);

      // Fetch all participants' progress
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
      setParticipants(progressData || []);

      // Set user's progress if they're participating
      if (user) {
        const userProgressData = progressData?.find(p => p.user_id === user.id);
        setUserProgress(userProgressData?.current_value || 0);
        setHasJoined(!!userProgressData);
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

  const handleParticipantPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const handleJoinChallenge = async () => {
    try {
      setJoining(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !challenge) return;

      // Check if already joined
      const { data: existingProgress } = await supabase
        .from('challenge_progress')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('user_id', user.id)
        .single();

      if (existingProgress) {
        setHasJoined(true);
        return;
      }

      // Join the challenge
      const { error: joinError } = await supabase
        .from('challenge_progress')
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          current_value: 0
        });

      if (joinError) throw joinError;

      // Refresh data
      await fetchCurrentChallenge();
      setHasJoined(true);
    } catch (error) {
      console.error('Error joining challenge:', error);
      setError('Failed to join challenge. Please try again.');
    } finally {
      setJoining(false);
    }
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

  const daysSinceStart = Math.floor(
    (new Date().getTime() - new Date(challenge.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#b0fb50"
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.participantsContainer}>
          {participants.slice(0, 5).map((participant, index) => (
            <TouchableOpacity
              key={participant.user_id}
              onPress={() => handleParticipantPress(participant.user_id)}
              style={[
                styles.avatarWrapper,
                { zIndex: 5 - index, marginLeft: index > 0 ? -15 : 0 }
              ]}
            >
              <Image
                source={{
                  uri: participant.profiles.avatar_url ||
                    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
                }}
                style={styles.participantAvatar}
              />
              {index === 4 && participants.length > 5 && (
                <View style={styles.remainingCount}>
                  <Text style={styles.remainingCountText}>
                    +{participants.length - 5}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.subtitle}>{challenge.subtitle}</Text>

               {!hasJoined ? (
          <TouchableOpacity 
            style={[styles.joinButton, joining && styles.joinButtonDisabled]}
            onPress={handleJoinChallenge}
            disabled={joining}
          >
            <Text style={styles.joinButtonText}>
              {joining ? 'Joining...' : 'Join Challenge'}
            </Text>
          </TouchableOpacity>
        ) : userProgress >= challenge.target_value ? (
          <View style={styles.congratsBadge}>
            <MaterialCommunityIcons name="trophy" size={20} color="#000000" />
            <Text style={styles.congratsText}>Challenge Complete!</Text>
          </View>
        ) : (
          <View style={styles.joinedBadge}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#000000" />
            <Text style={styles.joinedText}>Joined</Text>
          </View>
        )}

        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>YOUR PROGRESS</Text>
          <Text style={styles.progressSubtitle}>Since {daysSinceStart} days ago</Text>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${Math.min((userProgress / challenge.target_value) * 100, 100)}%` }
                ]}
              />
            </View>
          </View>
          
          <Text style={styles.progressText}>
            {userProgress} / {challenge.target_value} {challenge.unit}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About the Challenge</Text>
          <Text style={styles.description}>{challenge.description}</Text>
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
    backgroundColor: '#b0fb50',
    padding: 24,
    alignItems: 'center',
  },
  participantsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    height: 48,
  },
  avatarWrapper: {
    position: 'relative',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#000000',
  },
  remainingCount: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  remainingCountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 32,
  },
  joinButtonDisabled: {
    opacity: 0.7,
  },
  joinButtonText: {
    color: '#b0fb50',
    fontSize: 16,
    fontWeight: '600',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
  },
  joinedText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#000000',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
    borderBottomWidth: 1,  // Adds the bottom border
    borderBottomColor: '#222',  // Adjust color as needed
    paddingBottom: 16,  // Adds spacing so text isn't too close to the border
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
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
    congratsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
  },
  congratsText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  }
});