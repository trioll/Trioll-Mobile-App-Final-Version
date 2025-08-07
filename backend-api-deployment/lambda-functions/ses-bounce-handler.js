const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE || 'trioll-prod-users';
const SUPPRESSION_TABLE = process.env.SUPPRESSION_TABLE || 'trioll-prod-email-suppression';

/**
 * Lambda function to handle SES bounce and complaint notifications
 * This function receives SNS notifications from SES and updates user records
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse SNS message
    const message = JSON.parse(event.Records[0].Sns.Message);
    const notificationType = message.notificationType;
    
    if (notificationType === 'Bounce') {
      await handleBounce(message);
    } else if (notificationType === 'Complaint') {
      await handleComplaint(message);
    } else {
      console.log(`Unknown notification type: ${notificationType}`);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification processed successfully' })
    };
  } catch (error) {
    console.error('Error processing notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process notification' })
    };
  }
};

/**
 * Handle bounce notifications
 */
async function handleBounce(message) {
  const bounce = message.bounce;
  const bounceType = bounce.bounceType;
  const bounceSubType = bounce.bounceSubType;
  const bouncedRecipients = bounce.bouncedRecipients || [];
  
  console.log(`Processing ${bounceType} bounce (${bounceSubType})`);
  
  for (const recipient of bouncedRecipients) {
    const email = recipient.emailAddress;
    const diagnosticCode = recipient.diagnosticCode || '';
    
    // Add to suppression list
    await addToSuppressionList(email, 'bounce', {
      bounceType,
      bounceSubType,
      diagnosticCode,
      timestamp: new Date().toISOString()
    });
    
    // Update user record if it's a hard bounce
    if (bounceType === 'Permanent') {
      await markEmailAsInvalid(email);
    }
    
    console.log(`Processed bounce for ${email} - Type: ${bounceType}/${bounceSubType}`);
  }
}

/**
 * Handle complaint notifications
 */
async function handleComplaint(message) {
  const complaint = message.complaint;
  const complainedRecipients = complaint.complainedRecipients || [];
  const complaintFeedbackType = complaint.complaintFeedbackType || 'not-specified';
  
  console.log(`Processing complaint: ${complaintFeedbackType}`);
  
  for (const recipient of complainedRecipients) {
    const email = recipient.emailAddress;
    
    // Add to suppression list
    await addToSuppressionList(email, 'complaint', {
      complaintFeedbackType,
      timestamp: new Date().toISOString()
    });
    
    // Update user preferences to unsubscribe from emails
    await unsubscribeUser(email);
    
    console.log(`Processed complaint for ${email} - Type: ${complaintFeedbackType}`);
  }
}

/**
 * Add email to suppression list
 */
async function addToSuppressionList(email, reason, metadata) {
  try {
    await docClient.send(new PutCommand({
      TableName: SUPPRESSION_TABLE,
      Item: {
        email: email.toLowerCase(),
        reason,
        metadata,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
      }
    }));
  } catch (error) {
    console.error(`Failed to add ${email} to suppression list:`, error);
  }
}

/**
 * Mark email as invalid in user record
 */
async function markEmailAsInvalid(email) {
  try {
    // First, find the user by email
    // Note: In production, you might want to maintain an email->userId index
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: email.toLowerCase() },
      UpdateExpression: 'SET emailValid = :false, emailBounced = :true, emailBouncedAt = :timestamp',
      ExpressionAttributeValues: {
        ':false': false,
        ':true': true,
        ':timestamp': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error(`Failed to mark email ${email} as invalid:`, error);
  }
}

/**
 * Unsubscribe user from emails
 */
async function unsubscribeUser(email) {
  try {
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: email.toLowerCase() },
      UpdateExpression: 'SET #settings.#notifications = :false, emailUnsubscribed = :true, emailUnsubscribedAt = :timestamp',
      ExpressionAttributeNames: {
        '#settings': 'settings',
        '#notifications': 'notifications'
      },
      ExpressionAttributeValues: {
        ':false': false,
        ':true': true,
        ':timestamp': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error(`Failed to unsubscribe ${email}:`, error);
  }
}

/**
 * Check if an email is suppressed before sending
 * This function can be called by other services before sending emails
 */
exports.isEmailSuppressed = async (email) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: SUPPRESSION_TABLE,
      Key: { email: email.toLowerCase() }
    }));
    
    return !!result.Item;
  } catch (error) {
    console.error(`Failed to check suppression status for ${email}:`, error);
    return false; // Default to not suppressed on error
  }
};