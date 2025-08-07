import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import { authAPI } from '../../src/services/auth/authAPI';
import { validateEmail } from '../../utils/validation';
import { getLogger } from '../../src/utils/logger';

const logger = getLogger('ForgotPasswordScreen');

type RootStackParamList = {
  ForgotPassword: undefined;
  Login: undefined;
};

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const shakeTranslateX = useSharedValue(0);

  const errorShake = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const handleSendResetLink = async () => {
    if (isLoading) return;

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      const response = await authAPI.forgotPassword({ email });

      if ((response as any).success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSuccess(true);
      } else {
        throw new Error(response.message || 'Failed to send reset link');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage =
        error instanceof Error ? (error as any).message : 'An error occurred. Please try again.';
      logger.error('Password reset error:', error);
      setError(errorMessage);

      // Shake animation
      shakeTranslateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login' as never);
  };

  const handleFieldChange = (value: string) => {
    setEmail(value);
    setError('');
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.successContainer}
          >
            <View style={styles.successIconWrapper}>
              <Ionicons name="mail-outline" size={48} color="#fff" />
              <View style={styles.successCheckmark}>
                <Ionicons name="checkmark-circle" size={24} color="#00ff00" />
              </View>
            </View>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successSubtitle}>
              We've sent a password reset link to {email}
            </Text>
            <Text style={styles.successInfo}>
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(400).duration(600)} style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              activeOpacity={0.7}
            >
              <Text style={styles.signInButtonText}>BACK TO SIGN IN</Text>
            </TouchableOpacity>

            <Text style={styles.resendText}>
              Didn't receive the email?{' '}
              <Text
                style={styles.resendLink}
                onPress={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
              >
                Try again
              </Text>
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Ionicons name="lock-closed-outline" size={48} color="#fff" />
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={errorShake}>
            <View style={styles.form}>
              {/* Email Input */}
              <Animated.View
                entering={FadeInDown.delay(200).duration(600)}
                style={styles.inputContainer}
              >
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    value={email}
                    onChangeText={handleFieldChange}
                    placeholder="Email address"
                    placeholderTextColor="#444"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoFocus
                  />
                  <View style={styles.inputIcon}>
                    <Ionicons name="mail-outline" size={20} color="#666" />
                  </View>
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </Animated.View>

              {/* Send Button */}
              <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <TouchableOpacity
                  style={[styles.sendButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSendResetLink}
                  activeOpacity={0.7}
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.sendButtonText}>SEND RESET LINK</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Sign In Link */}
          <Animated.View entering={FadeIn.delay(400).duration(600)} style={styles.signInContainer}>
            <Text style={styles.rememberText}>Remember your password?</Text>
            <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 40,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 40,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 48,
    fontSize: 16,
    color: '#fff',
  },
  inputError: {
    borderColor: '#ff3333',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
  },
  errorText: {
    fontSize: 14,
    color: '#ff3333',
    marginTop: 8,
  },
  sendButton: {
    height: 56,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
  },
  signInLink: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  successIconWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  successCheckmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  successInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    alignItems: 'center',
    gap: 24,
  },
  signInButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
