/**
 * Hook to sync authentication state with AppContext
 * Ensures currentUser is updated when auth state changes
 */

import { useEffect } from 'react';
import { Hub } from 'aws-amplify/utils';
import { useApp } from '../../context/AppContext';
import { useUserProfile } from './useUserProfile';
import { safeAuthService } from '../services/auth/safeAuthService';
import { getLogger } from '../utils/logger';

const logger = getLogger('useAuthSync');

export const useAuthSync = () => {
  const { setCurrentUser } = useApp();
  const { profileData, refreshProfile } = useUserProfile();

  useEffect(() => {
    // Update currentUser when profile data changes
    if (profileData?.user) {
      const isAuthenticated = !profileData.user.username.startsWith('Guest');
      
      if (isAuthenticated) {
        logger.info('Updating currentUser with authenticated profile:', profileData.user.username);
        setCurrentUser({
          id: profileData.user.id,
          username: profileData.user.username,
          displayName: profileData.user.displayName,
          avatar: profileData.user.avatar,
          level: profileData.user.level,
          xp: profileData.xp.current,
          isPro: profileData.user.isPro,
        });
      }
    }
  }, [profileData, setCurrentUser]);

  useEffect(() => {
    // Listen for auth state changes
    const authListener = Hub.listen('auth', async ({ payload }) => {
      logger.info('Auth event in auth sync:', payload.event);
      
      if (payload.event === 'signedIn') {
        // User signed in - refresh profile to get latest data
        logger.info('User signed in, refreshing profile for sync...');
        setTimeout(() => {
          refreshProfile();
        }, 1000); // Give time for backend to update
      } else if (payload.event === 'signedOut') {
        // User signed out - clear current user
        logger.info('User signed out, clearing current user');
        setCurrentUser(null);
      }
    });

    // Check initial auth state
    const checkInitialAuth = async () => {
      const isAuthenticated = await safeAuthService.isAuthenticated();
      if (isAuthenticated && !profileData) {
        logger.info('User is authenticated on mount, refreshing profile...');
        refreshProfile();
      }
    };

    checkInitialAuth();

    return () => {
      authListener();
    };
  }, [refreshProfile, setCurrentUser]);

  return { profileData };
};