
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  responseTime: number;
  errorRate: number;
}

interface AdminMetric {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  priority?: 'urgent' | 'normal';
}

interface RecentAction {
  id: string;
  type: 'approval' | 'rejection' | 'ban' | 'unban' | 'flag' | 'system';
  description: string;
  admin: string;
  timestamp: Date;
}

interface QuickTool {
  id: string;
  title: string;
  icon: string;
  color: string;
  screen: string;
  count?: number;
}

export const AdminDashboard: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [refreshing, setRefreshing] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: '99.98%',
    responseTime: 42,
    errorRate: 0.02,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Initialize scale animations for quick tools
  const quickTools: QuickTool[] = [
    {
      id: 'review',
      title: 'Review Queue',
      icon: 'game-controller',
      color: '#6366f1',
      screen: 'GameReviewQueue',
      count: 12,
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'flag',
      color: '#FF4444',
      screen: 'ContentModeration',
      count: 28,
    },
    {
      id: 'users',
      title: 'Users',
      icon: 'people',
      color: '#00FF88',
      screen: 'UserManagement',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: 'analytics',
      color: '#FF0066',
      screen: 'PlatformAnalytics',
    },
    {
      id: 'controls',
      title: 'System',
      icon: 'settings',
      color: '#FFAA00',
      screen: 'SystemControls',
    },
    {
      id: 'logs',
      title: 'Audit Logs',
      icon: 'document-text',
      color: '#00FFFF',
      screen: 'AuditLogs',
    },
  ];

  quickTools.forEach(tool => {
    if (!scaleAnims[tool.id]) {
      scaleAnims[tool.id] = new Animated.Value(1);
    }
  });

  // Mock data
  const [metrics] = useState<AdminMetric[]>([
    {
      id: 'pending',
      title: 'Pending Reviews',
      value: 12,
      priority: 'urgent',
    },
    {
      id: 'reports',
      title: 'Open Reports',
      value: 28,
      priority: 'urgent',
    },
    {
      id: 'activeUsers',
      title: 'Active Users',
      value: '45.2K',
      change: '+12%',
      trend: 'up',
    },
    {
      id: 'revenue',
      title: 'Daily Revenue',
      value: '$8,420',
      change: '+8%',
      trend: 'up',
    },
  ]);

  const [recentActions] = useState<RecentAction[]>([
    {
      id: '1',
      type: 'approval',
      description: 'Approved "Space Shooter Pro"',
      admin: 'Admin_Sarah',
      timestamp: new Date(Date.now() - 600000),
    },
    {
      id: '2',
      type: 'ban',
      description: 'Banned user for policy violation',
      admin: 'Admin_Mike',
      timestamp: new Date(Date.now() - 1800000),
    },
    {
      id: '3',
      type: 'flag',
      description: 'Flagged content for review',
      admin: 'Admin_Lisa',
      timestamp: new Date(Date.now() - 3600000),
    },
  ]);

  // Chart data for active users
  const [chartData] = useState([
    { hour: '00', users: 12000 },
    { hour: '04', users: 8000 },
    { hour: '08', users: 25000 },
    { hour: '12', users: 45000 },
    { hour: '16', users: 52000 },
    { hour: '20', users: 38000 },
    { hour: '24', users: 20000 },
  ]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    haptics.impact('light');

    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
      (haptics as any).success();

      // Update system health
      setSystemHealth({
        status: 'healthy',
        uptime: '99.99%',
        responseTime: 38,
        errorRate: 0.01,
      });
    }, 1500);
  };

  const handleQuickToolPress = (tool: QuickTool) => {
    haptics.impact('medium');

    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnims[tool.id], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[tool.id], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to tool
    navigation.navigate(tool.screen as never as never);
  };

  const renderSystemHealth = () => {
    const statusColors = {
      healthy: '#00FF88',
      warning: '#FFAA00',
      critical: '#FF4444',
    };

    const statusIcons = {
      healthy: 'checkmark-circle',
      warning: 'warning',
      critical: 'alert-circle',
    };

    return (
      <View style={styles.systemHealthCard}>
        <View style={styles.systemHealthHeader}>
          <Text style={styles.systemHealthTitle}>System Health</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[systemHealth.status] + '20' },
            ]}
          >
            <Ionicons
              name={statusIcons[systemHealth.status] as keyof typeof Ionicons.glyphMap}
              size={16}
              color={statusColors[systemHealth.status]}
            />
            <Text style={[styles.statusText, { color: statusColors[systemHealth.status] }]}>
              {systemHealth.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.healthMetrics}>
          <View style={styles.healthMetric}>
            <Text style={styles.healthMetricLabel}>Uptime</Text>
            <Text style={styles.healthMetricValue}>{systemHealth.uptime}</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthMetricLabel}>Response</Text>
            <Text style={styles.healthMetricValue}>{systemHealth.responseTime}ms</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthMetricLabel}>Error Rate</Text>
            <Text style={styles.healthMetricValue}>{(systemHealth as any).errorRate}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActiveUsersChart = () => {
    const maxUsers = Math.max(...chartData.map(d => d.users));
    const chartHeight = 120;
    const chartWidth = SCREEN_WIDTH - 64;
    const barWidth = chartWidth / chartData.length - 10;

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Active Users (24h)</Text>
        <View style={styles.chart}>
          {chartData.map((data, index) => {
            const barHeight = (data.users / maxUsers) * chartHeight;
            return (
              <View key={data.hour} style={styles.chartBar}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      width: barWidth,
                      backgroundColor: index === chartData.length - 1 ? '#6366f1' : '#333',
                    },
                  ]}
                />
                <Text style={styles.chartLabel}>{data.hour}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMetricCard = (metric: AdminMetric) => {
    const trendColors = {
      up: '#00FF88',
      down: '#FF4444',
      stable: '#666',
    };

    return (
      <View
        key={metric.id}
        style={[styles.metricCard, metric.priority === 'urgent' && styles.urgentMetric]}
      >
        {metric.priority === 'urgent' && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
        <Text style={styles.metricTitle}>{metric.title}</Text>
        <Text style={styles.metricValue}>{metric.value}</Text>
        {metric.change && (
          <View style={styles.metricChange}>
            <Ionicons
              name={metric.trend === 'up' ? 'trending-up' : 'trending-down' as any}
              size={16}
              color={trendColors[metric.trend!]}
            />
            <Text style={[styles.changeText, { color: trendColors[metric.trend!] }]}>
              {metric.change}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderRecentAction = (action: RecentAction) => {
    const actionIcons = {
      approval: { icon: 'checkmark-circle', color: '#00FF88' },
      rejection: { icon: 'close-circle', color: '#FF4444' },
      ban: { icon: 'ban', color: '#FF4444' },
      unban: { icon: 'checkmark-circle', color: '#00FF88' },
      flag: { icon: 'flag', color: '#FFAA00' },
      system: { icon: 'settings', color: '#6366f1' },
    };

    const config = actionIcons[action.type];
    const timeAgo = getTimeAgo(action.timestamp);

    return (
      <View key={action.id} style={styles.actionItem}>
        <View style={[styles.actionIcon, { backgroundColor: config.color + '20' }]}>
          <Ionicons
            name={config.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={config.color}
          />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionDescription}>{action.description}</Text>
          <View style={styles.actionMeta}>
            <Text style={styles.actionAdmin}>{action.admin}</Text>
            <Text style={styles.actionTime}>• {timeAgo}</Text>
          </View>
        </View>
      </View>
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
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>Welcome back, Admin</Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              navigation.navigate('SettingsScreen' as never as never);
            }}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
          }
        >
          {/* System Health */}
          {renderSystemHealth()}

          {/* Quick Tools */}
          <View style={styles.quickToolsSection}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickToolsGrid}>
              {quickTools.map(tool => (
                <Animated.View
                  key={tool.id}
                  style={{ transform: [{ scale: scaleAnims[tool.id] }] }}
                >
                  <Pressable onPress={() => handleQuickToolPress(tool)} style={styles.quickTool}>
                    <LinearGradient
                      colors={[tool.color + '20', tool.color + '10']}
                      style={styles.quickToolGradient}
                    >
                      <Ionicons
                        name={tool.icon as keyof typeof Ionicons.glyphMap}
                        size={28}
                        color={tool.color}
                      />
                      {tool.count !== undefined && (
                        <View style={[styles.toolBadge, { backgroundColor: tool.color }]}>
                          <Text style={styles.toolBadgeText}>{tool.count}</Text>
                        </View>
                      )}
                    </LinearGradient>
                    <Text style={styles.quickToolTitle}>{tool.title}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Key Metrics */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              {metrics.map(metric => renderMetricCard(metric))}
            </View>
          </View>

          {/* Active Users Chart */}
          {renderActiveUsersChart()}

          {/* Recent Actions */}
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Admin Actions</Text>
              <Pressable
                onPress={() => {
                  haptics.impact('light');
                  navigation.navigate('AuditLogs' as never as never);
                }}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#6366f1" />
              </Pressable>
            </View>
            <View style={styles.actionsList}>
              {recentActions.map(action => renderRecentAction(action))}
            </View>
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
  },
  systemHealthCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  systemHealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  systemHealthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthMetric: {
    alignItems: 'center',
  },
  healthMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  healthMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickToolsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  quickToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  quickTool: {
    width: (SCREEN_WIDTH - 64) / 3,
    alignItems: 'center',
  },
  quickToolGradient: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  quickToolTitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  toolBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  toolBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsSection: {
    marginBottom: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  urgentMetric: {
    borderColor: '#FF4444',
  },
  urgentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    marginHorizontal: 24,
    marginBottom: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
  },
  chartBar: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: '#666',
  },
  recentSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  actionsList: {
    paddingHorizontal: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionAdmin: {
    fontSize: 12,
    color: '#666',
  },
  actionTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});
