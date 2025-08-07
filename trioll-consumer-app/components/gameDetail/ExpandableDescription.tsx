import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// LayoutAnimation will be enabled inside component

interface ExpandableDescriptionProps {
  description: string;
  tags: string[];
}

export const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  description,
  tags,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Enable LayoutAnimation on Android
  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);

    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Process description for rich text (simple bold support)
  const renderRichText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={styles.boldText}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const fullDescription =
    description ||
    'An exciting game that will keep you entertained for hours. Experience thrilling gameplay, stunning graphics, and immersive sound design.';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>About</Text>

      <View style={styles.descriptionContainer}>
        <Text style={styles.description} numberOfLines={isExpanded ? undefined : 3}>
          {renderRichText(fullDescription)}
        </Text>

        {fullDescription.length > 150 && (
          <Pressable onPress={toggleExpand} style={styles.readMoreButton}>
            <Text style={styles.readMoreText}>{isExpanded ? 'Read less' : 'Read more'}</Text>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name="chevron-down" size={16} color="#6366f1" />
            </Animated.View>
          </Pressable>
        )}
      </View>

      {/* Tags */}
      <View style={styles.tags}>
        {tags.map((tag, index) => (
          <Pressable key={index} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  description: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  readMoreText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#999',
    fontSize: 14,
  },
});
