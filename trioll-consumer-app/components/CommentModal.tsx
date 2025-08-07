import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
// import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Game } from '../types';
import { SafeImage } from './base/SafeImage';
import { useHaptics, useOrientation } from '../hooks';

interface CommentModalProps {
  game: Game;
  visible: boolean;
  onClose: () => void;
  onSubmit?: (gameId: string, comment: string) => Promise<void>;
  currentUserId?: string;
  isGuest?: boolean;
}

export const CommentModal: React.FC<CommentModalProps> = ({ game, visible, onClose, onSubmit, currentUserId, isGuest = false }) => {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { isPortrait } = useOrientation();
  const windowDimensions = useWindowDimensions();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  
  // Load comments when modal opens
  React.useEffect(() => {
    if (visible && game) {
      loadComments();
    }
  }, [visible, game]);
  
  const loadComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const TriollAPIModule = await import('../src/services/api/TriollAPI');
      const api = TriollAPIModule.default;
      const response = await api.getGameComments(game.id);
      setComments(response.comments || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
      setError('Failed to load comments');
      // Use mock comments as fallback
      setComments([
        { commentId: '1', userId: 'Player123', comment: 'This game is amazing! Love the graphics!', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { commentId: '2', userId: 'GamerPro', comment: 'Great gameplay, but needs more levels', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
        { commentId: '3', userId: 'CasualFan', comment: 'Fun to play during breaks', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      ]);
    } finally {
      setIsLoading(false);
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

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    haptics.impact('light');
    
    try {
      if (onSubmit) {
        await onSubmit(game.id, comment.trim());
        setComment('');
        haptics.impact('success');
        // Reload comments to show the new one
        await loadComments();
      } else {
        // Fallback to local update
        const newComment = {
          commentId: Date.now().toString(),
          userId: currentUserId || 'You',
          comment: comment.trim(),
          timestamp: new Date().toISOString(),
          likes: 0
        };
        setComments([newComment, ...comments]);
        setComment('');
        haptics.impact('success');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      haptics.impact('error');
      setError('Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingCommentId(commentId);
    haptics.impact('light');
    
    try {
      const TriollAPIModule = await import('../src/services/api/TriollAPI');
      const api = TriollAPIModule.default;
      await api.deleteGameComment(game.id, commentId);
      haptics.impact('success');
      
      // Remove the comment from local state
      setComments(comments.filter(c => c.commentId !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      haptics.impact('error');
      setError('Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[
          styles.modalContent, 
          { paddingBottom: insets.bottom },
          !isPortrait && styles.modalContentLandscape
        ]}>
          {/* Header */}
          <View style={[styles.header, !isPortrait && styles.headerLandscape]}>
            <View style={styles.headerLeft}>
              <SafeImage
                source={{ uri: game.thumbnailUrl }}
                style={[styles.gameThumbnail, !isPortrait && styles.gameThumbnailLandscape]}
              />
              <View>
                <Text style={[styles.gameTitle, !isPortrait && styles.gameTitleLandscape]}>{game.title}</Text>
                <Text style={[styles.commentCount, !isPortrait && styles.commentCountLandscape]}>{game.commentsCount || 0} comments</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Comments List */}
          <ScrollView style={[styles.commentsList, !isPortrait && styles.commentsListLandscape]} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading comments...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              </View>
            ) : (
              comments.map(comment => (
                <View key={comment.commentId} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentHeaderLeft}>
                      <Text style={styles.username}>{comment.userId.replace('guest-', 'Guest ')}</Text>
                      <Text style={styles.commentTime}>{formatTimeAgo(comment.timestamp)}</Text>
                    </View>
                    {currentUserId && !isGuest && comment.userId === currentUserId && (
                      <Pressable 
                        onPress={() => handleDelete(comment.commentId)}
                        style={styles.deleteButton}
                        disabled={deletingCommentId === comment.commentId}
                      >
                        {deletingCommentId === comment.commentId ? (
                          <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                        )}
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.commentText}>{comment.comment || comment.commentText}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            {isGuest ? (
              <View style={styles.guestMessage}>
                <Text style={styles.guestMessageText}>Sign up to comment on games</Text>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor="#666"
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={200}
              />
            )}
            {!isGuest && (
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
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  commentCount: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    marginBottom: 20,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  commentTime: {
    color: '#666',
    fontSize: 12,
  },
  commentText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  // Landscape styles
  modalContentLandscape: {
    maxHeight: '50%',
    marginTop: 20,
    marginHorizontal: '10%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLandscape: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  gameThumbnailLandscape: {
    width: 32,
    height: 32,
  },
  gameTitleLandscape: {
    fontSize: 14,
  },
  commentCountLandscape: {
    fontSize: 11,
  },
  commentsListLandscape: {
    maxHeight: 200,
    paddingVertical: 8,
  },
  guestMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  guestMessageText: {
    color: '#999',
    fontSize: 16,
    fontStyle: 'italic',
  },
});