import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, RefreshControl, Animated, StatusBar, ActivityIndicator, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Ionicons } from '@expo/vector-icons';
import { GlassContainer, GlassButton, GlassCard } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';

// Components
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { CompactStatsGrid } from '../components/profile/CompactStatsGrid';
import { RPGStatsGrid } from '../components/profile/RPGStatsGrid';
import { LevelXPSystem } from '../components/profile/LevelXPSystem';
import { GamingDNA } from '../components/profile/GamingDNA';
// Social features removed - focusing on core gaming functionality
// import { AchievementsShowcase } from '../components/profile/AchievementsShowcase';
// import { FriendsSocial } from '../components/profile/FriendsSocial';
// import { RecentActivityFeed } from '../components/profile/RecentActivityFeed';
import { ComparativeStats } from '../components/profile/ComparativeStats';
// import { HorizontalFriendsList } from '../components/profile/HorizontalFriendsList';
import { ResponsiveContainer, ResponsiveGrid, CollapsibleSection } from '../components/profile/ResponsiveContainer';

// Utils
import { useHaptics } from '../hooks/useHaptics';
import { DURATIONS } from '../constants/animations';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { ProfileEditModal } from '../components/profile/ProfileEditModal';
// import { useUserFriends } from '../hooks/useUserFriends'; // Social features removed
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface UpdatedProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
}

// Types
type RootStackParamList = {
  Profile: { userId?: string };
  Settings: undefined;
  GameLibrary: undefined;
  // Social features removed
  // Achievements: undefined;
  // Friends: undefined;
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;


// Other user profile data
const otherUserData = {
  user: {
    username: 'ChallengerPro',
  },
  comparisonStats: [
    { label: 'Trials Played', userValue: 342, otherValue: 298, higherIsBetter: true },
    { label: 'Win Rate', userValue: 78, otherValue: 82, unit: '%', higherIsBetter: true },
    { label: 'Achievements', userValue: 186, otherValue: 154, higherIsBetter: true },
    { label: 'Hours Played', userValue: 156, otherValue: 189, higherIsBetter: true },
    { label: 'Completion Rate', userValue: 78, otherValue: 71, unit: '%', higherIsBetter: true },
    { label: 'Global Rank', userValue: 1247, otherValue: 892, higherIsBetter: false },
  ],
  mutualGames: 42,
};

export const ProfileScreen: React.FC = () => {
  // Navigation hooks - always call first
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute<ProfileScreenRouteProp>();
  
  // Utility hooks
  const haptics = useHaptics();
  const layout = useResponsiveLayout();
  
  // State hooks - always declare all of them
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Get route params
  const userId = route.params?.userId;
  
  // API hooks - always call, regardless of params
  const {
    profileData,
    loading: isLoading,
    error,
    isUsingApiData,
    refreshProfile,
  } = useUserProfile(userId);
  
  // Derive user from profileData - do this before any other hooks that depend on user
  const user = profileData?.user;
  
  // Friends hook - always call with a value (undefined is ok)
  // const { friends: userFriends, totalFriends } = useUserFriends(user?.id); // Social features removed
  
  // Memoized computations - always call these
  const isOwnProfile = useMemo(
    () => !userId || (profileData && userId === profileData.user.id),
    [userId, profileData]
  );
  
  const levelProgressPercent = useMemo(
    () => profileData ? (profileData.xp.current / profileData.xp.required) * 100 : 0,
    [profileData?.xp?.current, profileData?.xp?.required]
  );
  
  const levelProgressPercentFloor = useMemo(
    () => profileData ? Math.floor((profileData.xp.current / profileData.xp.required) * 100) : 0,
    [profileData?.xp?.current, profileData?.xp?.required]
  );
  
  const statsData = useMemo(
    () => profileData ? [
      {
        icon: 'game-controller',
        value: profileData.stats.trialsPlayed,
        label: 'Trials',
        trend: 15,
        color: DS.colors.accent,
      },
      {
        icon: 'time',
        value: `${Math.round(profileData.stats.hoursPlayed)}h`,
        label: 'Played',
        trend: 8,
        color: DS.colors.primary,
      },
      {
        icon: 'trophy',
        value: profileData.stats.gamesCompleted,
        label: 'Completed',
        color: DS.colors.success,
      },
      {
        icon: 'flame',
        value: profileData.stats.winStreak,
        label: 'Streak',
        color: DS.colors.warning,
      },
      {
        icon: 'star',
        value: '4.2',
        label: 'Rating',
        color: '#FFD700',
      },
      {
        icon: 'heart',
        value: Math.round(profileData.stats.trialsPlayed * 0.4),
        label: 'Liked',
        trend: -5,
        color: '#FF66FF',
      },
    ] : [],
    [profileData?.stats]
  );
  
  // Effects - always run these
  useEffect(() => {
    if (!isLoading && profileData) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, profileData, fadeAnim]);

  // Refresh profile when screen comes into focus to get latest stats
  useFocusEffect(
    useCallback(() => {
      // Only refresh if it's the user's own profile
      // Don't refresh if we're already loading or if we just loaded (within 2 seconds)
      const lastRefreshKey = `lastProfileRefresh_${userId || 'current'}`;
      const lastRefresh = global[lastRefreshKey as any] || 0;
      const now = Date.now();
      
      if (isOwnProfile && !isLoading && (now - lastRefresh > 2000)) {
        global[lastRefreshKey as any] = now;
        refreshProfile();
      }
    }, [isOwnProfile, isLoading, userId, refreshProfile])
  );
  
  // Callbacks - always define all of them
  const handleRefresh = useCallback(async () => {
    haptics.impact('light');
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  }, [haptics, refreshProfile]);
  
  const handleBack = useCallback(() => {
    haptics.impact('light');
    navigation.goBack();
  }, [haptics, navigation]);
  
  const handleSettingsPress = useCallback(() => {
    haptics.impact('light');
    navigation.navigate('Settings' as never);
  }, [haptics, navigation]);
  
  const handleEditPress = useCallback(() => {
    haptics.impact('light');
    setShowEditModal(true);
  }, [haptics]);
  
  const handleProfileUpdate = useCallback((_updatedProfile: UpdatedProfile) => {
    refreshProfile();
  }, [refreshProfile]);
  
  const handleAddFriend = useCallback(() => {
    haptics.impact('medium');
    // Add friend logic
  }, [haptics]);
  
  const handleChallenge = useCallback(() => {
    haptics.impact('medium');
    // Challenge user logic
  }, [haptics]);
  
  const handleMessage = useCallback(() => {
    haptics.impact('light');
    // Message user logic
  }, [haptics]);
  
  
  // Social features removed
  // const handleViewAllAchievements = useCallback(() => {
  //   haptics.impact('light');
  //   navigation.navigate('Achievements' as never);
  // }, [haptics, navigation]);
  
  // const handleViewAllFriends = useCallback(() => {
  //   haptics.impact('light');
  //   navigation.navigate('Friends' as never);
  // }, [haptics, navigation]);
  
  // Early returns AFTER all hooks
  if (isLoading || !profileData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DS.colors.accent} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  
  if (!user) {
    return (
      <View style={styles.container}>
        <GlassContainer style={styles.headerBar} variant="elevated">
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <GlassButton onPress={handleBack} style={styles.backButton} variant="ghost" size="small">
              <Ionicons name="chevron-back" size={28} color={DS.colors.textPrimary} />
            </GlassButton>
            <Text style={styles.headerTitle}>PROFILE</Text>
            <View style={styles.settingsButton} />
          </SafeAreaView>
        </GlassContainer>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <GlassButton onPress={handleRefresh} variant="primary" size="medium">
            Try Again
          </GlassButton>
        </View>
      </View>
    );
  }
  
  // Main render
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Bar */}
      <GlassContainer style={styles.headerBar} variant="elevated">
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <GlassButton onPress={handleBack} style={styles.backButton} variant="ghost" size="small">
            <Ionicons name="chevron-back" size={28} color={DS.colors.textPrimary} />
          </GlassButton>
          
          <Text style={styles.headerTitle}>PROFILE</Text>
          
          {isOwnProfile ? (
            <GlassButton onPress={handleSettingsPress} style={styles.settingsButton} variant="ghost" size="small">
              <Ionicons name="settings-outline" size={24} color={DS.colors.textPrimary} />
            </GlassButton>
          ) : (
            <View style={styles.settingsButton} />
          )}
        </SafeAreaView>
      </GlassContainer>
      
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: layout.containerPadding }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={DS.colors.accent} />
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        {/* Profile Header with Stats - Combined for better density */}
        <View style={[styles.headerSection, { marginBottom: layout.sectionSpacing }]}>
          <ProfileHeader
            profile={{
              id: user.id,
              username: user.username,
              handle: user.username.toLowerCase(),
              bio: user.bio || '',
              avatar: user.avatar,
              coverImage: user.coverImage,
              level: user.level,
              isOnline: user.isOnline,
              memberSince: new Date('2024-01-01'),
              location: 'United States',
            }}
            isOwnProfile={isOwnProfile}
            onEditPress={handleEditPress}
            onAddFriendPress={handleAddFriend}
            onChallengePress={handleChallenge}
            onMessagePress={handleMessage}
          />
          
          {/* Inline Level Progress */}
          {layout.showInlineLevel && (
            <View style={styles.inlineLevelContainer}>
              <View style={styles.levelProgressBar}>
                <View style={[
                  styles.levelProgressFill,
                  { width: `${levelProgressPercent}%` }
                ]} />
              </View>
              <Text style={styles.levelProgressText}>
                {levelProgressPercentFloor}% → Level {user.level + 1}
              </Text>
            </View>
          )}
        </View>
        
        {/* Character Stats - RPG Attributes */}
        <CollapsibleSection
          title="Character Stats"
          defaultExpanded={true}
          style={{ marginBottom: layout.sectionSpacing }}
        >
          <RPGStatsGrid stats={profileData?.stats || {
            trialsPlayed: 0,
            hoursPlayed: 0,
            gamesCompleted: 0,
            winStreak: 0,
            likesGiven: 0,
            ratingsGiven: 0,
            gamesShared: 0,
            totalTimeSpentMinutes: 0,
            currentStreak: 0,
            gamesPlayed: 0,
          }} />
        </CollapsibleSection>
        
        {/* Level & XP System - Only show full version if not inline */}
        {!layout.showInlineLevel && (
          <ResponsiveContainer variant="card" style={{ marginBottom: layout.sectionSpacing }}>
            <LevelXPSystem
              level={user.level}
              levelTitle={`Level ${user.level} Gamer`}
              currentXP={profileData.xp.current}
              nextLevelXP={profileData.xp.required}
              nextLevelRewards={profileData.xp.nextRewards.map((reward, index) => ({
                title: reward,
                description: 'Complete more trials to unlock',
                icon: index === 0 ? 'trophy' : index === 1 ? 'ribbon' : 'gift',
              }))}
              onViewHistory={() => {}}
            />
          </ResponsiveContainer>
        )}
        
        {/* Play Style - Collapsible on mobile */}
        {profileData.gamingDNA && (
          <CollapsibleSection
            title="Play Style"
            defaultExpanded={!layout.collapseSections}
            preview={
              <View style={styles.genrePreview}>
                {profileData.gamingDNA.genres.slice(0, 3).map(g => (
                  <Text key={g.name} style={[styles.genreChip, { color: g.color }]}>
                    {g.name} {g.percentage}%
                  </Text>
                ))}
              </View>
            }
            style={{ marginBottom: layout.sectionSpacing }}
          >
            <GamingDNA
              genrePreferences={profileData.gamingDNA.genres.map(g => ({
                genre: g.name,
                percentage: g.percentage,
                color: g.color,
              }))}
              playPatterns={profileData.gamingDNA.playStyle.map((style, index) => ({
                title: style,
                icon: index === 0 ? 'flash' : index === 1 ? 'trophy' : 'star',
                description: 'Your gaming style',
                color: index === 0 ? '#FF0066' : index === 1 ? '#00FF88' : '#0088FF',
              }))}
              insights={profileData.gamingDNA.insights}
              peakPlayTimes={profileData.gamingDNA.peakHours.map(h => ({
                hour: parseInt(h.hour),
                activity: h.activity,
              }))}
            />
          </CollapsibleSection>
        )}
        
        {/* Responsive Grid Layout for larger screens */}
        {layout.columns > 1 ? (
          <View style={{ marginBottom: layout.sectionSpacing }}>
            {/* Add responsive content here when ready */}
          </View>
        ) : (
          <>
            {/* Single column layout - optimized for portrait */}
            {/* Achievements - Social features removed */}
            {/* <ResponsiveContainer 
              variant="card" 
              style={{ 
                marginBottom: layout.isPortrait ? DS.spacing.sm : layout.sectionSpacing,
                paddingHorizontal: layout.isPortrait ? 0 : undefined,
                paddingTop: layout.isPortrait ? DS.spacing.xs : undefined,
                paddingBottom: layout.isPortrait ? DS.spacing.xs : undefined,
              }}
            >
              <AchievementsShowcase
                achievements={profileData.achievements || []}
                totalPoints={profileData.achievements?.length || 0 * 100}
                globalRank={Math.floor(Math.random() * 5000) + 1000}
                completionPercentage={Math.round((profileData.stats.achievementsUnlocked / 300) * 100)}
                onViewAll={handleViewAllAchievements}
              />
            </ResponsiveContainer> */}
            
            {/* Friends & Social - Social features removed */}
            {/* <ResponsiveContainer 
              variant="card" 
              style={{ 
                marginBottom: layout.isPortrait ? DS.spacing.sm : layout.sectionSpacing,
                paddingHorizontal: layout.isPortrait ? 0 : undefined,
                paddingTop: layout.isPortrait ? DS.spacing.xs : undefined,
                paddingBottom: layout.isPortrait ? DS.spacing.xs : undefined,
              }}
            >
              <FriendsSocial
                friends={userFriends}
                totalFriends={totalFriends}
                mutualFriends={!isOwnProfile ? 0 : undefined}
                isOwnProfile={isOwnProfile}
                onViewAll={handleViewAllFriends}
              />
            </ResponsiveContainer> */}
            
            {/* Recent Activity - Social features removed */}
            {/* <ResponsiveContainer 
              variant="card" 
              style={{ 
                marginBottom: layout.isPortrait ? DS.spacing.sm : layout.sectionSpacing 
              }}
            >
              <RecentActivityFeed activities={profileData.recentActivity || []} maxItems={10} />
            </ResponsiveContainer> */}
          </>
        )}
        
        {/* Recent Activity for 2-column layout - Social features removed */}
        {/* {layout.columns === 2 && (
          <ResponsiveContainer variant="card" style={{ marginBottom: layout.sectionSpacing }}>
            <RecentActivityFeed activities={profileData.recentActivity || []} maxItems={10} />
          </ResponsiveContainer>
        )} */}
        
        
        {/* Comparative Stats (only for other profiles) */}
        {!isOwnProfile && (
          <ResponsiveContainer variant="card" style={{ marginBottom: layout.sectionSpacing }}>
            <ComparativeStats
              otherUsername={otherUserData.user.username}
              stats={otherUserData.comparisonStats}
              mutualGames={otherUserData.mutualGames}
              onChallenge={handleChallenge}
            />
          </ResponsiveContainer>
        )}
        
        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
      
      {/* Profile Edit Modal */}
      {isOwnProfile && user && (
        <ProfileEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          currentProfile={{
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            bio: user.bio,
            avatar: user.avatar,
            coverImage: user.coverImage,
          }}
          onUpdate={handleProfileUpdate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: DS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    backgroundColor: DS.colors.background,
    borderBottomWidth: DS.layout.borderWidth,
    borderBottomColor: DS.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.lg,
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
  settingsButton: {
    width: DS.layout.buttonHeight.large,
    height: DS.layout.buttonHeight.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: DS.spacing.xl * 2,
  },
  headerSection: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusLarge,
    ...DS.effects.glassSurface,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    overflow: 'hidden',
    marginBottom: DS.spacing.sm,
  },
  inlineLevelContainer: {
    paddingHorizontal: DS.spacing.lg,
    paddingBottom: DS.spacing.md,
    marginTop: DS.spacing.md,
  },
  levelProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: DS.spacing.xs,
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: DS.colors.primary,
  },
  levelProgressText: {
    color: DS.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  genrePreview: {
    flexDirection: 'row',
    gap: DS.spacing.xs,
  },
  genreChip: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: DS.spacing.xl * 2,
  },
  loadingText: {
    color: DS.colors.textSecondary,
    fontSize: 16,
    marginTop: DS.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xl * 2,
  },
  errorText: {
    color: DS.colors.error,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: DS.spacing.lg,
  },
});