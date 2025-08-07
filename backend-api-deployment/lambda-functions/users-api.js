const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE || 'trioll-prod-users';

// CORS headers
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const path = event.path;
  const method = event.httpMethod;

  try {
    // Get User Profile
    if (path === '/users/profile' && method === 'GET') {
      // Check for guest mode first (headers can be lowercase in API Gateway)
      const headers = event.headers || {};
      const isGuestMode = headers['X-Guest-Mode'] === 'true' || headers['x-guest-mode'] === 'true';
      const identityId = headers['X-Identity-Id'] || headers['x-identity-id'];
      
      let userId;
      
      if (isGuestMode && identityId) {
        // Guest user - use identity ID as user ID (sanitize for DynamoDB)
        userId = identityId.replace(/:/g, '_'); // Replace colons with underscores
        console.log('Guest profile request for identity:', identityId, '-> userId:', userId);
      } else {
        // Authenticated user - check for auth header
        const authHeader = headers.Authorization || headers.authorization;
        if (!authHeader) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'No authorization header' })
          };
        }
        
        // Decode JWT to get user ID (simplified - in production, verify the token)
        const token = authHeader.replace('Bearer ', '');
        
        // Handle guest tokens (format: guest-{guestId})
        if (token.startsWith('guest-')) {
          userId = token.replace('guest-', '');
          console.log('Guest token profile request for:', userId);
        } else {
          try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = payload.sub;
          } catch (error) {
            console.error('Invalid JWT token:', error);
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ error: 'Invalid token' })
            };
          }
        }
      }
      
      // Try to get existing user profile
      const result = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
      }));
      
      if (!result.Item) {
        // For guest users, create a default profile
        if (isGuestMode || userId.startsWith('guest_') || userId.startsWith('us-east-1_')) {
          const shortId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
          const guestProfile = {
            userId,
            displayName: `Guest_${shortId}`,
            username: `guest_${shortId}`,
            isGuest: true,
            level: 1,
            xp: 0,
            gamesPlayed: 0,
            totalPlayTime: 0,
            achievements: [],
            friends: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPremium: false,
            settings: {
              notifications: false,
              privacy: 'public'
            }
          };
          
          // Store the guest profile for future use
          await docClient.send(new PutCommand({
            TableName: USERS_TABLE,
            Item: guestProfile
          }));
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(guestProfile)
          };
        }
        
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
      };
    }
    
    // Update User Profile
    if (path.match(/^\/users\/[\w-]+$/) && method === 'PUT') {
      const userId = path.split('/').pop();
      const updates = JSON.parse(event.body);
      
      // Build update expression
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};
      
      Object.keys(updates).forEach(key => {
        if (key !== 'userId') {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key];
        }
      });
      
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      
      const result = await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Attributes)
      };
    }
    
    // Get User Stats
    if (path.match(/^\/users\/[\w-]+\/stats$/) && method === 'GET') {
      const userId = path.split('/')[2];
      
      const result = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        ProjectionExpression: 'userId, displayName, level, xp, gamesPlayed, totalPlayTime, achievements'
      }));
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      
      // Calculate additional stats
      const stats = {
        ...result.Item,
        rank: calculateRank(result.Item.xp),
        nextLevelXp: calculateNextLevelXp(result.Item.level),
        achievementsUnlocked: result.Item.achievements ? result.Item.achievements.length : 0,
        averagePlayTime: result.Item.gamesPlayed > 0 ? 
          Math.round(result.Item.totalPlayTime / result.Item.gamesPlayed) : 0
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stats)
      };
    }
    
    // Get specific user profile (public view)
    if (path.match(/^\/users\/[\w-]+$/) && method === 'GET') {
      const userId = path.split('/').pop();
      
      const result = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        ProjectionExpression: 'userId, displayName, username, level, xp, achievements, createdAt, isPremium'
      }));
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not Found' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

// Helper functions
function calculateRank(xp) {
  if (xp < 100) return 'Bronze';
  if (xp < 500) return 'Silver';
  if (xp < 1000) return 'Gold';
  if (xp < 5000) return 'Platinum';
  return 'Diamond';
}

function calculateNextLevelXp(currentLevel) {
  return currentLevel * 100 + 100;
}