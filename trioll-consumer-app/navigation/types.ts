
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp as NavRouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  // Onboarding & Compliance
  ComplianceGate: undefined;
  MinimalOnboarding: undefined;
  // Archived screens - removed from flow
  // OnboardingCompletion: undefined;
  // InitialPreferences: undefined;

  // Main Screens
  Feed: undefined;
  TrialPlayer: { gameId: string };
  Search: undefined;
  GameDetail: { gameId: string };
  Profile: { userId?: string };
  Inventory: undefined;
  // GameLibrary: undefined; // Removed - functionality integrated into Profile screen
  // Social features removed - focusing on core gaming functionality
  // Friends: undefined;
  // Achievements: undefined;

  // Settings
  Settings: undefined;
  GameplaySettings: undefined;
  NotificationSettings: undefined;
  NotificationScreen: undefined;
  // Maximum simplification - non-essential settings removed
  // DebugMenu: undefined;
  // ActiveSessions: undefined;
  BlockedUsers: undefined;
  DataManagement: undefined;
  // LinkedAccounts: undefined;
  // OpenSourceLicenses: undefined;
  PrivacySettings: undefined;

  // Auth Screens
  Login: undefined;
  ForgotPassword: undefined;
  TwoFactor: { email: string };

  // Registration Screens
  RegistrationMethod: undefined;
  EmailRegistration: undefined;
  EmailVerification: { email: string };
  MergeGuestData: undefined;
  Welcome: { userName?: string };

  // Developer Screens - Removed (no backend support)
  // Developer portal functionality has been archived

  // Admin Screens - Admin features removed - not required for guest/authorized user system
  // AdminDashboard: undefined;
  // GameReviewQueue: undefined;
  // DetailedReview: { gameId: string };
  // UserManagement: undefined;
  // ContentModeration: undefined;
  // PlatformAnalytics: undefined;
  // SystemControls: undefined;
  // AuditLogs: undefined;
};

// Navigation prop types for each screen
export type NavigationProp<T extends keyof RootStackParamList> = StackNavigationProp<
  RootStackParamList,
  T
>;

// Route prop types for each screen
export type RouteProp<T extends keyof RootStackParamList> = NavRouteProp<RootStackParamList, T>;

// Convenience types for common screens
export type FeedNavigationProp = NavigationProp<'Feed'>;
export type TrialPlayerNavigationProp = NavigationProp<'TrialPlayer'>;
export type TrialPlayerRouteProp = RouteProp<'TrialPlayer'>;
export type GameDetailNavigationProp = NavigationProp<'GameDetail'>;
export type GameDetailRouteProp = RouteProp<'GameDetail'>;
export type ProfileNavigationProp = NavigationProp<'Profile'>;
export type ProfileRouteProp = RouteProp<'Profile'>;
