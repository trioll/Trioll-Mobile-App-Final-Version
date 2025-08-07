import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SparkleBurst } from './SparkleBurst';
import { useHaptics } from '../hooks/useHaptics';

interface RatingStarsProps {
  rating: number;
  onRate: (rating: number) => void;
  displayRating?: number; // Temporary placeholder rating to display (e.g., 4.7)
}

interface SparklePosition {
  id: number;
  x: number;
  y: number;
}

export const RatingStars: React.FC<RatingStarsProps> = ({ rating, onRate, displayRating = 0 }) => {
  const [showStars, setShowStars] = useState(false);
  const [sparkles, setSparkles] = useState<SparklePosition[]>([]);
  const mainStarScale = useRef(new Animated.Value(1)).current;
  const mainStarGlow = useRef(new Animated.Value(rating > 0 ? 1 : 0)).current;
  const haptics = useHaptics();

  // Animation values for each star
  const starAnims = useRef(
    Array.prototype.slice.call({ length: 5 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.8),
      translateX: new Animated.Value(0),
      glow: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Update glow based on rating
    Animated.timing(mainStarGlow, {
      toValue: rating > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [rating]);

  const handleMainStarPress = async () => {
    // Haptic feedback for opening/closing stars
    await haptics.selection();

    if (!showStars) {
      setShowStars(true);

      // Bloom animation
      starAnims.forEach((anim, i) => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 200,
            delay: i * 50,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 80,
            friction: 6,
            velocity: 1,
            delay: i * 50,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: -(i + 1) * 36, // Slightly reduced spacing
            duration: 200,
            delay: i * 50,
            useNativeDriver: true,
          }),
        ]).start();

        // Set glow for already rated stars
        if (i < rating) {
          Animated.timing(anim.glow, {
            toValue: 1,
            duration: 200,
            delay: i * 50,
            useNativeDriver: true,
          }).start();
        }
      });
    } else {
      // Retract animation with spring
      setShowStars(false);
      starAnims.forEach((anim, i) => {
        const reverseIndex = 4 - i;
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 150,
            delay: reverseIndex * 30,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 0.8,
            tension: 90,
            friction: 8,
            delay: reverseIndex * 30,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateX, {
            toValue: 0,
            tension: 90,
            friction: 8,
            delay: reverseIndex * 30,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  };

  const handleStarPress = async (starIndex: number) => {
    const newRating = starIndex + 1;

    // Different haptic feedback based on star position (subtle variation)
    if (starIndex === 0) {
      await haptics.impact('light');
    } else if (starIndex === 4) {
      await (haptics as any).success(); // Special feedback for 5 stars
    } else {
      await haptics.selection(); // Medium feedback for middle stars
    }

    // If tapping the same rating, unrate
    if (rating === newRating) {
      onRate(0);

      // Smooth scale down and retract
      starAnims.forEach((anim, i) => {
        Animated.parallel([
          Animated.timing(anim.glow, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.spring(anim.scale, {
              toValue: 0.8,
              tension: 200,
              friction: 5,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 150,
              delay: i * 30,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });

      setTimeout(() => setShowStars(false), 600);
    } else {
      onRate(newRating);

      // Create sparkles for selected stars
      const newSparkles: SparklePosition[] = [];
      for (let i = 0; i < newRating; i++) {
        newSparkles.push({
          id: Date.now() + i,
          x: -((i + 1) * 36),
          y: 0,
        });
      }
      setSparkles(prev => [...prev, ...newSparkles]);

      // Animate the stars
      starAnims.forEach((anim, i) => {
        if (i < newRating) {
          // Selected stars
          Animated.parallel([
            Animated.sequence([
              Animated.spring(anim.scale, {
                toValue: 1.2,
                tension: 300,
                friction: 5,
                useNativeDriver: true,
              }),
              Animated.spring(anim.scale, {
                toValue: 1,
                tension: 80,
                friction: 6,
                velocity: 1,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(anim.glow, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          // Unselected stars - retract after delay
          setTimeout(() => {
            if (showStars) {
              Animated.parallel([
                Animated.timing(anim.opacity, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 0.8,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.translateX, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start();
            }
          }, 600);
        }
      });

      // Auto-retract unselected stars
      setTimeout(() => {
        if (showStars) {
          setShowStars(false);
        }
      }, 1000);
    }
  };

  const removeSparkle = (id: number) => {
    setSparkles(prev => prev.filter(s => s.id !== id));
  };

  return (
    <View style={[styles.container, { overflow: 'visible' }]}>
      {/* Rating stars */}
      {showStars &&
        starAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                opacity: anim.opacity,
                transform: [{ translateX: anim.translateX }, { scale: anim.scale }],
                shadowColor: '#FFD700',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: anim.glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.8],
                }),
                shadowRadius: anim.glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 12],
                }),
                zIndex: 15 + i, // Higher zIndex for rightmost stars
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => handleStarPress(i)}
              style={styles.starButton}
              pointerEvents="auto"
            >
              <Ionicons
                name={i < rating ? 'star' : 'star-outline' as any}
                size={28}
                color={i < rating ? '#FFD700' : '#FFFFFF'}
              />
            </Pressable>
          </Animated.View>
        ))}

      {/* Main star and rating wrapper */}
      <View style={styles.starWrapper}>
        {/* Main star */}
        <Pressable onPress={handleMainStarPress} style={styles.button}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: mainStarScale }],
                shadowColor: '#FFD700',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: mainStarGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.8],
                }),
                shadowRadius: mainStarGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 15],
                }),
              },
            ]}
          >
            <Ionicons
              name={rating > 0 ? 'star' : 'star-outline' as any}
              size={28}
              color={rating > 0 ? '#FFD700' : '#FFFFFF'}
            />
          </Animated.View>
        </Pressable>

        {/* Rating display */}
        {displayRating > 0 && <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>}
      </View>

      {/* Sparkle effects */}
      {sparkles.map(sparkle => (
        <SparkleBurst
          key={sparkle.id}
          x={sparkle.x}
          y={0}
          onComplete={() => removeSparkle(sparkle.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    padding: 12,
  },
  iconContainer: {
    position: 'relative',
  },
  star: {
    position: 'absolute',
    left: 0, // Change to left positioning
    top: '50%',
    marginTop: -20, // Center vertically (half of star height)
    zIndex: 10, // Ensure stars are clickable above other elements
  },
  starButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 100,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
    position: 'absolute',
    bottom: -16, // Position below the star
    left: '50%',
    marginLeft: -20, // Center horizontally
    width: 40,
  },
});
