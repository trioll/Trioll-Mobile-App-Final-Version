
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import { useApp } from '../../context/AppContext';
import { getLogger } from '../../src/utils/logger';

const logger = getLogger('MergeGuestDataScreen');

interface TransferItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  delay: number;
}

type RootStackParamList = {
  MergeGuestData: { token: string; userId: string; email?: string };
  Welcome: { token: string; userId: string };
};

type MergeGuestDataScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MergeGuestData'>;
type MergeGuestDataScreenRouteProp = RouteProp<RootStackParamList, 'MergeGuestData'>;

export const MergeGuestDataScreen = () => {
  const navigation = useNavigation<MergeGuestDataScreenNavigationProp>();
  const route = useRoute<MergeGuestDataScreenRouteProp>();
  const { token, userId } = route.params;
  const { guestProfile, guestTrialHistory, prepareGuestDataForMerge, setCurrentUser } = useApp();

  const [isMerging, setIsMerging] = useState(false);
  const [mergeComplete, setMergeComplete] = useState(false);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  const transferItems: TransferItem[] = [
    {
      icon: 'game-controller-outline',
      label: 'Trials Played',
      value: guestTrialHistory.length,
      delay: 200,
    },
    {
      icon: 'bookmark-outline',
      label: 'Bookmarked Games',
      value: guestProfile?.stats.gamesBookmarked.length || 0,
      delay: 300,
    },
    {
      icon: 'settings-outline',
      label: 'Your Preferences',
      value: 'Saved',
      delay: 400,
    },
    {
      icon: 'star-outline',
      label: 'Game Ratings',
      value: 3, // Mock value
      delay: 500,
    },
  ];

  const handleMerge = async () => {
    if (isMerging) return;

    setIsMerging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Prepare merge data
      const mergeData = await prepareGuestDataForMerge();

      // Mock API call to merge data
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success animation
      setMergeComplete(true);
      checkScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withSpring(1, { damping: 10 })
      );
      checkOpacity.value = withTiming(1, { duration: 300 });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Set user as logged in (mock)
      setCurrentUser({
        id: userId,
        username: 'player_one', // This would come from the API
        email: route.params.email || '',
        createdAt: new Date().toISOString(),
      });

      // Navigate to welcome after delay
      setTimeout(() => {
        navigation.navigate('Welcome' as keyof RootStackParamList, { token, userId } as any);
      }, 1500);
    } catch (error) {
      logger.error('Merge failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsMerging(false);
    }
  };

  const handleStartFresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Set user without merging data
    setCurrentUser({
      id: userId,
      username: 'player_one', // This would come from the API
      email: route.params.email || '',
      createdAt: new Date().toISOString(),
    });

    navigation.navigate('Welcome' as keyof RootStackParamList, { token, userId } as any);
  };

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  if (!guestProfile) {
    // No guest data, go directly to welcome
    navigation.navigate('Welcome' as keyof RootStackParamList, { token, userId } as any);
    return null;
  }

  const playTime = Math.floor(guestProfile.stats.totalPlayTime / 60);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View style={styles.iconContainer}>
            {mergeComplete ? (
              <Animated.View style={animatedCheckStyle}>
                <Ionicons name="checkmark-circle" size={64} color="#33ff33" />
              </Animated.View>
            ) : (
              <Ionicons name="sync-outline" size={64} color="#fff" />
            )}
          </View>
          <Text style={styles.title}>{mergeComplete ? 'Data Transferred!' : 'Welcome Back!'}</Text>
          <Text style={styles.subtitle}>
            {mergeComplete ? 'Your guest progress has been saved' : 'We found your guest data'}
          </Text>
        </Animated.View>

        {/* Stats Summary */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{playTime}</Text>
            <Text style={styles.statLabel}>Minutes Played</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{guestTrialHistory.length}</Text>
            <Text style={styles.statLabel}>Games Tried</Text>
          </View>
        </Animated.View>

        {/* Transfer Items */}
        <View style={styles.transferList}>
          <Animated.Text entering={FadeIn.delay(300).duration(600)} style={styles.transferTitle}>
            What will transfer:
          </Animated.Text>
          {transferItems.map((item, index) => (
            <Animated.View
              key={index}
              entering={SlideInRight.delay(item.delay).duration(600)}
              style={styles.transferItem}
            >
              <View style={styles.transferIcon}>
                <Ionicons name={item.icon as unknown as any} size={24} color="#fff" />
              </View>
              <Text style={styles.transferLabel}>{item.label}</Text>
              <Text style={styles.transferValue}>{item.value}</Text>
              {mergeComplete && (
                <Animated.View entering={FadeIn.delay(1000 + index * 100).duration(300)}>
                  <Ionicons name="checkmark" size={20} color="#33ff33" />
                </Animated.View>
              )}
            </Animated.View>
          ))}
        </View>

        {/* Actions */}
        {!mergeComplete && (
          <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleMerge}
              disabled={isMerging}
              activeOpacity={0.7}
            >
              {isMerging ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#000" />
                  <Text style={styles.primaryButtonText}>MERGE AND CONTINUE</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleStartFresh}
              disabled={isMerging}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Start Fresh Instead</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    paddingHorizontal: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '200',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
    marginHorizontal: 32,
  },
  transferList: {
    marginBottom: 48,
  },
  transferTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  transferIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transferLabel: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  transferValue: {
    fontSize: 16,
    color: '#999',
    marginRight: 16,
  },
  actions: {
    gap: 16,
  },
  button: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#fff',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
});
