import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface LevelXPSystemProps {
  level: number;
  levelTitle: string;
  currentXP: number;
  nextLevelXP: number;
  nextLevelRewards: {
    title: string;
    description: string;
    icon: string;
  }[];
  onViewHistory?: () => void;
}

export const LevelXPSystem: React.FC<LevelXPSystemProps> = ({
  level,
  levelTitle,
  currentXP,
  nextLevelXP,
  nextLevelRewards,
  onViewHistory,
}) => {
  const haptics = useHaptics();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const progressPercentage = (currentXP / nextLevelXP) * 100;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        ...SPRING_CONFIGS.SOFT,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progressPercentage,
        duration: DURATIONS.RELAXED,
        delay: 300,
        useNativeDriver: false,
      }),
    ]).start();

    // Pulse animation for level badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [progressPercentage]);

  const handleViewHistory = () => {
    haptics.impact('light');
    if (onViewHistory) onViewHistory();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(255,45,85,0.1)', 'rgba(255,0,102,0.05)']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.levelInfo}>
            <Animated.View
              style={[
                styles.levelBadge,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={styles.levelNumber}>{level}</Text>
            </Animated.View>
            <View style={styles.titleContainer}>
              <Text style={styles.levelTitle}>{levelTitle}</Text>
              <Text style={styles.levelLabel}>LEVEL {level}</Text>
            </View>
          </View>

          <Pressable onPress={handleViewHistory} style={styles.historyButton}>
            <Text style={styles.historyText}>VIEW HISTORY</Text>
            <Ionicons name="chevron-forward" size={16} color="#00FFFF" />
          </Pressable>
        </View>

        {/* XP Progress */}
        <View style={styles.progressSection}>
          <View style={styles.xpInfo}>
            <Text style={styles.currentXP}>{currentXP.toLocaleString()}</Text>
            <Text style={styles.xpSeparator}>/</Text>
            <Text style={styles.nextLevelXP}>{nextLevelXP.toLocaleString()} XP</Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  colors={['#FF2D55', '#FF0066']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                />
              </Animated.View>

              {/* Progress Glow */}
              <Animated.View
                style={[
                  styles.progressGlow,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          <Text style={styles.progressText}>
            {Math.round(progressPercentage)}% to Level {level + 1}
          </Text>
        </View>

        {/* Next Level Rewards */}
        <View style={styles.rewardsSection}>
          <Text style={styles.rewardsTitle}>NEXT LEVEL REWARDS</Text>

          <View style={styles.rewardsList}>
            {nextLevelRewards.map((reward, index) => (
              <View key={index} style={styles.rewardItem}>
                <View style={styles.rewardIcon}>
                  <Ionicons
                    name={reward.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color="#FFD700"
                  />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 12,
  },
  gradient: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  titleContainer: {
    marginLeft: 16,
  },
  levelTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  levelLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  historyText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  progressSection: {
    marginBottom: 20,
  },
  xpInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currentXP: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  xpSeparator: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    marginHorizontal: 4,
  },
  nextLevelXP: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressGradient: {
    flex: 1,
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: 'transparent',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  progressText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  rewardsSection: {
    marginTop: 8,
  },
  rewardsTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  rewardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  rewardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  rewardDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
  },
});
