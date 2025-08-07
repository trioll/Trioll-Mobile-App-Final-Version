const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'trioll-prod-websocket-connections';
const USERS_TABLE = process.env.USERS_TABLE || 'trioll-prod-users';
const ACTIVITIES_TABLE = process.env.ACTIVITIES_TABLE || 'trioll-prod-activities';
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || 'trioll-prod-notifications';

exports.handler = async (event) => {
  console.log('WebSocket Message Event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;
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
      case 'ping':
        // Update last ping timestamp
        await docClient.send(new UpdateCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId },
          UpdateExpression: 'SET lastPing = :now',
          ExpressionAttributeValues: {
            ':now': new Date().toISOString()
          }
        }));

        // Send pong response
        await sendToConnection(apiGatewayClient, connectionId, {
          action: 'pong',
          timestamp: new Date().toISOString()
        });
        break;

      case 'subscribe':
        // Subscribe to specific channels (friends, notifications, etc.)
        const { channels } = data;
        await docClient.send(new UpdateCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId },
          UpdateExpression: 'SET subscribedChannels = :channels',
          ExpressionAttributeValues: {
            ':channels': channels
          }
        }));

        await sendToConnection(apiGatewayClient, connectionId, {
          action: 'subscribed',
          channels
        });
        break;

      case 'sendNotification':
        // Send notification to specific user
        const { targetUserId, notification } = data;
        
        // Store notification
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await docClient.send(new PutCommand({
          TableName: NOTIFICATIONS_TABLE,
          Item: {
            notificationId,
            userId: targetUserId,
            fromUserId: userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            read: false,
            createdAt: new Date().toISOString()
          }
        }));

        // Find target user's connections
        const targetConnections = await getActiveConnectionsForUser(targetUserId);
        
        // Send notification to all target user's connections
        for (const conn of targetConnections) {
          await sendToConnection(apiGatewayClient, conn.connectionId, {
            action: 'notification',
            notification: {
              id: notificationId,
              ...notification,
              fromUserId: userId,
              timestamp: new Date().toISOString()
            }
          });
        }
        break;

      case 'broadcastActivity':
        // Broadcast activity to friends
        const { activity } = data;
        
        // Store activity
        const activityId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await docClient.send(new PutCommand({
          TableName: ACTIVITIES_TABLE,
          Item: {
            activityId,
            userId,
            ...activity,
            timestamp: new Date().toISOString()
          }
        }));

        // Get user's friends
        const userResult = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId },
          ProjectionExpression: 'friends'
        }));

        const friends = userResult.Item?.friends || [];
        
        // Send activity to all online friends
        for (const friendId of friends) {
          const friendConnections = await getActiveConnectionsForUser(friendId);
          for (const conn of friendConnections) {
            await sendToConnection(apiGatewayClient, conn.connectionId, {
              action: 'friendActivity',
              activity: {
                id: activityId,
                userId,
                ...activity,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
        break;

      case 'updateGameState':
        // Real-time game state updates (for multiplayer features)
        const { gameId, state } = data;
        
        // Get all users in the same game session
        const gameConnections = await getConnectionsInGame(gameId);
        
        // Broadcast game state to all players
        for (const conn of gameConnections) {
          if (conn.connectionId !== connectionId) {
            await sendToConnection(apiGatewayClient, conn.connectionId, {
              action: 'gameStateUpdate',
              gameId,
              state,
              fromUserId: userId,
              timestamp: new Date().toISOString()
            });
          }
        }
        break;

      case 'typing':
        // Typing indicator for chat
        const { conversationId, isTyping } = data;
        
        // Get all users in conversation
        const conversationConnections = await getConnectionsInConversation(conversationId);
        
        // Broadcast typing status
        for (const conn of conversationConnections) {
          if (conn.connectionId !== connectionId) {
            await sendToConnection(apiGatewayClient, conn.connectionId, {
              action: 'userTyping',
              conversationId,
              userId,
              isTyping,
              timestamp: new Date().toISOString()
            });
          }
        }
        break;

      default:
        await sendToConnection(apiGatewayClient, connectionId, {
          action: 'error',
          message: `Unknown action: ${action}`
        });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Message handling error:', error);
    
    // Try to send error to client
    try {
      await sendToConnection(apiGatewayClient, connectionId, {
        action: 'error',
        message: error.message
      });
    } catch (sendError) {
      console.error('Failed to send error to client:', sendError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process message',
        message: error.message
      })
    };
  }
};

// Helper function to send message to a connection
async function sendToConnection(apiGatewayClient, connectionId, data) {
  try {
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 410) {
      // Connection is stale, remove it
      console.log(`Removing stale connection: ${connectionId}`);
      await docClient.send(new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
      }));
    } else {
      throw error;
    }
  }
}

// Get all active connections for a user
async function getActiveConnectionsForUser(userId) {
  const result = await docClient.send(new QueryCommand({
    TableName: CONNECTIONS_TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));
  
  return result.Items || [];
}

// Get all connections in a game session
async function getConnectionsInGame(gameId) {
  // This would query a game sessions table
  // For now, return empty array
  return [];
}

// Get all connections in a conversation
async function getConnectionsInConversation(conversationId) {
  // This would query a conversations table
  // For now, return empty array
  return [];
}