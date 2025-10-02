import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { responsivePadding } from '../../utils/responsive';

interface TrialInfoBannerProps {
  trialDuration?: number;  // Made optional - no longer enforcing time limits
  platform: string;
}

export const TrialInfoBanner: React.FC<TrialInfoBannerProps> = ({ trialDuration, platform }) => {
  const trialFeatures = [
    'Full gameplay experience',
    'No ads or interruptions',
    'Progress saved if you buy',
    'No credit card required',
  ];

  const platformStores = {
    ios: 'App Store',
    android: 'Google Play',
    both: 'App Store & Google Play',
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#5558e3']}
        style={styles.gradientBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="game-controller" size={24} color="#fff" />
            <Text style={styles.title}>{trialDuration ? `${trialDuration} minute free trial` : 'Free trial'}</Text>
          </View>
          <Text style={styles.subtitle}>Try before you buy - no commitment</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What's included in your trial:</Text>
          {trialFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Platform Info */}
        <View style={styles.platformInfo}>
          <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.platformText}>
            Full game available on {platformStores[platform as keyof typeof platformStores]}
          </Text>
        </View>
      </LinearGradient>

      {/* Additional Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#6366f1" />
            <Text style={styles.infoLabel}>Safe & Secure</Text>
            <Text style={styles.infoText}>No downloads required</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="flash-outline" size={20} color="#6366f1" />
            <Text style={styles.infoLabel}>Instant Play</Text>
            <Text style={styles.infoText}>Start in seconds</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  gradientBanner: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 36,
  },
  features: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: responsivePadding.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  platformText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#3a3a4e',
    marginHorizontal: 16,
  },
  infoLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  infoText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});
