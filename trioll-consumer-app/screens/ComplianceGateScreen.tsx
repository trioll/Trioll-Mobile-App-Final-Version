import React, { useState, useRef } from 'react';

import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GlassContainer } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';
import { getLogger } from '../src/utils/logger';
import { useApp } from '../context/AppContext';

const logger = getLogger('ComplianceGateScreen');
// Components
import { AgeVerification } from '../components/compliance/AgeVerification';
import { RegionSelection } from '../components/compliance/RegionSelection';
import { DataConsent } from '../components/compliance/DataConsent';
import { TermsAcceptance } from '../components/compliance/TermsAcceptance';
import { ProgressIndicator } from '../components/compliance/ProgressIndicator';

// Utils
import { storeComplianceData } from '../utils/complianceStorage';

const STEPS = [
  { id: 'age', title: 'Age' },
  { id: 'region', title: 'Region' },
  { id: 'consent', title: 'Privacy' },
  { id: 'terms', title: 'Terms' },
];

export const ComplianceGateScreen = () => {
  const navigation = useNavigation<any>();
  const { initializeGuest } = useApp();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [currentStep, setCurrentStep] = useState(0);
  const [screenDimensions, setScreenDimensions] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });
  const [complianceData, setComplianceData] = useState({
    age: null as number | null,
    birthDate: null as Date | null,
    isTeenMode: false,
    region: null as string | null,
    isGDPR: false,
    consents: {
      essential: true,
      analytics: false,
      recommendations: false,
      marketing: false,
    },
    termsAccepted: false,
    privacyAccepted: false,
  });

  const translateX = useSharedValue(0);

  // Force portrait orientation when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Lock to portrait
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

      // Update dimensions for portrait
      const updateDimensions = () => {
        const { width, height } = Dimensions.get('window');
        setScreenDimensions({ width, height });
      };

      const subscription = Dimensions.addEventListener('change', updateDimensions);

      return () => {
        // Unlock orientation when leaving
        ScreenOrientation.unlockAsync();
        subscription?.remove();
      };
    }, [])
  );

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      translateX.value = withSpring(-screenDimensions.width * nextStep, {
        damping: 25,
        stiffness: 350,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      translateX.value = withSpring(-screenDimensions.width * prevStep, {
        damping: 25,
        stiffness: 350,
      });
    }
  };

  const handleCompleteCompliance = async () => {
    try {
      // Store compliance data
      await storeComplianceData({
        ...complianceData,
        completedAt: new Date().toISOString(),
      });

      // Auto-create guest account
      logger.info('Auto-creating guest account after compliance');
      await initializeGuest();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Unlock orientation before navigating to feed
      await ScreenOrientation.unlockAsync();

      // Navigate directly to Feed, skipping onboarding
      navigation.reset({
        index: 0,
        routes: [{ name: 'Feed' }],
      });
    } catch (error) {
      logger.error('Failed to complete compliance:', error);
    }
  };

  const handleAgeVerification = (age: number, birthDate: Date) => {
    const isTeenMode = age >= 13 && age < 18;
    setComplianceData(prev => ({
      ...prev,
      age,
      birthDate,
      isTeenMode,
    }));
    handleNext();
  };

  const handleRegionSelection = (region: string, isGDPR: boolean) => {
    setComplianceData(prev => ({
      ...prev,
      region,
      isGDPR,
    }));

    // Skip consent step if not GDPR
    if (!isGDPR && currentStep === 1) {
      setCurrentStep(3);
      translateX.value = withSpring(-screenDimensions.width * 3, {
        damping: 25,
        stiffness: 350,
      });
    } else {
      handleNext();
    }
  };

  const handleDataConsent = (consents: {
    essential: boolean;
    analytics: boolean;
    recommendations: boolean;
    marketing: boolean;
  }) => {
    setComplianceData(prev => ({
      ...prev,
      consents: {
        essential: consents.essential,
        analytics: consents.analytics,
        recommendations: consents.recommendations,
        marketing: consents.marketing,
      },
    }));
    handleNext();
  };

  const handleTermsAcceptance = (termsAccepted: boolean, privacyAccepted: boolean) => {
    setComplianceData(prev => ({
      ...prev,
      termsAccepted,
      privacyAccepted,
    }));
    handleCompleteCompliance();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Minimal progress indicator at top */}
        <GlassContainer style={styles.header} variant="surface" noBorder>
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={STEPS.length}
            skipConsent={!complianceData.isGDPR}
          />
        </GlassContainer>

        {/* Content area with horizontal scroll */}
        <View style={styles.contentArea}>
          <Animated.View
            style={[styles.stepsContainer, animatedStyle, { width: screenDimensions.width * 4 }]}
          >
            <View style={[styles.step, { width: screenDimensions.width }]}>
              <AgeVerification
                onVerify={handleAgeVerification}
                onBack={handleBack}
                canGoBack={false}
              />
            </View>

            <View style={[styles.step, { width: screenDimensions.width }]}>
              <RegionSelection
                onSelect={handleRegionSelection}
                onBack={handleBack}
                canGoBack={true}
              />
            </View>

            <View style={[styles.step, { width: screenDimensions.width }]}>
              <DataConsent onConsent={handleDataConsent} onBack={handleBack} canGoBack={true} />
            </View>

            <View style={[styles.step, { width: screenDimensions.width }]}>
              <TermsAcceptance
                onAccept={handleTermsAcceptance}
                onBack={handleBack}
                canGoBack={true}
                isGDPR={complianceData.isGDPR}
              />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
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
  header: {
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  stepsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  step: {
    flex: 1,
  },
});
