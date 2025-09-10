# Purchase Intent Tracking System

## Overview
The Purchase Intent Tracking system captures user responses to post-game purchase intent surveys, providing valuable analytics for game developers about commercial viability of their games.

## Implementation Date
January 9, 2025

## System Components

### 1. Frontend Components

#### Purchase Intent Modal (`PurchaseIntentModal.tsx`)
- Displays after game trial ends
- Three response options: Yes, No, Ask Me Later
- Animated with spring effects
- Haptic feedback on interactions

#### Purchase Intent Service (`purchaseIntentService.ts`)
- Manages survey display logic
- Tracks to both analytics and backend API
- Implements cooldown period (24 hours default)
- Prevents showing survey for games with <1 minute playtime

### 2. Backend Infrastructure

#### DynamoDB Table: `trioll-prod-purchase-intent`
- **Partition Key**: `gameId` (String)
- **Sort Key**: `userIdTimestamp` (String) 
- **Attributes**:
  - `userId`: User or guest identifier
  - `response`: "yes", "no", or "ask-later"
  - `sessionId`: Session identifier
  - `timestamp`: ISO timestamp
  - `date`: YYYY-MM-DD format
  - `ttl`: 1-year retention

#### API Endpoint
- **URL**: `POST /games/{gameId}/purchase-intent`
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Guest-Mode: true` (for guests)
  - `X-Identity-Id: {identityId}` (for guests)
- **Body**:
  ```json
  {
    "response": "yes|no|ask-later",
    "sessionId": "session-123456"
  }
  ```

#### Lambda Function Updates
- **Function**: `trioll-prod-interactions-api`
- **Handler**: `index.handler`
- **Environment Variables**:
  - `PURCHASE_INTENT_TABLE=trioll-prod-purchase-intent`

### 3. Analytics Integration

#### Aggregated Stats in Games Table
Each game record in `trioll-prod-games` tracks:
- `purchaseIntentYes`: Count of "yes" responses
- `purchaseIntentNo`: Count of "no" responses  
- `purchaseIntentAskLater`: Count of "ask later" responses

#### Games API Response
```json
{
  "id": "game-123",
  "title": "Evolution Runner",
  "purchaseIntent": {
    "yes": 45,
    "no": 12,
    "askLater": 23,
    "total": 80
  }
}
```

## Data Flow

1. User completes game trial
2. `TrialPlayerScreen` triggers purchase intent modal
3. User selects response (Yes/No/Ask Later)
4. `purchaseIntentService` sends data to:
   - Backend API via `triollAPI.trackPurchaseIntent()`
   - Analytics service for event tracking
5. Lambda function:
   - Stores individual response in purchase intent table
   - Updates aggregated counts in games table
6. Developer portal displays aggregated metrics

## Guest User Support
- Fully supports guest users via Cognito Identity Pool
- Guest responses tracked with `guest-{identityId}` format
- No authentication required

## Developer Analytics
Developers can view purchase intent metrics in the developer portal:
- Total responses per game
- Breakdown by response type
- Conversion insights (yes/total ratio)
- Trends over time

## Privacy & Retention
- Data retained for 1 year (TTL configured)
- No PII stored beyond user/guest identifier
- Aggregated stats persist indefinitely

## Testing
Test the endpoint:
```bash
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games/{gameId}/purchase-intent \
  -H "Content-Type: application/json" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: test-guest-123" \
  -d '{"response": "yes", "sessionId": "test-session"}'
```

## Troubleshooting

### Common Issues
1. **403 Forbidden**: Check API Gateway deployment
2. **500 Internal Error**: Verify Lambda environment variables
3. **No data recorded**: Check DynamoDB table permissions

### CloudWatch Logs
Monitor Lambda execution:
```bash
aws logs tail /aws/lambda/trioll-prod-interactions-api --follow
```

## Future Enhancements
- A/B testing different survey timings
- Demographic segmentation
- Price point testing
- Follow-up questions for detailed feedback