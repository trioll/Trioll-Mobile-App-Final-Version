const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, RespondToAuthChallengeCommand, GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE || 'trioll-prod-users';
const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_cLPH2acQd';
const CLIENT_ID = process.env.CLIENT_ID || 'bft50gui77sdq2n4lcio4onql';

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
    // User Registration
    if (path === '/users/register' && method === 'POST') {
      const { email, password, displayName } = JSON.parse(event.body);
      
      // Create user in Cognito
      const signUpParams = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: displayName || email.split('@')[0] }
        ]
      };
      
      const signUpResult = await cognitoClient.send(new SignUpCommand(signUpParams));
      const userId = signUpResult.UserSub;
      
      // Create user profile in DynamoDB
      const userProfile = {
        userId,
        email,
        displayName: displayName || email.split('@')[0],
        username: `player_${userId.substring(0, 8)}`,
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
          notifications: true,
          privacy: 'public'
        }
      };
      
      await docClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: userProfile
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          userId,
          requiresVerification: !signUpResult.UserConfirmed,
          message: 'User registered successfully'
        })
      };
    }
    
    // Email Verification
    if (path === '/users/verify' && method === 'POST') {
      const { email, code } = JSON.parse(event.body);
      
      const confirmParams = {
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code
      };
      
      await cognitoClient.send(new ConfirmSignUpCommand(confirmParams));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: true,
          message: 'Email verified successfully'
        })
      };
    }
    
    // User Login
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = JSON.parse(event.body);
      
      const authParams = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      };
      
      const authResult = await cognitoClient.send(new InitiateAuthCommand(authParams));
      
      if (authResult.ChallengeName) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            challengeName: authResult.ChallengeName,
            session: authResult.Session,
            challengeParameters: authResult.ChallengeParameters
          })
        };
      }
      
      // Get user ID from token
      const idToken = authResult.AuthenticationResult.IdToken;
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      const userId = payload.sub;
      
      // Get user profile from DynamoDB
      const userResult = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          accessToken: authResult.AuthenticationResult.AccessToken,
          idToken: authResult.AuthenticationResult.IdToken,
          refreshToken: authResult.AuthenticationResult.RefreshToken,
          user: userResult.Item
        })
      };
    }
    
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
        achievementCount: result.Item.achievements?.length || 0
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stats)
      };
    }
    
    // Token Refresh
    if (path === '/auth/refresh' && method === 'POST') {
      const { refreshToken } = JSON.parse(event.body);
      
      const authParams = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken
        }
      };
      
      const authResult = await cognitoClient.send(new InitiateAuthCommand(authParams));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          accessToken: authResult.AuthenticationResult.AccessToken,
          idToken: authResult.AuthenticationResult.IdToken
        })
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'UsernameExistsException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User already exists' })
      };
    }
    
    if (error.name === 'CodeMismatchException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid verification code' })
      };
    }
    
    if (error.name === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }
    
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
  if (xp < 100) return 'Beginner';
  if (xp < 500) return 'Novice';
  if (xp < 1000) return 'Intermediate';
  if (xp < 5000) return 'Advanced';
  if (xp < 10000) return 'Expert';
  return 'Master';
}

function calculateNextLevelXp(level) {
  return level * 100;
}