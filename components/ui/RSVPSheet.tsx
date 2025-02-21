import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Event = {
  id: string;
  title: string;
  start_date: string;
};

interface RSVPSheetProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  onSuccess?: () => void;
}

export function RSVPSheet({ visible, onClose, event, onSuccess }: RSVPSheetProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [guestCount, setGuestCount] = useState<string>('0');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (visible) {
      fetchUserEmail();
    }
  }, [visible]);

  const fetchUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserEmail(profile.email);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate inputs
      if (parseInt(guestCount) < 0) {
        setError('Guest count cannot be negative');
        return;
      }

      // Check if user has already RSVP'd
      const { data: existingRSVP } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single();

      if (existingRSVP) {
        // Update existing RSVP
        const { error: updateError } = await supabase
          .from('event_rsvps')
          .update({
            guest_count: parseInt(guestCount),
            dietary_restrictions: dietaryRestrictions.trim(),
            notes: notes.trim(),
            status: 'attending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRSVP.id);

        if (updateError) throw updateError;
      } else {
        // Create new RSVP
        const { error: insertError } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: event.id,
            user_id: user.id,
            email: userEmail,
            guest_count: parseInt(guestCount),
            dietary_restrictions: dietaryRestrictions.trim(),
            notes: notes.trim(),
            status: 'attending',
          });

        if (insertError) throw insertError;
      }

      // Clear form
      setGuestCount('0');
      setDietaryRestrictions('');
      setNotes('');
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting RSVP:', error);
      setError(error.message || 'Failed to submit RSVP');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestCountChange = (value: string) => {
    // Only allow numbers and ensure count is not negative
    const count = value.replace(/[^0-9]/g, '');
    setGuestCount(count === '' ? '0' : count);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
              <Text style={styles.title}>RSVP to Event</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>
                {new Date(event.start_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>

              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Your Email</Text>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={userEmail}
                    editable={false}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Number of Guests</Text>
                  <View style={styles.guestCountContainer}>
                    <TouchableOpacity
                      style={styles.guestCountButton}
                      onPress={() => handleGuestCountChange(Math.max(0, parseInt(guestCount) - 1).toString())}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color="#ffffff" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.guestCountInput}
                      value={guestCount}
                      onChangeText={handleGuestCountChange}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.guestCountButton}
                      onPress={() => handleGuestCountChange((parseInt(guestCount) + 1).toString())}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Dietary Restrictions</Text>
                  <TextInput
                    style={styles.input}
                    value={dietaryRestrictions}
                    onChangeText={setDietaryRestrictions}
                    placeholder="Any dietary restrictions?"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Additional Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Any additional notes or requests?"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Confirm RSVP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  content: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 16,
    color: '#b0fb50',
    marginBottom: 24,
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#222222',
    color: '#666666',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  guestCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  guestCountButton: {
    padding: 12,
    backgroundColor: '#333333',
  },
  guestCountInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    padding: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});