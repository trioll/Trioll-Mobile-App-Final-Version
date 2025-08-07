import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FeedSkeletonProps {
  type: 'initial' | 'refresh' | 'loadMore';
}

export const FeedSkeleton: React.FC<FeedSkeletonProps> = ({ type }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const SkeletonCard = () => (
    <View style={[styles.skeletonCard, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 }]}>
      <View style={styles.skeletonContent}>
        {/* Play button skeleton */}
        <View style={styles.playButtonSkeleton} />

        {/* Side icons skeleton */}
        <View style={styles.sideIcons}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.iconSkeleton} />
          ))}
        </View>

        {/* Bottom info skeleton */}
        <View style={styles.bottomInfo}>
          <View style={styles.titleSkeleton} />
          <View style={styles.subtitleSkeleton} />
        </View>
      </View>

      {/* Shimmer effect */}
      <Animated.View
        style={[
          styles.shimmer,
          {
            width: SCREEN_WIDTH,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );

  const RecommendationRowSkeleton = () => (
    <View style={styles.recommendationRow}>
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleSkeleton} />
        <View style={styles.seeAllSkeleton} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.rowContent}
      >
        {[1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              styles.miniCardSkeleton,
              { width: SCREEN_WIDTH * 0.4, height: SCREEN_WIDTH * 0.4 * 1.4 },
            ]}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (type === 'refresh') {
    return (
      <View style={styles.refreshContainer}>
        <Animated.View
          style={[
            styles.refreshDot,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 1, 0.3],
              }),
            },
          ]}
        />
      </View>
    );
  }

  if (type === 'loadMore') {
    return (
      <View style={styles.loadMoreContainer}>
        {[1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.miniCardSkeleton,
              { width: SCREEN_WIDTH * 0.4, height: SCREEN_WIDTH * 0.4 * 1.4 },
            ]}
          />
        ))}
      </View>
    );
  }

  // Initial load skeleton
  return (
    <View style={styles.container}>
      {/* Filter bar skeleton */}
      <View style={styles.filterBar}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.filterSkeleton} />
        ))}
      </View>

      {/* Main card skeleton */}
      <SkeletonCard />

      {/* Recommendation rows */}
      <RecommendationRowSkeleton />
      <RecommendationRowSkeleton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  skeletonCard: {
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
  },
  skeletonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonSkeleton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sideIcons: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -100,
  },
  iconSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 80,
  },
  titleSkeleton: {
    width: '70%',
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitleSkeleton: {
    width: '50%',
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
  },
  filterBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterSkeleton: {
    width: 80,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginRight: 16,
  },
  recommendationRow: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowTitleSkeleton: {
    width: 150,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  seeAllSkeleton: {
    width: 60,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  rowContent: {
    flexDirection: 'row',
  },
  miniCardSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginRight: 16,
  },
  refreshContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  refreshDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF2D55',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-around',
  },
});
