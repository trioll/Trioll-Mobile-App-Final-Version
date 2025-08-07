# Trioll Backend Infrastructure Review & Fix Plan

## Current State Analysis (August 4, 2025)

### 🔍 Infrastructure Overview

#### API Gateway
- **API ID**: `4ib0hvu1xj` (trioll-prod-api)
- **Region**: us-east-1
- **Status**: Active and serving production traffic

#### Lambda Functions Deployed
1. **trioll-prod-games-api** - Main games endpoints (UPDATED with enhanced version)
2. **trioll-prod-interactions-api** - Likes, plays, ratings (UPDATED with enhanced version)
3. **trioll-prod-users-api** - User management
4. **trioll-prod-analytics-api** - Analytics tracking
5. **trioll-prod-search-games** - Search functionality
6. **trioll-prod-analytics-processor** - Background analytics processing
7. **trioll-prod-get-games** - Legacy games getter
8. **trioll-prod-like-counter** - Legacy like counter
9. **trioll-prod-play-counter** - Legacy play counter
10. **trioll-prod-star-rating** - Legacy rating handler

### ✅ Working Endpoints
- `GET /games` - List all games
- `GET /games/{gameId}` - Get specific game
- `POST /games/{gameId}/likes` - Like a game
- `DELETE /games/{gameId}/likes` - Unlike a game
- `POST /games/{gameId}/plays` - Record play
- `POST /games/{gameId}/ratings` - Rate a game
- `GET /games/search` - Search games
- `GET /users/profile` - Get user profile
- `PUT /users/{userId}` - Update user profile
- `POST /analytics/events` - Track analytics

### ❌ Missing Routes (Need to Add)
1. **Comments**
   - `GET /games/{gameId}/comments`
   - `POST /games/{gameId}/comments`
   - `DELETE /games/{gameId}/comments/{commentId}`

2. **Game Progress**
   - `GET /games/{gameId}/progress`
   - `POST /games/{gameId}/progress`

3. **User Features**
   - `GET /users/streaks`
   - `POST /users/streaks`
   - `GET /users/achievements`
   - `POST /users/achievements/{achievementId}`

4. **Enhanced Games**
   - `GET /games/trending`
   - `GET /games/recommended`
   - `GET /games/search/advanced`

5. **Leaderboards**
   - `GET /games/{gameId}/leaderboard`

### 🗄️ DynamoDB Tables (All Created)
- ✅ trioll-prod-comments
- ✅ trioll-prod-game-progress
- ✅ trioll-prod-user-streaks
- ✅ trioll-prod-achievements
- ✅ trioll-prod-leaderboards
- ✅ trioll-prod-games
- ✅ trioll-prod-likes
- ✅ trioll-prod-ratings
- ✅ trioll-prod-playcounts
- ✅ trioll-prod-users

## 🛡️ Safe Expansion Strategy

### Phase 1: Create Integration Mappings (No Downtime)
Since the Lambda functions are already updated with the enhanced code, we just need to create the API Gateway routes that point to them.

### Phase 2: Add Routes Without Breaking Existing Ones
We'll use AWS CLI to add routes one by one, testing each as we go.

### Phase 3: Deploy Changes
Deploy the API Gateway changes to make new routes available.

## 🔧 Implementation Script

```bash
#!/bin/bash
# safe-add-api-routes.sh

API_ID="4ib0hvu1xj"
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get resource IDs
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text --region $REGION)
GAMES_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games'].id" --output text --region $REGION)
GAME_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games/{gameId}'].id" --output text --region $REGION)
USERS_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/users'].id" --output text --region $REGION)

# Get integration ARNs
INTERACTIONS_ARN="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:trioll-prod-interactions-api/invocations"
GAMES_ARN="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:trioll-prod-games-api/invocations"

echo "Adding missing routes..."

# 1. Comments routes
echo "Creating /games/{gameId}/comments..."
COMMENTS_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $GAME_ID \
  --path-part "comments" \
  --query 'id' \
  --output text \
  --region $REGION 2>/dev/null || \
  aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games/{gameId}/comments'].id" --output text --region $REGION)

# Add GET method for comments
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $COMMENTS_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $COMMENTS_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $INTERACTIONS_ARN \
  --region $REGION

# Add POST method for comments
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $COMMENTS_ID \
  --http-method POST \
  --authorization-type NONE \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $COMMENTS_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $INTERACTIONS_ARN \
  --region $REGION

# Add CORS
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $COMMENTS_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region $REGION

# 2. Progress routes
echo "Creating /games/{gameId}/progress..."
PROGRESS_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $GAME_ID \
  --path-part "progress" \
  --query 'id' \
  --output text \
  --region $REGION 2>/dev/null || \
  aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/games/{gameId}/progress'].id" --output text --region $REGION)

# Similar pattern for other routes...

# Deploy changes
echo "Deploying API changes..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Added comments, progress, and enhanced features" \
  --region $REGION

echo "Done! New routes are now available."
```

## 🚨 Critical Considerations

### 1. **Lambda Permissions**
The Lambda functions need permission to be invoked by API Gateway. We need to add resource policies.

### 2. **CORS Configuration**
All new routes need proper CORS headers for the mobile app to work.

### 3. **Request/Response Mapping**
Using AWS_PROXY integration type to pass through all headers and body.

### 4. **No Breaking Changes**
- Existing routes remain untouched
- New routes are additive only
- Lambda functions already handle both old and new routes

### 5. **Testing Strategy**
1. Add one route at a time
2. Test with curl before moving to next
3. Monitor CloudWatch logs
4. Roll back if any issues

## 📝 DynamoDB Reserved Keyword Fixes

The "level" keyword issue in DynamoDB can be fixed by using ExpressionAttributeNames:

```javascript
// Instead of:
UpdateExpression: 'SET level = :level'

// Use:
UpdateExpression: 'SET #lvl = :level'
ExpressionAttributeNames: { '#lvl': 'level' }
```

## 🎯 Next Steps

1. **Run the route creation script** to add missing API Gateway routes
2. **Grant Lambda permissions** for API Gateway to invoke
3. **Test each endpoint** with curl
4. **Update frontend** to remove any workarounds
5. **Monitor for errors** in CloudWatch

## 🔒 Rollback Plan

If issues arise:
1. API Gateway deployments can be rolled back to previous version
2. Lambda functions have versioned backups
3. DynamoDB tables are already created (no rollback needed)
4. No data migration required

This approach ensures zero downtime and safe expansion of the backend infrastructure.