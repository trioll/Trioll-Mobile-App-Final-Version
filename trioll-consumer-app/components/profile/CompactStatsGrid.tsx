import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DS } from '../../src/styles/TriollDesignSystem';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface StatItem {
  icon: string;
  value: string | number;
  label: string;
  trend?: number;
  color?: string;
  onPress?: () => void;
}

interface CompactStatsGridProps {
  stats: StatItem[];
  columns?: number;
}

const StatCell: React.FC<{ stat: StatItem; compact: boolean; index: number }> = React.memo(({ stat, compact, index }) => {
  const trendColor = stat.trend 
    ? stat.trend > 0 ? DS.colors.success : DS.colors.error 
    : undefined;

  const content = (
    <View style={[styles.statCell, compact && styles.statCellCompact]}>
      <View style={styles.statHeader}>
        <Ionicons 
          name={stat.icon as any} 
          size={compact ? 16 : 20} 
          color={stat.color || DS.colors.primary}
        />
        {stat.trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
            <Ionicons
              name={stat.trend > 0 ? 'trending-up' : 'trending-down'}
              size={12}
              color={trendColor}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {Math.abs(stat.trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statValue, compact && styles.statValueCompact]}>
        {stat.value}
      </Text>
      <Text style={[styles.statLabel, compact && styles.statLabelCompact]}>
        {stat.label}
      </Text>
    </View>
  );

  if (stat.onPress) {
    return (
      <Pressable 
        onPress={stat.onPress}
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

StatCell.displayName = 'StatCell';

export const CompactStatsGrid: React.FC<CompactStatsGridProps> = React.memo(({ 
  stats, 
  columns: overrideColumns 
}) => {
  const layout = useResponsiveLayout();
  const columns = overrideColumns || layout.statsColumns;
  const isCompact = layout.isCompact || !layout.isTablet;

  return (
    <View style={styles.container}>
      <View style={[styles.grid, { marginHorizontal: -layout.cardPadding / 4 }]}>
        {stats.map((stat, index) => (
          <View 
            key={index} 
            style={[
              styles.gridItem,
              { 
                width: `${100 / columns}%`,
                paddingHorizontal: layout.cardPadding / 4,
                marginBottom: layout.sectionSpacing / 2,
              }
            ]}
          >
            <StatCell stat={stat} compact={isCompact} index={index} />
          </View>
        ))}
      </View>
    </View>
  );
});

CompactStatsGrid.displayName = 'CompactStatsGrid';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    minHeight: 80,
  },
  statCell: {
    flex: 1,
    padding: DS.spacing.sm,
    borderRadius: DS.effects.borderRadiusMedium,
    backgroundColor: DS.colors.surface,
    ...DS.effects.glassSurface,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
  },
  statCellCompact: {
    padding: DS.spacing.xs,
    minHeight: 60,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.spacing.xs,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DS.effects.borderRadiusPill,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  statValue: {
    color: DS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statValueCompact: {
    fontSize: 16,
  },
  statLabel: {
    color: DS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statLabelCompact: {
    fontSize: 10,
  },
});