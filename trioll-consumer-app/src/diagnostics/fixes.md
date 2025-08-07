# AWS Backend Connection Fixes

## 📊 Diagnostic Report Summary

Based on your current setup analysis:

### ✅ What's Working
- Frontend framework: **React Native with Expo**
- AWS services configured: **API Gateway, Cognito, DynamoDB, S3**
- Auth method: **AWS Cognito with Guest Mode support**
- API endpoint: **https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod**

### ❌ Current Issues Identified

1. **Error: "Failed to record play"**
   - The `/games/undefined/plays` endpoint is being called with undefined game ID
   - This indicates the game object is not properly passed to the play tracking function

2. **WebSocket errors**
   - `analyticsService.trackWebSocketEvent is not a function`
   - WebSocket tracking method is missing or not imported correctly

3. **Potential CORS issues**
   - Need to verify CORS headers are properly configured on API Gateway

## 🔧 Immediate Fixes

### Fix 1: Game ID Undefined Issue

```typescript
// In your GameCard or similar component where play is triggered
const handlePlayGame = async (game: Game) => {
  // Add validation
  if (!game || !game.id) {
    console.error('Invalid game object:', game);
    return;
  }
  
  try {
    // Make sure to pass the game ID correctly
    await TriollAPI.recordGamePlay(game.id); // NOT game.gameId
  } catch (error) {
    console.error('Failed to record play:', error);
  }
};
```

### Fix 2: WebSocket Analytics Error

```typescript
// In src/services/monitoring/analyticsEnhanced.ts
// Add the missing method
export const analyticsService = {
  // ... existing methods ...
  
  trackWebSocketEvent: (eventName: string, data?: any) => {
    // Simple implementation or stub
    console.log('WebSocket event:', eventName, data);
    // You can implement actual tracking here if needed
  }
};
```

### Fix 3: API Error Handling Enhancement

```typescript
// Update src/services/api/TriollAPI.ts to better handle errors
async recordGamePlay(gameId: string): Promise<PlaySessionResponse> {
  // Validate gameId before making request
  if (!gameId || gameId === 'undefined') {
    throw new Error('Invalid game ID provided for play tracking');
  }
  
  return this.makeRequest<PlaySessionResponse>(`/games/${gameId}/plays`, {
    method: 'POST',
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      // Add any other required fields
    }),
  });
}
```

## 🚀 Step-by-Step Testing Guide

### 1. Test Basic Connectivity
Run this in your app's debug console:
```javascript
// Test if you can reach the API
fetch('https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/health')
  .then(res => res.json())
  .then(data => console.log('Health check:', data))
  .catch(err => console.error('API unreachable:', err));
```

### 2. Test Authentication
```javascript
// Check if guest credentials are working
import { amplifyAuthService } from './src/services/auth/amplifyAuthService';

const testAuth = async () => {
  const state = amplifyAuthService.getCurrentState();
  console.log('Auth state:', state);
  
  if (state.isGuest) {
    const creds = await amplifyAuthService.getGuestCredentials();
    console.log('Guest credentials:', creds);
  }
};

testAuth();
```

### 3. Test API with Proper Headers
```javascript
// Test games endpoint with auth headers
const testGamesAPI = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Guest-Mode': 'true',
    'X-Identity-Id': 'your-identity-id-here' // Get from auth state
  };
  
  const response = await fetch('https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games?limit=5', {
    headers
  });
  
  const data = await response.json();
  console.log('Games response:', data);
};

testGamesAPI();
```

## 🛠️ AWS Backend Checklist

### API Gateway
- [ ] CORS is enabled with proper headers
- [ ] All routes are deployed to prod stage
- [ ] Binary media types configured if needed

### Lambda Functions
- [ ] All functions have proper IAM roles
- [ ] Environment variables are set
- [ ] Functions can access DynamoDB/S3

### Cognito
- [ ] Identity Pool allows unauthenticated access
- [ ] Guest role has necessary permissions
- [ ] CORS configured on user pool if using hosted UI

### DynamoDB
- [ ] Tables exist and are accessible
- [ ] IAM roles have read/write permissions
- [ ] Indexes are created as needed

## 📱 Running Diagnostics in Your App

1. Add this to your App.tsx or main component:
```typescript
import { runDiagnostics } from './src/diagnostics/awsDiagnostics';

// Add a button or useEffect to run diagnostics
useEffect(() => {
  if (__DEV__) {
    // Run diagnostics in development
    runDiagnostics().then(results => {
      console.log('Diagnostic Results:', results);
    });
  }
}, []);
```

2. Or add a debug menu option:
```typescript
const DebugMenu = () => {
  const handleRunDiagnostics = async () => {
    const results = await runDiagnostics();
    Alert.alert('Diagnostics Complete', JSON.stringify(results.recommendations));
  };
  
  return (
    <TouchableOpacity onPress={handleRunDiagnostics}>
      <Text>Run AWS Diagnostics</Text>
    </TouchableOpacity>
  );
};
```

## 🔍 Common Error Patterns & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `403 Forbidden` | Missing auth headers or CORS | Add X-Guest-Mode and X-Identity-Id headers |
| `404 Not Found` | Route not deployed | Check API Gateway routes and redeploy |
| `500 Internal Server Error` | Lambda error | Check CloudWatch logs |
| `undefined` in URL | Missing data validation | Add null checks before API calls |
| `Network request failed` | CORS or network issue | Enable CORS, check internet connection |

## 📞 Need More Help?

If issues persist after trying these fixes:

1. Check CloudWatch Logs:
   - API Gateway logs
   - Lambda function logs
   
2. Verify in AWS Console:
   - API Gateway stages are deployed
   - Lambda functions are not in error state
   - DynamoDB tables are active
   
3. Test with Postman/curl:
   ```bash
   curl -X GET https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games \
     -H "X-Guest-Mode: true" \
     -H "X-Identity-Id: test-identity"
   ```