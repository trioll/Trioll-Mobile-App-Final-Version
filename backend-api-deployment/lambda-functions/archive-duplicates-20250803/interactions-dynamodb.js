// Production User Interactions API Lambda Function
// Handles likes, bookmarks, plays, and ratings with DynamoDB persistence

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

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
  
  const response = {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
  
  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || '';
    const pathParameters = event.pathParameters || {};
    const gameId = pathParameters.gameId || pathParameters.id;
    
    // Extract user ID from auth token or use guest ID
    const userId = getUserIdFromEvent(event);
    
    if (!gameId) {
      response.statusCode = 400;
      response.body = JSON.stringify({ error: 'Game ID required' });
      return response;
    }
    
    // Route handling based on path and method
    if (path.includes('/likes')) {
      if (method === 'POST') {
        return await handleLikeGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnlikeGame(gameId, userId);
      }
    } else if (path.includes('/bookmark')) {
      if (method === 'POST') {
        return await handleBookmarkGame(gameId, userId);
      } else if (method === 'DELETE') {
        return await handleUnbookmarkGame(gameId, userId);
      }
    } else if (path.includes('/play')) {
      return await handlePlayGame(gameId, userId);
    } else if (path.includes('/rate') || path.includes('/rating')) {
      const body = JSON.parse(event.body || '{}');
      return await handleRateGame(gameId, userId, body.rating);
    }
    
    response.statusCode = 404;
    response.body = JSON.stringify({ error: 'Not found' });
    
  } catch (error) {
    console.error('Error:', error);
    response.statusCode = 500;
    response.body = JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
  
  return response;
};

function getUserIdFromEvent(event) {
  // Check for guest mode headers first (from Amplify)
  const headers = event.headers || {};
  if (headers['X-Guest-Mode'] === 'true' && headers['X-Identity-Id']) {
    console.log('Guest user detected with identity:', headers['X-Identity-Id']);
    return `guest-${headers['X-Identity-Id']}`;
  }
  
  // Try to get user ID from Cognito auth
  const claims = event.requestContext?.authorizer?.jwt?.claims || 
                 event.requestContext?.authorizer?.claims || {};
  
  if (claims.sub) {
    return claims.sub;
  }
  
  // Try to get identity from request context (API Gateway identity)
  if (event.requestContext?.identity?.cognitoIdentityId) {
    return `guest-${event.requestContext.identity.cognitoIdentityId}`;
  }
  
  // Parse body to get userId if provided
  try {
    const body = JSON.parse(event.body || '{}');
    if (body.userId) {
      return body.userId;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // Generate guest ID from IP or use a default
  const sourceIp = event.requestContext?.identity?.sourceIp || 
                   event.requestContext?.http?.sourceIp || 
                   'anonymous';
  
  return `guest-${sourceIp.replace(/\./g, '-')}-${Date.now()}`;
}

async function handleLikeGame(gameId, userId) {
  try {
    console.log('Handling like for game:', gameId, 'user:', userId);
    
    // Check if interaction already exists
    const existingLike = await dynamodb.get({
      TableName: LIKES_TABLE,
      Key: { 
        userId: userId,
        gameId: gameId 
      }
    }).promise().catch(() => null);
    
    if (existingLike?.Item) {
      console.log('User already liked this game');
      // Get current like count
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
    
    // Record the interaction
    await dynamodb.put({
      TableName: LIKES_TABLE,
      Item: {
        userId: userId,
        gameId: gameId,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    }).promise();
    
    // Update game like count
    const updateResult = await dynamodb.update({
      TableName: GAMES_TABLE,
      Key: { id: gameId },
      UpdateExpression: 'ADD likeCount :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      },
      ReturnValues: 'UPDATED_NEW'
    }).promise().catch(async (error) => {
      // If game doesn't exist, create it
      if (error.code === 'ValidationException') {
        await dynamodb.put({
          TableName: GAMES_TABLE,
          Item: {
            id: gameId,
            likeCount: 1,
            playCount: 0,
            ratingCount: 0,
            totalRating: 0,
            createdAt: new Date().toISOString()
          }
        }).promise();
        return { Attributes: { likeCount: 1 } };
      }
      throw error;
    });
    
    const newLikeCount = updateResult.Attributes?.likeCount || 1;
    console.log('Like recorded successfully, new count:', newLikeCount);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        gameId, 
        likeCount: newLikeCount,
        userLiked: true,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error liking game:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to like game',
        message: error.message
      })
    };
  }
}

async function handleUnlikeGame(gameId, userId) {
  try {
    // Remove the interaction
    await dynamodb.delete({
      TableName: LIKES_TABLE,
      Key: { 
        userId: userId,
        gameId: gameId 
      }
    }).promise();
    
    // Update game like count
    await dynamodb.update({
      TableName: GAMES_TABLE,
      Key: { id: gameId },
      UpdateExpression: 'ADD likeCount :dec',
      ConditionExpression: 'likeCount > :zero',
      ExpressionAttributeValues: {
        ':dec': -1,
        ':zero': 0
      }
    }).promise().catch(() => {
      // Ignore if like count is already 0
    });
    
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

async function handleBookmarkGame(gameId, userId) {
  try {
    // Record the bookmark in likes table with bookmark prefix
    await dynamodb.put({
      TableName: LIKES_TABLE,
      Item: {
        userId: `bookmark#${userId}`,
        gameId: gameId,
        timestamp: new Date().toISOString(),
        type: 'bookmark',
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    }).promise();
    
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
    // Remove the bookmark
    await dynamodb.delete({
      TableName: LIKES_TABLE,
      Key: { 
        userId: `bookmark#${userId}`,
        gameId: gameId 
      }
    }).promise();
    
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
    console.error('Error unbookmarking game:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to unbookmark game' })
    };
  }
}

async function handlePlayGame(gameId, userId) {
  try {
    // Record the play
    const timestamp = new Date().toISOString();
    const playId = `${userId}#${gameId}#${timestamp}`;
    
    await dynamodb.put({
      TableName: PLAYCOUNTS_TABLE,
      Item: {
        id: playId,
        userId: userId,
        gameId: gameId,
        sessionId: `session-${Date.now()}`,
        timestamp: timestamp,
        duration: 0, // Will be updated when session ends
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    }).promise();
    
    // Update game play count
    const updateResult = await dynamodb.update({
      TableName: GAMES_TABLE,
      Key: { id: gameId },
      UpdateExpression: 'ADD playCount :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      },
      ReturnValues: 'UPDATED_NEW'
    }).promise().catch(async (error) => {
      // If game doesn't exist, create it
      if (error.code === 'ValidationException') {
        await dynamodb.put({
          TableName: GAMES_TABLE,
          Item: {
            id: gameId,
            likeCount: 0,
            playCount: 1,
            ratingCount: 0,
            totalRating: 0,
            createdAt: new Date().toISOString()
          }
        }).promise();
        return { Attributes: { playCount: 1 } };
      }
      throw error;
    });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        gameId,
        playCount: updateResult.Attributes?.playCount || 1,
        timestamp: timestamp
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
    // Check if user already rated
    const existingRating = await dynamodb.get({
      TableName: RATINGS_TABLE,
      Key: {
        userId: userId,
        gameId: gameId
      }
    }).promise().catch(() => null);
    
    const oldRating = existingRating?.Item?.rating || 0;
    const isNewRating = !existingRating?.Item;
    
    // Record the rating
    await dynamodb.put({
      TableName: RATINGS_TABLE,
      Item: {
        userId: userId,
        gameId: gameId,
        rating: rating,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    }).promise();
    
    // Update game rating stats
    let updateExpression = 'ADD totalRating :ratingDiff';
    const expressionValues = {
      ':ratingDiff': rating - oldRating
    };
    
    if (isNewRating) {
      updateExpression += ', ratingCount :inc';
      expressionValues[':inc'] = 1;
    }
    
    const updateResult = await dynamodb.update({
      TableName: GAMES_TABLE,
      Key: { id: gameId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW'
    }).promise().catch(async (error) => {
      // If game doesn't exist, create it
      if (error.code === 'ValidationException') {
        await dynamodb.put({
          TableName: GAMES_TABLE,
          Item: {
            id: gameId,
            likeCount: 0,
            playCount: 0,
            ratingCount: 1,
            totalRating: rating,
            createdAt: new Date().toISOString()
          }
        }).promise();
        return { Attributes: { ratingCount: 1, totalRating: rating } };
      }
      throw error;
    });
    
    const stats = updateResult.Attributes;
    const averageRating = stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0;
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        gameId,
        rating: rating,
        totalRatings: stats.ratingCount || 1,
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

// Helper function to get game stats
async function getGameStats(gameId) {
  try {
    const result = await dynamodb.get({
      TableName: GAMES_TABLE,
      Key: { id: gameId }
    }).promise();
    
    return result.Item || {
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