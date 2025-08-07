
import React, { useState, useEffect } from 'react';
import { NavigationProp } from '../navigation/types';
import { View, Text, StyleSheet, FlatList, Pressable, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useHaptics } from '../hooks/useHaptics';
import { useNotifications } from '../hooks/useWebSocket';
import { formatDistanceToNow } from '../utils/dateUtils';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'game_invite' | 'achievement' | 'system';
  title: string;
  message: string;
  fromUser?: {
    id: string;
    username: string;
    avatar: string;
  };
  data?: any;
  read: boolean;
  timestamp: string;
}

export const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'NotificationScreen'>>();
  const haptics = useHaptics();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'person-add';
      case 'friend_accepted':
        return 'people';
      case 'game_invite':
        return 'game-controller';
      case 'achievement':
        return 'trophy';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return '#00FF88';
      case 'game_invite':
        return '#6366f1';
      case 'achievement':
        return '#FFD700';
      case 'system':
        return '#666';
      default:
        return '#FFF';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    haptics.impact('light');
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
        navigation.navigate('Friends' as unknown, { tab: 'requests' });
        break;
      case 'game_invite':
        if ((notification as any).data?.gameId) {
          navigation.navigate('GameDetail' as unknown, {
            gameId: (notification as any).data.gameId,
          });
        }
        break;
      case 'achievement':
        navigation.navigate('Achievements' as unknown as never);
        break;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // In a real app, this would refresh from the server
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleClearAll = () => {
    haptics.impact('medium');
    clearAll();
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      style={styles.notificationWrapper}
    >
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={[styles.notification, !item.read && styles.unreadNotification]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(item.type) + '20' },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.type) as unknown as any}
            size={24}
            color={getNotificationColor(item.type)}
          />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </Text>
        </View>

        {item.fromUser && (
          <Image source={{ uri: item.fromUser.avatar }} style={styles.userAvatar} />
        )}

        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off" size={80} color="#333" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyText}>You're all caught up!</Text>
    </View>
  );

  const renderHeader = () =>
    notifications.length > 0 ? (
      <View style={styles.headerActions}>
        <Pressable onPress={handleClearAll} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification as unknown}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00FF88"
            colors={['#00FF88']}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  list: {
    flexGrow: 1,
  },
  notificationWrapper: {
    paddingHorizontal: 20,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  unreadNotification: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
