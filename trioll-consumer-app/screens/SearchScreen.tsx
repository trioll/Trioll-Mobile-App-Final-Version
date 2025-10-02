import type { Game } from './../src/types/api.types';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, TextInput, Animated, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilterPills } from '../components/search/FilterPills';
import { SearchResults } from '../components/search/SearchResults';
import { AdvancedFiltersSheet } from '../components/search/AdvancedFiltersSheet';
import { SearchSuggestions } from '../components/search/SearchSuggestions';
import { CategoryFilter } from '../components/search/CategoryFilter';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useDebounce } from '../hooks/useDebounce';
import { useHaptics } from '../hooks/useHaptics';
import { useOrientation } from '../hooks';
import { useGameSearch, useSearchSuggestions } from '../hooks/useGameSearch';
import { SPRING_CONFIG, DURATIONS } from '../constants/animations';
import { StackNavigationProp } from '@react-navigation/stack';
import { responsivePadding } from '../utils/responsive';

type RootStackParamList = {
  Search: undefined;
  GameDetail: { gameId: string };
};

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;

export interface SearchFilters {
  genres: string[];
  platform: 'all' | 'ios' | 'android';
  ageRating: 'all' | 'everyone' | 'teen' | 'mature';
  trialDuration: { min: number; max: number };
  playerCount: 'any' | 'single' | 'multi' | 'mmo';
  releaseDate: 'any' | 'week' | 'month' | 'year';
  minRating: number;
  hasAchievements: boolean;
  isMultiplayer: boolean;
  isOfflineCapable: boolean;
  languages: string[];
  newThisWeek: boolean;
  highlyRated: boolean;
  trending: boolean;
  hiddenGems: boolean;
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortOption = 'relevance' | 'popular' | 'newest' | 'rating' | 'alphabetical';
type SearchMode = 'instant' | 'category' | 'surprise';

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  gameCount: number;
  isNew?: boolean;
  isPopular?: boolean;
}

// PHASE 2 - Removed mood-based types and constants

export const SearchScreen: React.FC = () => {
  const { width: screenWidth, height: screenHeight } = useOrientation();
  const insets = useSafeAreaInsets();
  const isPortrait = screenHeight > screenWidth;
  const isCompact = screenWidth < 375;
  
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const haptics = useHaptics();
  const searchInputRef = useRef<TextInput>(null);
  const resultsScrollRef = useRef<ScrollView>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [showCategoryBrowse, setShowCategoryBrowse] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('instant');
  // PHASE 2 - Removed selectedMood state

  // Display states
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Data states
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<SearchFilters>({
    genres: [],
    platform: 'all',
    ageRating: 'all',
    trialDuration: { min: 3, max: 7 },
    playerCount: 'any',
    releaseDate: 'any',
    minRating: 0,
    hasAchievements: false,
    isMultiplayer: false,
    isOfflineCapable: false,
    languages: [],
    newThisWeek: false,
    highlyRated: false,
    trending: false,
    hiddenGems: false,
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { searchHistory, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  // Use API search hook for real-time search
  const {
    results: apiSearchResults,
    loading: apiSearchLoading,
    isUsingApiData,
    search: performApiSearch,
  } = useGameSearch(searchQuery, 50);

  // Get search suggestions
  const suggestions = useSearchSuggestions(searchQuery);

  // Animations
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const characterCountAnim = useRef(new Animated.Value(0)).current;
  const resultsOpacity = useRef(new Animated.Value(1)).current;

  // Cache for offline search
  const [cachedResults, setCachedResults] = useState<Map<string, Game[]>>(new Map());

  useEffect(() => {
    loadInitialData();
    // Auto-focus with delay
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  }, []);

  // Trigger API search when debounced query changes
  useEffect(() => {
    // Only search if query is at least 2 characters (API requirement)
    if (debouncedSearchQuery.length >= 2) {
      performApiSearch(debouncedSearchQuery);
    } else if (debouncedSearchQuery.length === 0) {
      // Clear results when query is empty
      performApiSearch('');
    }
  }, [debouncedSearchQuery, performApiSearch]);

  useEffect(() => {
    if (debouncedSearchQuery || selectedCategory) {
      // If searching by query only (no category), use API results directly
      if (debouncedSearchQuery && !selectedCategory) {
        setSearchResults(apiSearchResults);
        setResultCount(apiSearchResults.length);
        setIsLoading(apiSearchLoading);
      } else if (selectedCategory) {
        // Perform filtered search for categories
        performSearch();
      }
    } else {
      // Clear results when no search query or category
      setSearchResults([]);
      setResultCount(0);
    }
  }, [debouncedSearchQuery, selectedCategory, apiSearchResults, apiSearchLoading]);

  useEffect(() => {
    // Animate character count
    if (searchQuery.length > 0) {
      Animated.timing(characterCountAnim, {
        toValue: 1,
        duration: DURATIONS.FAST,
        useNativeDriver: true,
      }).start();
      // Show suggestions when typing
      if (isSearchFocused) {
        setShowSuggestions(true);
      }
    } else {
      Animated.timing(characterCountAnim, {
        toValue: 0,
        duration: DURATIONS.FAST,
        useNativeDriver: true,
      }).start();
      // Hide suggestions when no query
      setShowSuggestions(false);
    }
  }, [searchQuery, isSearchFocused]);

  const loadInitialData = async () => {
    try {
      // Fetch all games to calculate trending (top 5 by play count)
      const response = await fetch('https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games');
      const data = await response.json();
      
      if (data.games && Array.isArray(data.games)) {
        // Sort by play count and get top 5 game names
        const topGames = data.games
          .sort((a: any, b: any) => (b.playCount || 0) - (a.playCount || 0))
          .slice(0, 5)
          .map((game: any) => game.name || game.title);
        
        setTrendingSearches(topGames);
      } else {
        // Fallback trending searches
        setTrendingSearches([
          'Evolution Runner',
          'Platform Jumper', 
          'Tap Tap Hero',
          'Space Shooter',
          'Casual Games'
        ]);
      }
    } catch (error) {
      // Safe error logging
      if (__DEV__) {
        console.warn('Failed to load trending games:', error);
      }
      // Fallback trending searches on error
      setTrendingSearches([
        'Evolution Runner',
        'Platform Jumper', 
        'Tap Tap Hero',
        'RPG Adventure',
        'Racing Games'
      ]);
    }
    
    // TODO: Replace with categories API when available
    setCategories([
      {
        id: 'action',
        name: 'Action',
        icon: 'sword-cross',
        color: '#FF0066',
        gameCount: 1248,
        isPopular: true,
      },
      {
        id: 'puzzle',
        name: 'Puzzle',
        icon: 'puzzle',
        color: '#00FFFF',
        gameCount: 892,
      },
      {
        id: 'strategy',
        name: 'Strategy',
        icon: 'chess-knight',
        color: '#8866FF',
        gameCount: 734,
      },
      {
        id: 'racing',
        name: 'Racing',
        icon: 'car',
        color: '#FFAA00',
        gameCount: 556,
        isPopular: true,
      },
      {
        id: 'sports',
        name: 'Sports',
        icon: 'football',
        color: '#00FF66',
        gameCount: 445,
      },
      {
        id: 'casual',
        name: 'Casual',
        icon: 'gamepad-variant',
        color: '#FF66FF',
        gameCount: 1567,
        isPopular: true,
      },
      {
        id: 'rpg',
        name: 'RPG',
        icon: 'shield',
        color: '#0088FF',
        gameCount: 823,
      },
      {
        id: 'simulation',
        name: 'Simulation',
        icon: 'city-variant',
        color: '#FFFF00',
        gameCount: 267,
      },
    ]);
  };

  const performSearch = async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setPage(1);
    }

    try {
      // Check cache first for offline capability
      const cacheKey = `${debouncedSearchQuery}-${JSON.stringify(filters)}-${sortBy}`;
      if (!loadMore && cachedResults.has(cacheKey)) {
        const cached = cachedResults.get(cacheKey)!;
        setSearchResults(cached);
        setResultCount(cached.length);
        setIsLoading(false);
        return;
      }

      // PHASE 2 - Removed mood filter logic
      // Apply category filter
      const updatedFilters = selectedCategory
        ? {
            ...filters,
            genres: [selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)],
          }
        : filters;

      // For category search, filter the existing results
      let results: Game[] = [];
      
      if (selectedCategory) {
        // First get all games if we don't have any
        if (apiSearchResults.length === 0) {
          performApiSearch(''); // Get all games
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Filter by category
        results = apiSearchResults.filter(game => 
          game.genre?.toLowerCase() === selectedCategory.toLowerCase()
        );
      } else {
        results = apiSearchResults;
      }

      if (loadMore) {
        setSearchResults(prev => [...prev, ...results]);
        setPage(prev => prev + 1);
      } else {
        setSearchResults(results);
        // Cache results
        setCachedResults(prev => new Map(prev).set(cacheKey, results));
      }

      setResultCount(results.length);
      setHasMore(results.length === 20);

      // Animate results
      Animated.sequence([
        Animated.timing(resultsOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(resultsOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      if (__DEV__) {
        console.warn('Search error:', error);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setShowSuggestions(true);
    Animated.spring(searchBarAnimation, {
      toValue: 1,
      ...SPRING_CONFIG.BOUNCY,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    if (!searchQuery) {
      Animated.spring(searchBarAnimation, {
        toValue: 0,
        ...SPRING_CONFIG.TIGHT,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query && !searchHistory.includes(query)) {
      addToHistory(query);
    }
    setShowSuggestions(false);
    searchInputRef.current?.blur();
    haptics.impact();
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setResultCount(0);
    setSelectedCategory(null);
    // PHASE 2 - Removed selectedMood reset
    searchInputRef.current?.focus();
    haptics.selection();
  };

  const handleCancel = () => {
    haptics.selection();
    navigation.goBack();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await performSearch();
    setIsRefreshing(false);
    (haptics as any).success();
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      performSearch(true);
    }
  };

  const handleSurpriseMe = () => {
    haptics.impact('heavy');
    setSearchMode('surprise');
    // Random filters for surprise
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomFilters: SearchFilters = {
      ...filters,
      genres: [randomCategory.name],
      minRating: Math.random() > 0.5 ? 4 : 0,
      trending: Math.random() > 0.5,
    };
    setFilters(randomFilters);
  };

  // PHASE 2 - Removed handleMoodSelect function

  const handleCategorySelect = (categoryId: string | null) => {
    haptics.selection();
    setSelectedCategory(categoryId);
    setSearchMode('category');
    setShowCategoryBrowse(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.genres.length > 0) count += filters.genres.length;
    if (filters.platform !== 'all') count++;
    if (filters.ageRating !== 'all') count++;
    if (filters.trialDuration.min !== 3 || filters.trialDuration.max !== 7) count++;
    if (filters.playerCount !== 'any') count++;
    if (filters.releaseDate !== 'any') count++;
    if (filters.minRating > 0) count++;
    if (filters.hasAchievements) count++;
    if (filters.isMultiplayer) count++;
    if (filters.isOfflineCapable) count++;
    if (filters.languages.length > 0) count += filters.languages.length;
    if (filters.newThisWeek) count++;
    if (filters.highlyRated) count++;
    if (filters.trending) count++;
    if (filters.hiddenGems) count++;
    return count;
  };

  const highlightSearchTerms = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <Text key={index} style={styles.highlightedText}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  const renderHeader = () => (
    <View style={[styles.searchHeader, { paddingTop: insets.top + 8 }]}>
      {/* Back Button */}
      <Pressable
        onPress={handleCancel}
        style={styles.backButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </Pressable>

      <Animated.View
        style={[
          styles.searchBarContainer,
          {
            transform: [
              {
                scale: searchBarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.98],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
          <Ionicons
            name="search"
            size={18}
            color={isSearchFocused ? '#00FFFF' : 'rgba(255,255,255,0.4)'}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search games..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {searchQuery.length > 0 && (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Filter Button */}
      <Pressable 
        onPress={() => setShowFiltersSheet(true)} 
        style={[
          styles.filterButton,
          getActiveFilterCount() > 0 && styles.filterButtonActive
        ]}
      >
        <Ionicons 
          name="options-outline" 
          size={20} 
          color={getActiveFilterCount() > 0 ? '#00FFFF' : '#FFFFFF'} 
        />
        {getActiveFilterCount() > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );

  const renderDiscoveryTools = () => (
    <View style={styles.discoverySection}>
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.surpriseButton}
          onPress={handleSurpriseMe}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.surpriseGradient}
          >
            <Ionicons name="shuffle" size={20} color="#FFFFFF" />
            <Text style={styles.surpriseText}>Surprise Me</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.browseButton} 
          onPress={() => setShowCategoryBrowse(true)}
        >
          <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
          <Text style={styles.browseText}>Browse Categories</Text>
        </TouchableOpacity>
      </View>

      {/* PHASE 2 - Mood-based discovery removed for simplification */}
    </View>
  );

  const renderResultsHeader = () => {
    if (searchResults.length === 0) return null;

    return (
      <View style={styles.resultsHeader}>
        <View style={styles.resultCountContainer}>
          <Text style={styles.resultCount}>{resultCount} games found</Text>
          {searchQuery && <Text style={styles.searchTerms}>for "{searchQuery}"</Text>}
        </View>

        <View style={styles.resultsControls}>
          {/* Sort Dropdown */}
          <Pressable
            style={styles.sortButton}
            onPress={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Text style={styles.sortText}>
              {sortBy === 'relevance' && 'Most Relevant'}
              {sortBy === 'popular' && 'Most Popular'}
              {sortBy === 'newest' && 'Newest First'}
              {sortBy === 'rating' && 'Highest Rated'}
              {sortBy === 'alphabetical' && 'A to Z'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.4)" />
          </Pressable>

          {/* View Mode Toggle */}
          <View style={styles.viewModeContainer}>
            <Pressable
              style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeActive]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#00FFFF' : 'rgba(255,255,255,0.5)'} />
            </Pressable>
            <Pressable
              style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list" size={16} color={viewMode === 'list' ? '#00FFFF' : 'rgba(255,255,255,0.5)'} />
            </Pressable>
            <Pressable
              style={[styles.viewModeButton, viewMode === 'compact' && styles.viewModeActive]}
              onPress={() => setViewMode('compact')}
            >
              <Ionicons name="menu" size={16} color={viewMode === 'compact' ? '#00FFFF' : 'rgba(255,255,255,0.5)'} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderSortDropdown = () => {
    if (!showSortDropdown) return null;

    const sortOptions: { value: SortOption; label: string }[] = [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'popular', label: 'Most Popular' },
      { value: 'newest', label: 'Newest First' },
      { value: 'rating', label: 'Highest Rated' },
      { value: 'alphabetical', label: 'A to Z' },
    ];

    return (
      <View style={styles.sortDropdown}>
        {sortOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
            onPress={() => {
              setSortBy(option.value);
              setShowSortDropdown(false);
              haptics.selection();
            }}
          >
            <Text
              style={[
                styles.sortOptionText,
                sortBy === option.value && styles.sortOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.value && <Ionicons name="checkmark" size={16} color="#00FFFF" />}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderNoResults = () => (
    <View style={styles.noResultsContainer}>
      <View style={{ 
        width: 80, 
        height: 80, 
        borderRadius: 3, 
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.3)" />
      </View>
      <Text style={styles.noResultsTitle}>No games found</Text>
      <Text style={styles.noResultsText}>Try adjusting your filters or search terms</Text>
      {searchHistory.length > 0 && (
        <View style={styles.suggestedSearches}>
          <Text style={styles.suggestedTitle}>Try searching for:</Text>
          {searchHistory.slice(0, 3).map((term, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestedButton}
              onPress={() => handleSearch(term)}
            >
              <Text style={styles.suggestedText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    if ((isLoading || apiSearchLoading) && searchResults.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={[styles.loadingText, { marginTop: 16 }]}>Searching...</Text>
        </View>
      );
    }

    if (searchResults.length === 0 && (searchQuery || selectedCategory)) {
      return renderNoResults();
    }

    if (searchResults.length > 0) {
      return (
        <Animated.View style={{ opacity: resultsOpacity, flex: 1 }}>
          <SearchResults
            results={searchResults}
            viewMode={viewMode}
            sortBy={sortBy}
            isLoading={isLoading || apiSearchLoading}
            onSortChange={setSortBy}
            onViewModeChange={setViewMode}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            highlightTerms={searchQuery ? [searchQuery] : []}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
          />
        </Animated.View>
      );
    }

    return null;
  };

  const renderCategoryBrowse = () => (
    <Modal
      visible={showCategoryBrowse}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCategoryBrowse(false)}
    >
      <View style={styles.categoryModal}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.categoryContent}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>Browse Categories</Text>
            <Pressable onPress={() => setShowCategoryBrowse(false)} style={styles.categoryClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView style={styles.categoryScroll} contentContainerStyle={styles.categoryGrid}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleCategorySelect(category.id)}
              >
                <LinearGradient
                  colors={[category.color, category.color + '80']}
                  style={styles.categoryIcon}
                >
                  <MaterialCommunityIcons
                    name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={isPortrait ? 26 : 32}
                    color="#FFFFFF"
                  />
                </LinearGradient>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{category.gameCount} games</Text>
                {category.isNew && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>NEW</Text>
                  </View>
                )}
                {category.isPopular && (
                  <View style={[styles.categoryBadge, styles.categoryBadgePopular]}>
                    <Text style={styles.categoryBadgeText}>HOT</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Curated Collections */}
          <View style={styles.collectionsSection}>
            <Text style={styles.collectionsTitle}>Curated Collections</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={styles.collectionCard}>
                <LinearGradient colors={['#FF0066', '#FF3399']} style={styles.collectionGradient}>
                  <Text style={styles.collectionName}>Editor's Choice</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.collectionCard}>
                <LinearGradient colors={['#00FFFF', '#0099CC']} style={styles.collectionGradient}>
                  <Text style={styles.collectionName}>Indie Gems</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.collectionCard}>
                <LinearGradient colors={['#8866FF', '#6644CC']} style={styles.collectionGradient}>
                  <Text style={styles.collectionName}>Quick Trials</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {renderHeader()}

        {/* Search Insights when no query */}
        {!searchQuery && !selectedCategory && searchHistory.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>Your Search Insights</Text>
            <Text style={styles.insightsText}>
              You've searched {searchHistory.length} times. Most popular: "{searchHistory[0]}"
            </Text>
          </View>
        )}

        {/* Discovery Tools */}
        {!searchQuery && renderDiscoveryTools()}

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        {/* Filter Pills */}
        <FilterPills
          filters={filters}
          onFilterChange={setFilters}
          onShowAdvanced={() => setShowFiltersSheet(true)}
          activeCount={getActiveFilterCount()}
        />

        {/* Results Header */}
        {renderResultsHeader()}

        {/* Sort Dropdown */}
        {renderSortDropdown()}

        {/* Main Content */}
        {renderContent()}

        {/* Search Suggestions Dropdown */}
        {showSuggestions && (
          <SearchSuggestions
            query={searchQuery}
            searchHistory={searchHistory}
            trendingSearches={trendingSearches}
            suggestions={suggestions}
            onSelectSuggestion={handleSearch}
            onRemoveHistory={removeFromHistory}
            onClearHistory={clearHistory}
            onClose={() => setShowSuggestions(false)}
          />
        )}

        {/* Advanced Filters Sheet */}
        <AdvancedFiltersSheet
          visible={showFiltersSheet}
          filters={filters}
          onClose={() => setShowFiltersSheet(false)}
          onApply={newFilters => {
            setFilters(newFilters);
            setShowFiltersSheet(false);
            (haptics as any).success();
          }}
        />

        {/* Category Browse Modal */}
        {renderCategoryBrowse()}

        {/* Dev Mode Data Source Indicator */}
        {__DEV__ && searchQuery && (
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              backgroundColor: isUsingApiData
                ? 'rgba(0, 255, 136, 0.2)'
                : 'rgba(255, 109, 107, 0.2)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 3,
              borderWidth: 1,
              borderColor: isUsingApiData ? '#00FF88' : '#FF6B6B',
            }}
            pointerEvents="none"
          >
            <Text
              style={{
                color: isUsingApiData ? '#00FF88' : '#FF6B6B',
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              {isUsingApiData ? '🟢 API Search' : '🔴 Local Search'}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoid: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchBarFocused: {
    borderColor: '#00FFFF',
    backgroundColor: 'rgba(0,255,255,0.05)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  characterCount: {
    marginRight: 8,
  },
  characterCountText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
    marginLeft: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  filterButtonActive: {
    borderColor: '#00FFFF',
    backgroundColor: 'rgba(0,255,255,0.05)',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#00FFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
  },
  // Discovery Section
  discoverySection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  surpriseButton: {
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  surpriseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  surpriseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // PHASE 2 - Removed mood-related styles
  /* moodScroll: {
    marginBottom: 12,
  },
  moodContainer: {
    gap: 8,
    paddingRight: 16,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  moodButtonActive: {
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderColor: '#00FFFF',
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  moodLabelActive: {
    color: '#00FFFF',
  }, */
  browseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  browseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Results Header
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resultCountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
    gap: 6,
  },
  resultCount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  searchTerms: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  highlightedText: {
    color: '#00FFFF',
    fontWeight: '700',
  },
  resultsControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sortText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  sortDropdown: {
    position: 'absolute',
    top: 200,
    left: 16,
    right: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 3,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sortOptionActive: {
    backgroundColor: 'rgba(0,255,255,0.05)',
  },
  sortOptionText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  sortOptionTextActive: {
    color: '#00FFFF',
    fontWeight: '600',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 2,
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewModeActive: {
    backgroundColor: 'rgba(0,255,255,0.15)',
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: responsivePadding.xxl + 20,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginTop: 16,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: responsivePadding.xxl + 20,
  },
  noResultsTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  noResultsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  suggestedSearches: {
    alignItems: 'center',
  },
  suggestedTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 12,
  },
  suggestedButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: 4,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  suggestedText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  // Insights
  insightsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(99,102,241,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.2)',
  },
  insightsTitle: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  // Category Browse Modal
  categoryModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  categoryClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  categoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00FF88',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgePopular: {
    backgroundColor: '#FF6B6B',
  },
  categoryBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '700',
  },
  collectionsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  collectionsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  collectionCard: {
    marginRight: 12,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  collectionGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  collectionName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
