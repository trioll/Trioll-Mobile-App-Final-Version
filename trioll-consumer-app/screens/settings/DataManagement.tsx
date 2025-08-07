
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
      'Export Your Data',
      "We'll prepare a copy of your data and send it to your email. This may take up to 24 hours.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setIsExporting(true);
            trigger('success');
            // Simulate export process
            setTimeout(() => {
              setIsExporting(false);
              showToast('Data export requested. Check your email soon!', 'success');
            }, 2000);
          },
        },
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

  const handleDeleteDownloads = () => {
    Alert.alert(
      'Delete Downloads',
      'This will remove all downloaded game assets. You can re-download them later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            trigger('success');
            showToast('Downloads deleted', 'success');
          },
        },
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
      id: 'storage',
      title: 'Storage Usage',
      description: 'Total space used by TRIOLL',
      icon: 'phone-portrait-outline',
      size: '1.2 GB',
      action: () => {},
    },
    {
      id: 'cache',
      title: 'Cache',
      description: 'Temporary files for faster loading',
      icon: 'speedometer-outline',
      size: '423 MB',
      action: handleClearCache,
    },
    {
      id: 'downloads',
      title: 'Downloaded Games',
      description: 'Game assets stored locally',
      icon: 'download-outline',
      size: '687 MB',
      action: handleDeleteDownloads,
    },
    {
      id: 'saves',
      title: 'Game Saves',
      description: 'Your progress and saved games',
      icon: 'save-outline',
      size: '89 MB',
      action: () => {},
    },
  ];

  const renderDataSection = (section: DataSection) => (
    <Pressable
      key={section.id}
      style={styles.dataCard}
      onPress={section.action}
      disabled={section.id === 'storage' || section.id === 'saves'}
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
        {(section.id === 'cache' || section.id === 'downloads') && (
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
        {/* Storage Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          {dataSections.map(renderDataSection)}
        </View>

        {/* Data Export */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          <Pressable onPress={handleExportData} disabled={isExporting}>
            <LinearGradient
              colors={['#6366f1', '#7c3aed']}
              style={styles.exportButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.exportButtonText}>Export Your Data</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
          <Text style={styles.exportInfo}>
            Download a copy of your TRIOLL data including profile, game progress, and settings
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
                We keep your data for as long as your account is active. Deleted data is removed
                within 30 days.
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
});
