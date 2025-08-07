import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: number; // percentage
  isNew: boolean;
  unlockedAt: Date;
  points: number;
}

interface AchievementsShowcaseProps {
  achievements: Achievement[];
  totalPoints: number;
  globalRank: number;
  completionPercentage: number;
  onViewAll?: () => void;
}

export const AchievementsShowcase: React.FC<AchievementsShowcaseProps> = ({
  achievements,
  totalPoints,
  globalRank,
  completionPercentage,
  onViewAll,
}) => {
  const haptics = useHaptics();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnims = useRef(achievements.slice(0, 3).map(() => new Animated.Value(0.8))).current;
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isCompactView = screenWidth < 375;
  const isPortrait = screenHeight > screenWidth;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        ...SPRING_CONFIGS.SOFT,
        toValue: 0,
        useNativeDriver: true,
      }),
      ...scaleAnims.map((anim, index) =>
        Animated.spring(anim, {
          ...SPRING_CONFIGS.BOUNCY,
          toValue: 1,
          delay: index * 100,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const handleViewAll = () => {
    haptics.impact('light');
    if (onViewAll) onViewAll();
  };

  const getRarityColor = (rarity: number) => {
    if (rarity <= 5) return '#FF0066'; // Ultra Rare
    if (rarity <= 10) return '#FFD700'; // Legendary
    if (rarity <= 25) return '#8866FF'; // Epic
    if (rarity <= 50) return '#00FFFF'; // Rare
    return '#00FF88'; // Common
  };

  const getRarityLabel = (rarity: number) => {
    if (rarity <= 5) return 'ULTRA RARE';
    if (rarity <= 10) return 'LEGENDARY';
    if (rarity <= 25) return 'EPIC';
    if (rarity <= 50) return 'RARE';
    return 'COMMON';
  };

  // Sort achievements by rarity (rarest first) and new status
  const topAchievements = [...achievements]
    .sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return a.rarity - b.rarity;
    })
    .slice(0, 3);

  return (
    <Animated.View
      style={[
        styles.container,
        isPortrait && styles.containerPortrait,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
        <Pressable onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>VIEW ALL</Text>
          <Ionicons name="chevron-forward" size={16} color="#00FFFF" />
        </Pressable>
      </View>

      {/* Stats Bar - Responsive Layout */}
      <LinearGradient
        colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
        style={[styles.statsBar, isCompactView && styles.statsBarCompact, isPortrait && styles.statsBarPortrait]}
      >
        <View style={[styles.statItem, isCompactView && styles.statItemCompact]}>
          <Text style={[styles.statValue, isCompactView && styles.statValueCompact]}>{totalPoints.toLocaleString()}</Text>
          <Text style={[styles.statLabel, isCompactView && styles.statLabelCompact]}>POINTS</Text>
        </View>

        <View style={styles.divider} />

        <View style={[styles.statItem, isCompactView && styles.statItemCompact]}>
          <Text style={[styles.statValue, isCompactView && styles.statValueCompact]}>#{globalRank.toLocaleString()}</Text>
          <Text style={[styles.statLabel, isCompactView && styles.statLabelCompact]}>RANK</Text>
        </View>

        <View style={styles.divider} />

        <View style={[styles.statItem, isCompactView && styles.statItemCompact]}>
          <Text style={[styles.statValue, isCompactView && styles.statValueCompact]}>{completionPercentage}%</Text>
          <Text style={[styles.statLabel, isCompactView && styles.statLabelCompact]}>DONE</Text>
        </View>
      </LinearGradient>

      {/* Top Achievements */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsScroll}
      >
        {topAchievements.map((achievement, index) => (
          <Animated.View
            key={achievement.id}
            style={[
              styles.achievementCard,
              {
                transform: [{ scale: scaleAnims[index] }],
              },
            ]}
          >
            <LinearGradient
              colors={[
                getRarityColor(achievement.rarity) + '20',
                getRarityColor(achievement.rarity) + '10',
              ]}
              style={styles.cardGradient}
            >
              {/* New Badge */}
              {achievement.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}

              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getRarityColor(achievement.rarity) + '30' },
                ]}
              >
                <Ionicons
                  name={achievement.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={getRarityColor(achievement.rarity)}
                />
              </View>

              {/* Info */}
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementDescription} numberOfLines={2}>
                {achievement.description}
              </Text>

              {/* Rarity */}
              <View style={styles.rarityContainer}>
                <View
                  style={[
                    styles.rarityBadge,
                    { backgroundColor: getRarityColor(achievement.rarity) },
                  ]}
                >
                  <Text style={styles.rarityPercent}>{achievement.rarity}%</Text>
                </View>
                <Text style={[styles.rarityLabel, { color: getRarityColor(achievement.rarity) }]}>
                  {getRarityLabel(achievement.rarity)}
                </Text>
              </View>

              {/* Points */}
              <View style={styles.pointsContainer}>
                <Ionicons name="trophy" size={14} color="#FFD700" />
                <Text style={styles.pointsText}>+{achievement.points} pts</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        ))}

        {/* More Card */}
        <Pressable style={[styles.moreCard, isPortrait && styles.moreCardPortrait]} onPress={handleViewAll}>
          <LinearGradient
            colors={['rgba(0,255,255,0.1)', 'rgba(0,255,255,0.05)']}
            style={[styles.cardGradient, styles.moreCardGradient, isPortrait && styles.moreCardGradientPortrait]}
          >
            <Ionicons name="grid" size={isPortrait ? 28 : 32} color="#00FFFF" />
            <Text style={[styles.moreText, isPortrait && styles.moreTextPortrait]}>{achievements.length - 3} MORE</Text>
            <Text style={[styles.moreSubtext, isPortrait && styles.moreSubtextPortrait]}>ACHIEVEMENTS</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 3,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },
  achievementsScroll: {
    paddingHorizontal: 20,
    paddingRight: 100,
  },
  achievementCard: {
    width: 140,
    marginRight: 12,
  },
  cardGradient: {
    borderRadius: 3,
    padding: 12,
    height: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    justifyContent: 'space-between',
  },
  newBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFF00',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    zIndex: 1,
  },
  newBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'center',
  },
  achievementName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 16,
  },
  achievementDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    lineHeight: 14,
    flex: 1,
    marginBottom: 4,
  },
  rarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 6,
  },
  rarityPercent: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
  },
  rarityLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pointsText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  moreCard: {
    width: 100,
  },
  moreCardPortrait: {
    width: 120,
  },
  moreCardGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCardGradientPortrait: {
    padding: 16,
    height: 180,
  },
  moreText: {
    color: '#00FFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  moreTextPortrait: {
    fontSize: 18,
    marginTop: 6,
  },
  moreSubtext: {
    color: 'rgba(0,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  moreSubtextPortrait: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  // Compact styles for small screens
  statsBarCompact: {
    padding: 10,
    marginBottom: 12,
  },
  statItemCompact: {
    flex: 1,
  },
  statValueCompact: {
    fontSize: 14,
  },
  statLabelCompact: {
    fontSize: 8,
  },
  // Portrait mode specific styles
  containerPortrait: {
    paddingVertical: 8,
  },
  statsBarPortrait: {
    marginHorizontal: 12,
    padding: 8,
    marginBottom: 10,
  },
});
