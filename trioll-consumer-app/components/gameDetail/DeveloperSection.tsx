
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../../navigation/types';
import { generateAvatar } from '../../src/utils/avatarGenerator';
import { gamePlaceholderImages } from '../../utils/placeholderImages';
import { responsivePadding } from '../../utils/responsive';

interface DeveloperSectionProps {
  developer: string;
  developerId?: string;
}

interface DeveloperGame {
  id: string;
  title: string;
  coverImage: string;
  rating: number;
  genre: string;
}

export const DeveloperSection: React.FC<DeveloperSectionProps> = ({
  developer,
  developerId: _developerId,
}) => {
  const navigation = useNavigation<NavigationProp<'GameDetail'>>();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  // Mock developer data
  const developerInfo = {
    logo: generateAvatar(developer, developer),
    bio: "We are passionate game developers dedicated to creating immersive and engaging gaming experiences. With over 10 years in the industry, we've released numerous award-winning titles across multiple platforms.",
    website: 'www.developer.com',
    twitter: '@developer',
    founded: '2014',
    totalGames: 23,
  };

  // Mock other games by developer
  const otherGames: DeveloperGame[] = [
    {
      id: '1',
      title: 'Space Adventure',
      coverImage: gamePlaceholderImages['space-odyssey-001'] || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Galactic-Defense/thumbnail.png',
      rating: 4.6,
      genre: 'Action',
    },
    {
      id: '2',
      title: 'Puzzle Master',
      coverImage: gamePlaceholderImages['puzzle-quest-001'] || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Brain-Teaser/thumbnail.png',
      rating: 4.8,
      genre: 'Puzzle',
    },
    {
      id: '3',
      title: 'Racing Pro',
      coverImage: gamePlaceholderImages['speed-rush-001'] || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Turbo-Racing/thumbnail.png',
      rating: 4.3,
      genre: 'Racing',
    },
  ];

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleGamePress = (game: DeveloperGame) => {
    // Navigate to game detail
    navigation.navigate('GameDetail' as keyof RootStackParamList, { gameId: game.id } as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Developer</Text>

      {/* Developer Card */}
      <View style={styles.developerCard}>
        <View style={styles.developerHeader}>
          <Image source={{ uri: developerInfo.logo }} style={styles.developerLogo} />
          <View style={styles.developerInfo}>
            <Text style={(styles as any).developerName}>{developer}</Text>
            <Text style={styles.developerStats}>
              {developerInfo.totalGames} games • Since {developerInfo.founded}
            </Text>
            <View style={styles.socialLinks}>
              <Pressable style={styles.socialButton}>
                <Ionicons name="globe-outline" size={18} color="#6366f1" />
              </Pressable>
              <Pressable style={styles.socialButton}>
                <Ionicons name="logo-twitter" size={18} color="#6366f1" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Expandable Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.bio} numberOfLines={isExpanded ? undefined : 2}>
            {developerInfo.bio}
          </Text>
          <Pressable onPress={toggleExpand} style={styles.expandButton}>
            <Text style={styles.expandText}>{isExpanded ? 'Show less' : 'Show more'}</Text>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name="chevron-down" size={16} color="#6366f1" />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* More Games */}
      <View style={styles.moreGamesSection}>
        <View style={styles.moreGamesHeader}>
          <Text style={styles.moreGamesTitle}>More games by {developer}</Text>
          <Pressable style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#6366f1" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gamesScroll}
        >
          {otherGames.map(game => (
            <Pressable key={game.id} style={styles.gameCard} onPress={() => handleGamePress(game)}>
              <Image source={{ uri: game.coverImage }} style={styles.gameCover} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gameGradient}
              >
                <Text style={styles.gameTitle} numberOfLines={2}>
                  {game.title}
                </Text>
                <View style={styles.gameMeta}>
                  <View style={styles.gameRating}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.gameRatingText}>{game.rating}</Text>
                  </View>
                  <Text style={styles.gameGenre}>{game.genre}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  developerCard: {
    backgroundColor: '#2a2a3e',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  developerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  developerLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  developerStats: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  socialLinks: {
    flexDirection: 'row',
  },
  socialButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bioContainer: {
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
    paddingTop: responsivePadding.md,
  },
  bio: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  expandText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  moreGamesSection: {
    paddingLeft: 20,
  },
  moreGamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 20,
  },
  moreGamesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  gamesScroll: {
    paddingRight: 20,
  },
  gameCard: {
    width: 120,
    height: 160,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gameCover: {
    width: '100%',
    height: '100%',
  },
  gameGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: responsivePadding.lg,
  },
  gameTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameRatingText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  gameGenre: {
    color: '#999',
    fontSize: 12,
  },
});
