import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, StyleSheet, TextInput, Keyboard, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './base';
import { useOrientation } from '../hooks';

interface CommentOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  iconPosition?: { x: number; y: number };
}

interface Comment {
  id: string;
  username: string;
  emoji: string;
  text: string;
}

export const MinimalCommentOverlay: React.FC<CommentOverlayProps> = ({
  isVisible,
  onClose,
  iconPosition,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useOrientation();
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Check if device is in portrait mode
  const isPortrait = screenHeight > screenWidth;

  // Preload comments for instant rendering
  const mockComments = useMemo(
    () => [
      {
        id: '1',
        username: 'PixelPirate',
        emoji: '🧑‍💻',
        text: 'Loved this trial! Where can I get the full game?',
      },
      {
        id: '2',
        username: 'AceCrusher21',
        emoji: '🔥',
        text: 'Sick mechanics!🔥',
      },
      {
        id: '3',
        username: 'Starfruit',
        emoji: '⭐️',
        text: "Can't wait to see more levels!",
      },
    ],
    []
  );

  const [comments, setComments] = useState<Comment[]>(mockComments);

  // Animation values - GPU accelerated
  const translateX = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const emojiScale = useRef(new Animated.Value(0.8)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Keyboard event handling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Improved responsive dimensions
  const boxWidth = isPortrait 
    ? Math.min(screenWidth - 32, 340) // Portrait: full width minus padding, max 340
    : Math.min(screenWidth * 0.45, 400); // Landscape: 45% of width, max 400
    
  const maxBoxHeight = isPortrait 
    ? Math.min(screenHeight * 0.55, 400) // Portrait: 55% height, max 400
    : Math.min(screenHeight * 0.75, 360); // Landscape: 75% height, max 360
    
  const actualBoxHeight = maxBoxHeight;
  const triangleSize = 12;
  
  // Calculate optimal position with better spacing
  const boxPosition = useMemo(() => {
    if (!iconPosition) {
      return isPortrait ? {
        // Center horizontally in portrait
        left: (screenWidth - boxWidth) / 2,
        top: screenHeight * 0.25,
      } : {
        // Position on right side in landscape
        right: 20,
        top: screenHeight * 0.15,
      };
    }
    
    // Calculate available space with better margins
    const marginFromEdge = isPortrait ? 16 : 20;
    const marginFromIcon = 8;
    
    const spaceAbove = iconPosition.y - insets.top - marginFromEdge;
    const spaceBelow = screenHeight - iconPosition.y - insets.bottom - keyboardHeight - marginFromEdge;
    
    // In portrait, prefer centered positioning; in landscape, prefer side positioning
    if (isPortrait) {
      // Center horizontally
      const left = (screenWidth - boxWidth) / 2;
      
      // Position vertically based on available space
      const preferAbove = spaceBelow < actualBoxHeight * 0.6;
      const top = preferAbove
        ? Math.max(insets.top + marginFromEdge, iconPosition.y - actualBoxHeight - marginFromIcon)
        : Math.min(iconPosition.y + marginFromIcon, screenHeight - actualBoxHeight - insets.bottom - keyboardHeight - marginFromEdge);
        
      return { left, top };
    } else {
      // Landscape: position to the side of the icon
      const spaceLeft = iconPosition.x - marginFromEdge;
      const spaceRight = screenWidth - iconPosition.x - marginFromEdge;
      const preferLeft = spaceRight < boxWidth + 40;
      
      const horizontalPos = preferLeft
        ? { left: Math.max(marginFromEdge, iconPosition.x - boxWidth - marginFromIcon) }
        : { right: Math.max(marginFromEdge, screenWidth - iconPosition.x + marginFromIcon) };
        
      // Vertical centering in landscape
      const idealTop = iconPosition.y - actualBoxHeight / 2;
      const top = Math.max(
        insets.top + marginFromEdge,
        Math.min(idealTop, screenHeight - actualBoxHeight - insets.bottom - marginFromEdge)
      );
      
      return { ...horizontalPos, top };
    }
  }, [iconPosition, screenHeight, screenWidth, insets, actualBoxHeight, keyboardHeight, boxWidth, isPortrait]);

  useEffect(() => {
    if (isVisible) {
      // Open animation - instant pop with glow
      Animated.parallel([
        // Instant scale pop
        Animated.spring(scale, {
          toValue: 1,
          tension: 200,
          friction: 10,
          velocity: 5,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150, // Faster for instant feel
          useNativeDriver: true,
        }),
        // Glow pulse
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Emoji bounce animation
        Animated.spring(emojiScale, {
          toValue: 1,
          tension: 250,
          friction: 6,
          delay: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation - quick fade
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(emojiScale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleClose = async () => {
    Keyboard.dismiss();
    onClose();
  };

  const animateSendButton = () => {
    Animated.sequence([
      Animated.spring(sendButtonScale, {
        toValue: 0.95,
        tension: 300,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        tension: 300,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSendComment = async () => {
    if (!inputText.trim()) return;

    animateSendButton();

    const newComment: Comment = {
      id: Date.now().toString(),
      username: 'You',
      emoji: '🎮',
      text: inputText.trim(),
    };

    setComments([newComment, ...comments]);
    setInputText('');

    // Auto-scroll to top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (!isVisible || !iconPosition) return null;

  return (
    <>
      {/* Improved triangle connector */}
      {iconPosition && !isPortrait && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              // Position based on which side the box is on
              ...(boxPosition.left !== undefined ? {
                left: boxPosition.left + boxWidth - 2,
                borderRightWidth: 0,
                borderLeftWidth: triangleSize,
                borderLeftColor: 'rgba(0, 255, 255, 0.3)',
              } : {
                right: boxPosition.right + boxWidth - 2,
                borderLeftWidth: 0,
                borderRightWidth: triangleSize,
                borderRightColor: 'rgba(0, 255, 255, 0.3)',
              }),
              top: iconPosition.y - triangleSize,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderTopWidth: triangleSize,
              borderBottomWidth: triangleSize,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              opacity,
              transform: [{ scale }],
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.container,
          boxPosition,
          {
            width: boxWidth,
            opacity,
            transform: [
              { translateX: boxPosition.left !== undefined ? 0 : translateX }, 
              { scale }
            ],
            maxHeight: actualBoxHeight,
          },
        ]}
      >
        <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.85)']}
            style={styles.gradientContainer}
          >
          <View style={[styles.contentWrapper, isPortrait && styles.contentWrapperPortrait]}>
            {/* Improved Header */}
            <View style={[styles.header, isPortrait && styles.headerPortrait]}>
              <View style={styles.headerLeft}>
                <View style={[styles.commentIconWrapper, isPortrait && styles.commentIconWrapperPortrait]}>
                  <Ionicons name="chatbubble" size={isPortrait ? 14 : 16} color="#00FFFF" />
                </View>
                <Text style={[styles.headerText, isPortrait && styles.headerTextPortrait]}>Comments</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.7}
                style={styles.closeButtonTouchable}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={[styles.closeButton, isPortrait && styles.closeButtonPortrait]}>
                  <Ionicons name="close" size={isPortrait ? 18 : 20} color="rgba(255,255,255,0.7)" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Improved Comments List */}
            <ScrollView
              ref={scrollViewRef}
              style={[
                styles.commentsList,
                {
                  maxHeight: isPortrait 
                    ? actualBoxHeight - 180 - (keyboardHeight > 0 ? 40 : 0) // Account for header, input, and keyboard
                    : actualBoxHeight - 160, // More space in landscape
                }
              ]}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.commentsContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Be the first to comment!</Text>
                </View>
              ) : (
                comments.map((comment, index) => (
                  <Animated.View 
                    key={comment.id} 
                    style={[
                      styles.commentRow,
                      isPortrait && styles.commentRowPortrait,
                      {
                        opacity: opacity,
                        transform: [{
                          translateY: opacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          })
                        }],
                      }
                    ]}
                  >
                    <View style={[styles.avatarWrapper, isPortrait && styles.avatarWrapperPortrait]}>
                      <Text style={[styles.emoji, isPortrait && styles.emojiPortrait]}>{comment.emoji}</Text>
                    </View>
                    <View style={styles.commentTextWrapper}>
                      <Text style={[styles.username, isPortrait && styles.usernamePortrait]}>{comment.username}</Text>
                      <Text style={[styles.commentText, isPortrait && styles.commentTextPortrait]}>{comment.text}</Text>
                    </View>
                  </Animated.View>
                ))
              )}
            </ScrollView>

            {/* Improved Input Section */}
            <View style={[styles.inputSection, isPortrait && styles.inputSectionPortrait]}>
              <View style={[styles.inputWrapper, isPortrait && styles.inputWrapperPortrait]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, isPortrait && styles.inputPortrait]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Add a comment..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  maxLength={150}
                  returnKeyType="send"
                  onSubmitEditing={handleSendComment}
                  blurOnSubmit={true}
                />

                <TouchableOpacity
                  onPress={handleSendComment}
                  activeOpacity={0.7}
                  disabled={!inputText.trim()}
                  style={styles.sendButtonTouchable}
                >
                  <Animated.View
                    style={[
                      styles.sendButton,
                      isPortrait && styles.sendButtonPortrait,
                      {
                        transform: [{ scale: sendButtonScale }],
                        opacity: inputText.trim() ? 1 : 0.3,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={inputText.trim() ? ['#00FFFF', '#00CCCC'] : ['#333', '#222']}
                      style={styles.sendButtonGradient}
                    >
                      <Ionicons name="send" size={isPortrait ? 14 : 16} color={inputText.trim() ? '#000' : '#666'} />
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              </View>
              {inputText.length > 100 && (
                <Text style={[styles.charCount, isPortrait && styles.charCountPortrait]}>{150 - inputText.length}</Text>
              )}
            </View>
          </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
      
      {/* Backdrop for closing */}
      {isVisible && (
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          onPress={handleClose}
          activeOpacity={1}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    minHeight: 200,
    zIndex: 1001,
    // Enhanced shadow for better depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientContainer: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  contentWrapper: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButtonTouchable: {
    padding: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingBottom: 16,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emoji: {
    fontSize: 20,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  commentTextWrapper: {
    flex: 1,
  },
  username: {
    fontWeight: '700',
    fontSize: 14,
    color: '#00FFFF',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  commentText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  inputSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
    marginTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 4,
    maxHeight: 84,
    lineHeight: 22,
  },
  sendButtonTouchable: {
    marginLeft: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'right',
    marginTop: 6,
    marginRight: 4,
  },
  // Portrait mode specific styles
  contentWrapperPortrait: {
    padding: 16,
  },
  headerPortrait: {
    marginBottom: 16,
    paddingBottom: 12,
  },
  commentIconWrapperPortrait: {
    width: 28,
    height: 28,
  },
  headerTextPortrait: {
    fontSize: 16,
  },
  closeButtonPortrait: {
    width: 32,
    height: 32,
  },
  commentRowPortrait: {
    marginBottom: 16,
  },
  avatarWrapperPortrait: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  emojiPortrait: {
    fontSize: 18,
  },
  usernamePortrait: {
    fontSize: 13,
    marginBottom: 4,
  },
  commentTextPortrait: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputSectionPortrait: {
    paddingTop: 12,
    marginTop: 4,
  },
  inputWrapperPortrait: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputPortrait: {
    fontSize: 15,
    maxHeight: 70,
  },
  sendButtonPortrait: {
    width: 36,
    height: 36,
  },
  charCountPortrait: {
    fontSize: 11,
    marginTop: 4,
  },
});
