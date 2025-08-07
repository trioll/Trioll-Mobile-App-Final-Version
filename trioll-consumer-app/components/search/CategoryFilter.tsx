import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}

const CATEGORIES = [
  { id: 'all', name: 'ALL', icon: 'apps', color: '#FFFFFF' },
  { id: 'action', name: 'ACTION', icon: 'flash', color: '#FF0066' }, // Hot pink - high energy
  { id: 'puzzle', name: 'PUZZLE', icon: 'extension-puzzle', color: '#00FFFF' }, // Cyan - mental clarity
  { id: 'strategy', name: 'STRATEGY', icon: 'bulb', color: '#8866FF' }, // Purple - thinking
  { id: 'racing', name: 'RACING', icon: 'speedometer', color: '#FFAA00' }, // Orange - speed
  { id: 'sports', name: 'SPORTS', icon: 'football', color: '#00FF66' }, // Green - outdoors
  { id: 'casual', name: 'CASUAL', icon: 'happy', color: '#FF66FF' }, // Light purple - fun
  { id: 'rpg', name: 'RPG', icon: 'shield', color: '#0088FF' }, // Blue - fantasy
  { id: 'simulation', name: 'SIM', icon: 'construct', color: '#FFFF00' }, // Yellow - creativity
  { id: 'adventure', name: 'ADVENTURE', icon: 'compass', color: '#00FFAA' }, // Teal - exploration
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategorySelect,
}) => {
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  const animatePress = (id: string) => {
    const anim = getScaleAnim(id);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.9,
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

  const handleCategoryPress = (categoryId: string) => {
    animatePress(categoryId);
    if (categoryId === 'all') {
      onCategorySelect(null);
    } else {
      onCategorySelect(categoryId === selectedCategory ? null : categoryId);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map(category => {
          const isSelected =
            category.id === 'all' ? selectedCategory === null : category.id === selectedCategory;

          return (
            <Pressable
              key={category.id}
              onPress={() => handleCategoryPress(category.id)}
              style={[
                styles.categoryItem,
                isSelected && {
                  ...styles.categoryItemActive,
                  borderColor: category.color,
                  shadowColor: category.color,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.categoryContent,
                  { transform: [{ scale: getScaleAnim(category.id) }] },
                ]}
              >
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={isSelected ? category.color : 'rgba(255, 255, 255, 0.6)'}
                  style={[
                    styles.categoryIcon,
                    isSelected && {
                      textShadowColor: category.color,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 5,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && {
                      color: category.color,
                      textShadowColor: category.color,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 3,
                    },
                  ]}
                >
                  {category.name}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  categoryItem: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#000000',
  },
  categoryItemActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryIconActive: {
    textShadowColor: '#00FF88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
