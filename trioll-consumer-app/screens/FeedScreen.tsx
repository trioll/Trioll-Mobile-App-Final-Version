import type { Game } from '../types';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Animated, StyleSheet, Pressable, Image, Dimensions, FlatList, LayoutAnimation, Modal, DeviceEventEmitter } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GlassContainer, GlassButton, GlassCard } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';
import { useApp } from '../context/AppContext';
import { BottomSheet } from '../components/BottomSheet';
import { IconBloom } from '../components/IconBloom';
import { LoadingTransition } from '../components/LoadingTransition';
import { CircularRevealTransition } from '../components/CircularRevealTransition';

import { GameFeedContainer } from '../components/GameFeedContainer';
import { Toast } from '../components/Toast';
import { HeartParticle } from '../components/visual/HeartParticle';
import { useToast, useOrientation, useHaptics } from '../hooks';
import { useGuestMode } from '../hooks/useGuestMode';
import { DURATIONS, SPRING_CONFIGS } from '../constants/animations';
import { dummyGames } from '../data/dummyGames';
import * as SecureStore from 'expo-secure-store';
import { useGames, useFeaturedGames } from '../src/hooks/useGames';
import { useGameActions } from '../hooks/useGameActions';
import { GuestIndicator } from '../components/guest/GuestIndicator';
import { RegisterBenefitsModal } from '../components/guest/RegisterBenefitsModal';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { WatchTab } from '../components/WatchTab';
import { CommentSection } from '../components/CommentSection';

import { getLogger } from '../src/utils/logger';

const logger = getLogger('FeedScreen');

// LayoutAnimation will be enabled inside component

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  Feed: undefined;
  GameDetail: { gameId: string };
  TrialPlayer: { gameId: string };
  Profile: { userId?: string };
  Settings: undefined;
  Search: undefined;
  GameLibrary: undefined;
  RegistrationMethod: undefined;
};

type FeedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Feed'>;

type FilterType = 'for_you' | 'new' | 'trending' | 'friends' | 'genre';
type SectionType =
  | 'continue_playing'
  | 'because_you_played'
  | 'popular_genre'
  | 'friends_playing'
  | 'trending'
  | 'hidden_gems'
  | 'quick_trials'
  | 'new_arrivals'
  | 'daily_featured'
  | 'developer_spotlight'
  | 'genre_spotlight'
  | 'seasonal_events';

interface FeedSection {
  id: SectionType;
  title: string;
  subtitle?: string;
  games: Game[];
  type: 'horizontal' | 'vertical' | 'grid' | 'featured' | 'spotlight';
}

interface FriendActivity {
  userId: string;
  username: string;
  avatar: string;
  gameId: string;
  timestamp: Date;
  action: 'played' | 'liked' | 'rated';
}


export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const {
    setCurrentTrialGameId,
    likes,
    bookmarks,
    toggleLike,
    toggleBookmark,
    showRegisterBenefitsModal,
    setShowRegisterBenefitsModal,
  } = useApp();
  const { toast, showToast, hideToast } = useToast();
  const { width: screenWidth, height: screenHeight } = useOrientation();
  const isPortrait = screenHeight > screenWidth;
  const haptics = useHaptics();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'games' | 'watch'>('games');
  const { isGuest } = useGuestMode();

  // API data hooks - get all games from S3 bucket
  const { games: apiGames, isUsingApiData } = useGames(null, 100); // Get all games
  const { featuredGames: apiFeaturedGames } = useFeaturedGames(5);
  const { likeGame: apiLikeGame, bookmarkGame: apiBookmarkGame, playGame } = useGameActions();

  // Use API games if available, otherwise fallback to dummy games (which should contain all S3 games)
  const allGames = apiGames.length > 0 ? apiGames : dummyGames;

  // Enable LayoutAnimation on Android (disabled for new architecture)
  useEffect(() => {
    // Comment out to avoid warning in new architecture
    // if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    //   UIManager.setLayoutAnimationEnabledExperimental(true);
    // }
  }, []);

  // State
  const [activeFilter, setActiveFilter] = useState<FilterType>('for_you');
  const [isLoadingTransition] = useState(false);
  const [showCircularTransition, setShowCircularTransition] = useState(false);
  const [transitionOrigin, setTransitionOrigin] = useState({
    x: screenWidth / 2,
    y: screenHeight / 2,
  });
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  // const [showTrialPlayer, setShowTrialPlayer] = useState(false);
  const [currentDisplayedGame, setCurrentDisplayedGame] = useState<Game | null>(null);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(true);
  
  // Initialize with first game when available
  useEffect(() => {
    if (!currentDisplayedGame && allGames.length > 0) {
      setCurrentDisplayedGame(allGames[0]);
    }
  }, [allGames, currentDisplayedGame]);

  // Get current user ID
  useEffect(() => {
    import('../src/services/auth/safeAuthService').then(({ safeAuthService }) => {
      safeAuthService.getCurrentUserId().then(userId => {
        setCurrentUserId(userId);
      }).catch(error => {
        logger.error('Failed to get current user ID:', error);
      });
    });
  }, []);
  const [previewGame, setPreviewGame] = useState<Game | null>(null);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartAnimationPosition, setHeartAnimationPosition] = useState({ x: 0, y: 0 });
  const [showDailyFeatureModal, setShowDailyFeatureModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const playButtonRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const lastShakeTime = useRef(0);
  const doubleTapLastTap = useRef(0);

  // Load saved filter and check tutorial
  useEffect(() => {
    SecureStore.getItemAsync('feed_filter').then(filter => {
      if (filter) {
        setActiveFilter(filter as FilterType);
      }
    });

    // Check if tutorial should be shown
    SecureStore.getItemAsync('tutorial_completed').then(completed => {
      if (!completed) {
        setShowTutorial(true);
      }
    });
  }, []);

  // Animations
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);


  // Get personalized sections
  const getFeedSections = useMemo((): FeedSection[] => {
    const sections: FeedSection[] = [];

    // Use API data if available, otherwise use dummy data
    const dataSource = allGames;
    const featuredSource =
      apiFeaturedGames.length > 0 ? apiFeaturedGames : dataSource.filter((_, idx) => idx % 3 === 0);

    // Daily featured game
    if (featuredSource.length > 0) {
      sections.push({
        id: 'daily_featured',
        title: 'Daily Featured',
        games: [featuredSource[0]],
        type: 'featured',
      });
    }

    // Continue playing section
    const continueGames = dataSource.filter((_, index) => index < 3);
    if (continueGames.length > 0) {
      sections.push({
        id: 'continue_playing',
        title: 'Continue Playing',
        games: continueGames,
        type: 'horizontal',
      });
    }

    // Because you played section
    if (dataSource.length > 0) {
      const lastPlayedGame = dataSource[0];
      const similarGames = dataSource.filter(
        g => g.genre === lastPlayedGame.genre && g.id !== lastPlayedGame.id
      );
      if (similarGames.length > 0) {
        sections.push({
          id: 'because_you_played',
          title: `Because you played ${lastPlayedGame.title}`,
          games: similarGames.slice(0, 6),
          type: 'horizontal',
        });
      }
    }

    // Popular in your favorite genre
    const favoriteGenre = 'Action';
    const genreGames = dataSource.filter(g => g.genre === favoriteGenre);
    sections.push({
      id: 'popular_genre',
      title: `Popular in ${favoriteGenre}`,
      subtitle: 'Your favorite genre',
      games: genreGames.slice(0, 6),
      type: 'horizontal',
    });

    // Friends are playing
    const friendGames = dataSource.filter((_, index) => index % 3 === 0);
    sections.push({
      id: 'friends_playing',
      title: 'Friends are playing',
      games: friendGames.slice(0, 6),
      type: 'horizontal',
    });

    // Trending this week
    const trendingGames = dataSource.filter((_, index) => index % 2 === 0);
    sections.push({
      id: 'trending',
      title: 'Trending this week',
      subtitle: '🔥 Hot right now',
      games: trendingGames.slice(0, 8),
      type: 'grid',
    });

    // Developer spotlight
    sections.push({
      id: 'developer_spotlight',
      title: 'Developer Spotlight: Stellar Studios',
      subtitle: 'Featured developer of the week',
      games: dataSource
        .filter(g => ((g as any).developerName || g.developer) === 'Stellar Studios')
        .slice(0, 4),
      type: 'spotlight',
    });

    // Hidden gems
    const hiddenGems = dataSource.filter(g => g.rating && g.rating >= 4.5);
    sections.push({
      id: 'hidden_gems',
      title: 'Hidden gems',
      subtitle: 'Highly rated, waiting to be discovered',
      games: hiddenGems.slice(0, 6),
      type: 'horizontal',
    });

    // Quick trials
    const quickTrials = dataSource.filter((_, index) => index % 4 === 1);
    sections.push({
      id: 'quick_trials',
      title: '3-minute quick trials',
      subtitle: 'Perfect for a quick break',
      games: quickTrials.slice(0, 6),
      type: 'horizontal',
    });

    // Genre spotlight
    sections.push({
      id: 'genre_spotlight',
      title: 'Racing Games Collection',
      subtitle: 'Speed into action',
      games: dataSource.filter(g => g.genre === 'Racing'),
      type: 'spotlight',
    });

    // New arrivals
    const newGames = dataSource.slice(-6);
    sections.push({
      id: 'new_arrivals',
      title: 'New arrivals',
      subtitle: 'Fresh games this week',
      games: newGames,
      type: 'horizontal',
    });

    return sections;
  }, []);

  // Filter sections based on active filter
  useMemo(() => {
    switch (activeFilter) {
      case 'new':
        return getFeedSections.filter(s => s.id === 'new_arrivals' || s.id === 'daily_featured');
      case 'trending':
        return getFeedSections.filter(s => s.id === 'trending' || s.id === 'daily_featured');
      case 'friends':
        return getFeedSections.filter(s => s.id === 'friends_playing' || s.id === 'daily_featured');
      case 'genre':
        return getFeedSections.filter(
          s => s.id === 'popular_genre' || s.id === 'genre_spotlight' || s.id === 'daily_featured'
        );
      default:
        return getFeedSections;
    }
  }, [activeFilter, getFeedSections]);

  // Get scale animation
  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    haptics.trigger('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilter(filter);
    SecureStore.setItemAsync('feed_filter', filter);
  };

  // Handle play trial
  const handlePlayTrial = async (game: Game) => {
    try {
      haptics.trigger('medium');
      
      setCurrentGameId(game.id);
      setCurrentTrialGameId(game.id);

      // Get play button position for transition
      if (playButtonRef.current) {
        playButtonRef.current.measureInWindow((x, y, width, height) => {
          setTransitionOrigin({
            x: x + width / 2,
            y: y + height / 2,
          });
        });
      }

      setShowCircularTransition(true);

      // Track play event via API
      playGame(game.id).catch(_err => {
        // Play tracking failed, will retry later
      });

      // Record trial play for guests
      if (isGuest) {
        // We'll record the actual duration when the trial ends
        // For now, just track that it started
      }

      setTimeout(() => {
        navigation.navigate('TrialPlayer' as keyof RootStackParamList, { gameId: game.id } as any);
      }, 300);
    } catch (error) {
      logger.error('Error starting trial:', error);
      showToast('Unable to start trial. Please try again.', 'error');
    }
  };

  // Handle double tap to like
  const handleDoubleTap = (game: Game, event: any) => {
    const now = Date.now();
    if (now - doubleTapLastTap.current < 300) {
      haptics.trigger('medium');
      const wasLiked = likes.has(game.id);
      // Toggle locally first for immediate UI response
      toggleLike(game.id);
      setHeartAnimationPosition({
        x: event.nativeEvent.pageX || 0,
        y: event.nativeEvent.pageY || 0,
      });
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1500);
      // Then sync with API in background
      apiLikeGame(game.id, wasLiked).catch(_err => {
        // Like sync failed, will retry later
      });
    }
    doubleTapLastTap.current = now;
  };

  // Handle long press preview
  const handleLongPress = (game: Game) => {
    haptics.trigger('medium');
    setPreviewGame(game);
  };

  // Shake to shuffle
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('shake', () => {
      const now = Date.now();
      if (now - lastShakeTime.current > 2000) {
        lastShakeTime.current = now;
        haptics.trigger('heavy');
        showToast('Shuffling your feed...', 'info');
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 500);
      }
    });
    return () => subscription.remove();
  }, []);

  // Pull to refresh



  // Render game card
  const renderGameCard = (game: Game, section: FeedSection) => {
    const scaleAnim = getScaleAnim(game.id);
    const isLiked = likes.has(game.id);
    const isBookmarked = bookmarks.has(game.id);

    const friendsPlaying: FriendActivity[] = []; // TODO: Fetch from API when friends feature is implemented
    const isTrending = Math.random() > 0.7;
    const isNew = Math.random() > 0.8;
    const playersCount = Math.floor(Math.random() * 5000) + 500;

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

    const cardStyle =
      section.type === 'horizontal'
        ? [styles.horizontalCard, isPortrait && styles.horizontalCardPortrait]
        : section.type === 'grid'
          ? styles.gridCard
          : styles.verticalCard;

    return (
      <Pressable
        onPress={() => navigation.navigate('GameDetail' as keyof RootStackParamList, { gameId: game.id } as any)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => handleLongPress(game)}
        onTouchEnd={(e: unknown) => handleDoubleTap(game, e)}
        delayLongPress={500}
        style={cardStyle}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={styles.cardImageContainer}>
            <Image source={{ uri: game.thumbnailUrl }} style={styles.cardImage} />

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.cardGradient}
            />

            {/* Badges */}
            <View style={styles.badgesContainer}>
              {isTrending && (
                <View style={[styles.trendingBadge, isPortrait && { paddingHorizontal: 6, paddingVertical: 2 }]}>
                  <Ionicons name="flame" size={isPortrait ? 10 : 12} color="#FF6B6B" />
                  <Text style={[styles.badgeText, isPortrait && { fontSize: 9 }]}>Trending</Text>
                </View>
              )}
              {isNew && (
                <View style={[styles.newBadge, isPortrait && { paddingHorizontal: 6, paddingVertical: 2 }]}>
                  <Ionicons name="sparkles" size={isPortrait ? 10 : 12} color="#FFD93D" />
                  <Text style={[styles.badgeText, isPortrait && { fontSize: 9 }]}>New</Text>
                </View>
              )}
            </View>

            {/* Live metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metric}>
                <Ionicons name="play" size={isPortrait ? 10 : 12} color={DS.colors.textPrimary} />
                <Text style={[styles.metricText, isPortrait && { fontSize: 11 }]}>{(playersCount / 1000).toFixed(1)}k playing</Text>
              </View>
              {game.rating && (
                <View style={styles.metric}>
                  <Ionicons name="star" size={isPortrait ? 10 : 12} color="#FFD93D" />
                  <Text style={[styles.metricText, isPortrait && { fontSize: 11 }]}>{game.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {/* Trial duration */}
            <View style={styles.trialDuration}>
              <Ionicons name="time-outline" size={isPortrait ? 10 : 12} color={DS.colors.textPrimary} />
              <Text style={[styles.trialDurationText, isPortrait && { fontSize: 10 }]}>
                {section.id === 'quick_trials' ? '3 min' : '7 min trial'}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  // Toggle locally first for immediate UI response
                  toggleLike(game.id);
                  haptics.trigger('light');
                  // Then sync with API in background
                  apiLikeGame(game.id, isLiked).catch(_err => {
                    // Like sync failed, will retry later
                  });
                }}
                style={[styles.actionButton, isPortrait && styles.actionButtonPortrait]}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline' as any}
                  size={isPortrait ? 16 : 20}
                  color={isLiked ? DS.colors.error : DS.colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  // Toggle locally first for immediate UI response
                  toggleBookmark(game.id);
                  haptics.trigger('light');
                  // Then sync with API in background
                  apiBookmarkGame(game.id, isBookmarked).catch(_err => {
                    // Bookmark sync failed, will retry later
                  });
                }}
                style={[styles.actionButton, isPortrait && styles.actionButtonPortrait]}
              >
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline' as any}
                  size={isPortrait ? 14 : 18}
                  color={isBookmarked ? DS.colors.accent : DS.colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, isPortrait && styles.cardTitlePortrait]} numberOfLines={1}>
              {game.title}
            </Text>
            <Text style={[styles.cardGenre, isPortrait && styles.cardGenrePortrait]}>{game.genre}</Text>

            {/* Social proof */}
            {friendsPlaying.length > 0 && (
              <View style={styles.socialProof}>
                <View style={styles.friendAvatars}>
                  {friendsPlaying.slice(0, 3).map((friend, index) => (
                    <Image
                      key={friend.userId}
                      source={{ uri: friend.avatar }}
                      style={[styles.friendAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                    />
                  ))}
                </View>
                <Text style={[styles.socialProofText, isPortrait && { fontSize: 11 }]}>
                  {friendsPlaying.length} friend{friendsPlaying.length > 1 ? 's' : ''} played
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  // Render featured section
  const renderFeaturedSection = (section: FeedSection) => {
    const game = section.games[0];
    if (!game) return null;

    return (
      <View key={section.id} style={[styles.section, isPortrait && styles.sectionPortrait]}>
        <Pressable onPress={() => setShowDailyFeatureModal(true)} style={[styles.dailyFeatureCard, isPortrait && styles.dailyFeatureCardPortrait]}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dailyFeatureGradient}
          >
            <View style={styles.dailyFeatureContent}>
              <View style={[styles.dailyFeatureBadge, isPortrait && { paddingHorizontal: 10, paddingVertical: 6 }]}>
                <Ionicons name="trophy" size={isPortrait ? 16 : 20} color="#FFD93D" />
                <Text style={[styles.dailyFeatureBadgeText, isPortrait && { fontSize: 11 }]}>Daily Pick</Text>
              </View>
              <Text style={[styles.dailyFeatureTitle, isPortrait && { fontSize: 20 }]}>{game.title}</Text>
              <Text style={[styles.dailyFeatureDescription, isPortrait && { fontSize: 13 }]}>
                Today's featured game • Extra rewards
              </Text>
              <View style={[styles.dailyFeatureButton, isPortrait && { paddingHorizontal: 14, paddingVertical: 8 }]}>
                <Text style={[styles.dailyFeatureButtonText, isPortrait && { fontSize: 13 }]}>Play Now</Text>
                <Ionicons name="arrow-forward" size={isPortrait ? 14 : 16} color="#FFF" />
              </View>
            </View>
            <Image
              source={{ uri: game.thumbnailUrl }}
              style={styles.dailyFeatureImage}
            />
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  // Render spotlight section
  const renderSpotlightSection = (section: FeedSection) => (
    <View key={section.id} style={[styles.section, isPortrait && styles.sectionPortrait]}>
      <View style={[styles.sectionHeader, isPortrait && styles.sectionHeaderPortrait]}>
        <View>
          <Text style={[styles.sectionTitle, isPortrait && { fontSize: 18 }]}>{section.title}</Text>
          {section.subtitle && <Text style={[styles.sectionSubtitle, isPortrait && { fontSize: 13 }]}>{section.subtitle}</Text>}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spotlightContainer}
      >
        {section.games.map(game => (
          <Pressable
            key={game.id}
            onPress={() => navigation.navigate('GameDetail' as keyof RootStackParamList, { gameId: game.id } as any)}
            style={[styles.spotlightCard, isPortrait && styles.spotlightCardPortrait]}
          >
            <Image
              source={{ uri: game.thumbnailUrl }}
              style={styles.spotlightImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.spotlightGradient}
            >
              <Text style={[styles.spotlightTitle, isPortrait && { fontSize: 18 }]}>{game.title}</Text>
              <Text style={[styles.spotlightGenre, isPortrait && { fontSize: 13 }]}>{game.genre}</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // Render horizontal section
  const renderHorizontalSection = (section: FeedSection) => (
    <View key={section.id} style={[styles.section, isPortrait && styles.sectionPortrait]}>
      <View style={[styles.sectionHeader, isPortrait && styles.sectionHeaderPortrait]}>
        <View>
          <Text style={[styles.sectionTitle, isPortrait && { fontSize: 18 }]}>{section.title}</Text>
          {section.subtitle && <Text style={[styles.sectionSubtitle, isPortrait && { fontSize: 13 }]}>{section.subtitle}</Text>}
        </View>
        <Pressable onPress={() => {}} style={styles.seeAllButton}>
          <Text style={[styles.seeAllText, isPortrait && { fontSize: 13 }]}>See all</Text>
          <Ionicons name="arrow-forward" size={isPortrait ? 14 : 16} color="#666" />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={section.games}
        renderItem={({ item }) => renderGameCard(item, section)}
        keyExtractor={item => `${section.id}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        snapToInterval={SCREEN_WIDTH * 0.42}
        decelerationRate="fast"
      />
    </View>
  );

  // Render grid section
  const renderGridSection = (section: FeedSection) => (
    <View key={section.id} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.subtitle && <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>}
        </View>
      </View>

      <View style={styles.gridContainer}>
        {section.games.map(game => (
          <View key={game.id} style={styles.gridItem}>
            {renderGameCard(game, section)}
          </View>
        ))}
      </View>
    </View>
  );

  // Render preview modal
  const renderPreviewModal = () => (
    <Modal
      visible={!!previewGame}
      transparent
      animationType="fade"
      onRequestClose={() => setPreviewGame(null)}
    >
      <Pressable style={styles.previewOverlay} onPress={() => setPreviewGame(null)}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        {previewGame && (
          <View style={styles.previewCard}>
            <Image
              source={{ uri: previewGame.coverUrl || previewGame.thumbnailUrl }}
              style={styles.previewImage}
            />
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{previewGame.title}</Text>
              <Text style={styles.previewDescription}>
                {previewGame.description || 'An exciting game experience awaits!'}
              </Text>
              <View style={styles.previewActions}>
                <Pressable
                  onPress={() => {
                    setPreviewGame(null);
                    handlePlayTrial(previewGame);
                  }}
                  style={styles.previewPlayButton}
                >
                  <Ionicons name="play" size={20} color={DS.colors.background} />
                  <Text style={styles.previewPlayText}>Play Trial</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPreviewGame(null);
                    navigation.navigate('GameDetail' as keyof RootStackParamList, { gameId: previewGame.id } as any);
                  }}
                  style={styles.previewInfoButton}
                >
                  <Text style={styles.previewInfoText}>More Info</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </Modal>
  );

  // Render daily feature modal
  const renderDailyFeatureModal = () => {
    const featuredGame = dummyGames[0];
    return (
      <Modal
        visible={showDailyFeatureModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDailyFeatureModal(false)}
      >
        <View style={styles.featureModalOverlay}>
          <View style={styles.featureModal}>
            <Image
              source={{ uri: featuredGame.coverUrl || featuredGame.thumbnailUrl }}
              style={styles.featureModalImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)', '#000']}
              style={styles.featureModalGradient}
            >
              <Pressable
                onPress={() => setShowDailyFeatureModal(false)}
                style={[styles.featureModalClose, isPortrait && { width: 40, height: 40, top: 50, right: 16 }]}
              >
                <Ionicons name="close" size={isPortrait ? 20 : 24} color="#FFF" />
              </Pressable>

              <View style={styles.featureModalContent}>
                <View style={styles.featureModalBadge}>
                  <Ionicons name="trophy" size={isPortrait ? 20 : 24} color="#FFD93D" />
                  <Text style={[styles.featureModalBadgeText, isPortrait && { fontSize: 14 }]}>Daily Featured Game</Text>
                </View>

                <Text style={[styles.featureModalTitle, isPortrait && { fontSize: 30 }]}>{featuredGame.title}</Text>
                <Text style={[styles.featureModalDescription, isPortrait && { fontSize: 15 }]}>{featuredGame.description}</Text>

                <View style={styles.featureModalRewards}>
                  <Text style={[styles.featureModalRewardsTitle, isPortrait && { fontSize: 16 }]}>Today's Rewards</Text>
                  <View style={styles.rewardItem}>
                    <Ionicons name="time" size={isPortrait ? 18 : 20} color="#00FF88" />
                    <Text style={[styles.rewardText, isPortrait && { fontSize: 15 }]}>2x Trial Time</Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Ionicons name="star" size={isPortrait ? 18 : 20} color="#FFD93D" />
                    <Text style={[styles.rewardText, isPortrait && { fontSize: 15 }]}>Double XP</Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Ionicons name="gift" size={isPortrait ? 18 : 20} color="#FF0066" />
                    <Text style={[styles.rewardText, isPortrait && { fontSize: 15 }]}>Exclusive Badge</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setShowDailyFeatureModal(false);
                    handlePlayTrial(featuredGame);
                  }}
                  style={styles.featureModalButton}
                >
                  <Text style={styles.featureModalButtonText}>Play Now</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    );
  };

  // Main render
  return (
    <View style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Games Tab Content */}
      {activeTab === 'games' && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000, top: insets.top + 40 }]}>
          <GameFeedContainer
            onPlayTrial={handlePlayTrial}
            disabled={showCircularTransition /* || showComments - Social features removed */}
            onGameChange={(game) => {
              setCurrentDisplayedGame(game);
              setIsBottomSheetVisible(true); // Reset bottom sheet for new game
              logger.debug('Game changed:', game?.title);
            }}
            onShareError={() => showToast('Unable to share. Please try again.', 'error')}
          />
        </View>
      )}

      {/* Watch Tab Content */}
      {activeTab === 'watch' && (
        <View style={[StyleSheet.absoluteFillObject, { top: insets.top + 40 }]}>
          <WatchTab />
        </View>
      )}


      {/* Trial Player Screen - Handled via navigation */}


      {/* Bottom Sheet - Developer and Game Information - Only on Games tab */}
      {activeTab === 'games' && currentDisplayedGame && isBottomSheetVisible && (
        <BottomSheet 
          game={currentDisplayedGame} 
          onClose={() => setIsBottomSheetVisible(false)}
        />
      )}


      {/* Heart Animation */}
      {showHeartAnimation && (
        <HeartParticle
          x={heartAnimationPosition.x}
          y={heartAnimationPosition.y}
          onComplete={() => setShowHeartAnimation(false)}
        />
      )}

      {/* Preview Modal */}
      {renderPreviewModal()}

      {/* Daily Feature Modal */}
      {renderDailyFeatureModal()}

      {/* Loading Transition */}
      <LoadingTransition isVisible={isLoadingTransition} />

      {/* Circular Reveal Transition */}
      {showCircularTransition && (
        <CircularRevealTransition
          isVisible={showCircularTransition}
          origin={transitionOrigin}
          onTransitionComplete={() => setShowCircularTransition(false)}
        />
      )}

      {/* Guest Mode UI Components */}
      {isGuest && (
        <GuestIndicator
          onRegisterPress={() => setShowRegisterBenefitsModal(true)}
          style={{ 
            top: insets.top + 65, // Just below the tab container
            right: 16, // Right side of screen
            bottom: undefined, // Override default bottom position
            zIndex: 9999, // High z-index but below tabs
          }}
        />
      )}


      {/* Register Benefits Modal */}
      <RegisterBenefitsModal
        visible={showRegisterBenefitsModal}
        onClose={() => setShowRegisterBenefitsModal(false)}
        onRegister={() => {
          setShowRegisterBenefitsModal(false);
          navigation.navigate('RegistrationMethod' as never);
        }}
        onLogin={() => {
          setShowRegisterBenefitsModal(false);
          navigation.navigate('Login' as never);
        }}
        onContinueAsGuest={() => setShowRegisterBenefitsModal(false)}
      />

      {/* Toast Notifications */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

      {/* Tutorial Overlay */}
      <TutorialOverlay
        visible={showTutorial}
        onComplete={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
      />

      {/* Comment Section - Shows at bottom of screen */}
      {/* Removed CommentSection - comments are handled by GameFeedContainer with CommentModal */}

      {/* Tab Navigation with Menu - Rendered last to ensure it's on top */}
      <View style={[styles.tabContainer, { paddingTop: insets.top + 5, height: insets.top + 40 }]}>
        {/* Menu Icon - Always visible */}
        <View style={styles.menuIconContainer}>
          <IconBloom
            onSearchPress={() => navigation.navigate('Search' as never)}
            onProfilePress={() => navigation.navigate('Profile' as never)}
            onSettingsPress={() => navigation.navigate('Settings' as never)}
            onInventoryPress={() => navigation.navigate('Inventory' as never)}
          />
        </View>
        
        <View style={styles.tabButtons}>
          <Pressable
            style={[styles.tabButton, activeTab === 'games' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('games');
              haptics.trigger('light');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'games' && styles.tabTextActive]}>
              Games
            </Text>
            {activeTab === 'games' && <View style={styles.tabIndicator} />}
          </Pressable>
          
          <Pressable
            style={[styles.tabButton, activeTab === 'watch' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('watch');
              haptics.trigger('light');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'watch' && styles.tabTextActive]}>
              Watch
            </Text>
            {activeTab === 'watch' && <View style={styles.tabIndicator} />}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  tabContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999, // Maximum z-index to ensure visibility above everything
    backgroundColor: 'rgba(26, 26, 46, 0.65)', // More translucent dark background
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.3)', // Subtle accent border
    elevation: 999, // Maximum elevation for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    // Add backdrop blur effect (iOS)
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', // For web compatibility
  },
  menuIconContainer: {
    position: 'absolute',
    left: 5,
    top: '50%',
    transform: [{ translateY: -20 }], // Center vertically in smaller container
    zIndex: 10002, // Higher than tab buttons
  },
  tabButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.md, // Reduced from lg (24) to md (16)
    paddingTop: DS.spacing.xxs, // Minimal top padding
    paddingBottom: DS.spacing.xxs, // Minimal bottom padding
    zIndex: 10001, // Ensure buttons are on top
  },
  tabButton: {
    marginHorizontal: DS.spacing.sm, // Reduced horizontal spacing
    paddingVertical: 2, // Minimal vertical padding
    paddingHorizontal: DS.spacing.sm, // Reduced horizontal padding
    position: 'relative',
  },
  tabButtonActive: {
    // Active state handled by text color
  },
  tabText: {
    fontSize: 12, // Smaller to prevent cutoff
    fontWeight: '600', // Slightly less bold
    color: 'rgba(255, 255, 255, 0.5)', // Dimmer for inactive state
    letterSpacing: 0.5, // Tighter letter spacing
    textTransform: 'uppercase', // Make text uppercase for better visibility
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#FFFFFF', // Pure white when active
    fontWeight: '700', // Bold when active
    textShadowColor: 'rgba(99, 102, 241, 0.8)', // Accent color glow when active
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -DS.spacing.sm,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: DS.colors.accent,
  },
  filterContainer: {
    marginHorizontal: -DS.spacing.lg,
  },
  filterContent: {
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
    borderRadius: DS.effects.borderRadiusPill,
    marginRight: DS.spacing.xs,
    gap: DS.spacing.xs / 2,
  },
  filterPillActive: {
    backgroundColor: DS.colors.accent,
  },
  filterText: {
    fontSize: 14,
    color: DS.colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: DS.colors.background,
  },
  section: {
    marginBottom: DS.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.lg,
    marginBottom: DS.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: DS.colors.textSecondary,
    marginTop: DS.spacing.xs / 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xs / 2,
  },
  seeAllText: {
    fontSize: 14,
    color: DS.colors.textSecondary,
  },
  horizontalList: {
    paddingHorizontal: DS.spacing.lg,
  },
  horizontalCard: {
    width: SCREEN_WIDTH * 0.42,
    marginRight: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: DS.spacing.md,
    gap: DS.spacing.xs,
  },
  gridItem: {
    width: (SCREEN_WIDTH - DS.spacing.md * 2 - DS.spacing.xs) / 2,
  },
  gridCard: {
    width: '100%',
  },
  verticalCard: {
    width: '100%',
    marginBottom: 16,
  },
  cardImageContainer: {
    position: 'relative',
    aspectRatio: 0.75,
    borderRadius: DS.effects.borderRadiusMedium,
    overflow: 'hidden',
    backgroundColor: DS.colors.surface,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  badgesContainer: {
    position: 'absolute',
    top: DS.spacing.xs,
    left: DS.spacing.xs,
    flexDirection: 'row',
    gap: DS.spacing.xs / 2,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.warningMuted,
    // backdropFilter: 'blur(12px)', // Not supported in React Native
    paddingHorizontal: DS.spacing.xs,
    paddingVertical: DS.spacing.xxs,
    borderRadius: DS.effects.borderRadiusSmall,
    gap: DS.spacing.xxs,
    borderWidth: 1,
    borderColor: DS.colors.warning,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.accentMuted,
    // backdropFilter: 'blur(12px)', // Not supported in React Native
    paddingHorizontal: DS.spacing.xs,
    paddingVertical: DS.spacing.xxs,
    borderRadius: DS.effects.borderRadiusSmall,
    gap: DS.spacing.xxs,
    borderWidth: 1,
    borderColor: DS.colors.accent,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DS.colors.textPrimary,
  },
  metricsContainer: {
    position: 'absolute',
    bottom: DS.spacing.xs,
    left: DS.spacing.xs,
    flexDirection: 'row',
    gap: DS.spacing.xs,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  metricText: {
    fontSize: 12,
    color: DS.colors.textPrimary,
    fontWeight: '600',
  },
  trialDuration: {
    position: 'absolute',
    bottom: DS.spacing.xs,
    right: DS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    // backdropFilter: 'blur(12px)', // Not supported in React Native
    paddingHorizontal: DS.spacing.xs,
    paddingVertical: DS.spacing.xxs,
    borderRadius: DS.effects.borderRadiusSmall,
    gap: DS.spacing.xxs,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  trialDurationText: {
    fontSize: 11,
    color: DS.colors.textPrimary,
    fontWeight: '600',
  },
  cardActions: {
    position: 'absolute',
    top: DS.spacing.xs,
    right: DS.spacing.xs,
    flexDirection: 'column',
    gap: DS.spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    // backdropFilter: 'blur(12px)', // Not supported in React Native
    borderRadius: DS.effects.borderRadiusCircle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  cardContent: {
    paddingTop: DS.spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.textPrimary,
    letterSpacing: -0.3,
  },
  cardGenre: {
    fontSize: 12,
    color: DS.colors.textSecondary,
    marginTop: DS.spacing.xs / 2,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  friendAvatars: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000',
  },
  socialProofText: {
    fontSize: 12,
    color: '#999',
  },
  dailyFeatureCard: {
    marginHorizontal: DS.spacing.lg,
    borderRadius: DS.effects.borderRadiusLarge,
    overflow: 'hidden',
    height: 180,
  },
  dailyFeatureGradient: {
    flex: 1,
    flexDirection: 'row',
    padding: DS.spacing.lg,
  },
  dailyFeatureContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  dailyFeatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    // backdropFilter: 'blur(12px)', // Not supported in React Native
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: DS.spacing.xs,
    borderRadius: DS.effects.borderRadiusLarge,
    gap: DS.spacing.xs / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dailyFeatureBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.colors.textPrimary,
  },
  dailyFeatureTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    letterSpacing: -0.5,
  },
  dailyFeatureDescription: {
    fontSize: 14,
    color: DS.colors.textSecondary,
  },
  dailyFeatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  dailyFeatureButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  dailyFeatureImage: {
    width: 120,
    height: '100%',
    opacity: 0.3,
  },
  spotlightContainer: {
    paddingHorizontal: 20,
  },
  spotlightCard: {
    width: SCREEN_WIDTH * 0.7,
    height: 200,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
  },
  spotlightGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    padding: 16,
    justifyContent: 'flex-end',
  },
  spotlightTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  spotlightGenre: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  iconBloomContainer: {
    position: 'absolute',
    top: 45, // Just below thin tab container
    left: 12, // Aligned to the left edge with some padding
    zIndex: 2500, // Below tabs but above content
    pointerEvents: 'box-none',
  },
  iconBloomContainerPortrait: {
    top: 45, // Just below thin tab container in portrait
    left: 10, // Slightly less padding in portrait
  },
  previewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.spacing.lg,
  },
  previewCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusLarge,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: DS.colors.borderLight,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1.5,
  },
  previewContent: {
    padding: DS.spacing.lg,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    marginBottom: DS.spacing.xs,
  },
  previewDescription: {
    fontSize: 14,
    color: DS.colors.textSecondary,
    marginBottom: DS.spacing.lg,
    lineHeight: 20,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewPlayButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  previewPlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  previewInfoButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
  },
  previewInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  featureModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  featureModal: {
    flex: 1,
  },
  featureModalImage: {
    width: '100%',
    height: '100%',
  },
  featureModalGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    justifyContent: 'flex-end',
    paddingBottom: DS.spacing.xl * 2,
  },
  featureModalClose: {
    position: 'absolute',
    top: 60,
    right: DS.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: DS.effects.borderRadiusCircle,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    // backdropFilter: 'blur(12px)', // Not supported in React Native
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  featureModalContent: {
    paddingHorizontal: DS.spacing.xl,
  },
  featureModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xs,
    marginBottom: DS.spacing.lg,
  },
  featureModalBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.accent,
  },
  featureModalTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    marginBottom: DS.spacing.sm,
  },
  featureModalDescription: {
    fontSize: 16,
    color: DS.colors.textSecondary,
    lineHeight: 24,
    marginBottom: DS.spacing.xl,
  },
  featureModalRewards: {
    marginBottom: 30,
  },
  featureModalRewardsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rewardText: {
    fontSize: 16,
    color: '#FFF',
  },
  featureModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  featureModalButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  // Portrait mode optimizations
  sectionPortrait: {
    marginBottom: 20,
  },
  sectionHeaderPortrait: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  horizontalCardPortrait: {
    width: SCREEN_WIDTH * 0.38,
    marginRight: 10,
  },
  spotlightCardPortrait: {
    width: SCREEN_WIDTH * 0.65,
    height: 160,
    marginRight: 12,
  },
  dailyFeatureCardPortrait: {
    marginHorizontal: 16,
    height: 150,
  },
  cardTitlePortrait: {
    fontSize: 15,
  },
  cardGenrePortrait: {
    fontSize: 11,
  },
  actionButtonPortrait: {
    width: 32,
    height: 32,
  },
});
