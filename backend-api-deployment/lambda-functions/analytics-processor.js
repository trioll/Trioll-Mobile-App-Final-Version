const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'trioll-prod-analytics';
const MAX_BATCH_SIZE = 25; // DynamoDB batch write limit

exports.handler = async (event) => {
    console.log('Analytics Processor started. Records to process:', event.Records?.length || 0);
    
    if (!event.Records || event.Records.length === 0) {
        return {
            batchItemFailures: []
        };
    }
    
    const failedMessageIds = [];
    const analyticsEvents = [];
    
    // Process each SQS message
    for (const record of event.Records) {
        try {
            const messageBody = JSON.parse(record.body);
            console.log('Processing event:', messageBody.eventType);
            
            // Validate required fields
            if (!messageBody.eventType || !messageBody.timestamp) {
                console.error('Invalid event - missing required fields:', messageBody);
                failedMessageIds.push(record.messageId);
                continue;
            }
            
            // Create analytics record with proper structure
            const analyticsRecord = {
                eventId: `${messageBody.eventType}_${messageBody.userId || 'anonymous'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                eventType: messageBody.eventType,
                userId: messageBody.userId || 'anonymous',
                gameId: messageBody.gameId || 'N/A',
                timestamp: messageBody.timestamp,
                date: new Date(messageBody.timestamp).toISOString().split('T')[0], // For daily aggregations
                metadata: messageBody.metadata || {},
                sessionId: messageBody.sessionId,
                ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 day TTL
            };
            
            // Add event-specific fields
            switch (messageBody.eventType) {
                case 'game_played':
                    analyticsRecord.duration = messageBody.metadata?.duration || 0;
                    analyticsRecord.metadata.sessionId = messageBody.sessionId;
                    break;
                case 'game_rated':
                    analyticsRecord.rating = messageBody.metadata?.rating || 0;
                    break;
                case 'game_searched':
                    analyticsRecord.searchQuery = messageBody.metadata?.query || '';
                    analyticsRecord.resultCount = messageBody.metadata?.resultCount || 0;
                    break;
                case 'featured_games_viewed':
                    analyticsRecord.gameCount = messageBody.metadata?.gameCount || 0;
                    break;
            }
            
            analyticsEvents.push(analyticsRecord);
            
        } catch (error) {
            console.error('Error processing record:', error, 'Record:', record);
            failedMessageIds.push(record.messageId);
        }
    }
    
    // Write events to DynamoDB in batches
    if (analyticsEvents.length > 0) {
        try {
            await writeEventsToDynamoDB(analyticsEvents);
            console.log(`Successfully wrote ${analyticsEvents.length} analytics events to DynamoDB`);
        } catch (error) {
            console.error('Error writing to DynamoDB:', error);
            // If DynamoDB write fails, mark all messages as failed for retry
            return {
                batchItemFailures: event.Records.map(record => ({
                    itemIdentifier: record.messageId
                }))
            };
        }
    }
    
    // Return failed message IDs for retry
    const response = {
        batchItemFailures: failedMessageIds.map(id => ({
            itemIdentifier: id
        }))
    };
    
    console.log(`Processed ${event.Records.length} messages. Failed: ${failedMessageIds.length}`);
    return response;
};

async function writeEventsToDynamoDB(events) {
    // Split events into batches of 25 (DynamoDB limit)
    for (let i = 0; i < events.length; i += MAX_BATCH_SIZE) {
        const batch = events.slice(i, i + MAX_BATCH_SIZE);
        
        const putRequests = batch.map(event => ({
            PutRequest: {
                Item: event
            }
        }));
        
        const params = {
            RequestItems: {
                [ANALYTICS_TABLE]: putRequests
            }
        };
        
        try {
            const result = await docClient.send(new BatchWriteCommand(params));
            
            // Handle unprocessed items
            if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
                console.warn('Some items were not processed:', result.UnprocessedItems);
                // In production, you might want to retry these
            }
        } catch (error) {
            console.error('Error in batch write:', error);
            throw error;
        }
    }
}