import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../base/Text';
import { useHaptics } from '../../hooks';
import { DS } from '../../src/styles/TriollDesignSystem';
import { DURATIONS } from '../../constants/animations';

interface GameControlOverlayProps {
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  onBack: () => void;
  onReportIssue?: () => void;
  onFullscreenToggle?: (fullscreen: boolean) => void;
}

const HIDE_DELAY = 3000; // 3 seconds
const FADE_DURATION = 300;

export const GameControlOverlay: React.FC<GameControlOverlayProps> = ({
  visible,
  onVisibilityChange,
  onBack,
  onReportIssue,
  onFullscreenToggle,
}) => {
  const _insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const opacity = useSharedValue(visible ? 1 : 0);
  const translateY = useSharedValue(visible ? 0 : -20);
  
  // Settings panel state
  const [showSettings, setShowSettings] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [fullscreenEnabled, setFullscreenEnabled] = React.useState(false);
  
  // Load preferences
  useEffect(() => {
    loadPreferences();
  }, []);
  
  const loadPreferences = async () => {
    try {
      const sound = await AsyncStorage.getItem('game_sound_enabled');
      const fullscreen = await AsyncStorage.getItem('game_fullscreen_enabled');
      
      if (sound !== null) setSoundEnabled(sound === 'true');
      if (fullscreen !== null) setFullscreenEnabled(fullscreen === 'true');
    } catch {
      // Silent fail - use defaults
    }
  };
  
  const savePreference = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch {
      // Silent fail
    }
  };
  
  // Reset hide timer
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    
    hideTimerRef.current = setTimeout(() => {
      runOnJS(onVisibilityChange)(false);
    }, HIDE_DELAY);
  }, [onVisibilityChange]);
  
  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: FADE_DURATION });
      translateY.value = withTiming(0, { duration: FADE_DURATION });
      resetHideTimer();
    } else {
      opacity.value = withTiming(0, { duration: FADE_DURATION });
      translateY.value = withTiming(-20, { duration: FADE_DURATION });
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    }
    
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [visible, opacity, translateY, resetHideTimer]);
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });
  
  const handleBackPress = async () => {
    await haptics.impact('light');
    onBack();
  };
  
  const handleSettingsPress = async () => {
    await haptics.impact('light');
    setShowSettings(true);
    // Clear hide timer when settings open
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  };
  
  const handleSoundToggle = async (value: boolean) => {
    await haptics.selection();
    setSoundEnabled(value);
    await savePreference('game_sound_enabled', value);
  };
  
  const handleFullscreenToggle = async (value: boolean) => {
    await haptics.selection();
    setFullscreenEnabled(value);
    await savePreference('game_fullscreen_enabled', value);
    onFullscreenToggle?.(value);
  };
  
  const handleReportIssue = async () => {
    await haptics.impact('light');
    setShowSettings(false);
    onReportIssue?.();
  };
  
  const handleSettingsClose = () => {
    setShowSettings(false);
    // Resume hide timer when settings close
    if (visible) {
      resetHideTimer();
    }
  };
  
  if (!visible) {
    return null;
  }
  
  return (
    <>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          { paddingTop: _insets.top + DS.spacing.sm }
        ]}
        pointerEvents={visible ? 'box-none' : 'none'}
      >
        <BlurView intensity={15} tint="dark" style={styles.blurContainer}>
          <View style={styles.controls}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleBackPress}
              activeOpacity={0.8}
            >
              <View style={styles.controlButtonInner}>
                <Ionicons name="arrow-back" size={20} color={DS.colors.textPrimary} />
              </View>
            </TouchableOpacity>
            
            {/* Settings Button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleSettingsPress}
              activeOpacity={0.8}
            >
              <View style={styles.controlButtonInner}>
                <Ionicons name="settings-outline" size={20} color={DS.colors.textPrimary} />
              </View>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
      
      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={handleSettingsClose}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleSettingsClose}
        >
          <Pressable
            style={[
              styles.settingsPanel,
              { marginTop: _insets.top + 80 }
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <BlurView intensity={20} tint="dark" style={styles.settingsPanelBlur}>
              <View style={styles.settingsContent}>
                <Text size="lg" weight="bold" color={DS.colors.textPrimary} style={styles.settingsTitle}>
                  Game Settings
                </Text>
                
                {/* Sound Toggle */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="volume-high" size={20} color={DS.colors.textPrimary} />
                    <Text variant="body" color={DS.colors.textPrimary}>
                      Sound
                    </Text>
                  </View>
                  <Switch
                    value={soundEnabled}
                    onValueChange={handleSoundToggle}
                    trackColor={{
                      false: 'rgba(255, 255, 255, 0.2)',
                      true: DS.colors.primary
                    }}
                    thumbColor={DS.colors.textPrimary}
                    ios_backgroundColor="rgba(255, 255, 255, 0.2)"
                  />
                </View>
                
                {/* Fullscreen Toggle */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="expand" size={20} color={DS.colors.textPrimary} />
                    <Text variant="body" color={DS.colors.textPrimary}>
                      Fullscreen
                    </Text>
                  </View>
                  <Switch
                    value={fullscreenEnabled}
                    onValueChange={handleFullscreenToggle}
                    trackColor={{
                      false: 'rgba(255, 255, 255, 0.2)',
                      true: DS.colors.primary
                    }}
                    thumbColor={DS.colors.textPrimary}
                    ios_backgroundColor="rgba(255, 255, 255, 0.2)"
                  />
                </View>
                
                {/* Report Issue Button */}
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={handleReportIssue}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bug-outline" size={20} color={DS.colors.warning} />
                  <Text variant="body" color={DS.colors.warning} weight="medium">
                    Report Issue
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  blurContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.effects.shadowSubtle,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  settingsPanel: {
    marginHorizontal: DS.spacing.lg,
    borderRadius: DS.effects.borderRadiusMedium,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...DS.effects.shadowMedium,
  },
  settingsPanelBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsContent: {
    padding: DS.spacing.lg,
  },
  settingsTitle: {
    marginBottom: DS.spacing.lg,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DS.spacing.sm,
    marginBottom: DS.spacing.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.spacing.sm,
    marginTop: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.md,
    borderRadius: DS.effects.borderRadiusMedium,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});