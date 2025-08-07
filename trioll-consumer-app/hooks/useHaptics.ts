import { useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { HAPTIC_TIMING } from '../constants/animations';

type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'double';

export const useHaptics = () => {
  const triggerHaptic = useCallback(async (type: HapticFeedbackType = 'light') => {
    try {
      if (Platform.OS === 'ios') {
        switch (type) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'selection':
            await Haptics.selectionAsync();
            break;
          case 'double':
            // Custom double haptic for rewind feel
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTimeout(() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }, 50);
            break;
        }
      } else {
        // Android fallback
        switch (type) {
          case 'light':
            Vibration.vibrate(HAPTIC_TIMING.SHORT);
            break;
          case 'medium':
            Vibration.vibrate(HAPTIC_TIMING.MEDIUM);
            break;
          case 'heavy':
            Vibration.vibrate(20);
            break;
          case 'success':
          case 'warning':
          case 'error':
            Vibration.vibrate(HAPTIC_TIMING.MEDIUM);
            break;
          case 'selection':
            Vibration.vibrate(HAPTIC_TIMING.IMMEDIATE);
            break;
          case 'double':
            Vibration.vibrate([...HAPTIC_TIMING.DOUBLE]);
            break;
        }
      }
    } catch (_error) {
      // Silently fail if haptics are not available
      // This can happen when activity is not available or haptics permission is denied
    }
  }, []);

  // Specific haptic patterns for common interactions
  const haptics = {
    // Generic trigger
    trigger: triggerHaptic,

    // Button press
    buttonPress: useCallback(() => triggerHaptic('light'), [triggerHaptic]),

    // Like/favorite
    like: useCallback(() => triggerHaptic('medium'), [triggerHaptic]),

    // Swipe gesture
    swipe: useCallback(() => triggerHaptic('light'), [triggerHaptic]),

    // Swipe completion
    swipeComplete: useCallback(
      (direction: 'left' | 'right') => {
        if (direction === 'left') {
          triggerHaptic('medium');
        } else {
          // Rewind haptic for right swipe
          triggerHaptic('success');
        }
      },
      [triggerHaptic]
    ),

    // Panel drag
    panelDrag: useCallback(() => {
      if (Platform.OS === 'android') {
        Vibration.vibrate(HAPTIC_TIMING.IMMEDIATE);
      } else {
        triggerHaptic('light');
      }
    }, [triggerHaptic]),

    // Error feedback
    error: useCallback(() => triggerHaptic('error'), [triggerHaptic]),

    // Warning feedback
    warning: useCallback(() => triggerHaptic('medium'), [triggerHaptic]),

    // Success feedback
    success: useCallback(() => triggerHaptic('success'), [triggerHaptic]),

    // Selection change
    selection: useCallback(() => triggerHaptic('selection'), [triggerHaptic]),

    // Toggle on/off
    toggle: useCallback(
      (isOn: boolean) => {
        triggerHaptic(isOn ? 'medium' : 'light');
      },
      [triggerHaptic]
    ),

    // Impact with intensity
    impact: useCallback(
      (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
        triggerHaptic(intensity);
      },
      [triggerHaptic]
    ),

    // Achievement unlock
    achievement: useCallback(() => {
      if (Platform.OS === 'ios') {
        // Double haptic for achievement
        triggerHaptic('success');
        setTimeout(() => triggerHaptic('light'), 100);
      } else {
        Vibration.vibrate([0, 50, 100, 50]);
      }
    }, [triggerHaptic]),
  };

  return haptics;
};
