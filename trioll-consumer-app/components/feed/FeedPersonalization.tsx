import type { Game } from './../../src/types/api.types';
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface TimeBasedGreetingProps {
  userName?: string;
}

export const TimeBasedGreeting: React.FC<TimeBasedGreetingProps> = ({ userName }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.RELAXED,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const getEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 17) return '🌤';
    if (hour < 21) return '🌅';
    return '🌙';
  };

  return (
    <Animated.View style={[styles.greetingContainer, { opacity: fadeAnim }]}>
      <Text style={styles.greeting}>
        {getGreeting()}
        {userName ? `, ${userName}` : ''}! {getEmoji()}
      </Text>
      <Text style={styles.subGreeting}>Ready to discover new games?</Text>
    </Animated.View>
  );
};

interface ContinuePlayingProps {
  games: Game[];
  onGamePress: (game: Game) => void;
}

export const ContinuePlaying: React.FC<ContinuePlayingProps> = ({ games, onGamePress }) => {
  const haptics = useHaptics();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (games.length === 0) return null;

  const handlePress = (game: Game) => {
    haptics.impact('light');

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        ...SPRING_CONFIGS.QUICK,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onGamePress(game);
    });
  };

  return (
    <View style={styles.continueContainer}>
      <View style={styles.continueHeader}>
        <Ionicons name="play-circle" size={24} color="#00FF88" />
        <Text style={styles.continueTitle}>Continue Playing</Text>
      </View>

      {games.slice(0, 3).map(game => (
        <Pressable key={game.id} onPress={() => handlePress(game)} style={styles.continueItem}>
          <Animated.View style={[styles.continueContent, { transform: [{ scale: scaleAnim }] }]}>
            <Image source={{ uri: game.coverImageUrl }} style={styles.continueThumbnail} />
            <View style={styles.continueInfo}>
              <Text style={styles.continueGameTitle}>{game.title}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.random() * 60 + 20}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {Math.floor(Math.random() * 3 + 1)} min left in trial
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#00FF88" />
          </Animated.View>
        </Pressable>
      ))}
    </View>
  );
};

interface DailyFeaturedProps {
  game: Game;
  onPlayPress: () => void;
}

export const DailyFeatured: React.FC<DailyFeaturedProps> = ({ game, onPlayPress }) => {
  const haptics = useHaptics();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        ...SPRING_CONFIGS.SOFT,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ),
    ]).start();
  }, []);

  const handlePress = () => {
    haptics.impact('medium');
    onPlayPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.featuredContainer}>
      <Animated.View
        style={[
          styles.featuredContent,
          {
            transform: [{ scale: scaleAnim }],
            shadowOpacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
          },
        ]}
      >
        <Image source={{ uri: game.coverImageUrl }} style={styles.featuredImage} />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.featuredGradient}
        />

        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.featuredBadgeText}>FEATURED TODAY</Text>
        </View>

        <View style={styles.featuredInfo}>
          <Text style={styles.featuredTitle}>{game.title}</Text>
          <Text style={styles.featuredDescription} numberOfLines={2}>
            {game.description}
          </Text>

          <View style={styles.featuredStats}>
            <View style={styles.featuredStat}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.featuredStatText}>{game.rating}</Text>
            </View>
            <View style={styles.featuredStat}>
              <Ionicons name="flame" size={16} color="#FF0066" />
              <Text style={styles.featuredStatText}>Trending #1</Text>
            </View>
          </View>

          <LinearGradient colors={['#FF2D55', '#FF0066']} style={styles.featuredPlayButton}>
            <Text style={styles.featuredPlayText}>PLAY NOW</Text>
            <Ionicons name="play" size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </Animated.View>
    </Pressable>
  );
};

interface AchievementNudgeProps {
  achievement: {
    title: string;
    progress: number;
    total: number;
    reward: string;
  };
}

export const AchievementNudge: React.FC<AchievementNudgeProps> = ({ achievement }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        ...SPRING_CONFIGS.BOUNCY,
        toValue: 0,
        delay: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        delay: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 5 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: DURATIONS.NORMAL,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: DURATIONS.NORMAL,
          useNativeDriver: true,
        }),
      ]).start();
    }, 5000);
  }, []);

  const progressPercentage = (achievement.progress / achievement.total) * 100;

  return (
    <Animated.View
      style={[
        styles.achievementContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.achievementContent}>
        <Ionicons name="trophy" size={24} color="#FFD700" />
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementTitle}>{achievement.title}</Text>
          <View style={styles.achievementProgress}>
            <View style={styles.achievementProgressBar}>
              <View style={[styles.achievementProgressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.achievementProgressText}>
              {achievement.progress}/{achievement.total}
            </Text>
          </View>
          <Text style={styles.achievementReward}>🎁 {achievement.reward}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  greetingContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subGreeting: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  continueContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  continueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  continueTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  continueItem: {
    marginBottom: 12,
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  continueInfo: {
    flex: 1,
  },
  continueGameTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  featuredContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  featuredContent: {
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 20,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featuredBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  featuredInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuredDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  featuredStats: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featuredStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  featuredStatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuredPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  featuredPlayText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginRight: 8,
  },
  achievementContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  achievementTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  achievementProgressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  achievementReward: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
});
