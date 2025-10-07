
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, ScrollView, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { safeAPI } from '../../src/services/api/SafeTriollAPI';
import { uploadService } from '../../src/services/uploadService';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  currentProfile: {
    id: string;
    username?: string;
    displayName?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
  };
  onUpdate: (updatedProfile: unknown) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  visible,
  onClose,
  currentProfile,
  onUpdate,
}) => {
  const _insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState(currentProfile.displayName || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [avatar, setAvatar] = useState(currentProfile.avatar || '');
  const [coverImage, setCoverImage] = useState(currentProfile.coverImage || '');

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Reset form when modal opens
    if (visible) {
      setDisplayName(currentProfile.displayName || '');
      setBio(currentProfile.bio || '');
      setAvatar(currentProfile.avatar || '');
      setCoverImage(currentProfile.coverImage || '');
      setErrors({});
    }
  }, [visible, currentProfile]);

  const pickImage = async (type: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'avatar') {
        setAvatar(result.assets[0].uri);
      } else {
        setCoverImage(result.assets[0].uri);
      }
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.length > 30) {
      newErrors.displayName = 'Display name must be 30 characters or less';
    }

    if (bio.length > 150) {
      newErrors.bio = 'Bio must be 150 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Upload images if they've been changed
      let uploadedAvatar = avatar;
      let uploadedCoverImage = coverImage;

      // Check if avatar is a local file (starts with file://)
      if (avatar && avatar.startsWith('file://')) {
        try {
          // Delete old avatar if it exists and is an S3 URL
          if (currentProfile.avatar && currentProfile.avatar.includes('amazonaws.com')) {
            await uploadService.deleteOldProfileImage(currentProfile.avatar);
          }
          uploadedAvatar = await uploadService.uploadProfileImage(avatar, 'avatar');
        } catch {
          // Fallback to local storage
          console.warn('Avatar upload failed, using local storage:', error);
          uploadedAvatar = await uploadService.saveImageLocally(avatar, 'avatar');
        }
      }

      // Check if cover image is a local file
      if (coverImage && coverImage.startsWith('file://')) {
        try {
          // Delete old cover image if it exists and is an S3 URL
          if (currentProfile.coverImage && currentProfile.coverImage.includes('amazonaws.com')) {
            await uploadService.deleteOldProfileImage(currentProfile.coverImage);
          }
          uploadedCoverImage = await uploadService.uploadProfileImage(coverImage, 'cover');
        } catch {
          // Fallback to local storage
          console.warn('Cover image upload failed, using local storage:', error);
          uploadedCoverImage = await uploadService.saveImageLocally(coverImage, 'cover');
        }
      }

      const updates = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: uploadedAvatar,
        coverImage: uploadedCoverImage,
      };

      // Call API to update profile
      const result = await safeAPI.updateUserProfile(updates);

      if (result) {
        // If we got a result (either from API or local storage), update the profile
        const updatedProfile = (result as any).stored === 'local' 
          ? { ...currentProfile, ...updates }
          : result;
        onUpdate(updatedProfile);
        onClose();
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An error occurred while updating your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalContent}>
          <BlurView intensity={100} tint="dark" style={styles.blurContainer}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: _insets.top + 16 }]}>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
              <Text style={styles.title}>Edit Profile</Text>
              <Pressable onPress={handleSave} disabled={isSaving} style={styles.saveButton}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Cover Image */}
              <View style={styles.coverSection}>
                <Pressable onPress={() => pickImage('cover')} style={styles.coverImageContainer}>
                  {coverImage ? (
                    <Image source={{ uri: coverImage }} style={styles.coverImage} />
                  ) : (
                    <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.coverPlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#fff" />
                      <Text style={styles.uploadText}>Add Cover Image</Text>
                    </LinearGradient>
                  )}
                  <View style={styles.editOverlay}>
                    <Ionicons name="camera" size={20} color="#fff" />
                  </View>
                </Pressable>

                {/* Avatar */}
                <Pressable onPress={() => pickImage('avatar')} style={styles.avatarContainer}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color="#999" />
                    </View>
                  )}
                  <View style={styles.avatarEditOverlay}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </Pressable>
              </View>

              {/* Form Fields */}
              <View style={styles.form}>
                {/* Display Name */}
                <View style={styles.formField}>
                  <Text style={styles.label}>Display Name</Text>
                  <TextInput
                    style={[styles.input, errors.displayName && styles.inputError]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your display name"
                    placeholderTextColor="#666"
                    maxLength={30}
                  />
                  <Text style={styles.charCount}>{displayName.length}/30</Text>
                  {errors.displayName && (
                    <Text style={styles.errorText}>{errors.displayName}</Text>
                  )}
                </View>

                {/* Bio */}
                <View style={styles.formField}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.textArea, errors.bio && styles.inputError]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    maxLength={150}
                  />
                  <Text style={styles.charCount}>{bio.length}/150</Text>
                  {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
                </View>

                {/* Privacy Notice */}
                <View style={styles.privacyNotice}>
                  <Ionicons name="information-circle-outline" size={16} color="#666" />
                  <Text style={styles.privacyText}>
                    Your profile information is visible to other players
                  </Text>
                </View>
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    height: '90%',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginRight: 40,
  },
  saveButton: {
    position: 'absolute',
    right: 20,
    bottom: 16,
  },
  saveButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  coverSection: {
    marginBottom: 60,
  },
  coverImageContainer: {
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -40,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 3,
    borderWidth: 4,
    borderColor: '#1a1a2e',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6366f1',
    borderRadius: 3,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formField: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 4,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 2,
    marginTop: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
});
