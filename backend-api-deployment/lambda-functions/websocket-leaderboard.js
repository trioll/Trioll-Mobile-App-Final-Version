// WebSocket handler for real-time leaderboards
// Extends websocket-message.js with leaderboard functionality

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, BatchGetItemCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'trioll-prod-websocket-connections';
const LEADERBOARD_TABLE = process.env.LEADERBOARD_TABLE || 'trioll-prod-leaderboards';
const GAME_PROGRESS_TABLE = process.env.GAME_PROGRESS_TABLE || 'trioll-prod-game-progress';

// Cache for active leaderboard subscriptions
const leaderboardSubscriptions = new Map(); // gameId -> Set of connectionIds

exports.handler = async (event) => {
  console.log('WebSocket Leaderboard Event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  // Initialize API Gateway Management API client
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`
  });

  try {
    const body = JSON.parse(event.body);
    const { action, data } = body;

    // Get connection info to identify user
    const connectionResult = await docClient.send(new GetCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }));

    if (!connectionResult.Item) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid connection' })
      };
    }

    const userId = connectionResult.Item.userId;

    switch (action) {
      case 'subscribeLeaderboard':
        return await handleSubscribeLeaderboard(connectionId, data.gameId, apiGatewayClient);
        
      case 'unsubscribeLeaderboard':
        return await handleUnsubscribeLeaderboard(connectionId, data.gameId);
        
      case 'updateScore':
        return await handleUpdateScore(userId, data.gameId, data.score, apiGatewayClient, domainName, stage);
        
      case 'getLeaderboard':
        return await handleGetLeaderboard(connectionId, data.gameId, data.timeframe, apiGatewayClient);
        
      default:
        // Pass through to original websocket-message.js handler for other actions
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Action not handled by leaderboard' })
        };
    }

  } catch (error) {
    console.error('Error:', error);
    
    // Notify client of error
    try {
      await apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: 'error',
          error: error.message
        })
      }));
    } catch (notifyError) {
      console.error('Failed to notify client:', notifyError);
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleSubscribeLeaderboard(connectionId, gameId, apiGateway) {
  // Add connection to game's leaderboard subscribers
  if (!leaderboardSubscriptions.has(gameId)) {
    leaderboardSubscriptions.set(gameId, new Set());
  }
  leaderboardSubscriptions.get(gameId).add(connectionId);
  
  // Store subscription in DynamoDB for persistence
  await docClient.send(new UpdateCommand({
    TableName: CONNECTIONS_TABLE,
    Key: { connectionId },
    UpdateExpression: 'ADD subscribedLeaderboards :gameId',
    ExpressionAttributeValues: {
      ':gameId': docClient.createSet([gameId])
    }
  }));
  
  // Send current leaderboard
  const leaderboard = await getLeaderboardData(gameId, 'realtime');
  
  await apiGateway.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify({
      action: 'leaderboardUpdate',
      gameId,
      leaderboard
    })
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({ subscribed: true, gameId })
  };
}

async function handleUnsubscribeLeaderboard(connectionId, gameId) {
  // Remove from memory
  if (leaderboardSubscriptions.has(gameId)) {
    leaderboardSubscriptions.get(gameId).delete(connectionId);
    if (leaderboardSubscriptions.get(gameId).size === 0) {
      leaderboardSubscriptions.delete(gameId);
    }
  }
  
  // Remove from DynamoDB
  await docClient.send(new UpdateCommand({
    TableName: CONNECTIONS_TABLE,
    Key: { connectionId },
    UpdateExpression: 'DELETE subscribedLeaderboards :gameId',
    ExpressionAttributeValues: {
      ':gameId': docClient.createSet([gameId])
    }
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({ unsubscribed: true, gameId })
  };
}

async function handleUpdateScore(userId, gameId, score, apiGateway, domainName, stage) {
  // Update score in leaderboard table
  const timestamp = new Date().toISOString();
  
  await docClient.send(new PutCommand({
    TableName: LEADERBOARD_TABLE,
    Item: {
      gameId,
      userId,
      score,
      timestamp,
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
    }
  }));
  
  // Also update in game progress table
  await docClient.send(new UpdateCommand({
    TableName: GAME_PROGRESS_TABLE,
    Key: { userId, gameId },
    UpdateExpression: 'SET score = :score, lastPlayed = :timestamp',
    ExpressionAttributeValues: {
      ':score': score,
      ':timestamp': timestamp
    }
  }));
  
  // Broadcast update to all subscribers
  await broadcastLeaderboardUpdate(gameId, apiGateway, domainName, stage);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ updated: true, score })
  };
}

async function handleGetLeaderboard(connectionId, gameId, timeframe = 'all', apiGateway) {
  const leaderboard = await getLeaderboardData(gameId, timeframe);
  
  await apiGateway.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify({
      action: 'leaderboardData',
      gameId,
      timeframe,
      leaderboard
    })
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({ sent: true })
  };
}

async function getLeaderboardData(gameId, timeframe = 'all') {
  let filterExpression = null;
  let expressionAttributeValues = {
    ':gameId': gameId
  };
  
  // Add time filter
  if (timeframe !== 'all') {
    const now = new Date();
    let startTime;
    
    switch (timeframe) {
      case 'daily':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startTime = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startTime = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startTime = null;
    }
    
    if (startTime) {
      filterExpression = 'timestamp > :startTime';
      expressionAttributeValues[':startTime'] = startTime.toISOString();
    }
  }
  
  // Query leaderboard
  const params = {
    TableName: LEADERBOARD_TABLE,
    IndexName: 'gameId-score-index', // Need to create this GSI
    KeyConditionExpression: 'gameId = :gameId',
    ExpressionAttributeValues: expressionAttributeValues,
    ScanIndexForward: false, // Descending order
    Limit: 100
  };
  
  if (filterExpression) {
    params.FilterExpression = filterExpression;
  }
  
  const result = await docClient.send(new QueryCommand(params));
  
  // Get user details for top players
  const topPlayers = result.Items || [];
  const userIds = [...new Set(topPlayers.map(p => p.userId))];
  
  if (userIds.length > 0) {
    // Batch get user details
    const userDetails = await docClient.send(new BatchGetItemCommand({
      RequestItems: {
        'trioll-prod-users': {
          Keys: userIds.map(id => ({ userId: id }))
        }
      }
    }));
    
    const users = userDetails.Responses['trioll-prod-users'] || [];
    const userMap = new Map(users.map(u => [u.userId, u]));
    
    // Enhance leaderboard with user details
    return topPlayers.map((player, index) => {
      const user = userMap.get(player.userId) || {};
      return {
        rank: index + 1,
        userId: player.userId,
        username: user.username || `Player${player.userId.substr(-4)}`,
        avatar: user.avatar,
        score: player.score,
        timestamp: player.timestamp
      };
    });
  }
  
  return [];
}

async function broadcastLeaderboardUpdate(gameId, apiGateway, domainName, stage) {
  // Get all connections subscribed to this game's leaderboard
  const subscribers = leaderboardSubscriptions.get(gameId) || new Set();
  
  if (subscribers.size === 0) return;
  
  // Get updated leaderboard
  const leaderboard = await getLeaderboardData(gameId, 'realtime');
  
  // Broadcast to all subscribers
  const broadcastPromises = Array.from(subscribers).map(async (connectionId) => {
    try {
      await apiGateway.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: 'leaderboardUpdate',
          gameId,
          leaderboard,
          timestamp: new Date().toISOString()
        })
      }));
    } catch (error) {
      console.error(`Failed to send to ${connectionId}:`, error);
      // Remove dead connections
      if (error.statusCode === 410) {
        subscribers.delete(connectionId);
      }
    }
  });
  
  await Promise.allSettled(broadcastPromises);
}

// Clean up subscriptions when connection closes
async function cleanupConnection(connectionId) {
  // Remove from all leaderboard subscriptions
  for (const [gameId, subscribers] of leaderboardSubscriptions.entries()) {
    subscribers.delete(connectionId);
    if (subscribers.size === 0) {
      leaderboardSubscriptions.delete(gameId);
    }
  }
}