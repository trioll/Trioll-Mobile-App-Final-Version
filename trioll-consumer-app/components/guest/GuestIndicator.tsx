import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../base';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

interface GuestIndicatorProps {
  onRegisterPress?: () => void;
  style?: ViewStyle;
}

export const GuestIndicator: React.FC<GuestIndicatorProps> = ({ onRegisterPress, style }) => {
  const navigation = useNavigation();
  const { isGuest } = useAuth();
  const { showRegisterBenefitsModal } = useApp();
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isGuest) {
      // Subtle pulse animation
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true
      );
    }
  }, [isGuest]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  if (!isGuest) {
    return null;
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onRegisterPress) {
      onRegisterPress();
    } else if (showRegisterBenefitsModal) {
      showRegisterBenefitsModal();
    } else {
      navigation.navigate('RegistrationMethod' as never);
    }
  };

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[styles.badge, animatedStyle]}>
        <View style={styles.dot} />
        <Text style={styles.text}>GUEST</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: '#666',
    marginRight: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
  },
});

// Banner version for use at top of screens
export const GuestBanner: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const navigation = useNavigation();
  const { isGuest } = useAuth();
  const scale = useSharedValue(1);

  if (!isGuest) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('RegistrationMethod' as never);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View 
      entering={FadeIn.delay(500).duration(400)}
      style={bannerStyles.container}
    >
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={bannerStyles.banner}
          onPress={handlePress}
          onPressIn={() => (scale.value = withSpring(0.98))}
          onPressOut={() => (scale.value = withSpring(1))}
          activeOpacity={0.9}
        >
          <View style={bannerStyles.content}>
            <Ionicons name="person-outline" size={16} color="#fff" style={bannerStyles.icon} />
            <Text style={bannerStyles.text}>Playing as Guest</Text>
            <View style={bannerStyles.divider} />
            <Text style={bannerStyles.link}>Create Account</Text>
            <Ionicons name="chevron-forward" size={14} color="#6366f1" style={bannerStyles.chevron} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  banner: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  chevron: {
    marginLeft: 4,
  },
});
