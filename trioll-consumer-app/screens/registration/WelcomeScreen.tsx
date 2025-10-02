
import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/base';
import { useApp } from '../../context/AppContext';
import { useOrientation } from '../../hooks';
import { responsivePadding } from '../../utils/responsive';

interface TutorialCard {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const tutorialCards: TutorialCard[] = [
  {
    icon: 'search-outline',
    title: 'Discover Games',
    description: 'Swipe through a curated feed of amazing games tailored to your taste',
    color: '#4a9eff',
  },
  {
    icon: 'play-circle-outline',
    title: 'Try Before You Buy',
    description: 'Play 3-7 minute trials instantly. No downloads, no waiting',
    color: '#ff6b6b',
  },
  {
    icon: 'trophy-outline',
    title: 'Earn Rewards',
    description: 'Complete achievements and unlock exclusive content as you explore',
    color: '#ffd93d',
  },
];

type RootStackParamList = {
  Welcome: { token: string; userId: string };
  Feed: undefined;
};

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;
type WelcomeScreenRouteProp = RouteProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const { width: SCREEN_WIDTH } = useOrientation();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const route = useRoute<WelcomeScreenRouteProp>();
  const { currentUser } = useApp();
  const [currentCard, setCurrentCard] = useState(0);
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const username = currentUser?.username || 'Player';

  const handleCardPress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentCard(index);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== currentCard) {
      setCurrentCard(newIndex);
    }
  };

  const handleExploreGames = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Feed' }],
    });
  };

  const renderCard = (card: TutorialCard, index: number) => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const animatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], 'clamp');
      const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], 'clamp');

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <Animated.View key={index} style={[styles.card, animatedStyle, { width: SCREEN_WIDTH - 80 }]}>
        <TouchableOpacity
          style={[styles.cardContent, { borderColor: card.color }]}
          onPress={() => handleCardPress(index)}
          activeOpacity={0.9}
        >
          <View style={[styles.cardIcon, { backgroundColor: card.color + '20' }]}>
            <Ionicons name={card.icon as unknown as any} size={48} color={card.color} />
          </View>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardDescription}>{card.description}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Text style={styles.welcomeText}>Welcome to TRIOLL</Text>
          <Text style={styles.username}>{username}!</Text>
          <Text style={styles.subtitle}>Your gaming journey starts here</Text>
        </Animated.View>

        {/* Tutorial Cards */}
        <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.cardsContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            snapToAlignment="center"
          >
            {tutorialCards.map((card, index) => renderCard(card, index))}
          </ScrollView>
        </Animated.View>

        {/* Page Indicators */}
        <Animated.View entering={FadeIn.delay(400).duration(600)} style={styles.indicators}>
          {tutorialCards.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleCardPress(index)}
              activeOpacity={0.7}
            >
              <View style={[styles.indicator, currentCard === index && styles.indicatorActive]} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Quick Tips */}
        <Animated.View
          entering={SlideInRight.delay(500).duration(600)}
          style={styles.tipsContainer}
        >
          <Text style={styles.tipsTitle}>Quick Tips:</Text>
          <View style={styles.tip}>
            <Ionicons name="heart-outline" size={16} color="#ff6b6b" />
            <Text style={styles.tipText}>Double tap to like a game</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="bookmark-outline" size={16} color="#4a9eff" />
            <Text style={styles.tipText}>Swipe up to save for later</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="share-outline" size={16} color="#ffd93d" />
            <Text style={styles.tipText}>Swipe down to share</Text>
          </View>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleExploreGames}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>EXPLORE GAMES</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleExploreGames}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip tutorial</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingTop: responsivePadding.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  username: {
    fontSize: 40,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  cardsContainer: {
    height: 300,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 40,
  },
  card: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0a',
    borderWidth: 2,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  indicator: {
    width: 8,
    height: 8,
    backgroundColor: '#333',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  tipsContainer: {
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#999',
  },
  ctaContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  ctaButton: {
    height: 56,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },
  skipButton: {
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
});
