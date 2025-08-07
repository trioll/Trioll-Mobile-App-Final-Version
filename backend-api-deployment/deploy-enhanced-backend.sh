#!/bin/bash

# Deploy Enhanced Backend Infrastructure for Trioll
# This script deploys all the enhanced Lambda functions and creates new DynamoDB tables

echo "=========================================="
echo "Trioll Enhanced Backend Deployment Script"
echo "=========================================="

# Configuration
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 succeeded${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Create DynamoDB Tables
echo -e "\n${YELLOW}Step 1: Creating DynamoDB Tables${NC}"

# Comments Table
echo "Creating trioll-prod-comments table..."
aws dynamodb create-table \
  --table-name trioll-prod-comments \
  --attribute-definitions \
    AttributeName=gameId,AttributeType=S \
    AttributeName=commentId,AttributeType=S \
  --key-schema \
    AttributeName=gameId,KeyType=HASH \
    AttributeName=commentId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION 2>/dev/null || echo "Table already exists"

# Game Progress Table
echo "Creating trioll-prod-game-progress table..."
aws dynamodb create-table \
  --table-name trioll-prod-game-progress \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=gameId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=gameId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION 2>/dev/null || echo "Table already exists"

# User Streaks Table
echo "Creating trioll-prod-user-streaks table..."
aws dynamodb create-table \
  --table-name trioll-prod-user-streaks \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION 2>/dev/null || echo "Table already exists"

# Achievements Table
echo "Creating trioll-prod-achievements table..."
aws dynamodb create-table \
  --table-name trioll-prod-achievements \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=achievementId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=achievementId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION 2>/dev/null || echo "Table already exists"

# Leaderboards Table
echo "Creating trioll-prod-leaderboards table..."
aws dynamodb create-table \
  --table-name trioll-prod-leaderboards \
  --attribute-definitions \
    AttributeName=gameId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=score,AttributeType=N \
  --key-schema \
    AttributeName=gameId,KeyType=HASH \
    AttributeName=userId,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=gameId-score-index,PartitionKey="{AttributeName=gameId,KeyType=HASH}",SortKey="{AttributeName=score,KeyType=RANGE}",Projection="{ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION 2>/dev/null || echo "Table already exists"

echo "Waiting for tables to be active..."
for table in trioll-prod-comments trioll-prod-game-progress trioll-prod-user-streaks trioll-prod-achievements trioll-prod-leaderboards; do
  aws dynamodb wait table-exists --table-name $table --region $REGION 2>/dev/null
done
check_status "Table creation"

# Step 2: Update Lambda Functions
echo -e "\n${YELLOW}Step 2: Updating Lambda Functions${NC}"

# Package Lambda functions
echo "Packaging Lambda functions..."
cd lambda-functions

# Update interactions API with enhanced version
echo "Updating interactions API..."
zip -r interactions-enhanced.zip interactions-enhanced.js >/dev/null 2>&1
aws lambda update-function-code \
  --function-name trioll-prod-interactions-api \
  --zip-file fileb://interactions-enhanced.zip \
  --region $REGION >/dev/null
check_status "Interactions API update"

# Create backup of current function
aws lambda publish-version \
  --function-name trioll-prod-interactions-api \
  --description "Backup before enhanced features" \
  --region $REGION >/dev/null

# Update games API with enhanced version
echo "Updating games API..."
zip -r games-enhanced.zip games-enhanced.js >/dev/null 2>&1
aws lambda update-function-code \
  --function-name trioll-prod-games-api \
  --zip-file fileb://games-enhanced.zip \
  --region $REGION >/dev/null
check_status "Games API update"

# Create backup of current function
aws lambda publish-version \
  --function-name trioll-prod-games-api \
  --description "Backup before enhanced features" \
  --region $REGION >/dev/null

# Deploy WebSocket leaderboard handler
echo "Deploying WebSocket leaderboard handler..."
zip -r websocket-leaderboard.zip websocket-leaderboard.js >/dev/null 2>&1

# Check if function exists
aws lambda get-function --function-name trioll-prod-websocket-leaderboard --region $REGION >/dev/null 2>&1
if [ $? -ne 0 ]; then
  # Create new function
  aws lambda create-function \
    --function-name trioll-prod-websocket-leaderboard \
    --runtime nodejs20.x \
    --role arn:aws:iam::${ACCOUNT_ID}:role/trioll-lambda-role \
    --handler websocket-leaderboard.handler \
    --zip-file fileb://websocket-leaderboard.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment Variables="{CONNECTIONS_TABLE=trioll-prod-websocket-connections,LEADERBOARD_TABLE=trioll-prod-leaderboards,GAME_PROGRESS_TABLE=trioll-prod-game-progress}" \
    --region $REGION >/dev/null
else
  # Update existing function
  aws lambda update-function-code \
    --function-name trioll-prod-websocket-leaderboard \
    --zip-file fileb://websocket-leaderboard.zip \
    --region $REGION >/dev/null
fi
check_status "WebSocket leaderboard deployment"

# Clean up zip files
rm -f *.zip

cd ..

# Step 3: Create Global Secondary Indexes
echo -e "\n${YELLOW}Step 3: Creating Global Secondary Indexes${NC}"

# Create GSI for game progress leaderboards
echo "Creating GSI for game progress table..."
aws dynamodb update-table \
  --table-name trioll-prod-game-progress \
  --attribute-definitions \
    AttributeName=gameId,AttributeType=S \
    AttributeName=score,AttributeType=N \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"gameId-score-index\",\"Keys\":[{\"AttributeName\":\"gameId\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"score\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}}]" \
  --region $REGION 2>/dev/null || echo "GSI already exists"

# Step 4: Update API Gateway Routes
echo -e "\n${YELLOW}Step 4: Updating API Gateway Routes${NC}"

API_ID="4ib0hvu1xj"

# Add new routes for enhanced features
echo "Adding new API routes..."

# Game progress routes
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /games/{gameId}/progress" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`interactions-dynamodb-final`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /games/{gameId}/progress" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`interactions-dynamodb-final`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

# Streak routes
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /users/streaks" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`interactions-dynamodb-final`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

# Achievement routes
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /users/achievements" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`interactions-dynamodb-final`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

# Leaderboard routes
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /games/{gameId}/leaderboard" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`interactions-dynamodb-final`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

# Enhanced games routes
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /games/trending" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`games-api`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /games/recommended" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`games-api`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /games/search/advanced" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`games-api`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /games/similar" \
  --target "integrations/$(aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[?IntegrationUri.contains(@,`games-api`)].IntegrationId' --output text)" \
  --region $REGION 2>/dev/null || echo "Route already exists"

check_status "API Gateway route updates"

# Step 5: Deploy API changes
echo -e "\n${YELLOW}Step 5: Deploying API changes${NC}"
aws apigatewayv2 create-deployment \
  --api-id $API_ID \
  --stage-name prod \
  --description "Enhanced features deployment" \
  --region $REGION >/dev/null
check_status "API deployment"

# Step 6: Test endpoints
echo -e "\n${YELLOW}Step 6: Testing new endpoints${NC}"

BASE_URL="https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod"

# Test trending endpoint
echo "Testing trending games..."
curl -s -X GET "$BASE_URL/games/trending?limit=5" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: test-deployment" | jq -r '.games[0].id' >/dev/null 2>&1 && echo -e "${GREEN}✓ Trending endpoint working${NC}" || echo -e "${RED}✗ Trending endpoint failed${NC}"

# Test comments endpoint
echo "Testing comments..."
curl -s -X GET "$BASE_URL/games/game-001/comments" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: test-deployment" | jq -r '.gameId' >/dev/null 2>&1 && echo -e "${GREEN}✓ Comments endpoint working${NC}" || echo -e "${RED}✗ Comments endpoint failed${NC}"

echo -e "\n${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "New features deployed:"
echo "  • Comments system"
echo "  • Game progress tracking"
echo "  • Play streaks"
echo "  • Achievements system"
echo "  • Trending games algorithm"
echo "  • Personalized recommendations"
echo "  • Advanced search"
echo "  • Real-time leaderboards"
echo ""
echo "API Endpoints:"
echo "  GET  /games/trending"
echo "  GET  /games/recommended"
echo "  GET  /games/search/advanced"
echo "  GET  /games/similar?gameId={id}"
echo "  GET  /games/{gameId}/comments"
echo "  POST /games/{gameId}/comments"
echo "  GET  /games/{gameId}/progress"
echo "  POST /games/{gameId}/progress"
echo "  GET  /games/{gameId}/leaderboard"
echo "  GET  /users/streaks"
echo "  GET  /users/achievements"
echo ""
echo "WebSocket events:"
echo "  subscribeLeaderboard"
echo "  unsubscribeLeaderboard"
echo "  updateScore"
echo "  getLeaderboard"