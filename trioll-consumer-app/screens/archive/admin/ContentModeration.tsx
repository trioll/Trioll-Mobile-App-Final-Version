
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

type ReportCategory = 'inappropriate' | 'spam' | 'harassment' | 'cheating' | 'other';
type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';
type ContentType = 'game' | 'user' | 'comment' | 'message';
type ModerationAction = 'remove' | 'warn' | 'suspend' | 'ban' | 'dismiss';

interface Report {
  id: string;
  type: ContentType;
  category: ReportCategory;
  reportedBy: string;
  reportedAt: Date;
  target: {
    id: string;
    name: string;
    image?: string;
  };
  description: string;
  evidence?: string[];
  status: ReportStatus;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  relatedReports: number;
  previousActions?: string[];
}

interface ModerationPattern {
  id: string;
  pattern: string;
  category: ReportCategory;
  detectedCount: number;
  lastDetected: Date;
}

export const ContentModeration: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ReportCategory | 'all'>('all');
  const [activeStatus] = useState<ReportStatus | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ModerationAction | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchMode, setBatchMode] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Mock reports
  const [reports] = useState<Report[]>([
    {
      id: '1',
      type: 'user',
      category: 'harassment',
      reportedBy: 'User_456',
      reportedAt: new Date(Date.now() - 1800000),
      target: {
        id: 'user_789',
        name: 'ToxicPlayer99',
        image: 'https://picsum.photos/100/100?random=1',
      },
      description: 'Sending threatening messages to other players',
      evidence: [
        'https://picsum.photos/400/200?random=1',
        'https://picsum.photos/400/200?random=2',
      ],
      status: 'pending',
      priority: 'high',
      relatedReports: 5,
      previousActions: ['Warning issued 2 weeks ago'],
    },
    {
      id: '2',
      type: 'game',
      category: 'inappropriate',
      reportedBy: 'User_123',
      reportedAt: new Date(Date.now() - 3600000),
      target: {
        id: 'game_456',
        name: 'Zombie Shooter X',
        image: 'https://picsum.photos/100/100?random=3',
      },
      description: 'Game contains excessive violence not suitable for listed age rating',
      evidence: ['https://picsum.photos/400/200?random=3'],
      status: 'investigating',
      assignedTo: 'Admin_Sarah',
      priority: 'medium',
      relatedReports: 2,
    },
    {
      id: '3',
      type: 'comment',
      category: 'spam',
      reportedBy: 'User_789',
      reportedAt: new Date(Date.now() - 7200000),
      target: {
        id: 'comment_123',
        name: 'SpamBot2000',
      },
      description: 'Posting promotional links repeatedly',
      status: 'pending',
      priority: 'low',
      relatedReports: 12,
    },
    {
      id: '4',
      type: 'user',
      category: 'cheating',
      reportedBy: 'User_321',
      reportedAt: new Date(Date.now() - 14400000),
      target: {
        id: 'user_999',
        name: 'HackerPro',
        image: 'https://picsum.photos/100/100?random=4',
      },
      description: 'Using automated tools to manipulate game scores',
      evidence: [
        'https://picsum.photos/400/200?random=4',
        'https://picsum.photos/400/200?random=5',
      ],
      status: 'pending',
      priority: 'critical',
      relatedReports: 8,
    },
  ]);

  const [patterns] = useState<ModerationPattern[]>([
    {
      id: '1',
      pattern: 'Repeated spam messages',
      category: 'spam',
      detectedCount: 45,
      lastDetected: new Date(Date.now() - 600000),
    },
    {
      id: '2',
      pattern: 'Hate speech keywords',
      category: 'harassment',
      detectedCount: 12,
      lastDetected: new Date(Date.now() - 3600000),
    },
  ]);

  // Initialize animations
  reports.forEach(report => {
    if (!scaleAnims[report.id]) {
      scaleAnims[report.id] = new Animated.Value(1);
    }
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleReportPress = (report: Report) => {
    if (batchMode) {
      haptics.selection();
      if (selectedReports.includes(report.id)) {
        setSelectedReports(selectedReports.filter(id => id !== report.id));
      } else {
        setSelectedReports([...selectedReports, report.id]);
      }
    } else {
      haptics.impact('light');
      setSelectedReport(report);
      setShowDetailModal(true);
    }
  };

  const handleBatchAction = (action: ModerationAction) => {
    if (selectedReports.length === 0) {
      (haptics as any).error();
      Alert.alert('No Selection', 'Please select reports to perform batch action');
      return;
    }

    haptics.impact('medium');
    setSelectedAction(action);
    setShowActionModal(true);
  };

  const handleSingleAction = (action: ModerationAction) => {
    haptics.impact('medium');
    setSelectedAction(action);
    setShowActionModal(true);
  };

  const confirmAction = () => {
    if (!actionReason.trim() && selectedAction !== 'dismiss') {
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

      const count = batchMode ? selectedReports.length : 1;
      Alert.alert('Success', `${count} report(s) ${selectedAction}ed successfully`, [
        {
          text: 'OK',
          onPress: () => {
            setShowActionModal(false);
            setShowDetailModal(false);
            setActionReason('');
            setSelectedAction(null);
            setSelectedReports([]);
            setBatchMode(false);
          },
        },
      ]);
    }, 2000);
  };

  const getCategoryColor = (category: ReportCategory): string => {
    switch (category) {
      case 'inappropriate':
        return '#FF6B6B';
      case 'spam':
        return '#FFAA00';
      case 'harassment':
        return '#FF4444';
      case 'cheating':
        return '#FF0066';
      case 'other':
        return '#666';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return '#FF0000';
      case 'high':
        return '#FF4444';
      case 'medium':
        return '#FFAA00';
      case 'low':
        return '#666';
      default:
        return '#666';
    }
  };

  const getStatusColor = (status: ReportStatus): string => {
    switch (status) {
      case 'pending':
        return '#FFAA00';
      case 'investigating':
        return '#6366f1';
      case 'resolved':
        return '#00FF88';
      case 'dismissed':
        return '#666';
    }
  };

  const renderReport = (report: Report) => {
    const isSelected = selectedReports.includes(report.id);

    return (
      <Animated.View key={report.id} style={{ transform: [{ scale: scaleAnims[report.id] }] }}>
        <Pressable
          onPress={() => handleReportPress(report)}
          onLongPress={() => {
            haptics.impact('medium');
            setBatchMode(true);
            if (!selectedReports.includes(report.id)) {
              setSelectedReports([report.id]);
            }
          }}
          style={[
            styles.reportCard,
            isSelected && styles.reportCardSelected,
            report.priority === 'critical' && styles.reportCardCritical,
          ]}
        >
          {batchMode && (
            <View style={styles.selectionCheckbox}>
              <Ionicons
                name={(isSelected ? 'checkbox' : 'square-outline') as any}
                size={24}
                color={isSelected ? '#6366f1' : '#666'}
              />
            </View>
          )}

          <View style={styles.reportHeader}>
            <View style={styles.reportInfo}>
              <View style={styles.reportTypeContainer}>
                <Ionicons
                  name={
                    (report.type === 'user'
                      ? 'person'
                      : report.type === 'game'
                        ? 'game-controller'
                        : report.type === 'comment'
                          ? 'chatbubble'
                          : 'mail') as any}
                  size={16}
                  color="#666"
                />
                <Text style={styles.reportType}>{report.type.toUpperCase()}</Text>
              </View>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(report.category) + '20' },
                ]}
              >
                <Text style={[styles.categoryText, { color: getCategoryColor(report.category) }]}>
                  {report.category.toUpperCase()}
                </Text>
              </View>
            </View>
            <View
              style={[styles.priorityBadge, { borderColor: getPriorityColor(report.priority) }]}
            >
              <Text style={[styles.priorityText, { color: getPriorityColor(report.priority) }]}>
                {report.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.reportTarget}>
            {report.target.image && (
              <Image source={{ uri: report.target.image }} style={styles.targetImage} />
            )}
            <View style={styles.targetInfo}>
              <Text style={styles.targetName}>{report.target.name}</Text>
              <Text style={styles.reportDescription} numberOfLines={2}>
                {report.description}
              </Text>
            </View>
          </View>

          <View style={styles.reportMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{getTimeAgo(report.reportedAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flag-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{report.relatedReports} reports</Text>
            </View>
            {report.assignedTo && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={14} color="#6366f1" />
                <Text style={[styles.metaText, { color: '#6366f1' }]}>{report.assignedTo}</Text>
              </View>
            )}
          </View>

          <View style={styles.reportStatus}>
            <View
              style={[styles.statusIndicator, { backgroundColor: getStatusColor(report.status) }]}
            />
            <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedReport) return null;

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
              <Text style={styles.modalTitle}>Report Details</Text>
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
                {/* Target Info */}
                <View style={styles.targetSection}>
                  <View style={styles.targetHeader}>
                    {selectedReport.target.image && (
                      <Image
                        source={{ uri: selectedReport.target.image }}
                        style={styles.targetModalImage}
                      />
                    )}
                    <View style={styles.targetModalInfo}>
                      <Text style={styles.targetModalName}>{selectedReport.target.name}</Text>
                      <Text style={styles.targetModalId}>ID: {selectedReport.target.id}</Text>
                    </View>
                  </View>
                </View>

                {/* Report Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Report Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Category</Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: getCategoryColor(selectedReport.category) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            { color: getCategoryColor(selectedReport.category) },
                          ]}
                        >
                          {selectedReport.category.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Priority</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { color: getPriorityColor(selectedReport.priority) },
                        ]}
                      >
                        {selectedReport.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Status</Text>
                      <Text
                        style={[styles.infoValue, { color: getStatusColor(selectedReport.status) }]}
                      >
                        {selectedReport.status.charAt(0).toUpperCase() +
                          selectedReport.status.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Reported By</Text>
                      <Text style={styles.infoValue}>{selectedReport.reportedBy}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Time</Text>
                      <Text style={styles.infoValue}>
                        {selectedReport.reportedAt.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Related Reports</Text>
                      <Text style={styles.infoValue}>{selectedReport.relatedReports}</Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{selectedReport.description}</Text>
                </View>

                {/* Evidence */}
                {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.sectionTitle}>Evidence</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedReport.evidence.map((evidence, index) => (
                        <Image
                          key={index}
                          source={{ uri: evidence }}
                          style={styles.evidenceImage}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Previous Actions */}
                {selectedReport.previousActions && selectedReport.previousActions.length > 0 && (
                  <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Previous Actions</Text>
                    {selectedReport.previousActions.map((action, index) => (
                      <View key={index} style={styles.historyItem}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text style={styles.historyText}>{action}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionSection}>
                  <Text style={styles.sectionTitle}>Moderation Actions</Text>
                  <View style={styles.actionGrid}>
                    <Pressable
                      onPress={() => handleSingleAction('dismiss')}
                      style={[styles.actionButton, styles.dismissButton]}
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#666" />
                      <Text style={[styles.actionButtonText, { color: '#666' }]}>Dismiss</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSingleAction('warn')}
                      style={[styles.actionButton, styles.warnButton]}
                    >
                      <Ionicons name="warning-outline" size={20} color="#FFAA00" />
                      <Text style={[styles.actionButtonText, { color: '#FFAA00' }]}>Warn</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSingleAction('remove')}
                      style={[styles.actionButton, styles.removeButton]}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                      <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>Remove</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSingleAction('suspend')}
                      style={[styles.actionButton, styles.suspendButton]}
                    >
                      <Ionicons name="pause-circle-outline" size={20} color="#FF4444" />
                      <Text style={[styles.actionButtonText, { color: '#FF4444' }]}>Suspend</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSingleAction('ban')}
                      style={[styles.actionButton, styles.banButton]}
                    >
                      <Ionicons name="ban-outline" size={20} color="#FF0000" />
                      <Text style={[styles.actionButtonText, { color: '#FF0000' }]}>Ban</Text>
                    </Pressable>
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
    if (!selectedAction) return null;

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
              <Text style={styles.modalTitle}>Confirm Action</Text>
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
              <Text style={styles.actionDescription}>
                You are about to <Text style={styles.actionHighlight}>{selectedAction}</Text>{' '}
                {batchMode ? `${selectedReports.length} reports` : 'this report'}
              </Text>

              {selectedAction !== 'dismiss' && (
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
              )}

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
    return `${Math.floor(hours / 24)}d ago`;
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

          <Text style={styles.headerTitle}>Content Moderation</Text>

          <Pressable
            onPress={() => {
              haptics.impact('light');
              setBatchMode(!batchMode);
              setSelectedReports([]);
            }}
            style={styles.batchButton}
          >
            <Ionicons name="checkbox-outline" size={20} color={batchMode ? '#6366f1' : '#FFFFFF'} />
          </Pressable>
        </View>

        {/* Queue Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FF4444' }]}>
              {reports.filter(r => r.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#6366f1' }]}>
              {reports.filter(r => r.status === 'investigating').length}
            </Text>
            <Text style={styles.statLabel}>Investigating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FFAA00' }]}>
              {reports.filter(r => r.priority === 'high' || r.priority === 'critical').length}
            </Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FF0066' }]}>
              {patterns.reduce((sum, p) => sum + p.detectedCount, 0)}
            </Text>
            <Text style={styles.statLabel}>Patterns</Text>
          </View>
        </View>

        {/* Batch Actions */}
        {batchMode && selectedReports.length > 0 && (
          <View style={styles.batchActions}>
            <Text style={styles.batchText}>{selectedReports.length} selected</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => handleBatchAction('dismiss')}
                style={[styles.batchActionButton, styles.dismissButton]}
              >
                <Text style={[styles.batchActionText, { color: '#666' }]}>Dismiss</Text>
              </Pressable>
              <Pressable
                onPress={() => handleBatchAction('warn')}
                style={[styles.batchActionButton, styles.warnButton]}
              >
                <Text style={[styles.batchActionText, { color: '#FFAA00' }]}>Warn</Text>
              </Pressable>
              <Pressable
                onPress={() => handleBatchAction('remove')}
                style={[styles.batchActionButton, styles.removeButton]}
              >
                <Text style={[styles.batchActionText, { color: '#FF6B6B' }]}>Remove</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => {
                haptics.selection();
                setActiveFilter('all');
              }}
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                All Reports
              </Text>
            </Pressable>
            {(['inappropriate', 'spam', 'harassment', 'cheating', 'other'] as ReportCategory[]).map(
              category => (
                <Pressable
                  key={category}
                  onPress={() => {
                    haptics.selection();
                    setActiveFilter(category);
                  }}
                  style={[
                    styles.filterChip,
                    activeFilter === category && styles.filterChipActive,
                    {
                      borderColor: activeFilter === category ? getCategoryColor(category) : '#333',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      activeFilter === category && { color: getCategoryColor(category) },
                    ]}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </Pressable>
              )
            )}
          </ScrollView>
        </View>

        {/* Reports List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.reportsList}>
          {/* Pattern Detection Alert */}
          {patterns.length > 0 && (
            <View style={styles.patternAlert}>
              <View style={styles.patternHeader}>
                <Ionicons name="analytics" size={20} color="#6366f1" />
                <Text style={styles.patternTitle}>Pattern Detection</Text>
              </View>
              {patterns.map(pattern => (
                <View key={pattern.id} style={styles.patternItem}>
                  <Text style={styles.patternText}>{pattern.pattern}</Text>
                  <Text style={styles.patternCount}>
                    {pattern.detectedCount} occurrences • {getTimeAgo(pattern.lastDetected)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Reports */}
          {reports
            .filter(r => activeFilter === 'all' || r.category === activeFilter)
            .filter(r => activeStatus === 'all' || r.status === activeStatus)
            .map(report => renderReport(report))}
        </ScrollView>

        {/* Modals */}
        {renderDetailModal()}
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
  batchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
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
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  batchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  batchActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  batchActionText: {
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#333',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  reportsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  patternAlert: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  patternItem: {
    marginBottom: 8,
  },
  patternText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  patternCount: {
    fontSize: 12,
    color: '#666',
  },
  reportCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  reportCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f110',
  },
  reportCardCritical: {
    borderColor: '#FF000050',
  },
  selectionCheckbox: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 36,
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportType: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reportTarget: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingLeft: 36,
  },
  targetImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  targetInfo: {
    flex: 1,
  },
  targetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
    paddingLeft: 36,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  reportStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 36,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  targetSection: {
    marginBottom: 24,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  targetModalImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  targetModalInfo: {
    flex: 1,
  },
  targetModalName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  targetModalId: {
    fontSize: 14,
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  evidenceSection: {
    marginBottom: 24,
  },
  evidenceImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#000',
    marginRight: 12,
  },
  historySection: {
    marginBottom: 24,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  historyText: {
    fontSize: 14,
    color: '#999',
  },
  actionSection: {
    marginTop: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dismissButton: {
    borderColor: '#666',
    backgroundColor: '#66661010',
  },
  warnButton: {
    borderColor: '#FFAA00',
    backgroundColor: '#FFAA0010',
  },
  removeButton: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B10',
  },
  suspendButton: {
    borderColor: '#FF4444',
    backgroundColor: '#FF444410',
  },
  banButton: {
    borderColor: '#FF0000',
    backgroundColor: '#FF000010',
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
  actionDescription: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionHighlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reasonSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
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
