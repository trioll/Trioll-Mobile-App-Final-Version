
import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import { useApp } from '../../context/AppContext';
import { authAPI } from '../../src/services/auth/authAPI';
import { sessionManager } from '../../utils/sessionManager';
import { getLogger } from '../../src/utils/logger';

const logger = getLogger('TwoFactorScreen');

type RootStackParamList = {
  TwoFactor: { emailOrUsername: string; rememberMe: boolean };
  Feed: undefined;
};

type TwoFactorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TwoFactor'>;
type TwoFactorScreenRouteProp = RouteProp<RootStackParamList, 'TwoFactor'>;

export const TwoFactorScreen = () => {
  const navigation = useNavigation<TwoFactorScreenNavigationProp>();
  const route = useRoute<TwoFactorScreenRouteProp>();
  const { emailOrUsername, rememberMe } = route.params;
  const { setCurrentUser } = useApp();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const countdownRotation = useSharedValue(0);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Countdown animation
  useEffect(() => {
    countdownRotation.value = withRepeat(withTiming(360, { duration: 30000 }), -1, false);
  }, []);

  const countdownStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${countdownRotation.value}deg` }],
  }));

  // Auto-focus first input
  useEffect(() => {
    if (!useBackupCode) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 500);
    }
  }, [useBackupCode]);

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
      const response = await authAPI.verifyTwoFactor({
        code: useBackupCode ? backupCode : verificationCode,
      });

      if ((response as any).success && response.token && response.user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Save session
        await sessionManager.saveSession(
          {
            accessToken: response.token,
            refreshToken: response.refreshToken!,
            expiresAt: Date.now() + 3600000, // 1 hour
          },
          response.user,
          rememberMe
        );

        // Set current user
        setCurrentUser(response.user);

        // Show backup codes warning if low
        if (response.backupCodesRemaining && response.backupCodesRemaining <= 3) {
          // TODO: Show warning modal about low backup codes remaining
        }

        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Feed' }],
        });
      } else {
        throw new Error(response.message || 'Invalid code');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? (error as any).message : 'Invalid verification code';
      logger.error('Two-factor verification error:', error);
      setError(errorMessage);

      if (!useBackupCode) {
        // Clear code inputs
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUseBackupCode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUseBackupCode(!useBackupCode);
    setError('');
    setCode(['', '', '', '', '', '']);
    setBackupCode('');
  };

  const handleHavingTrouble = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Show recovery options modal
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  if (useBackupCode) {
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

            <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
              <Ionicons name="key-outline" size={48} color="#fff" />
              <Text style={styles.title}>Enter Backup Code</Text>
              <Text style={styles.subtitle}>Use one of your 8-character backup codes</Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(200).duration(600)}
              style={styles.backupInputContainer}
            >
              <TextInput
                style={[styles.backupInput, error && styles.inputError]}
                value={backupCode}
                onChangeText={setBackupCode}
                placeholder="XXXXXXXX"
                placeholderTextColor="#444"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
                onPress={() => verifyCode(backupCode)}
                disabled={!backupCode || backupCode.length !== 8 || isVerifying}
                activeOpacity={0.7}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.verifyButtonText}>VERIFY</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={FadeIn.delay(400).duration(600)}
              style={styles.switchMethodContainer}
            >
              <TouchableOpacity onPress={handleUseBackupCode} activeOpacity={0.7}>
                <Text style={styles.switchMethodText}>Use authenticator app instead</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
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
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#fff" />
              <Animated.View style={[styles.countdown, countdownStyle]}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </Animated.View>
            </View>
            <Text style={styles.title}>Enter Authentication Code</Text>
            <Text style={styles.subtitle}>
              Open your authenticator app and enter the 6-digit code
            </Text>
          </Animated.View>

          {/* Code Input */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.codeContainer}
          >
            <View style={styles.codeInputs}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => {
                    inputRefs.current[index] = ref;
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
                />
              ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Animated.View>

          {/* Options */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.optionsContainer}
          >
            <TouchableOpacity onPress={handleUseBackupCode} activeOpacity={0.7}>
              <Text style={styles.optionLink}>Use backup code instead</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleHavingTrouble} activeOpacity={0.7}>
              <Text style={styles.optionLink}>Having trouble?</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Verify Button (manual submit) */}
          {code.join('').length === 6 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
                onPress={() => verifyCode(code.join(''))}
                disabled={isVerifying}
                activeOpacity={0.7}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.verifyButtonText}>VERIFY</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
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
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  countdown: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  codeContainer: {
    marginBottom: 32,
  },
  codeInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
  optionsContainer: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  optionLink: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  verifyButton: {
    height: 56,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
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
  backupInputContainer: {
    marginBottom: 32,
  },
  backupInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#ff3333',
  },
  switchMethodContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchMethodText: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'underline',
  },
});
