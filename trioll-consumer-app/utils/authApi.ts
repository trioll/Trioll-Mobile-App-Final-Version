
// Authentication API utilities - Mock implementation for MVP
// This file consolidates all auth-related API functions

import {
  LoginCredentials,
  LoginResponse,
  TwoFactorResponse,
  TwoFactorSetup,
  AuthTokens,
} from '../types/auth';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data for registration checks
const TAKEN_USERNAMES = ['player_one', 'trioll', 'admin', 'test', 'user123'];
const EXISTING_EMAILS = ['test@example.com', 'user@trioll.com'];

// Mock API endpoints
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  await delay(1500);

  // Mock validation - In production, this would validate against the backend
  // For testing only - these are example credentials that should be configured
  const testUsers = {
    with2FA: {
      email: 'test@example.com',
      username: 'testuser',
      // Test password - NEVER use in production
      testPassword: process.env.TEST_USER_PASSWORD || 'test_password_only',
    },
    regular: {
      email: 'user@example.com',
      // Test password - NEVER use in production
      testPassword: process.env.TEST_USER_PASSWORD_2 || 'test_password_only',
    },
  };

  if (
    credentials.emailOrUsername === testUsers.with2FA.email ||
    credentials.emailOrUsername === testUsers.with2FA.username
  ) {
    if (credentials.password === testUsers.with2FA.testPassword) {
      // Mock 2FA required for this user
      return {
        success: true,
        requiresTwoFactor: true,
      };
    } else {
      return {
        success: false,
        message: 'Invalid password',
      };
    }
  }

  // Mock regular user without 2FA
  if (
    credentials.emailOrUsername === testUsers.regular.email &&
    credentials.password === testUsers.regular.testPassword
  ) {
    return {
      success: true,
      token: `token_${Date.now()}`,
      refreshToken: `refresh_${Date.now()}`,
      user: {
        id: 'user_123',
        username: 'player_one',
        email: 'user@example.com',
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    message: 'Invalid email or password',
  };
};

export const verifyTwoFactor = async (
  code: string,
  isBackupCode = false
): Promise<TwoFactorResponse> => {
  await delay(1000);

  // Mock: Accept "123456" as valid TOTP or "BACKUP123" as backup code
  if (code === '123456' || (isBackupCode && code === 'BACKUP123')) {
    return {
      success: true,
      token: `token_${Date.now()}`,
      refreshToken: `refresh_${Date.now()}`,
      user: {
        id: 'user_456',
        username: 'testuser',
        email: 'test@example.com',
        twoFactorEnabled: true,
        createdAt: new Date().toISOString(),
      },
      backupCodesRemaining: isBackupCode ? 7 : undefined,
    };
  }

  return {
    success: false,
    message: isBackupCode ? 'Invalid backup code' : 'Invalid authentication code',
  };
};

export const sendPasswordResetEmail = async (
  email: string
): Promise<{ success: boolean; message?: string }> => {
  await delay(1500);

  // Mock: Accept any valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(email)) {
    // Mock: Password reset link would be sent to ${email}
    return {
      success: true,
      message: 'Password reset link sent to your email',
    };
  }

  return {
    success: false,
    message: 'No account found with this email',
  };
};

export const setupTwoFactor = async (): Promise<TwoFactorSetup> => {
  await delay(1000);

  // Mock QR code and secret
  return {
    qrCode:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    secret: 'JBSWY3DPEHPK3PXP',
    backupCodes: [
      'BACKUP123',
      'BACKUP456',
      'BACKUP789',
      'BACKUP012',
      'BACKUP345',
      'BACKUP678',
      'BACKUP901',
      'BACKUP234',
    ],
  };
};

export const enableTwoFactor = async (
  code: string
): Promise<{ success: boolean; message?: string }> => {
  await delay(1000);

  if (code === '123456') {
    return {
      success: true,
      message: 'Two-factor authentication enabled',
    };
  }

  return {
    success: false,
    message: 'Invalid verification code',
  };
};

export const disableTwoFactor = async (
  password: string
): Promise<{ success: boolean; message?: string }> => {
  await delay(1000);

  // Mock password verification - In production, this would validate against the backend
  const validTestPasswords = [
    process.env.TEST_USER_PASSWORD || 'test_password_only',
    process.env.TEST_USER_PASSWORD_2 || 'test_password_only',
  ];

  if (validTestPasswords.includes(password)) {
    return {
      success: true,
      message: 'Two-factor authentication disabled',
    };
  }

  return {
    success: false,
    message: 'Incorrect password',
  };
};

export const regenerateBackupCodes = async (): Promise<{
  success: boolean;
  backupCodes?: string[];
  message?: string;
}> => {
  await delay(1000);

  return {
    success: true,
    backupCodes: ['NEW123', 'NEW456', 'NEW789', 'NEW012', 'NEW345', 'NEW678', 'NEW901', 'NEW234'],
  };
};

export const refreshAuthToken = async (_refreshToken: string): Promise<AuthTokens | null> => {
  await delay(500);

  // Mock token refresh
  return {
    accessToken: `token_${Date.now()}`,
    refreshToken: `refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600000, // 1 hour
  };
};

// ============= Registration API Functions (from mockAuthApi.ts) =============

export const checkEmailAvailability = async (
  email: string
): Promise<{ available: boolean; message?: string }> => {
  await delay(500); // Simulate network delay

  if (EXISTING_EMAILS.includes(email.toLowerCase())) {
    return {
      available: false,
      message: 'An account with this email already exists',
    };
  }

  return { available: true };
};

export const checkUsernameAvailability = async (
  username: string
): Promise<{
  available: boolean;
  suggestions?: string[];
  message?: string;
}> => {
  await delay(300); // Simulate network delay

  if (TAKEN_USERNAMES.includes(username.toLowerCase())) {
    // Generate suggestions
    const suggestions = [
      `${username}_${Math.floor(Math.random() * 999)}`,
      `${username}gaming`,
      `${username}plays`,
    ];

    return {
      available: false,
      suggestions,
      message: 'This username is taken',
    };
  }

  return { available: true };
};

export const registerUser = async (_data: {
  email: string;
  username: string;
  password: string;
}): Promise<{
  success: boolean;
  userId?: string;
  message?: string;
}> => {
  await delay(1500); // Simulate network delay

  // Mock success
  return {
    success: true,
    userId: `user_${Date.now()}`,
  };
};

export const sendVerificationCode = async (
  email: string
): Promise<{ success: boolean; message?: string }> => {
  await delay(1000);

  // Mock: Verification code would be sent to ${email}: 123456
  return {
    success: true,
    message: 'Verification code sent',
  };
};

export const verifyEmailCode = async (
  email: string,
  code: string
): Promise<{
  success: boolean;
  token?: string;
  message?: string;
}> => {
  await delay(1000);

  // Mock: Accept "123456" as valid code
  if (code === '123456') {
    return {
      success: true,
      token: `token_${Date.now()}`,
    };
  }

  return {
    success: false,
    message: 'Invalid verification code',
  };
};

export const resendVerificationCode = async (
  email: string
): Promise<{ success: boolean; message?: string }> => {
  await delay(1000);

  // Mock: Resending verification code to ${email}: 123456
  return {
    success: true,
    message: 'New code sent',
  };
};
