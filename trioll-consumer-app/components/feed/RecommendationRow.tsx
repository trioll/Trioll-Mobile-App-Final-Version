import type { Game } from '../../types';

import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SPRING_CONFIGS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface RecommendationRowProps {
  title: string;
  subtitle?: string;
  games: Game[];
  onGamePress: (game: Game) => void;
  type: 'because-you-played' | 'popular-in-category' | 'friends-playing';
  icon?: string;
  iconColor?: string;
}

export const RecommendationRow: React.FC<RecommendationRowProps> = ({
  title,
  subtitle,
  games,
  onGamePress,
  type,
  icon,
  iconColor = '#FF2D55',
}) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const CARD_WIDTH = SCREEN_WIDTH * 0.4;
  const CARD_HEIGHT = CARD_WIDTH * 1.4;

  const haptics = useHaptics();
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  const handleGamePress = (game: Game) => {
    haptics.impact('light');

    const scaleAnim = getScaleAnim(game.id);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        ...SPRING_CONFIGS.QUICK,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onGamePress(game);
    });
  };

  const getIcon = () => {
    if (icon) return icon;

    switch (type) {
      case 'because-you-played':
        return 'game-controller';
      case 'popular-in-category':
        return 'trending-up';
      case 'friends-playing':
        return 'people';
      default:
        return 'sparkles';
    }
  };

  if (games.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons
            name={getIcon() as keyof typeof Ionicons.glyphMap}
            size={20}
            color={iconColor}
            style={{
              marginRight: 8,
              textShadowColor: iconColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 4,
            }}
          />
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        <Pressable style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>SEE ALL</Text>
          <Ionicons name="chevron-forward" size={16} color="#00FFFF" />
        </Pressable>
      </View>

      {/* Games Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
      >
        {games.map(game => (
          <Pressable
            key={game.id}
            onPress={() => handleGamePress(game)}
            style={styles.gameCardWrapper}
          >
            <Animated.View
              style={[
                styles.gameCard,
                {
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  transform: [{ scale: getScaleAnim(game.id) }],
                },
              ]}
            >
              {/* Game Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: game.coverImageUrl }}
                  style={styles.gameImage}
                  resizeMode="cover"
                />

                {/* Gradient Overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.gradient}
                />

                {/* Game Info */}
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTitle} numberOfLines={2}>
                    {game.title}
                  </Text>
                  <Text style={styles.gameCategory}>{game.genre?.toUpperCase()}</Text>
                </View>

                {/* Badges */}
                <View style={styles.badges}>
                  {game.isTrending && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>🔥 HOT</Text>
                    </View>
                  )}
                  {game.isNew && (
                    <View style={[styles.badge, styles.newBadge]}>
                      <Text style={styles.badgeText}>NEW</Text>
                    </View>
                  )}
                </View>

                {/* Rating */}
                <View style={styles.rating}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.ratingText}>{game.rating}</Text>
                </View>
              </View>
            </Animated.View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  seeAllText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  gameCardWrapper: {
    marginRight: 16,
  },
  gameCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  gameImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  gameInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gameCategory: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  badges: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#FF0066',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
  },
  newBadge: {
    backgroundColor: '#FFFF00',
  },
  badgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rating: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
});
