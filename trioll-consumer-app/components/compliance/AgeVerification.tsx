import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '../base';

interface AgeVerificationProps {
  onVerify: (age: number, birthDate: Date) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export const AgeVerification: React.FC<AgeVerificationProps> = ({ onVerify }) => {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateText, setDateText] = useState('');

  const scale = useSharedValue(1);
  const errorShake = useSharedValue(0);

  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    return age;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setBirthDate(selectedDate);
      const formatted = selectedDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });
      setDateText(formatted);
    }
  };

  const handleVerify = () => {
    if (!birthDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      errorShake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      return;
    }

    const age = calculateAge(birthDate);

    if (age < 13) {
      Alert.alert('Age Requirement', 'You must be 13 or older to use TRIOLL.', [{ text: 'OK' }]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVerify(age, birthDate);
  };

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: errorShake.value }],
    };
  });

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Question centered with more space in portrait */}
        <View style={styles.questionSection}>
          <Text style={styles.title}>How old are you?</Text>
          <Text style={styles.subtitle}>We need to verify your age for legal compliance</Text>
        </View>

        {/* Input in middle with portrait spacing */}
        <View style={styles.inputSection}>
        <Animated.View style={animatedInputStyle}>
          <TouchableOpacity
            style={[styles.dateInput, dateText && styles.dateInputFilled]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateInputLabel}>BIRTHDAY</Text>
            <Text style={[styles.dateInputText, !dateText && styles.placeholder]}>
              {dateText || 'MM/DD/YYYY'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {showDatePicker && (
          <DateTimePicker
            value={birthDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            style={styles.datePicker}
            textColor="#fff"
          />
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your birthday helps us provide age-appropriate content and comply with privacy laws
          </Text>
        </View>
        </View>
      </ScrollView>

      {/* Fixed bottom navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.continueButton, !birthDate && styles.buttonDisabled]}
          onPress={handleVerify}
          activeOpacity={birthDate ? 0.7 : 1}
          disabled={!birthDate}
        >
          <Text style={[styles.navButtonText, !birthDate && styles.buttonTextDisabled]}>
            CONTINUE
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  questionSection: {
    paddingTop: 80, // More space in portrait
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32, // Larger in portrait
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  dateInput: {
    height: 64, // Taller in portrait
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 24,
    justifyContent: 'center',
    marginBottom: 20,
  },
  dateInputFilled: {
    borderColor: '#666',
  },
  dateInputLabel: {
    fontSize: 11,
    color: '#666',
    letterSpacing: 1,
    marginBottom: 6,
  },
  dateInputText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '400',
  },
  placeholder: {
    color: '#444',
  },
  datePicker: {
    backgroundColor: '#000',
    marginVertical: 20,
  },
  infoBox: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  navigation: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  navButton: {
    height: 56, // Taller buttons in portrait
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1,
  },
  continueButton: {
    borderColor: '#fff',
  },
  buttonDisabled: {
    borderColor: '#333',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
  },
  buttonTextDisabled: {
    color: '#444',
  },
});
