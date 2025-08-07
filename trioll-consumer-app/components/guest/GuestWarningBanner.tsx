import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '../base';
import { useApp } from '../../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const GuestWarningBanner: React.FC = () => {
  const { isGuest, guestWarning, dismissWarning, showRegisterModal } = useApp();

  if (!isGuest || !guestWarning.showBanner) {
    return null;
  }

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissWarning();
  };

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissWarning();
    showRegisterModal();
  };

  const getWarningMessage = () => {
    const { daysRemaining, warningLevel } = guestWarning;

    if (warningLevel === 'critical') {
      return `Last day! Your guest data expires today.`;
    } else if (warningLevel === 'high') {
      return `${daysRemaining} days left. Register now to save your progress!`;
    } else if (warningLevel === 'medium') {
      return `Only ${daysRemaining} days until your guest data expires.`;
    } else {
      return `Guest data expires in ${daysRemaining} days.`;
    }
  };

  const getBannerColor = () => {
    const { warningLevel } = guestWarning;

    switch (warningLevel) {
      case 'critical':
        return '#ff3333';
      case 'high':
        return '#ff6633';
      case 'medium':
        return '#ffaa33';
      default:
        return '#666';
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={[styles.container, { borderColor: getBannerColor() }]}
    >
      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <View style={[styles.warningDot, { backgroundColor: getBannerColor() }]} />
          <Text style={styles.message}>{getWarningMessage()}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>DISMISS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerButton, { borderColor: getBannerColor() }]}
            onPress={handleRegister}
            activeOpacity={0.7}
          >
            <Text style={[styles.registerText, { color: getBannerColor() }]}>REGISTER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#000',
    borderWidth: 1,
    padding: 16,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  warningDot: {
    width: 8,
    height: 8,
    marginRight: 10,
  },
  message: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  registerButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  registerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
