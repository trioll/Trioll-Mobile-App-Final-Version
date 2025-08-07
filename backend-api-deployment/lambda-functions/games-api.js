// Games API Lambda Function
// Returns game data in the exact format expected by the mobile app

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = 'trioll-prod-games'; // Changed from staging to prod
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

// Helper function to filter games from trioll-prod-games-us-east-1 bucket
function filterTriollGames(games) {
  const validDomains = [
    'trioll-prod-games-us-east-1.s3.amazonaws.com',
    'dk72g9i0333mv.cloudfront.net'
  ];
  
  return games.filter(game => {
    // If no trialUrl exists, it will use our default CloudFront URL, so include it
    if (!game.trialUrl || game.trialUrl === '') {
      return true;
    }
    
    // Check if the trialUrl contains any of our valid domains
    return validDomains.some(domain => game.trialUrl.includes(domain));
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
    
    // Route handling
    if (path.endsWith('/games/featured')) {
      return handleFeaturedGames();
    } else if (path.includes('/games/search')) {
      return handleSearchGames(queryParameters.q || '');
    } else if (path.includes('/games/category/')) {
      const category = pathParameters.category || path.split('/').pop();
      return handleGamesByCategory(category);
    } else if (pathParameters.id) {
      return handleGetGameById(pathParameters.id);
    } else if (path.endsWith('/games')) {
      return handleGetGames(queryParameters);
    }
    
    response.statusCode = 404;
    response.body = JSON.stringify({ error: 'Not found' });
    
  } catch (error) {
    console.error('Error:', error);
    response.statusCode = 500;
    response.body = JSON.stringify({ error: 'Internal server error' });
  }
  
  return response;
};

async function handleGetGames(queryParams) {
  const limit = parseInt(queryParams.limit) || 20;
  const nextCursor = queryParams.cursor;
  
  console.log('🎮 DEBUG: handleGetGames called with limit:', limit);
  console.log('🎮 DEBUG: GAMES_TABLE:', GAMES_TABLE);
  
  try {
    const params = {
      TableName: GAMES_TABLE,
      Limit: limit + 1 // Get one extra to check if there are more
    };
    
    if (nextCursor) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextCursor, 'base64').toString());
    }
    
    const result = await dynamodb.send(new ScanCommand(params));
    const items = result.Items || [];
    
    console.log('🔍 DEBUG: DynamoDB scan returned items:', items.length);
    console.log('🔍 DEBUG: Item titles:', items.map(item => item.title));
    
    const hasMore = items.length > limit;
    const games = items.slice(0, limit);
    
    // Transform to match mobile app expected format
    const transformedGames = games.map(transformGame);
    
    // Filter to only include games from trioll-prod-games-us-east-1 bucket
    const filteredGames = filterTriollGames(transformedGames);
    
    console.log(`🎮 DEBUG: Filtered ${transformedGames.length} games to ${filteredGames.length} games from trioll-prod-games bucket`);
    
    const responseBody = {
      games: filteredGames,
      hasMore: hasMore,
      nextCursor: hasMore && result.LastEvaluatedKey ? 
        Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(responseBody)
    };
  } catch (error) {
    console.error('Error fetching games:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch games' })
    };
  }
}

async function handleFeaturedGames() {
  try {
    const params = {
      TableName: GAMES_TABLE,
      FilterExpression: 'isFeatured = :featured',
      ExpressionAttributeValues: {
        ':featured': true
      },
      Limit: 10
    };
    
    const result = await dynamodb.send(new ScanCommand(params));
    const games = (result.Items || []).map(transformGame);
    
    // Filter to only include games from trioll-prod-games-us-east-1 bucket
    const filteredGames = filterTriollGames(games);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ featured: filteredGames })
    };
  } catch (error) {
    console.error('Error fetching featured games:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch featured games' })
    };
  }
}

async function handleSearchGames(query) {
  if (!query || query.length < 2) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ games: [] })
    };
  }
  
  try {
    // For staging, we'll do a simple scan with filter
    // In production, use ElasticSearch or DynamoDB GSI
    const params = {
      TableName: GAMES_TABLE,
      FilterExpression: 'contains(#title, :query) OR contains(#desc, :query) OR contains(#cat, :query)',
      ExpressionAttributeNames: {
        '#title': 'title',
        '#desc': 'description',
        '#cat': 'category'
      },
      ExpressionAttributeValues: {
        ':query': query.toLowerCase()
      }
    };
    
    const result = await dynamodb.send(new ScanCommand(params));
    const games = (result.Items || []).map(transformGame);
    
    // Filter to only include games from trioll-prod-games-us-east-1 bucket
    const filteredGames = filterTriollGames(games);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ games: filteredGames })
    };
  } catch (error) {
    console.error('Error searching games:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Search failed' })
    };
  }
}

async function handleGamesByCategory(category) {
  try {
    const params = {
      TableName: GAMES_TABLE,
      FilterExpression: '#cat = :category',
      ExpressionAttributeNames: {
        '#cat': 'category'
      },
      ExpressionAttributeValues: {
        ':category': category
      }
    };
    
    const result = await dynamodb.send(new ScanCommand(params));
    const games = (result.Items || []).map(transformGame);
    
    // Filter to only include games from trioll-prod-games-us-east-1 bucket
    const filteredGames = filterTriollGames(games);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ games: filteredGames })
    };
  } catch (error) {
    console.error('Error fetching games by category:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch games by category' })
    };
  }
}

async function handleGetGameById(gameId) {
  try {
    const params = {
      TableName: GAMES_TABLE,
      Key: { id: gameId }
    };
    
    const result = await dynamodb.send(new GetCommand(params));
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Game not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(transformGame(result.Item))
    };
  } catch (error) {
    console.error('Error fetching game by ID:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch game' })
    };
  }
}

// Transform DynamoDB item to match mobile app expected format
function transformGame(item) {
  // Using CloudFront distribution for optimal game streaming
  // Distribution ID: EYMK0F7V05O2Z - "Trioll Mobile Global CDN"
  const GAME_ASSET_DOMAIN = 'https://dk72g9i0333mv.cloudfront.net';
  return {
    id: item.id,
    title: item.title || 'Untitled Game',
    developerName: item.developerName || item.developer || 'Unknown Developer',
    publisher: item.publisher || item.developerName || 'Unknown Publisher',
    rating: parseFloat(item.rating) || 0,
    ratingCount: parseInt(item.ratingCount) || 0,
    imageUrl: item.imageUrl || item.thumbnailUrl || 'https://picsum.photos/400/600',
    thumbnailUrl: item.thumbnailUrl || item.imageUrl || 'https://picsum.photos/400/600',
    coverImage: item.coverImage || item.imageUrl || 'https://picsum.photos/400/600',
    category: item.category || 'General',
    genre: item.genre || item.category || 'General',
    description: item.description || '',
    tagline: item.tagline || '',
    trialUrl: item.trialUrl || `${GAME_ASSET_DOMAIN}/${item.id}/index.html`,
    gameUrl: item.gameUrl || item.trialUrl || `${GAME_ASSET_DOMAIN}/${item.id}/index.html`,
    downloadUrl: item.downloadUrl || '',
    trialType: item.trialType || 'webview', // Add trialType field for WebView rendering
    videoUrl: item.videoUrl || '',
    trialDuration: parseInt(item.trialDuration) || 5,
    playCount: parseInt(item.playCount) || 0,
    likeCount: parseInt(item.likeCount) || 0,
    commentsCount: parseInt(item.commentCount || item.commentsCount) || 0,
    downloads: parseInt(item.downloads) || 0,
    price: parseFloat(item.price) || 0,
    downloadSize: item.downloadSize || '100 MB',
    platform: item.platform || 'both',
    ageRating: item.ageRating || 'everyone',
    tags: item.tags || [],
    isFeatured: item.isFeatured || false,
    isNew: item.isNew || false,
    isTrending: item.isTrending || false,
    releaseDate: item.releaseDate || new Date().toISOString(),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}