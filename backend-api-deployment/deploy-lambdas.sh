#!/bin/bash

# Deploy Lambda Functions Script
# This script deploys the updated Lambda functions to AWS

set -e  # Exit on error

echo "🚀 Starting Lambda deployment..."

# Change to lambda functions directory
cd lambda-functions

# Function to deploy a Lambda
deploy_lambda() {
    local function_name=$1
    local js_file=$2
    
    echo "📦 Deploying ${function_name}..."
    
    # Create temp directory
    mkdir -p temp_deploy
    
    # Copy the JS file
    cp ${js_file} temp_deploy/index.js
    
    # Create a minimal package.json if needed
    echo '{
  "name": "'${function_name}'",
  "version": "1.0.0",
  "description": "Lambda function",
  "main": "index.js"
}' > temp_deploy/package.json
    
    # Create zip file
    cd temp_deploy
    zip -r ../deployment.zip .
    cd ..
    
    # Deploy to AWS
    aws lambda update-function-code \
        --function-name ${function_name} \
        --zip-file fileb://deployment.zip \
        --region us-east-1 \
        --output json > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ ${function_name} deployed successfully"
    else
        echo "❌ Failed to deploy ${function_name}"
    fi
    
    # Cleanup
    rm -rf temp_deploy deployment.zip
}

# Deploy the updated functions
echo "🔄 Deploying interactions API with bookmark count support..."
deploy_lambda "trioll-prod-interactions-api" "interactions-dynamodb-final.js"

echo "🔄 Deploying games API with bookmark count in responses..."
deploy_lambda "trioll-prod-games-api" "games-api.js"

echo ""
echo "✨ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test bookmark functionality in the mobile app"
echo "2. Verify bookmark counts appear in DynamoDB"
echo "3. Check developer analytics dashboard"