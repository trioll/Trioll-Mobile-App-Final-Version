import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useHaptics } from '../../hooks/useHaptics';
import { NavigationProp } from '../../navigation/types';

interface License {
  id: string;
  name: string;
  version: string;
  license: string;
  licenseText: string;
  repository?: string;
}

// Mock license data
const mockLicenses: License[] = [
  {
    id: '1',
    name: 'react-native',
    version: '0.76.3',
    license: 'MIT',
    licenseText:
      'MIT License\n\nCopyright (c) Facebook, Inc. and its affiliates.\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files...',
    repository: 'https://github.com/facebook/react-native',
  },
  {
    id: '2',
    name: 'expo',
    version: '53.0.0',
    license: 'MIT',
    licenseText: 'MIT License...',
    repository: 'https://github.com/expo/expo',
  },
  {
    id: '3',
    name: '@react-navigation/native',
    version: '6.1.7',
    license: 'MIT',
    licenseText: 'MIT License...',
    repository: 'https://github.com/react-navigation/react-navigation',
  },
  {
    id: '4',
    name: 'react-native-reanimated',
    version: '3.5.4',
    license: 'MIT',
    licenseText: 'MIT License...',
  },
  {
    id: '5',
    name: 'react-native-gesture-handler',
    version: '2.13.0',
    license: 'MIT',
    licenseText: 'MIT License...',
  },
  {
    id: '6',
    name: 'react-native-vector-icons',
    version: '10.0.0',
    license: 'MIT',
    licenseText: 'MIT License...',
  },
  {
    id: '7',
    name: 'lottie-react-native',
    version: '6.3.1',
    license: 'Apache-2.0',
    licenseText: 'Apache License 2.0...',
  },
  {
    id: '8',
    name: 'react-native-webview',
    version: '13.6.0',
    license: 'MIT',
    licenseText: 'MIT License...',
  },
];

export const OpenSourceLicenses: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'OpenSourceLicenses'>>();
  const { trigger } = useHaptics();
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleBack = () => {
    trigger('selection');
    navigation.goBack();
  };

  const handleLicensePress = (license: License) => {
    trigger('selection');
    setSelectedLicense(license);
    setModalVisible(true);
  };

  const getLicenseColor = (license: string) => {
    switch (license) {
      case 'MIT':
        return '#00FF88';
      case 'Apache-2.0':
        return '#FF6B6B';
      case 'BSD':
        return '#6366f1';
      default:
        return '#FFFFFF';
    }
  };

  const renderLicense = ({ item }: { item: License }) => (
    <Pressable style={styles.licenseCard} onPress={() => handleLicensePress(item)}>
      <View style={styles.licenseHeader}>
        <Text style={styles.licenseName}>{item.name}</Text>
        <View
          style={[styles.licenseBadge, { backgroundColor: `${getLicenseColor(item.license)}20` }]}
        >
          <Text style={[styles.licenseBadgeText, { color: getLicenseColor(item.license) }]}>
            {item.license}
          </Text>
        </View>
      </View>
      <Text style={styles.licenseVersion}>v{item.version}</Text>
      <Ionicons name="chevron-forward" size={20} color="#666" style={styles.chevron} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Open Source Licenses</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="heart" size={20} color="#FF2D55" />
        <Text style={styles.infoText}>TRIOLL is built with amazing open source software</Text>
      </View>

      {/* Licenses List */}
      <FlatList
        data={mockLicenses}
        renderItem={renderLicense}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* License Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedLicense?.name}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  trigger('selection');
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.modalInfo}>
              <Text style={styles.modalVersion}>Version {selectedLicense?.version}</Text>
              <View
                style={[
                  styles.modalLicenseBadge,
                  { backgroundColor: `${getLicenseColor(selectedLicense?.license || '')}20` },
                ]}
              >
                <Text
                  style={[
                    styles.modalLicenseBadgeText,
                    { color: getLicenseColor(selectedLicense?.license || '') },
                  ]}
                >
                  {selectedLicense?.license} License
                </Text>
              </View>
            </View>

            <ScrollView style={styles.licenseTextContainer}>
              <Text style={styles.licenseText}>{selectedLicense?.licenseText}</Text>
            </ScrollView>

            {selectedLicense?.repository && (
              <Pressable style={styles.repositoryButton}>
                <Ionicons name="logo-github" size={20} color="#6366f1" />
                <Text style={styles.repositoryButtonText}>View Repository</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  licenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  licenseHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  licenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  licenseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  licenseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  licenseVersion: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginRight: 24,
  },
  chevron: {
    position: 'absolute',
    right: 16,
  },
  separator: {
    height: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  modalVersion: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  modalLicenseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  modalLicenseBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  licenseTextContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    maxHeight: 300,
  },
  licenseText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
  },
  repositoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  repositoryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
});
