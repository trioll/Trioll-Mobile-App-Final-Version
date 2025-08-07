
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchSuggestionsProps {
  query: string;
  searchHistory: string[];
  trendingSearches: string[];
  suggestions?: string[];
  onSelectSuggestion: (suggestion: string) => void;
  onRemoveHistory: (item: string) => void;
  onClearHistory: () => void;
  onClose?: () => void;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  searchHistory,
  trendingSearches,
  suggestions = [],
  onSelectSuggestion,
  onRemoveHistory,
  onClearHistory,
  onClose,
}) => {
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Use provided suggestions or fall back to mock ones
  const getAutocompleteSuggestions = () => {
    if (!query) return [];

    // If we have dynamic suggestions, use them
    if (suggestions.length > 0) {
      return suggestions;
    }

    // Otherwise use mock suggestions
    const allGames = [
      'Call of Duty Mobile',
      'Candy Crush Saga',
      'Clash of Clans',
      'Among Us',
      'PUBG Mobile',
      'Minecraft',
      'Fortnite',
      'Genshin Impact',
      'Pokémon GO',
      'Roblox',
    ];

    return allGames.filter(game => game.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  };

  const autocompleteSuggestions = getAutocompleteSuggestions();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Backdrop to close suggestions */}
      {onClose && <Pressable style={styles.backdrop} onPress={onClose} />}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Autocomplete Suggestions */}
          {autocompleteSuggestions.length > 0 && (
            <View style={styles.section}>
              {autocompleteSuggestions.map((suggestion, index) => (
                <Pressable
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => onSelectSuggestion(suggestion)}
                >
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Recent Searches */}
          {searchHistory.length > 0 && !query && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <Pressable onPress={onClearHistory}>
                  <Text style={styles.clearButton}>Clear</Text>
                </Pressable>
              </View>
              {searchHistory.slice(0, 10).map((item, index) => (
                <Pressable
                  key={index}
                  style={styles.historyItem}
                  onPress={() => onSelectSuggestion(item)}
                >
                  <Ionicons name="time-outline" size={18} color="#999999" />
                  <Text style={styles.historyText}>{item}</Text>
                  <Pressable
                    style={styles.removeButton}
                    onPress={e => {
                      e.stopPropagation();
                      onRemoveHistory(item);
                    }}
                  >
                    <Ionicons name="close" size={18} color="#999999" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}

          {/* Trending Searches */}
          {trendingSearches.length > 0 && !query && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              {trendingSearches.map((trend, index) => (
                <Pressable
                  key={index}
                  style={styles.trendingItem}
                  onPress={() => onSelectSuggestion(trend)}
                >
                  <Ionicons name="trending-up" size={18} color="#00FF88" />
                  <Text style={styles.trendingText}>{trend}</Text>
                  <Text style={styles.trendingRank}>#{index + 1}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Category Suggestions */}
          {query && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search in Categories</Text>
              {['Action', 'Puzzle', 'Strategy'].map(category => (
                <Pressable
                  key={category}
                  style={styles.categoryItem}
                  onPress={() => onSelectSuggestion(`${query} in ${category}`)}
                >
                  <Ionicons name="folder-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.categoryText}>
                    <Text style={styles.queryHighlight}>{query}</Text> in {category}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 132,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clearButton: {
    color: '#FF0088',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: '#FF0088',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  historyText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  trendingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  trendingRank: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: '#00FF88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  queryHighlight: {
    color: '#00FF88',
    fontWeight: '700',
    textShadowColor: '#00FF88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
