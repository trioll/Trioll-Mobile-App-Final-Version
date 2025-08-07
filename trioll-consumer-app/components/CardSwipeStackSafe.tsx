import type { Game } from './../src/types/api.types';
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Animated, PanResponder, StyleSheet, Dimensions, Image } from 'react-native';
import { OrientationAwareGameCard } from './OrientationAwareGameCard';
import { useHaptics, useOrientation } from '../hooks';
import { DURATIONS } from '../constants/animations';

// Constants
const SWIPE_OUT_DURATION = DURATIONS.SWIPE_OUT || 300;
const VELOCITY_THRESHOLD = 0.5;
const ROTATION_MULTIPLIER = 0.03;
const LANDSCAPE_CARD_OFFSET = 30;

interface CardSwipeStackSafeProps {
  games: Game[];
  onPlayTrial: (game: Game) => void;
  onGameChange?: (game: Game) => void;
  onLike?: (game: Game) => void;
  onShare?: (game: Game) => void;
  onBookmark?: (game: Game) => void;
  likes?: Set<string>;
  bookmarks?: Set<string>;
  disabled?: boolean;
}

// Memoized card component to prevent unnecessary re-renders
const MemoizedGameCard = React.memo(OrientationAwareGameCard, (prevProps, nextProps) => {
  return (
    prevProps.game.id === nextProps.game.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isBookmarked === nextProps.isBookmarked &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isCurrentCard === nextProps.isCurrentCard
  );
});

export const CardSwipeStackSafe: React.FC<CardSwipeStackSafeProps> = ({
  games,
  onPlayTrial,
  onGameChange,
  onLike,
  onShare,
  onBookmark,
  likes = new Set(),
  bookmarks = new Set(),
  disabled = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const swipeAnimatedValue = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentCardOpacity = useRef(new Animated.Value(1)).current;
  const nextCardOffset = useRef(new Animated.Value(0)).current;
  const haptics = useHaptics();
  const { width: screenWidth, height: screenHeight, isPortrait } = useOrientation();
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadedImages = useRef<Set<string>>(new Set());
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
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
  const prevIndex = currentIndex === 0 ? games.length - 1 : currentIndex - 1;
  const nextGame = games[nextIndex];
  const prevGame = games[prevIndex];

  // Preload images for smooth transitions
  useEffect(() => {
    const imagesToPreload = [];
    
    // Preload next 3 images
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % games.length;
      const game = games[index];
      if (game && !preloadedImages.current.has(game.id)) {
        const imageUrl = game.coverImageUrl || game.thumbnailUrl;
        if (imageUrl) {
          imagesToPreload.push({ id: game.id, url: imageUrl });
        }
      }
    }

    // Preload previous image
    if (prevGame && !preloadedImages.current.has(prevGame.id)) {
      const imageUrl = prevGame.coverImageUrl || prevGame.thumbnailUrl;
      if (imageUrl) {
        imagesToPreload.push({ id: prevGame.id, url: imageUrl });
      }
    }

    // Perform preloading
    imagesToPreload.forEach(({ id, url }) => {
      Image.prefetch(url).then(() => {
        preloadedImages.current.add(id);
      }).catch(() => {
        // Silently fail, image will load normally
      });
    });
  }, [currentIndex, games, prevGame]);

  // Notify parent when game changes - fixed to avoid infinite loop
  useEffect(() => {
    if (onGameChange && currentGame) {
      onGameChange(currentGame);
    }
  }, [currentIndex]); // Only depend on currentIndex, not currentGame

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
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    const actualCurrentIndex = currentIndexRef.current;
    haptics.swipeComplete(direction);
    
    let newIndex: number;
    
    if (direction === 'left') {
      newIndex = (actualCurrentIndex + 1) % games.length;
    } else {
      newIndex = actualCurrentIndex === 0 ? games.length - 1 : actualCurrentIndex - 1;
    }
    
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    
    resetTimeoutRef.current = setTimeout(() => {
      resetAnimations();
    }, 50);
  }, [games.length, haptics]);

  const isAnimatingRef = useRef(false);

  // Animate swipe out with timeout protection
  const animateSwipeOut = useCallback((direction: 'left' | 'right') => {
    if (isAnimatingRef.current) {
      return;
    }
    
    isAnimatingRef.current = true;
    const toValue = direction === 'left' ? -screenWidth * 1.5 : screenWidth * 1.5;
    let animationCompleted = false;

    animationTimeoutRef.current = setTimeout(() => {
      if (!animationCompleted) {
        isAnimatingRef.current = false;
        handleSwipeComplete(direction);
      }
    }, SWIPE_OUT_DURATION + 100);

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
      
      handleSwipeComplete(direction);
    });
  }, [screenWidth, handleSwipeComplete, swipeAnimatedValue, currentCardOpacity]);

  // Pan responder for swipe gestures
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && 
               Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        haptics.impact('light');
      },
      onPanResponderMove: (_, gestureState) => {
        swipeAnimatedValue.setValue({ x: gestureState.dx, y: 0 });
        
        const progress = Math.abs(gestureState.dx) / screenWidth;
        currentCardOpacity.setValue(1 - progress * 0.3);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        
        if (isAnimatingRef.current) {
          Animated.spring(swipeAnimatedValue, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
          return;
        }
        
        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > VELOCITY_THRESHOLD) {
          if (dx < 0) {
            animateSwipeOut('left');
          } else {
            animateSwipeOut('right');
          }
        } else {
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
    }), [disabled, haptics, screenWidth, animateSwipeOut, swipeAnimatedValue, currentCardOpacity]);

  // Calculate rotation based on swipe
  const cardRotation = swipeAnimatedValue.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  if (!currentGame) {
    return <View style={styles.container} />;
  }

  // Memoized callbacks to prevent re-renders
  const handleLikeNext = useCallback(() => onLike?.(nextGame), [onLike, nextGame]);
  const handleShareNext = useCallback(() => onShare?.(nextGame), [onShare, nextGame]);
  const handleBookmarkNext = useCallback(() => onBookmark?.(nextGame), [onBookmark, nextGame]);
  
  const handleLikeCurrent = useCallback(() => onLike?.(currentGame), [onLike, currentGame]);
  const handleShareCurrent = useCallback(() => onShare?.(currentGame), [onShare, currentGame]);
  const handleBookmarkCurrent = useCallback(() => onBookmark?.(currentGame), [onBookmark, currentGame]);

  return (
    <View style={styles.container}>
      {/* Next card (behind current) - using stable key */}
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
            onLike={handleLikeNext}
            onShare={handleShareNext}
            onBookmark={handleBookmarkNext}
            isLiked={likes.has(nextGame.id)}
            isBookmarked={bookmarks.has(nextGame.id)}
            disabled={true}
            isCurrentCard={false}
            showNextCardShadow={!isPortrait}
          />
        </Animated.View>
      )}

      {/* Current card - using stable key */}
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
          onLike={handleLikeCurrent}
          onShare={handleShareCurrent}
          onBookmark={handleBookmarkCurrent}
          isLiked={likes.has(currentGame.id)}
          isBookmarked={bookmarks.has(currentGame.id)}
          disabled={disabled}
          isCurrentCard={true}
          showNextCardShadow={false}
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