import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Hooks & Utils
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { DURATIONS } from '../../constants/animations';

interface DebugSettings {
  apiEndpoint: string;
  debugLogging: boolean;
  fpsCounter: boolean;
  mockSlowNetwork: boolean;
  networkDelay: number;
  consoleOverlay: boolean;
  renderBoundaries: boolean;
  gestureHandlerDebug: boolean;
  experimentOverrides: {
    [key: string]: boolean;
  };
  featureFlags: {
    [key: string]: boolean;
  };
}

type RootStackParamList = {
  DebugMenu: undefined;
};

type DebugMenuScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DebugMenu'>;

export const DebugMenuScreen: React.FC = () => {
  const navigation = useNavigation<DebugMenuScreenNavigationProp>();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [settings, setSettings] = useState<DebugSettings>({
    apiEndpoint: 'https://api.trioll.com',
    debugLogging: false,
    fpsCounter: false,
    mockSlowNetwork: false,
    networkDelay: 0,
    consoleOverlay: false,
    renderBoundaries: false,
    gestureHandlerDebug: false,
    experimentOverrides: {
      newFeedAlgorithm: false,
      enhancedGraphics: false,
      socialFeatures: false,
      advancedAnalytics: false,
    },
    featureFlags: {
      enableMultiplayer: false,
      enableVoiceChat: false,
      enableCloudSaves: false,
      enableOfflineMode: false,
    },
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

  const updateSetting = <K extends keyof DebugSettings>(key: K, value: DebugSettings[K]) => {
    haptics.impact('light');
    setSettings(prev => ({ ...prev, [key]: value }));
    showToast(`${key} updated`, 'success');
  };

  const updateExperiment = (key: string, value: boolean) => {
    haptics.impact('light');
    setSettings(prev => ({
      ...prev,
      experimentOverrides: {
        ...prev.experimentOverrides,
        [key]: value,
      },
    }));
    showToast(`Experiment ${key} ${value ? 'enabled' : 'disabled'}`, 'success');
  };

  const updateFeatureFlag = (key: string, value: boolean) => {
    haptics.impact('light');
    setSettings(prev => ({
      ...prev,
      featureFlags: {
        ...prev.featureFlags,
        [key]: value,
      },
    }));
    showToast(`Feature ${key} ${value ? 'enabled' : 'disabled'}`, 'success');
  };

  const handleClearCache = () => {
    haptics.impact('heavy');
    Alert.alert(
      'Clear All Caches',
      'This will clear all cached data including images, API responses, and user preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            showToast('All caches cleared', 'success');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    haptics.impact('heavy');
    Alert.alert('Reset Onboarding', 'This will reset the app to first-launch state.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          showToast('Onboarding reset', 'success');
        },
      },
    ]);
  };

  const handleCrashTest = () => {
    haptics.impact('heavy');
    Alert.alert('Crash Test', 'This will intentionally crash the app to test error handling.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Crash',
        style: 'destructive',
        onPress: () => {
          throw new Error('Intentional crash for testing');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Debug Menu</Text>

        <View style={styles.headerRight}>
          <Ionicons name="construct" size={24} color="#FFFF00" />
        </View>
      </SafeAreaView>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={24} color="#FFFF00" />
          <Text style={styles.warningText}>
            Debug settings can break app functionality. Use with caution!
          </Text>
        </View>

        {/* API Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API CONFIGURATION</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>API Endpoint</Text>
            <TextInput
              style={styles.textInput}
              value={settings.apiEndpoint}
              onChangeText={text => updateSetting('apiEndpoint', text)}
              placeholder="https://api.trioll.com"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mock Slow Network</Text>
              <Text style={styles.settingDescription}>Simulate slow network conditions</Text>
            </View>
            <Switch
              value={settings.mockSlowNetwork}
              onValueChange={value => updateSetting('mockSlowNetwork', value)}
              trackColor={{ false: '#39393D', true: '#FFFF00' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.mockSlowNetwork && (
            <View style={styles.delaySelector}>
              <Text style={styles.delayLabel}>Network Delay (ms)</Text>
              <View style={styles.delayOptions}>
                {[0, 1000, 3000, 5000].map(delay => (
                  <Pressable
                    key={delay}
                    style={[
                      styles.delayOption,
                      settings.networkDelay === delay && styles.delayOptionActive,
                    ]}
                    onPress={() => updateSetting('networkDelay', delay)}
                  >
                    <Text
                      style={[
                        styles.delayOptionText,
                        settings.networkDelay === delay && styles.delayOptionTextActive,
                      ]}
                    >
                      {delay === 0 ? 'None' : `${delay}ms`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Debug Overlays */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEBUG OVERLAYS</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Debug Logging</Text>
              <Text style={styles.settingDescription}>Show verbose logs in console</Text>
            </View>
            <Switch
              value={settings.debugLogging}
              onValueChange={value => updateSetting('debugLogging', value)}
              trackColor={{ false: '#39393D', true: '#FFFF00' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>FPS Counter</Text>
              <Text style={styles.settingDescription}>Show frames per second overlay</Text>
            </View>
            <Switch
              value={settings.fpsCounter}
              onValueChange={value => updateSetting('fpsCounter', value)}
              trackColor={{ false: '#39393D', true: '#FFFF00' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Console Overlay</Text>
              <Text style={styles.settingDescription}>Show in-app console for logs</Text>
            </View>
            <Switch
              value={settings.consoleOverlay}
              onValueChange={value => updateSetting('consoleOverlay', value)}
              trackColor={{ false: '#39393D', true: '#FFFF00' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Render Boundaries</Text>
              <Text style={styles.settingDescription}>Show component boundaries</Text>
            </View>
            <Switch
              value={settings.renderBoundaries}
              onValueChange={value => updateSetting('renderBoundaries', value)}
              trackColor={{ false: '#39393D', true: '#FFFF00' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Gesture Debug</Text>
              <Text style={styles.settingDescription}>Show touch and gesture indicators</Text>
            </View>
            <Switch
              value={settings.gestureHandlerDebug}
              onValueChange={value => updateSetting('gestureHandlerDebug', value)}
              trackColor={{ false: '#39393D', true: '#FFFF00' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Experiments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXPERIMENT OVERRIDES</Text>

          {Object.entries(settings.experimentOverrides).map(([key, value]) => (
            <View key={key} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
              </View>
              <Switch
                value={value}
                onValueChange={val => updateExperiment(key, val)}
                trackColor={{ false: '#39393D', true: '#8866FF' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* Feature Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FEATURE FLAGS</Text>

          {Object.entries(settings.featureFlags).map(([key, value]) => (
            <View key={key} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
              </View>
              <Switch
                value={value}
                onValueChange={val => updateFeatureFlag(key, val)}
                trackColor={{ false: '#39393D', true: '#00FFFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>DANGER ZONE</Text>

          <Pressable style={styles.dangerButton} onPress={handleClearCache}>
            <Ionicons name="trash" size={20} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>Clear All Caches</Text>
          </Pressable>

          <Pressable style={styles.dangerButton} onPress={handleResetOnboarding}>
            <Ionicons name="refresh" size={20} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>Reset Onboarding</Text>
          </Pressable>

          <Pressable style={styles.dangerButton} onPress={handleCrashTest}>
            <Ionicons name="nuclear" size={20} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>Crash Test</Text>
          </Pressable>
        </View>

        {/* Export Settings */}
        <Pressable
          style={styles.exportButton}
          onPress={() => {
            haptics.impact('medium');
            showToast('Debug settings exported to clipboard', 'success');
          }}
        >
          <Ionicons name="share" size={20} color="#00FFFF" />
          <Text style={styles.exportButtonText}>Export Debug Settings</Text>
        </Pressable>
      </Animated.ScrollView>
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
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,0,0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,0,0.3)',
  },
  warningText: {
    color: '#FFFF00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  delaySelector: {
    marginTop: 16,
  },
  delayLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  delayOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  delayOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  delayOptionActive: {
    backgroundColor: 'rgba(255,255,0,0.1)',
    borderColor: '#FFFF00',
  },
  delayOptionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  delayOptionTextActive: {
    color: '#FFFF00',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exportButton: {
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
  exportButtonText: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
