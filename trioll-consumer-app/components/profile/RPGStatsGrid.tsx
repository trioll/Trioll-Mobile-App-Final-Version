import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DS } from '../../src/styles/TriollDesignSystem';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { LinearGradient } from 'expo-linear-gradient';

// RPG stat definitions with icons, colors, and calculation methods
const RPG_STATS = [
  {
    id: 'strength',
    icon: '💪',
    label: 'STRENGTH',
    getValue: (stats: any) => stats?.likesGiven || Math.round((stats?.trialsPlayed || 0) * 0.4),
    color: '#FF6B6B',
    format: (val: number) => val.toString(),
    description: 'Power gained from liking games',
  },
  {
    id: 'accuracy',
    icon: '🎯',
    label: 'ACCURACY',
    getValue: (stats: any) => stats?.hoursPlayed || Math.floor((stats?.totalTimeSpentMinutes || 0) / 60) || 0,
    color: '#C7CEEA',
    format: (val: number) => `${val}h`,
    description: 'Precision from hours played',
  },
  {
    id: 'intelligence',
    icon: '🧠',
    label: 'INTELLIGENCE',
    getValue: (stats: any) => stats?.ratingsGiven || Math.floor((stats?.trialsPlayed || 0) * 0.2) || 0,
    color: '#4ECDC4',
    format: (val: number) => val.toString(),
    description: 'Wisdom from rating games',
  },
  {
    id: 'defense',
    icon: '🛡️',
    label: 'DEFENSE',
    getValue: (stats: any) => stats?.winStreak || stats?.currentStreak || 0,
    color: '#95E1D3',
    format: (val: number) => val.toString(),
    description: 'Protection from daily streaks',
  },
  {
    id: 'speed',
    icon: '⚡',
    label: 'SPEED',
    getValue: (stats: any) => stats?.trialsPlayed || stats?.gamesPlayed || 0,
    color: '#FFE66D',
    format: (val: number) => val.toString(),
    description: 'Agility from trials played',
  },
  {
    id: 'charisma',
    icon: '✨',
    label: 'CHARISMA',
    getValue: (stats: any) => stats?.gamesShared || stats?.gamesCompleted || 0,
    color: '#FFDAB9',
    format: (val: number) => val.toString(),
    description: 'Charm from sharing games',
  },
];

interface RPGStatCellProps {
  stat: typeof RPG_STATS[0];
  value: number;
  compact: boolean;
  index: number;
  onPress?: () => void;
}

const RPGStatCell: React.FC<RPGStatCellProps> = React.memo(({ stat, value, compact, index, onPress }) => {
  const level = Math.floor(value / 50) + 1;
  const progress = (value % 50) / 50;

  const content = (
    <View style={[styles.statCell, compact && styles.statCellCompact]}>
      {/* Glass effect background */}
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Icon */}
      <Text style={[styles.statIcon, compact && styles.statIconCompact]}>
        {stat.icon}
      </Text>
      
      {/* Value */}
      <Text style={[styles.statValue, compact && styles.statValueCompact, { color: stat.color }]}>
        {stat.format(value)}
      </Text>
      
      {/* Label */}
      <Text style={[styles.statLabel, compact && styles.statLabelCompact]}>
        {stat.label}
      </Text>
      
      {/* Description */}
      <Text style={styles.statDescription}>
        {stat.id === 'strength' && 'Likes Given'}
        {stat.id === 'accuracy' && 'Time Played'}
        {stat.id === 'intelligence' && 'Ratings Given'}
        {stat.id === 'defense' && 'Day Streak'}
        {stat.id === 'speed' && 'Games Played'}
        {stat.id === 'charisma' && 'Games Shared'}
      </Text>
      
      {/* Level */}
      <View style={styles.levelContainer}>
        <Text style={[styles.levelText, { color: stat.color }]}>
          Lv.{level}
        </Text>
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progress * 100}%`,
                backgroundColor: stat.color + '80',
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [
          { opacity: pressed ? 0.7 : 1 }
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
});

RPGStatCell.displayName = 'RPGStatCell';

interface RPGStatsGridProps {
  stats: any;
  columns?: number;
  style?: any;
}

export const RPGStatsGrid: React.FC<RPGStatsGridProps> = React.memo(({ 
  stats, 
  columns: overrideColumns,
  style
}) => {
  const layout = useResponsiveLayout();
  const columns = overrideColumns || layout.statsColumns || 2;
  const isCompact = layout.isCompact || !layout.isTablet;

  // Calculate RPG stats from raw stats
  const rpgStats = useMemo(() => {
    return RPG_STATS.map(stat => ({
      ...stat,
      value: stat.getValue(stats)
    }));
  }, [stats]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.grid, { marginHorizontal: -layout.cardPadding / 4 }]}>
        {rpgStats.map((stat, index) => (
          <View 
            key={stat.id} 
            style={[
              styles.gridItem,
              { 
                width: `${100 / columns}%`,
                paddingHorizontal: layout.cardPadding / 4,
                marginBottom: layout.sectionSpacing / 2,
              }
            ]}
          >
            <RPGStatCell 
              stat={stat} 
              value={stat.value}
              compact={isCompact} 
              index={index} 
            />
          </View>
        ))}
      </View>
    </View>
  );
});

RPGStatsGrid.displayName = 'RPGStatsGrid';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    minHeight: 100,
  },
  statCell: {
    flex: 1,
    padding: DS.spacing.sm,
    borderRadius: DS.effects.borderRadiusMedium,
    backgroundColor: DS.colors.surface,
    ...DS.effects.glassSurface,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statCellCompact: {
    padding: DS.spacing.xs,
    minHeight: 90,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: DS.spacing.xs / 2,
  },
  statIconCompact: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statValueCompact: {
    fontSize: 16,
  },
  statLabel: {
    color: DS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: DS.spacing.xs / 2,
  },
  statLabelCompact: {
    fontSize: 9,
  },
  statDescription: {
    color: DS.colors.textMuted,
    fontSize: 9,
    marginBottom: DS.spacing.xs / 2,
  },
  levelContainer: {
    width: '100%',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  progressBar: {
    width: '80%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});