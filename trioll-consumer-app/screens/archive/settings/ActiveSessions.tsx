import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { NavigationProp } from '../../navigation/types';

// Mock data for active sessions
const mockSessions = [
  {
    id: '1',
    device: 'iPhone 14 Pro',
    location: 'San Francisco, CA',
    lastActive: 'Currently active',
    isCurrent: true,
    deviceType: 'phone' as string,
  },
  {
    id: '2',
    device: 'iPad Pro',
    location: 'San Francisco, CA',
    lastActive: '2 hours ago',
    isCurrent: false,
    deviceType: 'tablet' as string,
  },
  {
    id: '3',
    device: 'Chrome on MacBook',
    location: 'Los Angeles, CA',
    lastActive: '1 day ago',
    isCurrent: false,
    deviceType: 'laptop' as string,
  },
  {
    id: '4',
    device: 'Safari on Mac',
    location: 'New York, NY',
    lastActive: '3 days ago',
    isCurrent: false,
    deviceType: 'laptop' as string,
  },
];

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  deviceType: string;
}

export const ActiveSessions: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'ActiveSessions'>>();
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    trigger('selection');
    navigation.goBack();
  };

  const handleEndSession = (sessionId: string) => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this session? The device will be logged out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            trigger('success');
            setSessions(sessions.filter(s => s.id !== sessionId));
            showToast('Session ended successfully', 'success');
          },
        },
      ]
    );
  };

  const handleEndAllSessions = () => {
    Alert.alert(
      'End All Sessions',
      'This will log you out of all devices except this one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End All Sessions',
          style: 'destructive',
          onPress: () => {
            trigger('success');
            setSessions(sessions.filter(s => s.isCurrent));
            showToast('All other sessions ended', 'success');
          },
        },
      ]
    );
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'phone':
        return 'phone-portrait-outline';
      case 'tablet':
        return 'tablet-portrait-outline';
      case 'laptop':
        return 'laptop-outline';
      default:
        return 'hardware-chip-outline';
    }
  };

  const renderSession = ({ item }: { item: Session }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionContent}>
        <View style={styles.deviceIcon}>
          <Ionicons
            name={getDeviceIcon(item.deviceType) as keyof typeof Ionicons.glyphMap}
            size={24}
            color="#6366f1"
          />
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionHeader}>
            <Text style={styles.deviceName}>{item.device}</Text>
            {item.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>This device</Text>
              </View>
            )}
          </View>
          <Text style={styles.location}>
            <Ionicons name="location-outline" size={12} color="#666" /> {item.location}
          </Text>
          <Text style={styles.lastActive}>{item.lastActive}</Text>
        </View>
      </View>
      {!item.isCurrent && (
        <Pressable style={styles.endButton} onPress={() => handleEndSession(item.id)}>
          <Text style={styles.endButtonText}>End</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#6366f1" />
        <Text style={styles.infoText}>
          These are all the devices currently logged into your account
        </Text>
      </View>

      {/* Sessions List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          <FlatList
            data={sessions}
            renderItem={renderSession}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {/* End All Sessions Button */}
          {sessions.length > 1 && (
            <View style={styles.bottomContainer}>
              <Pressable onPress={handleEndAllSessions}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF5252']}
                  style={styles.endAllButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.endAllButtonText}>End All Other Sessions</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </>
      )}
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
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  currentBadge: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  location: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 2,
  },
  lastActive: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.4,
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  separator: {
    height: 12,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  endAllButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  endAllButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
