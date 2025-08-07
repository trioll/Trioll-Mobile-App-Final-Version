
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS } from '../../constants/animations';

interface StatsGridProps {
  stats: {
    trialsPlayed: number;
    trialsPlayedTrend: number; // percentage change
    totalTimePlayed: number; // in minutes
    trialsCompleted: number;
    completionRate: number; // percentage
    currentStreak: number;
    longestStreak: number;
    gamesLiked: number;
    averageRating: number;
  };
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array(6)
      .fill(0)
      .map(() => new Animated.Value(0.8))
  ).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();

    // Stagger scale animations
    const animations = scaleAnims.map((anim, index) =>
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 50,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${mins}m`;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return '#00FF88';
    if (trend < 0) return '#FF2D55';
    return 'rgba(255,255,255,0.6)';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return 'trending-up';
    if (trend < 0) return 'trending-down';
    return 'remove';
  };

  const statItems = [
    {
      label: 'Trials Played',
      value: stats.trialsPlayed.toString(),
      icon: 'game-controller',
      color: '#FF2D55',
      trend: stats.trialsPlayedTrend,
      showTrend: true,
    },
    {
      label: 'Time Played',
      value: formatTime(stats.totalTimePlayed),
      icon: 'time',
      color: '#00FFFF',
    },
    {
      label: 'Trials Completed',
      value: `${stats.trialsCompleted}`,
      subValue: `${stats.completionRate}% rate`,
      icon: 'checkmark-circle',
      color: '#00FF88',
    },
    {
      label: 'Day Streak',
      value: stats.currentStreak.toString(),
      subValue: `Best: ${stats.longestStreak}`,
      icon: 'flame',
      color: '#FF0066',
      showBadge: stats.currentStreak >= stats.longestStreak,
    },
    {
      label: 'Games Liked',
      value: stats.gamesLiked.toString(),
      icon: 'heart',
      color: '#FF66FF',
    },
    {
      label: 'Avg Rating',
      value: stats.averageRating.toFixed(1),
      icon: 'star',
      color: '#FFD700',
    },
  ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>GAMING STATS</Text>

      <View style={styles.grid}>
        {statItems.map((item, index) => (
          <Animated.View
            key={item.label}
            style={[
              styles.statCard,
              {
                transform: [{ scale: scaleAnims[index] }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={item.color}
                  />
                </View>

                {item.showTrend && (
                  <View style={styles.trendContainer}>
                    <Ionicons
                      name={getTrendIcon(item.trend!) as unknown as any}
                      size={16}
                      color={getTrendColor(item.trend!)}
                    />
                    <Text style={[styles.trendText, { color: getTrendColor(item.trend!) }]}>
                      {Math.abs(item.trend!)}%
                    </Text>
                  </View>
                )}

                {item.showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>🔥</Text>
                  </View>
                )}
              </View>

              <View style={styles.valueContainer}>
                <Text style={styles.value}>{item.value}</Text>
                {item.subValue && <Text style={styles.subValue}>{item.subValue}</Text>}
              </View>

              <Text style={styles.label}>{item.label}</Text>
            </LinearGradient>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  cardGradient: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 120,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF0066',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
  },
  valueContainer: {
    marginBottom: 4,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  subValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: -2,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
