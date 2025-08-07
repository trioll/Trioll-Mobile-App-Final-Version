import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ReAnimated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import { useApp } from '../../context/AppContext';

import { registrationService } from '../../src/services/api/registrationService';
import { getLogger } from '../../src/utils/logger';

const logger = getLogger('EmailVerificationScreen');

type RootStackParamList = {
  EmailVerification: { email: string; userId: string; password: string };
  MergeGuestData: { userId: string; hasAuthenticated?: boolean; token?: string };
  Welcome: { token: string; userId: string };
  Feed: undefined;
};

type EmailVerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmailVerification'
>;
type EmailVerificationScreenRouteProp = RouteProp<RootStackParamList, 'EmailVerification'>;

export const EmailVerificationScreen = () => {
  const navigation = useNavigation<EmailVerificationScreenNavigationProp>();
  const route = useRoute<EmailVerificationScreenRouteProp>();
  const { email = '', userId = '', password = '' } = route.params || {};
  const { guestProfile } = useApp();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const errorShake = useRef(new Animated.Value(0)).current;

  // Auto-focus first input
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newCode = [...code];
      pastedCode.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);

      // Focus last input or next empty
      const nextEmpty = newCode.findIndex(digit => !digit);
      if (nextEmpty !== -1) {
        inputRefs.current[nextEmpty]?.focus();
      } else {
        inputRefs.current[5]?.focus();
        // Auto-submit if all filled
        verifyCode(newCode.join(''));
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (verificationCode: string) => {
    if (isVerifying) return;

    Keyboard.dismiss();
    setIsVerifying(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Use the registration service for verification
      const result = await registrationService.verifyEmail({
        email,
        code: verificationCode,
        password, // Include password for auto-login after verification
      });

      if ((result as any).success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Store the authentication tokens
        if (result.tokens) {
          // Tokens are automatically stored by the API service
          // Navigate based on whether user was a guest
          if (guestProfile) {
            navigation.navigate('MergeGuestData' as keyof RootStackParamList, {
              userId,
              hasAuthenticated: true,
            } as any);
          } else {
            // Navigate to home screen as authenticated user
            navigation.reset({
              index: 0,
              routes: [{ name: 'Feed' }],
            });
          }
        } else {
          // Fallback for legacy flow
          if (guestProfile) {
            navigation.navigate('MergeGuestData' as keyof RootStackParamList, {
              token: result.tokens?.accessToken || '',
              userId,
            } as any);
          } else {
            navigation.navigate('Welcome' as keyof RootStackParamList, {
              token: result.tokens?.accessToken || '',
              userId,
            } as any);
          }
        }
      } else {
        throw new Error(result.message || 'Invalid code');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? (error as any).message : 'Invalid verification code';
      logger.error('Email verification error:', error);
      setError(errorMessage);

      // Shake animation
      errorShake.setValue(0);
      Animated.sequence([
        Animated.timing(errorShake, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(errorShake, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(errorShake, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(errorShake, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Use the registration service for resending code
      await registrationService.resendVerificationCode(email);
      setResendCooldown(60);
      setError('');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      setError('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const maskedEmail = email.replace(
    /^(.{2})(.*)(@.*)$/,
    (match: string, start: string, middle: string, end: string) => {
      return start + '*'.repeat(middle.length) + end;
    }
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Header */}
          <ReAnimated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Ionicons name="mail-outline" size={48} color="#fff" />
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to{'\n'}
              <Text style={styles.email}>{maskedEmail}</Text>
            </Text>
          </ReAnimated.View>

          {/* Code Input */}
          <Animated.View
            style={[styles.codeContainer, { transform: [{ translateX: errorShake }] }]}
          >
            <View style={styles.codeInputs}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled,
                    error && styles.codeInputError,
                  ]}
                  value={digit}
                  onChangeText={value => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 6 : 1} // Allow paste on first input
                  selectTextOnFocus
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
              ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Animated.View>

          {/* Resend Section */}
          <ReAnimated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.resendContainer}
          >
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <View style={styles.resendActions}>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendCooldown > 0 || isResending}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (resendCooldown > 0 || isResending) && styles.linkDisabled,
                  ]}
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend code'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.separator}>•</Text>
              <TouchableOpacity onPress={handleChangeEmail} activeOpacity={0.7}>
                <Text style={styles.resendLink}>Change email</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.spamNote}>Check your spam folder if you don't see it</Text>
          </ReAnimated.View>

          {/* Manual Submit Button (if needed) */}
          {code.join('').length === 6 && (
            <ReAnimated.View entering={FadeIn.duration(300)}>
              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
                onPress={() => verifyCode(code.join(''))}
                disabled={isVerifying}
                activeOpacity={0.7}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.verifyButtonText}>VERIFY EMAIL</Text>
                )}
              </TouchableOpacity>
            </ReAnimated.View>
          )}
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
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    color: '#fff',
    fontWeight: '500',
  },
  codeContainer: {
    marginBottom: 48,
  },
  codeInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  codeInputFilled: {
    borderColor: '#666',
  },
  codeInputError: {
    borderColor: '#ff3333',
  },
  errorText: {
    fontSize: 14,
    color: '#ff3333',
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  resendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  resendLink: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linkDisabled: {
    color: '#444',
    textDecorationLine: 'none',
  },
  separator: {
    color: '#444',
  },
  spamNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  verifyButton: {
    height: 56,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    backgroundColor: '#333',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
});
