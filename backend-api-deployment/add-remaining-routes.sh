#!/bin/bash

# Add remaining API Gateway routes for enhanced features

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
echo -e "${YELLOW}Adding Remaining API Gateway Routes${NC}"
echo -e "${YELLOW}========================================${NC}"

# Get resource IDs
echo -e "\n${YELLOW}Getting resource IDs...${NC}"
GAMES_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games'].id" --output text --region $REGION)
USERS_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/users'].id" --output text --region $REGION)

echo "Games ID: $GAMES_ID"
echo "Users ID: $USERS_ID"

# Lambda ARNs
INTERACTIONS_ARN="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:trioll-prod-interactions-api/invocations"
GAMES_ARN="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:trioll-prod-games-api/invocations"

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
            --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
            --region $REGION >/dev/null
        
        echo -e "${GREEN}✓ Added CORS to ${RESOURCE_PATH}${NC}"
    fi
}

echo -e "\n${YELLOW}Adding Progress Routes...${NC}"

# Check if progress already exists under games/{gameId}
GAME_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games/{gameId}'].id" --output text --region $REGION)
PROGRESS_ID=$(create_resource_if_not_exists $GAME_ID "progress" "/games/{gameId}/progress")
add_method_with_integration $PROGRESS_ID "GET" $INTERACTIONS_ARN "/games/{gameId}/progress"
add_method_with_integration $PROGRESS_ID "POST" $INTERACTIONS_ARN "/games/{gameId}/progress"
add_cors $PROGRESS_ID "/games/{gameId}/progress"

echo -e "\n${YELLOW}Adding Leaderboard Route...${NC}"

LEADERBOARD_ID=$(create_resource_if_not_exists $GAME_ID "leaderboard" "/games/{gameId}/leaderboard")
add_method_with_integration $LEADERBOARD_ID "GET" $INTERACTIONS_ARN "/games/{gameId}/leaderboard"
add_cors $LEADERBOARD_ID "/games/{gameId}/leaderboard"

echo -e "\n${YELLOW}Adding User Routes...${NC}"

# Create streaks resource
STREAKS_ID=$(create_resource_if_not_exists $USERS_ID "streaks" "/users/streaks")
add_method_with_integration $STREAKS_ID "GET" $INTERACTIONS_ARN "/users/streaks"
add_method_with_integration $STREAKS_ID "POST" $INTERACTIONS_ARN "/users/streaks"
add_cors $STREAKS_ID "/users/streaks"

# Create achievements resource
ACHIEVEMENTS_ID=$(create_resource_if_not_exists $USERS_ID "achievements" "/users/achievements")
add_method_with_integration $ACHIEVEMENTS_ID "GET" $INTERACTIONS_ARN "/users/achievements"
add_cors $ACHIEVEMENTS_ID "/users/achievements"

echo -e "\n${YELLOW}Adding Enhanced Game Routes...${NC}"

# Create trending resource
TRENDING_ID=$(create_resource_if_not_exists $GAMES_ID "trending" "/games/trending")
add_method_with_integration $TRENDING_ID "GET" $GAMES_ARN "/games/trending"
add_cors $TRENDING_ID "/games/trending"

# Create recommended resource
RECOMMENDED_ID=$(create_resource_if_not_exists $GAMES_ID "recommended" "/games/recommended")
add_method_with_integration $RECOMMENDED_ID "GET" $GAMES_ARN "/games/recommended"
add_cors $RECOMMENDED_ID "/games/recommended"

# Create search/advanced resource
SEARCH_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games/search'].id" --output text --region $REGION)
if [ -z "$SEARCH_ID" ]; then
    SEARCH_ID=$(create_resource_if_not_exists $GAMES_ID "search" "/games/search")
fi
ADVANCED_ID=$(create_resource_if_not_exists $SEARCH_ID "advanced" "/games/search/advanced")
add_method_with_integration $ADVANCED_ID "GET" $GAMES_ARN "/games/search/advanced"
add_cors $ADVANCED_ID "/games/search/advanced"

echo -e "\n${YELLOW}Deploying API Changes...${NC}"

# Deploy the API
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Added progress, achievements, trending, and other enhanced features" \
    --region $REGION \
    --query 'id' \
    --output text)

echo -e "${GREEN}✓ API deployed successfully! Deployment ID: ${DEPLOYMENT_ID}${NC}"

echo -e "\n${YELLOW}Testing Endpoints...${NC}"

# Test progress endpoint
echo "Testing progress endpoint..."
PROGRESS_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X GET "https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games/Evolution-Runner/progress" -H "X-Guest-Mode: true" -H "X-Identity-Id: test-deployment")
if [ "$PROGRESS_TEST" = "200" ] || [ "$PROGRESS_TEST" = "404" ]; then
    echo -e "${GREEN}✓ Progress endpoint working${NC}"
else
    echo -e "${RED}✗ Progress endpoint returned ${PROGRESS_TEST}${NC}"
fi

# Test trending endpoint
echo "Testing trending endpoint..."
TRENDING_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X GET "https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games/trending?limit=5" -H "X-Guest-Mode: true" -H "X-Identity-Id: test-deployment")
if [ "$TRENDING_TEST" = "200" ]; then
    echo -e "${GREEN}✓ Trending endpoint working${NC}"
else
    echo -e "${RED}✗ Trending endpoint returned ${TRENDING_TEST}${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}API Gateway Routes Successfully Added!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "New endpoints available:"
echo "  • GET/POST /games/{gameId}/progress"
echo "  • GET /games/{gameId}/leaderboard"
echo "  • GET/POST /users/streaks"
echo "  • GET /users/achievements"
echo "  • GET /games/trending"
echo "  • GET /games/recommended"
echo "  • GET /games/search/advanced"
echo ""
echo "API Base URL: https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod"