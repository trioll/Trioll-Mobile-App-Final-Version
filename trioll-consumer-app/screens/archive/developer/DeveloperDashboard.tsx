
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';
import { GlassContainer } from '../../src/components/core';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OverviewMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

interface DeveloperGame {
  id: string;
  title: string;
  status: 'published' | 'pending' | 'draft' | 'rejected';
  plays: number;
  rating: number;
  revenue: number;
  coverImage: string;
  lastUpdated: Date;
}

export const DeveloperDashboard: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'DeveloperDashboard'>>();
  const haptics = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Mock data
  const [metrics] = useState<OverviewMetric[]>([
    {
      id: 'plays',
      title: 'Total Plays',
      value: '125.4K',
      change: '+12.5%',
      trend: 'up',
      icon: 'play-circle',
      color: '#6366f1',
    },
    {
      id: 'users',
      title: 'Active Users',
      value: '45.2K',
      change: '+8.3%',
      trend: 'up',
      icon: 'users',
      color: '#00FF88',
    },
    {
      id: 'rating',
      title: 'Avg Rating',
      value: '4.6',
      change: '+0.2',
      trend: 'up',
      icon: 'star',
      color: '#FFD700',
    },
    {
      id: 'revenue',
      title: 'Revenue',
      value: '$8,420',
      change: '+15.2%',
      trend: 'up',
      icon: 'dollar-sign',
      color: '#FF0066',
    },
  ]);

  const [myGames] = useState<DeveloperGame[]>([
    {
      id: '1',
      title: 'Space Shooter Pro',
      status: 'published',
      plays: 45200,
      rating: 4.8,
      revenue: 3250,
      coverImage: 'https://picsum.photos/400/600?random=1',
      lastUpdated: new Date(Date.now() - 86400000),
    },
    {
      id: '2',
      title: 'Puzzle Master 3D',
      status: 'published',
      plays: 32100,
      rating: 4.5,
      revenue: 2890,
      coverImage: 'https://picsum.photos/400/600?random=2',
      lastUpdated: new Date(Date.now() - 172800000),
    },
    {
      id: '3',
      title: 'Racing Evolution',
      status: 'pending',
      plays: 0,
      rating: 0,
      revenue: 0,
      coverImage: 'https://picsum.photos/400/600?random=3',
      lastUpdated: new Date(),
    },
  ]);

  const [quickActions] = useState([
    // { id: 'upload', title: 'Upload Game', icon: 'cloud-upload-alt', color: '#6366f1' }, // Upload functionality moved to web portal
    { id: 'analytics', title: 'Analytics', icon: 'chart-bar', color: '#00FF88' },
    { id: 'tools', title: 'Dev Tools', icon: 'code', color: '#FF0066' },
    { id: 'docs', title: 'Documentation', icon: 'book', color: '#FFD700' },
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

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      (haptics as any).success();
    }, 1500);
  };

  const handleUploadPress = () => {
    haptics.impact('medium');
    // Upload functionality moved to web portal
    // navigation.navigate('GameUploadWizard' as never as never);
  };

  const handleGamePress = (game: DeveloperGame) => {
    haptics.impact('light');
    navigation.navigate('GameManagement' as keyof RootStackParamList, { gameId: game.id } as any);
  };

  const handleQuickAction = (action: { id: string }) => {
    haptics.impact('light');
    switch (action.id) {
      // case 'upload':
      //   navigation.navigate('GameUploadWizard' as never as never);
      //   break;
      case 'analytics':
        navigation.navigate('AnalyticsDashboard' as never as never);
        break;
      case 'tools':
        navigation.navigate('DeveloperTools' as never as never);
        break;
      case 'docs':
        // Open documentation
        break;
    }
  };

  const renderMetricCard = (metric: OverviewMetric) => {
    const scaleAnim = getScaleAnim(metric.id);

    return (
      <Pressable
        key={metric.id}
        onPressIn={() => {
          Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
        style={styles.metricCard}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={[metric.color + '20', 'transparent']}
            style={styles.metricGradient}
          >
            <View style={styles.metricHeader}>
              <FontAwesome5 name={metric.icon as unknown as any} size={20} color={metric.color} />
              <View style={[styles.trendBadge, metric.trend === 'up' && styles.trendUp]}>
                <Ionicons
                  name={metric.trend === 'up' ? 'trending-up' : 'trending-down' as any}
                  size={12}
                  color={metric.trend === 'up' ? '#00FF88' : '#FF4444'}
                />
                <Text style={[styles.trendText, metric.trend === 'up' && styles.trendTextUp]}>
                  {metric.change}
                </Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricTitle}>{metric.title}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  };

  const renderGameItem = (game: DeveloperGame) => {
    const scaleAnim = getScaleAnim(game.id);

    return (
      <Pressable
        key={game.id}
        onPress={() => handleGamePress(game)}
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
        style={styles.gameItem}
      >
        <Animated.View style={[styles.gameContent, { transform: [{ scale: scaleAnim }] }]}>
          <Image
            source={{ uri: game.coverImageUrl }}
            style={[styles.gameCover, { backgroundColor: '#1a1a1a' }]}
          />
          <View style={styles.gameInfo}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  game.status === 'published' && styles.statusPublished,
                  game.status === 'pending' && styles.statusPending,
                  game.status === 'rejected' && styles.statusRejected,
                ]}
              >
                <Text style={styles.statusText}>{game.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.gameStats}>
              <View style={styles.gameStat}>
                <Ionicons name="play" size={14} color="#666" />
                <Text style={styles.gameStatText}>{game.plays.toLocaleString()}</Text>
              </View>
              <View style={styles.gameStat}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.gameStatText}>{game.rating || '-'}</Text>
              </View>
              <View style={styles.gameStat}>
                <FontAwesome5 name="dollar-sign" size={14} color="#00FF88" />
                <Text style={styles.gameStatText}>
                  {game.revenue > 0 ? `$${game.revenue}` : '-'}
                </Text>
              </View>
            </View>
            <Text style={styles.gameUpdated}>
              Updated {new Date(game.lastUpdated).toLocaleDateString()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.headerTitle}>Developer Portal</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Monetization' as never as never)}
              style={styles.earningsButton}
            >
              <FontAwesome5 name="wallet" size={20} color="#00FF88" />
              <Text style={styles.earningsText}>$8,420</Text>
            </Pressable>
          </View>

          {/* Metrics Overview */}
          <View style={styles.metricsGrid}>{metrics.map(renderMetricCard)}</View>

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quickActions.map(action => (
                <Pressable
                  key={action.id}
                  onPress={() => handleQuickAction(action)}
                  style={styles.quickAction}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                    <FontAwesome5 name={action.icon as unknown as any} size={24} color={action.color} />
                  </View>
                  <Text style={styles.quickActionText}>{action.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Upload Info */}
          <GlassContainer variant="surface" style={styles.uploadInfo}>
            <View style={styles.uploadInfoContent}>
              <View style={styles.uploadInfoIcon}>
                <Ionicons name="information-circle-outline" size={28} color="#6366f1" />
              </View>
              <View style={styles.uploadTextContainer}>
                <Text style={styles.uploadInfoTitle}>📱 Upload games at trioll.com/developer</Text>
                <Text style={styles.uploadInfoSubtitle}>Use our web portal for a better upload experience</Text>
              </View>
            </View>
          </GlassContainer>

          {/* My Games */}
          <View style={styles.gamesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Games</Text>
              <Pressable onPress={() => navigation.navigate('GameManagement' as never as never)}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            {myGames.map(renderGameItem)}
          </View>

          {/* Resources */}
          <View style={styles.resourcesSection}>
            <Text style={styles.sectionTitle}>Resources</Text>
            <View style={styles.resourcesGrid}>
              <Pressable style={styles.resourceCard}>
                <Ionicons name="document-text" size={24} color="#6366f1" />
                <Text style={styles.resourceTitle}>Integration Guide</Text>
                <Text style={styles.resourceText}>Learn how to integrate TRIOLL SDK</Text>
              </Pressable>
              <Pressable style={styles.resourceCard}>
                <Ionicons name="trending-up" size={24} color="#00FF88" />
                <Text style={styles.resourceTitle}>Best Practices</Text>
                <Text style={styles.resourceText}>Optimize your game for trials</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  earningsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  earningsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00FF88',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendUp: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF4444',
  },
  trendTextUp: {
    color: '#00FF88',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: '#999',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  quickAction: {
    alignItems: 'center',
    marginLeft: 24,
    gap: 8,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#999',
  },
  uploadInfo: {
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
  },
  uploadInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  uploadInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  uploadInfoSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  gamesSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  gameItem: {
    marginHorizontal: 24,
    marginBottom: 12,
  },
  gameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  gameCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  gameInfo: {
    flex: 1,
    marginLeft: 12,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPublished: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
  },
  statusRejected: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gameStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  gameStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gameStatText: {
    fontSize: 12,
    color: '#999',
  },
  gameUpdated: {
    fontSize: 12,
    color: '#666',
  },
  resourcesSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  resourcesGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  resourceCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    gap: 8,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resourceText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
