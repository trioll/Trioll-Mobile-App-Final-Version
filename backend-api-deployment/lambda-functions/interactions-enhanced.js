// Enhanced User Interactions API with Game Progress, Streaks, and Achievements
// Extends interactions-dynamodb-final.js with new features

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// Table names - existing plus new
const GAMES_TABLE = process.env.GAMES_TABLE || 'trioll-prod-games';
const LIKES_TABLE = process.env.LIKES_TABLE || 'trioll-prod-likes';
const RATINGS_TABLE = process.env.RATINGS_TABLE || 'trioll-prod-ratings';
const PLAYCOUNTS_TABLE = process.env.PLAYCOUNTS_TABLE || 'trioll-prod-playcounts';
const COMMENTS_TABLE = process.env.COMMENTS_TABLE || 'trioll-prod-comments';
const GAME_PROGRESS_TABLE = process.env.GAME_PROGRESS_TABLE || 'trioll-prod-game-progress';
const USER_STREAKS_TABLE = process.env.USER_STREAKS_TABLE || 'trioll-prod-user-streaks';
const ACHIEVEMENTS_TABLE = process.env.ACHIEVEMENTS_TABLE || 'trioll-prod-achievements';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Copy the main handler from interactions-dynamodb-final.js
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || '';
    const pathParameters = event.pathParameters || {};
    const gameId = pathParameters.gameId || pathParameters.id;
    
    // Extract user ID
    const userId = getUserIdFromEvent(event);
    
    // NEW ROUTES
    if (path.includes('/progress')) {
      if (method === 'GET') {
        return await handleGetGameProgress(gameId, userId);
      } else if (method === 'POST' || method === 'PUT') {
        const body = JSON.parse(event.body || '{}');
        return await handleSaveGameProgress(gameId, userId, body);
      }
    } else if (path.includes('/streaks')) {
      if (method === 'GET') {
        return await handleGetUserStreaks(userId);
      } else if (method === 'POST') {
        return await handleUpdateStreak(userId);
      }
    } else if (path.includes('/achievements')) {
      if (method === 'GET') {
        return await handleGetUserAchievements(userId);
      } else if (method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        return await handleUnlockAchievement(userId, body.achievementId);
      }
    } else if (path.includes('/leaderboard')) {
      return await handleGetLeaderboard(gameId, event.queryStringParameters);
    }
    
    // Include all existing routes from interactions-dynamodb-final.js
    if (!gameId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Game ID required' })
      };
    }
    
    // Existing routes (copy from original)
    if (path.includes('/likes')) {
      if (method === 'POST') {
        return await handleLikeGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnlikeGame(gameId, userId);
      }
    } else if (path.includes('/plays')) {
      const result = await handlePlayGame(gameId, userId);
      // Also update streak when playing
      await updatePlayStreak(userId);
      return result;
    } else if (path.includes('/ratings')) {
      const body = JSON.parse(event.body || '{}');
      return await handleRateGame(gameId, userId, body.rating);
    } else if (path.includes('/bookmarks')) {
      if (method === 'POST') {
        return await handleBookmarkGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnbookmarkGame(gameId, userId);
      }
    } else if (path.includes('/comments')) {
      if (method === 'GET') {
        return await handleGetComments(gameId);
      } else if (method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        return await handleAddComment(gameId, userId, body.comment);
      } else if (method === 'DELETE') {
        const commentId = pathParameters.commentId;
        return await handleDeleteComment(gameId, userId, commentId);
      }
    }
    
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

// NEW FEATURE: Game Progress/Saves
async function handleGetGameProgress(gameId, userId) {
  try {
    const response = await dynamodb.send(new GetCommand({
      TableName: GAME_PROGRESS_TABLE,
      Key: { 
        userId,
        gameId
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response.Item || {
        userId,
        gameId,
        progress: {},
        lastPlayed: null,
        totalPlayTime: 0
      })
    };
  } catch (error) {
    console.error('Error getting game progress:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get game progress' })
    };
  }
}

async function handleSaveGameProgress(gameId, userId, progressData) {
  try {
    const now = new Date().toISOString();
    
    // Validate progress data
    if (!progressData.progress || typeof progressData.progress !== 'object') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid progress data' })
      };
    }
    
    // Save progress
    await dynamodb.send(new PutCommand({
      TableName: GAME_PROGRESS_TABLE,
      Item: {
        userId,
        gameId,
        progress: progressData.progress,
        level: progressData.level || 1,
        score: progressData.score || 0,
        achievements: progressData.achievements || [],
        lastPlayed: now,
        totalPlayTime: progressData.totalPlayTime || 0,
        updatedAt: now,
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
      }
    }));
    
    // Check for achievement unlocks based on progress
    await checkProgressAchievements(userId, gameId, progressData);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true,
        savedAt: now
      })
    };
  } catch (error) {
    console.error('Error saving game progress:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to save game progress' })
    };
  }
}

// NEW FEATURE: Play Streaks
async function handleGetUserStreaks(userId) {
  try {
    const response = await dynamodb.send(new GetCommand({
      TableName: USER_STREAKS_TABLE,
      Key: { userId }
    }));
    
    const streakData = response.Item || {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayDate: null,
      totalDaysPlayed: 0
    };
    
    // Check if streak is still active
    if (streakData.lastPlayDate) {
      const lastPlay = new Date(streakData.lastPlayDate);
      const today = new Date();
      const daysDiff = Math.floor((today - lastPlay) / (1000 * 60 * 60 * 24));
      
      // Streak broken if more than 1 day since last play
      if (daysDiff > 1) {
        streakData.currentStreak = 0;
      }
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(streakData)
    };
  } catch (error) {
    console.error('Error getting user streaks:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get user streaks' })
    };
  }
}

async function updatePlayStreak(userId) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get current streak data
    const response = await dynamodb.send(new GetCommand({
      TableName: USER_STREAKS_TABLE,
      Key: { userId }
    }));
    
    const currentData = response.Item || {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayDate: null,
      totalDaysPlayed: 0,
      playDates: []
    };
    
    // Check if already played today
    if (currentData.lastPlayDate === today) {
      return; // Already updated today
    }
    
    // Calculate new streak
    let newStreak = 1;
    if (currentData.lastPlayDate) {
      const lastPlay = new Date(currentData.lastPlayDate);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate - lastPlay) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day - continue streak
        newStreak = currentData.currentStreak + 1;
      }
      // If daysDiff > 1, streak is broken, newStreak stays at 1
    }
    
    // Update streak data
    await dynamodb.send(new UpdateCommand({
      TableName: USER_STREAKS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET currentStreak = :streak, longestStreak = :longest, lastPlayDate = :date, totalDaysPlayed = :total, playDates = list_append(if_not_exists(playDates, :empty), :newDate)',
      ExpressionAttributeValues: {
        ':streak': newStreak,
        ':longest': Math.max(newStreak, currentData.longestStreak || 0),
        ':date': today,
        ':total': (currentData.totalDaysPlayed || 0) + 1,
        ':empty': [],
        ':newDate': [today]
      }
    }));
    
    // Check for streak achievements
    await checkStreakAchievements(userId, newStreak);
    
  } catch (error) {
    console.error('Error updating play streak:', error);
    // Don't fail the main operation if streak update fails
  }
}

// NEW FEATURE: Achievements
async function handleGetUserAchievements(userId) {
  try {
    // Get all achievements for user
    const response = await dynamodb.send(new QueryCommand({
      TableName: ACHIEVEMENTS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        userId,
        achievements: response.Items || [],
        totalUnlocked: response.Count || 0
      })
    };
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get achievements' })
    };
  }
}

async function handleUnlockAchievement(userId, achievementId) {
  try {
    const now = new Date().toISOString();
    
    // Check if already unlocked
    const existing = await dynamodb.send(new GetCommand({
      TableName: ACHIEVEMENTS_TABLE,
      Key: { 
        userId,
        achievementId
      }
    }));
    
    if (existing.Item) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          alreadyUnlocked: true,
          unlockedAt: existing.Item.unlockedAt
        })
      };
    }
    
    // Unlock achievement
    await dynamodb.send(new PutCommand({
      TableName: ACHIEVEMENTS_TABLE,
      Item: {
        userId,
        achievementId,
        unlockedAt: now,
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60 * 2) // 2 years TTL
      }
    }));
    
    // Update user stats
    await updateUserAchievementCount(userId);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        achievementId,
        unlockedAt: now
      })
    };
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to unlock achievement' })
    };
  }
}

// NEW FEATURE: Leaderboards
async function handleGetLeaderboard(gameId, queryParams = {}) {
  try {
    const timeframe = queryParams.timeframe || 'all'; // all, daily, weekly, monthly
    const limit = Math.min(parseInt(queryParams.limit) || 100, 100);
    
    // For now, return top scores from game progress
    // In production, you'd want a dedicated leaderboard table with GSI
    const response = await dynamodb.send(new QueryCommand({
      TableName: GAME_PROGRESS_TABLE,
      IndexName: 'gameId-score-index', // Would need to create this GSI
      KeyConditionExpression: 'gameId = :gameId',
      ExpressionAttributeValues: {
        ':gameId': gameId
      },
      ScanIndexForward: false, // Descending order
      Limit: limit
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        timeframe,
        leaderboard: response.Items || [],
        count: response.Count || 0
      })
    };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get leaderboard' })
    };
  }
}

// Helper function to check achievements
async function checkProgressAchievements(userId, gameId, progressData) {
  // Achievement logic based on progress
  const achievements = [];
  
  // First win
  if (progressData.score > 0 && progressData.level === 1) {
    achievements.push('first_win');
  }
  
  // High score achievements
  if (progressData.score >= 1000) achievements.push('score_1000');
  if (progressData.score >= 10000) achievements.push('score_10000');
  if (progressData.score >= 100000) achievements.push('score_100000');
  
  // Level achievements
  if (progressData.level >= 10) achievements.push('level_10');
  if (progressData.level >= 50) achievements.push('level_50');
  if (progressData.level >= 100) achievements.push('level_100');
  
  // Unlock achievements
  for (const achievementId of achievements) {
    await handleUnlockAchievement(userId, achievementId);
  }
}

async function checkStreakAchievements(userId, currentStreak) {
  const streakAchievements = [
    { streak: 3, id: 'streak_3_days' },
    { streak: 7, id: 'streak_week' },
    { streak: 30, id: 'streak_month' },
    { streak: 100, id: 'streak_100_days' },
    { streak: 365, id: 'streak_year' }
  ];
  
  for (const achievement of streakAchievements) {
    if (currentStreak >= achievement.streak) {
      await handleUnlockAchievement(userId, achievement.id);
    }
  }
}

async function updateUserAchievementCount(userId) {
  try {
    await dynamodb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'ADD achievementCount :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      }
    }));
  } catch (error) {
    console.error('Error updating user achievement count:', error);
  }
}

// Include all the helper functions from interactions-dynamodb-final.js
function getUserIdFromEvent(event) {
  // Same implementation as original
  const headers = event.headers || {};
  
  if (headers['X-Identity-Id']) {
    return headers['X-Identity-Id'];
  }
  
  if (event.requestContext?.authorizer?.claims?.sub) {
    return event.requestContext.authorizer.claims.sub;
  }
  
  if (headers.Authorization) {
    const token = headers.Authorization.replace('Bearer ', '');
    if (token.startsWith('guest-')) {
      return token;
    }
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    if (body.userId) return body.userId;
  } catch (e) {}
  
  return `guest-${Math.random().toString(36).substr(2, 9)}`;
}

// Copy all the existing handler functions from interactions-dynamodb-final.js
async function handleLikeGame(gameId, userId) {
  try {
    console.log('Handling like for game:', gameId, 'user:', userId);
    
    // Check if already liked
    let existingLike = null;
    try {
      const response = await dynamodb.send(new GetCommand({
        TableName: LIKES_TABLE,
        Key: { gameId, userId }
      }));
      existingLike = response.Item;
    } catch (err) {
      // Item doesn't exist
    }
    
    if (existingLike) {
      // Already liked, get current count
      const game = await getGameStats(gameId);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          gameId, 
          likeCount: game.likeCount || 0,
          userLiked: true,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Add like
    await dynamodb.send(new PutCommand({
      TableName: LIKES_TABLE,
      Item: {
        gameId,
        userId,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
      }
    }));
    
    // Update game stats
    const updateResult = await updateGameLikeCount(gameId, 1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        gameId, 
        likeCount: updateResult.likeCount,
        userLiked: true,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error liking game:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to like game' })
    };
  }
}

async function handleUnlikeGame(gameId, userId) {
  try {
    // Remove like
    await dynamodb.send(new DeleteCommand({
      TableName: LIKES_TABLE,
      Key: { gameId, userId }
    }));
    
    // Update game stats
    await updateGameLikeCount(gameId, -1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true, 
        gameId, 
        userId 
      })
    };
  } catch (error) {
    console.error('Error unliking game:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to unlike game' })
    };
  }
}

async function handlePlayGame(gameId, userId) {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const date = now.toISOString().split('T')[0];
    
    // Record play
    await dynamodb.send(new PutCommand({
      TableName: PLAYCOUNTS_TABLE,
      Item: {
        gameId,
        date,
        userId,
        playCount: 1,
        sessionId: `session-${Date.now()}`,
        timestamp,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
      }
    }));
    
    // Update game stats
    const updateResult = await updateGamePlayCount(gameId, 1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        gameId,
        playCount: updateResult.playCount,
        timestamp
      })
    };
  } catch (error) {
    console.error('Error recording play:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to record play' })
    };
  }
}

async function handleRateGame(gameId, userId, rating) {
  if (!rating || rating < 1 || rating > 5) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid rating. Must be between 1 and 5.' })
    };
  }
  
  try {
    // Check existing rating
    let existingRating = null;
    try {
      const response = await dynamodb.send(new GetCommand({
        TableName: RATINGS_TABLE,
        Key: { gameId, userId }
      }));
      existingRating = response.Item;
    } catch (err) {
      // Item doesn't exist
    }
    
    const oldRating = existingRating?.rating || 0;
    const isNewRating = !existingRating;
    
    // Save rating
    await dynamodb.send(new PutCommand({
      TableName: RATINGS_TABLE,
      Item: {
        gameId,
        userId,
        rating,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
      }
    }));
    
    // Update game stats
    const stats = await updateGameRating(gameId, rating, oldRating, isNewRating);
    const averageRating = stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0;
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        gameId,
        rating,
        totalRatings: stats.ratingCount,
        averageRating: parseFloat(averageRating.toFixed(1)),
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error rating game:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to rate game' })
    };
  }
}

async function handleBookmarkGame(gameId, userId) {
  try {
    await dynamodb.send(new PutCommand({
      TableName: LIKES_TABLE,
      Item: {
        gameId,
        userId: `bookmark#${userId}`,
        timestamp: new Date().toISOString(),
        type: 'bookmark',
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true, 
        gameId, 
        userId,
        bookmarked: true,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error bookmarking:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to bookmark' })
    };
  }
}

async function handleUnbookmarkGame(gameId, userId) {
  try {
    await dynamodb.send(new DeleteCommand({
      TableName: LIKES_TABLE,
      Key: { 
        gameId,
        userId: `bookmark#${userId}`
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true, 
        gameId, 
        userId,
        bookmarked: false
      })
    };
  } catch (error) {
    console.error('Error unbookmarking:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to unbookmark' })
    };
  }
}

// Comments handlers
async function handleGetComments(gameId) {
  try {
    const response = await dynamodb.send(new QueryCommand({
      TableName: COMMENTS_TABLE,
      KeyConditionExpression: 'gameId = :gameId',
      ExpressionAttributeValues: {
        ':gameId': gameId
      },
      ScanIndexForward: false,
      Limit: 50
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        comments: response.Items || [],
        count: response.Count || 0
      })
    };
  } catch (error) {
    console.error('Error getting comments:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get comments' })
    };
  }
}

async function handleAddComment(gameId, userId, comment) {
  if (!comment || comment.trim().length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Comment text required' })
    };
  }
  
  if (comment.length > 500) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Comment too long (max 500 characters)' })
    };
  }
  
  try {
    const timestamp = new Date().toISOString();
    const commentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Save comment
    await dynamodb.send(new PutCommand({
      TableName: COMMENTS_TABLE,
      Item: {
        gameId,
        commentId,
        userId,
        comment: comment.trim(),
        timestamp,
        likes: 0,
        edited: false,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
      }
    }));
    
    // Update game comment count
    await updateGameCommentCount(gameId, 1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        commentId,
        userId,
        comment: comment.trim(),
        timestamp,
        likes: 0
      })
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to add comment' })
    };
  }
}

async function handleDeleteComment(gameId, userId, commentId) {
  if (!commentId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Comment ID required' })
    };
  }
  
  try {
    // First check if the comment belongs to the user
    const getResponse = await dynamodb.send(new GetCommand({
      TableName: COMMENTS_TABLE,
      Key: { gameId, commentId }
    }));
    
    if (!getResponse.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Comment not found' })
      };
    }
    
    if (getResponse.Item.userId !== userId) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to delete this comment' })
      };
    }
    
    // Delete the comment
    await dynamodb.send(new DeleteCommand({
      TableName: COMMENTS_TABLE,
      Key: { gameId, commentId }
    }));
    
    // Update game comment count
    await updateGameCommentCount(gameId, -1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        gameId,
        commentId
      })
    };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to delete comment' })
    };
  }
}

// Helper functions
async function getGameStats(gameId) {
  try {
    const response = await dynamodb.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' }
    }));
    
    return response.Item || {
      gameId: gameId,
      likeCount: 0,
      playCount: 0,
      ratingCount: 0,
      totalRating: 0,
      commentCount: 0
    };
  } catch (error) {
    console.error('Error getting game stats:', error);
    return {
      gameId: gameId,
      likeCount: 0,
      playCount: 0,
      ratingCount: 0,
      totalRating: 0,
      commentCount: 0
    };
  }
}

async function updateGameLikeCount(gameId, increment) {
  try {
    const response = await dynamodb.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: 'ADD likeCount :inc',
      ExpressionAttributeValues: { ':inc': increment },
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { likeCount: 0 };
  } catch (error) {
    if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') {
      // Game doesn't exist, create it
      await dynamodb.send(new PutCommand({
        TableName: GAMES_TABLE,
        Item: {
          gameId: gameId,
          version: 'v0',
          likeCount: Math.max(0, increment),
          playCount: 0,
          ratingCount: 0,
          totalRating: 0,
          commentCount: 0,
          createdAt: new Date().toISOString()
        }
      }));
      return { likeCount: Math.max(0, increment) };
    }
    throw error;
  }
}

async function updateGamePlayCount(gameId, increment) {
  try {
    const response = await dynamodb.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: 'ADD playCount :inc',
      ExpressionAttributeValues: { ':inc': increment },
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { playCount: 0 };
  } catch (error) {
    if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') {
      // Game doesn't exist, create it
      await dynamodb.send(new PutCommand({
        TableName: GAMES_TABLE,
        Item: {
          gameId: gameId,
          version: 'v0',
          likeCount: 0,
          playCount: increment,
          ratingCount: 0,
          totalRating: 0,
          commentCount: 0,
          createdAt: new Date().toISOString()
        }
      }));
      return { playCount: increment };
    }
    throw error;
  }
}

async function updateGameRating(gameId, rating, oldRating, isNewRating) {
  try {
    let updateExpression = 'ADD totalRating :ratingDiff';
    const expressionValues = {
      ':ratingDiff': rating - oldRating
    };
    
    if (isNewRating) {
      updateExpression += ', ratingCount :inc';
      expressionValues[':inc'] = 1;
    }
    
    const response = await dynamodb.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { ratingCount: 1, totalRating: rating };
  } catch (error) {
    if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') {
      // Game doesn't exist, create it
      await dynamodb.send(new PutCommand({
        TableName: GAMES_TABLE,
        Item: {
          gameId: gameId,
          version: 'v0',
          likeCount: 0,
          playCount: 0,
          ratingCount: 1,
          totalRating: rating,
          commentCount: 0,
          createdAt: new Date().toISOString()
        }
      }));
      return { ratingCount: 1, totalRating: rating };
    }
    throw error;
  }
}

async function updateGameCommentCount(gameId, increment) {
  try {
    const response = await dynamodb.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: 'ADD commentCount :inc',
      ExpressionAttributeValues: { ':inc': increment },
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { commentCount: 0 };
  } catch (error) {
    if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') {
      // Game doesn't exist, create it
      await dynamodb.send(new PutCommand({
        TableName: GAMES_TABLE,
        Item: {
          gameId: gameId,
          version: 'v0',
          likeCount: 0,
          playCount: 0,
          ratingCount: 0,
          totalRating: 0,
          commentCount: Math.max(0, increment),
          createdAt: new Date().toISOString()
        }
      }));
      return { commentCount: Math.max(0, increment) };
    }
    throw error;
  }
}