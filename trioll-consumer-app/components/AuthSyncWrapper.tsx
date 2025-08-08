/**
 * Wrapper component that syncs authentication state with AppContext
 * This ensures all user interactions use the correct user data
 */

import React from 'react';
import { useAuthSync } from '../src/hooks/useAuthSync';

interface AuthSyncWrapperProps {
  children: React.ReactNode;
}

export const AuthSyncWrapper: React.FC<AuthSyncWrapperProps> = ({ children }) => {
  // This hook syncs auth state with AppContext
  useAuthSync();
  
  return <>{children}</>;
};