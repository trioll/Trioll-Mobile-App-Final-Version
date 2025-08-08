#!/bin/bash

# Simple deployment script for registration API
echo "🚀 Deploying Fixed User Registration API..."

# Configuration
REGION="us-east-1"
FUNCTION_NAME="trioll-prod-users-api"

# Navigate to the lambda functions directory
cd backend-api-deployment/lambda-functions

# Create a backup of the current function
echo "📦 Creating backup of current function..."
cp users-api.js users-api-backup-$(date +%Y%m%d-%H%M%S).js

# Replace with the fixed version
echo "📝 Updating Lambda function code..."
cp users-api-fixed.js users-api.js

# Create deployment package
echo "🗜️ Creating deployment package..."
# Lambda expects index.js, so rename our file
cp users-api.js index.js
zip -r deployment.zip index.js

# Update Lambda function
echo "⬆️  Uploading to AWS Lambda..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://deployment.zip \
    --region $REGION

# Clean up
rm deployment.zip index.js

echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing the endpoints..."
echo ""

# Test that the function is responding
echo "Testing /users/register endpoint..."
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/register \
    -H "Content-Type: application/json" \
    -d '{"test": "connection"}' \
    --max-time 5 \
    --silent | jq '.' || echo "❌ Connection test failed"

echo ""
echo "📝 Available endpoints:"
echo "  POST /users/register"
echo "  POST /users/verify"
echo "  POST /users/resend-verification"
echo "  POST /auth/login"
echo "  GET  /users/profile"
echo "  PUT  /users/{userId}"
echo ""
echo "🎉 You can now test registration in your app!"