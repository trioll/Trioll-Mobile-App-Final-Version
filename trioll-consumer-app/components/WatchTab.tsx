import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { DS } from '../src/styles/TriollDesignSystem';
import { useHaptics } from '../hooks';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoItem {
  id: string;
  gameTitle: string;
  username: string;
  userAvatar: string;
  thumbnailUrl: string;
  videoUrl: string;
  likes: number;
  views: number;
  duration: string;
  hasUserLiked: boolean;
}

export const WatchTab: React.FC = () => {
  const haptics = useHaptics();
  const [videos, setVideos] = useState<VideoItem[]>([]);

  const handleUploadVideo = async () => {
    haptics.trigger('medium');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your media library to upload videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      Alert.alert(
        'Video Selected',
        'Video upload feature is in development. Your video would be processed and uploaded here.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleLikeVideo = (videoId: string) => {
    haptics.trigger('light');
    setVideos(prevVideos =>
      prevVideos.map(video =>
        video.id === videoId
          ? {
              ...video,
              hasUserLiked: !video.hasUserLiked,
              likes: video.hasUserLiked ? video.likes - 1 : video.likes + 1,
            }
          : video
      )
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <View style={styles.container}>
      {/* Upload Button */}
      <Pressable onPress={handleUploadVideo} style={styles.uploadButton}>
        <LinearGradient
          colors={[DS.colors.accent, '#FF0066']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.uploadGradient}
        >
          <Ionicons name="videocam" size={20} color={DS.colors.background} style={{ marginRight: DS.spacing.xs }} />
          <Text style={styles.uploadText}>Upload Video</Text>
        </LinearGradient>
      </Pressable>

      {/* In Development Banner */}
      <View style={styles.developmentBanner}>
        <BlurView intensity={20} tint="dark" style={styles.bannerBlur}>
          <Ionicons name="construct" size={24} color={DS.colors.warning} style={{ marginBottom: DS.spacing.xs }} />
          <Text style={styles.bannerText}>Watch Tab In Development</Text>
          <Text style={styles.bannerSubtext}>
            Soon you'll be able to watch and share gameplay videos with face overlay!
          </Text>
        </BlurView>
      </View>

      {/* Video Grid */}
      <ScrollView
        contentContainerStyle={styles.videoGrid}
        showsVerticalScrollIndicator={false}
      >
        {videos.map((video) => (
          <Pressable
            key={video.id}
            style={styles.videoCard}
            onPress={() => {
              haptics.trigger('light');
              Alert.alert('Coming Soon', 'Video playback will be available soon!');
            }}
          >
            <Image source={{ uri: video.thumbnailUrl }} style={styles.videoThumbnail} />
            
            {/* Video Overlay Info */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.videoOverlay}
            >
              {/* Duration Badge */}
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{video.duration}</Text>
              </View>

              {/* Video Info */}
              <View style={styles.videoInfo}>
                <Text style={[styles.gameTitle, { marginBottom: DS.spacing.xs }]} numberOfLines={1}>
                  {video.gameTitle}
                </Text>
                
                <View style={styles.userRow}>
                  <Image source={{ uri: video.userAvatar }} style={[styles.userAvatar, { marginRight: DS.spacing.xs }]} />
                  <Text style={styles.username}>{video.username}</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.stat, { marginRight: DS.spacing.md }]}>
                    <Ionicons name="eye" size={14} color={DS.colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.statText}>{formatNumber(video.views)}</Text>
                  </View>
                  
                  <Pressable
                    style={styles.stat}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleLikeVideo(video.id);
                    }}
                  >
                    <Ionicons
                      name={video.hasUserLiked ? 'heart' : 'heart-outline'}
                      size={14}
                      color={video.hasUserLiked ? DS.colors.accent : DS.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[
                      styles.statText,
                      video.hasUserLiked && { color: DS.colors.accent }
                    ]}>
                      {formatNumber(video.likes)}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </LinearGradient>

            {/* Play Icon */}
            <View style={styles.playIconContainer}>
              <View style={styles.playIcon}>
                <Ionicons name="play" size={24} color={DS.colors.textPrimary} />
              </View>
            </View>
          </Pressable>
        ))}

        {/* Coming Soon Cards */}
        {[1, 2, 3, 4].map((i) => (
          <View key={`placeholder-${i}`} style={styles.placeholderCard}>
            <View style={styles.placeholderContent}>
              <Ionicons name="film-outline" size={40} color={DS.colors.textMuted} style={{ marginBottom: DS.spacing.sm }} />
              <Text style={styles.placeholderText}>More videos coming soon</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  uploadButton: {
    position: 'absolute',
    top: 16,
    right: DS.spacing.lg,
    zIndex: 100,
  },
  uploadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
    borderRadius: DS.effects.borderRadiusPill,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.background,
  },
  developmentBanner: {
    marginTop: 60,
    marginHorizontal: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
  },
  bannerBlur: {
    padding: DS.spacing.lg,
    borderRadius: DS.effects.borderRadiusLarge,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 109, 107, 0.3)',
  },
  bannerText: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.colors.warning,
    marginTop: DS.spacing.sm,
    marginBottom: DS.spacing.xs,
  },
  bannerSubtext: {
    fontSize: 14,
    color: DS.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoGrid: {
    paddingHorizontal: DS.spacing.lg,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  videoCard: {
    width: (SCREEN_WIDTH - DS.spacing.lg * 3) / 2,
    height: 240,
    marginBottom: DS.spacing.md,
    borderRadius: DS.effects.borderRadiusLarge,
    overflow: 'hidden',
    backgroundColor: DS.colors.surface,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: DS.spacing.sm,
    paddingTop: 40,
  },
  durationBadge: {
    position: 'absolute',
    top: DS.spacing.sm,
    right: DS.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: DS.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 12,
    color: DS.colors.textPrimary,
    fontWeight: '600',
  },
  videoInfo: {
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.colors.textPrimary,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  username: {
    fontSize: 12,
    color: DS.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: DS.colors.textSecondary,
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  playIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCard: {
    width: (SCREEN_WIDTH - DS.spacing.lg * 3) / 2,
    height: 240,
    marginBottom: DS.spacing.md,
    borderRadius: DS.effects.borderRadiusLarge,
    backgroundColor: DS.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  placeholderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: DS.colors.textMuted,
    textAlign: 'center',
  },
});