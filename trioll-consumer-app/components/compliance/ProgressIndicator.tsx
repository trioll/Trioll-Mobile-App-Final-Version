import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Text } from '../base';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  skipConsent?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  skipConsent = false,
}) => {
  const actualStep = skipConsent && currentStep === 3 ? 2 : currentStep;
  const actualTotal = skipConsent ? totalSteps - 1 : totalSteps;

  const progressWidth = useAnimatedStyle(() => {
    const progress = (actualStep + 1) / actualTotal;
    return {
      width: withSpring(`${progress * 100}%`, {
        damping: 20,
        stiffness: 200,
      }),
    };
  });

  const getStepLabel = (step: number) => {
    const labels = ['Age', 'Region', 'Privacy', 'Terms'];
    if (skipConsent && step >= 2) {
      return labels[step + 1];
    }
    return labels[step];
  };

  return (
    <View style={styles.container}>
      {/* Step dots - minimal and subtle */}
      <View style={styles.steps}>
        {Array.prototype.slice.call({ length: actualTotal }).map((_, index) => {
          const isActive = index === actualStep;
          const isCompleted = index < actualStep;

          return (
            <View key={index} style={styles.stepWrapper}>
              <View
                style={[
                  styles.dot,
                  isActive && styles.dotActive,
                  isCompleted && styles.dotCompleted,
                ]}
              />
              <Text style={[styles.label, (isActive || isCompleted) && styles.labelActive]}>
                {getStepLabel(index)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Minimal progress line */}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, progressWidth]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  dotActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  dotCompleted: {
    backgroundColor: '#666',
    borderColor: '#666',
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: '#fff',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
});
