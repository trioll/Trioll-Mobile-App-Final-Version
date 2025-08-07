const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'trioll-prod-websocket-connections';

exports.handler = async (event) => {
  console.log('WebSocket Connect Event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters?.userId || 'guest';
  const timestamp = new Date().toISOString();

  try {
    // Store connection in DynamoDB
    await docClient.send(new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        userId,
        connectedAt: timestamp,
        lastPing: timestamp,
        status: 'connected'
      }
    }));

    console.log(`User ${userId} connected with connectionId: ${connectionId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Connected successfully',
        connectionId
      })
    };
  } catch (error) {
    console.error('Connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to connect',
        message: error.message
      })
    };
  }
};