import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../base';
import { useApp } from '../../context/AppContext';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionText?: string;
}

export const GuestLimitationCard: React.FC<Props> = ({
  icon,
  title,
  description,
  actionText = 'Register to unlock',
}) => {
  const { showRegisterModal } = useApp();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showRegisterModal();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as unknown as any} size={32} color="#333" />
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={16} color="#666" />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <TouchableOpacity style={styles.actionButton} onPress={handlePress} activeOpacity={0.7}>
        <Text style={styles.actionText}>{actionText}</Text>
        <Ionicons name="chevron-forward" size={16} color="#999" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 20,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  lockIcon: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
  },
});
