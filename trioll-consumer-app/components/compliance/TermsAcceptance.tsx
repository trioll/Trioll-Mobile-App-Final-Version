
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '../base';
import { responsivePadding } from '../../utils/responsive';

interface TermsAcceptanceProps {
  onAccept: (termsAccepted: boolean, privacyAccepted: boolean) => void;
  onBack: () => void;
  canGoBack: boolean;
  isGDPR: boolean;
}

export const TermsAcceptance: React.FC<TermsAcceptanceProps> = ({
  onAccept,
  onBack,
  canGoBack,
  isGDPR,
}) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleToggleTerms = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTermsAccepted(!termsAccepted);
  };

  const handleTogglePrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrivacyAccepted(!privacyAccepted);
  };

  const handleContinue = () => {
    if (termsAccepted && privacyAccepted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAccept(termsAccepted, privacyAccepted);
    }
  };

  const renderCheckbox = (checked: boolean) => (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Question section */}
      <View style={styles.questionSection}>
        <Text style={styles.title}>Legal Agreements</Text>
        <Text style={styles.subtitle}>Please review and accept to continue</Text>
      </View>

      {/* Content area with documents side by side */}
      <View style={styles.contentArea}>
        <View style={styles.documentsRow}>
          {/* Terms of Service */}
          <View style={styles.documentColumn}>
            <Text style={styles.documentTitle}>TERMS OF SERVICE</Text>
            <ScrollView style={styles.documentScroll} showsVerticalScrollIndicator={true}>
              <Text style={styles.documentText}>
                By using TRIOLL, you agree to these terms.{'\n\n'}• You must be 13 or older{'\n'}•
                Account security is your responsibility{'\n'}• Game trials are for evaluation only
                {'\n'}• Be respectful to other users{'\n'}• We may suspend accounts that violate
                terms
                {'\n\n'}
                Full terms available at trioll.com/terms
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.acceptRow}
              onPress={handleToggleTerms}
              activeOpacity={0.7}
            >
              {renderCheckbox(termsAccepted)}
              <Text style={styles.acceptText}>I accept the Terms of Service</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Policy */}
          <View style={styles.documentColumn}>
            <Text style={styles.documentTitle}>PRIVACY POLICY</Text>
            <ScrollView style={styles.documentScroll} showsVerticalScrollIndicator={true}>
              <Text style={styles.documentText}>
                We protect your privacy.{'\n\n'}• We collect minimal data{'\n'}• Never sell personal
                information{'\n'}• Use data to improve services{'\n'}• You control your data{'\n'}
                {isGDPR && '• GDPR rights apply\n'}• Industry-standard security
                {'\n\n'}
                Full policy at trioll.com/privacy
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.acceptRow}
              onPress={handleTogglePrivacy}
              activeOpacity={0.7}
            >
              {renderCheckbox(privacyAccepted)}
              <Text style={styles.acceptText}>I accept the Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
          style={[
            styles.navButton,
            styles.startButton,
            (!termsAccepted || !privacyAccepted) && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={termsAccepted && privacyAccepted ? 0.7 : 1}
          disabled={!termsAccepted || !privacyAccepted}
        >
          <Text
            style={[
              styles.navButtonText,
              (!termsAccepted || !privacyAccepted) && styles.buttonTextDisabled,
            ]}
          >
            START PLAYING
          </Text>
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
  contentArea: {
    flex: 1,
    paddingHorizontal: 40,
    paddingBottom: 120, // Space for navigation
  },
  documentsRow: {
    flexDirection: 'column',
    gap: 20,
    flex: 1,
  },
  documentColumn: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 12,
  },
  documentScroll: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    marginBottom: 16,
  },
  documentText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  acceptText: {
    fontSize: 14,
    color: '#ccc',
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
  startButton: {
    borderColor: '#fff',
    flex: 2,
  },
  buttonDisabled: {
    borderColor: '#333',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
  },
  buttonTextDisabled: {
    color: '#444',
  },
});
