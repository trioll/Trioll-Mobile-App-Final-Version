import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '../base';
import { responsivePadding } from '../../utils/responsive';

interface ConsentOption {
  id: string;
  title: string;
  description: string;
  required: boolean;
}

interface DataConsentProps {
  onConsent: (consents: Record<string, boolean>) => void;
  onBack: () => void;
  canGoBack: boolean;
}

const CONSENT_OPTIONS: ConsentOption[] = [
  {
    id: 'essential',
    title: 'Essential Functionality',
    description: 'Core features needed for TRIOLL to work properly.',
    required: true,
  },
  {
    id: 'analytics',
    title: 'Analytics & Improvements',
    description: 'Help us improve TRIOLL by sharing anonymous usage data.',
    required: false,
  },
  {
    id: 'recommendations',
    title: 'Personalized Recommendations',
    description: 'Get game suggestions based on your play history.',
    required: false,
  },
  {
    id: 'marketing',
    title: 'Marketing Communications',
    description: 'Receive updates about new games and special offers.',
    required: false,
  },
];

export const DataConsent: React.FC<DataConsentProps> = ({ onConsent, onBack, canGoBack }) => {
  const [consents, setConsents] = useState<Record<string, boolean>>({
    essential: true,
    analytics: false,
    recommendations: false,
    marketing: false,
  });

  const handleToggleConsent = (id: string, required: boolean) => {
    if (required) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConsents(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConsent(consents);
  };

  const renderConsentItem = (item: ConsentOption) => {
    const isEnabled = consents[item.id];

    const animatedThumbStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateX: withTiming(isEnabled ? 16 : 0, { duration: 200 }),
          },
        ],
      };
    });

    return (
      <View key={item.id} style={styles.consentItem}>
        <View style={styles.consentContent}>
          <View style={styles.consentText}>
            <Text style={styles.consentTitle}>
              {item.title}
              {item.required && <Text style={styles.requiredBadge}> REQUIRED</Text>}
            </Text>
            <Text style={styles.consentDescription}>{item.description}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.toggle,
              isEnabled && styles.toggleEnabled,
              item.required && styles.toggleDisabled,
            ]}
            onPress={() => handleToggleConsent(item.id, item.required)}
            activeOpacity={item.required ? 1 : 0.7}
          >
            <Animated.View style={[styles.toggleThumb, animatedThumbStyle]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Question section */}
      <View style={styles.questionSection}>
        <Text style={styles.title}>Data Privacy Settings</Text>
        <Text style={styles.subtitle}>You're in control of your data</Text>
      </View>

      {/* Consent options - grid layout for landscape */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.consentGrid}>{CONSENT_OPTIONS.map(renderConsentItem)}</View>
      </ScrollView>

      {/* Fixed navigation */}
      <View style={styles.navigation}>
        {canGoBack && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>BACK</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.navButton, styles.continueButton]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  questionSection: {
    paddingTop: responsivePadding.xxl,
    paddingBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 40,
    paddingBottom: 120,
  },
  consentGrid: {
    flexDirection: 'column',
  },
  consentItem: {
    width: '100%',
    marginBottom: 16,
  },
  consentContent: {
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consentText: {
    flex: 1,
    marginRight: 16,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  requiredBadge: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  consentDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  toggle: {
    width: 48,
    height: 28,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    padding: 2,
  },
  toggleEnabled: {
    backgroundColor: '#222',
    borderColor: '#444',
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    backgroundColor: '#fff',
  },
  navigation: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    flexDirection: 'row',
    gap: 16,
  },
  navButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1,
  },
  backButton: {
    borderColor: '#333',
  },
  continueButton: {
    borderColor: '#fff',
    flex: 2,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
  },
});
