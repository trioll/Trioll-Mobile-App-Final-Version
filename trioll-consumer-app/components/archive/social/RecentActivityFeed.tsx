
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DURATIONS } from '../../constants/animations';

type ActivityType =
  | 'trial-started'
  | 'achievement'
  | 'rating'
  | 'library-add'
  | 'level-up'
  | 'friend-add';

interface Activity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  data: {
    gameTitle?: string;
    gameThumbnail?: string;
    achievementName?: string;
    rating?: number;
    level?: number;
    friendName?: string;
  };
}

interface RecentActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  maxItems = 10,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef(
    activities.slice(0, maxItems).map(() => new Animated.Value(20))
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      ...slideAnims.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: DURATIONS.NORMAL,
          delay: index * 50,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'trial-started':
        return 'play-circle';
      case 'achievement':
        return 'trophy';
      case 'rating':
        return 'star';
      case 'library-add':
        return 'bookmark';
      case 'level-up':
        return 'trending-up';
      case 'friend-add':
        return 'person-add';
      default:
        return 'time';
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'trial-started':
        return '#00FF88';
      case 'achievement':
        return '#FFD700';
      case 'rating':
        return '#FF2D55';
      case 'library-add':
        return '#00FFFF';
      case 'level-up':
        return '#8866FF';
      case 'friend-add':
        return '#FF66FF';
      default:
        return '#FFFFFF';
    }
  };

  const getActivityText = (activity: Activity) => {
    const { type, data } = activity;

    switch (type) {
      case 'trial-started':
        return `Started trial for ${data.gameTitle}`;
      case 'achievement':
        return `Unlocked "${data.achievementName}"`;
      case 'rating':
        return `Rated ${data.gameTitle} ${data.rating}/5`;
      case 'library-add':
        return `Added ${data.gameTitle} to library`;
      case 'level-up':
        return `Reached Level ${data.level}!`;
      case 'friend-add':
        return `Became friends with ${data.friendName}`;
      default:
        return 'Unknown activity';
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayActivities = activities.slice(0, maxItems);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {displayActivities.map((activity, index) => (
          <Animated.View
            key={activity.id}
            style={[
              styles.activityItem,
              {
                transform: [{ translateX: slideAnims[index] }],
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getActivityColor(activity.type) + '20' },
              ]}
            >
              <Ionicons
                name={getActivityIcon(activity.type) as keyof typeof Ionicons.glyphMap}
                size={20}
                color={getActivityColor(activity.type)}
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.activityText}>{getActivityText(activity)}</Text>
              <Text style={styles.timestamp}>{getRelativeTime(activity.timestamp)}</Text>
            </View>

            {/* Game Thumbnail if applicable */}
            {(activity as any).data.gameThumbnail && (
              <Image
                source={{ uri: (activity as any).data.gameThumbnail }}
                style={styles.gameThumbnail}
              />
            )}
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  activityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  gameThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 12,
  },
});
