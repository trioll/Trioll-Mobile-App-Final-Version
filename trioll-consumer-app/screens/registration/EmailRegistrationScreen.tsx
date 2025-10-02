
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import {
  validateEmail,
  validateUsername,
  validatePassword,
  getPasswordStrength,
  suggestEmailCorrection,
} from '../../utils/validation';

import { registrationService } from '../../src/services/api/registrationService';
import { getLogger } from '../../src/utils/logger';
import { responsivePadding } from '../../utils/responsive';

const logger = getLogger('EmailRegistrationScreen');

type RootStackParamList = {
  EmailRegistration: undefined;
  EmailVerification: { email: string; userId: string; password: string };
};

type EmailRegistrationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmailRegistration'
>;

export const EmailRegistrationScreen = () => {
  const navigation = useNavigation<EmailRegistrationScreenNavigationProp>();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState({
    email: false,
    username: false,
    password: false,
    confirmPassword: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const passwordStrength = getPasswordStrength(formData.password);

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak':
        return '#ff3333';
      case 'medium':
        return '#ffaa33';
      case 'strong':
        return '#33ff33';
    }
  };

  const getPasswordStrengthWidth = () => {
    switch (passwordStrength) {
      case 'weak':
        return '33%';
      case 'medium':
        return '66%';
      case 'strong':
        return '100%';
    }
  };

  // Validate email and check availability
  useEffect(() => {
    if (touched.email && formData.email) {
      const emailError = validateEmail(formData.email);
      setErrors(prev => ({ ...prev, email: emailError || '' }));

      if (!emailError) {
        // Check for typos
        const suggestion = suggestEmailCorrection(formData.email);
        setEmailSuggestion(suggestion);

        // Check availability
        emailCheckTimer.current && clearTimeout(emailCheckTimer.current);
        emailCheckTimer.current = window.setTimeout(async () => {
          setCheckingEmail(true);
          const result = await registrationService.checkEmailAvailability(formData.email);
          setCheckingEmail(false);

          if (!result.available) {
            setErrors(prev => ({
              ...prev,
              email: result.message || 'Email already exists',
            }));
          }
        }, 500);
      } else {
        setEmailSuggestion(null);
      }
    }
  }, [formData.email, touched.email]);

  // Validate username and check availability
  useEffect(() => {
    if (touched.username && formData.username) {
      const usernameError = validateUsername(formData.username);
      setErrors(prev => ({ ...prev, username: usernameError || '' }));
      setUsernameSuggestions([]);

      if (!usernameError) {
        usernameCheckTimer.current && clearTimeout(usernameCheckTimer.current);
        usernameCheckTimer.current = window.setTimeout(async () => {
          setCheckingUsername(true);
          const result = await registrationService.checkUsernameAvailability(formData.username);
          setCheckingUsername(false);

          if (!result.available) {
            setErrors(prev => ({
              ...prev,
              username: result.message || 'Username taken',
            }));
            setUsernameSuggestions(result.suggestions || []);
          }
        }, 300);
      }
    }
  }, [formData.username, touched.username]);

  // Validate password
  useEffect(() => {
    if (touched.password) {
      const passwordError = validatePassword(formData.password);
      setErrors(prev => ({ ...prev, password: passwordError || '' }));
    }

    // Check confirm password match
    if (touched.confirmPassword && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match',
        }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  }, [formData.password, formData.confirmPassword, touched]);

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field: keyof typeof formData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const applySuggestion = (suggestion: string, field: 'email' | 'username') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData(prev => ({ ...prev, [field]: suggestion }));
    if (field === 'email') {
      setEmailSuggestion(null);
    } else {
      setUsernameSuggestions([]);
    }
  };

  const handleRegister = async () => {
    if (isLoading) return;

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const usernameError = validateUsername(formData.username);
    const passwordError = validatePassword(formData.password);
    const confirmError =
      formData.password !== formData.confirmPassword ? 'Passwords do not match' : '';

    setErrors({
      email: emailError || '',
      username: usernameError || '',
      password: passwordError || '',
      confirmPassword: confirmError,
    });

    setTouched({
      email: true,
      username: true,
      password: true,
      confirmPassword: true,
    });

    if (emailError || usernameError || passwordError || confirmError || !termsAccepted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Use the registration service which handles mock/real backend switching
      const result = await registrationService.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        displayName: formData.username, // Can be customized later
      });

      if ((result as any).success) {
        // Navigate to email verification screen
        navigation.navigate('EmailVerification' as keyof RootStackParamList, {
          email: formData.email,
          userId: result.userId,
          password: formData.password, // Pass password for auto-login after verification
        } as any);
      }
    } catch (error) {
      logger.error('Registration error:', error);

      // Show specific error message to user
      const errorMessage =
        error instanceof Error ? (error as any).message : 'Registration failed. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('usernameexistsexception')) {
        setErrors(prev => ({
          ...prev,
          email: 'An account with this email already exists. Please sign in or use a different email.',
        }));
        
        // Show a helpful action
        setTimeout(() => {
          Alert.alert(
            'Account Exists',
            'An account with this email already exists.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Resend Code',
                onPress: async () => {
                  try {
                    await registrationService.resendVerificationCode(formData.email);
                    Alert.alert('Success', 'Verification code has been resent to your email.');
                    navigation.navigate('EmailVerification' as keyof RootStackParamList, {
                      email: formData.email,
                      userId: 'pending', // We don't have the userId but verification will work with email
                      password: formData.password,
                    } as any);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to resend verification code. Please try again.');
                  }
                },
              },
              {
                text: 'Go to Login',
                onPress: () => navigation.navigate('Login' as keyof RootStackParamList),
              },
            ],
          );
        }, 500);
      } else if (errorMessage.toLowerCase().includes('invalid email')) {
        setErrors(prev => ({
          ...prev,
          email: 'Please enter a valid email address',
        }));
      } else if (errorMessage.toLowerCase().includes('password')) {
        setErrors(prev => ({
          ...prev,
          password: errorMessage,
        }));
      } else {
        // Generic error
        setErrors(prev => ({
          ...prev,
          email: errorMessage,
        }));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join TRIOLL with your email</Text>
          </Animated.View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(600)}
              style={styles.inputContainer}
            >
              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={text => handleFieldChange('email', text)}
                  onBlur={() => handleFieldBlur('email')}
                  placeholder="your@email.com"
                  placeholderTextColor="#444"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {checkingEmail && (
                  <ActivityIndicator size="small" color="#666" style={styles.inputIcon} />
                )}
              </View>
              {errors.email && touched.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
              {emailSuggestion && (
                <TouchableOpacity
                  onPress={() => applySuggestion(emailSuggestion, 'email')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestion}>Did you mean {emailSuggestion}?</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Username Input */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(600)}
              style={styles.inputContainer}
            >
              <Text style={styles.label}>USERNAME</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  value={formData.username}
                  onChangeText={text => handleFieldChange('username', text)}
                  onBlur={() => handleFieldBlur('username')}
                  placeholder="3-20 characters"
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {checkingUsername && (
                  <ActivityIndicator size="small" color="#666" style={styles.inputIcon} />
                )}
              </View>
              {errors.username && touched.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
              {usernameSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionLabel}>Available:</Text>
                  {usernameSuggestions.map(suggestion => (
                    <TouchableOpacity
                      key={suggestion}
                      onPress={() => applySuggestion(suggestion, 'username')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionItem}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(600)}
              style={styles.inputContainer}
            >
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={formData.password}
                  onChangeText={text => handleFieldChange('password', text)}
                  onBlur={() => handleFieldBlur('password')}
                  placeholder="8+ characters"
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
                    name={showPassword ? 'eye-off' : 'eye' as unknown as any}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {formData.password && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <Animated.View
                      style={[
                        styles.strengthFill,
                        {
                          width: getPasswordStrengthWidth(),
                          backgroundColor: getPasswordStrengthColor(),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: getPasswordStrengthColor() }]}>
                    {passwordStrength.toUpperCase()}
                  </Text>
                </View>
              )}
              {errors.password && touched.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </Animated.View>

            {/* Confirm Password Input */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(600)}
              style={styles.inputContainer}
            >
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  value={formData.confirmPassword}
                  onChangeText={text => handleFieldChange('confirmPassword', text)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  placeholder="Re-enter password"
                  placeholderTextColor="#444"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye' as unknown as any}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && touched.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </Animated.View>

            {/* Terms Checkbox */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(600)}
              style={styles.termsContainer}
            >
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkboxInner, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Ionicons name="checkmark" size={16} color="#000" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Register Button */}
            <Animated.View entering={FadeInDown.delay(600).duration(600)}>
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  (!termsAccepted || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                activeOpacity={0.7}
                disabled={!termsAccepted || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.registerButtonText}>CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  header: {
    paddingTop: responsivePadding.md,
    paddingBottom: responsivePadding.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 16,
    color: '#fff',
  },
  inputError: {
    borderColor: '#ff3333',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  errorText: {
    fontSize: 12,
    color: '#ff3333',
    marginTop: 6,
  },
  suggestion: {
    fontSize: 12,
    color: '#4a9eff',
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  suggestionItem: {
    fontSize: 14,
    color: '#4a9eff',
    paddingVertical: 4,
    textDecorationLine: 'underline',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  termsContainer: {
    marginVertical: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  link: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  registerButton: {
    height: 56,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#333',
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
});
