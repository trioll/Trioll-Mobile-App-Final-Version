import type { Game } from './../src/types/api.types';
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { OrientationAwareGameCard } from './OrientationAwareGameCard';
// Note: Can switch to OrientationAwareGameCardOptimized for better image loading
import { useHaptics, useOrientation } from '../hooks';
import { Image } from 'react-native';

// Constants
const SWIPE_VELOCITY_THRESHOLD = 500;
const ROTATION_MULTIPLIER = 10;
const SCALE_DOWN_DISTANT = 0.85;
const SCALE_DOWN_NEXT = 0.95;
const CARDS_TO_RENDER = 3; // Render 3 cards for smoother transitions

interface CardSwipeStackOptimizedProps {
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

// Memoized game card component
const MemoizedGameCard = React.memo(OrientationAwareGameCard, (prevProps, nextProps) => {
  return (
    prevProps.game.id === nextProps.game.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isBookmarked === nextProps.isBookmarked &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isCurrentCard === nextProps.isCurrentCard
  );
});

export const CardSwipeStackOptimized: React.FC<CardSwipeStackOptimizedProps> = ({
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
  const haptics = useHaptics();
  const { width: screenWidth, height: screenHeight, isPortrait } = useOrientation();
  
  // Preload tracking
  const preloadedImages = useRef<Set<string>>(new Set());
  
  // Shared values for smooth animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(false);

  // Dynamic swipe threshold based on screen width
  const SWIPE_THRESHOLD = screenWidth * 0.25;

  // Preload images for upcoming cards
  const preloadImages = useCallback((startIndex: number) => {
    const imagesToPreload = [];
    for (let i = 0; i < 5; i++) {
      const index = (startIndex + i) % games.length;
      const game = games[index];
      if (game && !preloadedImages.current.has(game.id)) {
        const imageUrl = game.coverImageUrl || game.thumbnailUrl;
        if (imageUrl) {
          imagesToPreload.push({ id: game.id, url: imageUrl });
        }
      }
    }

    // Preload images
    imagesToPreload.forEach(({ id, url }) => {
      Image.prefetch(url).then(() => {
        preloadedImages.current.add(id);
      }).catch(() => {
        // Image preload failed, but continue
      });
    });
  }, [games]);

  // Preload images when index changes
  useEffect(() => {
    preloadImages(currentIndex);
  }, [currentIndex, preloadImages]);

  // Get cards to render
  const cardsToRender = useMemo(() => {
    const cards = [];
    for (let i = 0; i < CARDS_TO_RENDER; i++) {
      const index = (currentIndex + i) % games.length;
      cards.push({ game: games[index], index: i, actualIndex: index });
    }
    return cards;
  }, [currentIndex, games]);

  // Notify parent when game changes
  useEffect(() => {
    if (onGameChange && cardsToRender[0]?.game) {
      onGameChange(cardsToRender[0].game);
    }
  }, [currentIndex, cardsToRender, onGameChange]);

  const goToNext = useCallback(() => {
    'worklet';
    runOnJS(haptics.swipeComplete)('left');
    runOnJS(setCurrentIndex)((prev) => (prev + 1) % games.length);
  }, [games.length, haptics]);

  const goToPrevious = useCallback(() => {
    'worklet';
    runOnJS(haptics.swipeComplete)('right');
    runOnJS(setCurrentIndex)((prev) => (prev === 0 ? games.length - 1 : prev - 1));
  }, [games.length, haptics]);

  const resetPosition = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0, { damping: 20, stiffness: 150 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
  }, [translateX, translateY]);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      gestureActive.value = true;
      runOnJS(haptics.impact)('light');
    },
    onActive: (event) => {
      if (!disabled) {
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.2; // Reduce vertical movement
      }
    },
    onEnd: (event) => {
      gestureActive.value = false;
      
      if (disabled) {
        resetPosition();
        return;
      }

      const velocityX = event.velocityX;
      const shouldSwipe = Math.abs(translateX.value) > SWIPE_THRESHOLD || 
                         Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipe) {
        const direction = translateX.value > 0 ? 'right' : 'left';
        const exitVelocity = Math.abs(velocityX) > 1000 ? velocityX : 
                            (direction === 'right' ? 1000 : -1000);
        
        translateX.value = withTiming(
          exitVelocity > 0 ? screenWidth * 1.5 : -screenWidth * 1.5,
          { duration: 200 },
          () => {
            if (direction === 'left') {
              goToNext();
            } else {
              goToPrevious();
            }
            translateX.value = 0;
            translateY.value = 0;
          }
        );
      } else {
        resetPosition();
      }
    },
  });

  // Create animated styles for each card
  const getCardAnimatedStyle = useCallback((index: number) => {
    return useAnimatedStyle(() => {
      const isTop = index === 0;
      const opacity = interpolate(
        Math.abs(translateX.value),
        [0, screenWidth * 0.5, screenWidth],
        [1, isTop ? 0.5 : 1, isTop ? 0 : 1],
        Extrapolate.CLAMP
      );

      const scale = interpolate(
        Math.abs(translateX.value),
        [0, screenWidth],
        [
          index === 0 ? 1 : index === 1 ? SCALE_DOWN_NEXT : SCALE_DOWN_DISTANT,
          index === 0 ? 0.95 : index === 1 ? 1 : SCALE_DOWN_NEXT
        ],
        Extrapolate.CLAMP
      );

      const translateXValue = isTop ? translateX.value : 0;
      const translateYValue = isTop ? translateY.value : 0;
      
      const rotate = isTop
        ? `${interpolate(
            translateX.value,
            [-screenWidth, 0, screenWidth],
            [-ROTATION_MULTIPLIER, 0, ROTATION_MULTIPLIER],
            Extrapolate.CLAMP
          )}deg`
        : '0deg';

      // Stack cards with slight offset
      const stackOffset = interpolate(
        Math.abs(translateX.value),
        [0, screenWidth * 0.5],
        [index * 10, 0],
        Extrapolate.CLAMP
      );

      return {
        opacity,
        transform: [
          { translateX: translateXValue },
          { translateY: translateYValue + stackOffset },
          { scale },
          { rotate },
        ],
      };
    });
  }, [screenWidth, translateX, translateY]);

  if (games.length === 0) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {cardsToRender.reverse().map((cardData, index) => {
        const reversedIndex = cardsToRender.length - 1 - index;
        const animatedStyle = getCardAnimatedStyle(reversedIndex);
        const isTop = reversedIndex === 0;

        return (
          <Animated.View
            key={`card-${cardData.game.id}`}
            style={[styles.card, animatedStyle]}
          >
            {isTop ? (
              <PanGestureHandler
                onGestureEvent={gestureHandler}
                enabled={!disabled}
              >
                <Animated.View style={StyleSheet.absoluteFillObject}>
                  <MemoizedGameCard
                    game={cardData.game}
                    onPlayTrial={onPlayTrial}
                    onLike={onLike ? () => onLike(cardData.game) : undefined}
                    onShare={onShare ? () => onShare(cardData.game) : undefined}
                    onBookmark={onBookmark ? () => onBookmark(cardData.game) : undefined}
                    isLiked={likes.has(cardData.game.id)}
                    isBookmarked={bookmarks.has(cardData.game.id)}
                    disabled={disabled}
                    isCurrentCard={true}
                    showNextCardShadow={false}
                  />
                </Animated.View>
              </PanGestureHandler>
            ) : (
              <MemoizedGameCard
                game={cardData.game}
                onPlayTrial={onPlayTrial}
                onLike={undefined}
                onShare={undefined}
                onBookmark={undefined}
                isLiked={likes.has(cardData.game.id)}
                isBookmarked={bookmarks.has(cardData.game.id)}
                disabled={true}
                isCurrentCard={false}
                showNextCardShadow={!isPortrait && reversedIndex === 1}
              />
            )}
          </Animated.View>
        );
      })}
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