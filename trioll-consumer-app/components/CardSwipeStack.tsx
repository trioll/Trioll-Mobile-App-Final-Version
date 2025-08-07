import type { Game } from './../src/types/api.types';
import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, PanResponder, StyleSheet, Dimensions, Image } from 'react-native';
import { OrientationAwareGameCard } from './OrientationAwareGameCard';
import { useHaptics, useOrientation } from '../hooks';
import { DURATIONS } from '../constants/animations';

// Memoized card component to prevent unnecessary re-renders
const MemoizedGameCard = React.memo(OrientationAwareGameCard, (prev, next) => {
  return prev.game.id === next.game.id && 
         prev.isLiked === next.isLiked && 
         prev.isBookmarked === next.isBookmarked &&
         prev.disabled === next.disabled &&
         prev.isCurrentCard === next.isCurrentCard &&
         prev.likeCount === next.likeCount &&
         prev.commentCount === next.commentCount &&
         prev.currentRating === next.currentRating;
});

// Constants
const SWIPE_OUT_DURATION = DURATIONS.SWIPE_OUT || 300;
const VELOCITY_THRESHOLD = 0.5;
const ROTATION_MULTIPLIER = 0.03;
const LANDSCAPE_CARD_OFFSET = 30; // Slight offset for depth in landscape

interface CardSwipeStackProps {
  games: Game[];
  onPlayTrial: (game: Game) => void;
  onGameChange?: (game: Game) => void;
  onLike?: (game: Game) => void;
  onShare?: (game: Game) => void;
  onBookmark?: (game: Game) => void;
  onComment?: (game: Game) => void;
  onRate?: (game: Game, rating: number) => void;
  likes?: Set<string>;
  bookmarks?: Set<string>;
  disabled?: boolean;
}

export const CardSwipeStack: React.FC<CardSwipeStackProps> = ({
  games,
  onPlayTrial,
  onGameChange,
  onLike,
  onShare,
  onBookmark,
  onComment,
  onRate,
  likes = new Set(),
  bookmarks = new Set(),
  disabled = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0); // Track current index with ref to avoid closure issues
  const swipeAnimatedValue = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentCardOpacity = useRef(new Animated.Value(1)).current;
  const nextCardOffset = useRef(new Animated.Value(0)).current;
  const haptics = useHaptics();
  const { width: screenWidth, height: screenHeight, isPortrait } = useOrientation();
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any pending timeouts
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      // Stop any ongoing animations
      swipeAnimatedValue.stopAnimation();
      currentCardOpacity.stopAnimation();
      nextCardOffset.stopAnimation();
    };
  }, []);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Dynamic swipe threshold based on screen width
  const SWIPE_THRESHOLD = screenWidth * 0.25;

  // Get current and next games
  const currentGame = games[currentIndex];
  const nextIndex = (currentIndex + 1) % games.length;
  const nextGame = games[nextIndex];

  // Notify parent when game changes
  useEffect(() => {
    if (onGameChange && currentGame) {
      onGameChange(currentGame);
    }
  }, [currentIndex, currentGame, onGameChange]);

  // Animate next card offset in landscape mode
  useEffect(() => {
    if (!isPortrait) {
      Animated.timing(nextCardOffset, {
        toValue: LANDSCAPE_CARD_OFFSET,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(nextCardOffset, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isPortrait, nextCardOffset]);

  // Reset animations
  const resetAnimations = () => {
    swipeAnimatedValue.setValue({ x: 0, y: 0 });
    currentCardOpacity.setValue(1);
  };

  // Handle swipe completion
  const handleSwipeComplete = (direction: 'left' | 'right') => {
    const actualCurrentIndex = currentIndexRef.current; // Use ref to get current value
    haptics.swipeComplete(direction);
    
    let newIndex: number;
    
    if (direction === 'left') {
      // Swipe left - go to next game
      newIndex = (actualCurrentIndex + 1) % games.length;
    } else if (direction === 'right') {
      // Swipe right - go to previous game
      newIndex = actualCurrentIndex === 0 ? games.length - 1 : actualCurrentIndex - 1;
    } else {
      // Should not happen, but handle gracefully
      resetAnimations();
      return;
    }
    
    // Update both state and ref
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    
    // Reset animations after a small delay to ensure state has updated
    resetTimeoutRef.current = setTimeout(() => {
      resetAnimations();
    }, 50);
  };

  // Track if animation is in progress to prevent multiple simultaneous animations
  const isAnimatingRef = useRef(false);

  // Animate swipe out with timeout protection
  const animateSwipeOut = (direction: 'left' | 'right') => {
    // Prevent multiple animations
    if (isAnimatingRef.current) {
      console.warn('⚠️ Animation already in progress, ignoring swipe');
      return;
    }
    
    isAnimatingRef.current = true;
    const toValue = direction === 'left' ? -screenWidth * 1.5 : screenWidth * 1.5;
    let animationCompleted = false;

    // Set a timeout to ensure completion even if animation fails
    animationTimeoutRef.current = setTimeout(() => {
      if (!animationCompleted) {
        isAnimatingRef.current = false;
        handleSwipeComplete(direction);
      }
    }, SWIPE_OUT_DURATION + 100); // Add 100ms buffer

    Animated.parallel([
      Animated.timing(swipeAnimatedValue.x, {
        toValue,
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(currentCardOpacity, {
        toValue: 0,
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      animationCompleted = true;
      isAnimatingRef.current = false;
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      
      if (finished) {
        handleSwipeComplete(direction);
      } else {
        // Still complete the swipe even if animation was interrupted
        handleSwipeComplete(direction);
      }
    });
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && 
               Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        haptics.impact('light');
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow horizontal movement
        swipeAnimatedValue.setValue({ x: gestureState.dx, y: 0 });
        
        // Fade out current card as it moves
        const progress = Math.abs(gestureState.dx) / screenWidth;
        currentCardOpacity.setValue(1 - progress * 0.3);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        
        // Prevent swipes while animating
        if (isAnimatingRef.current) {
          // Spring back to center
          Animated.spring(swipeAnimatedValue, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
          return;
        }
        
        // Check if swipe meets threshold or velocity
        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > VELOCITY_THRESHOLD) {
          if (dx < 0) {
            // Swipe left - next game
            animateSwipeOut('left');
          } else {
            // Swipe right - previous game
            animateSwipeOut('right');
          }
        } else {
          // Spring back to center
          Animated.parallel([
            Animated.spring(swipeAnimatedValue, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }),
            Animated.timing(currentCardOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Preload next images for smooth transitions
  useEffect(() => {
    // Preload next 2 images
    const preloadImages = async () => {
      for (let i = 1; i <= 2; i++) {
        const nextIndex = (currentIndex + i) % games.length;
        const nextGame = games[nextIndex];
        if (nextGame) {
          const imageUrl = nextGame.coverImageUrl || nextGame.thumbnailUrl;
          if (imageUrl) {
            Image.prefetch(imageUrl).catch(() => {
              // Silently fail, image will load normally
            });
          }
        }
      }
    };
    
    preloadImages();
  }, [currentIndex, games]);

  // Calculate rotation based on swipe
  const cardRotation = swipeAnimatedValue.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  if (!currentGame) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* Next card (behind current) */}
      {nextGame && (
        <Animated.View
          key={nextGame.id}
          style={[
            styles.card,
            {
              transform: [
                {
                  translateX: !isPortrait ? nextCardOffset : 0,
                },
                {
                  scale: 0.95,
                },
              ],
            },
          ]}
        >
          <MemoizedGameCard
            game={nextGame}
            onPlayTrial={onPlayTrial}
            onLike={onLike ? () => onLike(nextGame) : undefined}
            onShare={onShare ? () => onShare(nextGame) : undefined}
            onBookmark={onBookmark ? () => onBookmark(nextGame) : undefined}
            onComment={onComment ? () => onComment(nextGame) : undefined}
            onRate={onRate ? (rating: number) => onRate(nextGame, rating) : undefined}
            isLiked={likes.has(nextGame.id)}
            isBookmarked={bookmarks.has(nextGame.id)}
            disabled={true}
            isCurrentCard={false}
            showNextCardShadow={!isPortrait}
            likeCount={nextGame.likesCount || 0}
            commentCount={nextGame.commentsCount || 0}
            currentRating={nextGame.averageRating || 0}
          />
        </Animated.View>
      )}

      {/* Current card */}
      <Animated.View
        key={currentGame.id}
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            opacity: currentCardOpacity,
            transform: [
              { translateX: swipeAnimatedValue.x },
              { rotate: cardRotation },
            ],
          },
        ]}
      >
        <MemoizedGameCard
          game={currentGame}
          onPlayTrial={onPlayTrial}
          onLike={onLike ? () => onLike(currentGame) : undefined}
          onShare={onShare ? () => onShare(currentGame) : undefined}
          onBookmark={onBookmark ? () => onBookmark(currentGame) : undefined}
          onComment={onComment ? () => onComment(currentGame) : undefined}
          onRate={onRate ? (rating: number) => onRate(currentGame, rating) : undefined}
          isLiked={likes.has(currentGame.id)}
          isBookmarked={bookmarks.has(currentGame.id)}
          disabled={disabled}
          isCurrentCard={true}
          showNextCardShadow={false}
          likeCount={currentGame.likesCount || 0}
          commentCount={currentGame.commentsCount || 0}
          currentRating={currentGame.averageRating || 0}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  card: {
    ...StyleSheet.absoluteFillObject,
  },
});