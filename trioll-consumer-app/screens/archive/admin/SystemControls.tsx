
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Animated, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'feature' | 'experiment' | 'maintenance' | 'security';
  lastModified: Date;
  modifiedBy: string;
  rolloutPercentage?: number;
}

interface ServiceToggle {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  critical: boolean;
  dependencies: string[];
}

interface CacheItem {
  key: string;
  size: number;
  lastAccessed: Date;
  ttl: number;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  active: boolean;
  startDate: Date;
  endDate?: Date;
  targetAudience: 'all' | 'new' | 'returning';
}

export const SystemControls: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [activeTab, setActiveTab] = useState<'flags' | 'services' | 'cache' | 'announcements'>(
    'flags'
  );
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emergencyShutdown, setEmergencyShutdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Mock data
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([
    {
      id: '1',
      name: 'new_trial_player',
      description: 'Enable new WebRTC-based trial player',
      enabled: true,
      category: 'feature',
      lastModified: new Date(Date.now() - 86400000),
      modifiedBy: 'Admin_Sarah',
      rolloutPercentage: 100,
    },
    {
      id: '2',
      name: 'social_features',
      description: 'Enable social features (friends, chat)',
      enabled: false,
      category: 'feature',
      lastModified: new Date(Date.now() - 172800000),
      modifiedBy: 'Admin_Mike',
      rolloutPercentage: 0,
    },
    {
      id: '3',
      name: 'ab_test_onboarding',
      description: 'A/B test for new onboarding flow',
      enabled: true,
      category: 'experiment',
      lastModified: new Date(Date.now() - 604800000),
      modifiedBy: 'Admin_Lisa',
      rolloutPercentage: 50,
    },
    {
      id: '4',
      name: 'rate_limiting_aggressive',
      description: 'Aggressive rate limiting for API endpoints',
      enabled: false,
      category: 'security',
      lastModified: new Date(Date.now() - 3600000),
      modifiedBy: 'Admin_John',
    },
  ]);

  const [services] = useState<ServiceToggle[]>([
    {
      id: '1',
      name: 'Game Streaming Service',
      status: 'active',
      critical: true,
      dependencies: ['CDN', 'Database'],
    },
    {
      id: '2',
      name: 'Authentication Service',
      status: 'active',
      critical: true,
      dependencies: ['Database'],
    },
    {
      id: '3',
      name: 'Analytics Pipeline',
      status: 'active',
      critical: false,
      dependencies: ['Queue Service'],
    },
    {
      id: '4',
      name: 'Email Service',
      status: 'maintenance',
      critical: false,
      dependencies: [],
    },
  ]);

  const [cacheStats] = useState({
    totalSize: 2.4, // GB
    hitRate: 94.2,
    missRate: 5.8,
    evictionRate: 2.1,
    items: [
      { key: 'user_sessions', size: 512, lastAccessed: new Date(Date.now() - 300000), ttl: 3600 },
      { key: 'game_metadata', size: 256, lastAccessed: new Date(Date.now() - 600000), ttl: 7200 },
      { key: 'api_responses', size: 1024, lastAccessed: new Date(Date.now() - 60000), ttl: 1800 },
      { key: 'static_assets', size: 612, lastAccessed: new Date(Date.now() - 1800000), ttl: 86400 },
    ] as CacheItem[],
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      title: 'Scheduled Maintenance',
      message: 'Platform maintenance scheduled for Sunday 2AM-4AM EST',
      type: 'warning',
      active: true,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 93600000),
      targetAudience: 'all',
    },
    {
      id: '2',
      title: 'New Features Available',
      message: 'Check out our new social features!',
      type: 'info',
      active: false,
      startDate: new Date(),
      targetAudience: 'returning',
    },
  ]);

  // Initialize animations
  featureFlags.forEach(flag => {
    if (!scaleAnims[flag.id]) {
      scaleAnims[flag.id] = new Animated.Value(1);
    }
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleToggleFlag = (flag: FeatureFlag) => {
    haptics.toggle(!flag.enabled);

    Alert.alert(
      `${flag.enabled ? 'Disable' : 'Enable'} Feature`,
      `Are you sure you want to ${flag.enabled ? 'disable' : 'enable'} "${flag.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setFeatureFlags(flags =>
              flags.map(f =>
                f.id === flag.id
                  ? {
                      ...f,
                      enabled: !f.enabled,
                      lastModified: new Date(),
                      modifiedBy: 'Current_Admin',
                    }
                  : f
              )
            );
            (haptics as any).success();
          },
        },
      ]
    );
  };

  const handleMaintenanceMode = () => {
    haptics.impact('heavy');

    Alert.alert(
      `${maintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode`,
      maintenanceMode
        ? 'This will restore normal platform operations.'
        : 'This will activate maintenance mode. Users will see a maintenance message.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: maintenanceMode ? 'default' : 'destructive',
          onPress: () => {
            setMaintenanceMode(!maintenanceMode);
            (haptics as any).success();
          },
        },
      ]
    );
  };

  const handleEmergencyShutdown = () => {
    haptics.impact('heavy');

    Alert.alert(
      '⚠️ Emergency Shutdown',
      'This will immediately shut down all services. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SHUTDOWN',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm Emergency Shutdown', 'Type "SHUTDOWN" to confirm', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Proceed',
                style: 'destructive',
                onPress: () => {
                  setEmergencyShutdown(true);
                  (haptics as any).error();
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const handleClearCache = (key?: string) => {
    haptics.impact('medium');

    Alert.alert(
      key ? `Clear ${key}` : 'Clear All Cache',
      key
        ? `This will clear the ${key} cache.`
        : 'This will clear all cached data. This may temporarily impact performance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setIsProcessing(true);
            setTimeout(() => {
              setIsProcessing(false);
              (haptics as any).success();
              Alert.alert('Success', 'Cache cleared successfully');
            }, 2000);
          },
        },
      ]
    );
  };

  const renderFeatureFlags = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.flagsContainer}>
        {Object.entries(
          featureFlags.reduce(
            (acc, flag) => {
              if (!acc[flag.category]) acc[flag.category] = [];
              acc[flag.category].push(flag);
              return acc;
            },
            {} as Record<string, FeatureFlag[]>
          )
        ).map(([category, flags]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            {flags.map(flag => (
              <Animated.View key={flag.id} style={{ transform: [{ scale: scaleAnims[flag.id] }] }}>
                <Pressable
                  onPress={() => {
                    // TODO: Implement flag details
                  }}
                  onLongPress={() => {
                    haptics.impact('medium');
                    Animated.sequence([
                      Animated.timing(scaleAnims[flag.id], {
                        toValue: 0.95,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(scaleAnims[flag.id], {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]).start();
                  }}
                  style={styles.flagCard}
                >
                  <View style={styles.flagHeader}>
                    <View style={styles.flagInfo}>
                      <Text style={styles.flagName}>{flag.name}</Text>
                      <Text style={styles.flagDescription}>{flag.description}</Text>
                      {flag.rolloutPercentage !== undefined && (
                        <Text style={styles.flagRollout}>Rollout: {flag.rolloutPercentage}%</Text>
                      )}
                    </View>
                    <Switch
                      value={flag.enabled}
                      onValueChange={() => handleToggleFlag(flag)}
                      trackColor={{ false: '#333', true: '#6366f1' }}
                      thumbColor={flag.enabled ? '#FFFFFF' : '#666'}
                    />
                  </View>
                  <View style={styles.flagMeta}>
                    <Text style={styles.flagMetaText}>
                      Modified {getTimeAgo(flag.lastModified)} by {flag.modifiedBy}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderServices = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.servicesContainer}>
        {/* Emergency Controls */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Emergency Controls</Text>

          <Pressable
            onPress={handleMaintenanceMode}
            style={[styles.emergencyButton, maintenanceMode && styles.emergencyButtonActive]}
          >
            <LinearGradient
              colors={maintenanceMode ? ['#FFAA00', '#FF8800'] : ['#333', '#222']}
              style={styles.emergencyGradient}
            >
              <Ionicons name="construct" size={24} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>
                {maintenanceMode ? 'Maintenance Mode Active' : 'Enable Maintenance Mode'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleEmergencyShutdown}
            style={[styles.emergencyButton, emergencyShutdown && styles.emergencyButtonActive]}
            disabled={emergencyShutdown}
          >
            <LinearGradient
              colors={emergencyShutdown ? ['#FF0000', '#CC0000'] : ['#FF4444', '#FF0000']}
              style={styles.emergencyGradient}
            >
              <Ionicons name="power" size={24} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>
                {emergencyShutdown ? 'SHUTDOWN ACTIVE' : 'Emergency Shutdown'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Service Status */}
        <Text style={styles.sectionTitle}>Service Status</Text>
        {services.map(service => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.critical && (
                  <View style={styles.criticalBadge}>
                    <Text style={styles.criticalText}>CRITICAL</Text>
                  </View>
                )}
              </View>
              <View style={[styles.serviceStatus, styles[`status${service.status}`]]}>
                <Text style={styles.serviceStatusText}>{service.status.toUpperCase()}</Text>
              </View>
            </View>
            {service.dependencies.length > 0 && (
              <View style={styles.dependencies}>
                <Text style={styles.dependenciesLabel}>Dependencies:</Text>
                <Text style={styles.dependenciesText}>{service.dependencies.join(', ')}</Text>
              </View>
            )}
            <View style={styles.serviceActions}>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  // Handle service action
                }}
                style={styles.serviceButton}
              >
                <Ionicons name="refresh" size={16} color="#6366f1" />
                <Text style={styles.serviceButtonText}>Restart</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  // Handle service logs
                }}
                style={styles.serviceButton}
              >
                <Ionicons name="document-text" size={16} color="#6366f1" />
                <Text style={styles.serviceButtonText}>View Logs</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderCache = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.cacheContainer}>
        {/* Cache Stats */}
        <View style={styles.cacheStats}>
          <View style={styles.cacheStatCard}>
            <Text style={styles.cacheStatValue}>{cacheStats.totalSize}GB</Text>
            <Text style={styles.cacheStatLabel}>Total Size</Text>
          </View>
          <View style={styles.cacheStatCard}>
            <Text style={[styles.cacheStatValue, { color: '#00FF88' }]}>{cacheStats.hitRate}%</Text>
            <Text style={styles.cacheStatLabel}>Hit Rate</Text>
          </View>
          <View style={styles.cacheStatCard}>
            <Text style={[styles.cacheStatValue, { color: '#FF4444' }]}>
              {cacheStats.missRate}%
            </Text>
            <Text style={styles.cacheStatLabel}>Miss Rate</Text>
          </View>
          <View style={styles.cacheStatCard}>
            <Text style={[styles.cacheStatValue, { color: '#FFAA00' }]}>
              {cacheStats.evictionRate}%
            </Text>
            <Text style={styles.cacheStatLabel}>Eviction Rate</Text>
          </View>
        </View>

        {/* Cache Actions */}
        <View style={styles.cacheActions}>
          <Pressable
            onPress={() => handleClearCache()}
            style={styles.clearAllButton}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.clearAllText}>Clear All Cache</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Cache Items */}
        <Text style={styles.sectionTitle}>Cache Items</Text>
        {cacheStats.items.map(item => (
          <View key={item.key} style={styles.cacheItem}>
            <View style={styles.cacheItemInfo}>
              <Text style={styles.cacheItemKey}>{item.key}</Text>
              <View style={styles.cacheItemMeta}>
                <Text style={styles.cacheItemMetaText}>{item.size}MB</Text>
                <Text style={styles.cacheItemMetaText}>•</Text>
                <Text style={styles.cacheItemMetaText}>TTL: {item.ttl}s</Text>
                <Text style={styles.cacheItemMetaText}>•</Text>
                <Text style={styles.cacheItemMetaText}>Last: {getTimeAgo(item.lastAccessed)}</Text>
              </View>
            </View>
            <Pressable onPress={() => handleClearCache(item.key)} style={styles.clearItemButton}>
              <Ionicons name="close-circle" size={20} color="#FF4444" />
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderAnnouncements = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.announcementsContainer}>
        <Pressable
          onPress={() => {
            haptics.impact('light');
            // TODO: Implement create announcement
          }}
          style={styles.createButton}
        >
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.createGradient}>
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.createText}>Create Announcement</Text>
          </LinearGradient>
        </Pressable>

        {announcements.map(announcement => (
          <View
            key={announcement.id}
            style={[styles.announcementCard, announcement.active && styles.announcementCardActive]}
          >
            <View style={styles.announcementHeader}>
              <View style={styles.announcementInfo}>
                <View style={[styles.announcementType, styles[`type${announcement.type}`]]}>
                  <Ionicons
                    name={
                      (announcement.type === 'critical'
                        ? 'alert-circle'
                        : announcement.type === 'warning'
                          ? 'warning'
                          : 'information-circle') as any}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.announcementTypeText}>{announcement.type.toUpperCase()}</Text>
                </View>
                <Switch
                  value={announcement.active}
                  onValueChange={() => {
                    haptics.toggle(!announcement.active);
                    setAnnouncements(
                      announcements.map(a =>
                        a.id === announcement.id ? { ...a, active: !a.active } : a
                      )
                    );
                  }}
                  trackColor={{ false: '#333', true: '#6366f1' }}
                  thumbColor={announcement.active ? '#FFFFFF' : '#666'}
                />
              </View>
              <Text style={styles.announcementTitle}>{announcement.title}</Text>
              <Text style={styles.announcementMessage}>{announcement.message}</Text>
              <View style={styles.announcementMeta}>
                <Text style={styles.announcementMetaText}>
                  Target: {announcement.targetAudience}
                </Text>
                <Text style={styles.announcementMetaText}>•</Text>
                <Text style={styles.announcementMetaText}>
                  Start: {announcement.startDate.toLocaleDateString()}
                </Text>
                {announcement.endDate && (
                  <>
                    <Text style={styles.announcementMetaText}>•</Text>
                    <Text style={styles.announcementMetaText}>
                      End: {announcement.endDate.toLocaleDateString()}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
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

          <Text style={styles.headerTitle}>System Controls</Text>

          <View style={styles.systemStatus}>
            <View
              style={[
                styles.systemDot,
                { backgroundColor: maintenanceMode ? '#FFAA00' : '#00FF88' },
              ]}
            />
            <Text style={[styles.systemText, { color: maintenanceMode ? '#FFAA00' : '#00FF88' }]}>
              {maintenanceMode ? 'MAINTENANCE' : 'OPERATIONAL'}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['flags', 'services', 'cache', 'announcements'] as const).map(tab => (
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
          {activeTab === 'flags' && renderFeatureFlags()}
          {activeTab === 'services' && renderServices()}
          {activeTab === 'cache' && renderCache()}
          {activeTab === 'announcements' && renderAnnouncements()}
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
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  systemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  systemText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tab: {
    paddingVertical: 12,
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
  flagsContainer: {
    padding: 24,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textTransform: 'uppercase',
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
    alignItems: 'flex-start',
  },
  flagInfo: {
    flex: 1,
    marginRight: 16,
  },
  flagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  flagDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  flagRollout: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  flagMeta: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  flagMetaText: {
    fontSize: 12,
    color: '#666',
  },
  servicesContainer: {
    padding: 24,
  },
  emergencySection: {
    marginBottom: 32,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emergencyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  emergencyButtonActive: {
    opacity: 0.8,
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  criticalBadge: {
    backgroundColor: '#FF444420',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF4444',
  },
  serviceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusactive: {
    backgroundColor: '#00FF8820',
  },
  statusinactive: {
    backgroundColor: '#66666620',
  },
  statusmaintenance: {
    backgroundColor: '#FFAA0020',
  },
  serviceStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dependencies: {
    marginBottom: 8,
  },
  dependenciesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dependenciesText: {
    fontSize: 14,
    color: '#999',
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  cacheContainer: {
    padding: 24,
  },
  cacheStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  cacheStatCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cacheStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cacheStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  cacheActions: {
    marginBottom: 32,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 14,
  },
  clearAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cacheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cacheItemInfo: {
    flex: 1,
  },
  cacheItemKey: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cacheItemMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  cacheItemMetaText: {
    fontSize: 12,
    color: '#666',
  },
  clearItemButton: {
    padding: 8,
  },
  announcementsContainer: {
    padding: 24,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  createText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  announcementCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  announcementCardActive: {
    borderColor: '#6366f1',
  },
  announcementHeader: {
    gap: 12,
  },
  announcementInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeinfo: {
    backgroundColor: '#6366f120',
  },
  typewarning: {
    backgroundColor: '#FFAA0020',
  },
  typecritical: {
    backgroundColor: '#FF444420',
  },
  announcementTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  announcementMessage: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  announcementMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  announcementMetaText: {
    fontSize: 12,
    color: '#666',
  },
});
