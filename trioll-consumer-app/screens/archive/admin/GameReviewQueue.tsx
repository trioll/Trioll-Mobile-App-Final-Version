
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, RefreshControl, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
import type { RootStackParamList } from '../../navigation/types';

type CheckStatus = 'pending' | 'pass' | 'fail' | 'warning';
type Priority = 'high' | 'medium' | 'low';
type SortOption = 'newest' | 'oldest' | 'priority' | 'developer';

interface AutoCheck {
  id: string;
  name: string;
  status: CheckStatus;
  message?: string;
  severity?: 'critical' | 'warning' | 'info';
}

interface GameSubmission {
  id: string;
  title: string;
  developer: string;
  developerId: string;
  icon: string;
  coverImage: string;
  submittedAt: Date;
  priority: Priority;
  platform: string[];
  version: string;
  fileSize: number;
  autoChecks: AutoCheck[];
  previousVersions: number;
  flaggedContent: boolean;
  internalNotes?: string;
}

interface FilterState {
  priority: Priority | 'all';
  platform: string | 'all';
  status: 'pending' | 'failed' | 'all';
}

export const GameReviewQueue: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'GameReviewQueue'>>();
  const haptics = useHaptics();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewGame, setPreviewGame] = useState<GameSubmission | null>(null);
  const [batchMode, setBatchMode] = useState(false);

  const [filters] = useState<FilterState>({
    priority: 'all',
    platform: 'all',
    status: 'all',
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  // Mock submissions
  const [submissions] = useState<GameSubmission[]>([
    {
      id: '1',
      title: 'Space Shooter Pro',
      developer: 'Galaxy Games Studio',
      developerId: 'dev_123',
      icon: 'https://picsum.photos/100/100?random=1',
      coverImage: 'https://picsum.photos/400/225?random=1',
      submittedAt: new Date(Date.now() - 3600000),
      priority: 'high',
      platform: ['iOS', 'Android'],
      version: '1.0.0',
      fileSize: 124.5,
      autoChecks: [
        { id: 'integrity', name: 'File Integrity', status: 'pass' },
        {
          id: 'performance',
          name: 'Performance',
          status: 'warning',
          message: 'High memory usage detected',
        },
        { id: 'content', name: 'Content Scan', status: 'pass' },
        { id: 'policy', name: 'Policy Check', status: 'pass' },
        { id: 'malware', name: 'Security Scan', status: 'pass' },
      ],
      previousVersions: 0,
      flaggedContent: false,
    },
    {
      id: '2',
      title: 'Zombie Survival',
      developer: 'Dark Arts Gaming',
      developerId: 'dev_456',
      icon: 'https://picsum.photos/100/100?random=2',
      coverImage: 'https://picsum.photos/400/225?random=2',
      submittedAt: new Date(Date.now() - 7200000),
      priority: 'high',
      platform: ['iOS', 'Android', 'Web'],
      version: '2.1.0',
      fileSize: 256.8,
      autoChecks: [
        { id: 'integrity', name: 'File Integrity', status: 'pass' },
        { id: 'performance', name: 'Performance', status: 'pass' },
        {
          id: 'content',
          name: 'Content Scan',
          status: 'fail',
          message: 'Excessive violence detected',
          severity: 'critical',
        },
        { id: 'policy', name: 'Policy Check', status: 'fail', message: 'Missing age rating' },
        { id: 'malware', name: 'Security Scan', status: 'pass' },
      ],
      previousVersions: 3,
      flaggedContent: true,
      internalNotes: 'Previous version had similar content issues',
    },
    {
      id: '3',
      title: 'Puzzle Paradise',
      developer: 'Casual Fun Inc',
      developerId: 'dev_789',
      icon: 'https://picsum.photos/100/100?random=3',
      coverImage: 'https://picsum.photos/400/225?random=3',
      submittedAt: new Date(Date.now() - 86400000),
      priority: 'medium',
      platform: ['Web'],
      version: '1.2.0',
      fileSize: 45.2,
      autoChecks: [
        { id: 'integrity', name: 'File Integrity', status: 'pass' },
        { id: 'performance', name: 'Performance', status: 'pass' },
        { id: 'content', name: 'Content Scan', status: 'pass' },
        { id: 'policy', name: 'Policy Check', status: 'pass' },
        { id: 'malware', name: 'Security Scan', status: 'pending' },
      ],
      previousVersions: 1,
      flaggedContent: false,
    },
  ]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...SPRING_CONFIGS.BOUNCY,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    haptics.impact('light');

    setTimeout(() => {
      setRefreshing(false);
      (haptics as any).success();
    }, 1500);
  };

  const handleSelectGame = (gameId: string) => {
    haptics.selection();
    if (selectedGames.includes(gameId)) {
      setSelectedGames(selectedGames.filter(id => id !== gameId));
    } else {
      setSelectedGames([...selectedGames, gameId]);
    }
  };

  const handleBatchAction = (action: 'approve' | 'reject') => {
    if (selectedGames.length === 0) {
      (haptics as any).error();
      Alert.alert('No Selection', 'Please select games to perform batch action');
      return;
    }

    haptics.impact('medium');
    Alert.alert(
      `Batch ${action === 'approve' ? 'Approve' : 'Reject'}`,
      `Are you sure you want to ${action} ${selectedGames.length} games?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => {
            (haptics as any).success();
            // Perform batch action
            setSelectedGames([]);
            setBatchMode(false);
          },
        },
      ]
    );
  };

  const handleQuickPreview = (game: GameSubmission) => {
    haptics.impact('light');
    setPreviewGame(game);
    setShowPreviewModal(true);
  };

  const getCheckIcon = (status: CheckStatus) => {
    switch (status) {
      case 'pass':
        return { name: 'checkmark-circle', color: '#00FF88' };
      case 'fail':
        return { name: 'close-circle', color: '#FF4444' };
      case 'warning':
        return { name: 'warning', color: '#FFAA00' };
      case 'pending':
        return { name: 'time', color: '#666' };
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return '#FF4444';
      case 'medium':
        return '#FFAA00';
      case 'low':
        return '#666';
    }
  };

  const renderGameSubmission = (game: GameSubmission) => {
    const checksummary = {
      pass: game.autoChecks.filter(c => c.status === 'pass').length,
      fail: game.autoChecks.filter(c => c.status === 'fail').length,
      warning: game.autoChecks.filter(c => c.status === 'warning').length,
      pending: game.autoChecks.filter(c => c.status === 'pending').length,
    };

    const hasIssues = checksummary.fail > 0 || checksummary.warning > 0;
    const timeAgo = getTimeAgo(game.submittedAt);

    return (
      <Pressable
        key={game.id}
        onPress={() => {
          if (batchMode) {
            handleSelectGame(game.id);
          } else {
            haptics.impact('light');
            navigation.navigate('DetailedReview' as keyof RootStackParamList, { gameId: game.id } as any);
          }
        }}
        onLongPress={() => {
          haptics.impact('medium');
          setBatchMode(true);
          handleSelectGame(game.id);
        }}
        style={[
          styles.submissionCard,
          hasIssues && styles.submissionCardWarning,
          selectedGames.includes(game.id) && styles.submissionCardSelected,
        ]}
      >
        {batchMode && (
          <View style={styles.selectionCheckbox}>
            <Ionicons
              name={selectedGames.includes(game.id) ? 'checkbox' : 'square-outline' as any}
              size={24}
              color={selectedGames.includes(game.id) ? '#6366f1' : '#666'}
            />
          </View>
        )}

        <Image source={{ uri: game.icon }} style={styles.gameIcon} />

        <View style={styles.gameInfo}>
          <View style={styles.gameHeader}>
            <View style={styles.gameTitleRow}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(game.priority) + '20' },
                ]}
              >
                <Text style={[styles.priorityText, { color: getPriorityColor(game.priority) }]}>
                  {game.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={(styles as any).developerName}>{game.developer}</Text>
          </View>

          <View style={styles.gameDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="phone-portrait-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{game.platform.join(', ')}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="code-outline" size={14} color="#666" />
              <Text style={styles.detailText}>v{game.version}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{timeAgo}</Text>
            </View>
          </View>

          <View style={styles.checksContainer}>
            <View style={styles.checkSummary}>
              {checksummary.pass > 0 && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#00FF88" />
                  <Text style={styles.checkCount}>{checksummary.pass}</Text>
                </View>
              )}
              {checksummary.fail > 0 && (
                <View style={styles.checkBadge}>
                  <Ionicons name="close-circle" size={16} color="#FF4444" />
                  <Text style={styles.checkCount}>{checksummary.fail}</Text>
                </View>
              )}
              {checksummary.warning > 0 && (
                <View style={styles.checkBadge}>
                  <Ionicons name="warning" size={16} color="#FFAA00" />
                  <Text style={styles.checkCount}>{checksummary.warning}</Text>
                </View>
              )}
              {checksummary.pending > 0 && (
                <View style={styles.checkBadge}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.checkCount}>{checksummary.pending}</Text>
                </View>
              )}
            </View>

            {game.flaggedContent && (
              <View style={styles.flagBadge}>
                <Ionicons name="flag" size={14} color="#FF4444" />
                <Text style={styles.flagText}>FLAGGED</Text>
              </View>
            )}
          </View>

          {hasIssues && (
            <View style={styles.issuesList}>
              {game.autoChecks
                .filter(check => check.status === 'fail' || check.status === 'warning')
                .slice(0, 2)
                .map(check => (
                  <View key={check.id} style={styles.issueItem}>
                    <Ionicons
                      name={getCheckIcon(check.status).name as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={getCheckIcon(check.status).color}
                    />
                    <Text style={styles.issueText} numberOfLines={1}>
                      {check.message}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </View>

        <Pressable onPress={() => handleQuickPreview(game)} style={styles.quickPreviewButton}>
          <Ionicons name="play-circle" size={32} color="#6366f1" />
        </Pressable>
      </Pressable>
    );
  };

  const renderPreviewModal = () => {
    if (!previewGame) return null;

    return (
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Quick Preview</Text>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  setShowPreviewModal(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.previewContent}>
              <Image source={{ uri: previewGame.coverImage }} style={styles.previewImage} />

              <View style={styles.previewInfo}>
                <Text style={styles.previewGameTitle}>{previewGame.title}</Text>
                <Text style={styles.previewDeveloper}>{previewGame.developer}</Text>

                <View style={styles.previewChecks}>
                  {previewGame.autoChecks.map(check => (
                    <View key={check.id} style={styles.previewCheck}>
                      <Ionicons
                        name={getCheckIcon(check.status).name as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={getCheckIcon(check.status).color}
                      />
                      <Text style={styles.previewCheckName}>{check.name}</Text>
                      {check.message && (
                        <Text style={styles.previewCheckMessage}>{check.message}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.previewActions}>
                <Pressable
                  onPress={() => {
                    haptics.impact('medium');
                    setShowPreviewModal(false);
                    navigation.navigate('DetailedReview' as keyof RootStackParamList, { gameId: previewGame.id } as any);
                  }}
                  style={styles.fullReviewButton}
                >
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.fullReviewGradient}>
                    <Text style={styles.fullReviewText}>Full Review</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
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

          <Text style={styles.headerTitle}>Review Queue</Text>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                setShowFilters(!showFilters);
              }}
              style={styles.headerButton}
            >
              <Ionicons name="filter" size={20} color="#FFFFFF" />
              {(filters.priority !== 'all' ||
                filters.platform !== 'all' ||
                filters.status !== 'all') && <View style={styles.filterDot} />}
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.impact('light');
                setBatchMode(!batchMode);
                setSelectedGames([]);
              }}
              style={styles.headerButton}
            >
              <Ionicons
                name="checkbox-outline"
                size={20}
                color={batchMode ? '#6366f1' : '#FFFFFF'}
              />
            </Pressable>
          </View>
        </View>

        {/* Queue Stats */}
        <View style={styles.queueStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{submissions.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF4444' }]}>
              {submissions.filter(s => s.autoChecks.some(c => c.status === 'fail')).length}
            </Text>
            <Text style={styles.statLabel}>Failed Checks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FFAA00' }]}>
              {submissions.filter(s => s.priority === 'high').length}
            </Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>
        </View>

        {/* Batch Actions */}
        {batchMode && selectedGames.length > 0 && (
          <View style={styles.batchActions}>
            <Text style={styles.batchText}>{selectedGames.length} selected</Text>
            <View style={styles.batchButtons}>
              <Pressable
                onPress={() => handleBatchAction('approve')}
                style={[styles.batchButton, styles.approveButton]}
              >
                <Ionicons name="checkmark" size={20} color="#00FF88" />
                <Text style={[styles.batchButtonText, { color: '#00FF88' }]}>Approve</Text>
              </Pressable>
              <Pressable
                onPress={() => handleBatchAction('reject')}
                style={[styles.batchButton, styles.rejectButton]}
              >
                <Ionicons name="close" size={20} color="#FF4444" />
                <Text style={[styles.batchButtonText, { color: '#FF4444' }]}>Reject</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Sort Options */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortContainer}
          contentContainerStyle={styles.sortContent}
        >
          {(['newest', 'oldest', 'priority', 'developer'] as SortOption[]).map(option => (
            <Pressable
              key={option}
              onPress={() => {
                haptics.selection();
                setSortBy(option);
              }}
              style={[styles.sortButton, sortBy === option && styles.sortButtonActive]}
            >
              <Text
                style={[styles.sortButtonText, sortBy === option && styles.sortButtonTextActive]}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Submissions List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
          }
          style={styles.submissionsList}
        >
          {submissions.map(game => renderGameSubmission(game))}
        </ScrollView>

        {/* Preview Modal */}
        {renderPreviewModal()}
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  batchText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  batchButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  approveButton: {
    borderColor: '#00FF88',
    backgroundColor: '#00FF8810',
  },
  rejectButton: {
    borderColor: '#FF4444',
    backgroundColor: '#FF444410',
  },
  batchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortContainer: {
    marginBottom: 16,
    maxHeight: 40,
  },
  sortContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  sortButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  submissionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  submissionCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  submissionCardWarning: {
    borderColor: '#FFAA0050',
  },
  submissionCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f110',
  },
  selectionCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  gameIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#000',
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameHeader: {
    marginBottom: 8,
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  developerName: {
    fontSize: 14,
    color: '#666',
  },
  gameDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  checksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkSummary: {
    flexDirection: 'row',
    gap: 8,
  },
  checkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FF444420',
    borderRadius: 4,
  },
  flagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF4444',
  },
  issuesList: {
    marginTop: 8,
    gap: 4,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  issueText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  quickPreviewButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000',
    marginBottom: 20,
  },
  previewInfo: {
    marginBottom: 20,
  },
  previewGameTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  previewDeveloper: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  previewChecks: {
    gap: 12,
  },
  previewCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewCheckName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  previewCheckMessage: {
    fontSize: 12,
    color: '#999',
    marginLeft: 32,
    marginTop: 4,
  },
  previewActions: {
    marginTop: 20,
  },
  fullReviewButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullReviewGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fullReviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
