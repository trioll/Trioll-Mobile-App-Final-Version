
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, TextInput, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '../base';
import { COUNTRIES, detectUserRegion, Country } from '../../constants/countries';

interface RegionSelectionProps {
  onSelect: (region: string, isGDPR: boolean) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export const RegionSelection: React.FC<RegionSelectionProps> = ({
  onSelect,
  onBack,
  canGoBack,
}) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  useEffect(() => {
    // Auto-detect user's region
    const detectedRegion = detectUserRegion();
    const country = COUNTRIES.find(c => c.code === detectedRegion);
    if (country) {
      setSelectedCountry(country);
    }
  }, []);

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return COUNTRIES;

    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      country =>
        country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleCountrySelect = (country: Country) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCountry(country);
  };

  const handleContinue = () => {
    if (selectedCountry) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(selectedCountry.code, selectedCountry.isGDPR);
    }
  };

  const renderCountryItem = ({ item }: { item: Country }) => {
    const isSelected = selectedCountry?.code === item.code;

    return (
      <TouchableOpacity
        style={[styles.countryItem, isSelected && styles.selectedCountryItem]}
        onPress={() => handleCountrySelect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.countryFlag}>{item.flag}</Text>
        <Text style={[styles.countryName, isSelected && styles.selectedCountryName]}>
          {item.name}
        </Text>
        {item.isGDPR && <Text style={styles.gdprBadge}>GDPR</Text>}
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Question section */}
      <View style={styles.questionSection}>
        <Text style={styles.title}>Where are you located?</Text>
        <Text style={styles.subtitle}>This helps us comply with regional privacy laws</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search countries..."
          placeholderTextColor="#444"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Country list - single column for portrait */}
      <FlatList
        data={filteredCountries}
        renderItem={renderCountryItem}
        keyExtractor={item => item.code}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Fixed navigation */}
      <View style={styles.navigation}>
        {canGoBack && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>BACK</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.continueButton,
            !selectedCountry && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={selectedCountry ? 0.7 : 1}
          disabled={!selectedCountry}
        >
          <Text style={[styles.navButtonText, !selectedCountry && styles.buttonTextDisabled]}>
            CONTINUE
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  questionSection: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
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
  },
  searchContainer: {
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  searchInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 40,
  },
  listContent: {
    paddingBottom: 120, // Space for navigation
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  selectedCountryItem: {
    borderColor: '#fff',
    backgroundColor: '#0a0a0a',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#ccc',
    fontWeight: '400',
  },
  selectedCountryName: {
    color: '#fff',
  },
  gdprBadge: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginRight: 12,
  },
  checkmark: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: '#000', // Ensure navigation is visible
  },
  navButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1,
  },
  backButton: {
    borderColor: '#333',
  },
  continueButton: {
    borderColor: '#fff',
    flex: 2, // Make continue button larger
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
