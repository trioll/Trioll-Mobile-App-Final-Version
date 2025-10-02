
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import { useApp } from '../../context/AppContext';
import { authAPI } from '../../src/services/auth/authAPI';
import { sessionManager } from '../../utils/sessionManager';
import {
  checkBiometricSupport,
  authenticateWithBiometrics,
  getBiometricCredentials,
  isBiometricAuthEnabled,
  enableBiometricAuth,
  getBiometryTypeName,
} from '../../utils/biometricAuth';

import { getLogger } from '../../src/utils/logger';
import { responsivePadding } from '../../utils/responsive';

const logger = getLogger('LoginScreen');

type RootStackParamList = {
  Login: undefined;
  TwoFactor: { emailOrUsername: string; rememberMe: boolean };
  ForgotPassword: undefined;
  RegistrationMethod: undefined;
  Feed: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { setCurrentUser } = useApp();

  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const { isAvailable, biometryType } = await checkBiometricSupport();
    setBiometricAvailable(isAvailable);

    if (isAvailable && biometryType.length > 0) {
      setBiometricType(getBiometryTypeName(biometryType[0]));

      // Check if biometric login is enabled and show option
      const isEnabled = await isBiometricAuthEnabled();
      if (isEnabled) {
        // Auto-prompt for biometric login
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    }
  };

  const handleBiometricLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const authResult = await authenticateWithBiometrics();
    if ((authResult as any).success) {
      const credentials = await getBiometricCredentials();
      if (credentials) {
        setFormData(credentials);
        // Auto-submit with biometric credentials
        await handleLogin(credentials);
      }
    }
  };

  const handleLogin = async (customCredentials?: typeof formData) => {
    if (isLoading) return;

    const credentials = customCredentials || formData;

    if (!credentials.emailOrUsername || !credentials.password) {
      setError('Please enter your email/username and password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      const response = await authAPI.login({
        ...credentials,
        rememberMe,
      });

      if ((response as any).success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (response.requiresTwoFactor) {
          // Navigate to 2FA screen
          navigation.navigate('TwoFactor' as keyof RootStackParamList, {
            emailOrUsername: credentials.emailOrUsername,
            rememberMe,
          } as any);
        } else if (response.token && response.user) {
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

          // Check if should enable biometric
          if (biometricAvailable && !response.user.biometricEnabled) {
            setShowBiometricSetup(true);
          } else {
            // Navigate to main app
            navigation.reset({
              index: 0,
              routes: [{ name: 'Feed' }],
            });
          }
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage =
        error instanceof Error ? (error as any).message : 'An error occurred. Please try again.';
      logger.error('Login error:', error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    const enabled = await enableBiometricAuth(formData.emailOrUsername, formData.password);

    if (enabled) {
      await sessionManager.updateUser({ biometricEnabled: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Feed' }],
    });
  };

  const handleSkipBiometric = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Feed' }],
    });
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ForgotPassword' as never);
  };

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('RegistrationMethod' as never);
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Biometric setup modal
  if (showBiometricSetup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.biometricSetupContainer}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.biometricSetupContent}>
            <Ionicons
              name={biometricType === 'Face ID' ? 'scan' : 'finger-print' as any}
              size={64}
              color="#fff"
            />
            <Text style={styles.biometricTitle}>Enable {biometricType}</Text>
            <Text style={styles.biometricSubtitle}>
              Sign in faster next time with {biometricType}
            </Text>

            <TouchableOpacity
              style={styles.enableBiometricButton}
              onPress={handleEnableBiometric}
              activeOpacity={0.7}
            >
              <Text style={styles.enableBiometricText}>ENABLE {biometricType.toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipBiometric}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Not now</Text>
            </TouchableOpacity>
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue playing</Text>
          </Animated.View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email/Username Input */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(600)}
              style={styles.inputContainer}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formData.emailOrUsername}
                  onChangeText={text => handleFieldChange('emailOrUsername', text)}
                  placeholder="Email or username"
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={20} color="#666" />
                </View>
              </View>
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(600)}
              style={styles.inputContainer}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={text => handleFieldChange('password', text)}
                  placeholder="Password"
                  placeholderTextColor="#444"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye' as any}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Error Message */}
            {error && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* Remember Me & Forgot Password */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={16} color="#000" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Login Button */}
            <Animated.View entering={FadeInDown.delay(400).duration(600)}>
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                onPress={() => handleLogin()}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.loginButtonText}>SIGN IN</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Biometric Login */}
            {biometricAvailable && (
              <Animated.View entering={FadeIn.delay(500).duration(600)}>
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={biometricType === 'Face ID' ? 'scan' : 'finger-print' as any}
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.biometricText}>Sign in with {biometricType}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Social Login Divider */}
            <Animated.View
              entering={FadeIn.delay(600).duration(600)}
              style={styles.dividerContainer}
            >
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </Animated.View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtons}>
              <Animated.View
                entering={FadeInDown.delay(700).duration(600)}
                style={styles.socialButtonWrapper}
              >
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <Ionicons name="logo-google" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(800).duration(600)}
                style={styles.socialButtonWrapper}
              >
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <Ionicons name="logo-apple" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Register Link */}
          <Animated.View
            entering={FadeIn.delay(900).duration(600)}
            style={styles.registerContainer}
          >
            <Text style={styles.registerText}>New to TRIOLL?</Text>
            <TouchableOpacity onPress={handleRegister} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: responsivePadding.md,
    paddingVertical: 40,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    paddingHorizontal: 48,
    fontSize: 16,
    color: '#fff',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
  },
  errorText: {
    fontSize: 14,
    color: '#ff3333',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
  },
  rememberText: {
    fontSize: 14,
    color: '#999',
  },
  forgotText: {
    fontSize: 14,
    color: '#fff',
    textDecorationLine: 'underline',
  },
  loginButton: {
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#333',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
  },
  biometricButton: {
    height: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButtonWrapper: {
    flex: 1,
  },
  socialButton: {
    height: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  biometricSetupContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: responsivePadding.xl,
  },
  biometricSetupContent: {
    alignItems: 'center',
  },
  biometricTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  biometricSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 48,
  },
  enableBiometricButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  enableBiometricText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
});
