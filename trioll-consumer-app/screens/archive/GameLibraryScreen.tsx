
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavigationProp } from '../navigation/types';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, FlatList, Image, Animated, RefreshControl, Modal, Switch, Dimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useHaptics } from '../hooks/useHaptics';
import { SPRING_CONFIGS, DURATIONS } from '../constants/animations';
import { dummyGames } from '../data/dummyGames';

// LayoutAnimation will be enabled inside component

type ViewMode = 'grid' | 'list' | 'card';
type SortOption =
  | 'recently_added'
  | 'alphabetical_asc'
  | 'alphabetical_desc'
  | 'most_played'
  | 'least_played'
  | 'highest_rated'
  | 'recently_played'
  | 'genre'
  | 'developer'
  | 'trial_duration';

interface Collection {
  id: string;
  name: string;
  emoji: string;
  gameIds: string[];
  isDefault: boolean;
  createdAt: Date;
}

interface FilterOptions {
  genres: string[];
  platforms: string[];
  playStatus: string[];
  minRating: number;
  trialDuration: { min: number; max: number };
  hasAchievements: boolean;
  hasMultiplayer: boolean;
}

const defaultCollections: Collection[] = [
  {
    id: 'favorites',
    name: 'Favorites',
    emoji: '❤️',
    gameIds: [],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'playing',
    name: 'Currently Playing',
    emoji: '🔥',
    gameIds: [],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'completed',
    name: 'Completed',
    emoji: '✅',
    gameIds: [],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'play_later',
    name: 'Play Later',
    emoji: '⏰',
    gameIds: [],
    isDefault: true,
    createdAt: new Date(),
  },
];

export const GameLibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'GameLibrary'>>();
  const haptics = useHaptics();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const isPortrait = SCREEN_HEIGHT > SCREEN_WIDTH;
  const isCompact = SCREEN_WIDTH < 375;

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('recently_added');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    genres: [],
    platforms: [],
    playStatus: [],
    minRating: 0,
    trialDuration: { min: 3, max: 60 },
    hasAchievements: false,
    hasMultiplayer: false,
  });
  const [collections, setCollections] = useState<Collection[]>(defaultCollections);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionEmoji, setNewCollectionEmoji] = useState('📁');

  // Mock library data
  const [libraryGames] = useState(() => {
    // Simulate user library with some games
    return dummyGames.slice(0, 15).map((game, index) => ({
      ...game,
      addedAt: new Date(Date.now() - index * 86400000), // Added days ago
      lastPlayed: index < 5 ? new Date(Date.now() - index * 3600000) : null,
      progress: index < 3 ? Math.random() * 100 : 0,
      playTime: Math.random() * 50,
      isFavorite: index < 4,
      collection: index < 2 ? 'playing' : index < 4 ? 'favorites' : null,
    }));
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get scale animation for game
  const getScaleAnim = (gameId: string) => {
    if (!scaleAnims[gameId]) {
      scaleAnims[gameId] = new Animated.Value(1);
    }
    return scaleAnims[gameId];
  };

  // Filter and sort games
  const filteredAndSortedGames = useMemo(() => {
    let games = [...libraryGames];

    // Apply collection filter
    if (selectedCollection) {
      const collection = collections.find(c => c.id === selectedCollection);
      games = games.filter(game => collection?.gameIds.includes(game.id));
    }

    // Apply search filter
    if (searchQuery) {
      games = games.filter(
        game =>
          game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.genre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    if (filters.genres.length > 0) {
      games = games.filter(game => filters.genres.includes(game.genre));
    }
    if (filters.minRating > 0) {
      games = games.filter(game => game.rating >= filters.minRating);
    }
    if (filters.hasAchievements) {
      games = games.filter(game => game.hasAchievements);
    }
    if (filters.hasMultiplayer) {
      games = games.filter(game => game.isMultiplayer);
    }

    // Apply sorting
    games.sort((a, b) => {
      let comparison = 0;

      switch (sortOption) {
        case 'alphabetical_asc':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'alphabetical_desc':
          comparison = b.title.localeCompare(a.title);
          break;
        case 'most_played':
          comparison = (b.playTime || 0) - (a.playTime || 0);
          break;
        case 'least_played':
          comparison = (a.playTime || 0) - (b.playTime || 0);
          break;
        case 'highest_rated':
          comparison = b.rating - a.rating;
          break;
        case 'recently_played':
          comparison = (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0);
          break;
        case 'recently_added':
        default:
          comparison = b.addedAt.getTime() - a.addedAt.getTime();
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });

    return games;
  }, [
    libraryGames,
    selectedCollection,
    searchQuery,
    filters,
    sortOption,
    sortDirection,
    collections,
  ]);

  // Stats calculation
  const stats = useMemo(
    () => ({
      total: libraryGames.length,
      favorites: libraryGames.filter(g => g.isFavorite).length,
      playing: libraryGames.filter(g => g.collection === 'playing').length,
      completed: libraryGames.filter(g => g.progress === 100).length,
    }),
    [libraryGames]
  );

  // Toggle search
  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSearch(!showSearch);

    Animated.timing(searchAnim, {
      toValue: showSearch ? 0 : 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  };

  // View mode handlers
  const handleViewModeChange = (mode: ViewMode) => {
    haptics.impact('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(mode);
  };

  // Collection handlers
  const handleCollectionPress = (collectionId: string) => {
    haptics.impact('light');
    setSelectedCollection(selectedCollection === collectionId ? null : collectionId);
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;

    const newCollection: Collection = {
      id: Date.now().toString(),
      name: newCollectionName,
      emoji: newCollectionEmoji,
      gameIds: [],
      isDefault: false,
      createdAt: new Date(),
    };

    setCollections([...collections, newCollection]);
    setNewCollectionName('');
    setNewCollectionEmoji('📁');
    setShowNewCollectionModal(false);
    (haptics as any).success();
  };

  // Game handlers
  const handleGamePress = (game: unknown) => {
    if (isSelectMode) {
      toggleGameSelection(game.id);
    } else {
      haptics.impact('light');
      navigation.navigate('GameDetail', { game } as unknown);
    }
  };

  const toggleGameSelection = (gameId: string) => {
    haptics.selection();
    setSelectedGames(prev =>
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  // Batch operations
  const handleBatchMove = (_collectionId: string) => {
    // Move selected games to collection
    (haptics as any).success();
    setSelectedGames([]);
    setIsSelectMode(false);
  };

  const handleBatchRemove = () => {
    // Remove selected games
    haptics.warning();
    setSelectedGames([]);
    setIsSelectMode(false);
  };

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      (haptics as any).success();
    }, 1500);
  };

  // Render header
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>My Library</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={toggleSearch} style={styles.headerButton}>
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => setShowSortModal(true)} style={styles.headerButton}>
            <Ionicons name="swap-vertical" size={24} color="#FFFFFF" />
            {sortOption !== 'recently_added' && <View style={styles.activeBadge} />}
          </Pressable>
          <Pressable onPress={() => setShowFilterModal(true)} style={styles.headerButton}>
            <Ionicons name="filter" size={24} color="#FFFFFF" />
            {Object.values(filters).some(v => (Array.isArray(v) ? v.length > 0 : v)) && (
              <View style={styles.activeBadge} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={styles.statBubble}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBubble, { backgroundColor: '#FF0066' }]}>
          <Text style={styles.statNumber}>{stats.favorites}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        <View style={[styles.statBubble, { backgroundColor: '#FFAA00' }]}>
          <Text style={styles.statNumber}>{stats.playing}</Text>
          <Text style={styles.statLabel}>Playing</Text>
        </View>
        <View style={[styles.statBubble, { backgroundColor: '#00FF88' }]}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </ScrollView>

      {/* Search Bar */}
      {showSearch && (
        <Animated.View
          style={[
            styles.searchContainer,
            {
              opacity: searchAnim,
              transform: [
                {
                  translateY: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search games..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </Pressable>
            )}
          </View>
          {searchQuery.length > 0 && (
            <Text style={styles.searchResults}>{filteredAndSortedGames.length} results</Text>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );

  // Render view mode toggle
  const renderViewModeToggle = () => (
    <View style={styles.viewModeContainer}>
      <Pressable
        onPress={() => handleViewModeChange('grid')}
        style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeActive]}
      >
        <Ionicons name="grid" size={20} color={viewMode === 'grid' ? '#00FF88' : '#666'} />
      </Pressable>
      <Pressable
        onPress={() => handleViewModeChange('list')}
        style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeActive]}
      >
        <Ionicons name="list" size={20} color={viewMode === 'list' ? '#00FF88' : '#666'} />
      </Pressable>
      <Pressable
        onPress={() => handleViewModeChange('card')}
        style={[styles.viewModeButton, viewMode === 'card' && styles.viewModeActive]}
      >
        <MaterialCommunityIcons
          name="card-text"
          size={20}
          color={viewMode === 'card' ? '#00FF88' : '#666'}
        />
      </Pressable>
    </View>
  );

  // Render collections
  const renderCollections = () => (
    <View style={styles.collectionsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Collections</Text>
        <Pressable onPress={() => setShowNewCollectionModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={20} color="#00FF88" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {collections.map(collection => {
          const gameCount = collection.gameIds.length;
          const isSelected = selectedCollection === collection.id;

          return (
            <Pressable
              key={collection.id}
              onPress={() => handleCollectionPress(collection.id)}
              onLongPress={() => !collection.isDefault && haptics.warning()}
              style={[styles.collectionCard, isSelected && styles.collectionCardActive]}
            >
              <Text style={styles.collectionEmoji}>{collection.emoji}</Text>
              <Text style={styles.collectionName}>{collection.name}</Text>
              <Text style={styles.collectionCount}>{gameCount} games</Text>
              {!collection.isDefault && (
                <Pressable style={styles.collectionEdit}>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // Render game item based on view mode
  const renderGameItem = ({ item: game }: { item: any }) => {
    const isSelected = selectedGames.includes(game.id);
    const scaleAnim = getScaleAnim(game.id);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        ...SPRING_CONFIGS.TIGHT,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...SPRING_CONFIGS.BOUNCY,
        useNativeDriver: true,
      }).start();
    };

    if (viewMode === 'grid') {
      return (
        <Pressable
          onPress={() => handleGamePress(game)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={() => setIsSelectMode(true)}
          style={styles.gridItem}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Image source={{ uri: game.coverImageUrl }} style={styles.gridImage} />
            {game.progress > 0 && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${game.progress}%` }]} />
              </View>
            )}
            <Text style={styles.gridTitle} numberOfLines={2}>
              {game.title}
            </Text>
            {isSelectMode && (
              <View style={[styles.selectionIndicator, isSelected && styles.selectionActive]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
              </View>
            )}
          </Animated.View>
        </Pressable>
      );
    }

    if (viewMode === 'list') {
      return (
        <Pressable
          onPress={() => handleGamePress(game)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={() => setIsSelectMode(true)}
          style={styles.listItem}
        >
          <Animated.View style={[styles.listContent, { transform: [{ scale: scaleAnim }] }]}>
            <Image source={{ uri: game.coverImageUrl }} style={styles.listImage} />
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{game.title}</Text>
              <Text style={styles.listMeta}>
                {game.genre} • 0m trial
              </Text>
              {game.progress > 0 && (
                <View style={styles.listProgress}>
                  <Text style={styles.listProgressText}>{Math.round(game.progress)}%</Text>
                  <View style={styles.listProgressBar}>
                    <View style={[styles.listProgressFill, { width: `${game.progress}%` }]} />
                  </View>
                </View>
              )}
            </View>
            <View style={styles.listActions}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.listRating}>{game.rating.toFixed(1)}</Text>
            </View>
            {isSelectMode && (
              <View style={[styles.selectionIndicator, isSelected && styles.selectionActive]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
              </View>
            )}
          </Animated.View>
        </Pressable>
      );
    }

    // Card view
    return (
      <Pressable
        onPress={() => handleGamePress(game)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => setIsSelectMode(true)}
        style={styles.cardItem}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Image source={{ uri: game.coverImageUrl }} style={styles.cardImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cardGradient}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{game.title}</Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {game.description || 'Experience this amazing game'}
              </Text>
              <View style={styles.cardMeta}>
                <View style={styles.cardMetaItem}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.cardMetaText}>{game.rating.toFixed(1)}</Text>
                </View>
                <View style={styles.cardMetaItem}>
                  <Ionicons name="time" size={14} color="#00FF88" />
                  <Text style={styles.cardMetaText}>0m</Text>
                </View>
                {game.progress > 0 && (
                  <View style={styles.cardMetaItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#00FF88" />
                    <Text style={styles.cardMetaText}>{Math.round(game.progress)}%</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
          {isSelectMode && (
            <View style={[styles.selectionIndicator, isSelected && styles.selectionActive]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
            </View>
          )}
        </Animated.View>
      </Pressable>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="game-controller" size={64} color="#333" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No games found' : 'Your library is empty'}
      </Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'Try adjusting your search or filters'
          : 'Start adding games to build your collection'}
      </Text>
    </View>
  );

  // Render sort modal
  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort By</Text>
            <Pressable onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll}>
            {[
              { value: 'recently_added', label: 'Recently Added' },
              { value: 'alphabetical_asc', label: 'A to Z' },
              { value: 'alphabetical_desc', label: 'Z to A' },
              { value: 'most_played', label: 'Most Played' },
              { value: 'least_played', label: 'Least Played' },
              { value: 'highest_rated', label: 'Highest Rated' },
              { value: 'recently_played', label: 'Recently Played' },
              { value: 'genre', label: 'By Genre' },
              { value: 'developer', label: 'By Developer' },
              { value: 'trial_duration', label: 'Trial Duration' },
            ].map(option => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSortOption(option.value as SortOption);
                  setShowSortModal(false);
                  haptics.selection();
                }}
                style={[styles.sortOption, sortOption === option.value && styles.sortOptionActive]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortOption === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortOption === option.value && (
                  <Ionicons name="checkmark" size={20} color="#00FF88" />
                )}
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sortDirectionContainer}>
            <Text style={styles.sortDirectionLabel}>Direction</Text>
            <View style={styles.sortDirectionToggle}>
              <Pressable
                onPress={() => setSortDirection('asc')}
                style={[
                  styles.sortDirectionButton,
                  sortDirection === 'asc' && styles.sortDirectionActive,
                ]}
              >
                <Ionicons
                  name="arrow-up"
                  size={16}
                  color={sortDirection === 'asc' ? '#00FF88' : '#666'}
                />
              </Pressable>
              <Pressable
                onPress={() => setSortDirection('desc')}
                style={[
                  styles.sortDirectionButton,
                  sortDirection === 'desc' && styles.sortDirectionActive,
                ]}
              >
                <Ionicons
                  name="arrow-down"
                  size={16}
                  color={sortDirection === 'desc' ? '#00FF88' : '#666'}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: '90%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <View style={styles.modalHeaderActions}>
              <Pressable
                onPress={() => {
                  setFilters({
                    genres: [],
                    platforms: [],
                    playStatus: [],
                    minRating: 0,
                    trialDuration: { min: 3, max: 60 },
                    hasAchievements: false,
                    hasMultiplayer: false,
                  });
                  haptics.impact('light');
                }}
                style={styles.resetButton}
              >
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Genres */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Genres</Text>
              <View style={styles.filterChips}>
                {[
                  'Action',
                  'Puzzle',
                  'Strategy',
                  'Racing',
                  'Sports',
                  'RPG',
                  'Simulation',
                  'Adventure',
                ].map(genre => (
                  <Pressable
                    key={genre}
                    onPress={() => {
                      setFilters(prev => ({
                        ...prev,
                        genres: prev.genres.includes(genre)
                          ? prev.genres.filter(g => g !== genre)
                          : [...prev.genres, genre],
                      }));
                      haptics.selection();
                    }}
                    style={[
                      styles.filterChip,
                      filters.genres.includes(genre) && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.genres.includes(genre) && styles.filterChipTextActive,
                      ]}
                    >
                      {genre}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Play Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Play Status</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'not_started', label: 'Not Started' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ].map(status => (
                  <Pressable
                    key={status.value}
                    onPress={() => {
                      setFilters(prev => ({
                        ...prev,
                        playStatus: prev.playStatus.includes(status.value)
                          ? prev.playStatus.filter(s => s !== status.value)
                          : [...prev.playStatus, status.value],
                      }));
                      haptics.selection();
                    }}
                    style={styles.filterCheckbox}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        filters.playStatus.includes(status.value) && styles.checkboxActive,
                      ]}
                    >
                      {filters.playStatus.includes(status.value) && (
                        <Ionicons name="checkmark" size={16} color="#000" />
                      )}
                    </View>
                    <Text style={styles.filterCheckboxLabel}>{status.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Minimum Rating */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
              <View style={styles.ratingFilter}>
                {[0, 3, 3.5, 4, 4.5].map(rating => (
                  <Pressable
                    key={rating}
                    onPress={() => {
                      setFilters(prev => ({ ...prev, minRating: rating }));
                      haptics.selection();
                    }}
                    style={[
                      styles.ratingButton,
                      filters.minRating === rating && styles.ratingButtonActive,
                    ]}
                  >
                    <View style={styles.ratingStars}>
                      {rating > 0 && <Ionicons name="star" size={16} color="#FFD700" />}
                      <Text
                        style={[
                          styles.ratingButtonText,
                          filters.minRating === rating && styles.ratingButtonTextActive,
                        ]}
                      >
                        {rating === 0 ? 'Any' : `${rating}+`}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Other Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Other</Text>
              <Pressable
                onPress={() => {
                  setFilters(prev => ({ ...prev, hasAchievements: !prev.hasAchievements }));
                  haptics.selection();
                }}
                style={styles.filterSwitch}
              >
                <Text style={styles.filterSwitchLabel}>Has Achievements</Text>
                <Switch
                  value={filters.hasAchievements}
                  onValueChange={value => setFilters(prev => ({ ...prev, hasAchievements: value }))}
                  trackColor={{ false: '#333', true: '#00FF88' }}
                  thumbColor={filters.hasAchievements ? '#FFFFFF' : '#666'}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  setFilters(prev => ({ ...prev, hasMultiplayer: !prev.hasMultiplayer }));
                  haptics.selection();
                }}
                style={styles.filterSwitch}
              >
                <Text style={styles.filterSwitchLabel}>Multiplayer Support</Text>
                <Switch
                  value={filters.hasMultiplayer}
                  onValueChange={value => setFilters(prev => ({ ...prev, hasMultiplayer: value }))}
                  trackColor={{ false: '#333', true: '#00FF88' }}
                  thumbColor={filters.hasMultiplayer ? '#FFFFFF' : '#666'}
                />
              </Pressable>
            </View>
          </ScrollView>

          <Pressable
            onPress={() => {
              setShowFilterModal(false);
              (haptics as any).success();
            }}
            style={styles.applyButton}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // Render new collection modal
  const renderNewCollectionModal = () => (
    <Modal
      visible={showNewCollectionModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowNewCollectionModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowNewCollectionModal(false)}>
        <Pressable style={styles.newCollectionModal} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>New Collection</Text>

          <View style={styles.emojiPicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['📁', '🎮', '⭐', '🏆', '🎯', '🎨', '🎪', '🎭', '🎸', '🎺'].map(emoji => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    setNewCollectionEmoji(emoji);
                    haptics.selection();
                  }}
                  style={[
                    styles.emojiOption,
                    newCollectionEmoji === emoji && styles.emojiOptionActive,
                  ]}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <TextInput
            style={styles.collectionNameInput}
            placeholder="Collection name"
            placeholderTextColor="#666"
            value={newCollectionName}
            onChangeText={setNewCollectionName}
            autoFocus
          />

          <View style={styles.modalActions}>
            <Pressable
              onPress={() => setShowNewCollectionModal(false)}
              style={[styles.modalButton, styles.modalButtonCancel]}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreateCollection}
              style={[styles.modalButton, styles.modalButtonCreate]}
            >
              <Text style={[styles.modalButtonText, { color: '#000' }]}>Create</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderViewModeToggle()}
      {renderCollections()}

      {/* Batch operations bar */}
      {isSelectMode && (
        <View style={styles.batchBar}>
          <Text style={styles.batchText}>{selectedGames.length} selected</Text>
          <View style={styles.batchActions}>
            <Pressable style={styles.batchButton} onPress={() => handleBatchMove('favorites')}>
              <Ionicons name="heart" size={20} color="#FF0066" />
            </Pressable>
            <Pressable style={styles.batchButton} onPress={() => handleBatchMove('play_later')}>
              <Ionicons name="time" size={20} color="#00FF88" />
            </Pressable>
            <Pressable style={styles.batchButton} onPress={handleBatchRemove}>
              <Ionicons name="trash" size={20} color="#FF4444" />
            </Pressable>
            <Pressable
              style={styles.batchButton}
              onPress={() => {
                setIsSelectMode(false);
                setSelectedGames([]);
              }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Games list */}
      <FlatList
        data={filteredAndSortedGames}
        renderItem={renderGameItem}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? (isPortrait ? 3 : 4) : 1}
        key={`${viewMode}-${isPortrait}`} // Force re-render when changing columns or orientation
        contentContainerStyle={[
          styles.gamesList,
          filteredAndSortedGames.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00FF88"
            colors={['#00FF88']}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modals */}
      {renderSortModal()}
      {renderFilterModal()}
      {renderNewCollectionModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
  },
  statsContainer: {
    marginBottom: 12,
  },
  statBubble: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#FFFFFF',
  },
  searchResults: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginLeft: 4,
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 3,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 7,
  },
  viewModeActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  collectionsSection: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  collectionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginLeft: 16,
    width: 110,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  collectionCardActive: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  collectionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  collectionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  collectionCount: {
    fontSize: 12,
    color: '#666',
  },
  collectionEdit: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gamesList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyList: {
    flex: 1,
  },
  gridItem: {
    flex: 1,
    margin: 4,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 0.85,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 4,
  },
  progressBar: {
    position: 'absolute',
    bottom: 35,
    left: 6,
    right: 6,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 2,
  },
  listItem: {
    marginVertical: 4,
  },
  listContent: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  listImage: {
    width: 50,
    height: 65,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  listInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 13,
    color: '#666',
  },
  listProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  listProgressText: {
    fontSize: 12,
    color: '#00FF88',
    marginRight: 8,
  },
  listProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  listProgressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 2,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  listRating: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  cardItem: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#000',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'flex-end',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  batchBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  batchText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  batchActions: {
    flexDirection: 'row',
    gap: 16,
  },
  batchButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalScroll: {
    maxHeight: 400,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sortOptionActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  sortOptionTextActive: {
    color: '#00FF88',
    fontWeight: '600',
  },
  sortDirectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  sortDirectionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  sortDirectionToggle: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 4,
  },
  sortDirectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sortDirectionActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetText: {
    fontSize: 14,
    color: '#FF0066',
    fontWeight: '600',
  },
  filterSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#222',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
  },
  filterChipText: {
    fontSize: 12,
    color: '#999',
  },
  filterChipTextActive: {
    color: '#00FF88',
    fontWeight: '600',
  },
  filterOptions: {
    gap: 12,
  },
  filterCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  filterCheckboxLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  ratingFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#222',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  ratingButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingButtonText: {
    fontSize: 14,
    color: '#999',
  },
  ratingButtonTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  filterSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  filterSwitchLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  applyButton: {
    backgroundColor: '#00FF88',
    marginHorizontal: 12,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  newCollectionModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 80,
    borderWidth: 1,
    borderColor: '#333',
  },
  emojiPicker: {
    marginVertical: 16,
  },
  emojiOption: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 2,
    borderColor: '#333',
  },
  emojiOptionActive: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  emojiText: {
    fontSize: 20,
  },
  collectionNameInput: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtonCreate: {
    backgroundColor: '#00FF88',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
