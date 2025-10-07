
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useHaptics } from '../hooks/useHaptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  target: { x: number; y: number; width: number; height: number };
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const haptics = useHaptics();
  const _insets = useSafeAreaInsets();

  const TUTORIAL_STEPS: TutorialStep[] = [
    {
      id: 'play_button',
      target: { x: SCREEN_WIDTH / 2 - 60, y: SCREEN_HEIGHT / 2 - 60, width: 120, height: 120 },
      title: 'Start Playing',
      description: 'Tap the play button to start a 3-7 minute trial',
      icon: 'play-circle',
      position: 'top',
    },
    {
      id: 'swipe_cards',
      target: { x: 20, y: SCREEN_HEIGHT / 2 - 100, width: SCREEN_WIDTH - 40, height: 200 },
      title: 'Swipe to Discover',
      description: 'Swipe left or right to browse games',
      icon: 'swap-horizontal',
      position: 'top',
    },
    {
      id: 'like_button',
      target: { x: SCREEN_WIDTH - 80, y: SCREEN_HEIGHT / 2 - 150, width: 50, height: 50 },
      title: 'Like Games',
      description: 'Tap to like or double-tap anywhere on the card',
      icon: 'heart',
      position: 'left',
    },
    {
      id: 'bookmark_button',
      target: { x: SCREEN_WIDTH - 80, y: SCREEN_HEIGHT / 2 - 80, width: 50, height: 50 },
      title: 'Save for Later',
      description: 'Bookmark games to play later',
      icon: 'bookmark',
      position: 'left',
    },
    {
      id: 'menu_button',
      target: { x: 20, y: _insets.top + 20, width: 50, height: 50 },
      title: 'Menu & Profile',
      description: 'Tap the logo to access menu options',
      icon: 'menu',
      position: 'bottom',
    },
  ];

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for highlight
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Arrow bounce animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrowAnim, {
            toValue: -10,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(arrowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const handleNext = () => {
    haptics.selection();
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    (haptics as any).success();
    await SecureStore.setItemAsync('tutorial_completed', 'true');
    onComplete();
  };

  const handleSkipTutorial = () => {
    haptics.selection();
    onSkip();
  };

  const renderHighlight = () => {
    const step = TUTORIAL_STEPS[currentStep];
    return (
      <Animated.View
        style={[
          styles.highlight,
          {
            left: step.target.x - 10,
            top: step.target.y - 10,
            width: step.target.width + 20,
            height: step.target.height + 20,
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.highlightBorder} />
      </Animated.View>
    );
  };

  const renderTooltip = () => {
    const step = TUTORIAL_STEPS[currentStep];
    let tooltipStyle = {};
    let arrowStyle = {};
    const tooltipWidth = 300;
    const tooltipHeight = 200; // Approximate height
    const margin = 20;

    switch (step.position) {
      case 'bottom': {
        const bottomTop = step.target.y + step.target.height + 30;
        tooltipStyle = {
          top: Math.min(bottomTop, SCREEN_HEIGHT - tooltipHeight - _insets.bottom - margin),
          left: Math.max(
            margin,
            Math.min(
              step.target.x + step.target.width / 2 - tooltipWidth / 2,
              SCREEN_WIDTH - tooltipWidth - margin
            )
          ),
        };
        arrowStyle = {
          top: -15,
          left: Math.max(15, Math.min(tooltipWidth / 2 - 15, tooltipWidth - 30)),
        };
        break;
      }
      case 'top': {
        const topBottom = step.target.y - tooltipHeight - 30;
        tooltipStyle = {
          top: Math.max(_insets.top + margin, topBottom),
          left: Math.max(
            margin,
            Math.min(
              step.target.x + step.target.width / 2 - tooltipWidth / 2,
              SCREEN_WIDTH - tooltipWidth - margin
            )
          ),
        };
        arrowStyle = {
          bottom: -15,
          left: Math.max(15, Math.min(tooltipWidth / 2 - 15, tooltipWidth - 30)),
          transform: [{ rotate: '180deg' }],
        };
        break;
      }
      case 'left': {
        const leftRight = step.target.x - tooltipWidth - 30;
        tooltipStyle = {
          top: Math.max(
            insets.top + margin,
            Math.min(
              step.target.y + step.target.height / 2 - tooltipHeight / 2,
              SCREEN_HEIGHT - tooltipHeight - insets.bottom - margin
            )
          ),
          left: Math.max(margin, leftRight),
        };
        arrowStyle = {
          right: -15,
          top: Math.max(15, Math.min(tooltipHeight / 2 - 15, tooltipHeight - 30)),
          transform: [{ rotate: '90deg' }],
        };
        break;
      }
      case 'right': {
        const rightLeft = step.target.x + step.target.width + 30;
        tooltipStyle = {
          top: Math.max(
            insets.top + margin,
            Math.min(
              step.target.y + step.target.height / 2 - tooltipHeight / 2,
              SCREEN_HEIGHT - tooltipHeight - insets.bottom - margin
            )
          ),
          left: Math.min(rightLeft, SCREEN_WIDTH - tooltipWidth - margin),
        };
        arrowStyle = {
          left: -15,
          top: Math.max(15, Math.min(tooltipHeight / 2 - 15, tooltipHeight - 30)),
          transform: [{ rotate: '-90deg' }],
        };
        break;
      }
    }

    return (
      <Animated.View
        style={[
          styles.tooltip,
          tooltipStyle,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: step.position === 'bottom' || step.position === 'top' ? arrowAnim : 0,
              },
              {
                translateX: step.position === 'left' || step.position === 'right' ? arrowAnim : 0,
              },
            ],
          },
        ]}
      >
        <View style={[styles.arrow, arrowStyle]} />
        <LinearGradient colors={['#1a1a2e', '#000']} style={styles.tooltipContent}>
          {step.icon && (
            <View style={styles.tooltipIcon}>
              <Ionicons name={step.icon as unknown as any} size={32} color="#6366f1" />
            </View>
          )}
          <Text style={styles.tooltipTitle}>{step.title}</Text>
          <Text style={styles.tooltipDescription}>{step.description}</Text>

          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={handleSkipTutorial} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip Tutorial</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.nextGradient}>
                <Text style={styles.nextText}>
                  {currentStep === TUTORIAL_STEPS.length - 1 ? 'Got it!' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderProgress = () => (
    <View style={styles.progress}>
      {TUTORIAL_STEPS.map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === currentStep && styles.progressDotActive,
            index < currentStep && styles.progressDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        {/* Dark overlay with blur */}
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject}>
          <View style={styles.overlay} />
        </BlurView>

        {/* Highlight area */}
        {renderHighlight()}

        {/* Tooltip */}
        {renderTooltip()}

        {/* Progress indicator */}
        {renderProgress()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#6366f1',
    backgroundColor: 'transparent',
  },
  highlightBorder: {
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  tooltip: {
    position: 'absolute',
    width: 300,
    zIndex: 1000,
  },
  tooltipContent: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1a1a2e',
  },
  tooltipIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  nextText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#00FF88',
  },
});
