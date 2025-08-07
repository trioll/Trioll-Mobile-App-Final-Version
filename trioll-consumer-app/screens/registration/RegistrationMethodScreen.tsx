import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../src/services/monitoring/analyticsEnhanced';

type RootStackParamList = {
  RegistrationMethod: undefined;
  EmailRegistration: undefined;
  Login: undefined;
  Feed: undefined;
};

type RegistrationMethodScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RegistrationMethod'
>;

export const RegistrationMethodScreen = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const isPortrait = SCREEN_HEIGHT > SCREEN_WIDTH;
  const navigation = useNavigation<RegistrationMethodScreenNavigationProp>();
  const { authenticateAsGuest } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const emailScale = useSharedValue(1);
  const googleScale = useSharedValue(1);
  const appleScale = useSharedValue(1);
  const guestScale = useSharedValue(1);

  const handleMethodSelect = (method: 'email' | 'google' | 'apple') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (method) {
      case 'email':
        navigation.navigate('EmailRegistration' as never);
        break;
      case 'google':
      case 'apple':
        // TODO: Implement OAuth sign in
        break;
    }
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login' as never);
  };

  const handleContinueAsGuest = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Authenticate as guest
      await authenticateAsGuest();
      
      // Track analytics
      await analyticsService.track('guest_mode_selected', {
        screen: 'RegistrationMethod',
      });
      
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Feed' }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to continue as guest. Please try again.');
      setIsLoading(false);
    }
  };

  const createButtonStyle = (scale: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

  const emailButtonStyle = createButtonStyle(emailScale);
  const googleButtonStyle = createButtonStyle(googleScale);
  const appleButtonStyle = createButtonStyle(appleScale);
  const guestButtonStyle = createButtonStyle(guestScale);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={[styles.header, isPortrait && styles.headerPortrait]}>
          <Text style={[styles.title, isPortrait && styles.titlePortrait]}>Create Your Account</Text>
          <Text style={[styles.subtitle, isPortrait && styles.subtitlePortrait]}>
            Join TRIOLL to save your progress and unlock all features
          </Text>
        </Animated.View>

        {/* Registration Methods */}
        <View style={styles.methodsContainer}>
          {/* Email */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Animated.View style={emailButtonStyle}>
              <TouchableOpacity
                style={[styles.methodButton, isPortrait && styles.methodButtonPortrait, styles.emailButton]}
                onPress={() => handleMethodSelect('email')}
                onPressIn={() => (emailScale.value = withSpring(0.95))}
                onPressOut={() => (emailScale.value = withSpring(1))}
                activeOpacity={0.9}
              >
                <Ionicons name="mail-outline" size={isPortrait ? 20 : 24} color="#fff" />
                <Text style={[styles.methodText, isPortrait && styles.methodTextPortrait]}>Continue with Email</Text>
                <View style={styles.spacer} />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </Animated.View>

          {/* Google */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <Animated.View style={googleButtonStyle}>
              <TouchableOpacity
                style={[styles.methodButton, isPortrait && styles.methodButtonPortrait, styles.socialButton]}
                onPress={() => handleMethodSelect('google')}
                onPressIn={() => (googleScale.value = withSpring(0.95))}
                onPressOut={() => (googleScale.value = withSpring(1))}
                activeOpacity={0.9}
              >
                <Ionicons name="logo-google" size={isPortrait ? 20 : 24} color="#fff" />
                <Text style={[styles.methodText, isPortrait && styles.methodTextPortrait]}>Continue with Google</Text>
                <Text style={styles.comingSoon}>SOON</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Apple */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <Animated.View style={appleButtonStyle}>
              <TouchableOpacity
                style={[styles.methodButton, isPortrait && styles.methodButtonPortrait, styles.socialButton]}
                onPress={() => handleMethodSelect('apple')}
                onPressIn={() => (appleScale.value = withSpring(0.95))}
                onPressOut={() => (appleScale.value = withSpring(1))}
                activeOpacity={0.9}
              >
                <Ionicons name="logo-apple" size={isPortrait ? 20 : 24} color="#fff" />
                <Text style={[styles.methodText, isPortrait && styles.methodTextPortrait]}>Continue with Apple</Text>
                <Text style={styles.comingSoon}>SOON</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Sign In Link */}
        <Animated.View entering={FadeIn.delay(600).duration(600)} style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account?</Text>
          <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Continue as Guest */}
      <Animated.View entering={FadeInDown.delay(700).duration(600)} style={[styles.guestContainer, isPortrait && styles.guestContainerPortrait]}>
        <Animated.View style={guestButtonStyle}>
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleContinueAsGuest}
            onPressIn={() => (guestScale.value = withSpring(0.95))}
            onPressOut={() => (guestScale.value = withSpring(1))}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="person-outline" size={isPortrait ? 18 : 20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.guestText, isPortrait && styles.guestTextPortrait]}>Continue as Guest</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
        <Text style={[styles.guestInfo, isPortrait && styles.guestInfoPortrait]}>
          You can create an account anytime to save your progress
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  methodsContainer: {
    marginBottom: 32,
  },
  methodButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    borderRadius: 3,
  },
  emailButton: {
    backgroundColor: '#6366f1',
  },
  socialButton: {
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  methodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 16,
    flex: 1,
  },
  spacer: {
    width: 24,
  },
  comingSoon: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#1a1a1a',
  },
  dividerText: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signInText: {
    fontSize: 14,
    color: '#666',
  },
  signInLink: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  guestContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  guestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  guestInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Portrait mode optimizations
  headerPortrait: {
    marginBottom: 32,
  },
  titlePortrait: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitlePortrait: {
    fontSize: 15,
    lineHeight: 20,
  },
  methodButtonPortrait: {
    height: 44,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  methodTextPortrait: {
    fontSize: 15,
    marginLeft: 12,
  },
  guestContainerPortrait: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  guestTextPortrait: {
    fontSize: 13,
  },
  guestInfoPortrait: {
    fontSize: 11,
  },
});
