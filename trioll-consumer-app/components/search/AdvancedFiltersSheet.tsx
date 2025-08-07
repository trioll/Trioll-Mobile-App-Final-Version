import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Animated, Dimensions, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchFilters } from '../../screens/SearchScreen';

interface AdvancedFiltersSheetProps {
  visible: boolean;
  filters: SearchFilters;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}

const GENRES = [
  { name: 'Action', color: '#FF0066' }, // Hot pink - high energy
  { name: 'Puzzle', color: '#00FFFF' }, // Cyan - mental clarity
  { name: 'Strategy', color: '#8866FF' }, // Purple - thinking
  { name: 'Racing', color: '#FFAA00' }, // Orange - speed
  { name: 'Sports', color: '#00FF66' }, // Green - outdoors
  { name: 'Casual', color: '#FF66FF' }, // Light purple - fun
  { name: 'RPG', color: '#0088FF' }, // Blue - fantasy
  { name: 'Simulation', color: '#FFFF00' }, // Yellow - creativity
  { name: 'Adventure', color: '#00FFAA' }, // Teal - exploration
];

export const AdvancedFiltersSheet: React.FC<AdvancedFiltersSheetProps> = ({
  visible,
  filters,
  onClose,
  onApply,
}) => {
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.95;
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const styles = React.useMemo(() => createStyles(SHEET_HEIGHT), [SHEET_HEIGHT]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const toggleGenre = (genre: string) => {
    setLocalFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const resetFilters = () => {
    setLocalFilters({
      genres: [],
      platform: 'all',
      ageRating: 'all',
      trialDuration: { min: 3, max: 7 },
      playerCount: 'any',
      releaseDate: 'any',
      minRating: 0,
      hasAchievements: false,
      isMultiplayer: false,
      isOfflineCapable: false,
      languages: [],
      newThisWeek: false,
      highlyRated: false,
      trending: false,
      hiddenGems: false,
    });
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle Bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Genre Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genre</Text>
            <View style={styles.genreGrid}>
              {GENRES.map(genre => {
                const isActive = localFilters.genres.includes(genre.name);
                return (
                  <Pressable
                    key={genre.name}
                    style={[styles.genreItem, isActive && styles.genreItemActive]}
                    onPress={() => toggleGenre(genre.name)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isActive && {
                          ...styles.checkboxActive,
                          backgroundColor: genre.color,
                          borderColor: genre.color,
                          shadowColor: genre.color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.6,
                          shadowRadius: 6,
                          elevation: 6,
                        },
                      ]}
                    >
                      {isActive && <Ionicons name="checkmark" size={16} color="#000000" />}
                    </View>
                    <Text
                      style={[
                        styles.genreText,
                        isActive && {
                          ...styles.genreTextActive,
                          color: genre.color,
                          textShadowColor: genre.color,
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 3,
                        },
                      ]}
                    >
                      {genre.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Platform Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform</Text>
            <View style={styles.radioGroup}>
              {['all', 'ios', 'android'].map(platform => (
                <Pressable
                  key={platform}
                  style={styles.radioItem}
                  onPress={() =>
                    setLocalFilters(prev => ({
                      ...prev,
                      platform: platform as 'all' | 'ios' | 'android',
                    }))
                  }
                >
                  <View
                    style={[styles.radio, localFilters.platform === platform && styles.radioActive]}
                  >
                    {localFilters.platform === platform && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>
                    {platform === 'all' ? 'All' : platform.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Age Rating Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age Rating</Text>
            <View style={styles.radioGroup}>
              {['all', 'everyone', 'teen', 'mature'].map(rating => (
                <Pressable
                  key={rating}
                  style={styles.radioItem}
                  onPress={() =>
                    setLocalFilters(prev => ({
                      ...prev,
                      ageRating: rating as 'all' | 'everyone' | 'teen' | 'mature',
                    }))
                  }
                >
                  <View
                    style={[styles.radio, localFilters.ageRating === rating && styles.radioActive]}
                  >
                    {localFilters.ageRating === rating && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>
                    {rating.charAt(0).toUpperCase() + rating.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* PHASE 3 - Trial Duration Section removed for simplification */}
          {/* <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trial Duration</Text>
            <View style={styles.trialDurationContainer}>
              <Text style={styles.trialDurationText}>
                {localFilters.trialDuration.min} - {localFilters.trialDuration.max} minutes
              </Text>
              <View style={styles.durationButtons}>
                {[3, 4, 5, 6, 7].map(duration => (
                  <Pressable
                    key={duration}
                    style={[
                      styles.durationButton,
                      localFilters.trialDuration.min <= duration &&
                        localFilters.trialDuration.max >= duration &&
                        styles.durationButtonActive,
                    ]}
                    onPress={() => {
                      if (
                        duration === localFilters.trialDuration.min &&
                        duration === localFilters.trialDuration.max
                      ) {
                        // Reset to full range
                        setLocalFilters(prev => ({
                          ...prev,
                          trialDuration: { min: 3, max: 7 },
                        }));
                      } else {
                        setLocalFilters(prev => ({
                          ...prev,
                          trialDuration: { min: duration, max: duration },
                        }));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        localFilters.trialDuration.min <= duration &&
                          localFilters.trialDuration.max >= duration &&
                          styles.durationButtonTextActive,
                      ]}
                    >
                      {duration}m
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View> */}

          {/* Other Filters Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Filters</Text>
            <View style={styles.otherFilters}>
              {[
                { key: 'newThisWeek', label: 'New this week' },
                { key: 'highlyRated', label: 'Highly rated (4+ stars)' },
                { key: 'trending', label: 'Trending now' },
                { key: 'hiddenGems', label: 'Hidden gems (<1000 plays)' },
              ].map(filter => (
                <Pressable
                  key={filter.key}
                  style={styles.checkboxRow}
                  onPress={() =>
                    setLocalFilters(prev => ({
                      ...prev,
                      [filter.key]: !prev[filter.key as keyof SearchFilters],
                    }))
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      localFilters[filter.key as keyof SearchFilters] && {
                        ...styles.checkboxActive,
                        backgroundColor:
                          filter.key === 'newThisWeek'
                            ? '#FFFF00'
                            : filter.key === 'highlyRated'
                              ? '#FFD700'
                              : filter.key === 'trending'
                                ? '#FF0066'
                                : '#00FFAA',
                        borderColor:
                          filter.key === 'newThisWeek'
                            ? '#FFFF00'
                            : filter.key === 'highlyRated'
                              ? '#FFD700'
                              : filter.key === 'trending'
                                ? '#FF0066'
                                : '#00FFAA',
                        shadowColor:
                          filter.key === 'newThisWeek'
                            ? '#FFFF00'
                            : filter.key === 'highlyRated'
                              ? '#FFD700'
                              : filter.key === 'trending'
                                ? '#FF0066'
                                : '#00FFAA',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.6,
                        shadowRadius: 6,
                        elevation: 6,
                      },
                    ]}
                  >
                    {localFilters[filter.key as keyof SearchFilters] && (
                      <Ionicons name="checkmark" size={16} color="#000000" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>{filter.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <Pressable style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (SHEET_HEIGHT: number) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SHEET_HEIGHT,
      backgroundColor: '#000000',
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderTopWidth: 2,
      borderTopColor: '#FFFFFF',
    },
    handle: {
      width: 80,
      height: 6,
      backgroundColor: '#FFFFFF',
      borderRadius: 3,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
      opacity: 0.4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 2,
      borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    resetButton: {
      padding: 8,
    },
    resetText: {
      color: '#FF0066',
      fontSize: 16,
      fontWeight: '600',
      textDecorationLine: 'underline',
      textShadowColor: '#FF0066',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 3,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    section: {
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    genreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    genreItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      width: '33.33%',
    },
    genreItemActive: {},
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 0,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.4)',
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxActive: {
      // Dynamic styles applied inline
    },
    genreText: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 14,
      fontWeight: '500',
    },
    genreTextActive: {
      fontWeight: '700',
      // Dynamic color applied inline
    },
    radioGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    radioItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 24,
      marginBottom: 12,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.4)',
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioActive: {
      borderColor: '#00FFFF',
      shadowColor: '#00FFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
      elevation: 6,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#00FFFF',
    },
    radioText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
    },
    trialDurationContainer: {
      alignItems: 'center',
    },
    trialDurationText: {
      color: '#00FF66',
      fontSize: 16,
      marginBottom: 16,
      fontWeight: '600',
      textShadowColor: '#00FF66',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 3,
    },
    durationButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    durationButton: {
      flex: 1,
      paddingVertical: 12,
      marginHorizontal: 4,
      borderRadius: 0,
      backgroundColor: '#000000',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    durationButtonActive: {
      borderColor: '#00FF66',
      shadowColor: '#00FF66',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
      elevation: 6,
    },
    durationButtonText: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 14,
      fontWeight: '600',
    },
    durationButtonTextActive: {
      color: '#00FF66',
      textShadowColor: '#00FF66',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 3,
    },
    otherFilters: {},
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    checkboxLabel: {
      color: '#FFFFFF',
      fontSize: 14,
      flex: 1,
      fontWeight: '500',
    },
    footer: {
      padding: 24,
      borderTopWidth: 2,
      borderTopColor: 'rgba(255, 255, 255, 0.2)',
    },
    applyButton: {
      backgroundColor: '#000000',
      borderRadius: 0,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#00FF88',
      shadowColor: '#00FF88',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 10,
    },
    applyText: {
      color: '#00FF88',
      fontSize: 16,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      textShadowColor: '#00FF88',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
    },
  });
