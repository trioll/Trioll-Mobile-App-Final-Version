// Enhanced Games API with Trending, Recommendations, and Advanced Filtering
// Extends games-api.js with new features

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand, BatchGetItemCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = process.env.GAMES_TABLE || 'trioll-prod-games';
const USER_INTERACTIONS_TABLE = 'trioll-prod-likes'; // For personalization
const GAME_PROGRESS_TABLE = 'trioll-prod-game-progress';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

// Helper function to calculate trending score
function calculateTrendingScore(game) {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  // Get stats with defaults
  const playCount = game.playCount || 0;
  const likeCount = game.likeCount || 0;
  const rating = game.averageRating || 0;
  const ratingCount = game.ratingCount || 0;
  const commentCount = game.commentCount || 0;
  
  // Time decay factor (newer games get boost)
  const createdAt = new Date(game.createdAt || '2024-01-01').getTime();
  const ageInDays = Math.max(1, (now - createdAt) / dayInMs);
  const timeDecay = Math.pow(0.95, ageInDays / 7); // Decay by 5% per week
  
  // Engagement score
  const engagementScore = 
    (playCount * 1.0) +           // Plays are most important
    (likeCount * 2.0) +           // Likes show active interest
    (rating * ratingCount * 0.5) + // Good ratings matter
    (commentCount * 1.5);          // Comments show engagement
  
  // Apply time decay and normalize
  const trendingScore = engagementScore * timeDecay;
  
  return Math.round(trendingScore);
}

// Helper to get user preferences
async function getUserPreferences(userId) {
  if (!userId || userId.startsWith('guest-')) {
    return { categories: [], likedGames: [] };
  }
  
  try {
    // Get user's liked games to understand preferences
    const likesResponse = await dynamodb.send(new QueryCommand({
      TableName: USER_INTERACTIONS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 20
    }));
    
    const likedGames = likesResponse.Items || [];
    
    // Get game details to extract categories
    if (likedGames.length > 0) {
      const gameIds = likedGames.map(like => ({ id: like.gameId }));
      const gamesResponse = await dynamodb.send(new BatchGetItemCommand({
        RequestItems: {
          [GAMES_TABLE]: {
            Keys: gameIds
          }
        }
      }));
      
      const games = gamesResponse.Responses[GAMES_TABLE] || [];
      const categories = {};
      
      // Count category occurrences
      games.forEach(game => {
        if (game.category) {
          categories[game.category] = (categories[game.category] || 0) + 1;
        }
      });
      
      // Sort categories by frequency
      const topCategories = Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cat]) => cat);
      
      return {
        categories: topCategories,
        likedGames: likedGames.map(l => l.gameId)
      };
    }
  } catch (error) {
    console.error('Error getting user preferences:', error);
  }
  
  return { categories: [], likedGames: [] };
}

// Filter games based on criteria
function filterGames(games, filters = {}) {
  return games.filter(game => {
    // Rating filter
    if (filters.minRating && game.averageRating < filters.minRating) {
      return false;
    }
    
    // Play count filter
    if (filters.minPlays && game.playCount < filters.minPlays) {
      return false;
    }
    
    // Category filter
    if (filters.category && game.category !== filters.category) {
      return false;
    }
    
    // Date filter
    if (filters.releasedAfter) {
      const releaseDate = new Date(game.createdAt || '2024-01-01');
      if (releaseDate < new Date(filters.releasedAfter)) {
        return false;
      }
    }
    
    return true;
  });
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const response = {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
  
  try {
    const path = event.path || event.rawPath || '';
    const pathParameters = event.pathParameters || {};
    const queryParameters = event.queryStringParameters || {};
    const userId = getUserIdFromEvent(event);
    
    // Route handling
    if (path.endsWith('/games/trending')) {
      // NEW: Trending games with time-based algorithm
      const timeframe = queryParameters.timeframe || '7d'; // 1d, 7d, 30d
      const limit = Math.min(parseInt(queryParameters.limit) || 20, 50);
      
      const scanResult = await dynamodb.send(new ScanCommand({
        TableName: GAMES_TABLE
      }));
      
      let games = scanResult.Items || [];
      
      // Calculate trending scores
      games = games.map(game => ({
        ...game,
        trendingScore: calculateTrendingScore(game)
      }));
      
      // Sort by trending score
      games.sort((a, b) => b.trendingScore - a.trendingScore);
      
      // Take top games
      games = games.slice(0, limit);
      
      response.body = JSON.stringify({
        games,
        count: games.length,
        timeframe
      });
      
    } else if (path.endsWith('/games/recommended')) {
      // NEW: Personalized recommendations
      const limit = Math.min(parseInt(queryParameters.limit) || 20, 50);
      const preferences = await getUserPreferences(userId);
      
      const scanResult = await dynamodb.send(new ScanCommand({
        TableName: GAMES_TABLE
      }));
      
      let games = scanResult.Items || [];
      
      // Score games based on user preferences
      games = games.map(game => {
        let score = 0;
        
        // Category match
        if (preferences.categories.includes(game.category)) {
          score += 10;
        }
        
        // Similar to liked games (simple approach - in production use ML)
        if (preferences.likedGames.length > 0) {
          // Boost games in same category as liked games
          score += 5;
        }
        
        // General popularity
        score += (game.likeCount || 0) * 0.1;
        score += (game.averageRating || 0) * 2;
        
        // Avoid already played games
        if (preferences.likedGames.includes(game.id)) {
          score = 0;
        }
        
        return { ...game, recommendationScore: score };
      });
      
      // Sort by recommendation score
      games.sort((a, b) => b.recommendationScore - a.recommendationScore);
      
      // Take top games
      games = games.slice(0, limit);
      
      response.body = JSON.stringify({
        games,
        count: games.length,
        basedOn: preferences.categories
      });
      
    } else if (path.endsWith('/games/search/advanced')) {
      // NEW: Advanced search with filters
      const filters = {
        category: queryParameters.category,
        minRating: queryParameters.minRating ? parseFloat(queryParameters.minRating) : null,
        minPlays: queryParameters.minPlays ? parseInt(queryParameters.minPlays) : null,
        releasedAfter: queryParameters.releasedAfter,
        sortBy: queryParameters.sortBy || 'relevance' // relevance, rating, plays, newest
      };
      
      const scanResult = await dynamodb.send(new ScanCommand({
        TableName: GAMES_TABLE
      }));
      
      let games = scanResult.Items || [];
      
      // Apply filters
      games = filterGames(games, filters);
      
      // Sort based on criteria
      switch (filters.sortBy) {
        case 'rating':
          games.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
          break;
        case 'plays':
          games.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
          break;
        case 'newest':
          games.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          break;
        default: // relevance
          games.sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a));
      }
      
      response.body = JSON.stringify({
        games,
        count: games.length,
        filters
      });
      
    } else if (path.endsWith('/games/similar')) {
      // NEW: Similar games
      const gameId = queryParameters.gameId;
      if (!gameId) {
        response.statusCode = 400;
        response.body = JSON.stringify({ error: 'gameId parameter required' });
        return response;
      }
      
      // Get the reference game
      const gameResult = await dynamodb.send(new GetCommand({
        TableName: GAMES_TABLE,
        Key: { id: gameId }
      }));
      
      if (!gameResult.Item) {
        response.statusCode = 404;
        response.body = JSON.stringify({ error: 'Game not found' });
        return response;
      }
      
      const referenceGame = gameResult.Item;
      
      // Get all games
      const scanResult = await dynamodb.send(new ScanCommand({
        TableName: GAMES_TABLE
      }));
      
      let games = scanResult.Items || [];
      
      // Find similar games
      games = games
        .filter(game => game.id !== gameId) // Exclude the reference game
        .map(game => {
          let similarityScore = 0;
          
          // Same category is most important
          if (game.category === referenceGame.category) {
            similarityScore += 10;
          }
          
          // Similar rating
          const ratingDiff = Math.abs((game.averageRating || 0) - (referenceGame.averageRating || 0));
          similarityScore += Math.max(0, 5 - ratingDiff);
          
          // Similar popularity
          const popularityDiff = Math.abs((game.playCount || 0) - (referenceGame.playCount || 0));
          similarityScore += Math.max(0, 5 - (popularityDiff / 1000));
          
          return { ...game, similarityScore };
        })
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 10);
      
      response.body = JSON.stringify({
        referenceGame: { id: referenceGame.id, title: referenceGame.title },
        similarGames: games,
        count: games.length
      });
      
    } else {
      // Include all existing routes from games-api.js
      if (path.endsWith('/games/featured')) {
        // Existing featured games logic
        const scanResult = await dynamodb.send(new ScanCommand({
          TableName: GAMES_TABLE,
          FilterExpression: 'featured = :featured',
          ExpressionAttributeValues: {
            ':featured': true
          }
        }));
        
        response.body = JSON.stringify({
          games: scanResult.Items || [],
          count: scanResult.Count || 0
        });
      } else if (pathParameters.id) {
        // Get specific game
        const result = await dynamodb.send(new GetCommand({
          TableName: GAMES_TABLE,
          Key: { id: pathParameters.id }
        }));
        
        if (result.Item) {
          response.body = JSON.stringify(result.Item);
        } else {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: 'Game not found' });
        }
      } else {
        // Get all games (existing logic)
        const limit = Math.min(parseInt(queryParameters.limit) || 100, 100);
        const scanResult = await dynamodb.send(new ScanCommand({
          TableName: GAMES_TABLE,
          Limit: limit
        }));
        
        response.body = JSON.stringify({
          games: scanResult.Items || [],
          count: scanResult.Count || 0,
          lastEvaluatedKey: scanResult.LastEvaluatedKey
        });
      }
    }
    
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

// Helper to extract user ID from event
function getUserIdFromEvent(event) {
  const headers = event.headers || {};
  
  if (headers['X-Identity-Id']) {
    return headers['X-Identity-Id'];
  }
  
  if (event.requestContext?.authorizer?.claims?.sub) {
    return event.requestContext.authorizer.claims.sub;
  }
  
  return null;
}