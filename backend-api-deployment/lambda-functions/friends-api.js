const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE || 'trioll-prod-users';
const FRIEND_REQUESTS_TABLE = process.env.FRIEND_REQUESTS_TABLE || 'trioll-prod-friend-requests';
const ACTIVITIES_TABLE = process.env.ACTIVITIES_TABLE || 'trioll-prod-activities';

// CORS headers
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
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
    // Get user ID from authorization header or request context
    const userId = event.requestContext?.authorizer?.claims?.sub || 
                   event.headers?.['x-user-id'] || 
                   'guest';

    // Get Friends List
    if (path.match(/^\/users\/[\w-]+\/friends$/) && method === 'GET') {
      const targetUserId = path.split('/')[2];
      
      // Get user's friends list
      const userResult = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: targetUserId },
        ProjectionExpression: 'friends'
      }));
      
      if (!userResult.Item || !userResult.Item.friends) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([])
        };
      }
      
      // Get friend details
      const friendPromises = userResult.Item.friends.map(friendId => 
        docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: friendId },
          ProjectionExpression: 'userId, username, displayName, avatar, isOnline, lastActive, level'
        }))
      );
      
      const friendResults = await Promise.all(friendPromises);
      const friends = friendResults
        .filter(result => result.Item)
        .map(result => ({
          id: result.Item.userId,
          username: result.Item.username,
          realName: result.Item.displayName,
          avatar: result.Item.avatar || `https://picsum.photos/200/200?random=${result.Item.userId}`,
          isOnline: result.Item.isOnline || false,
          lastActive: result.Item.lastActive || new Date().toISOString(),
          level: result.Item.level || 1,
          // Future feature: Mutual friends calculation - returns 0 for MVP
          mutualFriends: 0,
          // Future feature: Games in common calculation - returns 0 for MVP
          gamesInCommon: 0
        }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(friends)
      };
    }
    
    // Get Friend Requests
    if (path.match(/^\/users\/[\w-]+\/friend-requests$/) && method === 'GET') {
      const targetUserId = path.split('/')[2];
      
      // Get incoming requests
      const incomingResult = await docClient.send(new QueryCommand({
        TableName: FRIEND_REQUESTS_TABLE,
        IndexName: 'toUserId-index',
        KeyConditionExpression: 'toUserId = :userId',
        ExpressionAttributeValues: {
          ':userId': targetUserId
        }
      }));
      
      // Get sent requests
      const sentResult = await docClient.send(new QueryCommand({
        TableName: FRIEND_REQUESTS_TABLE,
        KeyConditionExpression: 'fromUserId = :userId',
        ExpressionAttributeValues: {
          ':userId': targetUserId
        }
      }));
      
      // Get user details for requests
      const requests = [];
      
      for (const request of incomingResult.Items || []) {
        const userDetail = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: request.fromUserId }
        }));
        
        if (userDetail.Item) {
          requests.push({
            id: request.requestId,
            user: {
              id: userDetail.Item.userId,
              username: userDetail.Item.username,
              realName: userDetail.Item.displayName,
              avatar: userDetail.Item.avatar || `https://picsum.photos/200/200?random=${userDetail.Item.userId}`,
              isOnline: userDetail.Item.isOnline || false,
              lastActive: userDetail.Item.lastActive || new Date().toISOString(),
            },
            type: 'incoming',
            message: request.message,
            timestamp: request.createdAt,
            mutualFriends: []
          });
        }
      }
      
      for (const request of sentResult.Items || []) {
        const userDetail = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: request.toUserId }
        }));
        
        if (userDetail.Item) {
          requests.push({
            id: request.requestId,
            user: {
              id: userDetail.Item.userId,
              username: userDetail.Item.username,
              realName: userDetail.Item.displayName,
              avatar: userDetail.Item.avatar || `https://picsum.photos/200/200?random=${userDetail.Item.userId}`,
              isOnline: userDetail.Item.isOnline || false,
              lastActive: userDetail.Item.lastActive || new Date().toISOString(),
            },
            type: 'sent',
            message: request.message,
            timestamp: request.createdAt,
            mutualFriends: []
          });
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(requests)
      };
    }
    
    // Send Friend Request
    if (path === '/friend-requests' && method === 'POST') {
      const { fromUserId, toUserId, message } = JSON.parse(event.body);
      
      // Check if already friends
      const userResult = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: fromUserId },
        ProjectionExpression: 'friends'
      }));
      
      if (userResult.Item?.friends?.includes(toUserId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Already friends' })
        };
      }
      
      // Check if request already exists
      const existingRequest = await docClient.send(new QueryCommand({
        TableName: FRIEND_REQUESTS_TABLE,
        KeyConditionExpression: 'fromUserId = :fromId AND toUserId = :toId',
        ExpressionAttributeValues: {
          ':fromId': fromUserId,
          ':toId': toUserId
        }
      }));
      
      if (existingRequest.Items?.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Friend request already sent' })
        };
      }
      
      // Create friend request
      const requestId = `fr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const friendRequest = {
        requestId,
        fromUserId,
        toUserId,
        message: message || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await docClient.send(new PutCommand({
        TableName: FRIEND_REQUESTS_TABLE,
        Item: friendRequest
      }));
      
      // Future feature: Push notifications for friend requests
      // Currently notifications are handled client-side when users check their requests
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ requestId, message: 'Friend request sent' })
      };
    }
    
    // Accept Friend Request
    if (path.match(/^\/friend-requests\/[\w-]+\/accept$/) && method === 'POST') {
      const requestId = path.split('/')[2];
      
      // Get the request
      const requestResult = await docClient.send(new ScanCommand({
        TableName: FRIEND_REQUESTS_TABLE,
        FilterExpression: 'requestId = :requestId',
        ExpressionAttributeValues: {
          ':requestId': requestId
        }
      }));
      
      if (!requestResult.Items || requestResult.Items.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Friend request not found' })
        };
      }
      
      const request = requestResult.Items[0];
      
      // Add each user to the other's friends list
      await Promise.all([
        // Add to sender's friends
        docClient.send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: request.fromUserId },
          UpdateExpression: 'ADD friends :friend',
          ExpressionAttributeValues: {
            ':friend': docClient.createSet([request.toUserId])
          }
        })),
        // Add to receiver's friends
        docClient.send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: request.toUserId },
          UpdateExpression: 'ADD friends :friend',
          ExpressionAttributeValues: {
            ':friend': docClient.createSet([request.fromUserId])
          }
        }))
      ]);
      
      // Delete the friend request
      await docClient.send(new DeleteCommand({
        TableName: FRIEND_REQUESTS_TABLE,
        Key: {
          fromUserId: request.fromUserId,
          toUserId: request.toUserId
        }
      }));
      
      // Create activity entries
      const activityPromises = [
        docClient.send(new PutCommand({
          TableName: ACTIVITIES_TABLE,
          Item: {
            activityId: `act_${Date.now()}_1`,
            userId: request.fromUserId,
            type: 'friend_added',
            targetUserId: request.toUserId,
            timestamp: new Date().toISOString()
          }
        })),
        docClient.send(new PutCommand({
          TableName: ACTIVITIES_TABLE,
          Item: {
            activityId: `act_${Date.now()}_2`,
            userId: request.toUserId,
            type: 'friend_added',
            targetUserId: request.fromUserId,
            timestamp: new Date().toISOString()
          }
        }))
      ];
      
      await Promise.all(activityPromises);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Friend request accepted' })
      };
    }
    
    // Reject Friend Request
    if (path.match(/^\/friend-requests\/[\w-]+\/reject$/) && method === 'POST') {
      const requestId = path.split('/')[2];
      
      // Get and delete the request
      const requestResult = await docClient.send(new ScanCommand({
        TableName: FRIEND_REQUESTS_TABLE,
        FilterExpression: 'requestId = :requestId',
        ExpressionAttributeValues: {
          ':requestId': requestId
        }
      }));
      
      if (requestResult.Items && requestResult.Items.length > 0) {
        const request = requestResult.Items[0];
        await docClient.send(new DeleteCommand({
          TableName: FRIEND_REQUESTS_TABLE,
          Key: {
            fromUserId: request.fromUserId,
            toUserId: request.toUserId
          }
        }));
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Friend request rejected' })
      };
    }
    
    // Remove Friend
    if (path.match(/^\/users\/[\w-]+\/friends\/[\w-]+$/) && method === 'DELETE') {
      const [, , userId1, , userId2] = path.split('/');
      
      // Remove from both users' friends lists
      await Promise.all([
        docClient.send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: userId1 },
          UpdateExpression: 'DELETE friends :friend',
          ExpressionAttributeValues: {
            ':friend': docClient.createSet([userId2])
          }
        })),
        docClient.send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: userId2 },
          UpdateExpression: 'DELETE friends :friend',
          ExpressionAttributeValues: {
            ':friend': docClient.createSet([userId1])
          }
        }))
      ]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Friend removed' })
      };
    }
    
    // Get Friend Activity
    if (path.match(/^\/users\/[\w-]+\/friends\/activity$/) && method === 'GET') {
      const targetUserId = path.split('/')[2];
      const limit = parseInt(event.queryStringParameters?.limit || '50');
      
      // Get user's friends
      const userResult = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: targetUserId },
        ProjectionExpression: 'friends'
      }));
      
      if (!userResult.Item || !userResult.Item.friends || userResult.Item.friends.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([])
        };
      }
      
      // Get activities from friends
      const activityPromises = userResult.Item.friends.map(friendId =>
        docClient.send(new QueryCommand({
          TableName: ACTIVITIES_TABLE,
          IndexName: 'userId-timestamp-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': friendId
          },
          Limit: 10,
          ScanIndexForward: false // newest first
        }))
      );
      
      const activityResults = await Promise.all(activityPromises);
      const activities = [];
      
      for (const result of activityResults) {
        for (const item of result.Items || []) {
          // Get user details
          const userDetail = await docClient.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId: item.userId },
            ProjectionExpression: 'username, displayName, avatar'
          }));
          
          if (userDetail.Item) {
            activities.push({
              id: item.activityId,
              userId: item.userId,
              username: userDetail.Item.username,
              userAvatar: userDetail.Item.avatar || `https://picsum.photos/200/200?random=${item.userId}`,
              type: item.type,
              gameId: item.gameId,
              gameName: item.gameName,
              gameCover: item.gameCover,
              achievement: item.achievement,
              rating: item.rating,
              score: item.score,
              timestamp: item.timestamp
            });
          }
        }
      }
      
      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(activities.slice(0, limit))
      };
    }
    
    // Search Users (for finding friends)
    if (path === '/users/search' && method === 'GET') {
      const query = event.queryStringParameters?.q || '';
      const limit = parseInt(event.queryStringParameters?.limit || '20');
      
      if (!query || query.length < 2) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([])
        };
      }
      
      // Search users by username or display name
      const scanResult = await docClient.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'contains(username, :query) OR contains(displayName, :query)',
        ExpressionAttributeValues: {
          ':query': query.toLowerCase()
        },
        ProjectionExpression: 'userId, username, displayName, avatar, level',
        Limit: limit
      }));
      
      const users = (scanResult.Items || []).map(item => ({
        id: item.userId,
        username: item.username,
        realName: item.displayName,
        avatar: item.avatar || `https://picsum.photos/200/200?random=${item.userId}`,
        level: item.level || 1,
        // Future feature: Real-time online status tracking - returns false for MVP
        isOnline: false,
        lastActive: new Date().toISOString()
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(users)
      };
    }
    
    // Get Suggested Friends
    if (path.match(/^\/users\/[\w-]+\/suggested-friends$/) && method === 'GET') {
      const targetUserId = path.split('/')[2];
      const limit = parseInt(event.queryStringParameters?.limit || '10');
      
      // Get user's current friends
      const userResult = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: targetUserId },
        ProjectionExpression: 'friends'
      }));
      
      const currentFriends = userResult.Item?.friends || [];
      
      // Get random users who are not already friends
      const scanResult = await docClient.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'userId <> :userId',
        ExpressionAttributeValues: {
          ':userId': targetUserId
        },
        ProjectionExpression: 'userId, username, displayName, avatar, level',
        Limit: limit * 2 // Get more to filter out existing friends
      }));
      
      const suggestions = (scanResult.Items || [])
        .filter(item => !currentFriends.includes(item.userId))
        .slice(0, limit)
        .map(item => ({
          id: item.userId,
          username: item.username,
          realName: item.displayName,
          avatar: item.avatar || `https://picsum.photos/200/200?random=${item.userId}`,
          level: item.level || 1,
          // Future feature: Mutual friends calculation - returns 0 for MVP
          mutualFriends: 0,
          // Future feature: Games in common calculation - returns 0 for MVP
          gamesInCommon: 0
        }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(suggestions)
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
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