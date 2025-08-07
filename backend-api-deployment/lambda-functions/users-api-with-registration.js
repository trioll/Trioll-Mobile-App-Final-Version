const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, RespondToAuthChallengeCommand, GetUserCommand, ResendConfirmationCodeCommand } = require('@aws-sdk/client-cognito-identity-provider');
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
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id',
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
      const { email, username, password, displayName } = JSON.parse(event.body);
      
      // Generate unique username if not provided
      const finalUsername = username || email.split('@')[0] + '_' + Date.now().toString(36);
      
      try {
        // Create user in Cognito
        const signUpParams = {
          ClientId: CLIENT_ID,
          Username: email,
          Password: password,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: displayName || finalUsername },
            { Name: 'preferred_username', Value: finalUsername }
          ]
        };
        
        const signUpResult = await cognitoClient.send(new SignUpCommand(signUpParams));
        const userId = signUpResult.UserSub;
        
        // Create user profile in DynamoDB
        const userProfile = {
          userId,
          email,
          username: finalUsername,
          displayName: displayName || finalUsername,
          level: 1,
          xp: 0,
          gamesPlayed: 0,
          totalPlayTime: 0,
          achievements: [],
          friends: [],
          favoriteCategories: [],
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          isGuest: false,
          profilePicture: '',
          bio: '',
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
            success: true,
            userId,
            requiresVerification: true,
            message: 'Registration successful. Please check your email for verification code.'
          })
        };
        
      } catch (error) {
        console.error('Registration error:', error);
        
        if (error.name === 'UsernameExistsException') {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'An account with this email already exists'
            })
          };
        }
        
        if (error.name === 'InvalidPasswordException') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
            })
          };
        }
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: error.message || 'Registration failed'
          })
        };
      }
    }

    // Email Verification
    if (path === '/users/verify' && method === 'POST') {
      const { email, code, password } = JSON.parse(event.body);
      
      try {
        // Confirm sign up
        await cognitoClient.send(new ConfirmSignUpCommand({
          ClientId: CLIENT_ID,
          Username: email,
          ConfirmationCode: code
        }));
        
        // If password provided, automatically sign in
        if (password) {
          try {
            const authResult = await cognitoClient.send(new InitiateAuthCommand({
              ClientId: CLIENT_ID,
              AuthFlow: 'USER_PASSWORD_AUTH',
              AuthParameters: {
                USERNAME: email,
                PASSWORD: password
              }
            }));
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: 'Email verified successfully',
                tokens: {
                  accessToken: authResult.AuthenticationResult.AccessToken,
                  refreshToken: authResult.AuthenticationResult.RefreshToken,
                  idToken: authResult.AuthenticationResult.IdToken,
                  expiresIn: authResult.AuthenticationResult.ExpiresIn
                }
              })
            };
          } catch (authError) {
            console.error('Auto-login after verification failed:', authError);
            // Still return success for verification
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Email verified successfully. You can now log in.'
          })
        };
        
      } catch (error) {
        console.error('Verification error:', error);
        
        if (error.name === 'CodeMismatchException') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Invalid verification code'
            })
          };
        }
        
        if (error.name === 'ExpiredCodeException') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Verification code has expired'
            })
          };
        }
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: error.message || 'Verification failed'
          })
        };
      }
    }

    // Resend Verification Code
    if (path === '/users/resend-verification' && method === 'POST') {
      const { email } = JSON.parse(event.body);
      
      try {
        // Resend confirmation code
        await cognitoClient.send(new ResendConfirmationCodeCommand({
          ClientId: CLIENT_ID,
          Username: email
        }));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Verification code resent successfully'
          })
        };
        
      } catch (error) {
        console.error('Resend verification error:', error);
        
        if (error.name === 'UserNotFoundException') {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'User not found'
            })
          };
        }
        
        if (error.name === 'LimitExceededException') {
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Too many requests. Please try again later'
            })
          };
        }
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: error.message || 'Failed to resend code'
          })
        };
      }
    }

    // Get User Profile (existing code)
    if (path === '/users/profile' && method === 'GET') {
      // Check for guest mode first (headers can be lowercase in API Gateway)
      const requestHeaders = event.headers || {};
      const isGuestMode = requestHeaders['X-Guest-Mode'] === 'true' || requestHeaders['x-guest-mode'] === 'true';
      const identityId = requestHeaders['X-Identity-Id'] || requestHeaders['x-identity-id'];
      
      let userId;
      
      if (isGuestMode && identityId) {
        // Guest user - use identity ID as user ID (sanitize for DynamoDB)
        userId = identityId.replace(/:/g, '_'); // Replace colons with underscores
        console.log('Guest profile request for identity:', identityId, '-> userId:', userId);
      } else {
        // Authenticated user - check for auth header
        const authHeader = requestHeaders.Authorization || requestHeaders.authorization;
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
            lastActiveAt: new Date().toISOString()
          };
          
          // Save the guest profile
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
    if (path.match(/^\/users\/[^\/]+$/) && method === 'PUT') {
      const userId = path.split('/')[2];
      const updates = JSON.parse(event.body);
      
      // Build update expression
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};
      
      Object.keys(updates).forEach(key => {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      });
      
      // Add lastActiveAt
      updateExpressions.push('#lastActiveAt = :lastActiveAt');
      expressionAttributeNames['#lastActiveAt'] = 'lastActiveAt';
      expressionAttributeValues[':lastActiveAt'] = new Date().toISOString();
      
      const updateResult = await docClient.send(new UpdateCommand({
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
        body: JSON.stringify(updateResult.Attributes)
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};