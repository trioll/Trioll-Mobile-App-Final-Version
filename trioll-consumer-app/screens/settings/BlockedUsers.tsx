
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useHaptics } from '../../hooks/useHaptics';
import { useToast } from '../../hooks/useToast';
import { NavigationProp } from '../../navigation/types';
import { generateAvatar } from '../../src/utils/avatarGenerator';

// Mock data for blocked users
const mockBlockedUsers = [
  {
    id: '1',
    username: 'toxic_player_99',
    displayName: 'ToxicGamer',
    avatar: generateAvatar('1', 'ToxicGamer'),
    blockedDate: '2024-12-15',
    reason: 'Harassment',
  },
  {
    id: '2',
    username: 'spammer_2024',
    displayName: 'SpamBot',
    avatar: generateAvatar('2', 'SpamBot'),
    blockedDate: '2024-11-20',
    reason: 'Spam',
  },
  {
    id: '3',
    username: 'cheater_pro',
    displayName: 'CheaterPro',
    avatar: generateAvatar('3', 'CheaterPro'),
    blockedDate: '2024-10-05',
    reason: 'Cheating',
  },
];

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  blockedDate: string;
  reason: string;
}

export const BlockedUsers: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'BlockedUsers'>>();
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(mockBlockedUsers);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBack = () => {
    trigger('selection');
    navigation.goBack();
  };

  const handleUnblockUser = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.displayName}? They will be able to interact with you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: () => {
            trigger('success');
            setBlockedUsers(blockedUsers.filter(u => u.id !== user.id));
            showToast(`${user.displayName} has been unblocked`, 'success');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userCard}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.username}>@{item.username}</Text>
        <View style={styles.metadata}>
          <Text style={styles.blockedDate}>Blocked {formatDate(item.blockedDate)}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.reason}>{item.reason}</Text>
        </View>
      </View>
      <Pressable style={styles.unblockButton} onPress={() => handleUnblockUser(item)}>
        <Text style={styles.unblockButtonText}>Unblock</Text>
      </Pressable>
    </View>
  );

  const filteredUsers = blockedUsers.filter(
    user =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark" size={20} color="#6366f1" />
        <Text style={styles.infoText}>
          Blocked users cannot send you messages, friend requests, or see your activity
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search blocked users..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Blocked Users List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-checkmark" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No blocked users match your search' : "You haven't blocked anyone yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderBlockedUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedDate: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.4,
  },
  separator: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.4,
    marginHorizontal: 6,
  },
  reason: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    textAlign: 'center',
  },
});
