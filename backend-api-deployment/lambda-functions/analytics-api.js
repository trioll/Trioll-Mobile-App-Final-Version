// Analytics API Lambda Function
// Tracks user events and game interactions

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'trioll-prod-analytics';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Identity-Id',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
    const body = JSON.parse(event.body || '{}');
    
    // Extract user ID from auth token or use guest ID
    const userId = getUserIdFromEvent(event);
    
    if (path.includes('/analytics/events')) {
      return handleTrackEvent(userId, body);
    } else if (path.includes('/analytics/identify')) {
      return handleIdentify(userId, body);
    } else if (path.includes('/analytics/games')) {
      return handleGameAnalytics(userId, body);
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

function getUserIdFromEvent(event) {
  // Try to get user ID from Cognito auth
  const claims = event.requestContext?.authorizer?.jwt?.claims || 
                 event.requestContext?.authorizer?.claims || {};
  
  if (claims.sub) {
    return claims.sub;
  }
  
  // Check for Cognito Identity ID (Amplify guest users)
  if (event.requestContext?.identity?.cognitoIdentityId) {
    return event.requestContext.identity.cognitoIdentityId;
  }
  
  // Check for custom header
  if (event.headers?.['X-Identity-Id'] || event.headers?.['x-identity-id']) {
    return event.headers['X-Identity-Id'] || event.headers['x-identity-id'];
  }
  
  // Generate guest ID from IP or use a default
  const sourceIp = event.requestContext?.identity?.sourceIp || 
                   event.requestContext?.http?.sourceIp || 
                   'guest';
  
  return `guest-${sourceIp.replace(/\./g, '-')}`;
}

async function handleTrackEvent(userId, body) {
  // Handle batch format from frontend
  if (body.events && Array.isArray(body.events)) {
    return handleBatchEvents(userId, body);
  }
  
  // Handle single event format (backward compatibility)
  const { eventType, data, timestamp } = body;
  
  if (!eventType) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Event type required' })
    };
  }
  
  try {
    // Create event ID with timestamp for uniqueness
    const eventId = `${userId}#${eventType}#${Date.now()}`;
    
    const eventTimestamp = String(timestamp || Date.now()); // Store as string for DynamoDB
    
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: {
        eventId: eventId,
        timestamp: eventTimestamp,
        userId: userId,
        eventType: eventType,
        data: data || {},
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, eventId })
    };
  } catch (error) {
    console.error('Error tracking event:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to track event' })
    };
  }
}

async function handleBatchEvents(userId, body) {
  const { events, session } = body;
  
  if (!events || !Array.isArray(events) || events.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Events array required' })
    };
  }
  
  try {
    // Process events in batches of 25 (DynamoDB limit)
    const batchSize = 25;
    const batches = [];
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchPromises = batch.map(async (evt) => {
        const eventId = `${userId}#${evt.event || 'unknown'}#${evt.timestamp || Date.now()}`;
        
        return dynamodb.send(new PutCommand({
          TableName: ANALYTICS_TABLE,
          Item: {
            eventId: eventId,
            timestamp: String(evt.timestamp || Date.now()), // Convert to string for DynamoDB
            userId: evt.userId || userId,
            eventType: evt.event || 'unknown',
            properties: evt.properties || {},
            sessionId: evt.sessionId || session?.id,
            platform: evt.platform || 'unknown',
            appVersion: evt.appVersion || '1.0.0',
            environment: evt.environment || 'production',
            deviceId: evt.deviceId,
            ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
          }
        }));
      });
      
      batches.push(Promise.all(batchPromises));
    }
    
    await Promise.all(batches);
    
    console.log(`Successfully processed ${events.length} events for user ${userId}`);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true, 
        eventsProcessed: events.length,
        userId 
      })
    };
  } catch (error) {
    console.error('Error processing batch events:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to process events' })
    };
  }
}

async function handleGameAnalytics(userId, body) {
  const { gameId, action, data, timestamp } = body;
  
  if (!gameId || !action) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Game ID and action required' })
    };
  }
  
  try {
    // Create event ID with timestamp for uniqueness
    const eventId = `${userId}#game#${gameId}#${action}#${Date.now()}`;
    
    const eventTimestamp = String(timestamp || Date.now()); // Store as string for DynamoDB
    
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: {
        eventId: eventId,
        timestamp: eventTimestamp,
        userId: userId,
        eventType: 'game_interaction',
        gameId: gameId,
        action: action,
        data: data || {},
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, eventId })
    };
  } catch (error) {
    console.error('Error tracking game analytics:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to track game analytics' })
    };
  }
}

async function handleIdentify(userId, body) {
  const { users } = body;
  
  if (!users || !Array.isArray(users) || users.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Users array required' })
    };
  }
  
  try {
    const identifyPromises = users.map(async (user) => {
      const eventId = `${user.userId || userId}#identify#${Date.now()}`;
      
      return dynamodb.send(new PutCommand({
        TableName: ANALYTICS_TABLE,
        Item: {
          eventId: eventId,
          timestamp: String(Date.now()), // Convert to string for DynamoDB
          userId: user.userId || userId,
          eventType: 'user_identify',
          properties: user.properties || {},
          traits: user.traits || {},
          ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
        }
      }));
    });
    
    await Promise.all(identifyPromises);
    
    console.log(`Successfully identified ${users.length} users`);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true, 
        usersIdentified: users.length 
      })
    };
  } catch (error) {
    console.error('Error identifying users:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to identify users' })
    };
  }
}