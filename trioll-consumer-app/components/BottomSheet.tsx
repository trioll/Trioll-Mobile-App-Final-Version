import type { Game } from '../types';

/**
 * BottomSheet Component - ULTRATHINK World-Class UI/UX Redesign
 * 
 * ✅ FLOATING TITLE: When collapsed, title floats with no background
 * ✅ GLASS MORPHISM: Subtle glass effect when expanded
 * ✅ LANDSCAPE OPTIMIZED: Side-by-side layout in landscape
 * ✅ PORTRAIT OPTIMIZED: Stacked layout in portrait
 * ✅ ALL CONTENT PRESERVED: Both tabs with complete information
 * 
 * Design Principles:
 * - Minimal collapsed state for maximum content visibility
 * - Elegant glass morphism for expanded state
 * - Smooth, natural animations
 * - Adaptive layouts for all orientations
 */
import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Animated, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Platform, 
  Pressable,
  PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './base';
import { useHaptics, useOrientation } from '../hooks';
import { getLogger } from '../src/utils/logger';
import { responsivePadding, responsiveSpacing } from '../utils/responsive';

const logger = getLogger('BottomSheet');

interface BottomSheetProps {
  game: Game;
  isVisible?: boolean;
  onClose?: () => void;
}

// Constants
const SWIPE_THRESHOLD = 1;
const VELOCITY_THRESHOLD = 0.15;
const COLLAPSED_HEIGHT_PORTRAIT = 60; // Just title when collapsed
const COLLAPSED_HEIGHT_LANDSCAPE = 45; // Smaller in landscape
const HANDLE_HEIGHT = 5;
const HANDLE_WIDTH = 36;
const SPRING_CONFIG = {
  tension: 180,
  friction: 25,
  useNativeDriver: true,
};

type TabType = 'game' | 'developer';

export const BottomSheet: React.FC<BottomSheetProps> = ({ game, isVisible = true, onClose }) => {
  const _insets = useSafeAreaInsets();
  const safeAreaBottom = Math.max(_insets.bottom, 20);
  
  // Safe orientation handling with fallback values
  const orientation = useOrientation();
  const screenWidth = orientation?.width || Dimensions.get('window').width;
  const screenHeight = orientation?.height || Dimensions.get('window').height;
  const isPortrait = orientation?.isPortrait ?? (screenHeight > screenWidth);
  const haptics = useHaptics();
  
  // Debug logging removed for performance
  // Re-enable if debugging orientation issues
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('game');
  const [, setIsDragging] = useState(false);
  const [, setLastExpansionState] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentExpansionProgress, setCurrentExpansionProgress] = useState(0);

  // Refs
  const translateY = useRef(new Animated.Value(0)).current;
  const gameScrollRef = useRef<ScrollView>(null);
  const developerScrollRef = useRef<ScrollView>(null);
  const lastGestureY = useRef(0);
  const dragStartY = useRef(0);

  // Calculate positions
  // In landscape, we don't need to account for logo position
  const logoTop = isPortrait ? Math.max(_insets.top + 12, 20) : 0;
  const logoSize = isPortrait ? Math.min(screenWidth * 0.2, 96) : 0;
  const logoBottom = logoTop + logoSize;
  
  // Use different collapsed heights based on orientation
  const collapsedHeight = isPortrait ? COLLAPSED_HEIGHT_PORTRAIT : COLLAPSED_HEIGHT_LANDSCAPE;
  
  // Positions with orientation awareness
  // In landscape, ensure the sheet is visible by adjusting for safe areas
  const maxTranslateY = isPortrait
    ? screenHeight - collapsedHeight - safeAreaBottom // Portrait: normal calculation
    : screenHeight - collapsedHeight - Math.max(safeAreaBottom, 20); // Landscape: ensure visibility
  const minTranslateY = isPortrait 
    ? logoBottom + 20 // Portrait: below logo
    : Math.max(50, _insets.top + 20); // Landscape: near top for max content
  const totalDistance = maxTranslateY - minTranslateY;
  
  // Initialize position
  useEffect(() => {
    if (!isInitialized && game) {
      translateY.setValue(maxTranslateY);
      setIsInitialized(true);
      
      // Landscape positioning is now properly handled
    }
  }, [isInitialized, game, maxTranslateY, isPortrait, screenHeight, collapsedHeight, safeAreaBottom, minTranslateY]);

  // Animated values based on position
  const expansionProgress = translateY.interpolate({
    inputRange: [minTranslateY, maxTranslateY],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Glass morphism background opacity
  const glassOpacity = expansionProgress.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });

  // Title styles animation - adjusted for orientation
  const titleTranslateY = expansionProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: isPortrait ? [0, -10, -20] : [0, -5, -10],
    extrapolate: 'clamp',
  });

  const titleScale = expansionProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: isPortrait ? [1, 1.05, 1.1] : [1, 1.02, 1.05],
    extrapolate: 'clamp',
  });

  const titleBackground = expansionProgress.interpolate({
    inputRange: [0, 0.05, 1],
    outputRange: [0, 0.02, 1],
    extrapolate: 'clamp',
  });

  // Content animations
  const contentOpacity = expansionProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });

  const tabsOpacity = expansionProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const handleOpacity = expansionProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.5, 1],
    extrapolate: 'clamp',
  });

  // Check if user can scroll content
  const canScroll = currentExpansionProgress > 0.5;

  // Animation helpers
  const animateToPosition = (toValue: number, velocity = 0) => {
    Animated.spring(translateY, {
      ...SPRING_CONFIG,
      toValue,
      velocity,
    }).start(() => {
      const progress = 1 - (toValue - minTranslateY) / totalDistance;
      setLastExpansionState(progress);
      setCurrentExpansionProgress(progress);
      
      // Call onClose when fully collapsed
      if (progress === 0 && onClose) {
        onClose();
      }
    });
  };

  const findClosestSnapPoint = (currentY: number, velocity: number) => {
    const snapPoints = [minTranslateY, maxTranslateY];
    const distances = snapPoints.map(point => Math.abs(currentY - point));
    const closestIndex = distances.indexOf(Math.min(...distances));
    return snapPoints[closestIndex];
  };

  // Pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > SWIPE_THRESHOLD;
      },
      onPanResponderGrant: (_, gestureState) => {
        setIsDragging(true);
        // Use the last known position instead of accessing _value
        const currentY = maxTranslateY - (currentExpansionProgress * totalDistance);
        dragStartY.current = currentY;
        lastGestureY.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaY = gestureState.dy - lastGestureY.current;
        const newPosition = dragStartY.current + gestureState.dy;
        
        // Add resistance at bounds
        let finalPosition = newPosition;
        if (newPosition > maxTranslateY) {
          const overshoot = newPosition - maxTranslateY;
          finalPosition = maxTranslateY + overshoot * 0.3;
        } else if (newPosition < minTranslateY) {
          const overshoot = minTranslateY - newPosition;
          finalPosition = minTranslateY - overshoot * 0.3;
        }
        
        translateY.setValue(finalPosition);
        lastGestureY.current = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);
        const currentY = dragStartY.current + gestureState.dy;
        const velocity = gestureState.vy;
        
        let targetY = currentY;
        if (velocity > VELOCITY_THRESHOLD || (velocity > 0 && currentY > maxTranslateY - 100)) {
          targetY = maxTranslateY;
        } else if (velocity < -VELOCITY_THRESHOLD) {
          targetY = minTranslateY;
        } else {
          targetY = findClosestSnapPoint(currentY, velocity);
        }
        
        targetY = Math.max(minTranslateY, Math.min(maxTranslateY, targetY));
        
        if (targetY === minTranslateY) {
          haptics.impact('medium');
        } else if (targetY === maxTranslateY) {
          haptics.impact('light');
        }
        
        animateToPosition(targetY, velocity);
      },
    })
  ).current;

  const switchTab = (tab: TabType) => {
    if (tab === activeTab) return;
    haptics.selection();
    setActiveTab(tab);
  };
  
  const handleExpand = () => {
    logger.debug('Expanding from collapsed state');
    haptics.impact('medium');
    animateToPosition(minTranslateY);
  };

  // Landscape layout for content
  const renderContentLandscape = () => {
    // Safety check for game object in landscape mode
    if (!game) {
      return (
        <View style={styles.landscapeContent}>
          <View style={styles.landscapeSection}>
            <Text style={styles.description}>No game data available</Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.landscapeContent}>
      {/* Left side - Game info */}
      <View style={styles.landscapeSection}>
        <ScrollView
          ref={gameScrollRef}
          showsVerticalScrollIndicator={false}
          scrollEnabled={canScroll}
          bounces={true}
        >
          {renderGameInfo()}
        </ScrollView>
      </View>
      
      {/* Divider */}
      <View style={styles.landscapeDivider} />
      
      {/* Right side - Developer info */}
      <View style={styles.landscapeSection}>
        <ScrollView
          ref={developerScrollRef}
          showsVerticalScrollIndicator={false}
          scrollEnabled={canScroll}
          bounces={true}
        >
          {renderDeveloperInfo()}
        </ScrollView>
      </View>
    </View>
    );
  };

  // Game content
  const renderGameInfo = () => {
    // Safety check for game object
    if (!game) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.description}>No game information available</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.tabContent}>
      {/* Description */}
      <View style={[styles.section, !isPortrait && styles.sectionLandscape]}>
        <Text style={[styles.sectionTitle, isPortrait ? styles.sectionTitlePortrait : styles.sectionTitleLandscape]}>About</Text>
        <Text style={[styles.description, isPortrait ? styles.descriptionPortrait : styles.descriptionLandscape]}>
          {game.description || 'No description available'}
        </Text>
      </View>

      {/* Quick Stats Grid */}
      <View style={[styles.statsGrid, isPortrait && styles.statsGridPortrait]}>
        <View style={[styles.statCard, isPortrait && styles.statCardPortrait]}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
            style={styles.statGradient}
          >
            <Ionicons name="star" size={isPortrait ? 20 : 24} color="#FFD700" />
            <Text style={[styles.statValue, isPortrait ? styles.statValuePortrait : styles.statValueLandscape]}>
              {(game.rating || 4.5).toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, isPortrait ? styles.statLabelPortrait : styles.statLabelLandscape]}>Rating</Text>
          </LinearGradient>
        </View>
        
        <View style={[styles.statCard, isPortrait && styles.statCardPortrait]}>
          <LinearGradient
            colors={['rgba(0, 255, 136, 0.1)', 'rgba(0, 255, 136, 0.05)']}
            style={styles.statGradient}
          >
            <Ionicons name="download-outline" size={isPortrait ? 20 : 24} color="#00FF88" />
            <Text style={[styles.statValue, isPortrait ? styles.statValuePortrait : styles.statValueLandscape]}>125K</Text>
            <Text style={[styles.statLabel, isPortrait ? styles.statLabelPortrait : styles.statLabelLandscape]}>Downloads</Text>
          </LinearGradient>
        </View>
        
        <View style={[styles.statCard, isPortrait && styles.statCardPortrait]}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(99, 102, 241, 0.05)']}
            style={styles.statGradient}
          >
            <Ionicons name="time-outline" size={isPortrait ? 20 : 24} color="#6366F1" />
            <Text style={[styles.statValue, isPortrait ? styles.statValuePortrait : styles.statValueLandscape]}>7 min</Text>
            <Text style={[styles.statLabel, isPortrait ? styles.statLabelPortrait : styles.statLabelLandscape]}>Trial</Text>
          </LinearGradient>
        </View>
        
        <View style={[styles.statCard, isPortrait && styles.statCardPortrait]}>
          <LinearGradient
            colors={['rgba(255, 0, 102, 0.1)', 'rgba(255, 0, 102, 0.05)']}
            style={styles.statGradient}
          >
            <Ionicons name="phone-portrait-outline" size={isPortrait ? 20 : 24} color="#FF0066" />
            <Text style={[styles.statValue, isPortrait ? styles.statValuePortrait : styles.statValueLandscape]}>
              {game.platforms?.includes('ios') && game.platforms?.includes('android') ? 'All' : (game.platforms?.[0] || 'iOS')}
            </Text>
            <Text style={[styles.statLabel, isPortrait ? styles.statLabelPortrait : styles.statLabelLandscape]}>Platform</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Game Details */}
      <View style={[styles.section, !isPortrait && styles.sectionLandscape]}>
        <Text style={[styles.sectionTitle, isPortrait ? styles.sectionTitlePortrait : styles.sectionTitleLandscape]}>Details</Text>
        <View style={[styles.detailsCard, isPortrait && styles.detailsCardPortrait]}>
          {[
            { label: 'Genre', value: game.genre || 'Unknown' },
            { label: 'Size', value: '248 MB' },
            { label: 'Version', value: '2.1.4' },
            { label: 'Age Rating', value: game.minAge ? `${game.minAge}+` : '12+' },
            { label: 'Languages', value: 'EN, ES, FR' },
          ].map((detail, index, array) => (
            <View 
              key={detail.label} 
              style={[
                styles.detailRow, 
                isPortrait && styles.detailRowPortrait,
                index === array.length - 1 && { borderBottomWidth: 0 }
              ]}
            >
              <Text style={[styles.detailLabel, isPortrait && styles.detailLabelPortrait]}>
                {detail.label}
              </Text>
              <Text style={[styles.detailValue, isPortrait && styles.detailValuePortrait]}>
                {detail.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tags */}
      {game.tags && game.tags.length > 0 && (
        <View style={styles.section}>
          <View style={styles.tagsContainer}>
            {game.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* CTA Button */}
      <TouchableOpacity 
        style={[styles.ctaButton, isPortrait ? styles.ctaButtonPortrait : styles.ctaButtonLandscape]} 
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={[styles.ctaGradient, isPortrait ? styles.ctaGradientPortrait : styles.ctaGradientLandscape]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.ctaText, isPortrait ? styles.ctaTextPortrait : styles.ctaTextLandscape]}>
            Get Full Game
          </Text>
          <Ionicons name="arrow-forward" size={isPortrait ? 18 : 16} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </View>
    );
  };

  // Developer content
  const renderDeveloperInfo = () => {
    // Safety check for game object
    if (!game) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.developerName}>No game data available</Text>
        </View>
      );
    }
    
    const developerName = game.developer || 'Unknown Developer';
    const developerInitial = developerName.charAt(0).toUpperCase() || '?';
    
    return (
      <View style={styles.tabContent}>
        {/* Developer Header */}
        <View style={[styles.developerHeader, isPortrait && styles.developerHeaderPortrait]}>
          <View style={[styles.developerAvatar, isPortrait && styles.developerAvatarPortrait]}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.developerInitial}>
              {developerInitial}
            </Text>
          </View>
          <View style={styles.developerInfo}>
            <Text style={[styles.developerName, isPortrait && styles.developerNamePortrait]}>
              {developerName}
            </Text>
            <Text style={[styles.developerRole, isPortrait && styles.developerRolePortrait]}>
              Game Studio
            </Text>
            <View style={styles.developerStats}>
              <Text style={[styles.developerStat, isPortrait && styles.developerStatPortrait]}>
                23 Games
              </Text>
              <Text style={styles.statDivider}>•</Text>
              <Text style={[styles.developerStat, isPortrait && styles.developerStatPortrait]}>
                2.4M Players
              </Text>
            </View>
          </View>
        </View>

      {/* About Developer */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isPortrait && styles.sectionTitlePortrait]}>About</Text>
        <Text style={[styles.description, isPortrait && styles.descriptionPortrait]}>
          We create immersive gaming experiences that push the boundaries of mobile entertainment. 
          Our focus on innovative mechanics and stunning visuals has earned us recognition worldwide.
        </Text>
      </View>

      {/* Other Games */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isPortrait && styles.sectionTitlePortrait]}>
          More Games
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.otherGamesContainer, 
            isPortrait && styles.otherGamesContainerPortrait
          ]}
        >
          {[1, 2, 3, 4].map((i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.otherGameCard, isPortrait && styles.otherGameCardPortrait]}
            >
              <View style={[styles.otherGameImage, isPortrait && styles.otherGameImagePortrait]}>
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons name="game-controller" size={isPortrait ? 24 : 28} color="#FFF" />
              </View>
              <Text style={[styles.otherGameTitle, isPortrait && styles.otherGameTitlePortrait]}>
                Game {i}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Social Links */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isPortrait && styles.sectionTitlePortrait]}>Connect</Text>
        <View style={[styles.socialLinks, isPortrait && styles.socialLinksPortrait]}>
          <TouchableOpacity style={[styles.socialButton, isPortrait && styles.socialButtonPortrait]}>
            <Ionicons name="globe-outline" size={isPortrait ? 20 : 22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, isPortrait && styles.socialButtonPortrait]}>
            <Ionicons name="logo-twitter" size={isPortrait ? 20 : 22} color="#1DA1F2" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, isPortrait && styles.socialButtonPortrait]}>
            <MaterialCommunityIcons name="discord" size={isPortrait ? 20 : 22} color="#5865F2" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, isPortrait && styles.socialButtonPortrait]}>
            <Ionicons name="logo-youtube" size={isPortrait ? 20 : 22} color="#FF0000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </View>
    );
  };

  // Early return if component should not be visible
  if (!isVisible) return null;
  
  // Return minimal UI if game is not loaded
  if (!game) {
    logger.debug('No game provided, returning null');
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          zIndex: 9999,
          elevation: Platform.OS === 'android' ? 999 : undefined,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Glass morphism background - only visible when expanded */}
      <Animated.View 
        style={[
          styles.glassBackground,
          { 
            opacity: glassOpacity,
          }
        ]}
        pointerEvents="none"
      >
        <BlurView 
          intensity={20} 
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
      </Animated.View>
      
      {/* Main content container */}
      <View style={styles.contentContainer} pointerEvents="auto">
        {/* Header with title */}
        <View {...panResponder.panHandlers} style={[
          styles.header,
          { minHeight: collapsedHeight }
        ]}>
          {/* Handle */}
          <Animated.View style={[styles.handleContainer, { opacity: handleOpacity }]}>
            <View style={styles.handle} />
          </Animated.View>
          
          {/* Floating Title */}
          <Pressable onPress={handleExpand} style={styles.titlePressable}>
            <Animated.View
              style={[
                styles.titleContainer,
                {
                  transform: [
                    { translateY: titleTranslateY },
                    { scale: titleScale }
                  ],
                }
              ]}
            >
              <Animated.View 
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.titleBackground,
                  { opacity: titleBackground }
                ]}
              />
              <Text style={[
                styles.title, 
                isPortrait ? styles.titlePortrait : styles.titleLandscape
              ]}>
                {game?.title || 'Loading...'}
              </Text>
            </Animated.View>
          </Pressable>
          
          {/* Tabs - fade in/out based on expansion */}
          {isPortrait && (
            <Animated.View style={[styles.tabs, { opacity: tabsOpacity }]}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'game' && styles.activeTab]}
                onPress={() => switchTab('game')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText, 
                  activeTab === 'game' && styles.activeTabText
                ]}>
                  Game
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'developer' && styles.activeTab]}
                onPress={() => switchTab('developer')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText, 
                  activeTab === 'developer' && styles.activeTabText
                ]}>
                  Developer
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {/* Close button */}
          <Animated.View style={[styles.closeButtonContainer, { opacity: contentOpacity }]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                haptics.selection();
                animateToPosition(maxTranslateY);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Content */}
        <Animated.View 
          style={[
            styles.content, 
            { opacity: contentOpacity }
          ]}
          pointerEvents={canScroll ? 'auto' : 'none'}
        >
          {isPortrait ? (
            <ScrollView
              ref={activeTab === 'game' ? gameScrollRef : developerScrollRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={canScroll}
              bounces={true}
            >
              {activeTab === 'game' ? renderGameInfo() : renderDeveloperInfo()}
            </ScrollView>
          ) : (
            renderContentLandscape()
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%', // Ensure full height coverage
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingTop: responsiveSpacing.normal,
    paddingBottom: responsivePadding.md,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: HANDLE_HEIGHT / 2,
  },
  titlePressable: {
    alignItems: 'center',
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  titleBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titlePortrait: {
    fontSize: 20,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  landscapeContent: {
    flex: 1,
    flexDirection: 'row',
    padding: responsivePadding.md, // Reduced padding for landscape
    paddingTop: responsiveSpacing.relaxed,
  },
  landscapeSection: {
    flex: 1,
    paddingHorizontal: 8, // Reduced horizontal padding
  },
  landscapeDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionLandscape: {
    marginBottom: 16, // Tighter spacing in landscape
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionTitlePortrait: {
    fontSize: 16,
  },
  sectionTitleLandscape: {
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  descriptionPortrait: {
    fontSize: 14,
    lineHeight: 22,
  },
  descriptionLandscape: {
    fontSize: 13,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statsGridPortrait: {
    marginBottom: 20,
  },
  statCard: {
    width: '50%',
    padding: 6,
  },
  statCardPortrait: {
    padding: 4,
  },
  statGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statGradientLandscape: {
    padding: 10, // Reduced padding in landscape
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statValuePortrait: {
    fontSize: 20,
  },
  statValueLandscape: {
    fontSize: 16,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  statLabelPortrait: {
    fontSize: 11,
  },
  statLabelLandscape: {
    fontSize: 10,
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsCardPortrait: {
    borderRadius: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailRowPortrait: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  detailLabelPortrait: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailValuePortrait: {
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  tagText: {
    fontSize: 13,
    color: '#8B8CFF',
    fontWeight: '600',
  },
  ctaButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonPortrait: {
    borderRadius: 14,
  },
  ctaButtonLandscape: {
    borderRadius: 12,
    marginTop: 4,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  ctaGradientPortrait: {
    paddingVertical: 14,
  },
  ctaGradientLandscape: {
    paddingVertical: 10,
    gap: 6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ctaTextPortrait: {
    fontSize: 15,
  },
  ctaTextLandscape: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  developerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  developerHeaderPortrait: {
    marginBottom: 20,
    gap: 12,
  },
  developerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  developerAvatarPortrait: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  developerInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  developerNamePortrait: {
    fontSize: 18,
  },
  developerRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  developerRolePortrait: {
    fontSize: 13,
  },
  developerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  developerStat: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  developerStatPortrait: {
    fontSize: 13,
  },
  statDivider: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  otherGamesContainer: {
    paddingRight: 24,
    gap: 12,
  },
  otherGamesContainerPortrait: {
    gap: 10,
  },
  otherGameCard: {
    alignItems: 'center',
  },
  otherGameCardPortrait: {
    // Portrait specific
  },
  otherGameImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    overflow: 'hidden',
  },
  otherGameImagePortrait: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  otherGameTitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    fontWeight: '600',
  },
  otherGameTitlePortrait: {
    fontSize: 12,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialLinksPortrait: {
    gap: 10,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  socialButtonPortrait: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  // Landscape specific styles
  titleLandscape: {
    fontSize: 18, // Smaller title in landscape
    letterSpacing: -0.3,
  },
  scrollViewLandscape: {
    flex: 1,
  },
  scrollContentLandscape: {
    padding: 0,
    paddingBottom: 40,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});