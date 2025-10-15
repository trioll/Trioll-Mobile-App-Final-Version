import type { Game } from '../types';
import React, { useRef, useCallback, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Pressable,
  useWindowDimensions,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './base';
import { SafeImage, DEFAULT_GAME_IMAGE } from './base/SafeImage';
import { TriollPlayButton } from './TriollPlayButton';
import { SPRING_CONFIGS } from '../constants/animations';
import { useHaptics, useOrientation } from '../hooks';
import { useOrientationTransition } from '../hooks/useOrientationTransition';

const PORTRAIT_IMAGE_ASPECT_RATIO = 16 / 9;
const LANDSCAPE_SHADOW_OFFSET = 20;

interface OrientationAwareGameCardProps {
  game: Game;
  onPlayTrial: (game: Game) => void;
  onLike?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
  onRate?: (rating: number) => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  disabled?: boolean;
  isCurrentCard?: boolean;
  showNextCardShadow?: boolean;
  likeCount?: number;
  commentCount?: number;
  currentRating?: number;
}

export const OrientationAwareGameCard: React.FC<OrientationAwareGameCardProps> = ({
  game,
  onPlayTrial,
  onLike,
  onShare,
  onBookmark,
  onComment,
  onRate,
  isLiked = false,
  isBookmarked = false,
  disabled = false,
  isCurrentCard = true,
  showNextCardShadow = false,
  likeCount = 0,
  commentCount = 0,
  currentRating = 0,
}) => {
  const { width: screenWidth, height: screenHeight } = useOrientation();
  const _windowDimensions = useWindowDimensions();
  const _insets = useSafeAreaInsets();
  const haptics = useHaptics();
  
  // Debug logging for thumbnails
  React.useEffect(() => {
    if (game.id.includes('-v')) {
      console.log('[OrientationAwareGameCard] Game data:', {
        id: game.id,
        title: game.title,
        thumbnailUrl: game.thumbnailUrl,
        coverImageUrl: game.coverImageUrl,
        imageSource: game.coverImageUrl || game.thumbnailUrl
      });
    }
  }, [game]);
  
  const { isPortrait } = useOrientationTransition({
    duration: 300,
    enableLayoutAnimation: true,
  });

  // Animation values
  const likeScale = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Double tap tracking
  const _lastTapRef = useRef<number>(0);
  
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [tempRating, setTempRating] = useState(currentRating);
  const [userRating, setUserRating] = useState(0); // Track user's submitted rating

  // Calculate dimensions based on orientation
  const _imageHeight = isPortrait 
    ? screenWidth / PORTRAIT_IMAGE_ASPECT_RATIO 
    : screenHeight;

  const _handleDoubleTap = useCallback(() => {
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

  const animateButtonPress = (callback: () => void) => {
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.9,
        ...SPRING_CONFIGS.QUICK,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        ...SPRING_CONFIGS.BOUNCY,
        useNativeDriver: true,
      }),
    ]).start();
    haptics.impact('light');
    callback();
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderRatingModal = () => (
    <Modal
      visible={showRatingModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRatingModal(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setShowRatingModal(false)}
      >
        <Pressable style={[styles.ratingModal, !isPortrait && styles.ratingModalLandscape]}>
          <Text style={styles.ratingTitle}>Rate this game</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => {
                  setTempRating(star);
                  haptics.impact('light');
                }}
                style={styles.starButton}
              >
                <MaterialIcons
                  name={star <= tempRating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= tempRating ? '#FFD700' : '#666'}
                />
              </Pressable>
            ))}
          </View>
          <View style={styles.ratingActions}>
            <Pressable
              style={[styles.ratingButton, styles.cancelButton]}
              onPress={() => {
                setShowRatingModal(false);
                setTempRating(currentRating);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.ratingButton, styles.submitButton]}
              onPress={() => {
                if (onRate) onRate(tempRating);
                setUserRating(tempRating); // Save user's rating
                setShowRatingModal(false);
                haptics.impact('medium');
              }}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderActionButtons = () => (
    <View style={[
      styles.actionButtons,
      { 
        right: isPortrait ? 16 : Math.max(_insets.right, 16) + 30, // Add extra padding in landscape for safe area
        bottom: isPortrait ? 100 : 20, // Adjust bottom position in landscape
        top: isPortrait ? undefined : 60, // Account for top tab bar in landscape
        gap: isPortrait ? 20 : 12, // Reduce gap between buttons in landscape
      }
    ]}>
      {onLike && (
        <View style={styles.actionItem}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              style={[styles.actionButton, !isPortrait && styles.actionButtonLandscape]}
              onPress={() => animateButtonPress(onLike)}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={isPortrait ? 32 : 24}
                color={isLiked ? '#FF2D55' : '#FFFFFF'}
              />
            </Pressable>
          </Animated.View>
          <Text style={[styles.actionCount, !isPortrait && styles.actionCountLandscape]}>{formatCount(likeCount)}</Text>
        </View>
      )}
      
      {onComment && (
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionButton, !isPortrait && styles.actionButtonLandscape]}
            onPress={() => animateButtonPress(onComment)}
          >
            <Ionicons
              name="chatbubble-outline"
              size={isPortrait ? 30 : 22}
              color="#FFFFFF"
            />
          </Pressable>
          <Text style={[styles.actionCount, !isPortrait && styles.actionCountLandscape]}>{formatCount(commentCount)}</Text>
        </View>
      )}
      
      {onRate && (
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionButton, !isPortrait && styles.actionButtonLandscape]}
            onPress={() => {
              animateButtonPress(() => {
                setTempRating(userRating || 0); // Set temp rating to user's previous rating
                setShowRatingModal(true);
              });
            }}
          >
            <MaterialIcons
              name={userRating > 0 ? 'star' : currentRating > 0 ? 'star' : 'star-outline'}
              size={isPortrait ? 32 : 24}
              color={userRating > 0 ? '#FFD700' : currentRating > 0 ? '#FFD700' : '#FFFFFF'}
            />
          </Pressable>
          <Text style={[styles.actionCount, !isPortrait && styles.actionCountLandscape]}>
            {userRating > 0 ? `${userRating}★` : currentRating > 0 ? currentRating.toFixed(1) : ''}
          </Text>
        </View>
      )}
      
      {onBookmark && (
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionButton, !isPortrait && styles.actionButtonLandscape]}
            onPress={() => animateButtonPress(onBookmark)}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={isPortrait ? 30 : 22}
              color={isBookmarked ? '#6366f1' : '#FFFFFF'}
            />
          </Pressable>
        </View>
      )}
      
      {onShare && (
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionButton, !isPortrait && styles.actionButtonLandscape]}
            onPress={() => animateButtonPress(onShare)}
          >
            <Ionicons name="paper-plane-outline" size={isPortrait ? 30 : 22} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );


  return (
    <View style={styles.container}>
      {/* Game Image/Video */}
      <View
        style={styles.mediaContainer}
        pointerEvents="box-none"
      >
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <SafeImage
            source={{ uri: game.thumbnailUrl || game.coverImageUrl }}
            fallbackSource={DEFAULT_GAME_IMAGE}
            style={styles.gameImage}
            resizeMode="cover"
          />
          
          {/* Gradient overlays */}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent']}
            style={styles.topGradient}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.bottomGradient}
          />
        </View>

        {/* Play Button - Centered - Outside of Pressable to not interfere */}
        <View style={styles.playButtonWrapper} pointerEvents="box-none">
          <TriollPlayButton
            onPress={() => !disabled && onPlayTrial(game)}
            gameGenre={game.genre || 'default'}
            size={isPortrait ? 100 : 120}
          />
        </View>
      </View>

      {/* Action buttons - always vertical on right side */}
      {renderActionButtons()}
      
      {/* Rating Modal */}
      {renderRatingModal()}

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
};

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
    right: 16,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonLandscape: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  actionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionCountLandscape: {
    fontSize: 10,
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  ratingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButton: {
    backgroundColor: '#FFD700',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#000000',
    fontWeight: '700',
  },
  ratingModalLandscape: {
    maxWidth: 280,
    padding: 20,
  },
});