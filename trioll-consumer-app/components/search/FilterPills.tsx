import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchFilters } from '../../screens/SearchScreen';

interface FilterPillsProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  onShowAdvanced: () => void;
  activeCount: number;
}

interface FilterPill {
  id: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  filters,
  onFilterChange,
  onShowAdvanced,
  activeCount,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  const animatePillPress = (id: string) => {
    const anim = getScaleAnim(id);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pillColors: { [key: string]: string } = {
    genre: '#FF66FF', // Purple - variety
    platform: '#00FFFF', // Cyan - technical
    age: '#FFAA00', // Orange - caution/rating
    trial: '#00FF66', // Green - time/duration
    new: '#FFFF00', // Yellow - new/fresh
    rated: '#FFD700', // Gold - quality/stars
    trending: '#FF0066', // Hot pink - popular/hot
  };

  const pills: FilterPill[] = [
    {
      id: 'genre',
      label: filters.genres.length > 0 ? `Genre (${filters.genres.length})` : 'Genre',
      active: filters.genres.length > 0,
      onPress: () => onShowAdvanced(),
    },
    {
      id: 'platform',
      label: filters.platform === 'all' ? 'Platform' : filters.platform.toUpperCase(),
      active: filters.platform !== 'all',
      onPress: () => {
        const platforms: ('all' | 'ios' | 'android')[] = ['all', 'ios', 'android'];
        const currentIndex = platforms.indexOf(filters.platform);
        const nextIndex = (currentIndex + 1) % platforms.length;
        onFilterChange({ ...filters, platform: platforms[nextIndex] });
      },
    },
    {
      id: 'age',
      label: filters.ageRating === 'all' ? 'Age Rating' : filters.ageRating,
      active: filters.ageRating !== 'all',
      onPress: () => {
        const ratings: ('all' | 'everyone' | 'teen' | 'mature')[] = [
          'all',
          'everyone',
          'teen',
          'mature',
        ];
        const currentIndex = ratings.indexOf(filters.ageRating);
        const nextIndex = (currentIndex + 1) % ratings.length;
        onFilterChange({ ...filters, ageRating: ratings[nextIndex] });
      },
    },
    {
      id: 'trial',
      label: `${filters.trialDuration.min}-${filters.trialDuration.max} min`,
      active: filters.trialDuration.min !== 3 || filters.trialDuration.max !== 7,
      onPress: () => onShowAdvanced(),
    },
    {
      id: 'new',
      label: 'New',
      active: filters.newThisWeek,
      onPress: () => {
        onFilterChange({ ...filters, newThisWeek: !filters.newThisWeek });
      },
    },
    {
      id: 'rated',
      label: '4+ Stars',
      active: filters.highlyRated,
      onPress: () => {
        onFilterChange({ ...filters, highlyRated: !filters.highlyRated });
      },
    },
    {
      id: 'trending',
      label: 'Trending',
      active: filters.trending,
      onPress: () => {
        onFilterChange({ ...filters, trending: !filters.trending });
      },
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Advanced Filters Button */}
        <Pressable
          style={[styles.advancedButton, activeCount > 0 && styles.advancedButtonActive]}
          onPress={() => {
            animatePillPress('advanced');
            onShowAdvanced();
          }}
        >
          <Animated.View
            style={[
              styles.advancedButtonContent,
              { transform: [{ scale: getScaleAnim('advanced') }] },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeCount > 0 ? '#00FF88' : '#FFFFFF'}
            />
            {activeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            )}
          </Animated.View>
        </Pressable>

        {/* Filter Pills */}
        {pills.map(pill => (
          <Pressable
            key={pill.id}
            style={[
              styles.pill,
              pill.active && {
                ...styles.pillActive,
                borderColor: pillColors[pill.id] || '#00FF88',
                shadowColor: pillColors[pill.id] || '#00FF88',
              },
            ]}
            onPress={() => {
              animatePillPress(pill.id);
              pill.onPress();
            }}
          >
            <Animated.View style={{ transform: [{ scale: getScaleAnim(pill.id) }] }}>
              <Text
                style={[
                  styles.pillText,
                  pill.active && {
                    ...styles.pillTextActive,
                    color: pillColors[pill.id] || '#00FF88',
                    textShadowColor: pillColors[pill.id] || '#00FF88',
                  },
                ]}
              >
                {pill.label}
              </Text>
            </Animated.View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingVertical: 10,
  },
  advancedButton: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 0,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  advancedButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  advancedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#00FF88',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  badgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
  },
  pill: {
    marginRight: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 0,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  pillActive: {
    backgroundColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillTextActive: {
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});
