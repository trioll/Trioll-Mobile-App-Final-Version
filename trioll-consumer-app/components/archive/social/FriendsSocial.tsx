import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';
import { HorizontalFriendsList } from './HorizontalFriendsList';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { DS } from '../../src/styles/TriollDesignSystem';

interface Friend {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  currentlyPlaying?: {
    gameTitle: string;
    gameIcon: string;
  };
}

interface FriendsSocialProps {
  friends: Friend[];
  totalFriends: number;
  mutualFriends?: number;
  isOwnProfile: boolean;
  onViewAll?: () => void;
  onFriendPress?: (friend: Friend) => void;
}

export const FriendsSocial: React.FC<FriendsSocialProps> = ({
  friends,
  totalFriends,
  mutualFriends,
  isOwnProfile,
  onViewAll,
  onFriendPress,
}) => {
  const haptics = useHaptics();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(friends.slice(0, 6).map(() => new Animated.Value(0.8))).current;

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

  const handleViewAll = () => {
    haptics.impact('light');
    if (onViewAll) onViewAll();
  };

  const handleFriendPress = (friend: Friend) => {
    haptics.impact('light');
    if (onFriendPress) onFriendPress(friend);
  };

  const displayFriends = friends.slice(0, 6);
  const onlineFriends = friends.filter(f => f.isOnline).length;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>FRIENDS</Text>
          <View style={styles.statsContainer}>
            <Text style={styles.friendCount}>{totalFriends}</Text>
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{onlineFriends} online</Text>
            </View>
          </View>
        </View>

        <Pressable onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>VIEW ALL</Text>
          <Ionicons name="chevron-forward" size={16} color="#00FFFF" />
        </Pressable>
      </View>

      {/* Mutual Friends Badge */}
      {!isOwnProfile && mutualFriends && mutualFriends > 0 && (
        <View style={styles.mutualBadge}>
          <Ionicons name="people" size={16} color="#8866FF" />
          <Text style={styles.mutualText}>
            {mutualFriends} mutual {mutualFriends === 1 ? 'friend' : 'friends'}
          </Text>
        </View>
      )}

      {/* Friends Grid */}
      <View style={styles.friendsGrid}>
        {displayFriends.map((friend, index) => (
          <Pressable
            key={friend.id}
            onPress={() => handleFriendPress(friend)}
            style={styles.friendItem}
          >
            <Animated.View
              style={[
                styles.friendCard,
                {
                  transform: [{ scale: scaleAnims[index] }],
                },
              ]}
            >
              <View style={styles.avatarContainer}>
                <Image source={{ uri: friend.avatar }} style={styles.avatar} />

                {/* Online Status */}
                {friend.isOnline && (
                  <View style={styles.statusIndicator}>
                    <View style={styles.statusDot} />
                  </View>
                )}
              </View>

              <Text style={styles.friendName} numberOfLines={1}>
                {friend.username}
              </Text>

              {/* Currently Playing */}
              {friend.currentlyPlaying && (
                <View style={styles.playingContainer}>
                  <Ionicons name="game-controller" size={12} color="#00FF88" />
                  <Text style={styles.playingText} numberOfLines={1}>
                    {friend.currentlyPlaying.gameTitle}
                  </Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        ))}

        {/* View More Card */}
        {totalFriends > 6 && (
          <Pressable onPress={handleViewAll} style={styles.friendItem}>
            <LinearGradient
              colors={['rgba(0,255,255,0.1)', 'rgba(0,255,255,0.05)']}
              style={styles.viewMoreCard}
            >
              <Ionicons name="people" size={32} color="#00FFFF" />
              <Text style={styles.viewMoreText}>+{totalFriends - 6}</Text>
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  friendCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF88',
    marginRight: 4,
  },
  onlineText: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '600',
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
  mutualTextCompact: {
    color: DS.colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: DS.spacing.xs,
  },
  mutualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(136,102,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(136,102,255,0.2)',
  },
  mutualText: {
    color: '#8866FF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  friendItem: {
    width: '33.33%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  friendCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF88',
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  playingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  playingText: {
    color: '#00FF88',
    fontSize: 10,
    marginLeft: 4,
    flex: 1,
  },
  viewMoreCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 12,
    height: 130,
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
