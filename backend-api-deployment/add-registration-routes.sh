#!/bin/bash

# Script to add registration routes to API Gateway
# This adds /users/register and /users/verify endpoints

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
echo -e "${YELLOW}Adding Registration Routes to API Gateway${NC}"
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
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
            --region $REGION >/dev/null
        
        echo -e "${GREEN}✓ Added CORS to ${RESOURCE_PATH}${NC}"
    fi
}

echo -e "\n${YELLOW}Step 2: Adding Registration Routes...${NC}"

# Create register resource
REGISTER_ID=$(create_resource_if_not_exists $USERS_ID "register" "/users/register")
add_method_with_integration $REGISTER_ID "POST" $USERS_ARN "/users/register"
add_cors $REGISTER_ID "/users/register"

# Create verify resource
VERIFY_ID=$(create_resource_if_not_exists $USERS_ID "verify" "/users/verify")
add_method_with_integration $VERIFY_ID "POST" $USERS_ARN "/users/verify"
add_cors $VERIFY_ID "/users/verify"

echo -e "\n${YELLOW}Step 3: Adding Lambda Permission...${NC}"

# Add permission for API Gateway to invoke Lambda
SOURCE_ARN="arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*/*"

echo "Adding Lambda permission for trioll-prod-users-api..."

# Remove existing permission if it exists
aws lambda remove-permission \
    --function-name trioll-prod-users-api \
    --statement-id api-gateway-registration \
    --region $REGION >/dev/null 2>&1 || true

# Add permission
aws lambda add-permission \
    --function-name trioll-prod-users-api \
    --statement-id api-gateway-registration \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "${SOURCE_ARN}" \
    --region $REGION >/dev/null

echo -e "${GREEN}✓ Added Lambda permission for trioll-prod-users-api${NC}"

echo -e "\n${YELLOW}Step 4: Deploying API Changes...${NC}"

# Deploy the API
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Added user registration endpoints" \
    --region $REGION \
    --query 'id' \
    --output text)

echo -e "${GREEN}✓ API deployed successfully! Deployment ID: ${DEPLOYMENT_ID}${NC}"

echo -e "\n${YELLOW}Step 5: Testing Registration Endpoint...${NC}"

# Test register endpoint
echo "Testing register endpoint..."
REGISTER_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","displayName":"Test User"}')

if [ "$REGISTER_TEST" = "200" ] || [ "$REGISTER_TEST" = "400" ] || [ "$REGISTER_TEST" = "409" ]; then
    echo -e "${GREEN}✓ Register endpoint working (returned ${REGISTER_TEST})${NC}"
else
    echo -e "${RED}✗ Register endpoint returned ${REGISTER_TEST}${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Registration Routes Added Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "New endpoints available:"
echo "  • POST /users/register"
echo "  • POST /users/verify"
echo ""
echo "API Base URL: https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod"