import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { DS } from '../../src/styles/TriollDesignSystem';
import { GlassButton } from '../../src/components/core';
import { useHaptics } from '../../hooks/useHaptics';

interface PurchaseIntentModalProps {
  visible: boolean;
  onResponse: (response: 'yes' | 'no' | 'skip') => void;
  gameName?: string;
}

export const PurchaseIntentModal: React.FC<PurchaseIntentModalProps> = ({
  visible,
  onResponse,
  gameName = 'this game',
}) => {
  const haptics = useHaptics();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleResponse = (response: 'yes' | 'no' | 'skip') => {
    haptics.impact(response === 'skip' ? 'light' : 'medium');
    onResponse(response);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: opacityAnim,
          }
        ]}
      >
        <BlurView intensity={40} style={StyleSheet.absoluteFillObject} />
        
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="cart" size={48} color={DS.colors.primary} />
          </View>

          <Text style={styles.title}>Would you buy {gameName}?</Text>
          <Text style={styles.subtitle}>
            Help us bring you games you'll love
          </Text>

          <View style={styles.buttonContainer}>
            <GlassButton
              variant="primary"
              size="large"
              onPress={() => handleResponse('yes')}
              style={[styles.button, styles.yesButton]}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color="#000" 
                style={styles.buttonIcon}
              />
              <Text style={styles.yesButtonText}>Yes</Text>
            </GlassButton>

            <GlassButton
              variant="surface"
              size="large"
              onPress={() => handleResponse('no')}
              style={[styles.button, styles.noButton]}
            >
              <Ionicons 
                name="close-circle" 
                size={24} 
                color={DS.colors.textPrimary} 
                style={styles.buttonIcon}
              />
              <Text style={styles.noButtonText}>No</Text>
            </GlassButton>
          </View>

          <Pressable
            style={styles.skipButton}
            onPress={() => handleResponse('skip')}
            hitSlop={20}
          >
            <Text style={styles.skipText}>Ask me later</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusLarge,
    padding: DS.spacing.xl,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.colors.border,
    ...DS.effects.glassSurface,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${DS.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.spacing.lg,
  },
  title: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: DS.colors.textPrimary,
    textAlign: 'center',
    marginBottom: DS.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: DS.colors.textSecondary,
    textAlign: 'center',
    marginBottom: DS.spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: DS.spacing.md,
    marginBottom: DS.spacing.lg,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.spacing.md,
  },
  buttonIcon: {
    marginRight: DS.spacing.xs,
  },
  yesButton: {
    backgroundColor: DS.colors.success,
    shadowColor: DS.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  noButton: {
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.colors.textPrimary,
  },
  skipButton: {
    paddingVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.lg,
  },
  skipText: {
    fontSize: 14,
    color: DS.colors.textMuted,
    textDecorationLine: 'underline',
  },
});