
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface ComparisonStat {
  label: string;
  userValue: number;
  otherValue: number;
  unit?: string;
  higherIsBetter?: boolean;
}

interface ComparativeStatsProps {
  otherUsername: string;
  stats: ComparisonStat[];
  mutualGames: number;
  onChallenge?: () => void;
}

export const ComparativeStats: React.FC<ComparativeStatsProps> = ({
  otherUsername,
  stats,
  mutualGames,
  onChallenge,
}) => {
  const haptics = useHaptics();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef(stats.map(() => new Animated.Value(30))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in and slide animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      ...slideAnims.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: DURATIONS.NORMAL,
          delay: index * 50,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // Pulse animation for challenge button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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
  }, []);

  const handleChallenge = () => {
    haptics.impact('medium');
    if (onChallenge) onChallenge();
  };

  const getWinner = (stat: ComparisonStat) => {
    const higherIsBetter = stat.higherIsBetter !== false;
    if (stat.userValue === stat.otherValue) return 'tie';
    if (higherIsBetter) {
      return stat.userValue > stat.otherValue ? 'user' : 'other';
    }
    return stat.userValue < stat.otherValue ? 'user' : 'other';
  };

  const getBarWidth = (value: number, otherValue: number) => {
    const max = Math.max(value, otherValue);
    if (max === 0) return 0;
    return value / max;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>HEAD TO HEAD</Text>

      {/* Players Header */}
      <View style={styles.playersHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel}>YOU</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>
              {stats.filter(s => getWinner(s) === 'user').length}
            </Text>
          </View>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
          {mutualGames > 0 && <Text style={styles.mutualGames}>{mutualGames} mutual games</Text>}
        </View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel}>{otherUsername.toUpperCase()}</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>
              {stats.filter(s => getWinner(s) === 'other').length}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Comparison */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => {
          const winner = getWinner(stat);

          return (
            <Animated.View
              key={stat.label}
              style={[
                styles.statRow,
                {
                  transform: [{ translateX: slideAnims[index] }],
                },
              ]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>

              <View style={styles.barsContainer}>
                {/* User Bar */}
                <View style={styles.barWrapper}>
                  <View style={styles.barBackground}>
                    <Animated.View
                      style={[
                        styles.barFill,
                        {
                          transform: [{ scaleX: getBarWidth(stat.userValue, stat.otherValue) }],
                          backgroundColor: winner === 'user' ? '#00FF88' : 'rgba(255,255,255,0.3)',
                        } as unknown,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barValue, winner === 'user' && styles.winnerValue]}>
                    {stat.userValue}
                    {stat.unit || ''}
                  </Text>
                  {winner === 'user' && (
                    <Ionicons name="trophy" size={16} color="#00FF88" style={styles.trophy} />
                  )}
                </View>

                {/* Other User Bar */}
                <View style={styles.barWrapper}>
                  <View style={styles.barBackground}>
                    <Animated.View
                      style={[
                        styles.barFill,
                        {
                          transform: [{ scaleX: getBarWidth(stat.otherValue, stat.userValue) }],
                          backgroundColor: winner === 'other' ? '#FF2D55' : 'rgba(255,255,255,0.3)',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barValue, winner === 'other' && styles.winnerValue]}>
                    {stat.otherValue}
                    {stat.unit || ''}
                  </Text>
                  {winner === 'other' && (
                    <Ionicons name="trophy" size={16} color="#FF2D55" style={styles.trophy} />
                  )}
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Challenge Button */}
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Pressable onPress={handleChallenge} style={styles.challengeButton}>
          <LinearGradient
            colors={['#FF0066', '#FF2D55']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.challengeGradient}
          >
            <Ionicons name="game-controller" size={24} color="#FFFFFF" />
            <Text style={styles.challengeText}>CHALLENGE TO DUEL</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20,
  },
  playersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  playerInfo: {
    alignItems: 'center',
  },
  playerLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  vsContainer: {
    alignItems: 'center',
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  mutualGames: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statRow: {
    marginBottom: 20,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    position: 'relative',
  },
  barBackground: {
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    width: '100%',
    borderRadius: 12,
    transformOrigin: 'left',
  },
  barValue: {
    position: 'absolute',
    right: 8,
    top: 2,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  winnerValue: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  trophy: {
    position: 'absolute',
    left: 8,
    top: 4,
  },
  challengeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  challengeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  challengeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
