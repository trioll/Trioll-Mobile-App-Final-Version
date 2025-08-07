
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker'; // Not compatible with Expo

// Hooks & Utils
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { DURATIONS } from '../../constants/animations';
import { NavigationProp } from '../../navigation/types';

interface NotificationSettings {
  master: boolean;
  gameUpdates: {
    newGames: boolean;
    trending: boolean;
    bookmarked: boolean;
  };
  social: {
    friendRequests: boolean;
    achievements: boolean;
    leaderboards: boolean;
    challenges: boolean;
  };
  reminders: {
    incompleteTrials: boolean;
    dailyBonus: boolean;
    weeklyDigest: boolean;
  };
  email: {
    promotional: boolean;
    updates: boolean;
    newsletter: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: Date;
    endTime: Date;
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'NotificationSettings'>>();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [settings, setSettings] = useState<NotificationSettings>({
    master: true,
    gameUpdates: {
      newGames: true,
      trending: true,
      bookmarked: true,
    },
    social: {
      friendRequests: true,
      achievements: true,
      leaderboards: false,
      challenges: true,
    },
    reminders: {
      incompleteTrials: true,
      dailyBonus: false,
      weeklyDigest: true,
    },
    email: {
      promotional: false,
      updates: true,
      newsletter: true,
    },
    quietHours: {
      enabled: false,
      startTime: new Date(2024, 0, 1, 22, 0), // 10 PM
      endTime: new Date(2024, 0, 1, 8, 0), // 8 AM
    },
    soundEnabled: true,
    vibrationEnabled: true,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBack = () => {
    haptics.impact('light');
    navigation.goBack();
  };

  const updateSetting = (path: string[], value: boolean) => {
    haptics.impact('light');
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings as Record<string, any>;

      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return newSettings;
    });
    showToast('Notification preference updated', 'success');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderSection = (
    title: string,
    description: string,
    settings: { [key: string]: boolean },
    basePath: string[]
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>

      {Object.entries(settings).map(([key, value]) => (
        <View key={key} style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </Text>
          <Switch
            value={value}
            onValueChange={val => updateSetting([...basePath, key], val)}
            trackColor={{ false: '#39393D', true: '#00FF88' }}
            thumbColor="#FFFFFF"
            disabled={!settings.master && basePath[0] !== 'email'}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Notifications</Text>

        <View style={styles.headerRight} />
      </SafeAreaView>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Toggle */}
        <View style={styles.masterToggle}>
          <View style={styles.masterToggleContent}>
            <Ionicons name="notifications" size={32} color="#FFFFFF" />
            <View style={styles.masterToggleText}>
              <Text style={styles.masterToggleTitle}>Push Notifications</Text>
              <Text style={styles.masterToggleDescription}>
                Allow TRIOLL to send you notifications
              </Text>
            </View>
          </View>
          <Switch
            value={settings.master}
            onValueChange={value => updateSetting(['master'], value)}
            trackColor={{ false: '#39393D', true: '#00FF88' }}
            thumbColor="#FFFFFF"
            style={styles.masterSwitch}
          />
        </View>

        {!settings.master && (
          <View style={styles.disabledBanner}>
            <Ionicons name="information-circle" size={20} color="#FF9500" />
            <Text style={styles.disabledText}>
              Push notifications are disabled. Enable them to customize preferences.
            </Text>
          </View>
        )}

        {/* Game Updates */}
        {renderSection(
          'GAME UPDATES',
          'Stay informed about new and popular games',
          settings.gameUpdates,
          ['gameUpdates']
        )}

        {/* Social */}
        {renderSection('SOCIAL', 'Updates from friends and the community', settings.social, [
          'social',
        ])}

        {/* Reminders */}
        {renderSection(
          'REMINDERS',
          'Helpful nudges to enhance your experience',
          settings.reminders,
          ['reminders']
        )}

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATION SETTINGS</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Sound</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={value => updateSetting(['soundEnabled'], value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
              disabled={!settings.master}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Vibration</Text>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={value => updateSetting(['vibrationEnabled'], value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
              disabled={!settings.master}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>QUIET HOURS</Text>
            <Text style={styles.sectionDescription}>
              Silence notifications during specific times
            </Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
            <Switch
              value={settings.quietHours.enabled}
              onValueChange={value => updateSetting(['quietHours', 'enabled'], value)}
              trackColor={{ false: '#39393D', true: '#00FF88' }}
              thumbColor="#FFFFFF"
              disabled={!settings.master}
            />
          </View>

          {settings.quietHours.enabled && (
            <>
              <Pressable style={styles.timeRow} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <View style={styles.timeValue}>
                  <Text style={styles.timeText}>{formatTime(settings.quietHours.startTime)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              </Pressable>

              <Pressable style={styles.timeRow} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.timeLabel}>End Time</Text>
                <View style={styles.timeValue}>
                  <Text style={styles.timeText}>{formatTime(settings.quietHours.endTime)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              </Pressable>
            </>
          )}
        </View>

        {/* Email Preferences */}
        {renderSection(
          'EMAIL NOTIFICATIONS',
          'Control what emails you receive from TRIOLL',
          settings.email,
          ['email']
        )}

        {/* Test Notification */}
        <Pressable
          style={styles.testButton}
          onPress={() => {
            haptics.impact('medium');
            showToast('Test notification sent!', 'success');
          }}
        >
          <Ionicons name="send" size={20} color="#00FFFF" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </Pressable>
      </Animated.ScrollView>

      {/* Time Pickers - Using mock implementation */}
      {(showStartPicker || showEndPicker) && (
        <View style={styles.mockTimePicker}>
          <View style={styles.mockTimePickerContent}>
            <Text style={styles.mockTimePickerTitle}>
              {showStartPicker ? 'Set Start Time' : 'Set End Time'}
            </Text>
            <Text style={styles.mockTimePickerInfo}>Time picker coming soon</Text>
            <Pressable
              style={styles.mockTimePickerButton}
              onPress={() => {
                setShowStartPicker(false);
                setShowEndPicker(false);
                showToast('Time picker not yet implemented', 'info');
              }}
            >
              <Text style={styles.mockTimePickerButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  masterToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterToggleText: {
    marginLeft: 16,
    flex: 1,
  },
  masterToggleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  masterToggleDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  masterSwitch: {
    transform: [{ scale: 1.2 }],
  },
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,149,0,0.1)',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
  },
  disabledText: {
    color: '#FF9500',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  timeLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.1)',
    margin: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  testButtonText: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  mockTimePicker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockTimePickerContent: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
  },
  mockTimePickerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  mockTimePickerInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 20,
  },
  mockTimePickerButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mockTimePickerButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
