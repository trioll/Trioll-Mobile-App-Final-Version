import React, { ReactNode, useRef, useEffect } from 'react';
import { View, ViewStyle, StyleSheet, Text, Pressable, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DS } from '../../src/styles/TriollDesignSystem';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useHaptics } from '../../hooks/useHaptics';
import { SPRING_CONFIG, DURATIONS } from '../../constants/animations';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ResponsiveContainerProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'card' | 'section' | 'screen';
  noPadding?: boolean;
  noMargin?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = React.memo(({
  children,
  style,
  variant = 'section',
  noPadding = false,
  noMargin = false,
}) => {
  const layout = useResponsiveLayout();

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'screen':
        return {
          flex: 1,
          paddingHorizontal: layout.containerPadding,
          paddingTop: layout.isCompact ? DS.spacing.sm : DS.spacing.md,
        };
      case 'card':
        return {
          padding: noPadding ? 0 : layout.cardPadding,
          marginBottom: noMargin ? 0 : layout.sectionSpacing,
          backgroundColor: DS.colors.surface,
          borderRadius: DS.effects.borderRadiusLarge,
          ...DS.effects.glassSurface,
          borderWidth: DS.layout.borderWidth,
          borderColor: DS.colors.border,
        };
      case 'section':
      default:
        return {
          paddingHorizontal: noPadding ? 0 : layout.containerPadding,
          marginBottom: noMargin ? 0 : layout.sectionSpacing,
        };
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      {children}
    </View>
  );
});

ResponsiveContainer.displayName = 'ResponsiveContainer';

interface ResponsiveGridProps {
  children: ReactNode[];
  columns?: number;
  gap?: number;
  style?: ViewStyle | ViewStyle[];
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = React.memo(({
  children,
  columns: overrideColumns,
  gap,
  style,
}) => {
  const layout = useResponsiveLayout();
  const columns = overrideColumns || layout.columns;
  const gridGap = gap || layout.sectionSpacing / 2;

  return (
    <View style={[styles.grid, { marginHorizontal: -gridGap / 2 }, style]}>
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            {
              width: `${100 / columns}%`,
              paddingHorizontal: gridGap / 2,
              marginBottom: gridGap,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
});

ResponsiveGrid.displayName = 'ResponsiveGrid';

interface CollapsibleSectionProps {
  children: ReactNode;
  title: string;
  preview?: ReactNode;
  defaultExpanded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = React.memo(({
  children,
  title,
  preview,
  defaultExpanded = false,
  style,
}) => {
  const layout = useResponsiveLayout();
  const haptics = useHaptics();
  const [expanded, setExpanded] = React.useState(
    defaultExpanded || !layout.collapseSections
  );
  
  // Animation values
  const heightAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const fadeAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate height and rotation
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: expanded ? 1 : 0,
        ...SPRING_CONFIG.NORMAL,
        useNativeDriver: false, // Height animation can't use native driver
      }),
      Animated.spring(rotateAnim, {
        toValue: expanded ? 1 : 0,
        ...SPRING_CONFIG.BOUNCY,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: expanded ? 1 : 0,
        duration: DURATIONS.FAST,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded]);

  const handlePress = () => {
    haptics.impact('light');
    
    // Bounce animation on press
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        ...SPRING_CONFIG.QUICK,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...SPRING_CONFIG.BOUNCY,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Use LayoutAnimation for smooth height transitions
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        DURATIONS.NORMAL,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    
    setExpanded(!expanded);
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View 
      style={[
        styles.collapsibleContainer, 
        style,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.collapsibleHeader,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <View style={styles.collapsibleRight}>
          <Animated.View style={{ opacity: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }) }}>
            {!expanded && preview}
          </Animated.View>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={DS.colors.textSecondary}
            />
          </Animated.View>
        </View>
      </Pressable>
      
      {expanded && (
        <Animated.View 
          style={[
            styles.collapsibleContent,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              }],
            },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
});

CollapsibleSection.displayName = 'CollapsibleSection';

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    minHeight: 0,
  },
  collapsibleContainer: {
    marginBottom: DS.spacing.md,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.md,
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusMedium,
    ...DS.effects.glassSurface,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    ...DS.effects.shadowSubtle,
  },
  collapsibleTitle: {
    color: DS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  collapsibleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  collapsibleContent: {
    marginTop: DS.spacing.xs,
    overflow: 'hidden',
  },
});