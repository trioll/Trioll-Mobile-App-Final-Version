import type { Game } from './../../src/types/api.types';
import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Dimensions, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';

import { LoadingSkeleton } from './LoadingSkeleton';

type SortOptionValue = 'relevance' | 'popular' | 'newest' | 'rating' | 'alphabetical';

interface SortOption {
  label: string;
  value: SortOptionValue;
  key: string;
}

interface SearchResultsProps {
  results: Game[];
  viewMode: 'grid' | 'list' | 'compact';
  sortBy: 'relevance' | 'popular' | 'newest' | 'rating' | 'alphabetical';
  isLoading: boolean;
  onSortChange: (sort: 'relevance' | 'popular' | 'newest' | 'rating' | 'alphabetical') => void;
  onViewModeChange: (mode: 'grid' | 'list' | 'compact') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  highlightTerms?: string[];
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  viewMode,
  sortBy,
  isLoading,
  onSortChange,
  onViewModeChange,
  onRefresh,
  isRefreshing,
  highlightTerms = [],
  onLoadMore,
  isLoadingMore = false,
}) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;
  const navigation = useNavigation<any>();
  const [showSortMenu, setShowSortMenu] = React.useState(false);
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const styles = React.useMemo(() => createStyles(GRID_ITEM_WIDTH), [GRID_ITEM_WIDTH]);

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

  const highlightText = (text: string) => {
    if (!highlightTerms.length) return text;

    const regex = new RegExp(`(${highlightTerms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isHighlighted = highlightTerms.some(term => part.toLowerCase() === term.toLowerCase());

      return (
        <Text key={index} style={isHighlighted ? styles.highlightedText : undefined}>
          {part}
        </Text>
      );
    });
  };

  const handleGamePress = (game: Game) => {
    animatePress(game.id);
    navigation.navigate('GameDetail' as keyof RootStackParamList, { gameId: game.id } as any);
  };

  const renderGridItem = ({ item }: { item: Game }) => (
    <Pressable style={styles.gridItem} onPress={() => handleGamePress(item)}>
      <Animated.View style={{ transform: [{ scale: getScaleAnim(item.id) }] }}>
        <Image source={{ uri: item.thumbnailUrl || item.coverImageUrl }} style={styles.gridImage} />
        <View style={styles.gridOverlay}>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {highlightText(item.title)}
          </Text>
          <View style={styles.gridMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.trialLength}>0m</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );

  const renderListItem = ({ item }: { item: Game }) => (
    <Pressable style={styles.listItem} onPress={() => handleGamePress(item)}>
      <Animated.View
        style={[styles.listItemContent, { transform: [{ scale: getScaleAnim(item.id) }] }]}
      >
        <Image source={{ uri: item.thumbnailUrl || item.coverImageUrl }} style={styles.listImage} />
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {highlightText(item.title)}
          </Text>
          <Text style={styles.listGenre}>{item.genre}</Text>
          <View style={styles.listMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.listSeparator}>•</Text>
            <Text style={styles.trialLength}>0 min trial</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );

  const renderCompactItem = ({ item }: { item: Game }) => (
    <Pressable style={styles.compactItem} onPress={() => handleGamePress(item)}>
      <Animated.View
        style={[styles.compactItemContent, { transform: [{ scale: getScaleAnim(item.id) }] }]}
      >
        <Image source={{ uri: item.thumbnailUrl || item.coverImageUrl }} style={styles.compactImage} />
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {highlightText(item.title)}
          </Text>
          <View style={styles.compactMeta}>
            <Text style={styles.compactGenre}>{item.genre}</Text>
            <Text style={styles.compactSeparator}>•</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={styles.compactRating}>{item.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.compactSeparator}>•</Text>
            <Text style={styles.compactTrial}>0m</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </Animated.View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search" size={64} color="#FFFFFF" />
      <Text style={styles.emptyTitle}>NO GAMES FOUND</Text>
      <Text style={styles.emptyText}>Try adjusting your filters or search terms</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#00FF88" />
        <Text style={styles.loadingMoreText}>Loading more games...</Text>
      </View>
    );
  };

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'alphabetical', label: 'A-Z' },
  ];

  if (isLoading && results.length === 0) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  return (
    <View style={styles.container}>
      {/* Sort and View Controls */}
      <View style={styles.controls}>
        <Pressable style={styles.sortButton} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Ionicons name="swap-vertical" size={18} color="#FFFFFF" />
          <Text style={styles.sortText}>
            {sortOptions.find(opt => opt.value === sortBy)?.label}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
        </Pressable>

        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
            onPress={() => onViewModeChange('grid')}
          >
            <Ionicons name="grid" size={18} color={viewMode === 'grid' ? '#00FF88' : '#FFFFFF'} />
          </Pressable>
          <Pressable
            style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
            onPress={() => onViewModeChange('list')}
          >
            <Ionicons name="list" size={18} color={viewMode === 'list' ? '#00FF88' : '#FFFFFF'} />
          </Pressable>
          <Pressable
            style={[styles.viewButton, viewMode === 'compact' && styles.viewButtonActive]}
            onPress={() => onViewModeChange('compact')}
          >
            <Ionicons
              name="menu"
              size={18}
              color={viewMode === 'compact' ? '#00FF88' : '#FFFFFF'}
            />
          </Pressable>
        </View>
      </View>

      {/* Sort Menu Dropdown */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {sortOptions.map(option => (
            <Pressable
              key={option.value}
              style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
              onPress={() => {
                onSortChange(option.value);
                setShowSortMenu(false);
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
              {sortBy === option.value && <Ionicons name="checkmark" size={18} color="#00FF88" />}
            </Pressable>
          ))}
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        renderItem={
          viewMode === 'grid'
            ? renderGridItem
            : viewMode === 'list'
              ? renderListItem
              : renderCompactItem
        }
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when switching modes
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#00FF88" />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

const createStyles = (GRID_ITEM_WIDTH: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.2)',
      backgroundColor: '#000000',
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
    },
    sortText: {
      color: '#FFFFFF',
      fontSize: 14,
      marginHorizontal: 6,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: '#000000',
      borderRadius: 0,
      padding: 0,
      borderWidth: 1,
      borderColor: '#FFFFFF',
    },
    viewButton: {
      padding: 8,
      borderRadius: 0,
    },
    viewButtonActive: {
      backgroundColor: '#000000',
      borderColor: '#00FF88',
      shadowColor: '#00FF88',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 5,
      elevation: 5,
    },
    sortMenu: {
      position: 'absolute',
      top: 60,
      left: 24,
      right: 24,
      backgroundColor: '#000000',
      borderRadius: 0,
      padding: 0,
      zIndex: 1000,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
    },
    sortOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    sortOptionActive: {
      backgroundColor: 'rgba(0, 255, 136, 0.1)',
    },
    sortOptionText: {
      color: '#999999',
      fontSize: 16,
      fontWeight: '500',
    },
    sortOptionTextActive: {
      color: '#00FF88',
      fontWeight: '700',
      textShadowColor: '#00FF88',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 3,
    },
    listContent: {
      paddingVertical: 8,
    },
    gridRow: {
      paddingHorizontal: 16,
      justifyContent: 'space-between',
    },
    gridItem: {
      width: GRID_ITEM_WIDTH,
      marginBottom: 16,
      borderRadius: 0,
      overflow: 'hidden',
      backgroundColor: '#000000',
      borderWidth: 1,
      borderColor: '#FFFFFF',
    },
    gridImage: {
      width: '100%',
      height: GRID_ITEM_WIDTH * 1.2,
    },
    gridOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    gridTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    gridMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    listItem: {
      paddingHorizontal: 16,
    },
    listItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000000',
      borderRadius: 0,
      padding: 16,
      borderWidth: 1,
      borderColor: '#FFFFFF',
    },
    listImage: {
      width: 60,
      height: 60,
      borderRadius: 0,
      borderWidth: 1,
      borderColor: '#FFFFFF',
    },
    listInfo: {
      flex: 1,
      marginLeft: 12,
    },
    listTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    listGenre: {
      color: '#999999',
      fontSize: 14,
      marginBottom: 6,
      fontWeight: '500',
    },
    listMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    listSeparator: {
      color: '#FFFFFF',
      marginHorizontal: 8,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      color: '#FFFFFF',
      fontSize: 12,
      marginLeft: 4,
      fontWeight: '600',
    },
    trialLength: {
      color: '#999999',
      fontSize: 12,
      fontWeight: '500',
    },
    separator: {
      height: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '700',
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    emptyText: {
      color: '#999999',
      fontSize: 16,
      marginTop: 8,
      fontWeight: '500',
    },
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    loadingMoreText: {
      color: '#666',
      fontSize: 12,
      marginTop: 8,
      fontWeight: '500',
    },
    compactItem: {
      paddingHorizontal: 16,
    },
    compactItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000000',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    compactImage: {
      width: 40,
      height: 40,
      borderRadius: 0,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    compactInfo: {
      flex: 1,
      marginLeft: 12,
    },
    compactTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    compactMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    compactGenre: {
      color: '#666',
      fontSize: 11,
      fontWeight: '500',
    },
    compactSeparator: {
      color: '#333',
      marginHorizontal: 6,
      fontSize: 11,
    },
    compactRating: {
      color: '#999',
      fontSize: 11,
      marginLeft: 2,
      fontWeight: '500',
    },
    compactTrial: {
      color: '#666',
      fontSize: 11,
      fontWeight: '500',
    },
    highlightedText: {
      backgroundColor: 'rgba(0, 255, 136, 0.3)',
      color: '#00FF88',
      fontWeight: '700',
    },
  });
