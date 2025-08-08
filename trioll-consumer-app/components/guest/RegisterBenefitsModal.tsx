import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../base';
import { useApp } from '../../context/AppContext';

interface Benefit {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  guestLimit?: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: 'people-outline',
    title: 'Add Friends',
    description: "Connect with friends and see what they're playing",
    guestLimit: 'Not available',
  },
  {
    icon: 'trophy-outline',
    title: 'Earn Achievements',
    description: 'Unlock achievements and track your gaming milestones',
    guestLimit: 'Not available',
  },
  {
    icon: 'cloud-outline',
    title: 'Cloud Save',
    description: 'Your progress syncs across all devices',
    guestLimit: 'Local only',
  },
  {
    icon: 'time-outline',
    title: 'Full History',
    description: 'Access your complete trial history anytime',
    guestLimit: 'Available',
  },
  {
    icon: 'bookmark-outline',
    title: 'Unlimited Bookmarks',
    description: 'Save as many games as you want',
    guestLimit: 'Limited',
  },
  {
    icon: 'analytics-outline',
    title: 'Detailed Stats',
    description: 'View comprehensive play statistics',
    guestLimit: 'Basic only',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onRegister: () => void;
  onLogin?: () => void;
  onContinueAsGuest?: () => void;
}

export const RegisterBenefitsModal: React.FC<Props> = ({
  visible,
  onClose,
  onRegister,
  onLogin,
  onContinueAsGuest,
}) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const { guestProfile, guestTrialHistory, pendingMergeData } = useApp();
  const styles = React.useMemo(
    () => createStyles(SCREEN_WIDTH, SCREEN_HEIGHT),
    [SCREEN_WIDTH, SCREEN_HEIGHT]
  );

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRegister();
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onLogin) {
      onLogin();
    }
  };

  const renderBenefit = (benefit: Benefit, index: number) => (
    <Animated.View
      key={benefit.title}
      entering={FadeIn.delay(index * 50).duration(300)}
      style={styles.benefitItem}
    >
      <View style={styles.benefitIcon}>
        <Ionicons name={benefit.icon as unknown as any} size={24} color="#fff" />
      </View>
      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>{benefit.title}</Text>
        <Text style={styles.benefitDescription}>{benefit.description}</Text>
        {benefit.guestLimit && <Text style={styles.guestLimit}>Guest: {benefit.guestLimit}</Text>}
      </View>
    </Animated.View>
  );

  const renderTransferData = () => {
    if (!guestProfile) return null;

    const bookmarksCount = guestProfile.stats?.gamesBookmarked?.length || 0;
    const trialsCount = guestTrialHistory?.length || 0;
    const playTime = Math.floor((guestProfile.stats?.totalPlayTime || 0) / 60);

    return (
      <View style={styles.transferSection}>
        <Text style={styles.transferTitle}>What transfers when you register:</Text>
        <View style={styles.transferStats}>
          <View style={styles.transferStat}>
            <Text style={styles.transferNumber}>{trialsCount}</Text>
            <Text style={styles.transferLabel}>Trials Played</Text>
          </View>
          <View style={styles.transferStat}>
            <Text style={styles.transferNumber}>{bookmarksCount}</Text>
            <Text style={styles.transferLabel}>Bookmarks</Text>
          </View>
          <View style={styles.transferStat}>
            <Text style={styles.transferNumber}>{playTime}m</Text>
            <Text style={styles.transferLabel}>Play Time</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleClose}
      >
        <Animated.View 
          entering={SlideInDown.springify()} 
          style={styles.container}
          // Prevent the modal content from closing when tapped
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable 
              style={styles.closeButton} 
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="#999" />
            </Pressable>
            <Text style={styles.title}>Unlock Full Experience</Text>
            <Text style={styles.subtitle}>Register to access all features</Text>
          </View>

          {/* Benefits list */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {BENEFITS.map((benefit, index) => renderBenefit(benefit, index))}

            {renderTransferData()}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={onContinueAsGuest || handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.laterText}>MAYBE LATER</Text>
            </TouchableOpacity>

            {onLogin && (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.loginText}>LOGIN</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>REGISTER NOW</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (SCREEN_WIDTH: number, SCREEN_HEIGHT: number) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: '#000',
      borderTopWidth: 1,
      borderTopColor: '#333',
      maxHeight: SCREEN_HEIGHT * 0.85,
    },
    header: {
      paddingTop: 20,
      paddingBottom: 24,
      paddingHorizontal: 24,
      borderBottomWidth: 1,
      borderBottomColor: '#1a1a1a',
    },
    closeButton: {
      position: 'absolute',
      top: 20,
      right: 24,
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '300',
      color: '#fff',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: '#999',
      letterSpacing: 0.2,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    benefitItem: {
      flexDirection: 'row',
      marginBottom: 24,
    },
    benefitIcon: {
      width: 48,
      height: 48,
      backgroundColor: '#1a1a1a',
      borderWidth: 1,
      borderColor: '#333',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    benefitContent: {
      flex: 1,
    },
    benefitTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 4,
    },
    benefitDescription: {
      fontSize: 14,
      color: '#999',
      lineHeight: 18,
    },
    guestLimit: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
      fontStyle: 'italic',
    },
    transferSection: {
      marginTop: 16,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: '#1a1a1a',
    },
    transferTitle: {
      fontSize: 18,
      fontWeight: '400',
      color: '#fff',
      marginBottom: 16,
    },
    transferStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    transferStat: {
      alignItems: 'center',
    },
    transferNumber: {
      fontSize: 32,
      fontWeight: '300',
      color: '#fff',
      marginBottom: 4,
    },
    transferLabel: {
      fontSize: 12,
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 16,
      borderTopWidth: 1,
      borderTopColor: '#1a1a1a',
    },
    laterButton: {
      flex: 1,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#333',
    },
    laterText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
      letterSpacing: 1,
    },
    loginButton: {
      flex: 1,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#6366f1',
    },
    loginText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
      letterSpacing: 1,
    },
    registerButton: {
      flex: 2,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    registerText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000',
      letterSpacing: 1,
    },
  });
