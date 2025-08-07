import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 16) / 2; // 48 for padding, 16 for gap

interface CategoryBrowseProps {
  onCategorySelect: (category: string) => void;
}

interface Category {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string[];
  count: number;
}

const CATEGORIES: Category[] = [
  { id: 'action', name: 'ACTION', icon: 'flash', color: ['#FF0088', '#FF00FF'], count: 1234 },
  {
    id: 'puzzle',
    name: 'PUZZLE',
    icon: 'extension-puzzle',
    color: ['#00FF88', '#00FFFF'],
    count: 856,
  },
  {
    id: 'strategy',
    name: 'STRATEGY',
    icon: 'analytics',
    color: ['#8800FF', '#FF00FF'],
    count: 642,
  },
  { id: 'racing', name: 'RACING', icon: 'speedometer', color: ['#FFFF00', '#FF8800'], count: 423 },
  { id: 'sports', name: 'SPORTS', icon: 'football', color: ['#00FFFF', '#0088FF'], count: 789 },
  { id: 'casual', name: 'CASUAL', icon: 'happy', color: ['#FF00FF', '#FF0088'], count: 2341 },
  { id: 'rpg', name: 'RPG', icon: 'shield', color: ['#0088FF', '#8800FF'], count: 567 },
  {
    id: 'simulation',
    name: 'SIMULATION',
    icon: 'construct',
    color: ['#FF8800', '#FFFF00'],
    count: 345,
  },
  {
    id: 'adventure',
    name: 'ADVENTURE',
    icon: 'compass',
    color: ['#00FFFF', '#00FF88'],
    count: 892,
  },
];

const COLLECTIONS = [
  { id: 'editors', title: "Editor's Choice", subtitle: 'Hand-picked by our team', icon: 'star' },
  { id: 'new', title: 'New & Noteworthy', subtitle: 'Fresh games this week', icon: 'sparkles' },
  {
    id: 'trending',
    title: 'Trending Now',
    subtitle: 'What everyone is playing',
    icon: 'trending-up',
  },
  { id: 'hidden', title: 'Hidden Gems', subtitle: 'Discover something new', icon: 'diamond' },
];

export const CategoryBrowse: React.FC<CategoryBrowseProps> = ({ onCategorySelect }) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  const animatePress = (id: string, callback: () => void) => {
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
    ]).start(() => callback());
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Popular Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(category => (
            <Pressable
              key={category.id}
              style={styles.categoryCard}
              onPress={() => animatePress(category.id, () => onCategorySelect(category.name))}
            >
              <Animated.View
                style={{
                  flex: 1,
                  transform: [{ scale: getScaleAnim(category.id) }],
                }}
              >
                <View
                  style={[
                    styles.categoryContent,
                    {
                      borderColor: category.color[0],
                      shadowColor: category.color[0],
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 10,
                      elevation: 10,
                    },
                  ]}
                >
                  <Ionicons
                    name={category.icon as unknown as any}
                    size={32}
                    color={category.color[0]}
                    style={styles.categoryIcon}
                  />
                  <Text
                    style={[
                      styles.categoryName,
                      {
                        color: category.color[0],
                        textShadowColor: category.color[0],
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 5,
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                  <Text
                    style={[
                      styles.categoryCount,
                      {
                        color: category.color[1],
                      },
                    ]}
                  >
                    {category.count} GAMES
                  </Text>
                </View>
              </Animated.View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Curated Collections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Curated Collections</Text>
        {COLLECTIONS.map(collection => (
          <Pressable
            key={collection.id}
            style={styles.collectionCard}
            onPress={() => animatePress(collection.id, () => {})}
          >
            <Animated.View
              style={[
                styles.collectionContent,
                { transform: [{ scale: getScaleAnim(collection.id) }] },
              ]}
            >
              <View style={styles.collectionIcon}>
                <Ionicons
                  name={collection.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color="#00FF88"
                  style={{
                    textShadowColor: '#00FF88',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 5,
                  }}
                />
              </View>
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionTitle}>{collection.title}</Text>
                <Text style={styles.collectionSubtitle}>{collection.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </Animated.View>
          </Pressable>
        ))}
      </View>

      {/* More Like This */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Like Your Favorites</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScroll}
        >
          {['Based on Candy Crush', 'Similar to PUBG', 'Like Among Us'].map((suggestion, index) => (
            <Pressable
              key={index}
              style={styles.suggestionPill}
              onPress={() => animatePress(`suggest-${index}`, () => {})}
            >
              <Animated.View style={{ transform: [{ scale: getScaleAnim(`suggest-${index}`) }] }}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Animated.View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: 120,
    marginBottom: 16,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#000000',
  },
  categoryContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  categoryIcon: {
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  collectionCard: {
    marginHorizontal: 24,
    marginBottom: 12,
  },
  collectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 0,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collectionSubtitle: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionsScroll: {
    paddingHorizontal: 24,
  },
  suggestionPill: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 0,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
