import { useState } from 'react';
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
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface CreateEventSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateEventSheet({ visible, onClose, onSuccess }: CreateEventSheetProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    location_url: '',
    start_date: new Date(),
    end_date: new Date(Date.now() + 3600000), // Default to 1 hour later
    highlights: [
      { icon: 'account-group', text: '' },
      { icon: 'timer', text: '' },
      { icon: 'information', text: '' },
      { icon: 'water', text: '' }
    ]
  });

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to select image');
    }
  };

  const uploadImage = async (imageUri: string, eventId: string) => {
    try {
      const fileExt = imageUri.split('.').pop();
      const fileName = `${eventId}_${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileData = new Uint8Array(
        atob(base64)
          .split('')
          .map((char) => char.charCodeAt(0))
      );

      const { data, error } = await supabase.storage
        .from('events')
        .upload(filePath, fileData, {
          contentType: `image/${fileExt}`,
        });

      if (error) throw error;

      return supabase.storage.from('events').getPublicUrl(filePath).data.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!form.title.trim()) throw new Error('Title is required');
      if (!form.description.trim()) throw new Error('Description is required');
      if (!form.location.trim()) throw new Error('Location is required');
      if (!selectedImage) throw new Error('Event image is required');
      if (form.end_date <= form.start_date) throw new Error('End time must be after start time');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: form.title.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          location_url: form.location_url.trim(),
          start_date: form.start_date.toISOString(),
          end_date: form.end_date.toISOString(),
          created_by: user.id,
          highlights: form.highlights.filter(h => h.text.trim()).map(h => ({
            icon: h.icon,
            text: h.text.trim()
          }))
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Upload image
      const imageUrl = await uploadImage(selectedImage, event.id);
      if (!imageUrl) throw new Error('Failed to upload image');

      // Update event with image URL
      const { error: updateError } = await supabase
        .from('events')
        .update({ image_url: imageUrl })
        .eq('id', event.id);

      if (updateError) throw updateError;

      // Reset form
      setForm({
        title: '',
        description: '',
        location: '',
        location_url: '',
        start_date: new Date(),
        end_date: new Date(Date.now() + 3600000),
        highlights: [
          { icon: 'account-group', text: '' },
          { icon: 'timer', text: '' },
          { icon: 'information', text: '' },
          { icon: 'water', text: '' }
        ]
      });
      setSelectedImage(null);
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event');
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Event</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <TouchableOpacity
                style={[styles.imageUpload, selectedImage && styles.imagePreviewContainer]}
                onPress={pickImage}
              >
                {selectedImage ? (
                  <>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                    <View style={styles.imageOverlay}>
                      <MaterialCommunityIcons name="camera" size={24} color="#ffffff" />
                      <Text style={styles.imageOverlayText}>Change Image</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="image-plus" size={32} color="#666666" />
                    <Text style={styles.imageUploadText}>Add Event Image</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Event Title</Text>
                  <TextInput
                    style={styles.input}
                    value={form.title}
                    onChangeText={(text) => setForm({ ...form, title: text })}
                    placeholder="Enter event title"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.description}
                    onChangeText={(text) => setForm({ ...form, description: text })}
                    placeholder="Describe your event"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={form.location}
                    onChangeText={(text) => setForm({ ...form, location: text })}
                    placeholder="Event location"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location URL (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.location_url}
                    onChangeText={(text) => setForm({ ...form, location_url: text })}
                    placeholder="Google Maps URL"
                    placeholderTextColor="#666666"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date & Time</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="calendar" size={20} color="#b0fb50" />
                    <Text style={styles.dateButtonText}>
                      Starts: {form.start_date.toLocaleString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="calendar-end" size={20} color="#b0fb50" />
                    <Text style={styles.dateButtonText}>
                      Ends: {form.end_date.toLocaleString()}
                    </Text>
                  </TouchableOpacity>

                  {(showStartDatePicker || showEndDatePicker) && (
                    <DateTimePicker
                      value={showStartDatePicker ? form.start_date : form.end_date}
                      mode="datetime"
                      is24Hour={true}
                      onChange={(event, selectedDate) => {
                        if (showStartDatePicker) {
                          setShowStartDatePicker(false);
                          if (selectedDate) {
                            setForm({
                              ...form,
                              start_date: selectedDate,
                              end_date: new Date(selectedDate.getTime() + 3600000)
                            });
                          }
                        } else {
                          setShowEndDatePicker(false);
                          if (selectedDate) {
                            setForm({ ...form, end_date: selectedDate });
                          }
                        }
                      }}
                    />
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Highlights</Text>
                  {form.highlights.map((highlight, index) => (
                    <View key={index} style={styles.highlightInput}>
                      <MaterialCommunityIcons
                        name={highlight.icon as any}
                        size={24}
                        color="#b0fb50"
                      />
                      <TextInput
                        style={styles.highlightText}
                        value={highlight.text}
                        onChangeText={(text) => {
                          const newHighlights = [...form.highlights];
                          newHighlights[index].text = text;
                          setForm({ ...form, highlights: newHighlights });
                        }}
                        placeholder="Add highlight"
                        placeholderTextColor="#666666"
                      />
                    </View>
                  ))}
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
                    <Text style={styles.submitButtonText}>Create Event</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  imageUpload: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 8,
  },
  imageUploadText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 8,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 8,
  },
  highlightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  highlightText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 16,
    borderRadius: 8,
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