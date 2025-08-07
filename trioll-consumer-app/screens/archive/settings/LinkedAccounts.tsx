
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { NavigationProp } from '../../navigation/types';

interface LinkedAccount {
  id: string;
  provider: string;
  icon: string;
  email?: string;
  username?: string;
  isLinked: boolean;
  color: string;
}

export const LinkedAccounts: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'LinkedAccounts'>>();
  const { trigger } = useHaptics();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState<LinkedAccount[]>([
    {
      id: 'google',
      provider: 'Google',
      icon: 'logo-google',
      email: 'user@gmail.com',
      isLinked: true,
      color: '#4285F4',
    },
    {
      id: 'apple',
      provider: 'Apple',
      icon: 'logo-apple',
      email: 'user@icloud.com',
      isLinked: true,
      color: '#000000',
    },
    {
      id: 'facebook',
      provider: 'Facebook',
      icon: 'logo-facebook',
      isLinked: false,
      color: '#1877F2',
    },
    {
      id: 'discord',
      provider: 'Discord',
      icon: 'logo-discord',
      username: 'TriollGamer#1234',
      isLinked: true,
      color: '#5865F2',
    },
    {
      id: 'twitch',
      provider: 'Twitch',
      icon: 'logo-twitch',
      isLinked: false,
      color: '#9146FF',
    },
    {
      id: 'steam',
      provider: 'Steam',
      icon: 'logo-steam',
      username: 'ProGamer2024',
      isLinked: true,
      color: '#1B2838',
    },
  ]);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleBack = () => {
    trigger('selection');
    navigation.goBack();
  };

  const handleToggleAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    if (account.isLinked) {
      Alert.alert(
        `Unlink ${account.provider}`,
        `Are you sure you want to unlink your ${account.provider} account?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlink',
            style: 'destructive',
            onPress: () => {
              trigger('success');
              setAccounts(accounts.map(a => (a.id === accountId ? { ...a, isLinked: false } : a)));
              showToast(`${account.provider} account unlinked`, 'success');
            },
          },
        ]
      );
    } else {
      // In a real app, this would open OAuth flow
      trigger('selection');
      showToast(`Linking ${account.provider} account...`, 'info');
      setTimeout(() => {
        setAccounts(accounts.map(a => (a.id === accountId ? { ...a, isLinked: true } : a)));
        showToast(`${account.provider} account linked!`, 'success');
      }, 1500);
    }
  };

  const handleToggleTwoFactor = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable Two-Factor Authentication',
        "You'll need to verify your email and set up an authenticator app.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => {
              trigger('success');
              setTwoFactorEnabled(true);
              showToast('Two-factor authentication enabled', 'success');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Disable Two-Factor Authentication',
        'This will make your account less secure. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => {
              trigger('warning');
              setTwoFactorEnabled(false);
              showToast('Two-factor authentication disabled', 'error');
            },
          },
        ]
      );
    }
  };

  const renderAccount = (account: LinkedAccount) => (
    <Pressable
      key={account.id}
      style={styles.accountCard}
      onPress={() => handleToggleAccount(account.id)}
    >
      <View style={[styles.accountIcon, { backgroundColor: `${account.color}20` }]}>
        <Ionicons name={account.icon as unknown as any} size={24} color={account.color} />
      </View>
      <View style={styles.accountInfo}>
        <Text style={styles.accountProvider}>{account.provider}</Text>
        {account.isLinked && (
          <Text style={styles.accountDetail}>
            {account.email || account.username || 'Connected'}
          </Text>
        )}
      </View>
      {account.isLinked ? (
        <View style={styles.linkedBadge}>
          <Text style={styles.linkedText}>Linked</Text>
        </View>
      ) : (
        <View style={styles.linkButton}>
          <Text style={styles.linkButtonText}>Link</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Linked Accounts</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Two-Factor Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.securityCard}>
            <View style={styles.securityInfo}>
              <View style={styles.securityHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#00FF88" />
                <Text style={styles.securityTitle}>Two-Factor Authentication</Text>
              </View>
              <Text style={styles.securityDescription}>
                Add an extra layer of security to your account
              </Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={handleToggleTwoFactor}
              trackColor={{ false: '#767577', true: '#00FF88' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Social Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Accounts</Text>
          <Text style={styles.sectionDescription}>
            Link your accounts for easy login and to find friends
          </Text>
          {accounts.filter(a => ['google', 'apple', 'facebook'].includes(a.id)).map(renderAccount)}
        </View>

        {/* Gaming Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gaming Accounts</Text>
          <Text style={styles.sectionDescription}>
            Connect your gaming profiles to sync achievements and friends
          </Text>
          {accounts.filter(a => ['discord', 'twitch', 'steam'].includes(a.id)).map(renderAccount)}
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Ionicons name="information-circle" size={20} color="#6366f1" />
          <View style={styles.benefitsInfo}>
            <Text style={styles.benefitsTitle}>Benefits of linking accounts</Text>
            <Text style={styles.benefitsText}>
              • Quick login with one tap{'\n'}• Find friends from other platforms{'\n'}• Sync your
              gaming achievements{'\n'}• Never lose access to your account
            </Text>
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
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  securityInfo: {
    flex: 1,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  securityDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  accountDetail: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  linkedBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  linkedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00FF88',
  },
  linkButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  benefitsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  benefitsInfo: {
    flex: 1,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  benefitsText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
  },
});
