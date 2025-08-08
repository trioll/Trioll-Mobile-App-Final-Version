#!/bin/bash

# Deploy User Registration Lambda
echo "🚀 Deploying User Registration API..."

# Configuration
REGION="us-east-1"
FUNCTION_NAME="trioll-prod-users-api"
ZIP_FILE="users-api-deployment.zip"

# Navigate to backend directory
cd backend-api-deployment/lambda-functions

# Create deployment package
echo "📦 Creating deployment package..."
rm -f $ZIP_FILE
zip -r $ZIP_FILE users-api-with-registration.js node_modules/

# Update Lambda function code
echo "⬆️  Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://$ZIP_FILE \
    --region $REGION

# Wait for update to complete
echo "⏳ Waiting for deployment to complete..."
aws lambda wait function-updated \
    --function-name $FUNCTION_NAME \
    --region $REGION

# Update environment variables if needed
echo "🔧 Updating environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{
        USERS_TABLE=trioll-prod-users,
        USER_POOL_ID=us-east-1_cLPH2acQd,
        CLIENT_ID=bft50gui77sdq2n4lcio4onql,
        AWS_REGION=us-east-1
    }" \
    --region $REGION

# Test the function
echo "✅ Testing registration endpoint..."
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","username":"testuser"}' | jq '.'

echo "🎉 Deployment complete!"
echo ""
echo "Available endpoints:"
echo "  POST /users/register"
echo "  POST /users/verify"
echo "  POST /users/resend-verification"
echo "  GET  /users/profile"
echo "  PUT  /users/{userId}"