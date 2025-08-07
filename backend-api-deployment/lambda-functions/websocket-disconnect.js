const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'trioll-prod-websocket-connections';
const USERS_TABLE = process.env.USERS_TABLE || 'trioll-prod-users';

exports.handler = async (event) => {
  console.log('WebSocket Disconnect Event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;

  try {
    // Remove connection from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }));

    // Update user's online status (if authenticated)
    // In a real implementation, you'd first retrieve the userId from the connection
    // For now, we'll skip this step

    console.log(`Connection ${connectionId} disconnected`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Disconnected successfully'
      })
    };
  } catch (error) {
    console.error('Disconnection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to disconnect',
        message: error.message
      })
    };
  }
};