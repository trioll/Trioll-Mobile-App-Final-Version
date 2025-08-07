
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Animated, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

interface GameStatus {
  status: 'published' | 'pending' | 'draft' | 'rejected';
  message?: string;
  lastUpdated: Date;
}

interface GameVersion {
  id: string;
  version: string;
  platform: string;
  releaseDate: Date;
  size: number;
  status: 'live' | 'review' | 'rejected';
  notes: string;
}

interface UserFeedback {
  id: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  date: Date;
  helpful: number;
  responded: boolean;
}

export const GameManagement: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'GameManagement'>>();
  const route = useRoute();
  const haptics = useHaptics();
  const gameId = (route.params as { gameId?: string })?.gameId || '1';

  // const [refreshing] = useState(false); // For future refresh control
  const [activeTab, setActiveTab] = useState<'overview' | 'metadata' | 'builds' | 'feedback'>(
    'overview'
  );
  const [isEditing, setIsEditing] = useState(false);

  // Mock game data
  const [gameData, setGameData] = useState({
    id: gameId || '1',
    title: 'Space Shooter Pro',
    oneLiner: 'Intense space combat with stunning visuals',
    description:
      'Battle through waves of alien invaders in this fast-paced space shooter. Features stunning graphics, intense gameplay, and epic boss battles.',
    icon: 'https://picsum.photos/200/200?random=1',
    coverImage: 'https://picsum.photos/800/450?random=1',
    status: {
      status: 'published' as const,
      lastUpdated: new Date(),
    },
    visibility: true,
    genres: ['Action', 'Arcade'],
    ageRating: '12+',
    platforms: ['iOS', 'Android', 'Web'],
    trialDuration: 5,
    totalPlays: 45200,
    avgRating: 4.8,
    totalRatings: 3420,
    revenue: 3250,
    activeUsers: 12500,
  });

  const [versions] = useState<GameVersion[]>([
    {
      id: '1',
      version: '1.2.0',
      platform: 'iOS',
      releaseDate: new Date(Date.now() - 86400000),
      size: 125.4,
      status: 'live',
      notes: 'Bug fixes and performance improvements',
    },
    {
      id: '2',
      version: '1.2.0',
      platform: 'Android',
      releaseDate: new Date(Date.now() - 86400000),
      size: 118.2,
      status: 'live',
      notes: 'Bug fixes and performance improvements',
    },
    {
      id: '3',
      version: '1.3.0',
      platform: 'iOS',
      releaseDate: new Date(),
      size: 130.1,
      status: 'review',
      notes: 'New levels and gameplay features',
    },
  ]);

  const [feedback] = useState<UserFeedback[]>([
    {
      id: '1',
      userId: 'user1',
      username: 'GamerPro123',
      rating: 5,
      comment: 'Amazing game! The graphics are stunning and the gameplay is addictive.',
      date: new Date(Date.now() - 3600000),
      helpful: 23,
      responded: false,
    },
    {
      id: '2',
      userId: 'user2',
      username: 'SpaceAce',
      rating: 4,
      comment: 'Great game but needs more levels. Looking forward to updates!',
      date: new Date(Date.now() - 7200000),
      helpful: 15,
      responded: true,
    },
  ]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  // const handleRefresh = () => {
  //   setRefreshing(true);
  //   setTimeout(() => {
  //     setRefreshing(false);
  //     (haptics as any).success();
  //   }, 1500);
  // };

  const handleSaveChanges = () => {
    (haptics as any).success();
    setIsEditing(false);
    Alert.alert('Success', 'Your changes have been saved.');
  };

  const handlePublishToggle = () => {
    const newVisibility = !gameData.visibility;
    haptics.toggle(newVisibility);

    Alert.alert(
      newVisibility ? 'Publish Game' : 'Unpublish Game',
      newVisibility
        ? 'This will make your game visible to all players.'
        : 'This will hide your game from players.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setGameData(prev => ({ ...prev, visibility: newVisibility }));
          },
        },
      ]
    );
  };

  const renderStatusBadge = (status: GameStatus) => {
    const colors = {
      published: '#00FF88',
      pending: '#FFAA00',
      draft: '#666',
      rejected: '#FF4444',
    };

    return (
      <View style={[styles.statusBadge, { backgroundColor: colors[status.status] + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: colors[status.status] }]} />
        <Text style={[styles.statusText, { color: colors[status.status] }]}>
          {status.status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.overviewContent}>
        {/* Game Info Card */}
        <View style={styles.infoCard}>
          <Image source={{ uri: gameData.coverImageUrl }} style={styles.coverImageUrl} />
          <View style={styles.infoContent}>
            <View style={styles.infoHeader}>
              <Image source={{ uri: gameData.icon }} style={styles.gameIcon} />
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>{gameData.title}</Text>
                <Text style={styles.gameOneLiner}>{gameData.oneLiner}</Text>
                {renderStatusBadge(gameData.status)}
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="play-circle" size={24} color="#6366f1" />
            <Text style={styles.statValue}>{gameData.totalPlays.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Plays</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={styles.statValue}>{gameData.avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statCard}>
            <FontAwesome5 name="dollar-sign" size={24} color="#00FF88" />
            <Text style={styles.statValue}>${gameData.revenue}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#FF0066" />
            <Text style={styles.statValue}>{gameData.activeUsers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => navigation.navigate('AnalyticsDashboard' as keyof RootStackParamList, { gameId } as any)}
            style={styles.actionButton}
          >
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.actionGradient}>
              <Ionicons name="analytics" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>View Analytics</Text>
            </LinearGradient>
          </Pressable>

          {/* Upload functionality moved to web portal */}
          {/* <Pressable
            onPress={() => setActiveTab('builds')}
            style={[styles.actionButton, styles.actionButtonSecondary]}
          >
            <Ionicons name="cloud-upload" size={20} color="#6366f1" />
            <Text style={[styles.actionText, { color: '#6366f1' }]}>Upload New Build</Text>
          </Pressable> */}
        </View>

        {/* Visibility Toggle */}
        <View style={styles.visibilitySection}>
          <View style={styles.visibilityHeader}>
            <View>
              <Text style={styles.visibilityTitle}>Game Visibility</Text>
              <Text style={styles.visibilityDescription}>
                {gameData.visibility
                  ? 'Your game is live and visible to players'
                  : 'Your game is hidden from players'}
              </Text>
            </View>
            <Switch
              value={gameData.visibility}
              onValueChange={handlePublishToggle}
              trackColor={{ false: '#333', true: '#00FF88' }}
              thumbColor={gameData.visibility ? '#FFFFFF' : '#666'}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderMetadata = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.metadataContent}>
        {!isEditing ? (
          <>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                setIsEditing(true);
              }}
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={20} color="#6366f1" />
              <Text style={styles.editButtonText}>Edit Metadata</Text>
            </Pressable>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataLabel}>Title</Text>
              <Text style={styles.metadataValue}>{gameData.title}</Text>
            </View>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataLabel}>One-liner</Text>
              <Text style={styles.metadataValue}>{gameData.oneLiner}</Text>
            </View>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataLabel}>Description</Text>
              <Text style={styles.metadataValue}>{gameData.description}</Text>
            </View>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataLabel}>Genres</Text>
              <View style={styles.tagContainer}>
                {gameData.genres.map(genre => (
                  <View key={genre} style={styles.tag}>
                    <Text style={styles.tagText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataLabel}>Age Rating</Text>
              <Text style={styles.metadataValue}>{gameData.ageRating}</Text>
            </View>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataLabel}>Platforms</Text>
              <View style={styles.tagContainer}>
                {gameData.platforms.map(platform => (
                  <View key={platform} style={styles.tag}>
                    <Text style={styles.tagText}>{platform}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.metadataSection}>
              <Text style={styles.metadataLabel}>Trial Duration</Text>
              <Text style={styles.metadataValue}>0 minutes</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.editHeader}>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  setIsEditing(false);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveChanges} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={gameData.title}
                onChangeText={text => setGameData(prev => ({ ...prev, title: text }))}
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>One-liner</Text>
              <TextInput
                style={styles.input}
                value={gameData.oneLiner}
                onChangeText={text => setGameData(prev => ({ ...prev, oneLiner: text }))}
                placeholderTextColor="#666"
                maxLength={60}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={gameData.description}
                onChangeText={text => setGameData(prev => ({ ...prev, description: text }))}
                placeholderTextColor="#666"
                multiline
                numberOfLines={5}
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );

  const renderBuilds = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.buildsContent}>
        {/* Upload functionality moved to web portal */}
        <View style={styles.uploadInfoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#6366f1" />
          <Text style={styles.uploadInfoText}>
            Upload new builds at trioll.com/developer
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Version History</Text>
        {versions.map(version => (
          <View key={version.id} style={styles.versionCard}>
            <View style={styles.versionHeader}>
              <View style={styles.versionInfo}>
                <Text style={styles.versionNumber}>v{version.version}</Text>
                <Text style={styles.versionPlatform}>{version.platform}</Text>
                <View style={[styles.versionBadge, styles[`version${version.status}`]]}>
                  <Text style={styles.versionBadgeText}>{version.status.toUpperCase()}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  // Handle version actions
                }}
                style={styles.versionActions}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#666" />
              </Pressable>
            </View>
            <Text style={styles.versionNotes}>{version.notes}</Text>
            <View style={styles.versionMeta}>
              <Text style={styles.versionMetaText}>{version.releaseDate.toLocaleDateString()}</Text>
              <Text style={styles.versionMetaText}>•</Text>
              <Text style={styles.versionMetaText}>{version.size} MB</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderFeedback = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.feedbackContent}>
        <View style={styles.feedbackStats}>
          <View style={styles.feedbackStatCard}>
            <Text style={styles.feedbackStatValue}>{gameData.avgRating.toFixed(1)}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <Ionicons
                  key={star}
                  name="star"
                  size={16}
                  color={star <= Math.round(gameData.avgRating) ? '#FFD700' : '#333'}
                />
              ))}
            </View>
            <Text style={styles.feedbackStatLabel}>{gameData.totalRatings} ratings</Text>
          </View>

          <View style={styles.ratingDistribution}>
            {[5, 4, 3, 2, 1].map(rating => {
              const percentage =
                rating === 5 ? 65 : rating === 4 ? 25 : rating === 3 ? 7 : rating === 2 ? 2 : 1;
              return (
                <View key={rating} style={styles.ratingBar}>
                  <Text style={styles.ratingNumber}>{rating}</Text>
                  <View style={styles.ratingBarTrack}>
                    <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.ratingPercentage}>{percentage}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Reviews</Text>
        {feedback.map(item => (
          <View key={item.id} style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <View style={styles.feedbackUser}>
                <View style={styles.feedbackAvatar}>
                  <Text style={styles.feedbackAvatarText}>
                    {item.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.feedbackUsername}>{item.username}</Text>
                  <View style={styles.feedbackRating}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons
                        key={star}
                        name="star"
                        size={12}
                        color={star <= item.rating ? '#FFD700' : '#333'}
                      />
                    ))}
                    <Text style={styles.feedbackDate}>{item.date.toLocaleDateString()}</Text>
                  </View>
                </View>
              </View>
              {item.responded && (
                <View style={styles.respondedBadge}>
                  <Ionicons name="checkmark" size={12} color="#00FF88" />
                  <Text style={styles.respondedText}>Responded</Text>
                </View>
              )}
            </View>
            <Text style={styles.feedbackComment}>{item.comment}</Text>
            <View style={styles.feedbackActions}>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  // Handle reply
                }}
                style={styles.feedbackAction}
              >
                <Ionicons name="chatbox-outline" size={16} color="#6366f1" />
                <Text style={styles.feedbackActionText}>Reply</Text>
              </Pressable>
              <View style={styles.feedbackHelpful}>
                <Ionicons name="thumbs-up" size={16} color="#666" />
                <Text style={styles.feedbackHelpfulText}>{item.helpful} helpful</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Game Management</Text>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              // Handle more options
            }}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['overview', 'metadata', 'builds', 'feedback'] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => {
                haptics.selection();
                setActiveTab(tab);
              }}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'metadata' && renderMetadata()}
          {activeTab === 'builds' && renderBuilds()}
          {activeTab === 'feedback' && renderFeedback()}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  tabContent: {
    flex: 1,
  },
  overviewContent: {
    padding: 24,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#000',
  },
  infoContent: {
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  gameIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gameOneLiner: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  visibilitySection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  visibilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  visibilityDescription: {
    fontSize: 14,
    color: '#666',
  },
  metadataContent: {
    padding: 24,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    gap: 8,
    marginBottom: 24,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  metadataSection: {
    marginBottom: 24,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metadataValue: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  tagText: {
    fontSize: 14,
    color: '#999',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366f1',
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  buildsContent: {
    padding: 24,
  },
  uploadInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  uploadInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  versionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionPlatform: {
    fontSize: 14,
    color: '#666',
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionlive: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  versionreview: {
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
  },
  versionrejected: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionActions: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionNotes: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  versionMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  versionMetaText: {
    fontSize: 12,
    color: '#666',
  },
  feedbackContent: {
    padding: 24,
  },
  feedbackStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  feedbackStatCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  feedbackStatValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  feedbackStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  ratingDistribution: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 14,
    color: '#FFFFFF',
    width: 20,
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingPercentage: {
    fontSize: 12,
    color: '#666',
    width: 35,
    textAlign: 'right',
  },
  feedbackCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackUser: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  feedbackUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  feedbackRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  respondedText: {
    fontSize: 12,
    color: '#00FF88',
    fontWeight: '600',
  },
  feedbackComment: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackActionText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  feedbackHelpful: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackHelpfulText: {
    fontSize: 12,
    color: '#666',
  },
});
