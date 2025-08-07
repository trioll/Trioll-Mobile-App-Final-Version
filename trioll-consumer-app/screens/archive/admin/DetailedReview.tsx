
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput, Animated, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';

type ReviewDecision = 'approve' | 'reject' | 'pending';
type TabType = 'overview' | 'technical' | 'content' | 'history' | 'notes';

interface AutoCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message?: string;
  details?: string;
  timestamp: Date;
}

interface TechnicalReport {
  fileSize: number;
  buildType: string;
  targetSDK: string;
  minSDK: string;
  permissions: string[];
  performance: {
    loadTime: number;
    memoryUsage: number;
    cpuUsage: number;
    fps: number;
  };
}

interface ContentFlag {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  screenshot?: string;
}

interface VersionHistory {
  id: string;
  version: string;
  submittedAt: Date;
  status: 'approved' | 'rejected';
  reviewer: string;
  notes?: string;
}

interface InternalNote {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'critical';
}

export const DetailedReview: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const haptics = useHaptics();
  const gameId = (route.params as { gameId?: string })?.gameId || '1';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [decision, setDecision] = useState<ReviewDecision>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Mock game data
  const [gameData] = useState({
    id: gameId,
    title: 'Space Shooter Pro',
    developer: 'Galaxy Games Studio',
    developerId: 'dev_123',
    icon: 'https://picsum.photos/200/200?random=1',
    coverImage: 'https://picsum.photos/800/450?random=1',
    screenshots: [
      'https://picsum.photos/800/450?random=2',
      'https://picsum.photos/800/450?random=3',
      'https://picsum.photos/800/450?random=4',
      'https://picsum.photos/800/450?random=5',
    ],
    submittedAt: new Date(Date.now() - 3600000),
    version: '1.0.0',
    platform: ['iOS', 'Android'],
    description:
      'An intense space combat game with stunning visuals and challenging gameplay. Battle through waves of alien invaders and epic boss fights.',
    genres: ['Action', 'Arcade'],
    ageRating: '12+',
    contentWarnings: ['Mild Violence', 'In-App Purchases'],
    fileSize: 124.5,
  });

  const [autoChecks] = useState<AutoCheck[]>([
    {
      id: 'integrity',
      name: 'File Integrity',
      status: 'pass',
      message: 'All files verified successfully',
      timestamp: new Date(Date.now() - 1800000),
    },
    {
      id: 'performance',
      name: 'Performance Check',
      status: 'warning',
      message: 'High memory usage detected',
      details: 'Peak memory usage: 512MB (recommended: <256MB)',
      timestamp: new Date(Date.now() - 1500000),
    },
    {
      id: 'content',
      name: 'Content Scan',
      status: 'pass',
      message: 'No prohibited content found',
      timestamp: new Date(Date.now() - 1200000),
    },
    {
      id: 'policy',
      name: 'Policy Compliance',
      status: 'pass',
      message: 'Meets all platform policies',
      timestamp: new Date(Date.now() - 900000),
    },
    {
      id: 'security',
      name: 'Security Scan',
      status: 'pass',
      message: 'No malware or vulnerabilities detected',
      timestamp: new Date(Date.now() - 600000),
    },
  ]);

  const [technicalReport] = useState<TechnicalReport>({
    fileSize: 124.5,
    buildType: 'Release',
    targetSDK: '33',
    minSDK: '21',
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE', 'VIBRATE', 'WAKE_LOCK'],
    performance: {
      loadTime: 2.3,
      memoryUsage: 256,
      cpuUsage: 45,
      fps: 58,
    },
  });

  const [contentFlags] = useState<ContentFlag[]>([
    {
      id: '1',
      category: 'Violence',
      severity: 'low',
      description: 'Cartoon violence with space ships exploding',
      screenshot: 'https://picsum.photos/400/225?random=10',
    },
  ]);

  const [versionHistory] = useState<VersionHistory[]>([
    {
      id: '1',
      version: '0.9.0',
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'approved',
      reviewer: 'Admin_Sarah',
      notes: 'Initial beta release approved',
    },
  ]);

  const [internalNotes] = useState<InternalNote[]>([
    {
      id: '1',
      author: 'Admin_Mike',
      content: 'Developer has good track record. Previous games well-received.',
      timestamp: new Date(Date.now() - 7200000),
      type: 'info',
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

    // Animate progress based on checks
    const passedChecks = autoChecks.filter(c => c.status === 'pass').length;
    const progress = (passedChecks / autoChecks.length) * 100;

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: DURATIONS.SLOW,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleDecision = (type: 'approve' | 'reject') => {
    if (type === 'reject' && !rejectionReason.trim()) {
      (haptics as any).error();
      Alert.alert('Rejection Reason Required', 'Please provide a reason for rejection');
      return;
    }

    haptics.impact('medium');
    Alert.alert(
      `${type === 'approve' ? 'Approve' : 'Reject'} Game`,
      `Are you sure you want to ${type} "${gameData.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: type === 'reject' ? 'destructive' : 'default',
          onPress: () => processDecision(type),
        },
      ]
    );
  };

  const processDecision = async (type: 'approve' | 'reject') => {
    setIsProcessing(true);
    haptics.impact('light');

    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      (haptics as any).success();

      Alert.alert('Success', `Game has been ${type === 'approve' ? 'approved' : 'rejected'}`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    }, 2000);
  };

  const renderOverviewTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Image source={{ uri: gameData.coverImage }} style={styles.coverImage} />

        <View style={styles.gameHeader}>
          <Image source={{ uri: gameData.icon }} style={styles.gameIcon} />
          <View style={styles.gameHeaderInfo}>
            <Text style={styles.gameTitle}>{gameData.title}</Text>
            <Text style={styles.gameDeveloper}>{gameData.developer}</Text>
            <View style={styles.gameMetadata}>
              <Text style={styles.metadataText}>v{gameData.version}</Text>
              <Text style={styles.metadataDivider}>•</Text>
              <Text style={styles.metadataText}>{gameData.platform.join(', ')}</Text>
              <Text style={styles.metadataDivider}>•</Text>
              <Text style={styles.metadataText}>{gameData.fileSize}MB</Text>
            </View>
          </View>
        </View>

        <Text style={styles.gameDescription}>{gameData.description}</Text>

        <View style={styles.tagsContainer}>
          {gameData.genres.map(genre => (
            <View key={genre} style={styles.tag}>
              <Text style={styles.tagText}>{genre}</Text>
            </View>
          ))}
          <View style={[styles.tag, styles.ageTag]}>
            <Text style={styles.tagText}>{gameData.ageRating}</Text>
          </View>
        </View>

        <View style={styles.warningsContainer}>
          <Text style={styles.sectionTitle}>Content Warnings</Text>
          {gameData.contentWarnings.map(warning => (
            <View key={warning} style={styles.warningItem}>
              <Ionicons name="warning-outline" size={16} color="#FFAA00" />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => {
            haptics.impact('light');
            setShowMediaGallery(true);
          }}
          style={styles.viewMediaButton}
        >
          <Ionicons name="images-outline" size={20} color="#6366f1" />
          <Text style={styles.viewMediaText}>View Media Gallery</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Automated Checks</Text>
        <View style={styles.checksProgress}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {autoChecks.map(check => (
          <View key={check.id} style={styles.checkItem}>
            <View style={styles.checkHeader}>
              <View style={styles.checkInfo}>
                <Ionicons
                  name={
                    (check.status === 'pass'
                      ? 'checkmark-circle'
                      : check.status === 'fail'
                        ? 'close-circle'
                        : check.status === 'warning'
                          ? 'warning'
                          : 'time') as any}
                  size={24}
                  color={
                    check.status === 'pass'
                      ? '#00FF88'
                      : check.status === 'fail'
                        ? '#FF4444'
                        : check.status === 'warning'
                          ? '#FFAA00'
                          : '#666'
                  }
                />
                <Text style={styles.checkName}>{check.name}</Text>
              </View>
              <Text style={styles.checkTime}>{getTimeAgo(check.timestamp)}</Text>
            </View>
            {check.message && <Text style={styles.checkMessage}>{check.message}</Text>}
            {check.details && <Text style={styles.checkDetails}>{check.details}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderTechnicalTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Build Information</Text>
        <View style={styles.technicalGrid}>
          <View style={styles.technicalItem}>
            <Text style={styles.technicalLabel}>Build Type</Text>
            <Text style={styles.technicalValue}>{technicalReport.buildType}</Text>
          </View>
          <View style={styles.technicalItem}>
            <Text style={styles.technicalLabel}>Target SDK</Text>
            <Text style={styles.technicalValue}>{technicalReport.targetSDK}</Text>
          </View>
          <View style={styles.technicalItem}>
            <Text style={styles.technicalLabel}>Min SDK</Text>
            <Text style={styles.technicalValue}>{technicalReport.minSDK}</Text>
          </View>
          <View style={styles.technicalItem}>
            <Text style={styles.technicalLabel}>File Size</Text>
            <Text style={styles.technicalValue}>{technicalReport.fileSize}MB</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <Ionicons name="speedometer-outline" size={24} color="#6366f1" />
            <Text style={styles.performanceValue}>{technicalReport.performance.loadTime}s</Text>
            <Text style={styles.performanceLabel}>Load Time</Text>
          </View>
          <View style={styles.performanceCard}>
            <Ionicons name="hardware-chip-outline" size={24} color="#00FF88" />
            <Text style={styles.performanceValue}>{technicalReport.performance.memoryUsage}MB</Text>
            <Text style={styles.performanceLabel}>Memory</Text>
          </View>
          <View style={styles.performanceCard}>
            <Ionicons name="pulse-outline" size={24} color="#FF0066" />
            <Text style={styles.performanceValue}>{technicalReport.performance.cpuUsage}%</Text>
            <Text style={styles.performanceLabel}>CPU Usage</Text>
          </View>
          <View style={styles.performanceCard}>
            <Ionicons name="sync-outline" size={24} color="#FFAA00" />
            <Text style={styles.performanceValue}>{technicalReport.performance.fps} FPS</Text>
            <Text style={styles.performanceLabel}>Frame Rate</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        {technicalReport.permissions.map(permission => (
          <View key={permission} style={styles.permissionItem}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#666" />
            <Text style={styles.permissionText}>{permission}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderContentTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Flags</Text>
        {contentFlags.length === 0 ? (
          <Text style={styles.emptyText}>No content flags detected</Text>
        ) : (
          contentFlags.map(flag => (
            <View key={flag.id} style={styles.flagCard}>
              <View style={styles.flagHeader}>
                <View style={styles.flagInfo}>
                  <Text style={styles.flagCategory}>{flag.category}</Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(flag.severity) + '20' },
                    ]}
                  >
                    <Text style={[styles.severityText, { color: getSeverityColor(flag.severity) }]}>
                      {flag.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.flagDescription}>{flag.description}</Text>
              {flag.screenshot && (
                <Image source={{ uri: flag.screenshot }} style={styles.flagScreenshot} />
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Age Rating Compliance</Text>
        <View style={styles.complianceCard}>
          <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
          <Text style={styles.complianceText}>
            Content is appropriate for {gameData.ageRating} rating
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer Information</Text>
        <View style={styles.developerCard}>
          <Text style={styles.developerLabel}>Studio</Text>
          <Text style={styles.developerValue}>{gameData.developer}</Text>
          <Text style={styles.developerLabel}>Developer ID</Text>
          <Text style={styles.developerValue}>{gameData.developerId}</Text>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              // Navigate to developer profile
            }}
            style={styles.viewDeveloperButton}
          >
            <Text style={styles.viewDeveloperText}>View Developer Profile</Text>
            <Ionicons name="chevron-forward" size={16} color="#6366f1" />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Version History</Text>
        {versionHistory.map(version => (
          <View key={version.id} style={styles.versionCard}>
            <View style={styles.versionHeader}>
              <Text style={styles.versionNumber}>v{version.version}</Text>
              <View
                style={[
                  styles.versionStatusBadge,
                  { backgroundColor: version.status === 'approved' ? '#00FF8820' : '#FF444420' },
                ]}
              >
                <Text
                  style={[
                    styles.versionStatusText,
                    { color: version.status === 'approved' ? '#00FF88' : '#FF4444' },
                  ]}
                >
                  {version.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.versionDate}>{version.submittedAt.toLocaleDateString()}</Text>
            <Text style={styles.versionReviewer}>Reviewed by: {version.reviewer}</Text>
            {version.notes && <Text style={styles.versionNotes}>{version.notes}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderNotesTab = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Internal Notes</Text>
          {internalNotes.map(note => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteAuthor}>{note.author}</Text>
                <Text style={styles.noteTime}>{getTimeAgo(note.timestamp)}</Text>
              </View>
              <Text style={styles.noteContent}>{note.content}</Text>
              {note.type !== 'info' && (
                <View
                  style={[
                    styles.noteTypeBadge,
                    { backgroundColor: note.type === 'warning' ? '#FFAA0020' : '#FF444420' },
                  ]}
                >
                  <Text
                    style={[
                      styles.noteTypeText,
                      { color: note.type === 'warning' ? '#FFAA00' : '#FF4444' },
                    ]}
                  >
                    {note.type.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Note</Text>
          <TextInput
            style={styles.noteInput}
            value={internalNote}
            onChangeText={setInternalNote}
            placeholder="Add an internal note..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
          <Pressable
            onPress={() => {
              if (internalNote.trim()) {
                haptics.impact('light');
                // Add note
                setInternalNote('');
              }
            }}
            style={[styles.addNoteButton, !internalNote.trim() && styles.addNoteButtonDisabled]}
          >
            <Text style={styles.addNoteText}>Add Note</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
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

          <Text style={styles.headerTitle}>Detailed Review</Text>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>PENDING</Text>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
          contentContainerStyle={styles.tabContent}
        >
          {(['overview', 'technical', 'content', 'history', 'notes'] as TabType[]).map(tab => (
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
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'technical' && renderTechnicalTab()}
          {activeTab === 'content' && renderContentTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'notes' && renderNotesTab()}
        </View>

        {/* Decision Panel */}
        <View style={styles.decisionPanel}>
          {decision === 'pending' && (
            <>
              <Pressable
                onPress={() => handleDecision('reject')}
                style={[styles.decisionButton, styles.rejectButton]}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FF4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={24} color="#FF4444" />
                    <Text style={[styles.decisionButtonText, { color: '#FF4444' }]}>Reject</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => handleDecision('approve')}
                style={[styles.decisionButton, styles.approveButton]}
                disabled={isProcessing}
              >
                <LinearGradient colors={['#00FF88', '#00CC66']} style={styles.approveGradient}>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                      <Text style={[styles.decisionButtonText, { color: '#FFFFFF' }]}>Approve</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          )}

          {decision === 'reject' && (
            <View style={styles.rejectionPanel}>
              <TextInput
                style={styles.rejectionInput}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Provide rejection reason..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />
              <View style={styles.rejectionActions}>
                <Pressable
                  onPress={() => {
                    haptics.impact('light');
                    setDecision('pending');
                    setRejectionReason('');
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDecision('reject')}
                  style={styles.confirmRejectButton}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmRejectText}>Confirm Rejection</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
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
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FFAA0020',
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFAA00',
  },
  tabContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tabContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  tab: {
    paddingVertical: 12,
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
  tabContentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    marginBottom: 20,
  },
  gameHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  gameIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
  },
  gameHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gameDeveloper: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  gameMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 14,
    color: '#999',
  },
  metadataDivider: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
  gameDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  ageTag: {
    borderColor: '#6366f1',
  },
  tagText: {
    fontSize: 12,
    color: '#999',
  },
  warningsContainer: {
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FFAA00',
  },
  viewMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  viewMediaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  checksProgress: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  checkItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  checkTime: {
    fontSize: 12,
    color: '#666',
  },
  checkMessage: {
    fontSize: 14,
    color: '#999',
    marginLeft: 36,
  },
  checkDetails: {
    fontSize: 12,
    color: '#666',
    marginLeft: 36,
    marginTop: 4,
    fontStyle: 'italic',
  },
  technicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  technicalItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  technicalLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  technicalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#999',
  },
  flagCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  flagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  flagDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  flagScreenshot: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#00FF8810',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00FF8830',
  },
  complianceText: {
    fontSize: 14,
    color: '#00FF88',
    flex: 1,
  },
  developerCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  developerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  developerValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  viewDeveloperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  viewDeveloperText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
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
  versionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  versionDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  versionReviewer: {
    fontSize: 14,
    color: '#666',
  },
  versionNotes: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noteCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noteTime: {
    fontSize: 12,
    color: '#666',
  },
  noteContent: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  noteTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  noteTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noteInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addNoteButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addNoteButtonDisabled: {
    opacity: 0.5,
  },
  addNoteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  decisionPanel: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  decisionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#FF444410',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  approveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  approveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  decisionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  rejectionPanel: {
    flex: 1,
  },
  rejectionInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF4444',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  rejectionActions: {
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
  confirmRejectButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF4444',
  },
  confirmRejectText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
