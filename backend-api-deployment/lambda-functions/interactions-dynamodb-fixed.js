const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, UpdateCommand, QueryCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

// DynamoDB Tables
const LIKES_TABLE = 'trioll-prod-likes';
const PLAYS_TABLE = 'trioll-prod-playcounts';
const RATINGS_TABLE = 'trioll-prod-ratings';
const GAMES_TABLE = 'trioll-prod-games';
const COMMENTS_TABLE = 'trioll-prod-comments';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Helper to extract user ID
function getUserId(event) {
  const headers = event.headers || {};
  const isGuestMode = headers['X-Guest-Mode'] === 'true' || headers['x-guest-mode'] === 'true';
  const identityId = headers['X-Identity-Id'] || headers['x-identity-id'];
  
  if (isGuestMode && identityId) {
    // Convert identity ID to a shorter guest ID
    const shortId = identityId.split(':').pop().substring(0, 8);
    return `guest-${shortId}`;
  }
  
  // For authorized users, extract from Authorization header
  const authHeader = headers['Authorization'] || headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.sub || 'anonymous';
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
  }
  
  return 'anonymous';
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const path = event.path;
  const method = event.httpMethod;
  const pathParameters = event.pathParameters || {};
  const gameId = pathParameters.gameId;
  const userId = getUserId(event);
  
  console.log('Path:', path, 'Method:', method, 'GameId:', gameId, 'UserId:', userId);
  
  // Handle OPTIONS requests for CORS
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  try {
    // Handle different endpoints
    if (path.includes('/likes')) {
      if (method === 'GET') {
        return await handleGetLikes(gameId, userId);
      } else if (method === 'POST') {
        return await handleLikeGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnlikeGame(gameId, userId);
      }
    } else if (path.includes('/plays')) {
      if (method === 'GET') {
        return await handleGetPlays(gameId);
      } else if (method === 'POST') {
        return await handleRecordPlay(gameId, userId);
      }
    } else if (path.includes('/ratings')) {
      if (method === 'GET') {
        return await handleGetRatings(gameId, userId);
      } else if (method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        return await handleRateGame(gameId, userId, body.rating);
      }
    } else if (path.includes('/bookmarks')) {
      if (method === 'GET') {
        return await handleGetBookmarks(userId);
      } else if (method === 'POST') {
        return await handleBookmarkGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnbookmarkGame(gameId, userId);
      }
    } else if (path.includes('/comments')) {
      if (method === 'GET') {
        return await handleGetComments(gameId);
      } else if (method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        // Support both 'comment' and 'commentText' field names
        const commentText = body.comment || body.commentText;
        return await handleAddComment(gameId, userId, commentText);
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

// Like handlers
async function handleGetLikes(gameId, userId) {
  try {
    // Check if user has liked the game
    const likeResult = await docClient.send(new GetCommand({
      TableName: LIKES_TABLE,
      Key: { gameId, userId }
    }));
    
    // Get total like count from games table
    const gameResult = await docClient.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        hasLiked: !!likeResult.Item,
        likeCount: gameResult.Item?.likeCount || 0
      })
    };
  } catch (error) {
    console.error('Error getting likes:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get likes' })
    };
  }
}

async function handleLikeGame(gameId, userId) {
  try {
    console.log('Handling like for game:', gameId, 'user:', userId);
    
    // Check if already liked
    const existingLike = await docClient.send(new GetCommand({
      TableName: LIKES_TABLE,
      Key: { gameId, userId }
    }));
    
    if (existingLike.Item) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          gameId,
          userId,
          hasLiked: true,
          message: 'Already liked' 
        })
      };
    }
    
    // Add like record
    await docClient.send(new PutCommand({
      TableName: LIKES_TABLE,
      Item: {
        gameId,
        userId,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
      }
    }));
    
    // Update game like count
    const updatedGame = await updateGameLikeCount(gameId, 1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        userId,
        hasLiked: true,
        likeCount: updatedGame.likeCount
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
    // Check if liked
    const existingLike = await docClient.send(new GetCommand({
      TableName: LIKES_TABLE,
      Key: { gameId, userId }
    }));
    
    if (!existingLike.Item) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          gameId,
          userId,
          hasLiked: false,
          message: 'Not liked' 
        })
      };
    }
    
    // Remove like record
    await docClient.send(new DeleteCommand({
      TableName: LIKES_TABLE,
      Key: { gameId, userId }
    }));
    
    // Update game like count
    const updatedGame = await updateGameLikeCount(gameId, -1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        userId,
        hasLiked: false,
        likeCount: Math.max(0, updatedGame.likeCount)
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

// Play handlers
async function handleGetPlays(gameId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        playCount: result.Item?.playCount || 0
      })
    };
  } catch (error) {
    console.error('Error getting play count:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get play count' })
    };
  }
}

async function handleRecordPlay(gameId, userId) {
  try {
    // Record play
    await docClient.send(new PutCommand({
      TableName: PLAYS_TABLE,
      Item: {
        playId: `${gameId}-${userId}-${Date.now()}`,
        gameId,
        userId,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
      }
    }));
    
    // Update game play count
    const updatedGame = await updateGamePlayCount(gameId, 1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        userId,
        playCount: updatedGame.playCount
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

// Rating handlers
async function handleGetRatings(gameId, userId) {
  try {
    // Get user's rating
    const ratingResult = await docClient.send(new GetCommand({
      TableName: RATINGS_TABLE,
      Key: { gameId, userId }
    }));
    
    // Get game rating stats
    const gameResult = await docClient.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' }
    }));
    
    const avgRating = gameResult.Item?.ratingCount > 0 
      ? (gameResult.Item.totalRating / gameResult.Item.ratingCount).toFixed(1)
      : '0.0';
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        userRating: ratingResult.Item?.rating || 0,
        averageRating: parseFloat(avgRating),
        ratingCount: gameResult.Item?.ratingCount || 0
      })
    };
  } catch (error) {
    console.error('Error getting ratings:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get ratings' })
    };
  }
}

async function handleRateGame(gameId, userId, rating) {
  try {
    if (!rating || rating < 1 || rating > 5) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid rating. Must be between 1 and 5.' })
      };
    }
    
    // Check if user already rated
    const existingRating = await docClient.send(new GetCommand({
      TableName: RATINGS_TABLE,
      Key: { gameId, userId }
    }));
    
    const oldRating = existingRating.Item?.rating || 0;
    
    // Save user rating
    await docClient.send(new PutCommand({
      TableName: RATINGS_TABLE,
      Item: {
        gameId,
        userId,
        rating,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
      }
    }));
    
    // Update game rating stats
    const updatedGame = await updateGameRating(gameId, rating, oldRating);
    
    const avgRating = updatedGame.ratingCount > 0 
      ? (updatedGame.totalRating / updatedGame.ratingCount).toFixed(1)
      : '0.0';
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        userId,
        rating,
        averageRating: parseFloat(avgRating),
        ratingCount: updatedGame.ratingCount
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

// Bookmark handlers (using likes table with different attribute)
async function handleGetBookmarks(userId) {
  try {
    // For now, return empty array - would need GSI to query by user
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        userId,
        bookmarks: []
      })
    };
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get bookmarks' })
    };
  }
}

async function handleBookmarkGame(gameId, userId) {
  try {
    // Using likes table with bookmark flag
    await docClient.send(new PutCommand({
      TableName: LIKES_TABLE,
      Item: {
        gameId: `bookmark-${gameId}`,
        userId,
        isBookmark: true,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        userId,
        bookmarked: true
      })
    };
  } catch (error) {
    console.error('Error bookmarking game:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to bookmark game' })
    };
  }
}

async function handleUnbookmarkGame(gameId, userId) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: LIKES_TABLE,
      Key: { 
        gameId: `bookmark-${gameId}`,
        userId 
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        userId,
        bookmarked: false
      })
    };
  } catch (error) {
    console.error('Error unbookmarking game:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to unbookmark game' })
    };
  }
}

// Comment handlers
async function handleGetComments(gameId) {
  try {
    const response = await docClient.send(new QueryCommand({
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
  try {
    if (!comment || comment.trim().length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Comment cannot be empty' })
      };
    }
    
    const timestamp = new Date().toISOString();
    const commentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Fixed: Use attribute name mapping for reserved keyword "comment"
    await docClient.send(new PutCommand({
      TableName: COMMENTS_TABLE,
      Item: {
        gameId,
        commentId,
        userId,
        commentText: comment.trim(), // Changed from "comment" to "commentText"
        timestamp,
        likes: 0,
        edited: false,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
      }
    }));
    
    // Update comment count
    await updateGameCommentCount(gameId, 1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        commentId,
        userId,
        commentText: comment.trim(),
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
  try {
    // Get comment to verify ownership
    const comment = await docClient.send(new GetCommand({
      TableName: COMMENTS_TABLE,
      Key: { gameId, commentId }
    }));
    
    if (!comment.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Comment not found' })
      };
    }
    
    if (comment.Item.userId !== userId) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to delete this comment' })
      };
    }
    
    // Delete comment
    await docClient.send(new DeleteCommand({
      TableName: COMMENTS_TABLE,
      Key: { gameId, commentId }
    }));
    
    // Update comment count
    await updateGameCommentCount(gameId, -1);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true })
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

// Helper functions to update game stats
async function updateGameLikeCount(gameId, increment) {
  try {
    const response = await docClient.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: 'ADD likeCount :inc',
      ExpressionAttributeValues: { ':inc': increment },
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { likeCount: 0 };
  } catch (error) {
    console.error('Error updating like count:', error);
    return { likeCount: 0 };
  }
}

async function updateGamePlayCount(gameId, increment) {
  try {
    const response = await docClient.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: 'ADD playCount :inc',
      ExpressionAttributeValues: { ':inc': increment },
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { playCount: 0 };
  } catch (error) {
    console.error('Error updating play count:', error);
    return { playCount: 0 };
  }
}

async function updateGameRating(gameId, newRating, oldRating) {
  try {
    let updateExpression = 'ADD totalRating :rating';
    let expressionValues = { ':rating': newRating - oldRating };
    
    if (oldRating === 0) {
      // New rating
      updateExpression += ', ratingCount :inc';
      expressionValues[':inc'] = 1;
    }
    
    const response = await docClient.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { ratingCount: 1, totalRating: newRating };
  } catch (error) {
    console.error('Error updating game rating:', error);
    return { ratingCount: 1, totalRating: newRating };
  }
}

async function updateGameCommentCount(gameId, increment) {
  try {
    const response = await docClient.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId: gameId, version: 'v0' },
      UpdateExpression: 'ADD commentCount :inc',
      ExpressionAttributeValues: { ':inc': increment },
      ReturnValues: 'ALL_NEW'
    }));
    
    return response.Attributes || { commentCount: 0 };
  } catch (error) {
    console.error('Error updating comment count:', error);
    return { commentCount: 0 };
  }
}