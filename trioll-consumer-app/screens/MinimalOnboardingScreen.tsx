
import React, { useState, useRef } from 'react';
import { NavigationProp } from '../navigation/types';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/base/Text';
import { useOrientation } from '../hooks';
import { GlassContainer, GlassButton } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';

interface SlideData {
  icon: string;
  title: string;
  description: string;
  gradient: string[];
}

const slides: SlideData[] = [
  {
    icon: 'game-controller',
    title: 'Discover Games',
    description: 'Swipe through a personalized feed of games tailored just for you',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    icon: 'play-circle',
    title: 'Try Before You Buy',
    description: 'Play 3-7 minute trials instantly. No downloads, no waiting',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    icon: 'bookmark',
    title: 'Save Your Favorites',
    description: 'Build your collection and never lose track of games you love',
    gradient: ['#4facfe', '#00f2fe'],
  },
];

export const MinimalOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'MinimalOnboarding'>>();
  const { width: screenWidth, height: screenHeight } = useOrientation();
  const isPortrait = screenHeight > screenWidth;
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentSlide + 1) * screenWidth,
        animated: true,
      });
    } else {
      handleSkip();
    }
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate('RegistrationMethod' as never as never);
    });
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentSlide(slideIndex);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Skip Button */}
        <GlassButton
          style={styles.skipButton}
          onPress={handleSkip}
          variant="ghost"
          size="small"
        >
          Skip
        </GlassButton>

        {/* Slides */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={index} style={[styles.slide, isPortrait && styles.slidePortrait, { width: screenWidth }]}>
              <View style={[styles.iconContainer, { marginBottom: isPortrait ? 24 : 32 }]}>
                <GlassContainer style={[styles.iconBackground, isPortrait && styles.iconBackgroundPortrait]} variant="elevated">
                  <Ionicons name={slide.icon as unknown as any} size={isPortrait ? 40 : 48} color={DS.colors.primary} />
                </GlassContainer>
              </View>

              <Text size={isPortrait ? "xl" : "2xl"} weight="bold" color={DS.colors.textPrimary} style={[styles.title, isPortrait && styles.titlePortrait]}>
                {slide.title}
              </Text>

              <Text variant="body" color={DS.colors.textSecondary} style={[styles.description, isPortrait && styles.descriptionPortrait]} center>
                {slide.description}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View style={[styles.bottomSection, isPortrait && styles.bottomSectionPortrait]}>
          {/* Page Indicators */}
          <View style={[styles.indicators, isPortrait && styles.indicatorsPortrait]}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[styles.indicator, currentSlide === index && styles.activeIndicator]}
              />
            ))}
          </View>

          {/* Next/Get Started Button */}
          <GlassButton
            style={styles.nextButton}
            onPress={handleNext}
            variant={currentSlide === slides.length - 1 ? 'primary' : 'secondary'}
            size="large"
            fullWidth
            glowEffect={currentSlide === slides.length - 1}
          >
            <View style={styles.nextButtonContent}>
              <Text variant="body" color={currentSlide === slides.length - 1 ? DS.colors.background : DS.colors.textPrimary} weight="bold">
                {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={isPortrait ? 16 : 18} color={currentSlide === slides.length - 1 ? DS.colors.background : DS.colors.textPrimary} />
            </View>
          </GlassButton>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
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
    borderRadius: 4,
    backgroundColor: DS.colors.border,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: DS.colors.primary,
  },
  nextButton: {
    overflow: 'hidden',
  },
  nextButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: DS.spacing.xs,
  },
  
  // Portrait mode optimizations
  iconBackgroundPortrait: {
    width: 80,
    height: 80,
  },
  titlePortrait: {
    fontSize: 24,
    marginBottom: 12,
  },
  descriptionPortrait: {
    fontSize: 15,
    lineHeight: 22,
  },
  bottomSectionPortrait: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  indicatorsPortrait: {
    marginBottom: 24,
  },
  slidePortrait: {
    paddingHorizontal: 16,
  },
});
