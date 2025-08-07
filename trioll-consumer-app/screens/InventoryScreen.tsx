import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
  TextInput,
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { useApp } from '../context/AppContext';
import { GlassContainer, GlassButton, GlassCard } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';
import { useHaptics } from '../hooks/useHaptics';
import { SafeImage } from '../components/base/SafeImage';
import { Game } from '../types';

type RootStackParamList = {
  Inventory: undefined;
  GameDetail: { gameId: string };
  TrialPlayer: { gameId: string };
};

type InventoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Inventory'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAME_CARD_SIZE = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

type TabType = 'games' | 'badges';
type SortType = 'recent' | 'mostPlayed' | 'rating' | 'name';
type FilterType = 'all' | 'playing' | 'completed' | 'bookmarked';

// Mock data for badges
const mockBadges = [
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    icon: 'rocket-launch',
    color: '#8866FF',
    description: 'Joined during beta',
    earnedAt: new Date(),
    rarity: 'Epic'
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    icon: 'flash-on',
    color: '#FF0066',
    description: 'Complete 10 trials under 2 minutes',
    earnedAt: new Date(),
    rarity: 'Rare'
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    icon: 'nightlight',
    color: '#00FFFF',
    description: 'Play 20 games after midnight',
    earnedAt: new Date(),
    rarity: 'Common'
  },
  {
    id: 'collector',
    name: 'Collector',
    icon: 'collections',
    color: '#FFD700',
    description: 'Bookmark 50 games',
    earnedAt: new Date(),
    rarity: 'Legendary'
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    icon: 'people',
    color: '#00FF88',
    description: 'Share 25 games',
    earnedAt: null, // Not earned yet
    rarity: 'Uncommon',
    progress: 15,
    total: 25
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    icon: 'star',
    color: '#FFD700',
    description: 'Rate 100 games',
    earnedAt: null,
    rarity: 'Epic',
    progress: 67,
    total: 100
  }
];

export const InventoryScreen: React.FC = () => {
  const navigation = useNavigation<InventoryScreenNavigationProp>();
  const { games, likes, bookmarks } = useApp();
  const haptics = useHaptics();
  
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [filterBy, setFilterBy] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Animations
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Filter and sort games
  const filteredGames = useMemo(() => {
    if (!games || games.length === 0) {
      return [];
    }
    
    let filtered = [...games];
    
    // Apply filter
    switch (filterBy) {
      case 'bookmarked':
        filtered = filtered.filter(g => bookmarks.has(g.id));
        break;
      case 'playing':
        // Mock: random games marked as playing
        filtered = filtered.filter((_, i) => i % 3 === 0);
        break;
      case 'completed':
        // Mock: random games marked as completed
        filtered = filtered.filter((_, i) => i % 4 === 0);
        break;
    }
    
    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(g => 
        g.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'mostPlayed':
        sorted.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        break;
      case 'recent':
      default:
        // Keep original order (newest first)
        break;
    }
    
    return sorted;
  }, [games, filterBy, searchQuery, sortBy, bookmarks]);

  const handleTabChange = useCallback((tab: TabType) => {
    haptics.impact('light');
    setActiveTab(tab);
    
    // Animate tab indicator
    Animated.spring(tabIndicatorAnim, {
      toValue: tab === 'games' ? 0 : 1,
      useNativeDriver: true,
      tension: 40,
      friction: 8
    }).start();
    
    // Fade content
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  }, [haptics, tabIndicatorAnim, fadeAnim]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    haptics.impact('light');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, [haptics]);

  const renderGameCard = useCallback(({ item: game }: { item: Game }) => {
    if (!game) return null;
    
    const isBookmarked = bookmarks.has(game.id);
    const isLiked = likes.has(game.id);
    const progress = Math.floor(Math.random() * 100); // Mock progress
    
    return (
      <Pressable
        onPress={() => navigation.navigate('GameDetail', { gameId: game.id })}
        style={viewMode === 'grid' ? styles.gameCardGrid : styles.gameCardList}
      >
        <GlassCard style={viewMode === 'grid' ? styles.gameCardContentGrid : styles.gameCardContentList}>
          <SafeImage
            source={{ uri: game.thumbnailUrl || '' }}
            style={viewMode === 'grid' ? styles.gameImageGrid : styles.gameImageList}
          />
          
          {/* Progress overlay */}
          {progress > 0 && (
            <View style={styles.progressOverlay}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
          )}
          
          <View style={styles.gameInfo}>
            <Text style={styles.gameTitle} numberOfLines={1}>{game.title || 'Untitled'}</Text>
            <Text style={styles.gameGenre}>{game.genre || 'Unknown'}</Text>
            
            <View style={styles.gameStats}>
              {isLiked && <Ionicons name="heart" size={14} color="#FF2D55" />}
              {isBookmarked && <Ionicons name="bookmark" size={14} color="#FFD700" />}
              {progress > 0 && <Text style={styles.progressText}>{progress}%</Text>}
            </View>
          </View>
        </GlassCard>
      </Pressable>
    );
  }, [navigation, bookmarks, likes, viewMode]);

  const renderBadge = useCallback(({ item: badge }: { item: typeof mockBadges[0] }) => {
    const isEarned = !!badge.earnedAt;
    
    return (
      <Pressable style={styles.badgeCard}>
        <GlassCard style={[styles.badgeContent, !isEarned && styles.badgeUnearned]}>
          <LinearGradient
            colors={isEarned ? [badge.color + '20', badge.color + '10'] : ['#33333320', '#33333310']}
            style={styles.badgeGradient}
          >
            <MaterialCommunityIcons
              name={badge.icon as any}
              size={40}
              color={isEarned ? badge.color : '#666'}
            />
          </LinearGradient>
          
          <Text style={[styles.badgeName, !isEarned && styles.badgeNameUnearned]}>
            {badge.name}
          </Text>
          <Text style={styles.badgeDescription} numberOfLines={2}>
            {badge.description}
          </Text>
          
          {badge.progress !== undefined && (
            <View style={styles.badgeProgress}>
              <View style={styles.badgeProgressBar}>
                <View 
                  style={[
                    styles.badgeProgressFill, 
                    { width: `${(badge.progress / badge.total!) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.badgeProgressText}>
                {badge.progress}/{badge.total}
              </Text>
            </View>
          )}
          
          <Text style={[styles.badgeRarity, { color: getRarityColor(badge.rarity) }]}>
            {badge.rarity}
          </Text>
        </GlassCard>
      </Pressable>
    );
  }, []);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return '#FFD700';
      case 'Epic': return '#8866FF';
      case 'Rare': return '#00FFFF';
      case 'Uncommon': return '#00FF88';
      default: return '#FFFFFF';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0, 2]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={DS.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.stickyHeader}>
          <BlurView intensity={80} style={styles.headerBlur}>
            <View style={styles.header}>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  navigation.goBack();
                }}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={28} color={DS.colors.textPrimary} />
              </Pressable>
              <Text style={styles.title}>Inventory</Text>
              <Pressable
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                style={styles.viewModeButton}
              >
                <Ionicons 
                  name={viewMode === 'grid' ? 'grid' : 'list'} 
                  size={24} 
                  color={DS.colors.textPrimary} 
                />
              </Pressable>
            </View>
          </BlurView>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <GlassContainer style={styles.tabs}>
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  transform: [{
                    translateX: tabIndicatorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, SCREEN_WIDTH / 2 - 24]
                    })
                  }]
                }
              ]}
            />
            
            <Pressable
              style={styles.tab}
              onPress={() => handleTabChange('games')}
            >
              <Ionicons 
                name="game-controller" 
                size={20} 
                color={activeTab === 'games' ? DS.colors.background : DS.colors.textSecondary} 
              />
              <Text style={[styles.tabText, activeTab === 'games' && styles.tabTextActive]}>
                Games ({filteredGames.length})
              </Text>
            </Pressable>
            
            <Pressable
              style={styles.tab}
              onPress={() => handleTabChange('badges')}
            >
              <MaterialCommunityIcons 
                name="trophy" 
                size={20} 
                color={activeTab === 'badges' ? DS.colors.background : DS.colors.textSecondary} 
              />
              <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
                Badges ({mockBadges.filter(b => b.earnedAt).length}/{mockBadges.length})
              </Text>
            </Pressable>
          </GlassContainer>
        </View>

        {/* Search and Filters */}
        {activeTab === 'games' && (
          <View style={styles.searchFilterContainer}>
            <GlassContainer style={styles.searchBar}>
              <Ionicons name="search" size={20} color={DS.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search games..."
                placeholderTextColor={DS.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </GlassContainer>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              <View style={styles.filterRow}>
                {/* Sort options */}
                <GlassButton
                  size="small"
                  variant={sortBy === 'recent' ? 'primary' : 'secondary'}
                  onPress={() => setSortBy('recent')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>Recent</Text>
                </GlassButton>
                
                <GlassButton
                  size="small"
                  variant={sortBy === 'mostPlayed' ? 'primary' : 'secondary'}
                  onPress={() => setSortBy('mostPlayed')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>Most Played</Text>
                </GlassButton>
                
                <GlassButton
                  size="small"
                  variant={sortBy === 'rating' ? 'primary' : 'secondary'}
                  onPress={() => setSortBy('rating')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>Top Rated</Text>
                </GlassButton>
                
                <GlassButton
                  size="small"
                  variant={sortBy === 'name' ? 'primary' : 'secondary'}
                  onPress={() => setSortBy('name')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>A-Z</Text>
                </GlassButton>
                
                <View style={styles.filterDivider} />
                
                {/* Filter options */}
                <GlassButton
                  size="small"
                  variant={filterBy === 'all' ? 'primary' : 'secondary'}
                  onPress={() => setFilterBy('all')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>All</Text>
                </GlassButton>
                
                <GlassButton
                  size="small"
                  variant={filterBy === 'playing' ? 'primary' : 'secondary'}
                  onPress={() => setFilterBy('playing')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>Playing</Text>
                </GlassButton>
                
                <GlassButton
                  size="small"
                  variant={filterBy === 'completed' ? 'primary' : 'secondary'}
                  onPress={() => setFilterBy('completed')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>Completed</Text>
                </GlassButton>
                
                <GlassButton
                  size="small"
                  variant={filterBy === 'bookmarked' ? 'primary' : 'secondary'}
                  onPress={() => setFilterBy('bookmarked')}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>Bookmarked</Text>
                </GlassButton>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {activeTab === 'games' ? (
            <FlatList
              data={filteredGames}
              renderItem={renderGameCard}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode} // Force re-render when view mode changes
              contentContainerStyle={styles.gamesList}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="gamepad-variant-outline" size={64} color={DS.colors.textMuted} />
                  <Text style={styles.emptyText}>No games found</Text>
                  <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={mockBadges}
              renderItem={renderBadge}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.badgesList}
              scrollEnabled={false}
              ListHeaderComponent={
                <View style={styles.badgesHeader}>
                  <View style={styles.badgeStats}>
                    <View style={styles.badgeStat}>
                      <Text style={styles.badgeStatValue}>{mockBadges.filter(b => b.earnedAt).length}</Text>
                      <Text style={styles.badgeStatLabel}>Earned</Text>
                    </View>
                    <View style={styles.badgeStat}>
                      <Text style={styles.badgeStatValue}>{mockBadges.length}</Text>
                      <Text style={styles.badgeStatLabel}>Total</Text>
                    </View>
                    <View style={styles.badgeStat}>
                      <Text style={styles.badgeStatValue}>
                        {Math.round((mockBadges.filter(b => b.earnedAt).length / mockBadges.length) * 100)}%
                      </Text>
                      <Text style={styles.badgeStatLabel}>Complete</Text>
                    </View>
                  </View>
                </View>
              }
            />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  stickyHeader: {
    backgroundColor: DS.colors.background,
  },
  headerBlur: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: DS.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  viewModeButton: {
    padding: 8,
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: (SCREEN_WIDTH - 56) / 2,
    height: 40,
    backgroundColor: DS.colors.primary,
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.textSecondary,
  },
  tabTextActive: {
    color: DS.colors.background,
  },
  searchFilterContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: DS.colors.textPrimary,
  },
  filterScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 24,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'inherit',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: DS.colors.border,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  gamesList: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  gameCardGrid: {
    width: GAME_CARD_SIZE,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  gameCardList: {
    marginBottom: 16,
  },
  gameCardContentGrid: {
    overflow: 'hidden',
  },
  gameCardContentList: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gameImageGrid: {
    width: '100%',
    height: GAME_CARD_SIZE * 0.75,
  },
  gameImageList: {
    width: 80,
    height: 80,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: DS.colors.success,
  },
  gameInfo: {
    padding: 12,
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    marginBottom: 4,
  },
  gameGenre: {
    fontSize: 12,
    color: DS.colors.textSecondary,
    marginBottom: 8,
  },
  gameStats: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: DS.colors.success,
    fontWeight: '600',
  },
  badgesList: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  badgesHeader: {
    marginBottom: 24,
  },
  badgeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badgeStat: {
    alignItems: 'center',
  },
  badgeStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: DS.colors.textPrimary,
  },
  badgeStatLabel: {
    fontSize: 14,
    color: DS.colors.textSecondary,
    marginTop: 4,
  },
  badgeCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    marginBottom: 16,
    marginHorizontal: 8,
  },
  badgeContent: {
    padding: 16,
    alignItems: 'center',
  },
  badgeUnearned: {
    opacity: 0.5,
  },
  badgeGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeNameUnearned: {
    color: DS.colors.textSecondary,
  },
  badgeDescription: {
    fontSize: 12,
    color: DS.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeProgress: {
    width: '100%',
    marginBottom: 8,
  },
  badgeProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: DS.colors.primary,
  },
  badgeProgressText: {
    fontSize: 10,
    color: DS.colors.textSecondary,
    textAlign: 'center',
  },
  badgeRarity: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: DS.colors.textSecondary,
    marginTop: 8,
  },
});