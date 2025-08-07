import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

interface LoadingSkeletonProps {
  viewMode: 'grid' | 'list' | 'compact';
}

const createStyles = (SCREEN_WIDTH: number, GRID_ITEM_WIDTH: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 24,
      justifyContent: 'space-between',
    },
    listContainer: {
      paddingHorizontal: 24,
    },
    compactContainer: {
      paddingHorizontal: 16,
    },
    gridSkeleton: {
      width: GRID_ITEM_WIDTH,
      marginBottom: 16,
      borderRadius: 0,
      overflow: 'hidden',
      backgroundColor: '#000000',
      borderWidth: 1,
      borderColor: '#333333',
    },
    listSkeleton: {
      flexDirection: 'row',
      backgroundColor: '#000000',
      borderRadius: 0,
      padding: 16,
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#333333',
    },
    compactSkeleton: {
      flexDirection: 'row',
      backgroundColor: '#000000',
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 4,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    gridImageSkeleton: {
      width: '100%',
      height: GRID_ITEM_WIDTH * 1.2,
      backgroundColor: '#111111',
      overflow: 'hidden',
    },
    listImageSkeleton: {
      width: 80,
      height: 80,
      backgroundColor: '#111111',
      borderRadius: 0,
      marginRight: 12,
      overflow: 'hidden',
    },
    compactImageSkeleton: {
      width: 40,
      height: 40,
      backgroundColor: '#111111',
      borderRadius: 0,
      marginRight: 12,
      overflow: 'hidden',
    },
    shimmer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: SCREEN_WIDTH,
      opacity: 0.3,
    },
    gridTextContainer: {
      padding: 12,
    },
    listTextContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    compactTextContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    gridTitleSkeleton: {
      width: '100%',
      height: 16,
      backgroundColor: '#222222',
      borderRadius: 4,
      marginBottom: 8,
    },
    gridMetaSkeleton: {
      width: '60%',
      height: 12,
      backgroundColor: '#222222',
      borderRadius: 4,
    },
    listTitleSkeleton: {
      width: '80%',
      height: 16,
      backgroundColor: '#222222',
      borderRadius: 4,
      marginBottom: 8,
    },
    listSubtitleSkeleton: {
      width: '60%',
      height: 14,
      backgroundColor: '#222222',
      borderRadius: 4,
      marginBottom: 8,
    },
    listMetaSkeleton: {
      width: '40%',
      height: 12,
      backgroundColor: '#222222',
      borderRadius: 4,
    },
    compactTitleSkeleton: {
      width: '70%',
      height: 14,
      backgroundColor: '#222222',
      borderRadius: 4,
      marginBottom: 4,
    },
    compactMetaSkeleton: {
      width: '50%',
      height: 10,
      backgroundColor: '#222222',
      borderRadius: 4,
    },
  });

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ viewMode }) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;
  const styles = React.useMemo(
    () => createStyles(SCREEN_WIDTH, GRID_ITEM_WIDTH),
    [SCREEN_WIDTH, GRID_ITEM_WIDTH]
  );
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const SkeletonItem = () => (
    <View
      style={
        viewMode === 'grid'
          ? styles.gridSkeleton
          : viewMode === 'list'
            ? styles.listSkeleton
            : styles.compactSkeleton
      }
    >
      <View
        style={
          viewMode === 'grid'
            ? styles.gridImageSkeleton
            : viewMode === 'list'
              ? styles.listImageSkeleton
              : styles.compactImageSkeleton
        }
      >
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX: shimmerTranslate }],
              backgroundColor: 'rgba(255,255,255,0.05)',
            },
          ]}
        />
      </View>

      {viewMode === 'grid' ? (
        <View style={styles.gridTextContainer}>
          <View style={styles.gridTitleSkeleton} />
          <View style={styles.gridMetaSkeleton} />
        </View>
      ) : viewMode === 'list' ? (
        <View style={styles.listTextContainer}>
          <View style={styles.listTitleSkeleton} />
          <View style={styles.listSubtitleSkeleton} />
          <View style={styles.listMetaSkeleton} />
        </View>
      ) : (
        <View style={styles.compactTextContainer}>
          <View style={styles.compactTitleSkeleton} />
          <View style={styles.compactMetaSkeleton} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {viewMode === 'grid' ? (
        <View style={styles.gridContainer}>
          {[...Array(6)].map((_, index) => (
            <SkeletonItem key={index} />
          ))}
        </View>
      ) : viewMode === 'list' ? (
        <View style={styles.listContainer}>
          {[...Array(8)].map((_, index) => (
            <SkeletonItem key={index} />
          ))}
        </View>
      ) : (
        <View style={styles.compactContainer}>
          {[...Array(12)].map((_, index) => (
            <SkeletonItem key={index} />
          ))}
        </View>
      )}
    </View>
  );
};

// Styles moved to createStyles function above
