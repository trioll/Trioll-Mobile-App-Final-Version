
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Image, Animated, RefreshControl, Modal, Dimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G, Line, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '../hooks/useHaptics';
import { SPRING_CONFIGS, DURATIONS } from '../constants/animations';

// LayoutAnimation will be enabled inside component

type TabType = 'achievements' | 'leaderboards' | 'statistics';
type CategoryType = 'all' | 'gaming' | 'social' | 'exploration' | 'special';
type SortType = 'newest' | 'rarest' | 'almost' | 'points';
type LeaderboardType = 'global' | 'friends' | 'country';
type TimeRange = 'weekly' | 'monthly' | 'alltime';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  category: CategoryType;
  points: number;
  rarity: number; // percentage of players who have it
  progress?: {
    current: number;
    target: number;
  };
  isUnlocked: boolean;
  unlockedAt?: Date;
  isSecret?: boolean;
  tips?: string[];
}

interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  username: string;
  avatar: string;
  points: number;
  level: number;
  country?: string;
  isCurrentUser?: boolean;
}

interface Statistics {
  totalEarned: number;
  totalPoints: number;
  rarestAchievement?: Achievement;
  averageCompletion: number;
  achievementsPerMonth: { month: string; count: number }[];
  categoryBreakdown: { category: string; count: number; percentage: number }[];
  recentUnlocks: Achievement[];
}

// Mock data
const mockAchievements: Achievement[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first game trial',
    icon: 'game-controller',
    iconColor: '#00FF88',
    category: 'gaming',
    points: 10,
    rarity: 95,
    isUnlocked: true,
    unlockedAt: new Date(Date.now() - 86400000 * 7),
  },
  {
    id: '2',
    name: 'Speed Runner',
    description: 'Complete 10 trials in under 3 minutes each',
    icon: 'flash',
    iconColor: '#FF0066',
    category: 'gaming',
    points: 50,
    rarity: 15,
    progress: { current: 7, target: 10 },
    isUnlocked: false,
  },
  {
    id: '3',
    name: 'Social Butterfly',
    description: 'Add 25 friends',
    icon: 'people',
    iconColor: '#00FFFF',
    category: 'social',
    points: 30,
    rarity: 35,
    progress: { current: 18, target: 25 },
    isUnlocked: false,
  },
  {
    id: '4',
    name: 'Genre Master',
    description: 'Play games from 10 different genres',
    icon: 'grid',
    iconColor: '#8866FF',
    category: 'exploration',
    points: 40,
    rarity: 25,
    progress: { current: 8, target: 10 },
    isUnlocked: false,
  },
  {
    id: '5',
    name: 'Rare Gem',
    description: '???',
    icon: 'help',
    iconColor: '#FFD700',
    category: 'special',
    points: 100,
    rarity: 1,
    isUnlocked: false,
    isSecret: true,
    tips: ['This achievement is extremely rare', 'Less than 1% of players have unlocked it'],
  },
  {
    id: '6',
    name: 'Collector',
    description: 'Bookmark 50 games',
    icon: 'bookmark',
    iconColor: '#FFAA00',
    category: 'gaming',
    points: 25,
    rarity: 45,
    isUnlocked: true,
    unlockedAt: new Date(Date.now() - 86400000 * 3),
  },
];

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: '1',
    username: 'EliteGamer',
    avatar: 'https://picsum.photos/200/200?random=1',
    points: 15420,
    level: 42,
    country: 'US',
  },
  {
    rank: 2,
    userId: '2',
    username: 'ProPlayer',
    avatar: 'https://picsum.photos/200/200?random=2',
    points: 14800,
    level: 40,
    country: 'JP',
  },
  {
    rank: 3,
    previousRank: 5,
    userId: '3',
    username: 'GameMaster',
    avatar: 'https://picsum.photos/200/200?random=3',
    points: 14200,
    level: 38,
    country: 'UK',
  },
  {
    rank: 47,
    previousRank: 52,
    userId: 'current',
    username: 'You',
    avatar: 'https://picsum.photos/200/200?random=0',
    points: 8420,
    level: 24,
    country: 'US',
    isCurrentUser: true,
  },
];

const mockStatistics: Statistics = {
  totalEarned: 42,
  totalPoints: 1250,
  rarestAchievement: mockAchievements.find(a => a.rarity === 1),
  averageCompletion: 28,
  achievementsPerMonth: [
    { month: 'Jan', count: 5 },
    { month: 'Feb', count: 8 },
    { month: 'Mar', count: 12 },
    { month: 'Apr', count: 7 },
    { month: 'May', count: 10 },
  ],
  categoryBreakdown: [
    { category: 'Gaming', count: 20, percentage: 48 },
    { category: 'Social', count: 8, percentage: 19 },
    { category: 'Exploration', count: 10, percentage: 24 },
    { category: 'Special', count: 4, percentage: 9 },
  ],
  recentUnlocks: mockAchievements.filter(a => a.isUnlocked).slice(0, 3),
};

export const AchievementsScreen: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const isPortrait = SCREEN_HEIGHT > SCREEN_WIDTH;

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // State
  const [activeTab, setActiveTab] = useState<TabType>('achievements');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [timeRange, setTimeRange] = useState<TimeRange>('alltime');
  const [refreshing, setRefreshing] = useState(false);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);

  // Mock user data
  const userStats = {
    totalPoints: 8420,
    globalRank: 47,
    level: 24,
    nextLevelProgress: 0.68,
    unlockedCount: mockAchievements.filter(a => a.isUnlocked).length,
    totalCount: mockAchievements.length,
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const progressAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const levelUpScale = useRef(new Animated.Value(0)).current;
  const levelUpOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get animations
  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  const getProgressAnim = (id: string) => {
    if (!progressAnims[id]) {
      progressAnims[id] = new Animated.Value(0);
    }
    return progressAnims[id];
  };

  // Filter and sort achievements
  const filteredAchievements = useMemo(() => {
    let filtered = [...mockAchievements];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => {
          if (a.isUnlocked && b.isUnlocked) {
            return (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0);
          }
          return a.isUnlocked ? -1 : 1;
        });
        break;
      case 'rarest':
        filtered.sort((a, b) => a.rarity - b.rarity);
        break;
      case 'almost':
        filtered.sort((a, b) => {
          const aProgress = a.progress ? a.progress.current / a.progress.target : 0;
          const bProgress = b.progress ? b.progress.current / b.progress.target : 0;
          return bProgress - aProgress;
        });
        break;
      case 'points':
        filtered.sort((a, b) => b.points - a.points);
        break;
    }

    return filtered;
  }, [selectedCategory, sortBy]);

  // Categories
  const categories = [
    { id: 'all' as CategoryType, label: 'All', icon: 'apps' },
    { id: 'gaming' as CategoryType, label: 'Gaming', icon: 'game-controller' },
    { id: 'social' as CategoryType, label: 'Social', icon: 'people' },
    { id: 'exploration' as CategoryType, label: 'Exploration', icon: 'compass' },
    { id: 'special' as CategoryType, label: 'Special', icon: 'star' },
  ];

  // Tab change handler
  const handleTabChange = (tab: TabType) => {
    haptics.impact('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  // Achievement press handler
  const handleAchievementPress = (achievement: Achievement) => {
    haptics.impact('light');
    setSelectedAchievement(achievement);
    setShowDetailModal(true);
  };

  // Simulate achievement unlock
  const simulateUnlock = () => {
    (haptics as any).success();
    setShowLevelUpAnimation(true);

    Animated.parallel([
      Animated.spring(levelUpScale, {
        toValue: 1,
        ...SPRING_CONFIGS.BOUNCY,
        useNativeDriver: true,
      }),
      Animated.timing(levelUpOpacity, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(levelUpScale, {
          toValue: 0,
          duration: DURATIONS.NORMAL,
          useNativeDriver: true,
        }),
        Animated.timing(levelUpOpacity, {
          toValue: 0,
          duration: DURATIONS.NORMAL,
          useNativeDriver: true,
        }),
      ]).start(() => setShowLevelUpAnimation(false));
    }, 2000);
  };

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      (haptics as any).success();
    }, 1500);
  };

  // Render header
  const renderHeader = () => (
    <Animated.View style={[styles.header, isPortrait && styles.headerPortrait, { opacity: fadeAnim }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={isPortrait ? 24 : 28} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, isPortrait && { fontSize: 24 }]}>Achievements</Text>
            <Text style={[styles.headerSubtitle, isPortrait && { fontSize: 13 }]}>
              Level {userStats.level} • {userStats.totalPoints.toLocaleString()} points
            </Text>
          </View>
        </View>
        <View style={styles.headerStats}>
          <View style={[styles.rankBadge, isPortrait && { paddingHorizontal: 10, paddingVertical: 5 }]}>
            <Ionicons name="trophy" size={isPortrait ? 16 : 20} color="#FFD700" />
            <Text style={[styles.rankText, isPortrait && { fontSize: 14 }]}>#{userStats.globalRank}</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressOverview}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressText, isPortrait && { fontSize: 14 }]}>
            {userStats.unlockedCount}/{userStats.totalCount} Unlocked
          </Text>
          <Text style={[styles.progressPercentage, isPortrait && { fontSize: 14 }]}>
            {Math.round((userStats.unlockedCount / userStats.totalCount) * 100)}%
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: `${(userStats.unlockedCount / userStats.totalCount) * 100}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.levelProgress}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelText}>Level {userStats.level}</Text>
          <Text style={styles.levelText}>Level {userStats.level + 1}</Text>
        </View>
        <View style={styles.levelBarContainer}>
          <LinearGradient
            colors={['#00FF88', '#00D68F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.levelBar, { width: `${userStats.nextLevelProgress * 100}%` }]}
          />
        </View>
      </View>
    </Animated.View>
  );

  // Render tabs
  const renderTabs = () => (
    <View style={styles.tabs}>
      {[
        { id: 'achievements' as TabType, label: 'Achievements', icon: 'trophy' },
        { id: 'leaderboards' as TabType, label: 'Leaderboards', icon: 'podium' },
        { id: 'statistics' as TabType, label: 'Statistics', icon: 'stats-chart' },
      ].map(tab => (
        <Pressable
          key={tab.id}
          onPress={() => handleTabChange(tab.id)}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
        >
          <Ionicons
            name={tab.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={activeTab === tab.id ? '#00FF88' : '#666'}
          />
          <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // Render achievement card
  const renderAchievementCard = ({ item: achievement }: { item: Achievement }) => {
    const scaleAnim = getScaleAnim(achievement.id);
    const progressAnim = getProgressAnim(achievement.id);

    // Animate progress directly without useEffect
    if (achievement.progress) {
      Animated.timing(progressAnim, {
        toValue: achievement.progress.current / achievement.progress.target,
        duration: DURATIONS.SLOW,
        useNativeDriver: false,
      }).start();
    }

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        ...SPRING_CONFIGS.TIGHT,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...SPRING_CONFIGS.BOUNCY,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Pressable
        onPress={() => handleAchievementPress(achievement)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.achievementCard, isPortrait && styles.achievementCardPortrait]}
      >
        <Animated.View
          style={[
            styles.achievementCardContent,
            { transform: [{ scale: scaleAnim }] },
            !achievement.isUnlocked && styles.achievementLocked,
            isPortrait && { padding: 12 },
          ]}
        >
          <View style={[styles.achievementIcon, isPortrait && { width: 48, height: 48, borderRadius: 24 }, { backgroundColor: achievement.iconColor + '20' }]}>
            <Ionicons
              name={
                achievement.isSecret && !achievement.isUnlocked
                  ? 'help'
                  : (achievement.icon as keyof typeof Ionicons.glyphMap)
              }
              size={isPortrait ? 24 : 32}
              color={achievement.isUnlocked ? achievement.iconColor : '#666'}
            />
          </View>

          <View style={styles.achievementInfo}>
            <Text style={[styles.achievementName, !achievement.isUnlocked && styles.textLocked, isPortrait && { fontSize: 15 }]}>
              {achievement.isSecret && !achievement.isUnlocked ? '???' : achievement.name}
            </Text>
            <Text
              style={[styles.achievementDescription, !achievement.isUnlocked && styles.textLocked, isPortrait && { fontSize: 13 }]}
            >
              {achievement.isSecret && !achievement.isUnlocked
                ? 'Hidden achievement'
                : achievement.description}
            </Text>

            {achievement.progress && !achievement.isUnlocked && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarSmall}>
                  <Animated.View
                    style={[
                      styles.progressFillSmall,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressTextSmall, isPortrait && { fontSize: 11 }]}>
                  {achievement.progress.current}/{achievement.progress.target}
                </Text>
              </View>
            )}

            <View style={styles.achievementMeta}>
              <View style={styles.pointsBadge}>
                <Text style={[styles.pointsText, isPortrait && { fontSize: 13 }]}>{achievement.points}</Text>
                <Ionicons name="star" size={isPortrait ? 10 : 12} color="#FFD700" />
              </View>
              {achievement.rarity < 10 && (
                <View style={styles.rarityBadge}>
                  <Text style={styles.rarityText}>Rare • {achievement.rarity}%</Text>
                </View>
              )}
              {achievement.isUnlocked && achievement.unlockedAt && (
                <Text style={styles.unlockedDate}>
                  {achievement.unlockedAt.toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>

          {achievement.isUnlocked && <Ionicons name="checkmark-circle" size={24} color="#00FF88" />}
        </Animated.View>
      </Pressable>
    );
  };

  // Render achievements tab
  const renderAchievementsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
        >
          {categories.map(category => (
            <Pressable
              key={category.id}
              onPress={() => {
                haptics.impact('light');
                setSelectedCategory(category.id);
              }}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
            >
              <Ionicons
                name={category.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={selectedCategory === category.id ? '#00FF88' : '#666'}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive,
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable onPress={() => setShowSortModal(true)} style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
          <Text style={styles.sortButtonText}>Sort</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredAchievements}
        renderItem={renderAchievementCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.achievementsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00FF88"
            colors={['#00FF88']}
          />
        }
      />
    </View>
  );

  // Render leaderboard entry
  const renderLeaderboardEntry = ({ item: entry }: { item: LeaderboardEntry }) => {
    const getRankChange = () => {
      if (!entry.previousRank) return null;
      const change = entry.previousRank - entry.rank;
      if (change > 0) return { icon: 'arrow-up', color: '#00FF88', text: `+${change}` };
      if (change < 0) return { icon: 'arrow-down', color: '#FF4444', text: `${change}` };
      return null;
    };

    const rankChange = getRankChange();

    return (
      <View style={[styles.leaderboardEntry, isPortrait && styles.leaderboardEntryPortrait, entry.isCurrentUser && styles.currentUserEntry]}>
        <View style={styles.rankContainer}>
          {entry.rank <= 3 ? (
            <View
              style={[
                styles.medalBadge,
                {
                  backgroundColor:
                    entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : '#CD7F32',
                },
              ]}
            >
              <Text style={[styles.medalText, isPortrait && { fontSize: 14 }]}>{entry.rank}</Text>
            </View>
          ) : (
            <Text style={[styles.rankNumber, isPortrait && { fontSize: 16 }]}>#{entry.rank}</Text>
          )}
          {rankChange && (
            <View style={styles.rankChange}>
              <Ionicons
                name={rankChange.icon as keyof typeof Ionicons.glyphMap}
                size={isPortrait ? 10 : 12}
                color={rankChange.color}
              />
              <Text style={[styles.rankChangeText, { color: rankChange.color }, isPortrait && { fontSize: 11 }]}>
                {rankChange.text}
              </Text>
            </View>
          )}
        </View>

        <Image source={{ uri: entry.avatar }} style={[styles.leaderboardAvatar, isPortrait && { width: 40, height: 40, borderRadius: 20 }]} />

        <View style={styles.leaderboardInfo}>
          <Text style={[styles.leaderboardUsername, isPortrait && { fontSize: 15 }]}>
            {entry.isCurrentUser ? 'You' : entry.username}
          </Text>
          <Text style={[styles.leaderboardLevel, isPortrait && { fontSize: 13 }]}>Level {entry.level}</Text>
        </View>

        <View style={styles.leaderboardStats}>
          <Text style={styles.leaderboardPoints}>{entry.points.toLocaleString()}</Text>
          <Text style={styles.leaderboardPointsLabel}>points</Text>
        </View>
      </View>
    );
  };

  // Render leaderboards tab
  const renderLeaderboardsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.leaderboardControls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'global' as LeaderboardType, label: 'Global' },
            { id: 'friends' as LeaderboardType, label: 'Friends' },
            { id: 'country' as LeaderboardType, label: 'Country' },
          ].map(type => (
            <Pressable
              key={type.id}
              onPress={() => {
                haptics.impact('light');
                setLeaderboardType(type.id);
              }}
              style={[
                styles.leaderboardTypeButton,
                leaderboardType === type.id && styles.leaderboardTypeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.leaderboardTypeText,
                  leaderboardType === type.id && styles.leaderboardTypeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.timeRangeContainer}>
          {[
            { id: 'weekly' as TimeRange, label: 'Week' },
            { id: 'monthly' as TimeRange, label: 'Month' },
            { id: 'alltime' as TimeRange, label: 'All Time' },
          ].map(range => (
            <Pressable
              key={range.id}
              onPress={() => {
                haptics.impact('light');
                setTimeRange(range.id);
              }}
              style={[
                styles.timeRangeButton,
                timeRange === range.id && styles.timeRangeButtonActive,
              ]}
            >
              <Text
                style={[styles.timeRangeText, timeRange === range.id && styles.timeRangeTextActive]}
              >
                {range.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={mockLeaderboard}
        renderItem={renderLeaderboardEntry}
        keyExtractor={item => item.userId}
        contentContainerStyle={styles.leaderboardList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00FF88"
            colors={['#00FF88']}
          />
        }
      />
    </View>
  );

  // Render statistics graph
  const renderStatisticsGraph = () => {
    const graphWidth = SCREEN_WIDTH - 64;
    const graphHeight = 200;
    const padding = 20;
    const chartWidth = graphWidth - padding * 2;
    const chartHeight = graphHeight - padding * 2;

    const maxCount = Math.max(...mockStatistics.achievementsPerMonth.map(d => d.count));
    const points = mockStatistics.achievementsPerMonth.map((data, index) => {
      const x = (index / (mockStatistics.achievementsPerMonth.length - 1)) * chartWidth + padding;
      const y = graphHeight - padding - (data.count / maxCount) * chartHeight;
      return { x, y, data };
    });

    const pathData = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return (
      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>Achievement Progress</Text>
        <Svg width={graphWidth} height={graphHeight}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <Line
              key={i}
              x1={padding}
              y1={padding + (chartHeight / 4) * i}
              x2={graphWidth - padding}
              y2={padding + (chartHeight / 4) * i}
              stroke="#333"
              strokeWidth="1"
            />
          ))}

          {/* Path */}
          <Path d={pathData} stroke="#00FF88" strokeWidth="3" fill="none" />

          {/* Points */}
          {points.map((point, index) => (
            <G key={index}>
              <Circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#00FF88"
                stroke="#000"
                strokeWidth="2"
              />
              <SvgText
                x={point.x}
                y={graphHeight - 5}
                fontSize="12"
                fill="#666"
                textAnchor="middle"
              >
                {(point as any).data.month}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
    );
  };

  // Render statistics tab
  const renderStatisticsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.statsOverview}>
        <View style={[styles.statCard, isPortrait && styles.statCardPortrait]}>
          <Text style={[styles.statNumber, isPortrait && { fontSize: 20 }]}>{mockStatistics.totalEarned}</Text>
          <Text style={[styles.statLabel, isPortrait && { fontSize: 11 }]}>Total Earned</Text>
        </View>
        <View style={[styles.statCard, isPortrait && styles.statCardPortrait]}>
          <Text style={[styles.statNumber, isPortrait && { fontSize: 20 }]}>{mockStatistics.totalPoints.toLocaleString()}</Text>
          <Text style={[styles.statLabel, isPortrait && { fontSize: 11 }]}>Total Points</Text>
        </View>
        <View style={[styles.statCard, isPortrait && styles.statCardPortrait]}>
          <Text style={[styles.statNumber, isPortrait && { fontSize: 20 }]}>{mockStatistics.averageCompletion}%</Text>
          <Text style={[styles.statLabel, isPortrait && { fontSize: 11 }]}>Avg Completion</Text>
        </View>
      </View>

      {mockStatistics.rarestAchievement && (
        <View style={styles.rarestSection}>
          <Text style={[styles.sectionTitle, isPortrait && { fontSize: 16, marginBottom: 12 }]}>Rarest Achievement</Text>
          <View style={styles.rarestCard}>
            <View
              style={[
                styles.achievementIcon,
                { backgroundColor: mockStatistics.rarestAchievement.iconColor + '20' },
              ]}
            >
              <Ionicons
                name={mockStatistics.rarestAchievement.icon as keyof typeof Ionicons.glyphMap}
                size={isPortrait ? 28 : 32}
                color={mockStatistics.rarestAchievement.iconColor}
              />
            </View>
            <View style={styles.rarestInfo}>
              <Text style={[styles.rarestName, isPortrait && { fontSize: 15 }]}>{mockStatistics.rarestAchievement.name}</Text>
              <Text style={[styles.rarestRarity, isPortrait && { fontSize: 13 }]}>
                Only {mockStatistics.rarestAchievement.rarity}% of players
              </Text>
            </View>
          </View>
        </View>
      )}

      {renderStatisticsGraph()}

      <View style={styles.categoryBreakdownSection}>
        <Text style={[styles.sectionTitle, isPortrait && { fontSize: 16, marginBottom: 12 }]}>Category Breakdown</Text>
        {mockStatistics.categoryBreakdown.map(category => (
          <View key={category.category} style={styles.categoryBreakdownItem}>
            <View style={styles.categoryBreakdownInfo}>
              <Text style={[styles.categoryBreakdownName, isPortrait && { fontSize: 13 }]}>{category.category}</Text>
              <Text style={[styles.categoryBreakdownCount, isPortrait && { fontSize: 11 }]}>{category.count} achievements</Text>
            </View>
            <View style={styles.categoryBreakdownBar}>
              <View style={[styles.categoryBreakdownFill, { width: `${category.percentage}%` }]} />
            </View>
            <Text style={[styles.categoryBreakdownPercentage, isPortrait && { fontSize: 13 }]}>{category.percentage}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.recentUnlocksSection}>
        <Text style={[styles.sectionTitle, isPortrait && { fontSize: 16, marginBottom: 12 }]}>Recent Unlocks</Text>
        {mockStatistics.recentUnlocks.map(achievement => (
          <View key={achievement.id} style={[styles.recentUnlockItem, isPortrait && { padding: 10, marginBottom: 6 }]}>
            <View
              style={[styles.achievementIcon, { backgroundColor: achievement.iconColor + '20' }]}
            >
              <Ionicons
                name={achievement.icon as keyof typeof Ionicons.glyphMap}
                size={isPortrait ? 20 : 24}
                color={achievement.iconColor}
              />
            </View>
            <View style={styles.recentUnlockInfo}>
              <Text style={[styles.recentUnlockName, isPortrait && { fontSize: 13 }]}>{achievement.name}</Text>
              <Text style={[styles.recentUnlockDate, isPortrait && { fontSize: 11 }]}>
                {achievement.unlockedAt?.toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.recentUnlockPoints, isPortrait && { fontSize: 13 }]}>+{achievement.points}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // Render achievement detail modal
  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detailModal}>
          <Pressable onPress={() => setShowDetailModal(false)} style={styles.modalClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          {selectedAchievement && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailHeader}>
                <View
                  style={[
                    styles.detailIcon,
                    { backgroundColor: selectedAchievement.iconColor + '20' },
                  ]}
                >
                  <Ionicons
                    name={selectedAchievement.icon as keyof typeof Ionicons.glyphMap}
                    size={48}
                    color={selectedAchievement.iconColor}
                  />
                </View>

                <Text style={styles.detailName}>{selectedAchievement.name}</Text>
                <Text style={styles.detailDescription}>{selectedAchievement.description}</Text>

                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatNumber}>{selectedAchievement.points}</Text>
                    <Text style={styles.detailStatLabel}>Points</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatNumber}>{selectedAchievement.rarity}%</Text>
                    <Text style={styles.detailStatLabel}>Have This</Text>
                  </View>
                  {selectedAchievement.isUnlocked && (
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatNumber}>
                        {selectedAchievement.unlockedAt?.toLocaleDateString()}
                      </Text>
                      <Text style={styles.detailStatLabel}>Unlocked</Text>
                    </View>
                  )}
                </View>

                {selectedAchievement.progress && !selectedAchievement.isUnlocked && (
                  <View style={styles.detailProgress}>
                    <Text style={styles.detailProgressText}>
                      Progress: {selectedAchievement.progress.current}/
                      {selectedAchievement.progress.target}
                    </Text>
                    <View style={styles.detailProgressBar}>
                      <View
                        style={[
                          styles.detailProgressFill,
                          {
                            width: `${(selectedAchievement.progress.current / selectedAchievement.progress.target) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {selectedAchievement.tips && (
                  <View style={styles.tipsSection}>
                    <Text style={styles.tipsTitle}>Tips</Text>
                    {selectedAchievement.tips.map((tip, index) => (
                      <View key={index} style={styles.tipItem}>
                        <Ionicons name="bulb" size={16} color="#FFD700" />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.detailActions}>
                  <Pressable style={styles.shareButton} onPress={simulateUnlock}>
                    <Ionicons name="share-social" size={20} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Share Achievement</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Render sort modal
  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
        <View style={styles.sortModal}>
          <Text style={styles.sortModalTitle}>Sort By</Text>
          {[
            { id: 'newest' as SortType, label: 'Newest First' },
            { id: 'rarest' as SortType, label: 'Rarest First' },
            { id: 'almost' as SortType, label: 'Almost Complete' },
            { id: 'points' as SortType, label: 'Highest Points' },
          ].map(option => (
            <Pressable
              key={option.id}
              onPress={() => {
                setSortBy(option.id);
                setShowSortModal(false);
                haptics.selection();
              }}
              style={[styles.sortOption, sortBy === option.id && styles.sortOptionActive]}
            >
              <Text
                style={[styles.sortOptionText, sortBy === option.id && styles.sortOptionTextActive]}
              >
                {option.label}
              </Text>
              {sortBy === option.id && <Ionicons name="checkmark" size={20} color="#00FF88" />}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  // Render level up animation
  const renderLevelUpAnimation = () =>
    showLevelUpAnimation && (
      <Animated.View
        style={[
          styles.levelUpContainer,
          {
            opacity: levelUpOpacity,
            transform: [{ scale: levelUpScale }],
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient colors={['#00FF88', '#00D68F']} style={styles.levelUpGradient}>
          <Ionicons name="trending-up" size={80} color="#FFFFFF" />
          <Text style={styles.levelUpText}>LEVEL UP!</Text>
          <Text style={styles.levelUpSubtext}>You reached Level 25</Text>
        </LinearGradient>
      </Animated.View>
    );

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabs()}

      <View style={styles.content}>
        {activeTab === 'achievements' && renderAchievementsTab()}
        {activeTab === 'leaderboards' && renderLeaderboardsTab()}
        {activeTab === 'statistics' && renderStatisticsTab()}
      </View>

      {renderDetailModal()}
      {renderSortModal()}
      {renderLevelUpAnimation()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    marginLeft: 6,
  },
  progressOverview: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    color: '#00FF88',
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  levelProgress: {
    marginTop: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  levelText: {
    fontSize: 12,
    color: '#666',
  },
  levelBarContainer: {
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelBar: {
    height: '100%',
    borderRadius: 3,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#00FF88',
  },
  tabLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#00FF88',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  filtersContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  categoryFilters: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#999',
  },
  categoryButtonTextActive: {
    color: '#00FF88',
    fontWeight: '600',
  },
  sortButton: {
    position: 'absolute',
    right: 20,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  achievementsList: {
    padding: 20,
  },
  achievementCard: {
    marginBottom: 12,
  },
  achievementCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 16,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  textLocked: {
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarSmall: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: '#00FF88',
  },
  progressTextSmall: {
    fontSize: 12,
    color: '#00FF88',
    fontWeight: '600',
  },
  achievementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },
  rarityBadge: {
    backgroundColor: 'rgba(255, 0, 102, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF0066',
  },
  rarityText: {
    fontSize: 12,
    color: '#FF0066',
    fontWeight: '600',
  },
  unlockedDate: {
    fontSize: 12,
    color: '#666',
  },
  leaderboardControls: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  leaderboardTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  leaderboardTypeButtonActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
  },
  leaderboardTypeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  leaderboardTypeTextActive: {
    color: '#00FF88',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#000',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
  },
  timeRangeTextActive: {
    color: '#00FF88',
    fontWeight: '600',
  },
  leaderboardList: {
    padding: 20,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  currentUserEntry: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  rankContainer: {
    width: 60,
    alignItems: 'center',
  },
  medalBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rankChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rankChangeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  leaderboardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 12,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leaderboardLevel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  leaderboardStats: {
    alignItems: 'flex-end',
  },
  leaderboardPoints: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00FF88',
  },
  leaderboardPointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  statsOverview: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00FF88',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  rarestSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  rarestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rarestInfo: {
    marginLeft: 16,
  },
  rarestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rarestRarity: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 2,
  },
  graphContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  categoryBreakdownSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  categoryBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBreakdownInfo: {
    width: 120,
  },
  categoryBreakdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryBreakdownCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryBreakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  categoryBreakdownFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  categoryBreakdownPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF88',
    width: 40,
    textAlign: 'right',
  },
  recentUnlocksSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  recentUnlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  recentUnlockInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentUnlockName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recentUnlockDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recentUnlockPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00FF88',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeader: {
    padding: 32,
    alignItems: 'center',
  },
  detailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00FF88',
    marginBottom: 4,
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailProgress: {
    width: '100%',
    marginBottom: 24,
  },
  detailProgressText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  detailProgressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
  },
  tipsSection: {
    width: '100%',
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
    flex: 1,
  },
  detailActions: {
    width: '100%',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sortModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sortOptionActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  sortOptionTextActive: {
    color: '#00FF88',
    fontWeight: '600',
  },
  levelUpContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelUpGradient: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelUpText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  levelUpSubtext: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 8,
  },
  // Portrait mode optimizations
  headerPortrait: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabPortrait: {
    paddingVertical: 12,
  },
  achievementCardPortrait: {
    marginBottom: 10,
  },
  leaderboardEntryPortrait: {
    padding: 12,
    marginBottom: 10,
  },
  statCardPortrait: {
    padding: 12,
  },
});
