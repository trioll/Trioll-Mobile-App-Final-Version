
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = '1h' | '24h' | '7d' | '30d';

interface RealtimeMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface ChartData {
  label: string;
  value: number;
}

interface GeographicData {
  country: string;
  users: number;
  revenue: number;
  percentage: number;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  uptime: number;
}

export const PlatformAnalytics: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [isLive] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const chartAnims = useRef<Animated.Value[]>([]).current;

  // Initialize chart animations
  for (let i = 0; i < 24; i++) {
    if (!chartAnims[i]) {
      chartAnims[i] = new Animated.Value(0);
    }
  }

  // Mock real-time metrics
  const [realtimeMetrics] = useState<RealtimeMetric[]>([
    {
      id: 'activeUsers',
      name: 'Active Users',
      value: 45234,
      unit: '',
      change: 12.5,
      trend: 'up',
      color: '#00FF88',
    },
    {
      id: 'gamesPlayed',
      name: 'Games Played',
      value: 8921,
      unit: '/hr',
      change: -3.2,
      trend: 'down',
      color: '#6366f1',
    },
    {
      id: 'revenue',
      name: 'Revenue',
      value: 12458,
      unit: '$',
      change: 8.7,
      trend: 'up',
      color: '#FFD700',
    },
    {
      id: 'apiCalls',
      name: 'API Calls',
      value: 1.2,
      unit: 'M/hr',
      change: 0,
      trend: 'stable',
      color: '#FF0066',
    },
  ]);

  // Mock chart data
  const [userActivityData] = useState<ChartData[]>(
    Array.prototype.slice.call({ length: 24 }, (_, i) => ({
      label: `${i}:00`,
      value: Math.floor(Math.random() * 50000) + 20000,
    }))
  );

  const [revenueData] = useState<ChartData[]>(
    Array.prototype.slice.call({ length: 30 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 15000) + 5000,
    }))
  );

  const [geographicData] = useState<GeographicData[]>([
    { country: 'United States', users: 125420, revenue: 45200, percentage: 35 },
    { country: 'United Kingdom', users: 78230, revenue: 28100, percentage: 22 },
    { country: 'Germany', users: 56340, revenue: 20200, percentage: 16 },
    { country: 'France', users: 45120, revenue: 16200, percentage: 13 },
    { country: 'Japan', users: 34560, revenue: 12400, percentage: 10 },
    { country: 'Others', users: 12330, revenue: 4400, percentage: 4 },
  ]);

  const [serviceStatuses] = useState<ServiceStatus[]>([
    { name: 'Game Streaming', status: 'operational', latency: 42, uptime: 99.99 },
    { name: 'Authentication', status: 'operational', latency: 28, uptime: 99.98 },
    { name: 'Database', status: 'operational', latency: 15, uptime: 99.97 },
    { name: 'CDN', status: 'degraded', latency: 156, uptime: 98.5 },
    { name: 'Analytics', status: 'operational', latency: 35, uptime: 99.95 },
  ]);

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      ...chartAnims.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: DURATIONS.NORMAL,
          delay: index * 30,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // Live indicator pulse
    if (isLive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLive]);

  const handleRefresh = () => {
    setRefreshing(true);
    haptics.impact('light');

    // Reset animations
    chartAnims.forEach(anim => anim.setValue(0));

    setTimeout(() => {
      setRefreshing(false);
      (haptics as any).success();

      // Re-animate charts
      Animated.stagger(
        30,
        chartAnims.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: DURATIONS.NORMAL,
            useNativeDriver: true,
          })
        )
      ).start();
    }, 1500);
  };

  const renderRealtimeMetric = (metric: RealtimeMetric) => {
    const trendIcon =
      metric.trend === 'up' ? 'trending-up' : metric.trend === 'down' ? 'trending-down' : 'remove';

    return (
      <View key={metric.id} style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricName}>{metric.name}</Text>
          {metric.trend !== 'stable' && (
            <View style={styles.metricTrend}>
              <Ionicons
                name={trendIcon as unknown as any}
                size={16}
                color={metric.trend === 'up' ? '#00FF88' : '#FF4444'}
              />
              <Text
                style={[
                  styles.metricChange,
                  { color: metric.trend === 'up' ? '#00FF88' : '#FF4444' },
                ]}
              >
                {metric.change > 0 ? '+' : ''}
                {metric.change}%
              </Text>
            </View>
          )}
        </View>
        <View style={styles.metricValueContainer}>
          <Text style={[styles.metricValue, { color: metric.color }]}>
            {metric.unit === '$' && metric.unit}
            {metric.value.toLocaleString()}
            {metric.unit !== '$' && metric.unit}
          </Text>
        </View>
        <View style={[styles.metricIndicator, { backgroundColor: metric.color }]} />
      </View>
    );
  };

  const renderLineChart = (data: ChartData[], color: string) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;
    const chartHeight = 200;
    const chartWidth = SCREEN_WIDTH - 48;
    const pointSpacing = chartWidth / (data.length - 1);

    const points = data.map((item, index) => ({
      x: index * pointSpacing,
      y: chartHeight - ((item.value - minValue) / range) * chartHeight,
    }));

    const pathData = points
      .map((point, index) => {
        if (index === 0) return `M ${point.x},${point.y}`;
        const prevPoint = points[index - 1];
        const cpx1 = prevPoint.x + pointSpacing / 3;
        const cpx2 = point.x - pointSpacing / 3;
        return `C ${cpx1},${prevPoint.y} ${cpx2},${point.y} ${point.x},${point.y}`;
      })
      .join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight + 40}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <Line
              key={ratio}
              x1={0}
              y1={chartHeight * (1 - ratio)}
              x2={chartWidth}
              y2={chartHeight * (1 - ratio)}
              stroke="#333"
              strokeWidth={1}
              strokeDasharray="5,5"
            />
          ))}

          {/* Chart line */}
          <Path
            d={pathData}
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <G key={index}>
              <Circle cx={point.x} cy={point.y} r={4} fill={color} />
              <Circle cx={point.x} cy={point.y} r={2} fill="#000000" />
            </G>
          ))}

          {/* Value labels */}
          {[0, Math.floor(data.length / 2), data.length - 1].map(index => (
            <SvgText
              key={index}
              x={points[index].x}
              y={chartHeight + 20}
              fontSize={10}
              fill="#666"
              textAnchor="middle"
            >
              {data[index].label}
            </SvgText>
          ))}
        </Svg>
      </View>
    );
  };

  const renderDonutChart = (data: GeographicData[]) => {
    const size = 180;
    const center = size / 2;
    const radius = 70;
    const innerRadius = 50;

    let startAngle = -90;
    const colors = ['#6366f1', '#00FF88', '#FF0066', '#FFAA00', '#00FFFF', '#999'];

    return (
      <View style={styles.donutContainer}>
        <Svg width={size} height={size}>
          {data.map((item, index) => {
            const angle = (item.percentage / 100) * 360;
            const endAngle = startAngle + angle;

            const startRadians = (startAngle * Math.PI) / 180;
            const endRadians = (endAngle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startRadians);
            const y1 = center + radius * Math.sin(startRadians);
            const x2 = center + radius * Math.cos(endRadians);
            const y2 = center + radius * Math.sin(endRadians);

            const x3 = center + innerRadius * Math.cos(endRadians);
            const y3 = center + innerRadius * Math.sin(endRadians);
            const x4 = center + innerRadius * Math.cos(startRadians);
            const y4 = center + innerRadius * Math.sin(startRadians);

            const largeArcFlag = angle > 180 ? 1 : 0;

            const pathData = [
              `M ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `L ${x3} ${y3}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
              `Z`,
            ].join(' ');

            startAngle = endAngle;

            return <Path key={index} d={pathData} fill={colors[index]} opacity={0.9} />;
          })}
        </Svg>

        <View style={styles.donutLegend}>
          {data.slice(0, 4).map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors[index] }]} />
              <Text style={styles.legendText}>{item.country}</Text>
              <Text style={styles.legendValue}>{item.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderServiceStatus = (service: ServiceStatus) => {
    const statusColors = {
      operational: '#00FF88',
      degraded: '#FFAA00',
      down: '#FF4444',
    };

    return (
      <View key={service.name} style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColors[service.status] }]} />
        </View>
        <View style={styles.serviceMetrics}>
          <View style={styles.serviceMetric}>
            <Text style={styles.serviceMetricLabel}>Latency</Text>
            <Text
              style={[
                styles.serviceMetricValue,
                { color: service.latency > 100 ? '#FFAA00' : '#00FF88' },
              ]}
            >
              {service.latency}ms
            </Text>
          </View>
          <View style={styles.serviceMetric}>
            <Text style={styles.serviceMetricLabel}>Uptime</Text>
            <Text
              style={[
                styles.serviceMetricValue,
                { color: service.uptime > 99 ? '#00FF88' : '#FFAA00' },
              ]}
            >
              {service.uptime}%
            </Text>
          </View>
        </View>
      </View>
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

          <Text style={styles.headerTitle}>Platform Analytics</Text>

          <View style={styles.liveIndicator}>
            {isLive && (
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            )}
            <Text style={styles.liveText}>{isLive ? 'LIVE' : 'PAUSED'}</Text>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['1h', '24h', '7d', '30d'] as TimeRange[]).map(range => (
            <Pressable
              key={range}
              onPress={() => {
                haptics.selection();
                setTimeRange(range);
              }}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
            >
              <Text
                style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}
              >
                {range}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
          }
        >
          {/* Real-time Metrics */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Real-time Metrics</Text>
            <View style={styles.metricsGrid}>
              {realtimeMetrics.map(metric => renderRealtimeMetric(metric))}
            </View>
          </View>

          {/* User Activity Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>User Activity</Text>
            <Text style={styles.chartSubtitle}>Active users over time</Text>
            {renderLineChart(userActivityData.slice(0, 24), '#00FF88')}
          </View>

          {/* Revenue Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Revenue Trends</Text>
            <Text style={styles.chartSubtitle}>Daily revenue (last 30 days)</Text>
            {renderLineChart(revenueData.slice(0, 30), '#FFD700')}
          </View>

          {/* Geographic Distribution */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Geographic Distribution</Text>
            <Text style={styles.chartSubtitle}>Users by country</Text>
            {renderDonutChart(geographicData)}
          </View>

          {/* Service Status */}
          <View style={styles.serviceSection}>
            <Text style={styles.sectionTitle}>Service Status</Text>
            <View style={styles.serviceGrid}>
              {serviceStatuses.map(service => renderServiceStatus(service))}
            </View>
          </View>

          {/* Error Rate Chart */}
          <View style={styles.errorRateSection}>
            <Text style={styles.sectionTitle}>Error Rates</Text>
            <View style={styles.errorRateGrid}>
              <View style={styles.errorRateCard}>
                <Text style={styles.errorRateLabel}>4xx Errors</Text>
                <Text style={styles.errorRateValue}>0.12%</Text>
                <View style={styles.errorRateBar}>
                  <View
                    style={[
                      styles.errorRateFill,
                      { width: '12%', backgroundColor: '#FFAA00' },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.errorRateCard}>
                <Text style={styles.errorRateLabel}>5xx Errors</Text>
                <Text style={styles.errorRateValue}>0.02%</Text>
                <View style={styles.errorRateBar}>
                  <View
                    style={[
                      styles.errorRateFill,
                      { width: '2%', backgroundColor: '#00FF88' },
                    ]}
                  />
                </View>
              </View>
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FF88',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  timeRangeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  metricsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
    overflow: 'hidden',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    color: '#999',
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValueContainer: {
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  metricIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  chartSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  donutContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  donutLegend: {
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  serviceSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  serviceGrid: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  serviceMetrics: {
    flexDirection: 'row',
    gap: 24,
  },
  serviceMetric: {
    flex: 1,
  },
  serviceMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  serviceMetricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorRateSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  errorRateGrid: {
    gap: 12,
  },
  errorRateCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  errorRateLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  errorRateValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  errorRateBar: {
    height: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  errorRateFill: {
    height: '100%',
    borderRadius: 4,
  },
});
