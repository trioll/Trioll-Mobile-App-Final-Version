import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Dimensions, Modal, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { Video } from 'expo-av'; // Commented out - expo-av is deprecated in SDK 53

interface ScreenshotGalleryProps {
  screenshots: string[];
  videos: string[];
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_WIDTH = SCREEN_WIDTH * 0.7;
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * 0.5625; // 16:9 aspect ratio

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({
  screenshots = [],
  videos = [],
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const allMedia = [
    ...videos.map(v => ({ type: 'video', uri: v })),
    ...screenshots.map(s => ({ type: 'image', uri: s })),
  ];

  const handleScroll = (event: unknown) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / (THUMBNAIL_WIDTH + 12));
    setCurrentPage(page);
  };

  const openFullscreen = (index: number) => {
    setSelectedIndex(index);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFullscreen = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedIndex(null);
    });
  };

  const renderThumbnail = (item: any, index: number) => {
    const isVideo = item.type === 'video';

    return (
      <Pressable
        key={index}
        style={[styles.thumbnail, { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }]}
        onPress={() => openFullscreen(index)}
      >
        <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
        {isVideo && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={48} color="#fff" />
          </View>
        )}
      </Pressable>
    );
  };

  const renderFullscreenItem = ({ item }: { item: any }) => {
    if (item.type === 'video') {
      return (
        <View style={[styles.fullscreenContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
          {/* Video component commented out - expo-av is deprecated
          <Video
            source={{ uri: item.uri }}
            style={[styles.fullscreenVideo, { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.5625 }]}
            useNativeControls
            shouldPlay={index === selectedIndex}
            isLooping
          /> */}
          <View
            style={[
              styles.fullscreenVideo,
              {
                width: SCREEN_WIDTH,
                height: SCREEN_WIDTH * 0.5625,
                backgroundColor: '#000',
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <Text style={{ color: '#666' }}>Video preview unavailable</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.fullscreenContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
        <Image
          source={{ uri: item.uri }}
          style={[styles.fullscreenImage, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
          resizeMode="contain"
        />
      </View>
    );
  };

  if (allMedia.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Screenshots & Videos</Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {allMedia.map((item, index) => renderThumbnail(item, index))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.pageIndicators}>
        {allMedia.map((_, index) => (
          <View
            key={index}
            style={[styles.pageIndicator, index === currentPage && styles.pageIndicatorActive]}
          />
        ))}
      </View>

      {/* Fullscreen Modal */}
      <Modal visible={selectedIndex !== null} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.fullscreenModal, { opacity: fadeAnim }]}>
          <Pressable style={styles.closeButton} onPress={closeFullscreen}>
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>

          {selectedIndex !== null && (
            <FlatList
              data={allMedia}
              renderItem={renderFullscreenItem}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              initialScrollIndex={selectedIndex}
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />
          )}

          {/* Fullscreen Page Indicators */}
          <View style={styles.fullscreenIndicators}>
            <Text style={styles.fullscreenIndicatorText}>
              {selectedIndex !== null ? `${selectedIndex + 1} / ${allMedia.length}` : ''}
            </Text>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  thumbnail: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  pageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3a3a4e',
    marginHorizontal: 3,
  },
  pageIndicatorActive: {
    backgroundColor: '#6366f1',
    width: 20,
  },
  // Fullscreen Modal
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    // Dimensions set dynamically
  },
  fullscreenVideo: {
    // Dimensions set dynamically
  },
  fullscreenIndicators: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullscreenIndicatorText: {
    color: '#fff',
    fontSize: 14,
  },
});
