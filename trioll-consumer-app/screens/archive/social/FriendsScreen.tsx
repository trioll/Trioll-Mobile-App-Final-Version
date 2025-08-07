
import React, { useState, useRef, useEffect, useMemo } from 'react';

import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, FlatList, ListRenderItem, Image, Animated, RefreshControl, Modal, Dimensions, LayoutAnimation, Platform, UIManager, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useHaptics } from '../hooks/useHaptics';
import { SPRING_CONFIGS, DURATIONS } from '../constants/animations';
import { useFriends } from '../hooks/useFriends';
import { useFriendActivity, useWebSocket } from '../hooks/useWebSocket';

// LayoutAnimation will be enabled inside component

type TabType = 'friends' | 'requests' | 'find' | 'activity';
type SortOption = 'active' | 'alphabetical' | 'recent';
type PrivacySetting = 'everyone' | 'friends' | 'none';

interface Friend {
  id: string;
  username: string;
  realName: string;
  avatar: string;
  isOnline: boolean;
  lastActive: Date;
  currentlyPlaying?: {
    gameId: string;
    gameName: string;
    gameCover: string;
  };
  mutualFriends: number;
  gamesInCommon: number;
}

interface FriendRequest {
  id: string;
  user: Friend;
  type: 'incoming' | 'sent';
  message?: string;
  timestamp: Date;
  mutualFriends: string[];
}

interface Activity {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  type: 'playing' | 'achievement' | 'rating' | 'library' | 'score';
  gameId?: string;
  gameName?: string;
  gameCover?: string;
  achievement?: string;
  rating?: number;
  score?: number;
  timestamp: Date;
}

interface PrivacySettings {
  whoCanAddMe: PrivacySetting;
  activityVisibility: PrivacySetting;
  onlineStatus: boolean;
  blockedUsers: string[];
}

// Mock data
const mockFriends: Friend[] = [
  {
    id: '1',
    username: 'ProGamer92',
    realName: 'Alex Chen',
    avatar: 'https://picsum.photos/200/200?random=1',
    isOnline: true,
    lastActive: new Date(),
    currentlyPlaying: {
      gameId: '1',
      gameName: 'Cyber Racer 2077',
      gameCover: 'https://picsum.photos/400/600?random=1',
    },
    mutualFriends: 15,
    gamesInCommon: 23,
  },
  {
    id: '2',
    username: 'NinjaGirl',
    realName: 'Sarah Kim',
    avatar: 'https://picsum.photos/200/200?random=2',
    isOnline: true,
    lastActive: new Date(Date.now() - 300000),
    mutualFriends: 8,
    gamesInCommon: 12,
  },
  {
    id: '3',
    username: 'SpeedDemon',
    realName: 'Mike Johnson',
    avatar: 'https://picsum.photos/200/200?random=3',
    isOnline: false,
    lastActive: new Date(Date.now() - 3600000),
    mutualFriends: 3,
    gamesInCommon: 7,
  },
];

const mockRequests: FriendRequest[] = [
  {
    id: '1',
    user: {
      id: '4',
      username: 'CoolPlayer99',
      realName: 'Jamie Lee',
      avatar: 'https://picsum.photos/200/200?random=4',
      isOnline: true,
      lastActive: new Date(),
      mutualFriends: 5,
      gamesInCommon: 10,
    },
    type: 'incoming',
    message: 'Hey! We played together yesterday',
    timestamp: new Date(Date.now() - 1800000),
    mutualFriends: ['ProGamer92', 'NinjaGirl'],
  },
  {
    id: '2',
    user: {
      id: '5',
      username: 'GameMaster',
      realName: 'Chris Taylor',
      avatar: 'https://picsum.photos/200/200?random=5',
      isOnline: false,
      lastActive: new Date(Date.now() - 7200000),
      mutualFriends: 2,
      gamesInCommon: 5,
    },
    type: 'sent',
    timestamp: new Date(Date.now() - 86400000),
    mutualFriends: [],
  },
];

const mockActivities: Activity[] = [
  {
    id: '1',
    userId: '1',
    username: 'ProGamer92',
    userAvatar: 'https://picsum.photos/200/200?random=1',
    type: 'playing',
    gameId: '1',
    gameName: 'Cyber Racer 2077',
    gameCover: 'https://picsum.photos/400/600?random=1',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    userId: '2',
    username: 'NinjaGirl',
    userAvatar: 'https://picsum.photos/200/200?random=2',
    type: 'achievement',
    gameId: '2',
    gameName: 'Shadow Legends',
    gameCover: 'https://picsum.photos/400/600?random=2',
    achievement: 'Master Assassin',
    timestamp: new Date(Date.now() - 1800000),
  },
  {
    id: '3',
    userId: '1',
    username: 'ProGamer92',
    userAvatar: 'https://picsum.photos/200/200?random=1',
    type: 'rating',
    gameId: '3',
    gameName: 'Puzzle Quest',
    gameCover: 'https://picsum.photos/400/600?random=3',
    rating: 4.5,
    timestamp: new Date(Date.now() - 3600000),
  },
];

const mockSuggestions: Friend[] = [
  {
    id: '6',
    username: 'EliteSniper',
    realName: 'Jordan Smith',
    avatar: 'https://picsum.photos/200/200?random=6',
    isOnline: true,
    lastActive: new Date(),
    mutualFriends: 12,
    gamesInCommon: 18,
  },
  {
    id: '7',
    username: 'RacingQueen',
    realName: 'Emma Wilson',
    avatar: 'https://picsum.photos/200/200?random=7',
    isOnline: false,
    lastActive: new Date(Date.now() - 1800000),
    mutualFriends: 7,
    gamesInCommon: 14,
  },
];

export const FriendsScreen: React.FC = () => {
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

  // Get friends data from API hook
  const {
    friends: apiFriends,
    friendRequests: apiRequests,
    activities: apiActivities,
    suggestions: apiSuggestions,
    loading: apiLoading,
    isUsingApiData,
    sendFriendRequest: apiSendFriendRequest,
    acceptFriendRequest: apiAcceptFriendRequest,
    rejectFriendRequest: apiRejectFriendRequest,
    removeFriend: apiRemoveFriend,
    blockUser: apiBlockUser,
    searchFriends: apiSearchFriends,
    refreshData,
  } = useFriends();

  // Get real-time friend activities from WebSocket
  const realtimeActivities = useFriendActivity();

  // Subscribe to WebSocket channels
  const { subscribe, unsubscribe } = useWebSocket({
    channels: ['friends', 'activities'],
  });

  // State
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    whoCanAddMe: 'everyone',
    activityVisibility: 'friends',
    onlineStatus: true,
    blockedUsers: [],
  });

  // Use API data if available, otherwise fallback to mock data
  const friends = apiFriends.length > 0 || isUsingApiData ? apiFriends : mockFriends;
  const requests = apiRequests.length > 0 || isUsingApiData ? apiRequests : mockRequests;

  // Combine API activities with real-time activities
  const combinedActivities = useMemo(() => {
    const apiActivityIds = new Set(apiActivities.map(a => a.id));
    const newRealtimeActivities = realtimeActivities.filter(a => !apiActivityIds.has(a.id));
    return [...newRealtimeActivities, ...apiActivities];
  }, [apiActivities, realtimeActivities]);

  const activities =
    combinedActivities.length > 0 || isUsingApiData ? combinedActivities : mockActivities;
  const suggestions =
    apiSuggestions.length > 0 || isUsingApiData ? apiSuggestions : mockSuggestions;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get scale animation
  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  // Tab data
  const tabs = useMemo(
    () => [
      {
        id: 'friends' as TabType,
        label: 'Friends',
        icon: 'people',
        count: friends.length,
      },
      {
        id: 'requests' as TabType,
        label: 'Requests',
        icon: 'person-add',
        count: requests.filter(r => r.type === 'incoming').length,
      },
      {
        id: 'find' as TabType,
        label: 'Find',
        icon: 'search',
      },
      {
        id: 'activity' as TabType,
        label: 'Activity',
        icon: 'pulse',
      },
    ],
    [friends.length, requests]
  );

  // Filter friends based on search
  const filteredFriends = useMemo(() => {
    const filtered = friends.filter(
      friend =>
        friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.realName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort friends
    switch (sortOption) {
      case 'active':
        filtered.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          const dateA = new Date(a.lastActive);
          const dateB = new Date(b.lastActive);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.username.localeCompare(b.username));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = new Date(a.lastActive);
          const dateB = new Date(b.lastActive);
          return dateB.getTime() - dateA.getTime();
        });
        break;
    }

    return filtered;
  }, [friends, searchQuery, sortOption]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    haptics.impact('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);

    // Animate tab indicator
    const tabIndex = tabs.findIndex(t => t.id === tab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex * (SCREEN_WIDTH / tabs.length),
      ...SPRING_CONFIGS.QUICK,
      useNativeDriver: true,
    }).start();
  };

  // Handle friend actions
  const handleFriendPress = (friend: Friend) => {
    haptics.impact('light');
    setSelectedFriend(friend);
    setShowProfileModal(true);
  };

  const handleMessage = (_friend: Friend) => {
    haptics.impact('light');
    // Navigate to messages
    // TODO: Implement message navigation
  };

  const handleChallenge = (friend: Friend) => {
    haptics.impact('light');
    Alert.alert('Challenge', `Challenge ${friend.username} to a game?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Challenge', onPress: () => (haptics as any).success() },
    ]);
  };

  // Handle friend requests
  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      (haptics as any).success();
      await apiAcceptFriendRequest(request.id);
      // Optimistic update handled by the hook

      // Send notification to the new friend via WebSocket
      const { sendNotification } = useWebSocket();
      sendNotification(request.user.id, {
        type: 'friend_request' as const,
        title: 'Friend Request Accepted',
        message: 'You are now friends!',
      });
    } catch (error) {
      (haptics as any).error();
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  const handleDeclineRequest = async (request: FriendRequest) => {
    try {
      haptics.impact('light');
      await apiRejectFriendRequest(request.id);
      // Optimistic update handled by the hook
    } catch (error) {
      (haptics as any).error();
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
    return;
};

  const handleCancelRequest = async (request: FriendRequest) => {
    try {
      haptics.impact('light');
      await apiRejectFriendRequest(request.id);
      // Optimistic update handled by the hook
    } catch (error) {
      (haptics as any).error();
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    }
    return;
};

  // Handle add friend
  const handleAddFriend = async (user: Friend) => {
    try {
      (haptics as any).success();
      await apiSendFriendRequest(user.id);
      // Refresh data to show updated state
      refreshData();
    } catch (error) {
      (haptics as any).error();
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
    return;
};

  // Handle remove friend
  const handleRemoveFriend = async (friendId: string) => {
    try {
      await apiRemoveFriend(friendId);
      (haptics as any).success();
      setShowProfileModal(false);
    } catch (error) {
      (haptics as any).error();
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
    }
    return;
};

  // Handle block user
  const handleBlockUser = async (userId: string) => {
    try {
      await apiBlockUser(userId);
      (haptics as any).success();
      setShowProfileModal(false);
    } catch (error) {
      (haptics as any).error();
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
    return;
};

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      (haptics as any).success();
    } catch (error) {
      (haptics as any).error();
    } finally {
      setRefreshing(false);
    }
  };

  // Format last active time
  const formatLastActive = (dateInput: Date | string) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Render tabs
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <View style={styles.tabs}>
        {tabs.map((tab, _index) => (
          <Pressable key={tab.id} onPress={() => handleTabChange(tab.id)} style={styles.tab}>
            <Ionicons
              name={tab.icon as unknown as any}
              size={24}
              color={activeTab === tab.id ? '#00FF88' : '#666'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.id && styles.tabBadgeActive]}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            transform: [{ translateX: tabIndicatorAnim }],
            width: SCREEN_WIDTH / tabs.length,
          },
        ]}
      />
    </View>
  );

  // Render friend card
  const renderFriendCard: ListRenderItem<Friend> = ({ item: friend }) => {
    const scaleAnim = getScaleAnim(friend.id);

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

    return (
      <Pressable
        onPress={() => handleFriendPress(friend)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.friendCard, isPortrait && styles.friendCardPortrait]}
      >
        <Animated.View style={[styles.friendCardContent, isPortrait && { padding: 10 }, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.friendAvatar}>
            <Image source={{ uri: friend.avatar }} style={[styles.avatarImage, isPortrait && { width: 40, height: 40, borderRadius: 20 }]} />
            {friend.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.friendInfo}>
            <Text style={[styles.friendUsername, isPortrait && { fontSize: 14 }]}>{friend.username}</Text>
            <Text style={[styles.friendRealName, isPortrait && { fontSize: 12 }]}>{friend.realName}</Text>
            {friend.currentlyPlaying ? (
              <View style={styles.currentlyPlaying}>
                <Ionicons name="game-controller" size={isPortrait ? 11 : 12} color="#00FF88" />
                <Text style={[styles.currentlyPlayingText, isPortrait && { fontSize: 10 }]}>
                  Playing {friend.currentlyPlaying.gameName}
                </Text>
              </View>
            ) : (
              <Text style={[styles.lastActive, isPortrait && { fontSize: 10 }]}>
                {friend.isOnline ? 'Online' : formatLastActive(friend.lastActive)}
              </Text>
            )}
          </View>

          <View style={styles.friendActions}>
            <Pressable onPress={() => handleMessage(friend)} style={[styles.actionButton, isPortrait && { width: 30, height: 30, borderRadius: 15 }]}>
              <Ionicons name="chatbubble" size={isPortrait ? 16 : 20} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => handleChallenge(friend)} style={[styles.actionButton, isPortrait && { width: 30, height: 30, borderRadius: 15 }]}>
              <MaterialCommunityIcons name="sword-cross" size={isPortrait ? 16 : 20} color="#FFFFFF" />
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  // Render friends tab
  const renderFriendsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortOptions}>
          {[
            { value: 'active' as SortOption, label: 'Active Now' },
            { value: 'alphabetical' as SortOption, label: 'A-Z' },
            { value: 'recent' as SortOption, label: 'Recently Added' },
          ].map(option => (
            <Pressable
              key={option.value}
              onPress={() => setSortOption(option.value)}
              style={[styles.sortButton, sortOption === option.value && styles.sortButtonActive]}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortOption === option.value && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {filteredFriends.length > 0 ? (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendCard}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.friendsList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people" size={80} color="#333" />
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyText}>Find friends to play and compete together</Text>
        </View>
      )}
    </ScrollView>
  );

  // Render request card
  const renderRequestCard: ListRenderItem<FriendRequest> = ({ item: request }) => (
    <View style={[styles.requestCard, isPortrait && styles.requestCardPortrait]}>
      <Image source={{ uri: request.user.avatar }} style={[styles.requestAvatar, isPortrait && { width: 44, height: 44, borderRadius: 22 }]} />

      <View style={styles.requestInfo}>
        <Text style={[styles.requestUsername, isPortrait && { fontSize: 15 }]}>{request.user.username}</Text>
        <Text style={[styles.requestRealName, isPortrait && { fontSize: 13 }]}>{request.user.realName}</Text>
        {request.mutualFriends.length > 0 && (
          <Text style={[styles.mutualFriends, isPortrait && { fontSize: 11 }]}>{request.mutualFriends.length} mutual friends</Text>
        )}
        {request.message && <Text style={[styles.requestMessage, isPortrait && { fontSize: 13 }]}>"{request.message}"</Text>}
        <Text style={[styles.requestTime, isPortrait && { fontSize: 11 }]}>{formatLastActive(request.timestamp)}</Text>
      </View>

      {request.type === 'incoming' ? (
        <View style={styles.requestActions}>
          <Pressable
            onPress={() => handleAcceptRequest(request)}
            style={[styles.requestButton, styles.acceptButton, isPortrait && { paddingHorizontal: 12, paddingVertical: 5 }]}
          >
            <Text style={[styles.acceptButtonText, isPortrait && { fontSize: 13 }]}>Accept</Text>
          </Pressable>
          <Pressable
            onPress={() => handleDeclineRequest(request)}
            style={[styles.requestButton, styles.declineButton, isPortrait && { paddingHorizontal: 12, paddingVertical: 5 }]}
          >
            <Text style={[styles.declineButtonText, isPortrait && { fontSize: 13 }]}>Decline</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => handleCancelRequest(request)} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );

  // Render requests tab
  const renderRequestsTab = () => {
    const incomingRequests = requests.filter(r => r.type === 'incoming');
    const sentRequests = requests.filter(r => r.type === 'sent');

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {incomingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incoming Requests</Text>
            <FlatList
              data={incomingRequests}
              renderItem={renderRequestCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {sentRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sent Requests</Text>
            <FlatList
              data={sentRequests}
              renderItem={renderRequestCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {suggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Friends</Text>
            {suggestions.map(suggestion => (
              <View key={suggestion.id} style={styles.suggestionCard}>
                <Image source={{ uri: suggestion.avatar }} style={styles.suggestionAvatar} />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionUsername}>{suggestion.username}</Text>
                  <Text style={styles.suggestionMeta}>
                    {suggestion.mutualFriends} mutual friends • {suggestion.gamesInCommon} games in
                    common
                  </Text>
                </View>
                <Pressable onPress={() => handleAddFriend(suggestion)} style={styles.addButton}>
                  <Ionicons name="person-add" size={20} color="#00FF88" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {incomingRequests.length === 0 && sentRequests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="mail" size={80} color="#333" />
            <Text style={styles.emptyTitle}>No pending requests</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // Render find friends tab
  const renderFindTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.findSection}>
        <View style={[styles.searchContainer, isPortrait && styles.searchContainerPortrait]}>
          <View style={[styles.searchBar, isPortrait && { paddingVertical: 8 }]}>
            <Ionicons name="search" size={isPortrait ? 18 : 20} color="#999" />
            <TextInput
              style={[styles.searchInput, isPortrait && { fontSize: 14 }]}
              placeholder="Search by username or email..."
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <Pressable style={[styles.findOption, isPortrait && { paddingVertical: 12 }]}>
          <View style={[styles.findOptionIcon, isPortrait && { width: 38, height: 38, borderRadius: 19 }]}>
            <Ionicons name="people" size={isPortrait ? 20 : 24} color="#00FF88" />
          </View>
          <View style={styles.findOptionInfo}>
            <Text style={[styles.findOptionTitle, isPortrait && { fontSize: 14 }]}>Import from Contacts</Text>
            <Text style={[styles.findOptionText, isPortrait && { fontSize: 12 }]}>Find friends from your contacts</Text>
          </View>
          <Ionicons name="chevron-forward" size={isPortrait ? 18 : 20} color="#666" />
        </Pressable>

        <Pressable style={[styles.findOption, isPortrait && { paddingVertical: 12 }]}>
          <View style={[styles.findOptionIcon, isPortrait && { width: 38, height: 38, borderRadius: 19 }]}>
            <Ionicons name="qr-code" size={isPortrait ? 20 : 24} color="#00FF88" />
          </View>
          <View style={styles.findOptionInfo}>
            <Text style={[styles.findOptionTitle, isPortrait && { fontSize: 14 }]}>QR Code</Text>
            <Text style={[styles.findOptionText, isPortrait && { fontSize: 12 }]}>Scan or share your code</Text>
          </View>
          <Ionicons name="chevron-forward" size={isPortrait ? 18 : 20} color="#666" />
        </Pressable>

        <Pressable style={[styles.findOption, isPortrait && { paddingVertical: 12 }]}>
          <View style={[styles.findOptionIcon, isPortrait && { width: 38, height: 38, borderRadius: 19 }]}>
            <Ionicons name="location" size={isPortrait ? 20 : 24} color="#00FF88" />
          </View>
          <View style={styles.findOptionInfo}>
            <Text style={[styles.findOptionTitle, isPortrait && { fontSize: 14 }]}>Nearby Players</Text>
            <Text style={[styles.findOptionText, isPortrait && { fontSize: 12 }]}>Find players in your area</Text>
          </View>
          <Ionicons name="chevron-forward" size={isPortrait ? 18 : 20} color="#666" />
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect Social Media</Text>
          <View style={styles.socialButtons}>
            {['logo-facebook', 'logo-twitter', 'logo-discord', 'logo-steam'].map(logo => (
              <Pressable key={logo} style={[styles.socialButton, isPortrait && { width: 38, height: 38, borderRadius: 19 }]}>
                <Ionicons name={logo as unknown as any} size={isPortrait ? 20 : 24} color="#FFFFFF" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {mockSuggestions.slice(0, 3).map(suggestion => (
            <View key={suggestion.id} style={styles.recommendationCard}>
              <Image source={{ uri: suggestion.avatar }} style={styles.recommendationAvatar} />
              <View style={styles.recommendationInfo}>
                <Text style={styles.recommendationUsername}>{suggestion.username}</Text>
                <Text style={styles.recommendationReason}>
                  Plays similar games • {suggestion.mutualFriends} mutual friends
                </Text>
              </View>
              <Pressable onPress={() => handleAddFriend(suggestion)} style={styles.addButton}>
                <Ionicons name="person-add" size={20} color="#00FF88" />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  // Render activity item
  const renderActivityItem = ({ item: activity }: { item: Activity }) => {
    const getActivityIcon = () => {
      switch (activity.type) {
        case 'playing':
          return 'game-controller';
        case 'achievement':
          return 'trophy';
        case 'rating':
          return 'star';
        case 'library':
          return 'add-circle';
        case 'score':
          return 'trending-up';
        default:
          return 'pulse';
      }
    };

    const getActivityText = () => {
      switch (activity.type) {
        case 'playing':
          return `started playing ${activity.gameName}`;
        case 'achievement':
          return `unlocked "${activity.achievement}" in ${activity.gameName}`;
        case 'rating':
          return `rated ${activity.gameName} ${activity.rating} stars`;
        case 'library':
          return `added ${activity.gameName} to library`;
        case 'score':
          return `beat your score in ${activity.gameName}`;
        default:
          return 'did something';
      }
    };

    return (
      <View style={styles.activityItem}>
        <Image source={{ uri: activity.userAvatar }} style={styles.activityAvatar} />

        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityUsername}>{activity.username}</Text>
            <Text style={styles.activityTime}>{formatLastActive(activity.timestamp)}</Text>
          </View>

          <View style={styles.activityInfo}>
            <Ionicons name={getActivityIcon() as unknown as any} size={16} color="#00FF88" />
            <Text style={styles.activityText}>{getActivityText()}</Text>
          </View>

          {activity.gameCover && (
            <Pressable style={styles.activityGame}>
              <Image source={{ uri: activity.gameCover }} style={styles.activityGameImage} />
              <View style={styles.activityGameOverlay}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
              </View>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // Render activity tab
  const renderActivityTab = () => (
    <FlatList
      data={activities as Activity[]}
      renderItem={renderActivityItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.activityList}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#00FF88"
          colors={['#00FF88']}
        />
      }
    />
  );

  // Render friend profile modal
  const renderProfileModal = () => (
    <Modal
      visible={showProfileModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowProfileModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.profileModal}>
          <Pressable onPress={() => setShowProfileModal(false)} style={styles.modalClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          {selectedFriend && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeader}>
                <Image source={{ uri: selectedFriend.avatar }} style={styles.profileAvatar} />
                <Text style={styles.profileUsername}>{selectedFriend.username}</Text>
                <Text style={styles.profileRealName}>{selectedFriend.realName}</Text>

                <View style={styles.profileStats}>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatNumber}>{selectedFriend.gamesInCommon}</Text>
                    <Text style={styles.profileStatLabel}>Games in Common</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatNumber}>{selectedFriend.mutualFriends}</Text>
                    <Text style={styles.profileStatLabel}>Mutual Friends</Text>
                  </View>
                </View>

                <View style={styles.profileActions}>
                  <Pressable
                    onPress={() => {
                      setShowProfileModal(false);
                      handleMessage(selectedFriend);
                    }}
                    style={[styles.profileButton, styles.messageButton]}
                  >
                    <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                    <Text style={styles.profileButtonText}>Message</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowProfileModal(false);
                      handleChallenge(selectedFriend);
                    }}
                    style={[styles.profileButton, styles.challengeButton]}
                  >
                    <MaterialCommunityIcons name="sword-cross" size={20} color="#000" />
                    <Text style={[styles.profileButtonText, { color: '#000' }]}>Challenge</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Recent Activity Together</Text>
                <View style={styles.activityTogether}>
                  <Text style={styles.noActivity}>No recent activity together</Text>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Mutual Games</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Image
                      key={i}
                      source={{ uri: `https://picsum.photos/200/300?random=${i}` }}
                      style={styles.mutualGameImage}
                    />
                  ))}
                </ScrollView>
              </View>

              <Pressable style={styles.blockButton}>
                <Text style={styles.blockButtonText}>Block User</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Render privacy settings modal
  const renderPrivacyModal = () => (
    <Modal
      visible={showPrivacyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPrivacyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.privacyModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy Settings</Text>
            <Pressable onPress={() => setShowPrivacyModal(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Who Can Add Me</Text>
              {['everyone', 'friends', 'none'].map(option => (
                <Pressable
                  key={option}
                  onPress={() =>
                    setPrivacySettings(prev => ({ ...prev, whoCanAddMe: option as PrivacySetting }))
                  }
                  style={styles.privacyOption}
                >
                  <View
                    style={[
                      styles.radioButton,
                      privacySettings.whoCanAddMe === option && styles.radioButtonActive,
                    ]}
                  >
                    {privacySettings.whoCanAddMe === option && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.privacyOptionText}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Activity Visibility</Text>
              {['everyone', 'friends', 'none'].map(option => (
                <Pressable
                  key={option}
                  onPress={() =>
                    setPrivacySettings(prev => ({
                      ...prev,
                      activityVisibility: option as PrivacySetting,
                    }))
                  }
                  style={styles.privacyOption}
                >
                  <View
                    style={[
                      styles.radioButton,
                      privacySettings.activityVisibility === option && styles.radioButtonActive,
                    ]}
                  >
                    {privacySettings.activityVisibility === option && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.privacyOptionText}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.privacySection}>
              <Pressable
                onPress={() =>
                  setPrivacySettings(prev => ({ ...prev, onlineStatus: !prev.onlineStatus }))
                }
                style={styles.privacyToggle}
              >
                <Text style={styles.privacyToggleText}>Show Online Status</Text>
                <Switch
                  value={privacySettings.onlineStatus}
                  onValueChange={value =>
                    setPrivacySettings(prev => ({ ...prev, onlineStatus: value }))
                  }
                  trackColor={{ false: '#333', true: '#00FF88' }}
                  thumbColor={privacySettings.onlineStatus ? '#FFFFFF' : '#666'}
                />
              </Pressable>
            </View>

            <Pressable style={styles.manageBlockedButton}>
              <Text style={styles.manageBlockedText}>Manage Blocked Users</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.headerTitle}>Friends</Text>
        <Pressable onPress={() => setShowPrivacyModal(true)} style={styles.privacyButton}>
          <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      {renderTabs()}

      <View style={styles.content}>
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'requests' && renderRequestsTab()}
        {activeTab === 'find' && renderFindTab()}
        {activeTab === 'activity' && renderActivityTab()}
      </View>

      {renderProfileModal()}
      {renderPrivacyModal()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  privacyButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  tabLabelActive: {
    color: '#00FF88',
  },
  tabBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  tabBadgeActive: {
    backgroundColor: '#6366f1',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabIndicator: {
    height: 3,
    backgroundColor: '#00FF88',
    position: 'absolute',
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#FFFFFF',
  },
  sortOptions: {
    marginTop: 10,
    marginBottom: 6,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
  },
  sortButtonText: {
    fontSize: 13,
    color: '#999',
  },
  sortButtonTextActive: {
    color: '#00FF88',
    fontWeight: '600',
  },
  friendsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  friendCard: {
    marginBottom: 10,
  },
  friendCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  friendAvatar: {
    position: 'relative',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF88',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 10,
  },
  friendUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  friendRealName: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  currentlyPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  currentlyPlayingText: {
    fontSize: 11,
    color: '#00FF88',
    marginLeft: 4,
  },
  lastActive: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestRealName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mutualFriends: {
    fontSize: 12,
    color: '#00FF88',
    marginTop: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  requestActions: {
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 3,
  },
  acceptButton: {
    backgroundColor: '#00FF88',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#333',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestionMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  addButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  findSection: {
    paddingVertical: 12,
  },
  findOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  findOptionIcon: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  findOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  findOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  findOptionText: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 42,
    height: 42,
    backgroundColor: '#1a1a1a',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  recommendationInfo: {
    flex: 1,
    marginLeft: 10,
  },
  recommendationUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recommendationReason: {
    fontSize: 11,
    color: '#00FF88',
    marginTop: 3,
  },
  activityList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  activityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  activityContent: {
    flex: 1,
    marginLeft: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityTime: {
    fontSize: 11,
    color: '#666',
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activityText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 6,
  },
  activityGame: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  activityGameImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#333',
  },
  activityGameOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  profileModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  profileUsername: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileRealName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  profileStats: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 40,
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00FF88',
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  profileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  messageButton: {
    backgroundColor: '#333',
  },
  challengeButton: {
    backgroundColor: '#00FF88',
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  activityTogether: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noActivity: {
    fontSize: 14,
    color: '#666',
  },
  mutualGameImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 8,
  },
  blockButton: {
    margin: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
  },
  privacyModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privacySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonActive: {
    borderColor: '#00FF88',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF88',
  },
  privacyOptionText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  privacyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  privacyToggleText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  manageBlockedButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  manageBlockedText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Portrait mode optimizations
  headerPortrait: {
    paddingVertical: 10,
  },
  tabPortrait: {
    paddingVertical: 8,
  },
  searchContainerPortrait: {
    paddingTop: 10,
  },
  friendCardPortrait: {
    marginBottom: 8,
  },
  activityItemPortrait: {
    marginBottom: 8,
  },
  requestCardPortrait: {
    marginBottom: 10,
  },
  sectionPortrait: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
