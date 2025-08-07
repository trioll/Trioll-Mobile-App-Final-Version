
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { NavigationProp } from '../../navigation/types';

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  value: boolean;
  icon: string;
}

export const PrivacySettings: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'PrivacySettings'>>();
  const { trigger } = useHaptics();
  const { showToast } = useToast();

  const [profileVisibility, setProfileVisibility] = useState('friends');
  const [activityVisibility, setActivityVisibility] = useState('friends');
  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: 'onlineStatus',
      title: 'Show Online Status',
      description: "Let others see when you're online",
      value: true,
      icon: 'ellipse',
    },
    {
      id: 'gameActivity',
      title: 'Share Game Activity',
      description: "Show what games you're playing",
      value: true,
      icon: 'game-controller',
    },
    {
      id: 'achievements',
      title: 'Public Achievements',
      description: 'Display your achievements on your profile',
      value: true,
      icon: 'trophy',
    },
    {
      id: 'friendRequests',
      title: 'Allow Friend Requests',
      description: 'Let other players send you friend requests',
      value: true,
      icon: 'person-add',
    },
    {
      id: 'messages',
      title: 'Allow Messages',
      description: 'Receive messages from non-friends',
      value: false,
      icon: 'chatbubble',
    },
    {
      id: 'dataCollection',
      title: 'Analytics & Improvements',
      description: 'Help improve TRIOLL with anonymous usage data',
      value: true,
      icon: 'analytics',
    },
    {
      id: 'personalizedAds',
      title: 'Personalized Recommendations',
      description: 'Get game suggestions based on your play history',
      value: true,
      icon: 'sparkles',
    },
  ]);

  const handleBack = () => {
    trigger('selection');
    navigation.goBack();
  };

  const handleToggleSetting = (settingId: string) => {
    const setting = privacySettings.find(s => s.id === settingId);
    if (!setting) return;

    if (settingId === 'dataCollection' && setting.value) {
      Alert.alert(
        'Disable Analytics',
        'This helps us improve TRIOLL. Are you sure you want to opt out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            onPress: () => {
              updateSetting(settingId);
            },
          },
        ]
      );
    } else {
      updateSetting(settingId);
    }
  };

  const updateSetting = (settingId: string) => {
    trigger('selection');
    setPrivacySettings(settings =>
      settings.map(s => (s.id === settingId ? { ...s, value: !s.value } : s))
    );
    showToast('Privacy settings updated', 'success');
  };

  const handleVisibilityChange = (type: 'profile' | 'activity', value: string) => {
    trigger('selection');
    if (type === 'profile') {
      setProfileVisibility(value);
    } else {
      setActivityVisibility(value);
    }
    showToast('Visibility settings updated', 'success');
  };

  const renderVisibilityOption = (
    type: 'profile' | 'activity',
    value: string,
    label: string,
    description: string
  ) => {
    const isSelected =
      type === 'profile' ? profileVisibility === value : activityVisibility === value;

    return (
      <Pressable
        style={[styles.visibilityOption, isSelected && styles.visibilityOptionSelected]}
        onPress={() => handleVisibilityChange(type, value)}
      >
        <View style={styles.visibilityContent}>
          <Text style={styles.visibilityLabel}>{label}</Text>
          <Text style={styles.visibilityDescription}>{description}</Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color="#00FF88" />}
      </Pressable>
    );
  };

  const renderPrivacySetting = (setting: PrivacySetting) => (
    <View key={setting.id} style={styles.settingCard}>
      <View style={styles.settingIcon}>
        <Ionicons name={setting.icon as unknown as any} size={24} color="#6366f1" />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{setting.title}</Text>
        <Text style={styles.settingDescription}>{setting.description}</Text>
      </View>
      <Switch
        value={setting.value}
        onValueChange={() => handleToggleSetting(setting.id)}
        trackColor={{ false: '#767577', true: '#00FF88' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Visibility</Text>
          <Text style={styles.sectionDescription}>
            Control who can see your profile information
          </Text>
          {renderVisibilityOption(
            'profile',
            'everyone',
            'Everyone',
            'Anyone can view your profile'
          )}
          {renderVisibilityOption(
            'profile',
            'friends',
            'Friends Only',
            'Only friends can see your full profile'
          )}
          {renderVisibilityOption('profile', 'private', 'Private', 'Nobody can view your profile')}
        </View>

        {/* Activity Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Visibility</Text>
          <Text style={styles.sectionDescription}>Choose who can see your gaming activity</Text>
          {renderVisibilityOption(
            'activity',
            'everyone',
            'Everyone',
            'All players can see your activity'
          )}
          {renderVisibilityOption(
            'activity',
            'friends',
            'Friends Only',
            'Only friends see what you play'
          )}
          {renderVisibilityOption(
            'activity',
            'private',
            'Hidden',
            'Your activity is completely private'
          )}
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Controls</Text>
          {privacySettings.map(renderPrivacySetting)}
        </View>

        {/* Privacy Info */}
        <View style={styles.infoCard}>
          <Ionicons name="lock-closed" size={24} color="#6366f1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Your Privacy Matters</Text>
            <Text style={styles.infoText}>
              We take your privacy seriously. Your data is encrypted and never shared without your
              consent. Read our Privacy Policy for more details.
            </Text>
            <Pressable style={styles.policyButton}>
              <Text style={styles.policyButtonText}>Privacy Policy</Text>
              <Ionicons name="arrow-forward" size={16} color="#6366f1" />
            </Pressable>
          </View>
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 16,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visibilityOptionSelected: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  visibilityContent: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  visibilityDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 12,
  },
  policyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  policyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
});
