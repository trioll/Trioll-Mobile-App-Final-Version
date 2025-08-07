// Simplified User Interactions API Lambda Function
// Temporary version without DynamoDB dependencies

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
};

// In-memory storage for testing
const interactions = {
  likes: new Map(),
  ratings: new Map(),
  plays: new Map(),
  bookmarks: new Map()
};

// Game stats (would be in DynamoDB)
const gameStats = new Map();

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
    
    if (!gameId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Game ID required' })
      };
    }
    
    // Initialize game stats if needed
    if (!gameStats.has(gameId)) {
      gameStats.set(gameId, {
        likeCount: Math.floor(Math.random() * 1000) + 100,
        playCount: Math.floor(Math.random() * 5000) + 1000,
        ratingCount: Math.floor(Math.random() * 500) + 50,
        totalRating: Math.floor(Math.random() * 2000) + 200
      });
    }
    
    // Route handling
    if (path.includes('/likes')) {
      return handleLikes(gameId, userId, method);
    } else if (path.includes('/plays')) {
      return handlePlays(gameId, userId, method);
    } else if (path.includes('/ratings')) {
      const body = JSON.parse(event.body || '{}');
      return handleRatings(gameId, userId, method, body.rating);
    } else if (path.includes('/bookmarks')) {
      return handleBookmarks(gameId, userId, method);
    }
    
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error:', error);
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
  // Check for guest mode headers first
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

function handleLikes(gameId, userId, method) {
  const stats = gameStats.get(gameId);
  const likeKey = `${userId}#${gameId}`;
  
  if (method === 'POST') {
    if (!interactions.likes.has(likeKey)) {
      interactions.likes.set(likeKey, true);
      stats.likeCount++;
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        gameId,
        likeCount: stats.likeCount,
        userLiked: true,
        timestamp: new Date().toISOString()
      })
    };
  } else if (method === 'DELETE') {
    if (interactions.likes.has(likeKey)) {
      interactions.likes.delete(likeKey);
      stats.likeCount = Math.max(0, stats.likeCount - 1);
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        gameId,
        userId
      })
    };
  }
  
  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
}

function handlePlays(gameId, userId, method) {
  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  const stats = gameStats.get(gameId);
  stats.playCount++;
  
  const playKey = `${userId}#${gameId}#${Date.now()}`;
  interactions.plays.set(playKey, true);
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      gameId,
      playCount: stats.playCount,
      timestamp: new Date().toISOString()
    })
  };
}

function handleRatings(gameId, userId, method, rating) {
  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  if (!rating || rating < 1 || rating > 5) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid rating. Must be between 1 and 5.' })
    };
  }
  
  const stats = gameStats.get(gameId);
  const ratingKey = `${userId}#${gameId}`;
  
  // Update or add rating
  if (!interactions.ratings.has(ratingKey)) {
    stats.ratingCount++;
  }
  interactions.ratings.set(ratingKey, rating);
  stats.totalRating += rating;
  
  const averageRating = stats.totalRating / stats.ratingCount;
  
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
}

function handleBookmarks(gameId, userId, method) {
  const bookmarkKey = `${userId}#${gameId}`;
  
  if (method === 'POST') {
    interactions.bookmarks.set(bookmarkKey, true);
    
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
  } else if (method === 'DELETE') {
    interactions.bookmarks.delete(bookmarkKey);
    
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
  }
  
  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
}