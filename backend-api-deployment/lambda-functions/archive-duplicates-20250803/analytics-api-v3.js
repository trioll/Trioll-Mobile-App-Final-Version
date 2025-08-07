// Analytics API Lambda Function for Node.js 20.x
// Uses AWS SDK v3 which is included in the runtime

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'trioll-prod-analytics';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
      return await handleTrackEvent(userId, body);
    } else if (path.includes('/analytics/games')) {
      return await handleGameAnalytics(userId, body);
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
  
  // Generate guest ID from IP or use a default
  const sourceIp = event.requestContext?.identity?.sourceIp || 
                   event.requestContext?.http?.sourceIp || 
                   'guest';
  
  return `guest-${sourceIp.replace(/\./g, '-')}`;
}

async function handleTrackEvent(userId, body) {
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
    
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: {
        id: eventId,
        userId: userId,
        eventType: eventType,
        data: data || {},
        timestamp: timestamp || new Date().toISOString(),
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
    
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: {
        id: eventId,
        userId: userId,
        eventType: 'game_interaction',
        gameId: gameId,
        action: action,
        data: data || {},
        timestamp: timestamp || new Date().toISOString(),
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