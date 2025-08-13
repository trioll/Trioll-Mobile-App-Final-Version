
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
// import Slider from '@react-native-community/slider'; // Not compatible with Expo

// Hooks & Utils
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { DURATIONS } from '../../constants/animations';
import { purchaseIntentService } from '../../src/services/analytics/purchaseIntentService';

interface GameplaySettings {
  trialDuration: 'all' | 'short' | 'default' | 'extended';
  autoRotate: boolean;
  hapticFeedback: boolean;
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  batterySaver: boolean;
  controlSensitivity: number;
  soundEffects: boolean;
  backgroundMusic: boolean;
  screenShake: boolean;
  particleEffects: boolean;
  purchaseIntentSurvey: boolean;
}

type RootStackParamList = {
  GameplaySettings: undefined;
};

type GameplaySettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'GameplaySettings'
>;

export const GameplaySettingsScreen: React.FC = () => {
  const navigation = useNavigation<GameplaySettingsScreenNavigationProp>();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [settings, setSettings] = useState<GameplaySettings>({
    trialDuration: 'all',
    autoRotate: true,
    hapticFeedback: true,
    graphicsQuality: 'high',
    batterySaver: false,
    controlSensitivity: 50,
    soundEffects: true,
    backgroundMusic: true,
    screenShake: true,
    particleEffects: true,
    purchaseIntentSurvey: true,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
    
    // Load purchase intent preferences
    loadPurchaseIntentPreferences();
  }, []);
  
  const loadPurchaseIntentPreferences = async () => {
    await purchaseIntentService.initialize();
    const prefs = purchaseIntentService.getPreferences();
    setSettings(prev => ({ ...prev, purchaseIntentSurvey: prefs.enabled }));
  };

  const handleBack = () => {
    haptics.impact('light');
    navigation.goBack();
  };

  const updateSetting = async <K extends keyof GameplaySettings>(key: K, value: GameplaySettings[K]) => {
    haptics.impact('light');
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Update purchase intent service if that setting changed
    if (key === 'purchaseIntentSurvey') {
      await purchaseIntentService.setEnabled(value as boolean);
    }
    
    showToast('Setting updated', 'success');
  };

  const renderTrialDurationOption = (
    option: 'all' | 'short' | 'default' | 'extended',
    label: string,
    duration: string
  ) => (
    <Pressable
      style={[styles.optionCard, settings.trialDuration === option && styles.optionCardActive]}
      onPress={() => updateSetting('trialDuration', option)}
    >
      <View style={styles.optionContent}>
        <Text
          style={[
            styles.optionTitle,
            settings.trialDuration === option && styles.optionTitleActive,
          ]}
        >
          {label}
        </Text>
        <Text style={styles.optionSubtitle}>{duration}</Text>
      </View>
      {settings.trialDuration === option && (
        <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
      )}
    </Pressable>
  );

  const renderGraphicsOption = (
    option: 'low' | 'medium' | 'high' | 'ultra',
    label: string,
    description: string
  ) => (
    <Pressable
      style={[styles.optionCard, settings.graphicsQuality === option && styles.optionCardActive]}
      onPress={() => updateSetting('graphicsQuality', option)}
    >
      <View style={styles.optionContent}>
        <Text
          style={[
            styles.optionTitle,
            settings.graphicsQuality === option && styles.optionTitleActive,
          ]}
        >
          {label}
        </Text>
        <Text style={styles.optionSubtitle}>{description}</Text>
      </View>
      {settings.graphicsQuality === option && (
        <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Gameplay Settings</Text>

        <View style={styles.headerRight} />
      </SafeAreaView>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trial Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRIAL DURATION</Text>
          <View style={styles.optionsContainer}>
            {renderTrialDurationOption('all', 'All Trials', 'All durations')}
            {renderTrialDurationOption('short', 'Quick Try', '3 minutes')}
            {renderTrialDurationOption('default', 'Standard', '5 minutes')}
            {renderTrialDurationOption('extended', 'Deep Dive', '7 minutes')}
          </View>
        </View>

        {/* Graphics Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GRAPHICS QUALITY</Text>
          <View style={styles.optionsContainer}>
            {renderGraphicsOption('low', 'Low', 'Better battery life')}
            {renderGraphicsOption('medium', 'Medium', 'Balanced')}
            {renderGraphicsOption('high', 'High', 'Better visuals')}
            {renderGraphicsOption('ultra', 'Ultra', 'Maximum quality')}
          </View>
        </View>

        {/* Control Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTROLS</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Rotate Screen</Text>
              <Text style={styles.settingDescription}>
                Automatically rotate based on device orientation
              </Text>
            </View>
            <Switch
              value={settings.autoRotate}
              onValueChange={value => updateSetting('autoRotate', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Vibration feedback for interactions</Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={value => updateSetting('hapticFeedback', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.sliderRow}>
            <Text style={styles.settingLabel}>Control Sensitivity</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{settings.controlSensitivity}%</Text>
              {/* Custom slider implementation */}
              <View style={styles.customSlider}>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${settings.controlSensitivity}%` }]} />
                </View>
                <View style={styles.sliderButtons}>
                  <Pressable
                    style={styles.sliderButton}
                    onPress={() => {
                      const newValue = Math.max(0, settings.controlSensitivity - 10);
                      updateSetting('controlSensitivity', newValue);
                    }}
                  >
                    <Ionicons name="remove" size={24} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    style={styles.sliderButton}
                    onPress={() => {
                      const newValue = Math.min(100, settings.controlSensitivity + 10);
                      updateSetting('controlSensitivity', newValue);
                    }}
                  >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERFORMANCE</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Battery Saver Mode</Text>
              <Text style={styles.settingDescription}>Reduce performance to save battery</Text>
            </View>
            <Switch
              value={settings.batterySaver}
              onValueChange={value => updateSetting('batterySaver', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Audio & Visual Effects */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AUDIO & VISUAL</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
            </View>
            <Switch
              value={settings.soundEffects}
              onValueChange={value => updateSetting('soundEffects', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Background Music</Text>
            </View>
            <Switch
              value={settings.backgroundMusic}
              onValueChange={value => updateSetting('backgroundMusic', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Screen Shake Effects</Text>
            </View>
            <Switch
              value={settings.screenShake}
              onValueChange={value => updateSetting('screenShake', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Particle Effects</Text>
            </View>
            <Switch
              value={settings.particleEffects}
              onValueChange={value => updateSetting('particleEffects', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Purchase Intent Survey */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Purchase Intent Survey</Text>
              <Text style={styles.settingDescription}>
                Show survey after game trials to help improve recommendations
              </Text>
            </View>
            <Switch
              value={settings.purchaseIntentSurvey}
              onValueChange={value => updateSetting('purchaseIntentSurvey', value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Reset Button */}
        <Pressable
          style={styles.resetButton}
          onPress={() => {
            haptics.impact('medium');
            showToast('Settings reset to defaults', 'success');
            setSettings({
              trialDuration: 'all',
              autoRotate: true,
              hapticFeedback: true,
              graphicsQuality: 'high',
              batterySaver: false,
              controlSensitivity: 50,
              soundEffects: true,
              backgroundMusic: true,
              screenShake: true,
              particleEffects: true,
            });
          }}
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </Pressable>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionCardActive: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0,255,136,0.1)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionTitleActive: {
    color: '#00FF88',
  },
  optionSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  sliderRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sliderContainer: {
    marginTop: 12,
  },
  sliderValue: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 8,
  },
  customSlider: {
    marginTop: 8,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#39393D',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#00FF88',
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  sliderButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    margin: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
