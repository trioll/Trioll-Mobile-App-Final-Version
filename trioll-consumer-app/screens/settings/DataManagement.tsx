
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { NavigationProp } from '../../navigation/types';

interface DataSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  size: string;
  action: () => void;
}

export const DataManagement: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'DataManagement'>>();
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleBack = () => {
    trigger('selection');
    navigation.goBack();
  };

  const handleExportData = () => {
    Alert.alert(
      'Premium Feature',
      'Data export is available for premium subscribers. Visit trioll.com/dashboard to access your data and analytics.',
      [
        { text: 'OK', style: 'default' },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will free up storage space but may slow down initial loading times.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            trigger('success');
            showToast('Cache cleared successfully', 'success');
          },
        },
      ]
    );
  };

  const handleStreamingInfo = () => {
    Alert.alert(
      'Streaming Only',
      'TRIOLL streams games directly to your device. No downloads are stored locally.',
      [
        { text: 'OK', style: 'default' },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data, progress, and purchases will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your account will be scheduled for deletion in 30 days. You can cancel this within that period.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: () => {
                    trigger('warning');
                    showToast('Account scheduled for deletion', 'error');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const dataSections: DataSection[] = [
    {
      id: 'app',
      title: 'App Size',
      description: 'TRIOLL app installation',
      icon: 'phone-portrait-outline',
      size: '85 MB',
      action: () => {},
    },
    {
      id: 'cache',
      title: 'Cache',
      description: 'Temporary files for faster streaming',
      icon: 'speedometer-outline',
      size: '12 MB',
      action: handleClearCache,
    },
    {
      id: 'streaming',
      title: 'Streaming',
      description: 'No game downloads stored',
      icon: 'cloud-outline',
      size: '0 MB',
      action: handleStreamingInfo,
    },
  ];

  const renderDataSection = (section: DataSection) => (
    <Pressable
      key={section.id}
      style={styles.dataCard}
      onPress={section.action}
      disabled={section.id === 'app'}
    >
      <View style={styles.dataIcon}>
        <Ionicons name={section.icon as keyof typeof Ionicons.glyphMap} size={24} color="#6366f1" />
      </View>
      <View style={styles.dataInfo}>
        <Text style={styles.dataTitle}>{section.title}</Text>
        <Text style={styles.dataDescription}>{section.description}</Text>
      </View>
      <View style={styles.dataRight}>
        <Text style={styles.dataSize}>{section.size}</Text>
        {(section.id === 'cache' || section.id === 'streaming') && (
          <Ionicons name="chevron-forward" size={20} color="#666" />
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Data Management</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Storage</Text>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              TRIOLL streams games directly to your device. No game files are downloaded or stored locally.
            </Text>
          </View>
          {dataSections.map(renderDataSection)}
        </View>

        {/* Data Export */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          <Pressable onPress={handleExportData}>
            <View style={styles.premiumButton}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
              <View style={styles.premiumContent}>
                <Text style={styles.premiumTitle}>Data Export & Analytics</Text>
                <Text style={styles.premiumText}>Premium Feature</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </Pressable>
          <Text style={styles.exportInfo}>
            Access your data exports and detailed analytics at trioll.com/dashboard
          </Text>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.privacyCard}>
            <Ionicons name="shield-checkmark" size={24} color="#00FF88" />
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyTitle}>Data Retention</Text>
              <Text style={styles.privacyText}>
                Your gameplay data is processed in real-time. Account data is retained while your account is active and removed within 30 days of deletion.
              </Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FF6B6B' }]}>Danger Zone</Text>
          <Pressable onPress={handleDeleteAccount} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </Pressable>
          <Text style={styles.deleteInfo}>
            Permanently delete your account and all associated data
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  dataIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataInfo: {
    flex: 1,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  dataDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  dataRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataSize: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  exportInfo: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginTop: 8,
  },
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  deleteInfo: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  premiumIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  premiumText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '500',
  },
});
