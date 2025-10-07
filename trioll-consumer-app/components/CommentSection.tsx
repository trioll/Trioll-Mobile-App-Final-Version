import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '../hooks';
import { getLogger } from '../src/utils/logger';
import { responsiveSpacing } from '../utils/responsive';

const logger = getLogger('CommentSection');

interface CommentSectionProps {
  gameId: string;
  isVisible: boolean;
  onClose?: () => void;
  currentUserId?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  gameId,
  isVisible,
  onClose,
  currentUserId,
}) => {
  const _insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const minHeight = 150;
  const maxHeight = screenHeight * 0.5;
  const expandedHeight = useRef(new Animated.Value(minHeight)).current;
  const [isExpanded, setIsExpanded] = useState(false);

  // Expand/collapse animation
  const toggleExpanded = () => {
    haptics.impact('light');
    const toValue = isExpanded ? minHeight : maxHeight;
    
    Animated.spring(expandedHeight, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    
    setIsExpanded(!isExpanded);
    
    // Load comments when expanding
    if (!isExpanded && comments.length === 0) {
      loadComments();
    }
  };

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const TriollAPIModule = await import('../src/services/api/TriollAPI');
      const api = TriollAPIModule.default;
      const response = await api.getGameComments(gameId);
      setComments(response.comments || []);
    } catch {
      logger.error('Failed to load comments:', error);
      // Use mock comments as fallback
      setComments([
        { commentId: '1', userId: 'Player123', commentText: 'This game is amazing! Love the graphics!', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { commentId: '2', userId: 'GamerPro', commentText: 'Great gameplay, but needs more levels', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    haptics.impact('light');
    
    try {
      const TriollAPIModule = await import('../src/services/api/TriollAPI');
      const api = TriollAPIModule.default;
      await api.addGameComment(gameId, comment.trim());
      setComment('');
      haptics.impact('success');
      // Reload comments
      await loadComments();
    } catch {
      logger.error('Failed to submit comment:', error);
      haptics.impact('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return `${mins}m ago`;
    } else if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          height: expandedHeight,
          paddingBottom: _insets.bottom 
        }
      ]}
    >
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.content}>
        {/* Header with expand/collapse button */}
        <Pressable onPress={toggleExpanded} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Comments</Text>
            {comments.length > 0 && (
              <Text style={styles.commentCount}>{comments.length}</Text>
            )}
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-down" : "chevron-up"} 
            size={24} 
            color="#FFFFFF" 
          />
        </Pressable>

        {/* Comments list - only visible when expanded */}
        {isExpanded && (
          <ScrollView 
            style={styles.commentsList} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.commentsContent}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6366f1" />
              </View>
            ) : comments.length === 0 ? (
              <Text style={styles.emptyText}>Be the first to comment!</Text>
            ) : (
              comments.map(comment => (
                <View key={comment.commentId} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.username}>
                      {comment.userId.replace('guest-', 'Guest ')}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatTimeAgo(comment.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>
                    {comment.comment || comment.commentText}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Input area - always visible */}
        <View style={styles.inputContainer}>
          <View style={styles.currentUser}>
            <Text style={styles.currentUsername}>
              {currentUserId ? currentUserId.replace('guest-', 'Guest ') : 'Guest'}
            </Text>
            <Text style={styles.timestamp}>now</Text>
          </View>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
              value={comment}
              onChangeText={setComment}
              onFocus={() => {
                if (!isExpanded) {
                  toggleExpanded();
                }
              }}
              multiline
              maxLength={200}
            />
            <Pressable
              style={[styles.sendButton, !comment.trim() && styles.sendButtonDisabled]}
              onPress={handleSubmit}
              disabled={!comment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="send" size={20} color={comment.trim() ? '#000' : '#666'} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  commentCount: {
    color: '#666',
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  commentsList: {
    flex: 1,
    marginBottom: 12,
  },
  commentsContent: {
    paddingBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  commentText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: responsiveSpacing.relaxed,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  currentUser: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  currentUsername: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 80,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});