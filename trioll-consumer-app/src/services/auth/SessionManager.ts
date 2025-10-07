
/**
 * Session Manager
 * Handles user sessions across devices and session validation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogger } from '../../utils/logger';
import triollAPIInstance from '../api/TriollAPI';

const logger = getLogger('SessionManager');

const SESSION_METADATA_KEY = 'session_metadata';
const ACTIVE_SESSIONS_KEY = 'active_sessions';

export interface SessionInfo {
  id: string;
  deviceId: string;
  deviceName: string;
  lastActive: string;
  current: boolean;
}

export interface SessionMetadata {
  expiry: number;
  createdAt: number;
  deviceFingerprint: SessionFingerprint;
}

export interface SessionFingerprint {
  deviceId: string;
  userAgent: string;
  ipAddress: string;
}

export class SessionManager {
  static async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const response = await triollAPIInstance.makeRequest('/auth/sessions', {
        method: 'GET',
      });
      return response.sessions || [];
    } catch {
      logger.error('Failed to get active sessions:', error);
      return [];
    }
  }

  static async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    try {
      await triollAPIInstance.makeRequest(`/auth/sessions/${sessionId}/revoke`, {
        method: 'POST',
      });
      return { success: true };
    } catch {
      logger.error('Failed to revoke session:', error);
      return { success: false };
    }
  }

  static async createSession(fingerprint: SessionFingerprint): Promise<void> {
    try {
      const metadata: SessionMetadata = {
        expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        createdAt: Date.now(),
        deviceFingerprint: fingerprint,
      };
      await AsyncStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(metadata));
    } catch {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  static async validateSession(
    currentFingerprint: SessionFingerprint
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const stored = await AsyncStorage.getItem(SESSION_METADATA_KEY);
      if (!stored) {
        return { valid: false, reason: 'No session found' };
      }

      const metadata: SessionMetadata = JSON.parse(stored);

      // Check expiry
      if (metadata.expiry < Date.now()) {
        return { valid: false, reason: 'Session expired' };
      }

      // Check device fingerprint
      if (metadata.deviceFingerprint.deviceId !== currentFingerprint.deviceId) {
        return { valid: false, reason: 'Device mismatch' };
      }

      // Additional security checks could be added here
      // - IP address changes
      // - User agent changes
      // - Suspicious activity patterns

      return { valid: true };
    } catch {
      logger.error('Failed to validate session:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  static async isSessionValid(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(SESSION_METADATA_KEY);
      if (!stored) {
        return false;
      }

      const metadata: SessionMetadata = JSON.parse(stored);
      return metadata.expiry > Date.now();
    } catch {
      logger.error('Failed to check session validity:', error);
      return false;
    }
  }

  static async extendSession(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SESSION_METADATA_KEY);
      if (stored) {
        const metadata: SessionMetadata = JSON.parse(stored);
        metadata.expiry = Date.now() + 24 * 60 * 60 * 1000; // Extend by 24 hours
        await AsyncStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(metadata));
      }
    } catch {
      logger.error('Failed to extend session:', error);
    }
  }

  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_METADATA_KEY);
      await AsyncStorage.removeItem(ACTIVE_SESSIONS_KEY);
    } catch {
      logger.error('Failed to clear session:', error);
    }
    return;
}

  static async trackActivity(): Promise<void> {
    try {
      // Update last active timestamp
      const stored = await AsyncStorage.getItem(SESSION_METADATA_KEY);
      if (stored) {
        const metadata: SessionMetadata = JSON.parse(stored);
        await AsyncStorage.setItem(
          SESSION_METADATA_KEY,
          JSON.stringify({
            ...metadata,
            lastActive: Date.now(),
          })
        );
      }
    } catch {
      logger.error('Failed to track activity:', error);
    }
  }
}
