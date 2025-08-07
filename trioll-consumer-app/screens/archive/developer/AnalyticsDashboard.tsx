
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = '7d' | '30d' | '90d' | 'all';
type ChartType = 'plays' | 'users' | 'retention' | 'ratings';

interface ChartData {
  label: string;
  value: number;
}

interface GeographicData {
  country: string;
  code: string;
  plays: number;
  percentage: number;
}

interface DeviceData {
  device: string;
  percentage: number;
  color: string;
}

export const AnalyticsDashboard: React.FC = () => {
  const navigation = useNavigation();
  // const route = useRoute(); // For future use when passing game ID
  const haptics = useHaptics();
  // const gameId = (route.params as { gameId?: string })?.gameId;

  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeChart, setActiveChart] = useState<ChartType>('plays');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;

  // Mock analytics data
  const [playsData] = useState<ChartData[]>([
    { label: 'Mon', value: 1200 },
    { label: 'Tue', value: 1450 },
    { label: 'Wed', value: 1680 },
    { label: 'Thu', value: 1920 },
    { label: 'Fri', value: 2200 },
    { label: 'Sat', value: 2850 },
    { label: 'Sun', value: 2400 },
  ]);

  const [retentionData] = useState({
    day1: 85,
    day7: 42,
    day30: 28,
  });

  const [geographicData] = useState<GeographicData[]>([
    { country: 'United States', code: 'US', plays: 18500, percentage: 35.2 },
    { country: 'United Kingdom', code: 'GB', plays: 8200, percentage: 15.6 },
    { country: 'Germany', code: 'DE', plays: 6500, percentage: 12.4 },
    { country: 'France', code: 'FR', plays: 5100, percentage: 9.7 },
    { country: 'Japan', code: 'JP', plays: 4200, percentage: 8.0 },
    { country: 'Others', code: 'OT', plays: 10000, percentage: 19.1 },
  ]);

  const [deviceData] = useState<DeviceData[]>([
    { device: 'iPhone', percentage: 45, color: '#6366f1' },
    { device: 'Android', percentage: 38, color: '#00FF88' },
    { device: 'iPad', percentage: 12, color: '#FF0066' },
    { device: 'Web', percentage: 5, color: '#FFD700' },
  ]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.timing(chartAnim, {
        toValue: 1,
        duration: DURATIONS.SLOW,
        delay: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      (haptics as any).success();
    }, 1500);
  };

  const renderLineChart = (data: ChartData[]) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const chartHeight = 200;
    const chartWidth = SCREEN_WIDTH - 48;
    const padding = 20;

    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * (chartWidth - padding * 2) + padding;
      const y = chartHeight - (item.value / maxValue) * (chartHeight - padding * 2) - padding;
      return { x, y };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
      .join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <Line
              key={ratio}
              x1={padding}
              y1={chartHeight - padding - ratio * (chartHeight - padding * 2)}
              x2={chartWidth - padding}
              y2={chartHeight - padding - ratio * (chartHeight - padding * 2)}
              stroke="#1a1a1a"
              strokeWidth="1"
            />
          ))}

          {/* Line chart */}
          <Path
            d={pathData}
            stroke="#6366f1"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient fill */}
          <Path
            d={`${pathData} L ${points[points.length - 1].x},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`}
            fill="url(#gradient)"
            opacity="0.2"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#6366f1"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}

          {/* Labels */}
          {data.map((item, index) => (
            <SvgText
              key={index}
              x={(index / (data.length - 1)) * (chartWidth - padding * 2) + padding}
              y={chartHeight - 5}
              fill="#666"
              fontSize="12"
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          ))}

          {/* Gradient definition */}
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#6366f1" />
              <Stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </LinearGradient>
          </Defs>
        </Svg>
      </View>
    );
  };

  const renderRetentionChart = () => {
    const data = [
      { day: 'Day 1', value: retentionData.day1 },
      { day: 'Day 7', value: retentionData.day7 },
      { day: 'Day 30', value: retentionData.day30 },
    ];

    return (
      <View style={styles.retentionContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.retentionItem}>
            <Text style={styles.retentionDay}>{item.day}</Text>
            <View style={styles.retentionBarContainer}>
              <Animated.View
                style={[
                  styles.retentionBar,
                  {
                    width: chartAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${item.value}%`],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.retentionValue}>{item.value}%</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDonutChart = () => {
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    const innerRadius = 60;
    let accumulatedAngle = 0;

    return (
      <View style={styles.donutContainer}>
        <Svg width={200} height={200}>
          {deviceData.map((item, index) => {
            const angle = (item.percentage / 100) * 360;
            const startAngle = accumulatedAngle;
            const endAngle = startAngle + angle;
            accumulatedAngle = endAngle;

            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;

            const pathData = [
              `M ${centerX + innerRadius * Math.cos((startAngle * Math.PI) / 180)} ${centerY + innerRadius * Math.sin((startAngle * Math.PI) / 180)}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `L ${centerX + innerRadius * Math.cos((endAngle * Math.PI) / 180)} ${centerY + innerRadius * Math.sin((endAngle * Math.PI) / 180)}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${centerX + innerRadius * Math.cos((startAngle * Math.PI) / 180)} ${centerY + innerRadius * Math.sin((startAngle * Math.PI) / 180)}`,
            ].join(' ');

            return <Path key={index} d={pathData} fill={item.color} opacity={0.9} />;
          })}
        </Svg>
        <View style={styles.donutLegend}>
          {deviceData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.device}</Text>
              <Text style={styles.legendValue}>{item.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMetricCard = (
    title: string,
    value: string,
    change: string,
    trend: 'up' | 'down',
    icon: string
  ) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <FontAwesome5 name={icon as unknown as any} size={20} color="#6366f1" />
        <View style={[styles.trendBadge, trend === 'up' && styles.trendUp]}>
          <Ionicons
            name={trend === 'up' ? 'trending-up' : 'trending-down' as any}
            size={12}
            color={trend === 'up' ? '#00FF88' : '#FF4444'}
          />
          <Text style={[styles.trendText, trend === 'up' && styles.trendTextUp]}>{change}</Text>
        </View>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );

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
            <Pressable
              onPress={() => {
                haptics.impact('light');
                navigation.goBack();
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                // Handle export
              }}
              style={styles.exportButton}
            >
              <Ionicons name="download-outline" size={24} color="#6366f1" />
            </Pressable>
          </View>

          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
              <Pressable
                key={range}
                onPress={() => {
                  haptics.selection();
                  setTimeRange(range);
                }}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
              >
                <Text
                  style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}
                >
                  {range === 'all' ? 'All Time' : `Last ${range}`}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            {renderMetricCard('Total Plays', '125.4K', '+12.5%', 'up', 'play-circle')}
            {renderMetricCard('Unique Users', '45.2K', '+8.3%', 'up', 'users')}
            {renderMetricCard('Avg Session', '8.5m', '+2.1%', 'up', 'clock')}
            {renderMetricCard('Completion Rate', '68%', '-1.2%', 'down', 'flag-checkered')}
          </View>

          {/* Play Metrics Chart */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Play Metrics</Text>
              <View style={styles.chartTabs}>
                {(['plays', 'users'] as ChartType[]).map(type => (
                  <Pressable
                    key={type}
                    onPress={() => {
                      haptics.selection();
                      setActiveChart(type);
                    }}
                    style={[styles.chartTab, activeChart === type && styles.chartTabActive]}
                  >
                    <Text
                      style={[
                        styles.chartTabText,
                        activeChart === type && styles.chartTabTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Animated.View style={{ opacity: chartAnim }}>
              {renderLineChart(playsData)}
            </Animated.View>
          </View>

          {/* User Retention */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>User Retention</Text>
            {renderRetentionChart()}
          </View>

          {/* Geographic Distribution */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Geographic Distribution</Text>
            <View style={styles.geoList}>
              {geographicData.map((item, index) => (
                <View key={index} style={styles.geoItem}>
                  <View style={styles.geoLeft}>
                    <Text style={styles.geoFlag}>{item.code}</Text>
                    <Text style={styles.geoCountry}>{item.country}</Text>
                  </View>
                  <View style={styles.geoRight}>
                    <Text style={styles.geoPlays}>{item.plays.toLocaleString()}</Text>
                    <View style={styles.geoBar}>
                      <Animated.View
                        style={[
                          styles.geoBarFill,
                          {
                            width: chartAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', `${item.percentage}%`],
                            }),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.geoPercentage}>{item.percentage}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Device Breakdown */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Device Breakdown</Text>
            {renderDonutChart()}
          </View>

          {/* Additional Insights */}
          <View style={styles.insightsSection}>
            <Text style={styles.chartTitle}>Key Insights</Text>
            <View style={styles.insightCard}>
              <View style={styles.insightIcon}>
                <Ionicons name="trending-up" size={24} color="#00FF88" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Weekend Spike</Text>
                <Text style={styles.insightText}>
                  Your game sees 45% more plays on weekends. Consider weekend events.
                </Text>
              </View>
            </View>
            <View style={styles.insightCard}>
              <View style={styles.insightIcon}>
                <Ionicons name="globe" size={24} color="#6366f1" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Global Reach</Text>
                <Text style={styles.insightText}>
                  Players from 42 countries. Consider localization for top markets.
                </Text>
              </View>
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
  exportButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  timeRangeButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#999',
  },
  timeRangeTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 32,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
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
  chartSection: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chartTabs: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 4,
  },
  chartTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chartTabActive: {
    backgroundColor: '#6366f1',
  },
  chartTabText: {
    fontSize: 14,
    color: '#999',
  },
  chartTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  retentionContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  retentionItem: {
    marginBottom: 20,
  },
  retentionDay: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  retentionBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 4,
  },
  retentionBar: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  retentionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  geoList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  geoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  geoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  geoFlag: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  geoCountry: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  geoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  geoPlays: {
    fontSize: 14,
    color: '#999',
    width: 60,
    textAlign: 'right',
  },
  geoBar: {
    width: 60,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  geoBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  geoPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    width: 45,
    textAlign: 'right',
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  donutLegend: {
    flex: 1,
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  insightsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 16,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
});
