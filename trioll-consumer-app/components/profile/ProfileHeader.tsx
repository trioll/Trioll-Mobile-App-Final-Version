
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer, GlassButton } from '../../src/components/core';
import { DS } from '../../src/styles/TriollDesignSystem';

import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
// import * as Sharing from 'expo-sharing'; // Not installed yet

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 100;

interface ProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    handle: string;
    bio: string;
    avatar: string;
    coverImage: string;
    level: number;
    isOnline: boolean;
    memberSince: Date;
    location?: string;
  };
  isOwnProfile: boolean;
  onEditPress?: () => void;
  onAddFriendPress?: () => void;
  onChallengePress?: () => void;
  onMessagePress?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isOwnProfile,
  onEditPress,
  onAddFriendPress,
  onChallengePress,
  onMessagePress,
}) => {
  const haptics = useHaptics();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        ...SPRING_CONFIGS.SOFT,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleButtonPress = (callback?: () => void) => {
    haptics.impact('light');

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        ...SPRING_CONFIGS.QUICK,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    if (callback) callback();
  };


  const formatMemberSince = (date: Date) => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <View style={styles.container}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image source={{ uri: profile.coverImage }} style={styles.coverImage} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.coverGradient} />
      </View>

      {/* Avatar & Level */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />

          {/* Level Badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{profile.level}</Text>
          </View>

          {/* Online Status */}
          {profile.isOnline && <View style={styles.onlineIndicator} />}
        </View>
      </View>

      {/* User Info */}
      <Animated.View
        style={[
          styles.userInfo,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.handle}>@{profile.handle}</Text>

        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {/* Member Info */}
        <View style={styles.memberInfo}>
          <View style={styles.memberItem}>
            <Ionicons name="calendar-outline" size={14} color={DS.colors.textSecondary} />
            <Text style={styles.memberText}>Since {formatMemberSince(profile.memberSince)}</Text>
          </View>

          {profile.location && (
            <View style={styles.memberItem}>
              <Ionicons name="location-outline" size={14} color={DS.colors.textSecondary} />
              <Text style={styles.memberText}>{profile.location}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOwnProfile ? (
            <>
              <Pressable
                style={styles.primaryButton}
                onPress={() => handleButtonPress(onEditPress)}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <LinearGradient colors={['#FF2D55', '#FF0066']} style={styles.gradientButton}>
                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>EDIT PROFILE</Text>
                  </LinearGradient>
                </Animated.View>
              </Pressable>

            </>
          ) : (
            <>
              <Pressable
                style={styles.primaryButton}
                onPress={() => handleButtonPress(onAddFriendPress)}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <LinearGradient colors={['#00FF88', '#00CC66']} style={styles.gradientButton}>
                    <Ionicons name="person-add-outline" size={20} color="#000000" />
                    <Text style={[styles.buttonText, { color: '#000000' }]}>ADD FRIEND</Text>
                  </LinearGradient>
                </Animated.View>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => handleButtonPress(onChallengePress)}
              >
                <Ionicons name="game-controller-outline" size={20} color="#FF0066" />
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => handleButtonPress(onMessagePress)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#00FFFF" />
              </Pressable>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
  },
  coverContainer: {
    height: COVER_HEIGHT,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -AVATAR_SIZE / 2,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: '#000000',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#FF2D55',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00FF88',
    borderWidth: 3,
    borderColor: '#000000',
  },
  userInfo: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  handle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginBottom: 12,
  },
  bio: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  memberText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginRight: 12,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  secondaryButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
