import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS } from '../../constants/animations';

interface GamingDNAProps {
  genrePreferences: {
    genre: string;
    percentage: number;
    color: string;
  }[];
  playPatterns: {
    title: string;
    icon: string;
    description: string;
    color: string;
  }[];
  insights: string[];
  peakPlayTimes: {
    hour: number;
    activity: number; // 0-100
  }[];
}

export const GamingDNA: React.FC<GamingDNAProps> = ({
  genrePreferences,
  playPatterns,
  insights,
  peakPlayTimes,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: DURATIONS.RELAXED,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate pie chart data
  const total = genrePreferences.reduce((sum, item) => sum + item.percentage, 0);
  let cumulativePercentage = 0;

  const pieData = genrePreferences.map(item => {
    const startAngle = (cumulativePercentage / total) * 360;
    cumulativePercentage += item.percentage;
    const endAngle = (cumulativePercentage / total) * 360;

    return {
      ...item,
      startAngle,
      endAngle,
    };
  });

  const createPiePath = (startAngle: number, endAngle: number, radius: number) => {
    const centerX = 100;
    const centerY = 100;
    const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
    const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
    const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
    const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const getMaxActivityHour = () => {
    const max = Math.max(...peakPlayTimes.map(t => t.activity));
    const peakHour = peakPlayTimes.find(t => t.activity === max)?.hour || 0;
    return peakHour;
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM';
    if (hour === 12) return '12PM';
    return hour > 12 ? `${hour - 12}PM` : `${hour}AM`;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>GAMING DNA</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {/* Genre Preferences Pie Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Genre Preferences</Text>

          <View style={styles.pieChartContainer}>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Svg width={200} height={200} viewBox="0 0 200 200">
                {pieData.map((slice, index) => (
                  <Path
                    key={index}
                    d={createPiePath(slice.startAngle - 90, slice.endAngle - 90, 80)}
                    fill={slice.color}
                    opacity={0.9}
                  />
                ))}
                <Circle cx={100} cy={100} r={50} fill="#000000" />
              </Svg>
            </Animated.View>

            {/* Center text */}
            <View style={styles.pieCenter}>
              <Text style={styles.pieCenterText}>TOP</Text>
              <Text style={styles.pieCenterGenre}>{genrePreferences[0]?.genre}</Text>
              <Text style={styles.pieCenterPercent}>{genrePreferences[0]?.percentage}%</Text>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {genrePreferences.slice(0, 4).map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.genre}</Text>
                <Text style={styles.legendPercent}>{item.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Peak Play Times */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Peak Activity</Text>

          <View style={styles.activityChart}>
            {peakPlayTimes.map((time, index) => (
              <View key={index} style={styles.activityBar}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${time.activity}%`,
                        backgroundColor:
                          time.hour === getMaxActivityHour() ? '#FF2D55' : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{formatHour(time.hour)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.peakTimeText}>Most active at {formatHour(getMaxActivityHour())}</Text>
        </View>
      </ScrollView>

      {/* Play Patterns */}
      <View style={styles.patternsContainer}>
        <Text style={styles.subsectionTitle}>Play Patterns</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {playPatterns.map((pattern, index) => (
            <LinearGradient
              key={index}
              colors={[pattern.color + '20', pattern.color + '10']}
              style={styles.patternCard}
            >
              <View style={[styles.patternIcon, { backgroundColor: pattern.color + '30' }]}>
                <Ionicons
                  name={pattern.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={pattern.color}
                />
              </View>
              <Text style={styles.patternTitle}>{pattern.title}</Text>
              <Text style={styles.patternDescription}>{pattern.description}</Text>
            </LinearGradient>
          ))}
        </ScrollView>
      </View>

      {/* Insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.subsectionTitle}>Personalized Insights</Text>

        {insights.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <Ionicons name="bulb" size={16} color="#FFD700" />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    padding: 20,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 280,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pieCenter: {
    position: 'absolute',
    top: 75,
    alignItems: 'center',
  },
  pieCenterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pieCenterGenre: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 2,
  },
  pieCenterPercent: {
    color: '#FF2D55',
    fontSize: 20,
    fontWeight: '700',
  },
  legend: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    flex: 1,
  },
  legendPercent: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  activityChart: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  activityBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barContainer: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 4,
  },
  peakTimeText: {
    color: '#FF2D55',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  patternsContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  subsectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  patternCard: {
    width: 150,
    padding: 16,
    borderRadius: 3,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  patternIcon: {
    width: 40,
    height: 40,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  patternTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  patternDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 16,
  },
  insightsContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 2,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  insightText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
});
