import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Animated,
  TouchableWithoutFeedback,
  Vibration,
  AccessibilityInfo,
  Image,
  PanResponder,
  Platform,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useOrientation, useHaptics } from '../hooks';
import * as Haptics from 'expo-haptics';

interface IconBloomProps {
  onProfilePress?: () => void;
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
  onInventoryPress?: () => void;
}

type BloomState = 'idle' | 'pressing' | 'blooming' | 'bloomed' | 'collapsing' | 'selecting';

const HAPTIC_ENABLED = true;

// Icon positions in 2x2 grid layout relative to logo position
// Forms a tight grid exactly as specified:
//         Profile
// Logo    Search
// Settings Chest
const ICON_POSITIONS = [
  { x: 120, y: 0, id: 'profile' }, // Right of logo, top row
  { x: 120, y: 64, id: 'search' }, // Below Profile (56 + 8 gap)
  { x: 0, y: 120, id: 'settings' }, // Below logo (96 + 24 gap)
  { x: 64, y: 120, id: 'inventory' }, // Right of Settings (56 + 8 gap)
];

export const IconBloom: React.FC<IconBloomProps> = ({
  onProfilePress,
  onSearchPress,
  onSettingsPress,
  onInventoryPress,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useOrientation();
  const haptics = useHaptics();
  const [bloomState, setBloomState] = useState<BloomState>('idle');
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const logoScale = useRef(new Animated.Value(1)).current;
  const isHoldSelecting = useRef(false);

  // Small screen detection (iPhone SE size) - dynamic
  const isSmallScreen = screenWidth <= 375;

  // Responsive sizes
  const LOGO_SIZE = Math.min(screenWidth * 0.2, 96); // Responsive logo size
  const ICON_SIZE = Math.min(screenWidth * 0.14, 56); // Responsive icon size

  // Animation values for each icon
  const iconAnimations = useRef(
    ICON_POSITIONS.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      glow: new Animated.Value(0),
      pulse: new Animated.Value(1),
      selectGlow: new Animated.Value(0),
      selectScale: new Animated.Value(1),
      // New subtle animations
      floatY: new Animated.Value(0),
      microScale: new Animated.Value(1),
      rotation: new Animated.Value(0),
    }))
  ).current;

  // Logo position with safe area
  const logoTop = Math.max(insets.top + 12, 20);
  const logoLeft = isSmallScreen ? 12 : 16;

  // Create pan responder for drag selection
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => bloomState === 'selecting',
      onMoveShouldSetPanResponder: () => bloomState === 'selecting',
      onPanResponderMove: evt => {
        if (bloomState !== 'selecting') return;

        // Get touch position relative to logo
        const touchX = evt.nativeEvent.pageX - logoLeft;
        const touchY = evt.nativeEvent.pageY - logoTop;

        // Check which icon is under the touch
        let closestIcon = null;
        let closestDistance = Infinity;

        ICON_POSITIONS.forEach(pos => {
          const iconCenterX = pos.x + ICON_SIZE / 2;
          const iconCenterY = pos.y + ICON_SIZE / 2;
          const distance = Math.sqrt(
            Math.pow(touchX - iconCenterX, 2) + Math.pow(touchY - iconCenterY, 2)
          );

          if (distance < ICON_SIZE && distance < closestDistance) {
            closestDistance = distance;
            closestIcon = pos.id;
          }
        });

        // Update selected icon with haptic feedback
        if (closestIcon !== selectedIcon) {
          setSelectedIcon(closestIcon);

          if (closestIcon) {
            // Highlight animation
            const iconIndex = ICON_POSITIONS.findIndex(p => p.id === closestIcon);
            if (iconIndex !== -1) {
              Animated.spring(iconAnimations[iconIndex].selectScale, {
                toValue: 1.2,
                tension: 200,
                friction: 5,
                useNativeDriver: true,
              }).start();

              // Haptic feedback
              if (Platform.OS === 'android') {
                Vibration.vibrate(5);
              }
            }
          }

          // Reset previous icon scale
          if (selectedIcon) {
            const prevIndex = ICON_POSITIONS.findIndex(p => p.id === selectedIcon);
            if (prevIndex !== -1) {
              Animated.spring(iconAnimations[prevIndex].selectScale, {
                toValue: 1,
                tension: 200,
                friction: 5,
                useNativeDriver: true,
              }).start();
            }
          }
        }
      },
      onPanResponderRelease: () => {
        handlePressOut();
      },
    })
  ).current;

  // Floating loop animation with cleanup
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);

  const _startFloatingAnimation = useCallback(() => {
    // Clear any existing animations
    animationRefs.current.forEach(anim => anim?.stop());
    animationRefs.current = [];

    iconAnimations.forEach((anim, index) => {
      const delay = index * 100;
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(anim.pulse, {
            toValue: 1.1,
            duration: 1000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.pulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animationRefs.current.push(animation);
      animation.start();
    });
  }, [iconAnimations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach(anim => anim?.stop());
    };
  }, []);

  // Handle icon hover with subtle animations
  const _handleIconHover = useCallback(
    (iconId: string | null) => {
      const previousIcon = hoveredIcon;
      setHoveredIcon(iconId);

      if (iconId && iconId !== previousIcon) {
        // Light haptic on hover
        haptics.selection();

        // Find icon index
        const iconIndex = ICON_POSITIONS.findIndex(pos => pos.id === iconId);
        if (iconIndex !== -1) {
          const anim = iconAnimations[iconIndex];

          // Subtle scale and glow animation
          Animated.parallel([
            Animated.spring(anim.microScale, {
              toValue: 1.05,
              tension: 150,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(anim.glow, {
              toValue: 0.6,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      // Remove effects from previous icon
      if (previousIcon && previousIcon !== iconId) {
        const prevIndex = ICON_POSITIONS.findIndex(pos => pos.id === previousIcon);
        if (prevIndex !== -1) {
          const prevAnim = iconAnimations[prevIndex];

          Animated.parallel([
            Animated.spring(prevAnim.microScale, {
              toValue: 1,
              tension: 150,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(prevAnim.glow, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    },
    [hoveredIcon, iconAnimations, haptics]
  );

  // Handle navigation with custom handlers or defaults
  const handleIconPress = useCallback(
    (iconId: string) => {
      // Collapse first
      handleCollapse();

      // Then navigate after a short delay
      setTimeout(() => {
        switch (iconId) {
          case 'profile':
            if (onProfilePress) onProfilePress();
            break;
          case 'search':
            if (onSearchPress) onSearchPress();
            break;
          case 'settings':
            if (onSettingsPress) onSettingsPress();
            break;
          case 'inventory':
            if (onInventoryPress) onInventoryPress();
            break;
        }
      }, 150);
    },
    [onProfilePress, onSearchPress, onSettingsPress, onInventoryPress]
  );

  // Bloom animation with subtle serotonin effects
  const handleBloom = useCallback(() => {
    setBloomState('blooming');
    haptics.selection();
    AccessibilityInfo.announceForAccessibility('Menu opened with 4 options');

    // Staggered bloom animation with subtle effects
    const animations = iconAnimations.map((anim, index) => {
      const position = ICON_POSITIONS[index];

      // Subtle float animation after bloom
      const _startFloating = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim.floatY, {
              toValue: -3,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim.floatY, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      return Animated.parallel([
        // Scale with overshoot for playful feel
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
          delay: index * 40,
        }),
        // Opacity fade in
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
          delay: index * 40,
        }),
        // Position spring
        Animated.spring(anim.translateX, {
          toValue: position.x,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
          delay: index * 40,
        }),
        Animated.spring(anim.translateY, {
          toValue: position.y,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
          delay: index * 40,
        }),
        // Subtle rotation for playfulness (converted to degrees)
        Animated.timing(anim.rotation, {
          toValue: (Math.random() - 0.5) * 0.02, // Small rotation value
          duration: 250,
          useNativeDriver: true,
          delay: index * 40,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      setBloomState('bloomed');
      // Start floating animations
      iconAnimations.forEach((anim, index) => {
        const startFloating = () => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim.floatY, {
                toValue: -2,
                duration: 2000 + index * 200,
                useNativeDriver: true,
              }),
              Animated.timing(anim.floatY, {
                toValue: 0,
                duration: 2000 + index * 200,
                useNativeDriver: true,
              }),
            ])
          ).start();
        };
        startFloating();
      });
    });
  }, [iconAnimations, haptics]);

  // Collapse animation
  const handleCollapse = useCallback(() => {
    if (bloomState === 'idle') return;

    setBloomState('collapsing');

    // Reverse animation - faster with subtle effects
    const animations = iconAnimations.map((anim, index) => {
      return Animated.parallel([
        Animated.timing(anim.scale, {
          toValue: 0,
          duration: 150,
          delay: index * 20,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 150,
          delay: index * 20,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateX, {
          toValue: 0,
          duration: 150,
          delay: index * 20,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 150,
          delay: index * 20,
          useNativeDriver: true,
        }),
        // Reset new animation values
        Animated.timing(anim.floatY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(anim.microScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      setBloomState('idle');
    });
  }, [bloomState, iconAnimations]);

  // Handle hold-to-select mode
  const _enterSelectMode = useCallback(() => {
    setBloomState('selecting');
    isHoldSelecting.current = true;

    // Haptic feedback
    if (Platform.OS === 'android') {
      Vibration.vibrate(20);
    }

    // Show all icons with subtle glow
    iconAnimations.forEach((anim, index) => {
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 200,
          delay: index * 30,
          useNativeDriver: true,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay: index * 30,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateX, {
          toValue: ICON_POSITIONS[index].x,
          duration: 200,
          delay: index * 30,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: ICON_POSITIONS[index].y,
          duration: 200,
          delay: index * 30,
          useNativeDriver: true,
        }),
        Animated.timing(anim.selectGlow, {
          toValue: 0.3, // Subtle glow for all icons
          duration: 200,
          delay: index * 30,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [iconAnimations]);

  // Press handlers - simplified for tap-to-bloom
  const handlePressIn = useCallback(() => {
    // Scale down logo
    Animated.spring(logoScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, [logoScale]);

  const handlePressOut = useCallback(() => {
    // Reset logo scale
    Animated.spring(logoScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [logoScale]);

  // Handle tap to toggle bloom
  const handlePress = useCallback(() => {
    // Haptic feedback
    if (HAPTIC_ENABLED) {
      Vibration.vibrate(10);
    }

    if (bloomState === 'idle') {
      handleBloom();
    } else if (bloomState === 'bloomed') {
      handleCollapse();
    }
  }, [bloomState, handleBloom, handleCollapse]);

  // Render individual bloom icon
  const renderBloomIcon = (index: number) => {
    const position = ICON_POSITIONS[index];
    const anim = iconAnimations[index];
    const isSelected = selectedIcon === position.id;

    let IconComponent;
    let iconName;
    let accessibilityLabel;
    let highlightColor = '#FFFFFF';

    switch (position.id) {
      case 'profile':
        IconComponent = Ionicons;
        iconName = 'person-outline';
        accessibilityLabel = 'Profile';
        highlightColor = '#00FFFF'; // Cyan
        break;
      case 'search':
        IconComponent = Ionicons;
        iconName = 'search-outline';
        accessibilityLabel = 'Search';
        highlightColor = '#FF00FF'; // Magenta
        break;
      case 'settings':
        IconComponent = Ionicons;
        iconName = 'settings-outline';
        accessibilityLabel = 'Settings';
        highlightColor = '#FFFF00'; // Yellow
        break;
      case 'inventory':
        IconComponent = MaterialCommunityIcons;
        iconName = 'treasure-chest';
        accessibilityLabel = 'Inventory';
        highlightColor = '#00FF00'; // Green
        break;
    }

    return (
      <Animated.View
        key={position.id}
        style={{
          position: 'absolute',
          width: ICON_SIZE,
          height: ICON_SIZE,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: anim.opacity,
          transform: [
            { translateX: anim.translateX },
            { translateY: Animated.add(anim.translateY, anim.floatY) },
            {
              scale: Animated.multiply(
                Animated.multiply(anim.scale, anim.selectScale),
                anim.microScale
              ),
            },
            {
              rotate: anim.rotation.interpolate({
                inputRange: [-0.1, 0.1],
                outputRange: ['-5deg', '5deg'],
              }),
            },
          ],
          // Glow effect
          shadowColor: isSelected ? highlightColor : '#FFFFFF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isSelected ? 0.8 : anim.selectGlow,
          shadowRadius: isSelected ? 15 : 8,
        }}
      >
        <TouchableWithoutFeedback
          onPress={async () => {
            if (bloomState === 'bloomed') {
              // Sexy haptic buzz for heart/profile icon
              if (position.id === 'profile') {
                // Create a sexy buzz pattern
                if (Platform.OS === 'ios') {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 60);
                  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 120);
                } else {
                  Vibration.vibrate([0, 30, 50, 30, 20, 10]);
                }
              } else {
                // Normal haptic for other icons
                haptics.selection();
              }

              // Micro animation on press
              Animated.sequence([
                Animated.timing(anim.microScale, {
                  toValue: 0.9,
                  duration: 80,
                  useNativeDriver: true,
                }),
                Animated.spring(anim.microScale, {
                  toValue: 1,
                  tension: 150,
                  friction: 5,
                  useNativeDriver: true,
                }),
              ]).start();

              handleIconPress(position.id);
            }
          }}
          onPressIn={() => {
            if (bloomState === 'bloomed') {
              // Scale down animation
              Animated.timing(anim.microScale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
              }).start();
            }
          }}
          onPressOut={() => {
            if (bloomState === 'bloomed') {
              // Spring back
              Animated.spring(anim.microScale, {
                toValue: 1,
                tension: 150,
                friction: 5,
                useNativeDriver: true,
              }).start();
            }
          }}
          accessible
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
        >
          <Animated.View
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderRadius: ICON_SIZE / 2,
            }}
          >
            <IconComponent
              name={iconName as unknown as any}
              size={32}
              color={isSelected ? highlightColor : '#FFFFFF'}
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  };

  return (
    <>
      {/* Invisible touch catcher limited to bloom area when bloomed */}
      {bloomState === 'bloomed' && (
        <TouchableWithoutFeedback onPress={handleCollapse}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 280, // Match bloom area size
              height: 280,
              zIndex: 998,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Main bloom container - limited area */}
      <View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          top: logoTop,
          left: logoLeft,
          width: 280, // Slightly larger to accommodate bigger icons
          height: 280,
          zIndex: 999,
          overflow: 'hidden', // Prevent any overflow
        }}
      >
        {/* Bloom icons */}
        {iconAnimations.map((_, index) => renderBloomIcon(index))}

        {/* Trioll Logo Trigger */}
        <TouchableWithoutFeedback
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          accessible
          accessibilityLabel="Trioll menu"
          accessibilityHint="Tap to open menu"
          accessibilityRole="button"
        >
          <Animated.View
            style={{
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              transform: [{ scale: logoScale }],
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'transparent', // Transparent background to show logo properly
              borderRadius: LOGO_SIZE / 2,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              overflow: 'hidden',
              shadowColor: '#6366f1',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Image
              source={require('../assets/icon.png')}
              style={{
                width: LOGO_SIZE * 0.8,
                height: LOGO_SIZE * 0.8,
                resizeMode: 'contain',
              }}
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </>
  );
};
