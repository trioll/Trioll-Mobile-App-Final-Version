// Production User Interactions API Lambda Function
// Uses AWS SDK v3 which is included in Lambda Node.js 20.x runtime

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// Table names from environment or defaults
const GAMES_TABLE = process.env.GAMES_TABLE || 'trioll-prod-games';
const LIKES_TABLE = process.env.LIKES_TABLE || 'trioll-prod-likes';
const RATINGS_TABLE = process.env.RATINGS_TABLE || 'trioll-prod-ratings';
const PLAYCOUNTS_TABLE = process.env.PLAYCOUNTS_TABLE || 'trioll-prod-playcounts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
};

export const handler = async (event) => {
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
    
    if (!gameId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Game ID required' })
      };
    }
    
    // Route handling
    if (path.includes('/likes')) {
      if (method === 'POST') {
        return await handleLikeGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnlikeGame(gameId, userId);
      }
    } else if (path.includes('/plays')) {
      return await handlePlayGame(gameId, userId);
    } else if (path.includes('/ratings')) {
      const body = JSON.parse(event.body || '{}');
      return await handleRateGame(gameId, userId, body.rating);
    } else if (path.includes('/bookmarks')) {
      if (method === 'POST') {
        return await handleBookmarkGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnbookmarkGame(gameId, userId);
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

function getUserIdFromEvent(event) {
  // Check for guest mode headers
  const headers = event.headers || {};
  if (headers['X-Guest-Mode'] === 'true' && headers['X-Identity-Id']) {
    return `guest-${headers['X-Identity-Id']}`;
  }
  
  // Try to get from body
  try {
    const body = JSON.parse(event.body || '{}');
    if (body.userId) return body.userId;
  } catch (e) {}
  
  // Generate random guest ID
  return `guest-${Math.random().toString(36).substr(2, 9)}`;
}

async function handleLikeGame(gameId, userId) {
  try {
    console.log('Handling like for game:', gameId, 'user:', userId);
    
    // Check if already liked
    let existingLike = null;
    try {
      const response = await dynamodb.send(new GetCommand({
        TableName: LIKES_TABLE,
        Key: { userId, gameId }
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
        userId,
        gameId,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
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
      Key: { userId, gameId }
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
    const timestamp = new Date().toISOString();
    const playId = `${userId}#${gameId}#${timestamp}`;
    
    // Record play
    await dynamodb.send(new PutCommand({
      TableName: PLAYCOUNTS_TABLE,
      Item: {
        id: playId,
        userId,
        gameId,
        sessionId: `session-${Date.now()}`,
        timestamp,
        duration: 0,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
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
        Key: { userId, gameId }
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
        userId,
        gameId,
        rating,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
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
        userId: `bookmark#${userId}`,
        gameId,
        timestamp: new Date().toISOString(),
        type: 'bookmark',
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
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
        userId: `bookmark#${userId}`,
        gameId 
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

// Helper functions
async function getGameStats(gameId) {
  try {
    const response = await dynamodb.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { id: gameId }
    }));
    
    return response.Item || {
      id: gameId,
      likeCount: 0,
      playCount: 0,
      ratingCount: 0,
      totalRating: 0
    };
  } catch (error) {
    console.error('Error getting game stats:', error);
    return {
      id: gameId,
      likeCount: 0,
      playCount: 0,
      ratingCount: 0,
      totalRating: 0
    };
  }
}

async function updateGameLikeCount(gameId, increment) {
  try {
    const response = await dynamodb.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { id: gameId },
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
          id: gameId,
          likeCount: Math.max(0, increment),
          playCount: 0,
          ratingCount: 0,
          totalRating: 0,
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
      Key: { id: gameId },
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
          id: gameId,
          likeCount: 0,
          playCount: increment,
          ratingCount: 0,
          totalRating: 0,
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
      Key: { id: gameId },
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
          id: gameId,
          likeCount: 0,
          playCount: 0,
          ratingCount: 1,
          totalRating: rating,
          createdAt: new Date().toISOString()
        }
      }));
      return { ratingCount: 1, totalRating: rating };
    }
    throw error;
  }
}