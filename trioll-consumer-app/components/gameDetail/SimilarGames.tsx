
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { gamePlaceholderImages } from '../../utils/placeholderImages';

interface SimilarGamesProps {
  currentGameId: string;
  genre: string;
}

interface SimilarGame {
  id: string;
  title: string;
  coverImage: string;
  rating: number;
  trialDuration: number;
  developer: string;
}

export const SimilarGames: React.FC<SimilarGamesProps> = ({
  currentGameId: _currentGameId,
  genre,
}) => {
  const navigation = useNavigation<StackNavigationProp<any>>();

  // Mock similar games
  const similarGames: SimilarGame[] = [
    {
      id: 'similar1',
      title: 'Epic Quest',
      coverImage: gamePlaceholderImages['island-quest-001'] || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Island-Quest/thumbnail.png',
      rating: 4.7,
      trialDuration: 5,
      developer: 'Quest Studios',
    },
    {
      id: 'similar2',
      title: 'Battle Arena',
      coverImage: gamePlaceholderImages['battle-royale-001'] || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Battle-Legends/thumbnail.png',
      rating: 4.5,
      trialDuration: 7,
      developer: 'Arena Games',
    },
    {
      id: 'similar3',
      title: 'Mystic Adventure',
      coverImage: gamePlaceholderImages['mystic-journey-001'] || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Crystal-Saga/thumbnail.png',
      rating: 4.8,
      trialDuration: 5,
      developer: 'Mystic Dev',
    },
    {
      id: 'similar4',
      title: 'Speed Rush',
      coverImage: gamePlaceholderImages['speed-rush-001'] || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Turbo-Racing/thumbnail.png',
      rating: 4.4,
      trialDuration: 3,
      developer: 'Rush Games',
    },
  ];

  const handleGamePress = (game: SimilarGame) => {
    // Navigate to game detail
    navigation.push('GameDetail' as unknown, {
      game: {
        ...game,
        genre,
        platform: 'both',
        ageRating: 'everyone',
        description: "An amazing game that you'll love!",
        releaseDate: new Date().toISOString(),
        trialPlays: Math.floor(Math.random() * 10000),
        totalRatings: Math.floor(Math.random() * 5000),
        tags: ['fun', 'exciting'],
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>You might also like</Text>
        <Text style={styles.subtitle}>Based on {genre} games</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {similarGames.map(game => (
          <Pressable key={game.id} style={styles.gameCard} onPress={() => handleGamePress(game)}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: game.coverImage }} style={styles.gameCover} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.gradient} />

              {/* Trial Badge */}
              <View style={styles.trialBadge}>
                <Ionicons name="time-outline" size={12} color="#fff" />
                <Text style={styles.trialText}>0m</Text>
              </View>
            </View>

            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={2}>
                {game.title}
              </Text>
              <Text style={styles.gameDeveloper} numberOfLines={1}>
                {game.developer}
              </Text>
              <View style={styles.gameRating}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{game.rating.toFixed(1)}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* Discover More Card */}
        <Pressable style={styles.discoverCard}>
          <LinearGradient colors={['#6366f1', '#5558e3']} style={styles.discoverGradient}>
            <Ionicons name="compass-outline" size={48} color="#fff" />
            <Text style={styles.discoverText}>Discover More</Text>
            <Text style={styles.discoverSubtext}>{genre} Games</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  gameCard: {
    width: 140,
    marginRight: 12,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gameCover: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  trialBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trialText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  gameInfo: {
    paddingHorizontal: 4,
  },
  gameTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameDeveloper: {
    color: '#999',
    fontSize: 12,
    marginBottom: 6,
  },
  gameRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  discoverCard: {
    width: 140,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  discoverGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  discoverText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  discoverSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
});
