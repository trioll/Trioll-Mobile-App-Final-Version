import type { Game } from '../types';

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder, Dimensions, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

import { TriollPlayButton } from './TriollPlayButton';
import { SafeImage, DEFAULT_GAME_IMAGE } from './base/SafeImage';
import { DURATIONS, SPRING_CONFIGS } from '../constants/animations';
import { useHaptics } from '../hooks/useHaptics';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('GameCard');

interface GameCardProps {
  game: Game;
  onPlayTrial: (game: Game) => void;
  onLike?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  playButtonRef?: React.RefObject<View>;
  disabled?: boolean;
  showEngagementIndicators?: boolean;
  renderCustomContent?: () => React.ReactNode;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = -50;

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onPlayTrial,
  onLike,
  onShare,
  onBookmark,
  isLiked = false,
  isBookmarked = false,
  playButtonRef,
  disabled = false,
  showEngagementIndicators = true,
  renderCustomContent,
}) => {
  const haptics = useHaptics();
  const [showPreview, setShowPreview] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // Animations
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;

  // Live data animations
  const liveCountAnim = useRef(new Animated.Value(1)).current;

  // Long press timer
  const longPressTimer = useRef<number | null>(null);

  // Mock live data updates
  useEffect(() => {
    if (!showEngagementIndicators) return;

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(liveCountAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(liveCountAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 5000);

    return () => clearInterval(interval);
  }, [showEngagementIndicators]);

  const handlePressIn = () => {
    if (disabled) return;

    // Start scale down animation
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();

    // Start long press timer
    longPressTimer.current = window.setTimeout(() => {
      haptics.impact('heavy');
      setShowPreview(true);

      // Animate preview in
      Animated.timing(previewOpacity, {
        toValue: 1,
        duration: DURATIONS.FAST,
        useNativeDriver: true,
      }).start();
    }, 500);
  };

  const handlePressOut = () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    // Restore scale
    Animated.spring(scaleAnim, {
      ...SPRING_CONFIGS.QUICK,
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Hide preview if shown
    if (showPreview) {
      Animated.timing(previewOpacity, {
        toValue: 0,
        duration: DURATIONS.FAST,
        useNativeDriver: true,
      }).start(() => {
        setShowPreview(false);
      });
    }
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap && now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap - like
      handleDoubleTap();
    }
    setLastTap(now);
  };

  const handleDoubleTap = () => {
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
          toValue: 1,
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
          duration: 500,
          delay: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < SWIPE_THRESHOLD && gestureState.vy < -0.5) {
          // Swipe up - toggle between details and share
          if (!showDetails) {
            // Show details
            setShowDetails(true);
            Animated.spring(translateY, {
              toValue: -200,
              useNativeDriver: true,
            }).start();
          } else if (onShare) {
            // Share if already showing details
            haptics.impact('light');
            handleShare();
            // Return to original position
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            setShowDetails(false);
          }
        } else {
          // Return to original position
          setShowDetails(false);
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleShare = async () => {
    if (onShare) {
      onShare();
    } else {
      try {
        await Sharing.shareAsync('https://trioll.com/game/' + game.id, {
          dialogTitle: `Check out ${game.title} on TRIOLL!`,
        });
      } catch {
        logger.error('Share error:', error);
      }
    }
  };

  const playerCount = Math.floor(Math.random() * 500) + 50;

  const renderDefaultContent = () => (
    <>
      {/* Background Image */}
      <SafeImage
        source={{ uri: game.thumbnailUrl }}
        fallbackSource={DEFAULT_GAME_IMAGE}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        blurRadius={20}
      />

      {/* Dark Overlay */}
      <View style={styles.darkOverlay} />

      {/* Play Button */}
      <View ref={playButtonRef} style={styles.playButtonContainer}>
        <TriollPlayButton
          onPress={() => !disabled && onPlayTrial(game)}
          gameGenre={game.genre || 'default'}
          size={120}
        />
      </View>

      {/* Game Info */}
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle}>{game.title}</Text>
        <Text style={styles.gameDeveloper}>{game.developer}</Text>

        {/* Swipe Indicator */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            {
              opacity: translateY.interpolate({
                inputRange: [-200, 0],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <Ionicons name="chevron-up" size={20} color="rgba(255,255,255,0.5)" />
          <Text style={styles.swipeText}>Swipe up for details</Text>
        </Animated.View>
      </View>

      {/* Developer Details (shown on swipe up) */}
      <Animated.View
        style={[
          styles.developerDetails,
          {
            opacity: translateY.interpolate({
              inputRange: [-200, 0],
              outputRange: [1, 0],
            }),
            transform: [
              {
                translateY: translateY.interpolate({
                  inputRange: [-200, 0],
                  outputRange: [0, 100],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.detailsGradient}>
          <View style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Ionicons name="game-controller" size={20} color="#6366f1" />
              <Text style={styles.detailLabel}>Genre</Text>
              <Text style={styles.detailValue}>{game.genre}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color="#6366f1" />
              <Text style={styles.detailLabel}>Trial</Text>
              <Text style={styles.detailValue}>0 min</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color="#6366f1" />
              <Text style={styles.detailLabel}>Released</Text>
              <Text style={styles.detailValue}>
                {new Date(game.releaseDate).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="star" size={20} color="#6366f1" />
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>{game.rating}/5</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </>
  );

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
          {
            transform: [{ scale: scaleAnim }, { translateY }],
          },
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled}
          style={styles.touchable}
        >
          {/* Main content */}
          {renderCustomContent ? renderCustomContent() : renderDefaultContent()}

          {/* Live engagement indicators */}
          {showEngagementIndicators && (
            <View style={styles.liveIndicators}>
              {game.isTrending && (
                <View style={styles.trendingBadge}>
                  <Text style={styles.trendingText}>🔥 TRENDING</Text>
                </View>
              )}

              {game.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>🆕 NEW</Text>
                </View>
              )}

              <Animated.View
                style={[
                  styles.liveCount,
                  {
                    transform: [{ scale: liveCountAnim }],
                  },
                ]}
              >
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{playerCount} playing now</Text>
              </Animated.View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {onLike && (
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  haptics.impact('light');
                  onLike();
                }}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline' as any}
                  size={24}
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
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline' as any}
                  size={24}
                  color={isBookmarked ? '#6366f1' : '#FFFFFF'}
                />
              </Pressable>
            )}

            {onShare && (
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  haptics.impact('light');
                  handleShare();
                }}
              >
                <Ionicons name="share-outline" size={24} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {/* Double tap like indicator */}
          <Animated.View
            style={[
              styles.doubleTapHeart,
              {
                opacity: likeOpacity,
                transform: [{ scale: likeScale }],
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons name="heart" size={80} color="#FF2D55" />
          </Animated.View>

          {/* Swipe up indicator */}
          {showDetails && onShare && (
            <View style={styles.shareIndicator}>
              <Ionicons name="share-outline" size={32} color="#FFFFFF" />
              <Text style={styles.swipeText}>Swipe up again to share</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      {/* Long press preview modal */}
      <Modal
        visible={showPreview}
        transparent
        animationType="none"
        onRequestClose={() => setShowPreview(false)}
      >
        <Pressable style={styles.previewContainer} onPress={() => setShowPreview(false)}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />

          <Animated.View
            style={[
              styles.previewContent,
              {
                width: SCREEN_WIDTH * 0.9,
                maxHeight: SCREEN_HEIGHT * 0.7,
                opacity: previewOpacity,
                transform: [
                  {
                    scale: previewOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <SafeImage
              source={{ uri: game.coverImageUrl || game.thumbnailUrl }}
              fallbackSource={DEFAULT_GAME_IMAGE}
              style={styles.previewImage}
              resizeMode="cover"
            />

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.previewGradient}
            />

            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>{game.title}</Text>
              <Text style={styles.previewDescription} numberOfLines={3}>
                {game.description}
              </Text>

              <View style={styles.previewStats}>
                <View style={styles.stat}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.statText}>{game.rating}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="time-outline" size={16} color="#00FF88" />
                  <Text style={styles.statText}>0min trial</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="people-outline" size={16} color="#00FFFF" />
                  <Text style={styles.statText}>{playerCount} playing</Text>
                </View>
              </View>

              <Pressable
                style={styles.previewPlayButton}
                onPress={() => {
                  setShowPreview(false);
                  onPlayTrial(game);
                }}
              >
                <Text style={styles.previewPlayText}>PLAY TRIAL</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  touchable: {
    flex: 1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  playButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -60,
    marginTop: -60,
  },
  gameInfo: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  gameTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  gameDeveloper: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
  },
  swipeIndicator: {
    alignItems: 'center',
    marginTop: 10,
  },
  swipeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  developerDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  detailsGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  detailsContent: {
    paddingHorizontal: 40,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 12,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  liveIndicators: {
    position: 'absolute',
    top: 40,
    left: 24,
    right: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingBadge: {
    backgroundColor: '#FF0066',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 3,
    shadowColor: '#FF0066',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  trendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  newBadge: {
    backgroundColor: '#FFFF00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 3,
    shadowColor: '#FFFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  newText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  liveCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF88',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    flexDirection: 'column',
    gap: 16,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
  },
  shareIndicator: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    backgroundColor: '#000000',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  previewImage: {
    width: '100%',
    height: 300,
  },
  previewGradient: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    height: 100,
  },
  previewInfo: {
    padding: 24,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  previewDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  previewPlayButton: {
    backgroundColor: '#FF2D55',
    paddingVertical: 16,
    borderRadius: 3,
    alignItems: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  previewPlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
