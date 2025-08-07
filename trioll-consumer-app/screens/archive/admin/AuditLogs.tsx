
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Animated, Modal, Share, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';

type LogLevel = 'info' | 'warning' | 'error' | 'critical';
type ActionType =
  | 'game_approval'
  | 'game_rejection'
  | 'user_ban'
  | 'user_unban'
  | 'user_suspend'
  | 'content_removal'
  | 'flag_update'
  | 'cache_clear'
  | 'service_restart'
  | 'announcement_create'
  | 'settings_change'
  | 'emergency_action';

interface AuditLog {
  id: string;
  timestamp: Date;
  admin: string;
  action: ActionType;
  target: {
    type: string;
    id: string;
    name: string;
  };
  details: string;
  ip: string;
  userAgent: string;
  level: LogLevel;
  metadata?: Record<string, string | number | boolean>;
}

interface FilterState {
  admin: string;
  actionType: ActionType | 'all';
  level: LogLevel | 'all';
  dateRange: 'today' | '7d' | '30d' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export const AuditLogs: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    admin: 'all',
    actionType: 'all',
    level: 'all',
    dateRange: 'today',
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Mock audit logs
  const [logs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 600000),
      admin: 'Admin_Sarah',
      action: 'game_approval',
      target: {
        type: 'game',
        id: 'game_123',
        name: 'Space Shooter Pro',
      },
      details: 'Approved game after review. All checks passed.',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      level: 'info',
      metadata: {
        reviewDuration: '5 minutes',
        checksPasssed: 5,
      },
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1800000),
      admin: 'Admin_Mike',
      action: 'user_ban',
      target: {
        type: 'user',
        id: 'user_456',
        name: 'ToxicPlayer99',
      },
      details: 'Permanently banned user for repeated violations.',
      ip: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      level: 'warning',
      metadata: {
        reason: 'Harassment',
        previousWarnings: 3,
      },
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 3600000),
      admin: 'Admin_Lisa',
      action: 'flag_update',
      target: {
        type: 'feature_flag',
        id: 'new_trial_player',
        name: 'New Trial Player',
      },
      details: 'Enabled feature flag for 100% of users.',
      ip: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      level: 'info',
      metadata: {
        previousValue: false,
        newValue: true,
        rolloutPercentage: 100,
      },
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 7200000),
      admin: 'Admin_John',
      action: 'emergency_action',
      target: {
        type: 'system',
        id: 'maintenance_mode',
        name: 'Maintenance Mode',
      },
      details: 'Activated emergency maintenance mode due to critical issue.',
      ip: '192.168.1.103',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)',
      level: 'critical',
      metadata: {
        reason: 'Database connection issues',
        estimatedDowntime: '30 minutes',
      },
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 10800000),
      admin: 'Admin_Sarah',
      action: 'content_removal',
      target: {
        type: 'content',
        id: 'comment_789',
        name: 'User Comment',
      },
      details: 'Removed inappropriate content reported by multiple users.',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      level: 'warning',
      metadata: {
        reports: 12,
        violationType: 'Spam',
      },
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

  const handleExport = async (format: 'csv' | 'json') => {
    haptics.impact('medium');
    setIsExporting(true);

    // Simulate export
    setTimeout(async () => {
      setIsExporting(false);
      (haptics as any).success();

      const exportData = format === 'csv' ? generateCSV(logs) : JSON.stringify(logs, null, 2);

      try {
        await Share.share({
          message: Platform.OS === 'ios' ? undefined : exportData,
          url: Platform.OS === 'ios' ? `data:text/${format};base64,${btoa(exportData)}` : undefined,
          title: `Audit Logs Export - ${new Date().toISOString()}`,
        });
      } catch {
        Alert.alert('Export Failed', 'Unable to export audit logs');
      }
    }, 1500);
  };

  const generateCSV = (data: AuditLog[]): string => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Target', 'Details', 'Level', 'IP'];
    const rows = data.map(log => [
      log.timestamp.toISOString(),
      log.admin,
      log.action,
      `${log.target.type}:${log.target.name}`,
      log.details,
      log.level,
      log.ip,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const getActionColor = (action: ActionType): string => {
    switch (action) {
      case 'game_approval':
      case 'user_unban':
        return '#00FF88';
      case 'game_rejection':
      case 'user_ban':
      case 'content_removal':
        return '#FF4444';
      case 'user_suspend':
      case 'flag_update':
        return '#FFAA00';
      case 'emergency_action':
        return '#FF0066';
      default:
        return '#6366f1';
    }
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'info':
        return '#6366f1';
      case 'warning':
        return '#FFAA00';
      case 'error':
        return '#FF4444';
      case 'critical':
        return '#FF0066';
    }
  };

  const formatAction = (action: ActionType): string => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderLog = (log: AuditLog) => {
    return (
      <Pressable
        key={log.id}
        onPress={() => {
          haptics.impact('light');
          setSelectedLog(log);
          setShowDetailModal(true);
        }}
        style={styles.logCard}
      >
        <View style={styles.logHeader}>
          <View style={styles.logTime}>
            <Text style={styles.logTimestamp}>{log.timestamp.toLocaleTimeString()}</Text>
            <Text style={styles.logDate}>{log.timestamp.toLocaleDateString()}</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(log.level) + '20' }]}>
            <Text style={[styles.levelText, { color: getLevelColor(log.level) }]}>
              {log.level.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.logContent}>
          <View style={styles.logAction}>
            <View style={[styles.actionDot, { backgroundColor: getActionColor(log.action) }]} />
            <Text style={styles.actionText}>{formatAction(log.action)}</Text>
          </View>

          <Text style={styles.logAdmin}>by {log.admin}</Text>

          <View style={styles.logTarget}>
            <Ionicons
              name={
                (log.target.type === 'game'
                  ? 'game-controller'
                  : log.target.type === 'user'
                    ? 'person'
                    : log.target.type === 'content'
                      ? 'chatbubble'
                      : log.target.type === 'system'
                        ? 'settings'
                        : 'cube') as any}
              size={14}
              color="#666"
            />
            <Text style={styles.targetText}>{log.target.name}</Text>
          </View>

          <Text style={styles.logDetails} numberOfLines={2}>
            {log.details}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#666" style={styles.logChevron} />
      </Pressable>
    );
  };

  const renderDetailModal = () => {
    if (!selectedLog) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audit Log Details</Text>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  setShowDetailModal(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* Log Header */}
                <View style={styles.detailHeader}>
                  <View
                    style={[
                      styles.detailLevelBadge,
                      { backgroundColor: getLevelColor(selectedLog.level) + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.detailLevelText, { color: getLevelColor(selectedLog.level) }]}
                    >
                      {selectedLog.level.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.detailId}>ID: {selectedLog.id}</Text>
                </View>

                {/* Timestamp */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Timestamp</Text>
                  <Text style={styles.detailValue}>{selectedLog.timestamp.toLocaleString()}</Text>
                </View>

                {/* Admin */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Admin</Text>
                  <Text style={styles.detailValue}>{selectedLog.admin}</Text>
                </View>

                {/* Action */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Action</Text>
                  <View style={styles.detailAction}>
                    <View
                      style={[
                        styles.actionDot,
                        { backgroundColor: getActionColor(selectedLog.action) },
                      ]}
                    />
                    <Text style={styles.detailValue}>{formatAction(selectedLog.action)}</Text>
                  </View>
                </View>

                {/* Target */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Target</Text>
                  <View style={styles.detailTarget}>
                    <Text style={styles.targetType}>{selectedLog.target.type.toUpperCase()}</Text>
                    <Text style={styles.detailValue}>{selectedLog.target.name}</Text>
                    <Text style={styles.targetId}>ID: {selectedLog.target.id}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Details</Text>
                  <Text style={styles.detailDescription}>{selectedLog.details}</Text>
                </View>

                {/* Metadata */}
                {selectedLog.metadata && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Metadata</Text>
                    <View style={styles.metadataContainer}>
                      {Object.entries(selectedLog.metadata).map(([key, value]) => (
                        <View key={key} style={styles.metadataItem}>
                          <Text style={styles.metadataKey}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </Text>
                          <Text style={styles.metadataValue}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Technical Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Technical Information</Text>
                  <View style={styles.technicalInfo}>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>IP Address</Text>
                      <Text style={styles.technicalValue}>{selectedLog.ip}</Text>
                    </View>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>User Agent</Text>
                      <Text style={styles.technicalValue} numberOfLines={2}>
                        {selectedLog.userAgent}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
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

          <Text style={styles.headerTitle}>Audit Logs</Text>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                setShowFilters(!showFilters);
              }}
              style={styles.headerButton}
            >
              <Ionicons name="filter" size={20} color="#FFFFFF" />
              {(filters.admin !== 'all' ||
                filters.actionType !== 'all' ||
                filters.level !== 'all' ||
                filters.dateRange !== 'today') && <View style={styles.filterDot} />}
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.impact('light');
                Alert.alert('Export Logs', 'Choose export format', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'CSV', onPress: () => handleExport('csv') },
                  { text: 'JSON', onPress: () => handleExport('json') },
                ]);
              }}
              style={styles.headerButton}
              disabled={isExporting}
            >
              {isExporting ? (
                <MaterialIcons name="hourglass-empty" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <Animated.View style={[styles.searchContainer, { transform: [{ scale: searchAnim }] }]}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search logs by admin, target, or details..."
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
              {/* Date Range */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Date</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterOptions}
                >
                  {(['today', '7d', '30d'] as const).map(range => (
                    <Pressable
                      key={range}
                      onPress={() => {
                        haptics.selection();
                        setFilters({ ...filters, dateRange: range });
                      }}
                      style={[
                        styles.filterChip,
                        filters.dateRange === range && styles.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filters.dateRange === range && styles.filterChipTextActive,
                        ]}
                      >
                        {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Level Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Level</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterOptions}
                >
                  <Pressable
                    onPress={() => {
                      haptics.selection();
                      setFilters({ ...filters, level: 'all' });
                    }}
                    style={[styles.filterChip, filters.level === 'all' && styles.filterChipActive]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.level === 'all' && styles.filterChipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {(['info', 'warning', 'error', 'critical'] as LogLevel[]).map(level => (
                    <Pressable
                      key={level}
                      onPress={() => {
                        haptics.selection();
                        setFilters({ ...filters, level });
                      }}
                      style={[
                        styles.filterChip,
                        filters.level === level && styles.filterChipActive,
                        { borderColor: filters.level === level ? getLevelColor(level) : '#333' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filters.level === level && { color: getLevelColor(level) },
                        ]}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Logs Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>Total Logs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF4444' }]}>
              {logs.filter(l => l.level === 'error' || l.level === 'critical').length}
            </Text>
            <Text style={styles.statLabel}>Issues</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#6366f1' }]}>
              {new Set(logs.map(l => l.admin)).size}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
        </View>

        {/* Logs List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.logsList}>
          {logs.map(log => renderLog(log))}
        </ScrollView>

        {/* Detail Modal */}
        {renderDetailModal()}
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
    marginBottom: 16,
  },
  filterGroup: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  filterGroupLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterOptions: {
    flexDirection: 'row',
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
    backgroundColor: '#333',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
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
  logsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logTime: {
    flex: 1,
  },
  logTimestamp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logContent: {
    gap: 8,
  },
  logAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  logAdmin: {
    fontSize: 14,
    color: '#666',
  },
  logTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetText: {
    fontSize: 14,
    color: '#999',
  },
  logDetails: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  logChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModal: {
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
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailLevelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailId: {
    fontSize: 12,
    color: '#666',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  detailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailTarget: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  targetType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  targetId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  metadataContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataKey: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    textTransform: 'capitalize',
  },
  metadataValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  technicalInfo: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  technicalItem: {
    marginBottom: 12,
  },
  technicalLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  technicalValue: {
    fontSize: 14,
    color: '#999',
  },
});
