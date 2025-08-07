
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';

type LibraryTab = 'all' | 'favorites' | 'in-progress' | 'completed';

interface GameLibraryItem {
  id: string;
  title: string;
  coverImage: string;
  progress?: number; // 0-100
  isFavorite: boolean;
  isCompleted: boolean;
}

interface GameLibraryPreviewProps {
  games: {
    all: GameLibraryItem[];
    favorites: GameLibraryItem[];
    inProgress: GameLibraryItem[];
    completed: GameLibraryItem[];
  };
  counts: {
    all: number;
    favorites: number;
    inProgress: number;
    completed: number;
  };
  onViewAll?: () => void;
  onGamePress?: (game: GameLibraryItem) => void;
}

export const GameLibraryPreview: React.FC<GameLibraryPreviewProps> = ({
  games = {
    all: [],
    favorites: [],
    inProgress: [],
    completed: [],
  },
  counts = {
    all: 0,
    favorites: 0,
    inProgress: 0,
    completed: 0,
  },
  onViewAll,
  onGamePress,
}) => {
  const haptics = useHaptics();
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array(6)
      .fill(0)
      .map(() => new Animated.Value(0.8))
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      ...scaleAnims.map((anim, index) =>
        Animated.spring(anim, {
          ...SPRING_CONFIGS.BOUNCY,
          toValue: 1,
          delay: index * 50,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const handleTabPress = (tab: LibraryTab) => {
    haptics.impact('light');
    setActiveTab(tab);

    // Animate tab indicator
    Animated.spring(slideAnim, {
      ...SPRING_CONFIGS.QUICK,
      toValue: getTabPosition(tab),
      useNativeDriver: true,
    }).start();

    // Re-animate games
    scaleAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(anim, {
          ...SPRING_CONFIGS.BOUNCY,
          toValue: 1,
          delay: index * 30,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleViewAll = () => {
    haptics.impact('light');
    if (onViewAll) onViewAll();
  };

  const handleGamePress = (game: GameLibraryItem) => {
    haptics.impact('light');
    if (onGamePress) onGamePress(game);
  };

  const getTabPosition = (tab: LibraryTab) => {
    const tabs: LibraryTab[] = ['all', 'favorites', 'in-progress', 'completed'];
    const index = tabs.indexOf(tab);
    return index * 25; // Percentage width
  };

  const tabs: { key: LibraryTab; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'grid' },
    { key: 'favorites', label: 'Favorites', icon: 'heart' },
    { key: 'in-progress', label: 'Playing', icon: 'play-circle' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle' },
  ];

  const getGamesForTab = (tab: LibraryTab) => {
    switch (tab) {
      case 'all':
        return games.all || [];
      case 'favorites':
        return games.favorites || [];
      case 'in-progress':
        return games.inProgress || [];
      case 'completed':
        return games.completed || [];
      default:
        return [];
    }
  };

  const displayGames = getGamesForTab(activeTab).slice(0, 6);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>GAME LIBRARY</Text>
        <Pressable onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>VIEW ALL</Text>
          <Ionicons name="chevron-forward" size={16} color="#00FFFF" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={activeTab === tab.key ? '#FF2D55' : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <Text style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                {counts[tab.key]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Tab Indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      {/* Games Grid */}
      <View style={styles.gamesGrid}>
        {displayGames.map((game, index) => (
          <Pressable key={game.id} onPress={() => handleGamePress(game)} style={styles.gameItem}>
            <Animated.View
              style={[
                styles.gameCard,
                {
                  transform: [{ scale: scaleAnims[index] }],
                },
              ]}
            >
              <Image source={{ uri: game.coverImage }} style={styles.gameImage} />

              {/* Progress Overlay */}
              {game.progress !== undefined && game.progress > 0 && (
                <View style={styles.progressOverlay}>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.progressGradient}
                  />
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${game.progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{game.progress}%</Text>
                </View>
              )}

              {/* Favorite Badge */}
              {game.isFavorite && (
                <View style={styles.favoriteBadge}>
                  <Ionicons name="heart" size={16} color="#FF2D55" />
                </View>
              )}

              {/* Completed Badge */}
              {game.isCompleted && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#00FF88" />
                </View>
              )}
            </Animated.View>
          </Pressable>
        ))}

        {/* View More Card */}
        {counts[activeTab] > 6 && (
          <Pressable onPress={handleViewAll} style={styles.gameItem}>
            <LinearGradient
              colors={['rgba(0,255,255,0.1)', 'rgba(0,255,255,0.05)']}
              style={styles.viewMoreCard}
            >
              <Ionicons name="add-circle" size={32} color="#00FFFF" />
              <Text style={styles.viewMoreText}>+{counts[activeTab] - 6}</Text>
              <Text style={styles.viewMoreSubtext}>MORE</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  tabsContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  tabsScroll: {
    paddingHorizontal: 24,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  tabActive: {
    // Active styles applied to children
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  tabTextActive: {
    color: '#FF2D55',
  },
  tabCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabCountActive: {
    color: '#FF2D55',
    backgroundColor: 'rgba(255,45,85,0.2)',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    width: '25%',
    height: 2,
    backgroundColor: '#FF2D55',
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  gameItem: {
    width: '33.33%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  gameCard: {
    aspectRatio: 0.75,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gameImage: {
    width: '100%',
    height: '100%',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  progressGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 1.5,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreCard: {
    aspectRatio: 0.75,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
  },
  viewMoreText: {
    color: '#00FFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  viewMoreSubtext: {
    color: 'rgba(0,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
