const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = 'trioll-prod-users';

async function deleteUsers() {
  const emailsToDelete = [
    'freddiecaplin@hotmail.com',
    'freddiecaplin@gmail.com'
  ];

  console.log('🔍 Searching for users to delete...');
  
  try {
    // Scan the table to find users with these emails
    const scanResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'email IN (:email1, :email2)',
      ExpressionAttributeValues: {
        ':email1': emailsToDelete[0],
        ':email2': emailsToDelete[1]
      }
    }));

    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log('❌ No users found with those email addresses');
      return;
    }

    console.log(`📊 Found ${scanResult.Items.length} users to delete:`);
    
    // Delete each user
    for (const user of scanResult.Items) {
      console.log(`\n🗑️  Deleting user: ${user.email}`);
      console.log(`   - userId: ${user.userId}`);
      console.log(`   - username: ${user.username}`);
      
      try {
        await docClient.send(new DeleteCommand({
          TableName: USERS_TABLE,
          Key: {
            userId: user.userId
          }
        }));
        
        console.log(`   ✅ Successfully deleted from DynamoDB`);
      } catch (deleteError) {
        console.error(`   ❌ Failed to delete: ${deleteError.message}`);
      }
    }

    console.log('\n✨ Cleanup complete!');
    console.log('\n⚠️  Note: These users may still exist in Cognito. To fully remove them:');
    console.log('1. Go to AWS Console > Cognito > User Pools > trioll-prod-user-pool');
    console.log('2. Search for these emails and delete the users manually');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteUsers();