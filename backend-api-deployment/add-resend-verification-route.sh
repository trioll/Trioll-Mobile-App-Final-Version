#!/bin/bash

# Script to add resend-verification route to API Gateway

set -e  # Exit on error

# Configuration
API_ID="4ib0hvu1xj"
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Adding Resend Verification Route${NC}"
echo -e "${YELLOW}========================================${NC}"

# Get resource IDs
echo -e "\n${YELLOW}Step 1: Getting existing resource IDs...${NC}"
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text --region $REGION)
USERS_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/users'].id" --output text --region $REGION)

echo "Root ID: $ROOT_ID"
echo "Users ID: $USERS_ID"

# Lambda ARN
USERS_ARN="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:trioll-prod-users-api/invocations"

# Function to create a resource if it doesn't exist
create_resource_if_not_exists() {
    local PARENT_ID=$1
    local PATH_PART=$2
    local FULL_PATH=$3
    
    # Check if resource already exists
    EXISTING_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='${FULL_PATH}'].id" --output text --region $REGION 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_ID" ]; then
        echo -e "${GREEN}✓ Resource ${FULL_PATH} already exists${NC}"
        echo "$EXISTING_ID"
    else
        echo "Creating resource ${FULL_PATH}..."
        NEW_ID=$(aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id $PARENT_ID \
            --path-part "$PATH_PART" \
            --query 'id' \
            --output text \
            --region $REGION)
        echo -e "${GREEN}✓ Created resource ${FULL_PATH}${NC}"
        echo "$NEW_ID"
    fi
}

# Function to add method with integration
add_method_with_integration() {
    local RESOURCE_ID=$1
    local HTTP_METHOD=$2
    local LAMBDA_ARN=$3
    local RESOURCE_PATH=$4
    
    echo "Adding ${HTTP_METHOD} method to ${RESOURCE_PATH}..."
    
    # Check if method already exists
    aws apigateway get-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method $HTTP_METHOD \
        --region $REGION >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Method ${HTTP_METHOD} already exists on ${RESOURCE_PATH}${NC}"
    else
        # Add method
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $HTTP_METHOD \
            --authorization-type NONE \
            --region $REGION >/dev/null
        
        # Add integration
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $HTTP_METHOD \
            --type AWS_PROXY \
            --integration-http-method POST \
            --uri $LAMBDA_ARN \
            --region $REGION >/dev/null
        
        echo -e "${GREEN}✓ Added ${HTTP_METHOD} method to ${RESOURCE_PATH}${NC}"
    fi
}

# Function to add CORS
add_cors() {
    local RESOURCE_ID=$1
    local RESOURCE_PATH=$2
    
    echo "Adding CORS to ${RESOURCE_PATH}..."
    
    # Check if OPTIONS already exists
    aws apigateway get-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --region $REGION >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ CORS already configured on ${RESOURCE_PATH}${NC}"
    else
        # Add OPTIONS method
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --authorization-type NONE \
            --region $REGION >/dev/null
        
        # Add mock integration for CORS
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --type MOCK \
            --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
            --region $REGION >/dev/null
        
        # Add method response
        aws apigateway put-method-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true,"method.response.header.Access-Control-Allow-Origin":true}' \
            --region $REGION >/dev/null
        
        # Add integration response
        aws apigateway put-integration-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id'"'","method.response.header.Access-Control-Allow-Methods":"'"'GET,POST,OPTIONS'"'","method.response.header.Access-Control-Allow-Origin":"'"'*'"'"}' \
            --region $REGION >/dev/null
        
        echo -e "${GREEN}✓ Added CORS to ${RESOURCE_PATH}${NC}"
    fi
}

echo -e "\n${YELLOW}Step 2: Adding Resend Verification Route...${NC}"

# Create resend-verification resource
RESEND_ID=$(create_resource_if_not_exists $USERS_ID "resend-verification" "/users/resend-verification")
add_method_with_integration $RESEND_ID "POST" $USERS_ARN "/users/resend-verification"
add_cors $RESEND_ID "/users/resend-verification"

echo -e "\n${YELLOW}Step 3: Updating Lambda function...${NC}"

# Update Lambda function
cd lambda-functions
cp users-api-with-registration.js index.js
zip -q function.zip index.js
aws lambda update-function-code \
    --function-name trioll-prod-users-api \
    --zip-file fileb://function.zip \
    --region $REGION >/dev/null
echo -e "${GREEN}✓ Lambda function updated${NC}"

# Clean up
rm index.js function.zip
cd ..

echo -e "\n${YELLOW}Step 4: Deploying API Changes...${NC}"

# Deploy the API
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Added resend verification endpoint" \
    --region $REGION \
    --query 'id' \
    --output text)

echo -e "${GREEN}✓ API deployed successfully! Deployment ID: ${DEPLOYMENT_ID}${NC}"

echo -e "\n${YELLOW}Step 5: Testing Resend Verification Endpoint...${NC}"

# Test resend endpoint
echo "Testing resend-verification endpoint..."
RESEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/resend-verification" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}')

if [ "$RESEND_TEST" = "200" ] || [ "$RESEND_TEST" = "400" ] || [ "$RESEND_TEST" = "404" ]; then
    echo -e "${GREEN}✓ Resend verification endpoint working (returned ${RESEND_TEST})${NC}"
else
    echo -e "${RED}✗ Resend verification endpoint returned ${RESEND_TEST}${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Resend Verification Route Added!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "New endpoint available:"
echo "  • POST /users/resend-verification"
echo ""
echo "Test command:"
echo "printf '{\"email\":\"user@example.com\"}' | curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/resend-verification -H 'Content-Type: application/json' -d @-"