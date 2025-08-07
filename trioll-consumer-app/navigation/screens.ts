
// Screen name constants for consistent navigation
export const SCREENS = {
  // Onboarding & Compliance
  COMPLIANCE_GATE: 'ComplianceGate' as const,
  MINIMAL_ONBOARDING: 'MinimalOnboarding' as const,
  // Archived screens - removed from flow
  // ONBOARDING_COMPLETION: 'OnboardingCompletion' as const,
  // INITIAL_PREFERENCES: 'InitialPreferences' as const,

  // Main Screens
  FEED: 'Feed' as const,
  TRIAL_PLAYER: 'TrialPlayer' as const,
  SEARCH: 'Search' as const,
  GAME_DETAIL: 'GameDetail' as const,
  PROFILE: 'Profile' as const,
  INVENTORY: 'Inventory' as const,
  // GAME_LIBRARY: 'GameLibrary' as const, // Removed - functionality integrated into Profile screen
  // Social features removed - focusing on core gaming functionality
  // FRIENDS: 'Friends' as const,
  // ACHIEVEMENTS: 'Achievements' as const,

  // Settings
  SETTINGS: 'Settings' as const,
  GAMEPLAY_SETTINGS: 'GameplaySettings' as const,
  NOTIFICATION_SETTINGS: 'NotificationSettings' as const,
  // DEBUG_MENU: 'DebugMenu' as const,
  // Maximum simplification - non-essential settings removed
  // ACTIVE_SESSIONS: 'ActiveSessions' as const,
  BLOCKED_USERS: 'BlockedUsers' as const,
  DATA_MANAGEMENT: 'DataManagement' as const,
  // LINKED_ACCOUNTS: 'LinkedAccounts' as const,
  // OPEN_SOURCE_LICENSES: 'OpenSourceLicenses' as const,
  PRIVACY_SETTINGS: 'PrivacySettings' as const,

  // Auth Screens
  LOGIN: 'Login' as const,
  FORGOT_PASSWORD: 'ForgotPassword' as const,
  TWO_FACTOR: 'TwoFactor' as const,

  // Registration Screens
  REGISTRATION_METHOD: 'RegistrationMethod' as const,
  EMAIL_REGISTRATION: 'EmailRegistration' as const,
  EMAIL_VERIFICATION: 'EmailVerification' as const,
  MERGE_GUEST_DATA: 'MergeGuestData' as const,
  WELCOME: 'Welcome' as const,

  // Developer Screens - Removed (no backend support)
  // Developer portal functionality has been archived

  // Admin Screens - Admin features removed - not required for guest/authorized user system
  // ADMIN_DASHBOARD: 'AdminDashboard' as const,
  // GAME_REVIEW_QUEUE: 'GameReviewQueue' as const,
  // DETAILED_REVIEW: 'DetailedReview' as const,
  // USER_MANAGEMENT: 'UserManagement' as const,
  // CONTENT_MODERATION: 'ContentModeration' as const,
  // PLATFORM_ANALYTICS: 'PlatformAnalytics' as const,
  // SYSTEM_CONTROLS: 'SystemControls' as const,
  // AUDIT_LOGS: 'AuditLogs' as const,
} as const;

export type ScreenName = (typeof SCREENS)[keyof typeof SCREENS];
