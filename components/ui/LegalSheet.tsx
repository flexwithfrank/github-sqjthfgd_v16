import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type LegalContentSection = {
  title: string;
  content: string[];
};

type LegalContent = {
  title: string;
  content: LegalContentSection[];
  version: string;
  last_updated: string;
};

interface LegalSheetProps {
  visible: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function LegalSheet({ visible, onClose, type }: LegalSheetProps) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState<LegalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchContent();
    }
  }, [visible, type]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_content')
        .select('*')
        .eq('type', type)
        .single();

      if (error) throw error;
      setContent(data);
    } catch (err) {
      console.error('Error fetching legal content:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View 
          style={[
            styles.sheet,
            { 
              paddingBottom: insets.bottom,
              maxHeight: SCREEN_HEIGHT * 0.9 
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#b0fb50" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  fetchContent();
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : content ? (
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {content.content.map((section, index) => (
                <View key={index} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.content.map((paragraph, pIndex) => (
                    <Text key={pIndex} style={styles.paragraph}>
                      {paragraph}
                    </Text>
                  ))}
                </View>
              ))}

              <View style={styles.footer}>
                <Text style={styles.version}>Version {content.version}</Text>
                <Text style={styles.lastUpdated}>
                  Last updated: {new Date(content.last_updated).toLocaleDateString()}
                </Text>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
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
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  version: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666666',
  },
});