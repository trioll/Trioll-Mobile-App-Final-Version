
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface RatingsSectionProps {
  gameId: string;
  rating?: number;
  totalRatings?: number;
  onRate?: (rating: number) => void;
}

interface Review {
  id: string;
  user: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
  developerResponse?: string;
}

export const RatingsSection: React.FC<RatingsSectionProps> = ({
  gameId: _gameId,
  rating = 0,
  totalRatings = 0,
  onRate,
}) => {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [userRating, setUserRating] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Mock rating distribution
  const safeTotal = totalRatings || 0;
  const ratingDistribution = [
    { stars: 5, percentage: 45, count: Math.floor(safeTotal * 0.45) },
    { stars: 4, percentage: 30, count: Math.floor(safeTotal * 0.3) },
    { stars: 3, percentage: 15, count: Math.floor(safeTotal * 0.15) },
    { stars: 2, percentage: 8, count: Math.floor(safeTotal * 0.08) },
    { stars: 1, percentage: 2, count: Math.floor(safeTotal * 0.02) },
  ];

  // Reviews will be loaded from API
  const reviews: Review[] = [];

  const toggleHelpful = (reviewId: string) => {
    setHelpfulReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < count ? 'star' : 'star-outline' as any}
        size={12}
        color={i < count ? '#FFD700' : '#666'}
      />
    ));
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Ratings & Reviews</Text>

      {/* Rating Overview */}
      <View style={styles.ratingOverview}>
        <View style={styles.ratingScore}>
          <Text style={styles.bigRating}>{(rating || 0).toFixed(1)}</Text>
          <View style={styles.starRow}>{renderStars(Math.round(rating || 0))}</View>
          <Text style={styles.totalRatings}>{(totalRatings || 0).toLocaleString()} ratings</Text>
        </View>

        <View style={styles.ratingBars}>
          {ratingDistribution.map(dist => (
            <View key={dist.stars} style={styles.ratingBar}>
              <View style={styles.starLabel}>{renderStars(dist.stars)}</View>
              <View style={styles.barContainer}>
                <View style={styles.barBackground}>
                  <View style={[styles.barFill, { width: `${dist.percentage}%` }]} />
                </View>
              </View>
              <Text style={styles.percentage}>{dist.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Rate This Game Button */}
      <Pressable style={styles.rateButton} onPress={() => setShowRatingModal(true)}>
        <LinearGradient colors={['#6366f1', '#5558e3']} style={styles.rateButtonGradient}>
          <Ionicons
            name={userRating ? 'star' : 'star-outline' as any}
            size={20}
            color="#fff"
          />
          <Text style={styles.rateButtonText}>
            {userRating ? `Your Rating: ${userRating}★` : 'Rate This Game'}
          </Text>
        </LinearGradient>
      </Pressable>

      {/* Reviews */}
      <View style={styles.reviewsSection}>
        <Text style={styles.reviewsTitle}>Top Reviews</Text>

        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No reviews yet</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to review this game!</Text>
          </View>
        ) : displayedReviews.map(review => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Image source={{ uri: review.avatar }} style={styles.avatar} />
              <View style={styles.reviewInfo}>
                <Text style={styles.userName}>{review.user}</Text>
                <View style={styles.reviewMeta}>
                  <View style={styles.reviewStars}>{renderStars(review.rating)}</View>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.reviewComment}>{review.comment}</Text>

            {review.developerResponse && (
              <View style={styles.developerResponse}>
                <View style={styles.developerHeader}>
                  <Ionicons name="shield-checkmark" size={16} color="#6366f1" />
                  <Text style={styles.developerLabel}>Developer Response</Text>
                </View>
                <Text style={styles.developerComment}>{review.developerResponse}</Text>
              </View>
            )}

            <View style={styles.reviewActions}>
              <Pressable style={styles.helpfulButton} onPress={() => toggleHelpful(review.id)}>
                <Ionicons
                  name={helpfulReviews.has(review.id) ? 'thumbs-up' : 'thumbs-up-outline' as any}
                  size={16}
                  color={helpfulReviews.has(review.id) ? '#6366f1' : '#999'}
                />
                <Text
                  style={[
                    styles.helpfulText,
                    helpfulReviews.has(review.id) && styles.helpfulTextActive,
                  ]}
                >
                  Helpful ({review.helpful + (helpfulReviews.has(review.id) ? 1 : 0)})
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {reviews.length > 2 && (
          <Pressable
            style={styles.loadMoreButton}
            onPress={() => setShowAllReviews(!showAllReviews)}
          >
            <Text style={styles.loadMoreText}>
              {showAllReviews ? 'Show Less' : `Load More Reviews (${reviews.length - 2})`}
            </Text>
            <Ionicons
              name={showAllReviews ? 'chevron-up' : 'chevron-down' as any}
              size={16}
              color="#6366f1"
            />
          </Pressable>
        )}
      </View>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRatingModal(false)}>
          <Pressable style={styles.ratingModal} onPress={e => e.stopPropagation()}>
            <BlurView intensity={100} tint="dark" style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rate This Game</Text>
              <Text style={styles.modalSubtitle}>Tap a star to rate</Text>

              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable
                    key={star}
                    onPress={() => {
                      setUserRating(star);
                      if (onRate) {
                        onRate(star);
                      }
                      setTimeout(() => setShowRatingModal(false), 300);
                    }}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={userRating && userRating >= star ? 'star' : 'star-outline' as any}
                      size={40}
                      color={userRating && userRating >= star ? '#FFD700' : '#666'}
                    />
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.cancelButton} onPress={() => setShowRatingModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModal: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  starButton: {
    padding: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },
  container: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  ratingOverview: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  ratingScore: {
    alignItems: 'center',
    marginRight: 30,
  },
  bigRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  starRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  totalRatings: {
    color: '#999',
    fontSize: 14,
  },
  ratingBars: {
    flex: 1,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starLabel: {
    flexDirection: 'row',
    width: 70,
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  barBackground: {
    height: 8,
    backgroundColor: '#2a2a3e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  percentage: {
    color: '#999',
    fontSize: 12,
    width: 35,
    textAlign: 'right',
  },
  rateButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewsSection: {
    paddingHorizontal: 20,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewStars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  reviewDate: {
    color: '#999',
    fontSize: 12,
  },
  reviewComment: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  developerResponse: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  developerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  developerLabel: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  developerComment: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 18,
  },
  reviewActions: {
    flexDirection: 'row',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulText: {
    color: '#999',
    fontSize: 14,
    marginLeft: 6,
  },
  helpfulTextActive: {
    color: '#6366f1',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  loadMoreText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
});
