import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DS } from '../../src/styles/TriollDesignSystem';
import { useHaptics } from '../../hooks/useHaptics';
import { SPRING_CONFIG, DURATIONS } from '../../constants/animations';

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  isOnline?: boolean;
  currentlyPlaying?: {
    gameTitle: string;
    gameIcon?: string;
  };
}

interface HorizontalFriendsListProps {
  friends: Friend[];
  totalFriends: number;
  onFriendPress?: (friend: Friend) => void;
  onViewAll?: () => void;
  compact?: boolean;
}

const AvatarBubble: React.FC<{
  friend: Friend;
  onPress?: () => void;
  index: number;
}> = React.memo(({ friend, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const haptics = useHaptics();

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
      ...SPRING_CONFIG.BOUNCY,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.9,
      ...SPRING_CONFIG.QUICK,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      ...SPRING_CONFIG.BOUNCY,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    haptics.impact('light');
    onPress?.();
  };

  return (
    <Animated.View
      style={[
        styles.avatarContainer,
        {
          transform: [
            { scale: scaleAnim },
            { scale: pressAnim },
          ],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.avatarPressable}
      >
        {/* Avatar Image */}
        <View style={styles.avatarWrapper}>
          {friend.avatar ? (
            <Image source={{ uri: friend.avatar }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitial}>
                {friend.username.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          
          {/* Online Indicator */}
          {friend.isOnline && (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineInnerDot} />
            </View>
          )}
          
          {/* Currently Playing Badge */}
          {friend.currentlyPlaying && (
            <View style={styles.playingBadge}>
              <Text style={styles.playingIcon}>
                {friend.currentlyPlaying.gameIcon || '🎮'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Username */}
        <Text style={styles.username} numberOfLines={1}>
          {friend.username}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

AvatarBubble.displayName = 'AvatarBubble';

export const HorizontalFriendsList: React.FC<HorizontalFriendsListProps> = React.memo(({
  friends,
  totalFriends,
  onFriendPress,
  onViewAll,
  compact = false,
}) => {
  const haptics = useHaptics();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleViewAll = () => {
    haptics.impact('light');
    onViewAll?.();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {!compact && (
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <Pressable onPress={handleViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All ({totalFriends})</Text>
            <Ionicons name="chevron-forward" size={16} color={DS.colors.primary} />
          </Pressable>
        </View>
      )}
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {friends.map((friend, index) => (
          <AvatarBubble
            key={friend.id}
            friend={friend}
            index={index}
            onPress={() => onFriendPress?.(friend)}
          />
        ))}
        
        {/* View More Bubble */}
        {totalFriends > friends.length && (
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                }],
              },
            ]}
          >
            <Pressable
              onPress={handleViewAll}
              style={[styles.avatarPressable, styles.viewMoreBubble]}
            >
              <View style={[styles.avatarWrapper, styles.viewMoreWrapper]}>
                <Text style={styles.viewMoreText}>+{totalFriends - friends.length}</Text>
              </View>
              <Text style={styles.username}>More</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
});

HorizontalFriendsList.displayName = 'HorizontalFriendsList';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xs,
    marginBottom: DS.spacing.sm,
  },
  title: {
    color: DS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: DS.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    marginHorizontal: -DS.spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: DS.spacing.xs,
    gap: DS.spacing.md,
  },
  avatarContainer: {
    alignItems: 'center',
    width: 72,
  },
  avatarPressable: {
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: DS.spacing.xs,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: DS.colors.border,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DS.colors.border,
  },
  avatarInitial: {
    color: DS.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: DS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DS.colors.background,
  },
  onlineInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DS.colors.success,
  },
  playingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DS.colors.background,
    ...DS.effects.shadowMedium,
  },
  playingIcon: {
    fontSize: 12,
  },
  username: {
    color: DS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 64,
  },
  viewMoreBubble: {
    opacity: 0.8,
  },
  viewMoreWrapper: {
    backgroundColor: DS.colors.surface,
    ...DS.effects.glassSurface,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreText: {
    color: DS.colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});