#!/bin/bash

# Add purchase intent and bookmarks routes to API Gateway

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
echo -e "${YELLOW}Adding Purchase Intent and Bookmarks Routes${NC}"
echo -e "${YELLOW}========================================${NC}"

# Get the games/{gameId} resource ID
GAME_ID_RESOURCE=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games/{gameId}'].id" --output text --region $REGION)
echo "Games/{gameId} resource ID: $GAME_ID_RESOURCE"

# Lambda ARN
INTERACTIONS_ARN="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:trioll-prod-interactions-api/invocations"

# Function to create resource and methods
create_resource_and_methods() {
    local PARENT_ID=$1
    local PATH_PART=$2
    local METHODS=$3
    
    echo -e "\n${YELLOW}Creating resource: ${PATH_PART}${NC}"
    
    # Create the resource
    RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $PARENT_ID \
        --path-part $PATH_PART \
        --region $REGION \
        --query 'id' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$RESOURCE_ID" ]; then
        # Resource might already exist, try to get it
        RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='${PATH_PART}' && parentId=='${PARENT_ID}'].id" --output text --region $REGION)
    fi
    
    echo "Resource ID: $RESOURCE_ID"
    
    # Create methods
    for METHOD in $METHODS; do
        echo "Creating ${METHOD} method..."
        
        # Create method
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $METHOD \
            --authorization-type NONE \
            --region $REGION || echo "Method might already exist"
        
        # Create integration
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $METHOD \
            --type AWS_PROXY \
            --integration-http-method POST \
            --uri $INTERACTIONS_ARN \
            --region $REGION || echo "Integration might already exist"
        
        # Create method response
        aws apigateway put-method-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $METHOD \
            --status-code 200 \
            --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true}' \
            --region $REGION || echo "Method response might already exist"
        
        # Create integration response
        aws apigateway put-integration-response \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $METHOD \
            --status-code 200 \
            --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
            --region $REGION || echo "Integration response might already exist"
    done
    
    # Add OPTIONS for CORS
    echo "Creating OPTIONS method for CORS..."
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region $REGION || echo "OPTIONS method might already exist"
    
    # Mock integration for OPTIONS
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --type MOCK \
        --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
        --region $REGION || echo "OPTIONS integration might already exist"
    
    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region $REGION || echo "OPTIONS integration response might already exist"
}

# Create purchase-intent resource
create_resource_and_methods $GAME_ID_RESOURCE "purchase-intent" "POST"

# Create bookmarks resource
create_resource_and_methods $GAME_ID_RESOURCE "bookmarks" "POST DELETE"

# Add Lambda permission for API Gateway to invoke the function
echo -e "\n${YELLOW}Adding Lambda permissions...${NC}"
aws lambda add-permission \
    --function-name trioll-prod-interactions-api \
    --statement-id apigateway-purchase-intent-$(date +%s) \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
    --region $REGION 2>/dev/null || echo "Permission might already exist"

# Deploy the API
echo -e "\n${YELLOW}Deploying API...${NC}"
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region $REGION

echo -e "\n${GREEN}✅ Routes added successfully!${NC}"
echo -e "${GREEN}New endpoints:${NC}"
echo -e "${GREEN}- POST /games/{gameId}/purchase-intent${NC}"
echo -e "${GREEN}- POST /games/{gameId}/bookmarks${NC}"
echo -e "${GREEN}- DELETE /games/{gameId}/bookmarks${NC}"