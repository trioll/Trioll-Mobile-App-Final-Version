import type { Game } from '../types';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Pressable, 
  Animated, 
  Dimensions, 
  PanResponder,
  Platform,
  ScrollView 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassContainer, GlassButton, GlassCard } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';
import { ScreenshotGallery } from '../components/gameDetail/ScreenshotGallery';
import { RatingsSection } from '../components/gameDetail/RatingsSection';
import { DeveloperSection } from '../components/gameDetail/DeveloperSection';
import { SimilarGames } from '../components/gameDetail/SimilarGames';
import { TrialInfoBanner } from '../components/gameDetail/TrialInfoBanner';
import { FloatingCTA } from '../components/gameDetail/FloatingCTA';
import { ExpandableDescription } from '../components/gameDetail/ExpandableDescription';
import { useHaptics } from '../hooks/useHaptics';
import { useGameActions } from '../hooks/useGameActions';
import { useApp } from '../context/AppContext';
import { safeAPI } from '../src/services/api/SafeTriollAPI';
import { getLogger } from '../src/utils/logger';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

const logger = getLogger('GameDetailScreen');

type RootStackParamList = {
  GameDetail: { game: Game };
  TrialPlayer: { game: Game };
};

type GameDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GameDetail'>;
type GameDetailScreenRouteProp = RouteProp<RootStackParamList, 'GameDetail'>;

export const GameDetailScreen: React.FC = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const isPortrait = SCREEN_HEIGHT > SCREEN_WIDTH;
  const navigation = useNavigation<GameDetailScreenNavigationProp>();
  const route = useRoute<GameDetailScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { trigger } = useHaptics();
  const { bookmarks } = useApp();
  const { bookmarkGame, handleRate: rateGame } = useGameActions();

  // Handle missing route params gracefully
  const gameParam = route.params?.game;

  // If no game is provided, navigate back
  useEffect(() => {
    if (!gameParam) {
      logger.error('GameDetailScreen: No game provided in route params');
      navigation.goBack();
    }
  }, [gameParam, navigation]);

  // State for game details from API
  const [game, setGame] = useState<Game | null>(gameParam || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(gameParam ? bookmarks.has(gameParam.id) : false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  // Hero image height based on orientation
  const HERO_HEIGHT = isPortrait ? SCREEN_HEIGHT * 0.55 : SCREEN_HEIGHT;
  
  // Bottom sheet snap points
  const COLLAPSED_HEIGHT = isPortrait ? SCREEN_HEIGHT * 0.25 : 80;
  const HALF_EXPANDED_HEIGHT = isPortrait ? SCREEN_HEIGHT * 0.5 : SCREEN_HEIGHT * 0.4;
  const FULLY_EXPANDED_HEIGHT = isPortrait ? SCREEN_HEIGHT * 0.9 : SCREEN_HEIGHT * 0.8;

  // Animation values
  const bottomSheetY = useRef(new Animated.Value(SCREEN_HEIGHT - COLLAPSED_HEIGHT)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastGestureY = useRef(0);
  const [bottomSheetExpansion, setBottomSheetExpansion] = useState<'collapsed' | 'half' | 'full'>('collapsed');
  const currentBottomSheetYRef = useRef(SCREEN_HEIGHT - COLLAPSED_HEIGHT);

  // Pan responder for bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        lastGestureY.current = 0;
        currentBottomSheetYRef.current = SCREEN_HEIGHT - COLLAPSED_HEIGHT;
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = Math.max(
          SCREEN_HEIGHT - FULLY_EXPANDED_HEIGHT,
          Math.min(SCREEN_HEIGHT - COLLAPSED_HEIGHT, currentBottomSheetYRef.current + gestureState.dy - lastGestureY.current)
        );
        bottomSheetY.setValue(newPosition);
        currentBottomSheetYRef.current = newPosition;
        lastGestureY.current = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vy;
        const currentY = currentBottomSheetYRef.current;
        
        let snapTo = SCREEN_HEIGHT - COLLAPSED_HEIGHT;
        let newExpansion: 'collapsed' | 'half' | 'full' = 'collapsed';
        
        if (velocity < -0.5) {
          // Fast swipe up
          if (bottomSheetExpansion === 'collapsed') {
            snapTo = SCREEN_HEIGHT - HALF_EXPANDED_HEIGHT;
            newExpansion = 'half';
          } else {
            snapTo = SCREEN_HEIGHT - FULLY_EXPANDED_HEIGHT;
            newExpansion = 'full';
          }
        } else if (velocity > 0.5) {
          // Fast swipe down
          if (bottomSheetExpansion === 'full') {
            snapTo = SCREEN_HEIGHT - HALF_EXPANDED_HEIGHT;
            newExpansion = 'half';
          } else {
            snapTo = SCREEN_HEIGHT - COLLAPSED_HEIGHT;
            newExpansion = 'collapsed';
          }
        } else {
          // Determine by position
          const halfPoint = SCREEN_HEIGHT - HALF_EXPANDED_HEIGHT;
          const collapsePoint = SCREEN_HEIGHT - COLLAPSED_HEIGHT;
          
          if (currentY < halfPoint - 50) {
            snapTo = SCREEN_HEIGHT - FULLY_EXPANDED_HEIGHT;
            newExpansion = 'full';
          } else if (currentY < collapsePoint - 100) {
            snapTo = SCREEN_HEIGHT - HALF_EXPANDED_HEIGHT;
            newExpansion = 'half';
          } else {
            snapTo = SCREEN_HEIGHT - COLLAPSED_HEIGHT;
            newExpansion = 'collapsed';
          }
        }
        
        Animated.spring(bottomSheetY, {
          toValue: snapTo,
          useNativeDriver: true,
          tension: 180,
          friction: 25,
        }).start(() => {
          currentBottomSheetYRef.current = snapTo;
        });
        
        setBottomSheetExpansion(newExpansion);
      },
    })
  ).current;

  // Load fresh game details from API
  useEffect(() => {
    if (!gameParam) return;

    const loadGameDetails = async () => {
      setIsLoading(true);
      try {
        const response = await safeAPI.getGames(gameParam.id as unknown);
        const details =
          response && (response as any).games && (response as any).games.length > 0
            ? response[0]
            : null;
        if (details) {
          setGame(details);
        }
      } catch (error) {
        logger.error('Failed to load game details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGameDetails();
  }, [gameParam?.id]);

  // Update bookmark state when bookmarks change
  useEffect(() => {
    if (game) {
      setIsBookmarked(bookmarks.has(game.id));
    }
  }, [bookmarks, game?.id]);

  const handleBookmark = async () => {
    trigger('light');
    setIsBookmarked(!isBookmarked);
    try {
      await bookmarkGame(game.id, isBookmarked);
    } catch (error) {
      // Revert on error
      setIsBookmarked(isBookmarked);
    }
  };

  const handleRate = async (rating: number) => {
    trigger('success');
    try {
      await rateGame(enrichedGame, rating);
    } catch (error) {
      logger.error('Failed to rate game:', error);
    }
  };

  const handleShare = () => {
    trigger('light');
    // Implement share functionality
  };

  const handleStartTrial = () => {
    trigger('medium');
    navigation.navigate('TrialPlayer' as keyof RootStackParamList, { game: enrichedGame } as any);
  };

  // Show loading state if game is not available
  if (!game) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading game details...</Text>
      </View>
    );
  }

  // Enrich game data with computed properties for UI compatibility
  const enrichedGame = useMemo(() => {
    // Handle platform display intelligently
    const getPlatformDisplay = (platforms?: string[]) => {
      if (!platforms || platforms.length === 0) return 'All Platforms';
      if (platforms.length === 1) return platforms[0];
      if (platforms.includes('iOS') && platforms.includes('Android')) return 'iOS & Android';
      return platforms.join(' & ');
    };

    return {
      ...game,
      // Use existing fields
      icon: game.icon || game.thumbnailUrl,
      totalRatings: game.totalRatings || game.ratingCount || 0,
      hasVideo: game.hasVideo ?? Boolean(game.trailerUrl),
      platform: game.platform || getPlatformDisplay(game.platforms),
      
      // Convert age rating
      ageRating: game.ageRating || (game.minAge ? `${game.minAge}+` : 'Everyone'),
      
      // Use developer name as ID temporarily
      developerId: game.developerId || game.developer,
      
      // Provide empty arrays for preview content (future use)
      screenshots: game.screenshots || [],
      videos: game.videos || [],
    };
  }, [game]);

  // Use enrichedGame instead of game for all UI references

  // Calculate dynamic opacity for bottom sheet background
  const bottomSheetBackgroundOpacity = bottomSheetY.interpolate({
    inputRange: [
      SCREEN_HEIGHT - FULLY_EXPANDED_HEIGHT,
      SCREEN_HEIGHT - HALF_EXPANDED_HEIGHT,
      SCREEN_HEIGHT - COLLAPSED_HEIGHT,
    ],
    outputRange: [0.95, 0.85, isPortrait ? 0.75 : 0.5],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
        <Image
          source={{ uri: enrichedGame.coverImageUrl || 'https://placehold.co/600x400/1a1a2e/6366f1?text=No+Image' }}
          style={styles.heroImage}
        />
        
        {/* Gradient overlay for better text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.heroGradient}
        />

        {/* Header Actions - Keep existing icon logic */}
        <View style={[styles.headerActions, { top: insets.top + 10 }]}>
          <GlassButton
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            variant="ghost"
            size="small"
          >
            <Ionicons name="arrow-back" size={24} color={DS.colors.textPrimary} />
          </GlassButton>

          <View style={styles.rightActions}>
            <GlassButton
              style={[styles.headerButton, isPortrait && styles.headerButtonPortrait]}
              onPress={handleShare}
              variant="ghost"
              size="small"
            >
              <Ionicons name="share-outline" size={isPortrait ? 20 : 24} color={DS.colors.textPrimary} />
            </GlassButton>
            <GlassButton
              style={[styles.headerButton, isPortrait && styles.headerButtonPortrait]}
              onPress={handleBookmark}
              variant="ghost"
              size="small"
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline' as any}
                size={isPortrait ? 20 : 24}
                color={isBookmarked ? DS.colors.primary : DS.colors.textPrimary}
              />
            </GlassButton>
          </View>
        </View>

        {/* Title Overlay on Hero Image */}
        <View style={[styles.titleOverlay, isPortrait ? styles.titleOverlayPortrait : styles.titleOverlayLandscape]}>
          {!isPortrait && enrichedGame.icon && (
            <Image source={{ uri: enrichedGame.icon }} style={styles.landscapeIcon} />
          )}
          <View style={styles.titleContainer}>
            <Text style={[styles.heroTitle, !isPortrait && styles.heroTitleLandscape]}>{enrichedGame.title}</Text>
            <Text style={[styles.heroDeveloper, !isPortrait && styles.heroDeveloperLandscape]}>{enrichedGame.developer}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{enrichedGame.genre}</Text>
              <Text style={styles.heroMetaDivider}>•</Text>
              <Text style={styles.heroMetaText}>
                {enrichedGame.platform === 'both' ? 'iOS & Android' : (enrichedGame.platform || 'Unknown').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Video Preview Button */}
        {enrichedGame.hasVideo && !isPortrait && (
          <Pressable style={styles.landscapeVideoButton} onPress={() => setShowVideoPreview(true)}>
            <BlurView intensity={75} tint="dark" style={styles.landscapeVideoButtonContent}>
              <Ionicons name="play-circle" size={48} color="#fff" />
              <Text style={styles.videoButtonText}>Watch Trailer</Text>
            </BlurView>
          </Pressable>
        )}
      </View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: bottomSheetY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.bottomSheetBackground,
            {
              opacity: bottomSheetBackgroundOpacity,
            },
          ]}
        >
          <BlurView intensity={isPortrait ? 95 : 85} tint="dark" style={StyleSheet.absoluteFillObject} />
        </Animated.View>

        {/* Grab Handle */}
        <View {...panResponder.panHandlers} style={styles.grabHandleContainer}>
          <View style={styles.grabHandle} />
        </View>

        {/* Bottom Sheet Content */}
        <ScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={[
            styles.bottomSheetScrollContent,
            !isPortrait && styles.bottomSheetScrollContentLandscape,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={bottomSheetExpansion !== 'collapsed'}
        >
          {/* Quick Stats - Always visible */}
          <View style={[styles.quickStats, !isPortrait && styles.quickStatsLandscape]}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.statValue}>{(enrichedGame.rating || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="download" size={16} color="#6366f1" />
              <Text style={styles.statValue}>{((enrichedGame.totalRatings || 0) / 1000).toFixed(1)}K</Text>
              <Text style={styles.statLabel}>downloads</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#00ff88" />
              <Text style={styles.statValue}>Free</Text>
              <Text style={styles.statLabel}>trial</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.platformText}>
                {enrichedGame.platform === 'both' ? 'iOS/Android' : (enrichedGame.platform || 'iOS')}
              </Text>
            </View>
          </View>

          {/* CTA Button */}
          <View style={styles.ctaContainer}>
            <GlassButton
              style={styles.primaryButton}
              onPress={handleStartTrial}
              variant="primary"
              glowEffect
              fullWidth
            >
              <Ionicons name="play" size={20} color={DS.colors.background} />
              <Text style={styles.primaryButtonText}>Start Free Trial</Text>
            </GlassButton>
          </View>

          {/* Content visible at half expansion */}
          {bottomSheetExpansion !== 'collapsed' && (
            <View style={[styles.halfExpandedContent, !isPortrait && styles.halfExpandedContentLandscape]}>
              {/* About Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.description} numberOfLines={bottomSheetExpansion === 'half' ? 4 : undefined}>
                  {enrichedGame.description}
                </Text>
              </View>

              {/* Video Preview for Portrait */}
              {enrichedGame.hasVideo && isPortrait && (
                <Pressable style={styles.videoPreviewButton} onPress={() => setShowVideoPreview(true)}>
                  <BlurView intensity={75} tint="dark" style={styles.videoButtonContent}>
                    <Ionicons name="play-circle" size={36} color="#fff" />
                    <Text style={styles.videoButtonText}>Watch Trailer</Text>
                  </BlurView>
                </Pressable>
              )}
            </View>
          )}

          {/* Content visible at full expansion */}
          {bottomSheetExpansion === 'full' && (
            <View style={[styles.fullExpandedContent, !isPortrait && styles.fullExpandedContentLandscape]}>
              {/* Screenshots Gallery */}
              <ScreenshotGallery screenshots={enrichedGame.screenshots || []} videos={enrichedGame.videos || []} />

              {/* Expandable Description with Tags */}
              <ExpandableDescription description={enrichedGame.description} tags={enrichedGame.tags} />

              {/* Ratings & Reviews */}
              <RatingsSection
                gameId={enrichedGame.id}
                rating={enrichedGame.rating}
                totalRatings={enrichedGame.totalRatings}
                onRate={handleRate}
              />

              {/* Game Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Genre</Text>
                    <Text style={styles.detailValue}>{enrichedGame.genre}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Version</Text>
                    <Text style={styles.detailValue}>1.2.4</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Age Rating</Text>
                    <Text style={styles.detailValue}>{enrichedGame.ageRating || '12+'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Size</Text>
                    <Text style={styles.detailValue}>248 MB</Text>
                  </View>
                </View>
              </View>

              {/* Developer Section */}
              <DeveloperSection developer={enrichedGame.developer} developerId={enrichedGame.developerId} />

              {/* Similar Games */}
              <SimilarGames currentGameId={enrichedGame.id} genre={enrichedGame.genre} />

              {/* Trial Info Banner */}
              <TrialInfoBanner platform={enrichedGame.platform} />
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: DS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Hero Section
  heroContainer: {
    position: 'relative',
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  
  // Header Actions
  headerActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerButtonPortrait: {
    transform: [{ scale: 0.9 }],
  },
  rightActions: {
    flexDirection: 'row',
  },
  
  // Title Overlay
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 32,
  },
  titleOverlayPortrait: {
    paddingBottom: 24,
  },
  titleOverlayLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    bottom: 20,
  },
  landscapeIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 20,
  },
  titleContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },
  heroTitleLandscape: {
    fontSize: 32,
  },
  heroDeveloper: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroDeveloperLandscape: {
    fontSize: 16,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMetaDivider: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 8,
  },
  
  // Video Button
  landscapeVideoButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -80,
    marginTop: -32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  landscapeVideoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoPreviewButton: {
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 16,
  },
  videoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Dimensions.get('window').height,
    backgroundColor: 'transparent',
  },
  bottomSheetBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.3)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  grabHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  bottomSheetScrollContentLandscape: {
    paddingHorizontal: 48,
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickStatsLandscape: {
    justifyContent: 'center',
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  platformText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // CTA
  ctaContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: DS.colors.primary,
  },
  primaryButtonText: {
    color: DS.colors.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Content Sections
  halfExpandedContent: {
    opacity: 1,
  },
  halfExpandedContentLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fullExpandedContent: {
    opacity: 1,
  },
  fullExpandedContentLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});