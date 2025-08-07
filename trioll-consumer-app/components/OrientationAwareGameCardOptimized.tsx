import type { Game } from '../types';
import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Pressable,
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FastImage from '../src/utils/fastImageCompat';

import { Text } from './base';
import { TriollPlayButton } from './TriollPlayButton';
import { SPRING_CONFIGS, DURATIONS } from '../constants/animations';
import { useHaptics, useOrientation } from '../hooks';
import { useOrientationTransition } from '../hooks/useOrientationTransition';

const PORTRAIT_IMAGE_ASPECT_RATIO = 16 / 9;
const LANDSCAPE_SHADOW_OFFSET = 20;

interface OrientationAwareGameCardOptimizedProps {
  game: Game;
  onPlayTrial: (game: Game) => void;
  onLike?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  disabled?: boolean;
  isCurrentCard?: boolean;
  showNextCardShadow?: boolean;
}

export const OrientationAwareGameCardOptimized = React.memo<OrientationAwareGameCardOptimizedProps>(({
  game,
  onPlayTrial,
  onLike,
  onShare,
  onBookmark,
  isLiked = false,
  isBookmarked = false,
  disabled = false,
  isCurrentCard = true,
  showNextCardShadow = false,
}) => {
  const { width: screenWidth, height: screenHeight } = useOrientation();
  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [imageLoading, setImageLoading] = useState(true);
  
  const { isPortrait, transitionProgress, portraitValue, landscapeValue } = useOrientationTransition({
    duration: 300,
    enableLayoutAnimation: true,
  });

  // Animation values
  const likeScale = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  
  // Double tap tracking
  const lastTapRef = useRef<number>(0);

  // Calculate dimensions based on orientation
  const imageHeight = isPortrait 
    ? screenWidth / PORTRAIT_IMAGE_ASPECT_RATIO 
    : screenHeight;

  const handleDoubleTap = useCallback(() => {
    if (!onLike) return;
    
    haptics.impact('medium');
    onLike();

    // Animate heart
    Animated.parallel([
      Animated.sequence([
        Animated.spring(likeScale, {
          ...SPRING_CONFIGS.BOUNCY,
          toValue: 1.5,
          useNativeDriver: true,
        }),
        Animated.spring(likeScale, {
          ...SPRING_CONFIGS.QUICK,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(likeOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(likeOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [onLike, haptics, likeScale, likeOpacity]);

  const renderActionButtons = useCallback(() => (
    <View style={[
      styles.actionButtons,
      isPortrait ? styles.actionButtonsPortrait : styles.actionButtonsLandscape
    ]}>
      {onLike && (
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            haptics.impact('light');
            onLike();
          }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? '#FF2D55' : '#FFFFFF'}
          />
        </Pressable>
      )}
      {onBookmark && (
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            haptics.impact('light');
            onBookmark();
          }}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color={isBookmarked ? '#6366f1' : '#FFFFFF'}
          />
        </Pressable>
      )}
      {onShare && (
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            haptics.impact('light');
            onShare();
          }}
        >
          <Ionicons name="share-outline" size={28} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  ), [onLike, onShare, onBookmark, isLiked, isBookmarked, haptics, isPortrait]);

  // Memoize image source
  const imageSource = useMemo(() => ({
    uri: game.coverImageUrl || game.thumbnailUrl,
    priority: isCurrentCard ? FastImage.priority.high : FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }), [game.coverImageUrl, game.thumbnailUrl, isCurrentCard]);

  return (
    <View style={styles.container}>
      {/* Game Image/Video */}
      <Pressable
        onPress={() => {
          const now = Date.now();
          const DOUBLE_TAP_DELAY = 300;
          if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            handleDoubleTap();
          }
          lastTapRef.current = now;
        }}
        style={styles.mediaContainer}
      >
        {/* Optimized image loading with FastImage */}
        <FastImage
          source={imageSource}
          style={styles.gameImage}
          resizeMode={FastImage.resizeMode.cover}
          onLoadStart={() => setImageLoading(true)}
          onLoad={() => setImageLoading(false)}
          onError={() => setImageLoading(false)}
        />
        
        {/* Loading indicator */}
        {imageLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        )}
        
        {/* Gradient overlays */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent']}
          style={styles.topGradient}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={styles.bottomGradient}
        />

        {/* Play Button - Centered */}
        <View style={styles.playButtonWrapper}>
          <TriollPlayButton
            onPress={() => !disabled && onPlayTrial(game)}
            gameGenre={game.genre || 'default'}
            size={isPortrait ? 100 : 120}
          />
        </View>

        {/* Action buttons in landscape */}
        {!isPortrait && renderActionButtons()}
      </Pressable>

      {/* Action buttons in portrait */}
      {isPortrait && renderActionButtons()}

      {/* Like animation overlay */}
      <Animated.View
        style={[
          styles.likeAnimation,
          {
            opacity: likeOpacity,
            transform: [{ scale: likeScale }],
          },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="heart" size={80} color="#FF2D55" />
      </Animated.View>

      {/* Next card shadow in landscape */}
      {!isPortrait && showNextCardShadow && !isCurrentCard && (
        <View style={styles.nextCardShadow} />
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.game.id === nextProps.game.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isBookmarked === nextProps.isBookmarked &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isCurrentCard === nextProps.isCurrentCard &&
    prevProps.showNextCardShadow === nextProps.showNextCardShadow
  );
});

OrientationAwareGameCardOptimized.displayName = 'OrientationAwareGameCardOptimized';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  playButtonWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    position: 'absolute',
    gap: 16,
  },
  actionButtonsPortrait: {
    bottom: 80,
    right: 24,
    flexDirection: 'column',
  },
  actionButtonsLandscape: {
    bottom: 40,
    right: 24,
    flexDirection: 'row',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  likeAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
  },
  nextCardShadow: {
    position: 'absolute',
    right: -LANDSCAPE_SHADOW_OFFSET,
    top: 0,
    bottom: 0,
    width: LANDSCAPE_SHADOW_OFFSET,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});