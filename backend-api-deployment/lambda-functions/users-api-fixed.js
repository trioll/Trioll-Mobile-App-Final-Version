const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, ResendConfirmationCodeCommand } = require('@aws-sdk/client-cognito-identity-provider');
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

// Helper function to extract userId from token
const getUserIdFromToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  // Handle guest tokens
  if (token.startsWith('guest-')) {
    return token.replace('guest-', '').replace(/:/g, '_');
  }
  
  // For real JWT tokens, decode the payload (simplified - in production, verify the token)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || payload.username;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
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
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Invalid JSON in request body'
          })
        };
      }
      
      const { email, username, password, displayName } = body;
      
      // Check if user already exists in DynamoDB
      try {
        const existingUser = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { email }
        }));
        
        if (existingUser.Item) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'An account with this email already exists'
            })
          };
        }
      } catch (dbError) {
        // User doesn't exist, continue with registration
      }
      
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
            soundEnabled: true,
            hapticEnabled: true,
            privacy: 'public'
          }
        };
        
        await docClient.send(new PutCommand({
          TableName: USERS_TABLE,
          Item: userProfile
        }));
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Registration successful. Please check your email for verification code.',
            userId,
            requiresVerification: true
          })
        };
        
      } catch (error) {
        console.error('Registration error:', error);
        
        let message = 'Registration failed';
        if (error.name === 'UsernameExistsException') {
          message = 'An account with this email already exists';
        } else if (error.name === 'InvalidPasswordException') {
          message = 'Password does not meet requirements';
        } else if (error.name === 'InvalidParameterException') {
          message = error.message || 'Invalid registration data';
        }
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message
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

    // Resend Verification Code - NO AUTH REQUIRED
    if (path === '/users/resend-verification' && method === 'POST') {
      const { email } = JSON.parse(event.body);
      
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Email is required'
          })
        };
      }
      
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
        
        if (error.name === 'InvalidParameterException') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'User is already confirmed'
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

    // Get User Profile
    if (path === '/users/profile' && method === 'GET') {
      // Check for guest mode first
      const eventHeaders = event.headers || {};
      const isGuestMode = eventHeaders['X-Guest-Mode'] === 'true' || eventHeaders['x-guest-mode'] === 'true';
      const identityId = eventHeaders['X-Identity-Id'] || eventHeaders['x-identity-id'];
      
      let userId;
      
      if (isGuestMode && identityId) {
        // Guest user - use identity ID as user ID
        userId = identityId.replace(/:/g, '_');
        console.log('Guest profile request for identity:', identityId, '-> userId:', userId);
      } else {
        // Authenticated user - check for auth header
        const authHeader = eventHeaders.Authorization || eventHeaders.authorization;
        userId = getUserIdFromToken(authHeader);
        
        if (!userId) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Unauthorized'
            })
          };
        }
      }
      
      try {
        // Try to get user by userId first
        let user = null;
        try {
          const result = await docClient.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId }
          }));
          user = result.Item;
        } catch (error) {
          console.log('User not found by userId, trying by email');
        }
        
        // If not found and it's not a guest, try by email
        if (!user && !isGuestMode) {
          const queryResult = await docClient.send(new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: 'email-index',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': userId
            }
          }));
          
          if (queryResult.Items && queryResult.Items.length > 0) {
            user = queryResult.Items[0];
          }
        }
        
        if (!user) {
          // Create default profile for new users
          const defaultProfile = {
            userId,
            email: isGuestMode ? '' : userId,
            username: isGuestMode ? `Guest${userId.slice(-6)}` : userId.split('@')[0],
            displayName: isGuestMode ? `Guest${userId.slice(-6)}` : userId.split('@')[0],
            level: 1,
            xp: 0,
            gamesPlayed: 0,
            totalPlayTime: 0,
            achievements: [],
            friends: [],
            favoriteCategories: [],
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            isGuest: isGuestMode,
            profilePicture: '',
            bio: '',
            isPremium: false,
            settings: {
              notifications: true,
              soundEnabled: true,
              hapticEnabled: true,
              privacy: 'public'
            }
          };
          
          // Save the new profile
          await docClient.send(new PutCommand({
            TableName: USERS_TABLE,
            Item: defaultProfile
          }));
          
          user = defaultProfile;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            user
          })
        };
        
      } catch (error) {
        console.error('Get profile error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Failed to get user profile'
          })
        };
      }
    }

    // Update User Profile
    if (path.match(/^\/users\/[^\/]+$/) && method === 'PUT') {
      const userId = path.split('/')[2];
      const updates = JSON.parse(event.body);
      
      // Check authorization
      const authHeader = event.headers.Authorization || event.headers.authorization;
      const tokenUserId = getUserIdFromToken(authHeader);
      
      // For guest users, also check identity ID
      const isGuestMode = event.headers['X-Guest-Mode'] === 'true' || event.headers['x-guest-mode'] === 'true';
      const identityId = event.headers['X-Identity-Id'] || event.headers['x-identity-id'];
      const guestUserId = identityId ? identityId.replace(/:/g, '_') : null;
      
      if (!tokenUserId && !(isGuestMode && guestUserId === userId)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Unauthorized'
          })
        };
      }
      
      // Remove fields that shouldn't be updated directly
      delete updates.userId;
      delete updates.email;
      delete updates.createdAt;
      
      // Update lastActiveAt
      updates.lastActiveAt = new Date().toISOString();
      
      try {
        // Build update expression
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        Object.keys(updates).forEach(key => {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key];
        });
        
        await docClient.send(new UpdateCommand({
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
          body: JSON.stringify({
            success: true,
            message: 'Profile updated successfully'
          })
        };
        
      } catch (error) {
        console.error('Update profile error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Failed to update profile'
          })
        };
      }
    }

    // Login endpoint
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = JSON.parse(event.body);
      
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
            tokens: {
              accessToken: authResult.AuthenticationResult.AccessToken,
              refreshToken: authResult.AuthenticationResult.RefreshToken,
              idToken: authResult.AuthenticationResult.IdToken,
              expiresIn: authResult.AuthenticationResult.ExpiresIn
            }
          })
        };
        
      } catch (error) {
        console.error('Login error:', error);
        
        let message = 'Login failed';
        if (error.name === 'UserNotFoundException') {
          message = 'User not found';
        } else if (error.name === 'NotAuthorizedException') {
          message = 'Incorrect username or password';
        } else if (error.name === 'UserNotConfirmedException') {
          message = 'Please verify your email before logging in';
        }
        
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            message
          })
        };
      }
    }

    // If no route matched
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Route not found'
      })
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error'
      })
    };
  }
};