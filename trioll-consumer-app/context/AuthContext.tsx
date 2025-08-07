
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeAuthService } from '../src/services/auth/safeAuthService';
import { guestModeConfig } from '../src/config/guestModeConfig';
import { getLogger } from '../src/utils/logger';
import { Config } from '../src/config/environments';
import { configureAPIForGuest } from '../src/services/api/TriollAPI';

const logger = getLogger('AuthContext');

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  mfaRequired?: boolean;
  mfaType?: string;
  newPasswordRequired?: boolean;
  error?: string;
  user?: any;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

interface AuthContextType {
  userId: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUserId: () => Promise<string>;
  checkAuthStatus: () => Promise<void>;
  authenticateAsGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to get current user ID
      const currentUserId = await safeAuthService.getCurrentUserId();

      if (currentUserId) {
        setUserId(currentUserId);
        // Check if it's a guest ID
        if (currentUserId.startsWith(guestModeConfig.GUEST_ID_PREFIX)) {
          setIsGuest(true);
          setIsAuthenticated(false);
        } else {
          setIsGuest(false);
          setIsAuthenticated(true);
        }
      } else {
        // No user ID, create guest
        const guestId = await safeAuthService.getCurrentUserId();
        setUserId(guestId);
        setIsGuest(true);
        setIsAuthenticated(false);
      }
    } catch (error: unknown) {
      logger.error('Auth check failed, defaulting to guest:', error);
      // Always fall back to guest mode
      const guestId = await safeAuthService.getCurrentUserId();
      setUserId(guestId);
      setIsGuest(true);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      await safeAuthService.login({ email, password });
      await checkAuthStatus();
    } catch (error: unknown) {
      setError((error as any).message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await safeAuthService.logout();
      // Reset to guest mode
      await checkAuthStatus();
    } catch (error: unknown) {
      logger.error('Logout error:', error);
      // Even if logout fails, reset to guest
      await checkAuthStatus();
    }
    return;
};

  const getCurrentUserId = async (): Promise<string> => {
    return await safeAuthService.getCurrentUserId();
  };

  const authenticateAsGuest = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate a unique guest identity ID
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const identityId = `${Config.AWS_REGION}:${timestamp}-${randomId}`;
      
      // Create guest user object
      const guestId = `${guestModeConfig.GUEST_ID_PREFIX}${identityId}`;
      
      // Configure API client with guest mode
      // The backend accepts requests without auth for guest users
      await configureAPIForGuest({
        accessKeyId: 'guest-access',
        secretAccessKey: 'guest-secret',
        sessionToken: undefined,
        expiration: new Date(Date.now() + 3600000), // 1 hour
        identityId: identityId,
      });
      
      // Update state
      setUserId(guestId);
      setIsGuest(true);
      setIsAuthenticated(false);
      
      logger.info('Guest authentication successful', { guestId, identityId });
    } catch (error) {
      logger.error('Guest authentication failed:', error);
      setError('Failed to authenticate as guest');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    userId,
    isAuthenticated,
    isGuest,
    isLoading,
    error,
    login,
    logout,
    getCurrentUserId,
    checkAuthStatus,
    authenticateAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
