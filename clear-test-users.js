#!/usr/bin/env node

/**
 * Script to clear test user accounts from DynamoDB
 * Run with: node clear-test-users.js
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1',
  // Use your AWS credentials
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'trioll-prod-users';

// Test emails to delete
const TEST_EMAILS = [
  'freddiecaplin@gmail.com',
  'test@example.com',
  'test1@example.com',
  'test2@example.com',
  'test3@example.com',
  // Add more test emails as needed
];

async function deleteTestUsers() {
  console.log('🗑️  Starting cleanup of test users...\n');

  for (const email of TEST_EMAILS) {
    try {
      // First, try to get the user to see if they exist
      const getParams = {
        TableName: TABLE_NAME,
        Key: {
          email: email
        }
      };

      const user = await dynamodb.get(getParams).promise();
      
      if (user.Item) {
        console.log(`Found user: ${email}`);
        
        // Delete the user
        const deleteParams = {
          TableName: TABLE_NAME,
          Key: {
            email: email
          }
        };

        await dynamodb.delete(deleteParams).promise();
        console.log(`✅ Deleted: ${email}`);
      } else {
        console.log(`❌ Not found: ${email}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${email}:`, error.message);
    }
  }

  console.log('\n✨ Cleanup complete!');
}

// Run the cleanup
deleteTestUsers().catch(console.error);