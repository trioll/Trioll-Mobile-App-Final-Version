
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Animated, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { CustomSlider } from '../../components/developer/CustomSlider';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';

type WizardStep = 'basic' | 'media' | 'file' | 'trial' | 'review';

interface GameUploadData {
  // Basic Info
  title: string;
  oneLiner: string;
  description: string;
  genres: string[];
  ageRating: string;
  contentWarnings: string[];
  platforms: string[];

  // Media
  icon: string | null;
  coverImage: string | null;
  screenshots: string[];
  gameplayVideo: string | null;

  // Game File
  selectedPlatform: string;
  gameFile: DocumentPicker.DocumentPickerResult | null;
  fileSize: number;

  // Trial Config
  trialDuration: number;
  trialStartPoint: number;
  autoDetect: boolean;
  manualMarkers: { start: number; end: number } | null;
}

const GENRES = [
  'Action',
  'Adventure',
  'Arcade',
  'Board',
  'Card',
  'Casino',
  'Casual',
  'Educational',
  'Music',
  'Puzzle',
  'Racing',
  'Role Playing',
  'Simulation',
  'Sports',
  'Strategy',
  'Trivia',
  'Word',
];

const AGE_RATINGS = ['3+', '7+', '12+', '16+', '18+'];

const CONTENT_WARNINGS = [
  'Violence',
  'Blood',
  'Sexual Content',
  'Nudity',
  'Strong Language',
  'Gambling',
  'Drugs',
  'Alcohol',
  'Tobacco',
  'Horror',
  'Online Interactions',
];

const PLATFORMS = ['iOS', 'Android', 'Web (HTML5)', 'Unity WebGL'];

export const GameUploadWizard: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'GameUploadWizard'>>();
  const haptics = useHaptics();

  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [uploadData, setUploadData] = useState<GameUploadData>({
    title: '',
    oneLiner: '',
    description: '',
    genres: [],
    ageRating: '3+',
    contentWarnings: [],
    platforms: [],
    icon: null,
    coverImage: null,
    screenshots: [],
    gameplayVideo: null,
    selectedPlatform: '',
    gameFile: null,
    fileSize: 0,
    trialDuration: 5,
    trialStartPoint: 0,
    autoDetect: true,
    manualMarkers: null,
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const steps: WizardStep[] = ['basic', 'media', 'file', 'trial', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    // Animate step transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...SPRING_CONFIGS.BOUNCY,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: DURATIONS.NORMAL,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const handleNext = () => {
    const errors = validateCurrentStep();
    if (errors.length > 0) {
      setValidationErrors(errors);
      (haptics as any).error();
      return;
    }

    setValidationErrors([]);
    haptics.impact('light');

    if (currentStepIndex < steps.length - 1) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    haptics.impact('light');
    if (currentStepIndex > 0) {
      fadeAnim.setValue(0);
      slideAnim.setValue(-50);
      setCurrentStep(steps[currentStepIndex - 1]);
    } else {
      navigation.goBack();
    }
  };

  const validateCurrentStep = (): string[] => {
    const errors: string[] = [];

    switch (currentStep) {
      case 'basic':
        if (!uploadData.title) errors.push('Title is required');
        if (!uploadData.oneLiner) errors.push('One-liner is required');
        if (!uploadData.description) errors.push('Description is required');
        if (uploadData.genres.length === 0) errors.push('Select at least one genre');
        if (uploadData.platforms.length === 0) errors.push('Select at least one platform');
        break;
      case 'media':
        if (!uploadData.icon) errors.push('Icon is required');
        if (!uploadData.coverImage) errors.push('Cover image is required');
        if (uploadData.screenshots.length < 3) errors.push('At least 3 screenshots required');
        break;
      case 'file':
        if (!uploadData.selectedPlatform) errors.push('Select a platform');
        if (!uploadData.gameFile) errors.push('Upload a game file');
        break;
    }

    return errors;
  };

  const handleImagePick = async (type: 'icon' | 'cover' | 'screenshot'): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.images,
      allowsEditing: type !== 'screenshot',
      aspect: type === 'icon' ? [1, 1] : type === 'cover' ? [16, 9] : undefined,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      (haptics as any).success();

      if (type === 'screenshot') {
        setUploadData(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, uri],
        }));
      } else {
        setUploadData(prev => ({
          ...prev,
          [type === 'icon' ? 'icon' : 'coverImage']: uri,
        }));
      }
    }
  };

  const handleFilePick = async (): Promise<void> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if ((result as any).type === 'success') {
      (haptics as any).success();
      setUploadData(prev => ({
        ...prev,
        gameFile: result,
        fileSize: (result as any).size || 0,
      }));
    }
  };

  const handleSubmit = async (): Promise<void> => {
    setIsUploading(true);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          (haptics as any).success();
          Alert.alert(
            'Success!',
            "Your game has been submitted for review. We'll notify you once it's approved.",
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('DeveloperDashboard' as never),
              },
            ]
          );
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const renderBasicInfo = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepDescription}>
          Tell us about your game. This information will be shown to players.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Game Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter game title"
            placeholderTextColor="#666"
            value={uploadData.title}
            onChangeText={text => setUploadData(prev => ({ ...prev, title: text }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>One-liner *</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief, catchy description (max 60 chars)"
            placeholderTextColor="#666"
            value={uploadData.oneLiner}
            onChangeText={text => setUploadData(prev => ({ ...prev, oneLiner: text }))}
            maxLength={60}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detailed game description"
            placeholderTextColor="#666"
            value={uploadData.description}
            onChangeText={text => setUploadData(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={5}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Genres * (Select up to 3)</Text>
          <View style={styles.chipContainer}>
            {GENRES.map(genre => (
              <Pressable
                key={genre}
                onPress={() => {
                  haptics.selection();
                  setUploadData(prev => {
                    const genres = prev.genres.includes(genre)
                      ? prev.genres.filter(g => g !== genre)
                      : prev.genres.length < 3
                        ? [...prev.genres, genre]
                        : prev.genres;
                    return { ...prev, genres };
                  });
                }}
                style={[styles.chip, uploadData.genres.includes(genre) && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    uploadData.genres.includes(genre) && styles.chipTextSelected,
                  ]}
                >
                  {genre}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age Rating *</Text>
          <View style={styles.ratingContainer}>
            {AGE_RATINGS.map(rating => (
              <Pressable
                key={rating}
                onPress={() => {
                  haptics.selection();
                  setUploadData(prev => ({ ...prev, ageRating: rating }));
                }}
                style={[
                  styles.ratingButton,
                  uploadData.ageRating === rating && styles.ratingButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.ratingText,
                    uploadData.ageRating === rating && styles.ratingTextSelected,
                  ]}
                >
                  {rating}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content Warnings</Text>
          <View style={styles.chipContainer}>
            {CONTENT_WARNINGS.map(warning => (
              <Pressable
                key={warning}
                onPress={() => {
                  haptics.selection();
                  setUploadData(prev => {
                    const warnings = prev.contentWarnings.includes(warning)
                      ? prev.contentWarnings.filter(w => w !== warning)
                      : [...prev.contentWarnings, warning];
                    return { ...prev, contentWarnings: warnings };
                  });
                }}
                style={[
                  styles.chip,
                  uploadData.contentWarnings.includes(warning) && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    uploadData.contentWarnings.includes(warning) && styles.chipTextSelected,
                  ]}
                >
                  {warning}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Platforms *</Text>
          <View style={styles.platformContainer}>
            {PLATFORMS.map(platform => (
              <Pressable
                key={platform}
                onPress={() => {
                  haptics.selection();
                  setUploadData(prev => {
                    const platforms = prev.platforms.includes(platform)
                      ? prev.platforms.filter(p => p !== platform)
                      : [...prev.platforms, platform];
                    return { ...prev, platforms };
                  });
                }}
                style={[
                  styles.platformButton,
                  uploadData.platforms.includes(platform) && styles.platformButtonSelected,
                ]}
              >
                <MaterialIcons
                  name={
                    (platform === 'iOS'
                      ? 'phone-iphone'
                      : platform === 'Android'
                        ? 'android'
                        : 'web') as any}
                  size={24}
                  color={uploadData.platforms.includes(platform) ? '#FFFFFF' : '#666'}
                />
                <Text
                  style={[
                    styles.platformText,
                    uploadData.platforms.includes(platform) && styles.platformTextSelected,
                  ]}
                >
                  {platform}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderMedia = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Media Assets</Text>
        <Text style={styles.stepDescription}>
          Upload high-quality images that showcase your game.
        </Text>

        {/* Icon Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.label}>App Icon * (1024x1024)</Text>
          <Pressable
            onPress={() => handleImagePick('icon')}
            style={[styles.uploadBox, uploadData.icon && styles.uploadBoxFilled]}
          >
            {uploadData.icon ? (
              <Image source={{ uri: uploadData.icon }} style={styles.uploadedIcon} />
            ) : (
              <>
                <Ionicons name="image" size={40} color="#666" />
                <Text style={styles.uploadText}>Tap to upload icon</Text>
                <Text style={styles.uploadHint}>Square image, min 1024x1024</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Cover Image Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.label}>Cover Image * (1920x1080)</Text>
          <Pressable
            onPress={() => handleImagePick('cover')}
            style={[
              styles.uploadBox,
              styles.uploadBoxWide,
              uploadData.coverImage && styles.uploadBoxFilled,
            ]}
          >
            {uploadData.coverImage ? (
              <Image source={{ uri: uploadData.coverImage }} style={styles.uploadedCover} />
            ) : (
              <>
                <Ionicons name="image" size={40} color="#666" />
                <Text style={styles.uploadText}>Tap to upload cover image</Text>
                <Text style={styles.uploadHint}>16:9 aspect ratio, min 1920x1080</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Screenshots */}
        <View style={styles.uploadSection}>
          <Text style={styles.label}>Screenshots * ({uploadData.screenshots.length}/8)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {uploadData.screenshots.map((screenshot, index) => (
              <View key={index} style={styles.screenshotContainer}>
                <Image source={{ uri: screenshot }} style={styles.screenshot} />
                <Pressable
                  onPress={() => {
                    haptics.impact('light');
                    setUploadData(prev => ({
                      ...prev,
                      screenshots: prev.screenshots.filter((_, i) => i !== index),
                    }));
                  }}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {uploadData.screenshots.length < 8 && (
              <Pressable
                onPress={() => handleImagePick('screenshot')}
                style={[styles.uploadBox, styles.screenshotUpload]}
              >
                <Ionicons name="add" size={32} color="#666" />
                <Text style={styles.uploadText}>Add Screenshot</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* Gameplay Video */}
        <View style={styles.uploadSection}>
          <Text style={styles.label}>Gameplay Video (Optional)</Text>
          <Pressable
            onPress={() => {
              // Handle video upload
              haptics.impact('light');
            }}
            style={[styles.uploadBox, uploadData.gameplayVideo && styles.uploadBoxFilled]}
          >
            {uploadData.gameplayVideo ? (
              <View style={styles.videoPreview}>
                <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                <Text style={styles.videoText}>gameplay_video.mp4</Text>
              </View>
            ) : (
              <>
                <Ionicons name="videocam" size={40} color="#666" />
                <Text style={styles.uploadText}>Tap to upload video</Text>
                <Text style={styles.uploadHint}>Max 60 seconds, MP4 format</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  const renderGameFile = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Game File</Text>
        <Text style={styles.stepDescription}>
          Upload your game build for the selected platform.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Platform *</Text>
          <View style={styles.platformContainer}>
            {uploadData.platforms.map(platform => (
              <Pressable
                key={platform}
                onPress={() => {
                  haptics.selection();
                  setUploadData(prev => ({ ...prev, selectedPlatform: platform }));
                }}
                style={[
                  styles.platformButton,
                  uploadData.selectedPlatform === platform && styles.platformButtonSelected,
                ]}
              >
                <MaterialIcons
                  name={
                    (platform === 'iOS'
                      ? 'phone-iphone'
                      : platform === 'Android'
                        ? 'android'
                        : 'web') as any}
                  size={24}
                  color={uploadData.selectedPlatform === platform ? '#FFFFFF' : '#666'}
                />
                <Text
                  style={[
                    styles.platformText,
                    uploadData.selectedPlatform === platform && styles.platformTextSelected,
                  ]}
                >
                  {platform}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {uploadData.selectedPlatform && (
          <View style={styles.uploadSection}>
            <Text style={styles.label}>Upload Game File *</Text>
            <Pressable
              onPress={handleFilePick}
              style={[
                styles.uploadBox,
                styles.uploadBoxLarge,
                uploadData.gameFile && styles.uploadBoxFilled,
              ]}
            >
              {uploadData.gameFile ? (
                <View style={styles.fileInfo}>
                  <Ionicons name="document" size={48} color="#6366f1" />
                  <Text style={styles.fileName}>
                    {uploadData.gameFile && !uploadData.gameFile.canceled
                      ? uploadData.gameFile.assets[0].name
                      : 'No file'}
                  </Text>
                  <Text style={styles.fileSize}>
                    {(uploadData.fileSize / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={48} color="#666" />
                  <Text style={styles.uploadText}>Drop file here or tap to browse</Text>
                  <Text style={styles.uploadHint}>
                    {uploadData.selectedPlatform === 'iOS'
                      ? '.ipa file'
                      : uploadData.selectedPlatform === 'Android'
                        ? '.apk or .aab file'
                        : 'ZIP containing HTML5 game'}
                  </Text>
                </>
              )}
            </Pressable>

            {uploadData.gameFile && (
              <View style={styles.formatCheck}>
                <Ionicons name="checkmark-circle" size={20} color="#00FF88" />
                <Text style={styles.formatCheckText}>File format validated</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderTrialConfig = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Trial Configuration</Text>
        <Text style={styles.stepDescription}>
          Configure how players will experience your game trial.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Trial Duration</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>0 minutes</Text>
            <CustomSlider
              style={styles.slider}
              minimumValue={3}
              maximumValue={7}
              step={1}
              value={0}
              onValueChange={value => {
                haptics.selection();
                setUploadData(prev => ({ ...prev, trialDuration: value }));
              }}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#333"
              thumbTintColor="#6366f1"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>3 min</Text>
              <Text style={styles.sliderLabel}>7 min</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Trial Start Point</Text>
          <Pressable
            onPress={() => {
              haptics.toggle(!uploadData.autoDetect);
              setUploadData(prev => ({ ...prev, autoDetect: !prev.autoDetect }));
            }}
            style={styles.toggleOption}
          >
            <View style={styles.toggleLeft}>
              <View style={[styles.radio, uploadData.autoDetect && styles.radioSelected]}>
                {uploadData.autoDetect && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.toggleTitle}>Auto-detect best start point</Text>
                <Text style={styles.toggleDescription}>
                  AI analyzes your game to find the most engaging start
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.toggle(uploadData.autoDetect);
              setUploadData(prev => ({ ...prev, autoDetect: false }));
            }}
            style={styles.toggleOption}
          >
            <View style={styles.toggleLeft}>
              <View style={[styles.radio, !uploadData.autoDetect && styles.radioSelected]}>
                {!uploadData.autoDetect && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.toggleTitle}>Manual configuration</Text>
                <Text style={styles.toggleDescription}>
                  Set specific start and end points for the trial
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {!uploadData.autoDetect && (
          <View style={styles.manualConfig}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Time (seconds)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                value={uploadData.trialStartPoint.toString()}
                onChangeText={text => {
                  const value = parseInt(text) || 0;
                  setUploadData(prev => ({ ...prev, trialStartPoint: value }));
                }}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.previewNote}>
              <Ionicons name="information-circle" size={20} color="#6366f1" />
              <Text style={styles.previewNoteText}>
                You can preview and adjust the trial experience after upload
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderReview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.stepDescription}>
          Review your game details before submitting for approval.
        </Text>

        {/* Preview Card */}
        <View style={styles.previewCard}>
          <Image
            source={{ uri: uploadData.coverImage || 'https://via.placeholder.com/400x225' }}
            style={styles.previewCover}
          />
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <Image
                source={{ uri: uploadData.icon || 'https://via.placeholder.com/64' }}
                style={styles.previewIcon}
              />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{uploadData.title || 'Game Title'}</Text>
                <Text style={styles.previewOneLiner}>
                  {uploadData.oneLiner || 'Game one-liner'}
                </Text>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewRating}>{uploadData.ageRating}</Text>
                  <Text style={styles.previewGenre}>{uploadData.genres.join(', ')}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Technical Checklist */}
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Technical Requirements</Text>
          {[
            { label: 'Game file uploaded', checked: !!uploadData.gameFile },
            { label: 'Icon meets requirements', checked: !!uploadData.icon },
            { label: 'Cover image uploaded', checked: !!uploadData.coverImage },
            { label: 'Minimum 3 screenshots', checked: uploadData.screenshots.length >= 3 },
            { label: 'Trial configured', checked: true },
          ].map((item, index) => (
            <View key={index} style={styles.checkItem}>
              <Ionicons
                name={(item.checked ? 'checkmark-circle' : 'close-circle') as any}
                size={20}
                color={item.checked ? '#00FF88' : '#FF4444'}
              />
              <Text style={[styles.checkText, !item.checked && styles.checkTextError]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Pressable
            onPress={() => {
              // Handle terms acceptance
              haptics.selection();
            }}
            style={styles.termsCheckbox}
          >
            <View style={styles.checkbox}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Developer Agreement</Text> and{' '}
              <Text style={styles.termsLink}>Content Guidelines</Text>
            </Text>
          </Pressable>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isUploading}
          style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {isUploading ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitText}>Uploading... {uploadProgress}%</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
                <Text style={styles.submitText}>Submit for Review</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return renderBasicInfo();
      case 'media':
        return renderMedia();
      case 'file':
        return renderGameFile();
      case 'trial':
        return renderTrialConfig();
      case 'review':
        return renderReview();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Upload New Game</Text>
          <Pressable
            onPress={() => {
              Alert.alert('Save Draft', 'Your progress will be saved as a draft.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: () => {
                    (haptics as any).success();
                    navigation.goBack();
                  },
                },
              ]);
            }}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>Save Draft</Text>
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.stepIndicators}>
            {steps.map((step, index) => (
              <View
                key={step}
                style={[
                  styles.stepIndicator,
                  index <= currentStepIndex && styles.stepIndicatorActive,
                ]}
              >
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <View style={styles.errorContainer}>
            {validationErrors.map((error, index) => (
              <View key={index} style={styles.errorItem}>
                <Ionicons name="warning" size={16} color="#FF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Step Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>

        {/* Navigation Buttons */}
        {currentStep !== 'review' && (
          <View style={styles.navigation}>
            <Pressable onPress={handleBack} style={[styles.navButton, styles.navButtonSecondary]}>
              <Text style={styles.navButtonTextSecondary}>Back</Text>
            </Pressable>
            <Pressable onPress={handleNext} style={styles.navButton}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.navButtonGradient}
              >
                <Text style={styles.navButtonText}>
                  {currentStepIndex === steps.length - 2 ? 'Review' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: '#6366f1',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF4444',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  chipText: {
    fontSize: 14,
    color: '#999',
  },
  chipTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  ratingButtonSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  ratingText: {
    fontSize: 16,
    color: '#999',
  },
  ratingTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  platformContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 100,
    gap: 8,
  },
  platformButtonSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  platformText: {
    fontSize: 14,
    color: '#999',
  },
  platformTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  uploadSection: {
    marginBottom: 32,
  },
  uploadBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  uploadBoxWide: {
    minHeight: 200,
  },
  uploadBoxLarge: {
    minHeight: 250,
  },
  uploadBoxFilled: {
    borderStyle: 'solid',
    borderColor: '#6366f1',
  },
  uploadedIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  uploadedCover: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  uploadText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  screenshotContainer: {
    marginRight: 12,
    position: 'relative',
  },
  screenshot: {
    width: 150,
    height: 260,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotUpload: {
    width: 150,
    minHeight: 260,
  },
  videoPreview: {
    alignItems: 'center',
    gap: 12,
  },
  videoText: {
    fontSize: 14,
    color: '#999',
  },
  fileInfo: {
    alignItems: 'center',
    gap: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  formatCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 8,
  },
  formatCheckText: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: '600',
  },
  sliderContainer: {
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#666',
  },
  toggleOption: {
    marginBottom: 16,
  },
  toggleLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#6366f1',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
  },
  manualConfig: {
    marginTop: 24,
  },
  previewNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  previewNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#6366f1',
    lineHeight: 20,
  },
  previewCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#333',
  },
  previewCover: {
    width: '100%',
    height: 180,
    backgroundColor: '#000',
  },
  previewContent: {
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  previewOneLiner: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  previewMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  previewRating: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewGenre: {
    fontSize: 12,
    color: '#6366f1',
  },
  checklist: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  checkTextError: {
    color: '#999',
  },
  terms: {
    marginBottom: 24,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  termsLink: {
    color: '#6366f1',
    textDecorationLine: 'underline',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  navButtonSecondary: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
