
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, Switch, TextInput, Alert, Platform, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { GlassContainer, GlassButton } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';
import { DebugAPIPanel } from '../src/components/debug/DebugAPIPanel';

// Hooks & Utils
import { useHaptics } from '../hooks/useHaptics';
import { useToast } from '../hooks/useToast';
import { useOrientation } from '../hooks';
import { generateAvatar } from '../src/utils/avatarGenerator';
import { useAuth } from '../context/AuthContext';
import { StackActions } from '@react-navigation/native';

// Types
type RootStackParamList = {
  Settings: undefined;
  Profile: { userId?: string };
  PrivacySettings: undefined;
  GameplaySettings: undefined;
  NotificationSettings: undefined;
  BlockedUsers: undefined;
  // Maximum simplification - non-essential settings removed
  // ActiveSessions: undefined;
  // LinkedAccounts: undefined;
  DataManagement: undefined;
  // DeveloperDashboard: undefined; // Developer portal removed
  // AdminTools: undefined; // COMMENTED OUT FOR CONSUMER APP
  // AdminDashboard: undefined; // COMMENTED OUT FOR CONSUMER APP
  // GameReviewQueue: undefined; // COMMENTED OUT FOR CONSUMER APP
  // UserManagement: undefined; // COMMENTED OUT FOR CONSUMER APP
  // ContentModeration: undefined; // COMMENTED OUT FOR CONSUMER APP
  // PlatformAnalytics: undefined; // COMMENTED OUT FOR CONSUMER APP
  // SystemControls: undefined; // COMMENTED OUT FOR CONSUMER APP
  // AuditLogs: undefined; // COMMENTED OUT FOR CONSUMER APP
  // OpenSourceLicenses: undefined;
  // DebugMenu: undefined;
};

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'toggle' | 'action' | 'info';
  value?: boolean | string | number;
  onPress?: () => void;
  badge?: string | number;
  destructive?: boolean;
}

interface SettingSection {
  title: string;
  data: SettingItem[];
  hidden?: boolean;
}

// Mock user data
const mockUser = {
  id: 'user123',
  email: '',  // Email will be populated from actual user data
  emailVerified: true,
  avatar: generateAvatar('user123', 'Player'),
  hasPassword: true,
  passwordLastChanged: new Date('2024-01-15'),
  has2FA: false,
  linkedAccounts: ['google'],
  activeSessions: 3,
  role: 'user', // 'user' | 'developer' | 'admin' - Fixed to 'user' for consumer app
  theme: 'dark',
  language: 'en',
  notifications: {
    master: true,
    gameUpdates: true,
    social: true,
    reminders: false,
    email: false,
  },
  privacy: {
    profileVisibility: 'friends',
    dataCollection: true,
  },
  gameplay: {
    trialDuration: 'default',
    autoRotate: true,
    hapticFeedback: true,
    graphicsQuality: 'high',
    batterySaver: false,
    controlSensitivity: 50,
  },
  developer: {
    earnings: '$1,234.56',
    analyticsEnabled: true,
  },
  // admin: { // COMMENTED OUT FOR CONSUMER APP
  //   pendingModeration: 12,
  //   systemAlerts: 3,
  // },
};

// Constants
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '42';

export const SettingsScreen: React.FC = () => {
  const { width: screenWidth, height: screenHeight, isPortrait } = useOrientation();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const { logout, isGuest } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [user, setUser] = useState(mockUser);
  const [versionTaps, setVersionTaps] = useState(0);
  const [showDebugMenu, setShowDebugMenu] = useState(true); // Always show in development
  const [showAPIDebugPanel, setShowAPIDebugPanel] = useState(false);

  // Toggle handlers
  const handleToggle = useCallback(
    (settingPath: string[], value: boolean) => {
      haptics.impact('light');
      setUser(prev => {
        const newUser = { ...prev };
        let current: any = newUser;
        for (let i = 0; i < settingPath.length - 1; i++) {
          current = current[settingPath[i]];
        }
        current[settingPath[settingPath.length - 1]] = value;
        return newUser;
      });
      showToast('Setting updated', 'success');
    },
    [haptics, showToast]
  );

  // Navigation handlers
  const handleBack = () => {
    haptics.impact('light');
    navigation.goBack();
  };

  const handleProfilePress = () => {
    haptics.impact('light');
    navigation.navigate('Profile' as never);
  };

  const handleVersionTap = () => {
    const newTaps = versionTaps + 1;
    setVersionTaps(newTaps);
    
    if (newTaps === 3) {
      haptics.impact('heavy');
      setShowDebugMenu(prev => !prev);
      showToast(showDebugMenu ? 'Debug menu hidden!' : 'Debug menu shown!', 'info');
      setVersionTaps(0);
    } else if (newTaps > 1) {
      // Show progress
      haptics.impact('light');
      showToast(`${3 - newTaps} more taps for debug menu`, 'info');
    }
  };

  const handleDeleteAccount = () => {
    haptics.impact('heavy');
    
    if (isGuest) {
      Alert.alert(
        'Guest Account',
        'Guest accounts are automatically deleted after 30 days of inactivity. Create an account to save your progress permanently.',
        [
          { text: 'Create Account', onPress: () => navigation.navigate('RegistrationMethodScreen' as never) },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
    
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type "DELETE" to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Proceed',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // In a real app, this would call an API to delete the account
                      // For now, we'll simulate it and log out
                      showToast('Account deletion requested. You will receive an email confirmation.', 'info');
                      
                      // Wait a moment to show the toast
                      setTimeout(async () => {
                        await logout();
                        // Navigate to onboarding
                        navigation.dispatch(
                          StackActions.replace('MinimalOnboarding' as never)
                        );
                      }, 2000);
                    } catch (error) {
                      showToast('Failed to delete account', 'error');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleContactSupport = async () => {
    haptics.impact('light');
    
    // Get user info for email
    const userId = user?.id || 'guest';
    const appVersion = APP_VERSION;
    const platform = Platform.OS;
    const osVersion = Platform.Version;
    
    // Create email with pre-filled subject and body
    const subject = encodeURIComponent('Trioll App Support Request');
    const body = encodeURIComponent(
      `Please describe your issue or feedback:\n\n\n\n` +
      `---\n` +
      `App Information:\n` +
      `User ID: ${userId}\n` +
      `App Version: ${appVersion}\n` +
      `Platform: ${platform} ${osVersion}\n` +
      `Date: ${new Date().toISOString()}`
    );
    
    const mailtoUrl = `mailto:info@trioll.com?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        showToast('Opening email app...', 'info');
      } else {
        Alert.alert(
          'Email Not Available',
          'No email app found. Please send your feedback to info@trioll.com',
          [
            { text: 'Copy Email', onPress: async () => {
              await Clipboard.setStringAsync('info@trioll.com');
              showToast('Email address copied!', 'success');
            }},
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      showToast('Failed to open email app', 'error');
    }
  };

  const handleRateApp = () => {
    haptics.impact('light');
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/trioll',
      android: 'https://play.google.com/store/apps/details?id=com.trioll',
    });
    if (storeUrl) Linking.openURL(storeUrl);
  };

  const handleLogout = () => {
    haptics.impact('heavy');
    
    // For guest users, show different message
    if (isGuest) {
      Alert.alert(
        'Guest Account', 
        'You are currently using a guest account. Sign out will reset your guest data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
                showToast('Signed out successfully', 'success');
                // Navigate to onboarding/registration
                navigation.dispatch(
                  StackActions.replace('MinimalOnboarding' as never)
                );
              } catch (error) {
                showToast('Failed to sign out', 'error');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              showToast('Signed out successfully', 'success');
              // Navigate to login screen
              navigation.dispatch(
                StackActions.replace('Login' as never)
              );
            } catch (error) {
              showToast('Failed to sign out', 'error');
            }
          },
        },
      ]);
    }
  };

  // Build sections - MAXIMUM SIMPLIFICATION
  const sections: SettingSection[] = [
    {
      title: 'GAMEPLAY',
      data: [
        {
          id: 'gameplay-settings',
          title: 'Gameplay Settings',
          subtitle: 'Controls, graphics, performance',
          icon: 'game-controller',
          type: 'navigation',
          onPress: () => navigation.navigate('GameplaySettings' as unknown as never),
        },
      ],
    },
    {
      title: 'NOTIFICATIONS',
      data: [
        {
          id: 'notification-preferences',
          title: 'Notifications',
          subtitle: 'Game updates and alerts',
          icon: 'notifications',
          type: 'navigation',
          onPress: () => navigation.navigate('NotificationSettings' as unknown as never),
        },
      ],
    },
    {
      title: 'PRIVACY & DATA',
      data: [
        {
          id: 'privacy-settings',
          title: 'Privacy Settings',
          subtitle: 'Control your data',
          icon: 'eye-off',
          type: 'navigation',
          onPress: () => navigation.navigate('PrivacySettings' as unknown as never),
        },
        {
          id: 'data-management',
          title: 'Manage Your Data',
          subtitle: 'Download or delete',
          icon: 'download',
          type: 'navigation',
          onPress: () => navigation.navigate('DataManagement' as unknown as never),
        },
      ],
    },
  ];

  // Maximum simplification - developer section removed from settings
  // Developers can access developer portal through other entry points

  // Admin tools (conditional) - COMMENTED OUT FOR CONSUMER APP
  // if (user.role === 'admin') {
  //   sections.push({
  //     title: 'ADMIN TOOLS',
  //     data: [
  //       {
  //         id: 'admin-dashboard',
  //         title: 'Admin Dashboard',
  //         subtitle: 'System health and overview',
  //         icon: 'shield',
  //         type: 'navigation',
  //         onPress: () => {
  //           haptics.impact('light');
  //           navigation.navigate('AdminDashboard' as unknown as never);
  //         },
  //       },
  //       {
  //         id: 'game-review',
  //         title: 'Game Review Queue',
  //         icon: 'game-controller',
  //         type: 'navigation',
  //         badge: user.admin.pendingModeration,
  //         onPress: () => {
  //           haptics.impact('light');
  //           navigation.navigate('GameReviewQueue' as unknown as never);
  //         },
  //       },
  //       {
  //         id: 'user-management',
  //         title: 'User Management',
  //         icon: 'people',
  //         type: 'navigation',
  //         onPress: () => {
  //           haptics.impact('light');
  //           navigation.navigate('UserManagement' as unknown as never);
  //         },
  //       },
  //       {
  //         id: 'content-moderation',
  //         title: 'Content Moderation',
  //         icon: 'flag',
  //         type: 'navigation',
  //         badge: '28',
  //         onPress: () => {
  //           haptics.impact('light');
  //           navigation.navigate('ContentModeration' as unknown as never);
  //         },
  //       },
  //       {
  //         id: 'platform-analytics',
  //         title: 'Platform Analytics',
  //         icon: 'bar-chart',
  //         type: 'navigation',
  //         onPress: () => {
  //           haptics.impact('light');
  //           navigation.navigate('PlatformAnalytics' as unknown as never);
  //         },
  //       },
  //       {
  //         id: 'system-controls',
  //         title: 'System Controls',
  //         icon: 'settings',
  //         type: 'navigation',
  //         onPress: () => {
  //           haptics.impact('light');
  //           navigation.navigate('SystemControls' as unknown as never);
  //         },
  //       },
  //       {
  //         id: 'audit-logs',
  //         title: 'Audit Logs',
  //         icon: 'document-text',
  //         type: 'navigation',
  //         onPress: () => {
  //           haptics.impact('light');
  //           navigation.navigate('AuditLogs' as unknown as never);
  //         },
  //       },
  //     ],
  //   });
  // }

  // Maximum simplification - developer portal removed from settings
  // sections.push({
  //   title: 'CREATOR TOOLS',
  //   data: [
  //     {
  //       id: 'developer-portal',
  //       title: 'Developer Portal',
  //       subtitle: 'Upload and manage your games',
  //       icon: 'code-slash',
  //       type: 'navigation',
  //       onPress: () => {
  //         haptics.impact('light');
  //         navigation.navigate('DeveloperDashboard' as unknown as never);
  //       },
  //     },
  //   ],
  // });

  // About section - simplified to essentials only
  sections.push({
    title: 'ABOUT',
    data: [
      {
        id: 'support',
        title: 'Help & Support',
        icon: 'help-circle',
        type: 'navigation',
        onPress: handleContactSupport,
      },
      {
        id: 'version',
        title: 'Version',
        subtitle: `${APP_VERSION}`,
        icon: 'information-circle',
        type: 'info',
        onPress: handleVersionTap,
      },
    ],
  });

  // Debug menu for development
  if (showDebugMenu) {
    sections.push({
      title: 'DEBUG MENU',
      data: [
        {
          id: 'api-debug',
          title: 'API Debug Panel',
          subtitle: 'Test API connectivity',
          icon: 'bug',
          type: 'navigation',
          onPress: () => setShowAPIDebugPanel(true),
        },
        {
          id: 'debug-settings',
          title: 'Debug Settings',
          subtitle: 'Developer tools',
          icon: 'construct',
          type: 'navigation',
          onPress: () => Alert.alert('Debug Settings', 'Debug settings not implemented yet'),
        },
      ],
    });
  }

  // Account actions - simplified (removed danger zone label)
  sections.push({
    title: 'ACCOUNT',
    data: [
      {
        id: 'logout',
        title: 'Sign Out',
        icon: 'log-out',
        type: 'action',
        onPress: handleLogout,
      },
      {
        id: 'delete-account',
        title: 'Delete Account',
        icon: 'trash-outline',
        type: 'action',
        onPress: handleDeleteAccount,
        destructive: true,
      },
    ],
  });

  // Filter sections based on search
  const filteredSections = searchQuery
    ? sections
        .map(section => ({
          ...section,
          data: (section as any).data.filter(
            item =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter(section => (section as any).data.length > 0)
    : sections.filter(section => !section.hidden);

  // Render setting item
  const renderSettingItem = ({ item }: { item: SettingItem }) => {
    const isDestructive = item.destructive;
    const iconColor = isDestructive ? DS.colors.error : DS.colors.textPrimary;
    const textColor = isDestructive ? DS.colors.error : DS.colors.textPrimary;

    return (
      <Pressable
        style={({ pressed }) => [styles.settingItem, isPortrait && styles.settingItemPortrait, pressed && styles.settingItemPressed]}
        onPress={item.onPress}
      >
        <GlassContainer style={[styles.settingIconContainer, isPortrait && styles.settingIconContainerPortrait]} variant="surface">
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={isPortrait ? 20 : 24}
            color={iconColor}
          />
        </GlassContainer>

        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, isPortrait && styles.settingTitlePortrait, { color: textColor }]}>{item.title}</Text>
          {item.subtitle && <Text style={[styles.settingSubtitle, isPortrait && styles.settingSubtitlePortrait]}>{item.subtitle}</Text>}
        </View>

        {item.type === 'toggle' && (
          <Switch
            value={item.value as boolean}
            onValueChange={() => item.onPress?.()}
            trackColor={{ false: DS.colors.surface, true: DS.colors.success }}
            thumbColor={DS.colors.textPrimary}
            ios_backgroundColor={DS.colors.surface}
          />
        )}

        {item.type === 'navigation' && (
          <View style={styles.navigationRight}>
            {item.badge && (
              <View style={[styles.badge, typeof item.badge === 'number' && styles.badgeNumber]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={isPortrait ? 18 : 20} color={DS.colors.textSecondary} />
          </View>
        )}

        {item.type === 'info' && item.subtitle && (
          <Text style={styles.infoValue}>{item.subtitle}</Text>
        )}
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: SettingSection }) => (
    <GlassContainer style={[styles.sectionHeader, isPortrait && styles.sectionHeaderPortrait]} variant="transparent">
      <Text style={[styles.sectionTitle, isPortrait && styles.sectionTitlePortrait]}>{section.title}</Text>
    </GlassContainer>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <GlassContainer style={styles.header} variant="elevated">
        <SafeAreaView edges={['top']}>
          <View style={[styles.headerContent, isPortrait && styles.headerContentPortrait]}>
            <GlassButton onPress={handleBack} style={[styles.backButton, isPortrait && styles.backButtonPortrait]} variant="ghost" size="small">
              <Ionicons name="chevron-back" size={isPortrait ? 24 : 28} color={DS.colors.textPrimary} />
            </GlassButton>

            <Text style={[styles.headerTitle, isPortrait && styles.headerTitlePortrait]}>SETTINGS</Text>

            <View style={styles.headerRight} />
          </View>

          {/* Search Bar */}
          <GlassContainer style={[styles.searchContainer, isPortrait && styles.searchContainerPortrait]} variant="surface">
            <Ionicons name="search" size={isPortrait ? 18 : 20} color={DS.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isPortrait && styles.searchInputPortrait]}
              placeholder="Search settings"
              placeholderTextColor={DS.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearching(true)}
              onBlur={() => setIsSearching(false)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  haptics.impact('light');
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={DS.colors.textSecondary} />
              </Pressable>
            )}
          </GlassContainer>
        </SafeAreaView>
      </GlassContainer>

      {/* Settings List */}
      <GlassContainer style={styles.listContainer} variant="transparent">
        <SectionList
          sections={filteredSections}
          keyExtractor={item => item.id}
          renderItem={renderSettingItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No settings found</Text>
              </View>
            ) : null
          }
        />
      </GlassContainer>

      {/* API Debug Panel Modal */}
      <Modal
        visible={showAPIDebugPanel}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAPIDebugPanel(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' }}>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                setShowAPIDebugPanel(false);
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 16 }}>
              API Debug Panel
            </Text>
          </View>
          <DebugAPIPanel />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  header: {
    backgroundColor: DS.colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
  },
  backButton: {
    width: DS.layout.buttonHeight.large,
    height: DS.layout.buttonHeight.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: DS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: {
    width: DS.layout.buttonHeight.large,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: DS.spacing.lg,
    marginBottom: DS.spacing.sm,
    paddingHorizontal: DS.spacing.md,
    borderRadius: DS.effects.borderRadiusMedium,
    height: 44,
  },
  searchIcon: {
    marginRight: DS.spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: DS.colors.textPrimary,
    fontSize: 16,
  },
  clearButton: {
    padding: DS.spacing.xs / 2,
  },
  listContent: {
    paddingBottom: DS.spacing.xl * 4,
  },
  sectionHeader: {
    paddingHorizontal: DS.spacing.lg,
    paddingTop: DS.spacing.lg,
    paddingBottom: DS.spacing.xs,
    backgroundColor: DS.colors.background,
  },
  sectionTitle: {
    color: DS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.lg,
    backgroundColor: 'transparent',
  },
  settingItemPressed: {
    backgroundColor: DS.colors.surface + '10',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: DS.effects.borderRadiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DS.spacing.sm,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: DS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    color: DS.colors.textSecondary,
    fontSize: 14,
    marginTop: DS.spacing.xs / 2,
  },
  navigationRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: DS.colors.primary,
    paddingHorizontal: DS.spacing.xs,
    paddingVertical: DS.spacing.xs / 2,
    borderRadius: DS.effects.borderRadiusSmall,
    marginRight: DS.spacing.xs,
  },
  badgeNumber: {
    backgroundColor: DS.colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: DS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    color: DS.colors.textSecondary,
    fontSize: 16,
  },
  emptyState: {
    paddingTop: DS.spacing.xl * 4,
    alignItems: 'center',
  },
  emptyText: {
    color: DS.colors.textMuted,
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  
  // Portrait mode optimizations
  headerContentPortrait: {
    paddingVertical: DS.spacing.xs,
  },
  headerTitlePortrait: {
    fontSize: 18,
  },
  searchContainerPortrait: {
    height: 40,
    marginBottom: DS.spacing.xs,
    marginHorizontal: DS.spacing.md,
  },
  sectionHeaderPortrait: {
    paddingTop: DS.spacing.md,
    paddingBottom: 4,
    paddingHorizontal: DS.spacing.md,
  },
  sectionTitlePortrait: {
    fontSize: 11,
  },
  settingItemPortrait: {
    paddingVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.md,
  },
  settingIconContainerPortrait: {
    width: 36,
    height: 36,
    marginRight: DS.spacing.xs,
  },
  settingTitlePortrait: {
    fontSize: 15,
  },
  settingSubtitlePortrait: {
    fontSize: 13,
    marginTop: 2,
  },
  searchInputPortrait: {
    fontSize: 15,
  },
  backButtonPortrait: {
    width: DS.layout.buttonHeight.medium,
    height: DS.layout.buttonHeight.medium,
  },
});
