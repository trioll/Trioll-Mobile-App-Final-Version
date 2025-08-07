
// Authentication types

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  requiresTwoFactor?: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  message?: string;
  tokens?: AuthTokens;
}

export interface TwoFactorCredentials {
  code: string;
  sessionToken?: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}

export interface VerificationCredentials {
  email: string;
  code: string;
}

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  email: string;
  code: string;
  newPassword: string;
}

export interface TwoFactorResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  message?: string;
  backupCodesRemaining?: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  twoFactorEnabled: boolean;
  biometricEnabled?: boolean;
  createdAt: string;
  name?: string;
  emailVerified?: boolean;
}

export interface TwoFactorSetup {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export type AuthError = {
  code:
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'EMAIL_NOT_VERIFIED'
    | 'NETWORK_ERROR'
    | 'UNKNOWN';
  message: string;
};
