
/**
 * Navigation Type Definitions
 * Central location for all navigation-related types
 */

import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Define all screen names as a union type
export type ScreenNames = 
  | 'ComplianceGate'
  | 'MinimalOnboarding'
  | 'InitialPreferences'
  | 'Feed'
  | 'GameDetail'
  | 'TrialPlayer'
  | 'Search'
  | 'Profile'
  | 'Settings'
  | 'Friends'
  | 'Achievements'
  | 'GameLibrary'
  | 'Notifications'
  | 'Login'
  | 'TwoFactor'
  | 'ForgotPassword'
  | 'RegistrationMethod'
  | 'EmailRegistration'
  | 'EmailVerification'
  | 'MergeGuestData'
  | 'Welcome'
  // Developer screens removed - no backend support
  // Admin features removed - not required for guest/authorized user system
  // | 'AdminDashboard'
  // | 'GameReviewQueue'
  // | 'DetailedReview'
  // | 'UserManagement'
  // | 'ContentModeration'
  // | 'PlatformAnalytics'
  // | 'SystemControls'
  // | 'AuditLogs'
  | 'AccountSettings'
  | 'NotificationSettings'
  | 'PrivacySettings'
  | 'GameplaySettings'
  | 'AudioSettings'
  | 'LanguageSettings'
  | 'AppearanceSettings'
  | 'StorageSettings'
  | 'NetworkSettings'
  | 'DebugMenu'
  | 'AboutScreen';

// Root Stack Params
export type RootStackParamList = {
  ComplianceGate: undefined;
  MinimalOnboarding: undefined;
  InitialPreferences: undefined;
  Feed: undefined;
  GameDetail: { gameId: string; fromScreen?: string };
  TrialPlayer: { gameId: string };
  Search: { initialQuery?: string; initialFilters?: any };
  Profile: { userId?: string };
  Settings: undefined;
  Friends: undefined;
  Achievements: undefined;
  GameLibrary: undefined;
  Notifications: undefined;
  
  // Auth screens
  Login: { returnTo?: string };
  TwoFactor: { email: string; password: string };
  ForgotPassword: undefined;
  
  // Registration screens
  RegistrationMethod: undefined;
  EmailRegistration: undefined;
  EmailVerification: { email: string };
  MergeGuestData: undefined;
  Welcome: { username: string };
  
  // Developer screens
  // Developer screens removed - no backend support
  
  // Admin screens - Admin features removed - not required for guest/authorized user system
  // AdminDashboard: undefined;
  // GameReviewQueue: undefined;
  // DetailedReview: { gameId: string };
  // UserManagement: { userId?: string };
  // ContentModeration: undefined;
  // PlatformAnalytics: undefined;
  // SystemControls: undefined;
  // AuditLogs: undefined;
  
  // Settings sub-screens
  AccountSettings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  GameplaySettings: undefined;
  AudioSettings: undefined;
  LanguageSettings: undefined;
  AppearanceSettings: undefined;
  StorageSettings: undefined;
  NetworkSettings: undefined;
  DebugMenu: undefined;
  AboutScreen: undefined;
};

// Navigation prop types for each screen
export type ComplianceGateScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ComplianceGate'>;
export type MinimalOnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MinimalOnboarding'>;
export type FeedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Feed'>;
export type GameDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GameDetail'>;
export type TrialPlayerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TrialPlayer'>;
export type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;
export type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
export type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;
export type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
export type RegistrationMethodScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RegistrationMethod'>;

// Route prop types for each screen
export type GameDetailScreenRouteProp = RouteProp<RootStackParamList, 'GameDetail'>;
export type TrialPlayerScreenRouteProp = RouteProp<RootStackParamList, 'TrialPlayer'>;
export type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;
export type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;
export type TwoFactorScreenRouteProp = RouteProp<RootStackParamList, 'TwoFactor'>;
export type EmailVerificationScreenRouteProp = RouteProp<RootStackParamList, 'EmailVerification'>;
export type WelcomeScreenRouteProp = RouteProp<RootStackParamList, 'Welcome'>;
export type GameManagementScreenRouteProp = RouteProp<RootStackParamList, 'GameManagement'>;
// export type DetailedReviewScreenRouteProp = RouteProp<RootStackParamList, 'DetailedReview'>; // Admin features removed

// Generic navigation prop type
export type NavigationProp<T extends keyof RootStackParamList> = StackNavigationProp<RootStackParamList, T>;

// Generic route prop type
export type RouteProps<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;

// Screen props interface
export interface ScreenProps<T extends keyof RootStackParamList> {
  navigation: NavigationProp<T>;
  route: RouteProps<T>;
}

// Type guards
export function isValidScreenName(name: string): name is ScreenNames {
  const validScreens: ScreenNames[] = [
    'ComplianceGate', 'MinimalOnboarding', 'InitialPreferences', 'Feed',
    'GameDetail', 'TrialPlayer', 'Search', 'Profile', 'Settings',
    'Friends', 'Achievements', 'GameLibrary', 'Notifications',
    'Login', 'TwoFactor', 'ForgotPassword', 'RegistrationMethod',
    'EmailRegistration', 'EmailVerification', 'MergeGuestData', 'Welcome',
    // Developer screens removed - no backend support
    // Admin features removed - not required for guest/authorized user system
    // 'AdminDashboard', 'GameReviewQueue', 'DetailedReview',
    // 'UserManagement', 'ContentModeration', 'PlatformAnalytics',
    // 'SystemControls', 'AuditLogs',
    'AccountSettings',
    'NotificationSettings', 'PrivacySettings', 'GameplaySettings',
    'AudioSettings', 'LanguageSettings', 'AppearanceSettings',
    'StorageSettings', 'NetworkSettings', 'DebugMenu', 'AboutScreen'
  ];
  
  return validScreens.includes(name as ScreenNames);
}

// Helper type for navigation
export type NavigateFunction = <T extends keyof RootStackParamList>(
  screen: T,
  params?: RootStackParamList[T]
) => void;

// Export all types
export type * from './navigation.types';