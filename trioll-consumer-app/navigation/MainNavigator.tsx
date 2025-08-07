
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { SCREENS } from './screens';

// Screens
import { FeedScreen } from '../screens/FeedScreen';
import { TrialPlayerScreen } from '../screens/TrialPlayerScreen';
// import { MinimalOnboardingScreen } from '../screens/MinimalOnboardingScreen'; // Bypassed - going directly to Feed
import { ComplianceGateScreen } from '../screens/ComplianceGateScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { GameDetailScreen } from '../screens/GameDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GameplaySettingsScreen } from '../screens/settings/GameplaySettingsScreen';
// import { DebugMenuScreen } from '../screens/settings/DebugMenuScreen'; // Maximum simplification
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
// Archived screens - moved to screens/archive/
// import { InitialPreferencesScreen } from '../screens/InitialPreferencesScreen';
// import { OnboardingCompletionScreen } from '../screens/OnboardingCompletionScreen';
// import { GameLibraryScreen } from '../screens/GameLibraryScreen'; // Removed - functionality integrated into Profile screen
// Social features removed - focusing on core gaming functionality
// import { FriendsScreen } from '../screens/FriendsScreen';
// import { AchievementsScreen } from '../screens/AchievementsScreen';

// Auth screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { TwoFactorScreen } from '../screens/auth/TwoFactorScreen';

// Registration screens
import { RegistrationMethodScreen } from '../screens/registration/RegistrationMethodScreen';
import { EmailRegistrationScreen } from '../screens/registration/EmailRegistrationScreen';
import { EmailVerificationScreen } from '../screens/registration/EmailVerificationScreen';
import { MergeGuestDataScreen } from '../screens/registration/MergeGuestDataScreen';
import { WelcomeScreen } from '../screens/registration/WelcomeScreen';

// Developer screens - Removed (no backend support)
// Developer portal functionality has been archived

// Admin screens - Admin features removed - not required for guest/authorized user system
// import { AdminDashboard } from '../screens/admin/AdminDashboard';
// import { GameReviewQueue } from '../screens/admin/GameReviewQueue';
// import { DetailedReview } from '../screens/admin/DetailedReview';
// import { UserManagement } from '../screens/admin/UserManagement';
// import { ContentModeration } from '../screens/admin/ContentModeration';
// import { PlatformAnalytics } from '../screens/admin/PlatformAnalytics';
// import { SystemControls } from '../screens/admin/SystemControls';
// import { AuditLogs } from '../screens/admin/AuditLogs';

// Settings screens - Maximum simplification
// import { ActiveSessions } from '../screens/settings/ActiveSessions';
import { BlockedUsers } from '../screens/settings/BlockedUsers';
import { DataManagement } from '../screens/settings/DataManagement';
// import { LinkedAccounts } from '../screens/settings/LinkedAccounts';
// import { OpenSourceLicenses } from '../screens/settings/OpenSourceLicenses';
import { PrivacySettings } from '../screens/settings/PrivacySettings';

const Stack = createStackNavigator<RootStackParamList>();

interface MainNavigatorProps {
  needsCompliance: boolean;
}

export const MainNavigator: React.FC<MainNavigatorProps> = ({ needsCompliance }) => {
  return (
    <Stack.Navigator
      id={undefined} initialRouteName={needsCompliance ? SCREENS.COMPLIANCE_GATE : SCREENS.FEED}
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
    >
      {/* Onboarding & Compliance */}
      <Stack.Screen name={SCREENS.COMPLIANCE_GATE} component={ComplianceGateScreen} />
      {/* Minimal onboarding bypassed - going directly to Feed after compliance */}
      {/* <Stack.Screen name={SCREENS.MINIMAL_ONBOARDING} component={MinimalOnboardingScreen} /> */}
      {/* Archived screens - removed from flow */}
      {/* <Stack.Screen name={SCREENS.ONBOARDING_COMPLETION} component={OnboardingCompletionScreen} /> */}
      {/* <Stack.Screen name={SCREENS.INITIAL_PREFERENCES} component={InitialPreferencesScreen} /> */}

      {/* Main Screens */}
      <Stack.Screen name={SCREENS.FEED} component={FeedScreen} />
      <Stack.Screen name={SCREENS.TRIAL_PLAYER} component={TrialPlayerScreen} />
      <Stack.Screen name={SCREENS.SEARCH} component={SearchScreen} />
      <Stack.Screen name={SCREENS.GAME_DETAIL} component={GameDetailScreen} />
      <Stack.Screen name={SCREENS.PROFILE} component={ProfileScreen} />
      <Stack.Screen name={SCREENS.INVENTORY} component={InventoryScreen} />
      {/* <Stack.Screen name={SCREENS.GAME_LIBRARY} component={GameLibraryScreen} /> */}
      {/* Removed - functionality integrated into Profile screen */}
      {/* Social features removed - focusing on core gaming functionality */}
      {/* <Stack.Screen name={SCREENS.FRIENDS} component={FriendsScreen} /> */}
      {/* <Stack.Screen name={SCREENS.ACHIEVEMENTS} component={AchievementsScreen} /> */}

      {/* Settings */}
      <Stack.Screen name={SCREENS.SETTINGS} component={SettingsScreen} />
      <Stack.Screen name={SCREENS.GAMEPLAY_SETTINGS} component={GameplaySettingsScreen} />
      <Stack.Screen name={SCREENS.NOTIFICATION_SETTINGS} component={NotificationSettingsScreen} />
      {/* Maximum simplification - non-essential settings removed */}
      {/* <Stack.Screen name={SCREENS.DEBUG_MENU} component={DebugMenuScreen} /> */}

      {/* <Stack.Screen name={SCREENS.ACTIVE_SESSIONS} component={ActiveSessions} /> */}
      <Stack.Screen name={SCREENS.BLOCKED_USERS} component={BlockedUsers} />
      <Stack.Screen name={SCREENS.DATA_MANAGEMENT} component={DataManagement} />
      {/* <Stack.Screen name={SCREENS.LINKED_ACCOUNTS} component={LinkedAccounts} /> */}
      {/* <Stack.Screen name={SCREENS.OPEN_SOURCE_LICENSES} component={OpenSourceLicenses} /> */}
      <Stack.Screen name={SCREENS.PRIVACY_SETTINGS} component={PrivacySettings} />

      {/* Auth Screens */}
      <Stack.Screen name={SCREENS.LOGIN} component={LoginScreen} />
      <Stack.Screen name={SCREENS.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={SCREENS.TWO_FACTOR} component={TwoFactorScreen} />

      {/* Registration Screens */}
      <Stack.Screen name={SCREENS.REGISTRATION_METHOD} component={RegistrationMethodScreen} />
      <Stack.Screen name={SCREENS.EMAIL_REGISTRATION} component={EmailRegistrationScreen} />
      <Stack.Screen name={SCREENS.EMAIL_VERIFICATION} component={EmailVerificationScreen} />
      <Stack.Screen name={SCREENS.MERGE_GUEST_DATA} component={MergeGuestDataScreen} />
      <Stack.Screen name={SCREENS.WELCOME} component={WelcomeScreen} />

      {/* Developer Screens - Removed (no backend support) */}
      {/* Developer portal functionality has been archived */}

      {/* Admin Screens - Admin features removed - not required for guest/authorized user system */}
      {/* <Stack.Screen name={SCREENS.ADMIN_DASHBOARD} component={AdminDashboard} /> */}
      {/* <Stack.Screen name={SCREENS.GAME_REVIEW_QUEUE} component={GameReviewQueue} /> */}
      {/* <Stack.Screen name={SCREENS.DETAILED_REVIEW} component={DetailedReview} /> */}
      {/* <Stack.Screen name={SCREENS.USER_MANAGEMENT} component={UserManagement} /> */}
      {/* <Stack.Screen name={SCREENS.CONTENT_MODERATION} component={ContentModeration} /> */}
      {/* <Stack.Screen name={SCREENS.PLATFORM_ANALYTICS} component={PlatformAnalytics} /> */}
      {/* <Stack.Screen name={SCREENS.SYSTEM_CONTROLS} component={SystemControls} /> */}
      {/* <Stack.Screen name={SCREENS.AUDIT_LOGS} component={AuditLogs} /> */}
    </Stack.Navigator>
  );
};
