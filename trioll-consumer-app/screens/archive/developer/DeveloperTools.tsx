
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Alert, Switch } from 'react-native';
// Clipboard functionality removed - expo-clipboard not installed
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

interface APIKey {
  id: string;
  name: string;
  key: string;
  created: Date;
  lastUsed: Date | null;
  permissions: string[];
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  failures: number;
}

interface TestAccount {
  id: string;
  email: string;
  password: string;
  credits: number;
  created: Date;
}

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: unknown;
}

export const DeveloperTools: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [activeSection, setActiveSection] = useState<'api' | 'sdk' | 'webhooks' | 'test' | 'debug'>(
    'api'
  );

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Modal states
  const [showNewAPIKeyModal, setShowNewAPIKeyModal] = useState(false);
  const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);

  // Mock data
  const [apiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Production Key',
      key: 'pk_live_a1b2c3d4e5f6g7h8i9j0',
      created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 3600000),
      permissions: ['read', 'write', 'delete'],
    },
    {
      id: '2',
      name: 'Development Key',
      key: 'pk_test_z9y8x7w6v5u4t3s2r1q0',
      created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 86400000),
      permissions: ['read', 'write'],
    },
  ]);

  const [webhooks] = useState<WebhookEndpoint[]>([
    {
      id: '1',
      url: 'https://api.example.com/trioll/webhook',
      events: ['trial.started', 'trial.completed', 'game.published'],
      active: true,
      failures: 0,
    },
    {
      id: '2',
      url: 'https://analytics.example.com/events',
      events: ['user.registered', 'payment.completed'],
      active: false,
      failures: 3,
    },
  ]);

  const [testAccounts] = useState<TestAccount[]>([
    {
      id: '1',
      email: 'test1@trioll.dev',
      password: 'Test123!',
      credits: 100,
      created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      email: 'test2@trioll.dev',
      password: 'Test456!',
      credits: 50,
      created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  const [debugLogs] = useState<DebugLog[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000),
      level: 'info',
      message: 'Trial started successfully',
      details: { gameId: '123', userId: '456' },
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 600000),
      level: 'warning',
      message: 'Slow API response time',
      details: { endpoint: '/api/games', responseTime: '2.3s' },
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 900000),
      level: 'error',
      message: 'WebView initialization failed',
      details: { error: 'Network timeout', retries: 3 },
    },
  ]);

  const [sdkVersions] = useState([
    { platform: 'iOS', version: '2.4.1', releaseDate: '2024-01-15', downloadUrl: '#' },
    { platform: 'Android', version: '2.4.1', releaseDate: '2024-01-15', downloadUrl: '#' },
    { platform: 'Unity', version: '2.3.0', releaseDate: '2024-01-10', downloadUrl: '#' },
    { platform: 'Web', version: '2.4.0', releaseDate: '2024-01-12', downloadUrl: '#' },
  ]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  const copyToClipboard = async (text: string) => {
    // TODO: Install expo-clipboard or @react-native-clipboard/clipboard
    (haptics as any).success();
    Alert.alert('Copy', `API Key: ${text}`);
  };

  const renderAPISection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionContent}>
        {/* API Documentation Link */}
        <Pressable
          onPress={() => {
            haptics.impact('light');
            // Open API docs
          }}
          style={styles.docsCard}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.docsGradient}
          >
            <Ionicons name="book" size={32} color="#FFFFFF" />
            <View style={styles.docsContent}>
              <Text style={styles.docsTitle}>API Documentation</Text>
              <Text style={styles.docsSubtitle}>
                Complete reference with examples and best practices
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>

        {/* API Keys */}
        <View style={styles.keysSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>API Keys</Text>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                setShowNewAPIKeyModal(true);
              }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#6366f1" />
              <Text style={styles.addButtonText}>New Key</Text>
            </Pressable>
          </View>

          {apiKeys.map(key => (
            <View key={key.id} style={styles.apiKeyCard}>
              <View style={styles.keyHeader}>
                <Text style={styles.keyName}>{key.name}</Text>
                <View style={styles.keyActions}>
                  <Pressable onPress={() => copyToClipboard(key.key)} style={styles.keyAction}>
                    <Ionicons name="copy" size={18} color="#6366f1" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      haptics.warning();
                      Alert.alert(
                        'Delete API Key',
                        'This action cannot be undone. Apps using this key will stop working.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              // Delete key
                            },
                          },
                        ]
                      );
                    }}
                    style={styles.keyAction}
                  >
                    <Ionicons name="trash" size={18} color="#FF4444" />
                  </Pressable>
                </View>
              </View>

              <Pressable onPress={() => copyToClipboard(key.key)} style={styles.keyValue}>
                <Text style={styles.keyText}>{key.key}</Text>
                <Ionicons name="copy-outline" size={16} color="#666" />
              </Pressable>

              <View style={styles.keyMeta}>
                <Text style={styles.keyMetaText}>Created {key.created.toLocaleDateString()}</Text>
                {key.lastUsed && (
                  <>
                    <Text style={styles.keyMetaDot}>•</Text>
                    <Text style={styles.keyMetaText}>
                      Last used {key.lastUsed.toLocaleTimeString()}
                    </Text>
                  </>
                )}
              </View>

              <View style={styles.keyPermissions}>
                {key.permissions.map(perm => (
                  <View key={perm} style={styles.permissionBadge}>
                    <Text style={styles.permissionText}>{perm.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Rate Limits */}
        <View style={styles.rateLimitsCard}>
          <Text style={styles.cardTitle}>Rate Limits</Text>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>Requests per minute</Text>
            <Text style={styles.limitValue}>60</Text>
          </View>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>Requests per hour</Text>
            <Text style={styles.limitValue}>1,000</Text>
          </View>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>Concurrent connections</Text>
            <Text style={styles.limitValue}>10</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderSDKSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionContent}>
        <Text style={styles.sectionTitle}>SDK Downloads</Text>

        {sdkVersions.map(sdk => (
          <Pressable
            key={sdk.platform}
            onPress={() => {
              haptics.impact('light');
              // Download SDK
            }}
            style={styles.sdkCard}
          >
            <View style={styles.sdkIcon}>
              <MaterialIcons
                name={
                  (sdk.platform === 'iOS'
                    ? 'phone-iphone'
                    : sdk.platform === 'Android'
                      ? 'android'
                      : sdk.platform === 'Unity'
                        ? 'sports-esports'
                        : 'web') as any}
                size={32}
                color="#6366f1"
              />
            </View>
            <View style={styles.sdkInfo}>
              <Text style={styles.sdkPlatform}>{sdk.platform} SDK</Text>
              <Text style={styles.sdkVersion}>Version {sdk.version}</Text>
              <Text style={styles.sdkDate}>Released {sdk.releaseDate}</Text>
            </View>
            <View style={styles.sdkActions}>
              <Ionicons name="download" size={24} color="#6366f1" />
            </View>
          </Pressable>
        ))}

        {/* Integration Guides */}
        <View style={styles.guidesSection}>
          <Text style={styles.sectionTitle}>Integration Guides</Text>
          <View style={styles.guidesList}>
            {[
              { title: 'Quick Start Guide', icon: 'rocket', time: '5 min' },
              { title: 'Authentication', icon: 'key', time: '10 min' },
              { title: 'Trial Implementation', icon: 'play-circle', time: '15 min' },
              { title: 'Analytics Integration', icon: 'analytics', time: '10 min' },
              { title: 'Error Handling', icon: 'warning', time: '8 min' },
            ].map(guide => (
              <Pressable
                key={guide.title}
                onPress={() => {
                  haptics.impact('light');
                  // Open guide
                }}
                style={styles.guideCard}
              >
                <Ionicons
                  name={guide.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color="#6366f1"
                />
                <View style={styles.guideContent}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideTime}>{guide.time} read</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderWebhooksSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Webhook Endpoints</Text>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              setShowNewWebhookModal(true);
            }}
            style={styles.addButton}
          >
            <Ionicons name="add" size={20} color="#6366f1" />
            <Text style={styles.addButtonText}>Add Endpoint</Text>
          </Pressable>
        </View>

        {webhooks.map(webhook => (
          <View key={webhook.id} style={styles.webhookCard}>
            <View style={styles.webhookHeader}>
              <View style={styles.webhookStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: webhook.active ? '#00FF88' : '#FF4444' },
                  ]}
                />
                <Text style={styles.webhookUrl}>{webhook.url}</Text>
              </View>
              <Switch
                value={webhook.active}
                onValueChange={value => {
                  haptics.toggle(value);
                  // Toggle webhook
                }}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor={webhook.active ? '#FFFFFF' : '#666'}
              />
            </View>

            <View style={styles.webhookEvents}>
              {webhook.events.map(event => (
                <View key={event} style={styles.eventBadge}>
                  <Text style={styles.eventText}>{event}</Text>
                </View>
              ))}
            </View>

            {webhook.failures > 0 && (
              <View style={styles.webhookWarning}>
                <Ionicons name="warning" size={16} color="#FFD700" />
                <Text style={styles.warningText}>
                  {webhook.failures} failed deliveries in the last 24 hours
                </Text>
              </View>
            )}

            <View style={styles.webhookActions}>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  // Test webhook
                }}
                style={styles.webhookAction}
              >
                <Ionicons name="send" size={16} color="#6366f1" />
                <Text style={styles.webhookActionText}>Test</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  // Edit webhook
                }}
                style={styles.webhookAction}
              >
                <Ionicons name="pencil" size={16} color="#6366f1" />
                <Text style={styles.webhookActionText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.warning();
                  // Delete webhook
                }}
                style={styles.webhookAction}
              >
                <Ionicons name="trash" size={16} color="#FF4444" />
                <Text style={[styles.webhookActionText, { color: '#FF4444' }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* Available Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Available Events</Text>
          <View style={styles.eventsList}>
            {[
              { category: 'Trial', events: ['trial.started', 'trial.completed', 'trial.failed'] },
              { category: 'Game', events: ['game.published', 'game.updated', 'game.deleted'] },
              { category: 'User', events: ['user.registered', 'user.upgraded', 'user.churned'] },
              {
                category: 'Payment',
                events: ['payment.completed', 'payment.failed', 'payout.sent'],
              },
            ].map(category => (
              <View key={category.category} style={styles.eventCategory}>
                <Text style={styles.categoryTitle}>{category.category}</Text>
                {category.events.map(event => (
                  <View key={event} style={styles.eventItem}>
                    <Text style={styles.eventName}>{event}</Text>
                    <Ionicons name="information-circle-outline" size={16} color="#666" />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderTestSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionContent}>
        <Text style={styles.sectionTitle}>Test Accounts</Text>

        {testAccounts.map(account => {
          const scaleAnim = getScaleAnim(account.id);

          return (
            <Pressable
              key={account.id}
              onPressIn={() => {
                Animated.spring(scaleAnim, {
                  toValue: 0.98,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(scaleAnim, {
                  toValue: 1,
                  useNativeDriver: true,
                }).start();
              }}
              style={styles.testAccountCard}
            >
              <Animated.View style={[styles.accountContent, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.avatarText}>T{account.id}</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountEmail}>{account.email}</Text>
                  <View style={styles.accountMeta}>
                    <Text style={styles.accountPassword}>Password: {account.password}</Text>
                    <Pressable
                      onPress={() => copyToClipboard(account.password)}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={14} color="#6366f1" />
                    </Pressable>
                  </View>
                  <View style={styles.accountStats}>
                    <Text style={styles.accountStat}>{account.credits} trial credits</Text>
                    <Text style={styles.accountDot}>•</Text>
                    <Text style={styles.accountStat}>
                      Created {account.created.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    haptics.impact('light');
                    // Reset account
                  }}
                  style={styles.resetButton}
                >
                  <Ionicons name="refresh" size={20} color="#6366f1" />
                </Pressable>
              </Animated.View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => {
            haptics.impact('light');
            // Create test account
          }}
          style={styles.createAccountButton}
        >
          <Ionicons name="add-circle" size={24} color="#6366f1" />
          <Text style={styles.createAccountText}>Create Test Account</Text>
        </Pressable>

        {/* Test Environment */}
        <View style={styles.testEnvSection}>
          <Text style={styles.sectionTitle}>Test Environment</Text>
          <View style={styles.envCard}>
            <View style={styles.envItem}>
              <Text style={styles.envLabel}>Base URL</Text>
              <Pressable
                onPress={() => copyToClipboard('https://api-test.trioll.com')}
                style={styles.envValue}
              >
                <Text style={styles.envValueText}>https://api-test.trioll.com</Text>
                <Ionicons name="copy-outline" size={16} color="#666" />
              </Pressable>
            </View>
            <View style={styles.envItem}>
              <Text style={styles.envLabel}>WebSocket URL</Text>
              <Pressable
                onPress={() => copyToClipboard('wss://ws-test.trioll.com')}
                style={styles.envValue}
              >
                <Text style={styles.envValueText}>wss://ws-test.trioll.com</Text>
                <Ionicons name="copy-outline" size={16} color="#666" />
              </Pressable>
            </View>
            <View style={styles.envNote}>
              <Ionicons name="information-circle" size={16} color="#6366f1" />
              <Text style={styles.envNoteText}>
                Test environment data is reset daily at 00:00 UTC
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderDebugSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionContent}>
        {/* Debug Controls */}
        <View style={styles.debugControls}>
          <Text style={styles.sectionTitle}>Debug Tools</Text>
          <View style={styles.controlsGrid}>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                // Clear cache
              }}
              style={styles.debugControl}
            >
              <Ionicons name="trash" size={24} color="#FF4444" />
              <Text style={styles.controlText}>Clear Cache</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                // Export logs
              }}
              style={styles.debugControl}
            >
              <Ionicons name="download" size={24} color="#6366f1" />
              <Text style={styles.controlText}>Export Logs</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                // Network monitor
              }}
              style={styles.debugControl}
            >
              <Ionicons name="wifi" size={24} color="#00FF88" />
              <Text style={styles.controlText}>Network</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                // Performance
              }}
              style={styles.debugControl}
            >
              <Ionicons name="speedometer" size={24} color="#FFD700" />
              <Text style={styles.controlText}>Performance</Text>
            </Pressable>
          </View>
        </View>

        {/* Debug Logs */}
        <View style={styles.logsSection}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Debug Logs</Text>
            <View style={styles.logFilters}>
              {['all', 'info', 'warning', 'error'].map(filter => (
                <Pressable
                  key={filter}
                  onPress={() => {
                    haptics.selection();
                    // Filter logs
                  }}
                  style={[styles.logFilter, filter === 'all' && styles.logFilterActive]}
                >
                  <Text
                    style={[styles.logFilterText, filter === 'all' && styles.logFilterTextActive]}
                  >
                    {filter.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {debugLogs.map(log => (
            <Pressable
              key={log.id}
              onPress={() => {
                haptics.impact('light');
                // Show log details
              }}
              style={styles.logItem}
            >
              <View style={styles.logHeader}>
                <View style={styles.logLevel}>
                  <Ionicons
                    name={
                      (log.level === 'info'
                        ? 'information-circle'
                        : log.level === 'warning'
                          ? 'warning'
                          : 'close-circle') as any}
                    size={20}
                    color={
                      log.level === 'info'
                        ? '#6366f1'
                        : log.level === 'warning'
                          ? '#FFD700'
                          : '#FF4444'
                    }
                  />
                  <Text style={styles.logTimestamp}>{log.timestamp.toLocaleTimeString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              {log.details && (
                <Text style={styles.logDetails}>{JSON.stringify(log.details, null, 2)}</Text>
              )}
            </Pressable>
          ))}
        </View>
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
          <Text style={styles.headerTitle}>Developer Tools</Text>
          <View style={styles.headerSpace} />
        </View>

        {/* Section Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          <View style={styles.tabs}>
            {(['api', 'sdk', 'webhooks', 'test', 'debug'] as const).map(section => (
              <Pressable
                key={section}
                onPress={() => {
                  haptics.selection();
                  setActiveSection(section);
                }}
                style={[styles.tab, activeSection === section && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeSection === section && styles.tabTextActive]}>
                  {section.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Section Content */}
        <View style={styles.sectionContainer}>
          {activeSection === 'api' && renderAPISection()}
          {activeSection === 'sdk' && renderSDKSection()}
          {activeSection === 'webhooks' && renderWebhooksSection()}
          {activeSection === 'test' && renderTestSection()}
          {activeSection === 'debug' && renderDebugSection()}
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
  headerSpace: {
    width: 40,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  sectionContainer: {
    flex: 1,
  },
  sectionContent: {
    padding: 24,
  },
  docsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  docsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  docsContent: {
    flex: 1,
  },
  docsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  docsSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  keysSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  apiKeyCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  keyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  keyAction: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  keyText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#6366f1',
  },
  keyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  keyMetaText: {
    fontSize: 12,
    color: '#666',
  },
  keyMetaDot: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  keyPermissions: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  permissionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
  },
  rateLimitsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  limitLabel: {
    fontSize: 14,
    color: '#999',
  },
  limitValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sdkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sdkIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sdkInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sdkPlatform: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sdkVersion: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 2,
  },
  sdkDate: {
    fontSize: 12,
    color: '#666',
  },
  sdkActions: {
    padding: 8,
  },
  guidesSection: {
    marginTop: 32,
  },
  guidesList: {
    marginTop: 16,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  guideContent: {
    flex: 1,
    marginLeft: 16,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  guideTime: {
    fontSize: 12,
    color: '#666',
  },
  webhookCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  webhookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  webhookStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  webhookUrl: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  webhookEvents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  eventBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  eventText: {
    fontSize: 12,
    color: '#6366f1',
  },
  webhookWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#FFD700',
    lineHeight: 18,
  },
  webhookActions: {
    flexDirection: 'row',
    gap: 16,
  },
  webhookAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webhookActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  eventsSection: {
    marginTop: 32,
  },
  eventsList: {
    marginTop: 16,
  },
  eventCategory: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventName: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'monospace',
  },
  testAccountCard: {
    marginBottom: 12,
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 16,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  accountPassword: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'monospace',
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  accountStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountStat: {
    fontSize: 12,
    color: '#666',
  },
  accountDot: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  resetButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    gap: 12,
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  testEnvSection: {
    marginTop: 32,
  },
  envCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  envItem: {
    marginBottom: 16,
  },
  envLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  envValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  envValueText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#FFFFFF',
  },
  envNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  envNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#6366f1',
    lineHeight: 18,
  },
  debugControls: {
    marginBottom: 32,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  debugControl: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  controlText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  logsSection: {
    marginBottom: 32,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logFilters: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 4,
  },
  logFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logFilterActive: {
    backgroundColor: '#6366f1',
  },
  logFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  logFilterTextActive: {
    color: '#FFFFFF',
  },
  logItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  logMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  logDetails: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#000',
    borderRadius: 4,
    padding: 8,
  },
});
