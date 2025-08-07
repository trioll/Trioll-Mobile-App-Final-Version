import type { User } from './../../src/types/api.types';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Animated, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';

type UserStatus = 'active' | 'suspended' | 'banned';
type ViolationType = 'spam' | 'harassment' | 'cheating' | 'inappropriate' | 'other';
type ActionType = 'suspend' | 'ban' | 'unsuspend' | 'unban' | 'warn';

interface AdminManagedUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
  joinedAt: Date;
  lastActive: Date;
  status: UserStatus;
  level: number;
  totalGamesPlayed: number;
  totalPlayTime: number;
  reports: number;
  violations: Violation[];
  appeals: Appeal[];
}

interface Violation {
  id: string;
  type: ViolationType;
  description: string;
  date: Date;
  action: string;
  admin: string;
}

interface Appeal {
  id: string;
  date: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewDate?: Date;
}

interface SearchFilters {
  status: UserStatus | 'all';
  hasViolations: boolean;
  hasAppeals: boolean;
}

export const UserManagement: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('7');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    status: 'all',
    hasViolations: false,
    hasAppeals: false,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Mock users
  const [users] = useState<User[]>([
    {
      id: '1',
      username: 'ProGamer123',
      email: 'progamer@email.com',
      avatar: 'https://picsum.photos/100/100?random=1',
      joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 3600000),
      status: 'active',
      level: 42,
      totalGamesPlayed: 156,
      totalPlayTime: 4320,
      reports: 0,
      violations: [],
      appeals: [],
    },
    {
      id: '2',
      username: 'ToxicPlayer99',
      email: 'toxic99@email.com',
      avatar: 'https://picsum.photos/100/100?random=2',
      joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 7200000),
      status: 'suspended',
      level: 28,
      totalGamesPlayed: 89,
      totalPlayTime: 2100,
      reports: 12,
      violations: [
        {
          id: 'v1',
          type: 'harassment',
          description: 'Harassing other players in chat',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          action: 'Suspended for 7 days',
          admin: 'Admin_Mike',
        },
        {
          id: 'v2',
          type: 'inappropriate',
          description: 'Inappropriate username',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          action: 'Warning issued',
          admin: 'Admin_Sarah',
        },
      ],
      appeals: [
        {
          id: 'a1',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          reason: 'I promise to follow the rules. Please unban me.',
          status: 'pending',
        },
      ],
    },
    {
      id: '3',
      username: 'Cheater2024',
      email: 'cheater@email.com',
      avatar: 'https://picsum.photos/100/100?random=3',
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      status: 'banned',
      level: 15,
      totalGamesPlayed: 34,
      totalPlayTime: 800,
      reports: 25,
      violations: [
        {
          id: 'v3',
          type: 'cheating',
          description: 'Using automated tools to gain unfair advantage',
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          action: 'Permanently banned',
          admin: 'Admin_Lisa',
        },
      ],
      appeals: [
        {
          id: 'a2',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          reason: "It was a mistake. I didn't cheat.",
          status: 'rejected',
          reviewedBy: 'Admin_Mike',
          reviewDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        },
      ],
    },
  ]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.spring(searchAnim, {
        toValue: 1,
        ...SPRING_CONFIGS.BOUNCY,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSearch = () => {
    haptics.impact('light');
    // Perform search
  };

  const handleUserPress = (user: User) => {
    haptics.impact('light');
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleAction = (action: ActionType) => {
    if (!selectedUser) return;

    haptics.impact('medium');
    setSelectedAction(action);
    setShowActionModal(true);
  };

  const confirmAction = () => {
    if (!actionReason.trim()) {
      (haptics as any).error();
      Alert.alert('Reason Required', 'Please provide a reason for this action');
      return;
    }

    setIsProcessing(true);
    haptics.impact('medium');

    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      (haptics as any).success();

      Alert.alert('Success', `User has been ${selectedAction}ed successfully`, [
        {
          text: 'OK',
          onPress: () => {
            setShowActionModal(false);
            setShowUserModal(false);
            setActionReason('');
            setSelectedAction(null);
          },
        },
      ]);
    }, 2000);
  };

  const renderUser = (user: User) => {
    const statusColors = {
      active: '#00FF88',
      suspended: '#FFAA00',
      banned: '#FF4444',
    };

    const timeSinceActive = getTimeAgo(user.lastActive);

    return (
      <Pressable key={user.id} onPress={() => handleUserPress(user)} style={styles.userCard}>
        <Image source={{ uri: user.avatar }} style={styles.userAvatar} />

        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.username}>{user.username}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColors[user.status] + '20' }]}
            >
              <View style={[styles.statusDot, { backgroundColor: statusColors[user.status] }]} />
              <Text style={[styles.statusText, { color: statusColors[user.status] }]}>
                {user.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Ionicons name="game-controller-outline" size={14} color="#666" />
              <Text style={styles.statText}>{user.totalGamesPlayed} games</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.statText}>{timeSinceActive}</Text>
            </View>
            {user.reports > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="flag-outline" size={14} color="#FF4444" />
                <Text style={[styles.statText, { color: '#FF4444' }]}>{user.reports} reports</Text>
              </View>
            )}
          </View>

          {user.violations.length > 0 && (
            <View style={styles.violationBadge}>
              <Ionicons name="warning" size={14} color="#FFAA00" />
              <Text style={styles.violationText}>{user.violations.length} violations</Text>
            </View>
          )}

          {user.appeals.filter(a => a.status === 'pending').length > 0 && (
            <View style={styles.appealBadge}>
              <Ionicons name="document-text" size={14} color="#6366f1" />
              <Text style={styles.appealText}>Appeal pending</Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#666" />
      </Pressable>
    );
  };

  const renderUserModal = () => {
    if (!selectedUser) return null;

    return (
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
          <View style={styles.userModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  setShowUserModal(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* User Profile */}
                <View style={styles.profileSection}>
                  <Image source={{ uri: selectedUser.avatar }} style={styles.modalAvatar} />
                  <Text style={styles.modalUsername}>{selectedUser.username}</Text>
                  <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: getStatusColor(selectedUser.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        { color: getStatusColor(selectedUser.status) },
                      ]}
                    >
                      {selectedUser.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* User Stats */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>Lvl {selectedUser.level}</Text>
                    <Text style={styles.statLabel}>Level</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{selectedUser.totalGamesPlayed}</Text>
                    <Text style={styles.statLabel}>Games</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {Math.floor(selectedUser.totalPlayTime / 60)}h
                    </Text>
                    <Text style={styles.statLabel}>Play Time</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#FF4444' }]}>
                      {selectedUser.reports}
                    </Text>
                    <Text style={styles.statLabel}>Reports</Text>
                  </View>
                </View>

                {/* Account Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Account Information</Text>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={styles.infoValue}>{selectedUser.id}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Joined</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser.joinedAt.toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Last Active</Text>
                    <Text style={styles.infoValue}>{getTimeAgo(selectedUser.lastActive)}</Text>
                  </View>
                </View>

                {/* Violations */}
                {selectedUser.violations.length > 0 && (
                  <View style={styles.violationsSection}>
                    <Text style={styles.sectionTitle}>Violation History</Text>
                    {selectedUser.violations.map(violation => (
                      <View key={violation.id} style={styles.violationCard}>
                        <View style={styles.violationHeader}>
                          <Text style={styles.violationType}>{violation.type}</Text>
                          <Text style={styles.violationDate}>
                            {violation.date.toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.violationDescription}>{violation.description}</Text>
                        <Text style={styles.violationAction}>Action: {violation.action}</Text>
                        <Text style={styles.violationAdmin}>By: {violation.admin}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Appeals */}
                {selectedUser.appeals.length > 0 && (
                  <View style={styles.appealsSection}>
                    <Text style={styles.sectionTitle}>Appeals</Text>
                    {selectedUser.appeals.map(appeal => (
                      <View key={appeal.id} style={styles.appealCard}>
                        <View style={styles.appealHeader}>
                          <Text style={styles.appealDate}>{appeal.date.toLocaleDateString()}</Text>
                          <View
                            style={[
                              styles.appealStatusBadge,
                              { backgroundColor: getAppealStatusColor(appeal.status) + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.appealStatusText,
                                { color: getAppealStatusColor(appeal.status) },
                              ]}
                            >
                              {appeal.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.appealReason}>{appeal.reason}</Text>
                        {appeal.reviewedBy && (
                          <Text style={styles.appealReviewer}>
                            Reviewed by {appeal.reviewedBy} on{' '}
                            {appeal.reviewDate?.toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsSection}>
                  <Text style={styles.sectionTitle}>Admin Actions</Text>
                  <View style={styles.actionButtons}>
                    {selectedUser.status === 'active' && (
                      <>
                        <Pressable
                          onPress={() => handleAction('warn')}
                          style={[styles.actionButton, styles.warnButton]}
                        >
                          <Ionicons name="warning-outline" size={20} color="#FFAA00" />
                          <Text style={[styles.actionButtonText, { color: '#FFAA00' }]}>Warn</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleAction('suspend')}
                          style={[styles.actionButton, styles.suspendButton]}
                        >
                          <Ionicons name="pause-circle-outline" size={20} color="#FF6B6B" />
                          <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
                            Suspend
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleAction('ban')}
                          style={[styles.actionButton, styles.banButton]}
                        >
                          <Ionicons name="ban-outline" size={20} color="#FF4444" />
                          <Text style={[styles.actionButtonText, { color: '#FF4444' }]}>Ban</Text>
                        </Pressable>
                      </>
                    )}
                    {selectedUser.status === 'suspended' && (
                      <>
                        <Pressable
                          onPress={() => handleAction('unsuspend')}
                          style={[styles.actionButton, styles.unsuspendButton]}
                        >
                          <Ionicons name="play-circle-outline" size={20} color="#00FF88" />
                          <Text style={[styles.actionButtonText, { color: '#00FF88' }]}>
                            Unsuspend
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleAction('ban')}
                          style={[styles.actionButton, styles.banButton]}
                        >
                          <Ionicons name="ban-outline" size={20} color="#FF4444" />
                          <Text style={[styles.actionButtonText, { color: '#FF4444' }]}>Ban</Text>
                        </Pressable>
                      </>
                    )}
                    {selectedUser.status === 'banned' && (
                      <Pressable
                        onPress={() => handleAction('unban')}
                        style={[styles.actionButton, styles.unbanButton]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#00FF88" />
                        <Text style={[styles.actionButtonText, { color: '#00FF88' }]}>Unban</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderActionModal = () => {
    if (!selectedAction || !selectedUser) return null;

    return (
      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
          <View style={styles.actionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} User
              </Text>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  setShowActionModal(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.actionModalContent}>
              <Text style={styles.actionTargetText}>
                Action will be applied to:{' '}
                <Text style={styles.actionTargetUser}>{selectedUser.username}</Text>
              </Text>

              {(selectedAction === 'suspend' || selectedAction === 'ban') && (
                <View style={styles.durationSection}>
                  <Text style={styles.inputLabel}>Duration</Text>
                  <View style={styles.durationOptions}>
                    {['7', '14', '30', 'permanent'].map(duration => (
                      <Pressable
                        key={duration}
                        onPress={() => {
                          haptics.selection();
                          setActionDuration(duration);
                        }}
                        style={[
                          styles.durationOption,
                          actionDuration === duration && styles.durationOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.durationText,
                            actionDuration === duration && styles.durationTextActive,
                          ]}
                        >
                          {duration === 'permanent' ? 'Permanent' : `${duration} days`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.reasonSection}>
                <Text style={styles.inputLabel}>Reason</Text>
                <TextInput
                  style={styles.reasonInput}
                  value={actionReason}
                  onChangeText={setActionReason}
                  placeholder="Provide a reason for this action..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.actionModalButtons}>
                <Pressable
                  onPress={() => {
                    haptics.impact('light');
                    setShowActionModal(false);
                    setActionReason('');
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={confirmAction}
                  style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  )}
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
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const getStatusColor = (status: UserStatus): string => {
    switch (status) {
      case 'active':
        return '#00FF88';
      case 'suspended':
        return '#FFAA00';
      case 'banned':
        return '#FF4444';
    }
  };

  const getAppealStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#6366f1';
      case 'approved':
        return '#00FF88';
      case 'rejected':
        return '#FF4444';
      default:
        return '#666';
    }
  };

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

          <Text style={styles.headerTitle}>User Management</Text>

          <Pressable
            onPress={() => {
              haptics.impact('light');
              setShowFilters(!showFilters);
            }}
            style={styles.filterButton}
          >
            <Ionicons name="filter" size={20} color="#FFFFFF" />
            {(filters.status !== 'all' || filters.hasViolations || filters.hasAppeals) && (
              <View style={styles.filterDot} />
            )}
          </Pressable>
        </View>

        {/* Search Bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              transform: [{ scale: searchAnim }],
            },
          ]}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by username, email, or ID..."
              placeholderTextColor="#666"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setSearchQuery('');
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setFilters({ ...filters, status: filters.status === 'all' ? 'active' : 'all' });
                }}
                style={[styles.filterChip, filters.status !== 'all' && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.status !== 'all' && styles.filterChipTextActive,
                  ]}
                >
                  Status: {filters.status}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setFilters({ ...filters, hasViolations: !filters.hasViolations });
                }}
                style={[styles.filterChip, filters.hasViolations && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.hasViolations && styles.filterChipTextActive,
                  ]}
                >
                  Has Violations
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setFilters({ ...filters, hasAppeals: !filters.hasAppeals });
                }}
                style={[styles.filterChip, filters.hasAppeals && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterChipText, filters.hasAppeals && styles.filterChipTextActive]}
                >
                  Has Appeals
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* Users List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.usersList}>
          {users.map(user => renderUser(user))}
        </ScrollView>

        {/* User Details Modal */}
        {renderUserModal()}

        {/* Action Modal */}
        {renderActionModal()}
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
  filterButton: {
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
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  violationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFAA0020',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  violationText: {
    fontSize: 12,
    color: '#FFAA00',
    fontWeight: '600',
  },
  appealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#6366f120',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  appealText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userModal: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
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
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    marginBottom: 12,
  },
  modalUsername: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  violationsSection: {
    marginBottom: 24,
  },
  violationCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFAA0050',
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  violationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFAA00',
    textTransform: 'capitalize',
  },
  violationDate: {
    fontSize: 12,
    color: '#666',
  },
  violationDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  violationAction: {
    fontSize: 12,
    color: '#666',
  },
  violationAdmin: {
    fontSize: 12,
    color: '#666',
  },
  appealsSection: {
    marginBottom: 24,
  },
  appealCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6366f150',
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appealDate: {
    fontSize: 14,
    color: '#666',
  },
  appealStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appealStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  appealReason: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  appealReviewer: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsSection: {
    marginTop: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  warnButton: {
    borderColor: '#FFAA00',
    backgroundColor: '#FFAA0010',
  },
  suspendButton: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B10',
  },
  banButton: {
    borderColor: '#FF4444',
    backgroundColor: '#FF444410',
  },
  unsuspendButton: {
    borderColor: '#00FF88',
    backgroundColor: '#00FF8810',
  },
  unbanButton: {
    borderColor: '#00FF88',
    backgroundColor: '#00FF8810',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionModal: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionModalContent: {
    padding: 20,
  },
  actionTargetText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  actionTargetUser: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  durationSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  durationOptionActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
