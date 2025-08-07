import type { Game } from './../src/types/api.types';
import React, { useRef } from 'react';
import { View, TouchableOpacity, Animated, Pressable, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LikeButton } from './LikeButton';
import { RatingStars } from './RatingStars';
import { useHaptics, useSpringAnimation } from '../hooks';
import { SPRING_CONFIG, DURATIONS, SCALE_VALUES } from '../constants/animations';
interface IconStackProps {
  game: Game;
  isLiked: boolean;
  isBookmarked: boolean;
  rating: number;
  onLike: () => void;
  onBookmark: () => void;
  onRate: (rating: number) => void;
  onComment: () => void;
  showComments: boolean;
  commentIconRef: React.RefObject<View>;
  onShareError?: (error: Error) => void;
}

export const IconStack: React.FC<IconStackProps> = ({
  game,
  isLiked,
  isBookmarked,
  rating,
  onLike,
  onBookmark,
  onRate,
  onComment,
  showComments,
  commentIconRef,
  onShareError,
}) => {
  const haptics = useHaptics();
  const bookmarkAnimation = useSpringAnimation(1);
  const bookmarkGlow = useRef(new Animated.Value(0)).current;
  const commentAnimation = useSpringAnimation(1);
  const commentGlow = useRef(new Animated.Value(0)).current;

  const handleBookmarkPress = async () => {
    await haptics.buttonPress();

    if (!isBookmarked) {
      // Animate to saved state
      Animated.parallel([
        bookmarkAnimation.scaleBounce({ scale: SCALE_VALUES.HOVER }),
        Animated.timing(bookmarkGlow, {
          toValue: 1,
          duration: DURATIONS.NORMAL,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate to unsaved state
      Animated.parallel([
        Animated.spring(bookmarkAnimation.animatedValue, {
          toValue: SCALE_VALUES.PRESSED,
          ...SPRING_CONFIG.BOUNCY,
          useNativeDriver: true,
        }),
        Animated.timing(bookmarkGlow, {
          toValue: 0,
          duration: DURATIONS.NORMAL,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(bookmarkAnimation.animatedValue, {
          toValue: 1,
          ...SPRING_CONFIG.BOUNCY,
          useNativeDriver: true,
        }).start();
      });
    }

    onBookmark();
  };

  const handleCommentPress = async () => {
    await haptics.buttonPress();

    if (!showComments) {
      Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.spring(commentAnimation.animatedValue, {
              toValue: 1.25,
              ...SPRING_CONFIG.QUICK,
              useNativeDriver: true,
            }),
            Animated.timing(commentGlow, {
              toValue: 1,
              duration: DURATIONS.FAST,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(commentAnimation.animatedValue, {
            toValue: SCALE_VALUES.HOVER,
            ...SPRING_CONFIG.TIGHT,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.timing(commentGlow, {
        toValue: 0,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }).start();
    }

    onComment();
  };

  const handleShare = async () => {
    await haptics.buttonPress();

    try {
      await Share.share({
        message: `Check out ${game.title} on TRIOLL! 🎮`,
        title: game.title,
      });
    } catch (error) {
      if (onShareError && error instanceof Error) {
        onShareError(error as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Heart Icon Row */}
      <View style={styles.iconRow}>
        <View style={styles.iconWrapper}>
          <LikeButton isLiked={isLiked} onPress={onLike} count={game.likeCount || 0} />
        </View>
      </View>

      {/* Star Rating Row */}
      <View style={styles.iconRow}>
        <View style={styles.iconWrapper}>
          <RatingStars rating={rating} onRate={onRate} displayRating={game.rating || 0} />
        </View>
      </View>

      {/* Comment Icon Row */}
      <View style={styles.iconRow}>
        <View style={styles.iconWrapper} ref={commentIconRef} collapsable={false}>
          <Pressable onPress={handleCommentPress} style={styles.iconButton}>
            <Animated.View
              style={{
                transform: [{ scale: commentAnimation.animatedValue }],
                shadowColor: '#00FFFF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: commentGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.7],
                }),
                shadowRadius: commentGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 6],
                }),
              }}
            >
              <Ionicons
                name="chatbubble-outline"
                size={28}
                color={showComments ? '#00FFFF' : '#FFFFFF'}
              />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Bookmark Icon Row */}
      <View style={styles.iconRow}>
        <View style={styles.iconWrapper}>
          <Pressable onPress={handleBookmarkPress} style={styles.iconButton}>
            <Animated.View
              style={{
                transform: [{ scale: bookmarkAnimation.animatedValue }],
                shadowColor: '#00FF9F',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: bookmarkGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.7],
                }),
                shadowRadius: bookmarkGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 6],
                }),
              }}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline' as any}
                size={28}
                color={isBookmarked ? '#00FF9F' : '#FFFFFF'}
              />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Share Icon Row */}
      <View style={styles.iconRow}>
        <View style={styles.iconWrapper}>
          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    gap: 4,
  },
  iconRow: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
