#!/bin/bash

# Add POST method to resend-verification endpoint

API_ID="4ib0hvu1xj"
RESOURCE_ID="ffcqvk"
LAMBDA_ARN="arn:aws:lambda:us-east-1:561645284740:function:trioll-prod-users-api"
REGION="us-east-1"

echo "🔧 Adding POST method to /users/resend-verification..."

# Add POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --region $REGION

echo "🔗 Setting up Lambda integration..."

# Setup Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION

echo "📡 Setting up method response..."

# Setup method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --region $REGION

echo "🚀 Deploying API..."

# Deploy to prod stage
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION

echo "✅ Done! Testing the endpoint..."

sleep 3

# Test the endpoint
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"freddiecaplin+test777@gmail.com"}' \
  --silent | jq '.'