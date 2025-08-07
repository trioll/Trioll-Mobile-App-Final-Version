import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DURATIONS } from '../../constants/animations';

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  earnedAt: Date;
}

interface BadgesTitlesProps {
  currentTitle: {
    name: string;
    description: string;
    color: string;
  };
  badges: Badge[];
}

export const BadgesTitles: React.FC<BadgesTitlesProps> = ({ currentTitle, badges }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnims = useRef(badges.map(() => new Animated.Value(-30))).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();

    // Pulse animation for title
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide in badges
    const animations = slideAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 0,
        duration: DURATIONS.NORMAL,
        delay: index * 50,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, []);

  const badgeTypes = [
    { type: 'early-adopter', name: 'Early Adopter', icon: 'rocket', color: '#8866FF' },
    { type: 'speed-runner', name: 'Speed Runner', icon: 'flash', color: '#FF0066' },
    { type: 'rare-hunter', name: 'Rare Hunter', icon: 'search', color: '#FFD700' },
    { type: 'perfectionist', name: 'Perfectionist', icon: 'star', color: '#00FF88' },
    { type: 'social-butterfly', name: 'Social Butterfly', icon: 'people', color: '#FF66FF' },
    { type: 'night-owl', name: 'Night Owl', icon: 'moon', color: '#00FFFF' },
  ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Current Title */}
      <View style={styles.titleSection}>
        <Text style={styles.sectionTitle}>EQUIPPED TITLE</Text>

        <Animated.View
          style={[
            styles.titleCard,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[currentTitle.color + '20', currentTitle.color + '10']}
            style={styles.titleGradient}
          >
            <View style={styles.titleContent}>
              <Text style={[styles.titleName, { color: currentTitle.color }]}>
                {currentTitle.name}
              </Text>
              <Text style={styles.titleDescription}>{currentTitle.description}</Text>
            </View>

            <View style={styles.titleDecoration}>
              <View style={[styles.titleBar, { backgroundColor: currentTitle.color }]} />
              <View style={[styles.titleDot, { backgroundColor: currentTitle.color }]} />
              <View style={[styles.titleBar, { backgroundColor: currentTitle.color }]} />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Badges Collection */}
      <View style={styles.badgesSection}>
        <Text style={styles.sectionTitle}>EARNED BADGES</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesScroll}
        >
          {badges.map((badge, index) => {
            const badgeType = badgeTypes.find(t => t.type === badge.id) || badgeTypes[0];

            return (
              <Animated.View
                key={badge.id}
                style={[
                  styles.badgeItem,
                  {
                    transform: [{ translateX: slideAnims[index] }],
                  },
                ]}
              >
                <View style={[styles.badgeContainer, { backgroundColor: badgeType.color + '20' }]}>
                  <View
                    style={[styles.badgeIconContainer, { backgroundColor: badgeType.color + '30' }]}
                  >
                    <Ionicons
                      name={badgeType.icon as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color={badgeType.color}
                    />
                  </View>

                  <View style={styles.badgeHexagon}>
                    <View style={[styles.hexagonInner, { backgroundColor: badgeType.color }]} />
                  </View>
                </View>

                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDate}>
                  {badge.earnedAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  titleCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  titleGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  titleContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  titleDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  titleDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBar: {
    height: 2,
    width: 40,
    opacity: 0.6,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  badgesSection: {
    paddingLeft: 24,
  },
  badgesScroll: {
    paddingRight: 24,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  badgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeHexagon: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    transform: [{ rotate: '45deg' }],
  },
  hexagonInner: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  badgeName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
  },
});
