# Trioll Developer Portal Integration Guide

## Overview
The Trioll Developer Portal (https://triolldev.com) is the primary interface for game developers to upload and manage their games on the Trioll platform. This document outlines the complete integration between the developer portal and the mobile app.

## System Architecture

### Developer Portal (triolldev.com)
- **Purpose**: Game developer interface for uploading and managing games
- **Technology**: Web-based (HTML/JavaScript/CSS)
- **Authentication**: AWS Cognito with developer-specific attributes
- **API**: Shared with mobile app (`https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod`)

### Mobile App (Trioll Consumer App)
- **Purpose**: End-user app for discovering and playing games
- **Technology**: React Native with Expo
- **Game Loading**: WebView-based HTML5 game player
- **CDN Support**: Accepts games from both developer and legacy CDNs

## Complete Developer-to-User Workflow

### 1. Developer Registration
- Developer signs up at triolldev.com
- Receives unique developer ID (e.g., `dev_c84a7e`)
- Developer ID stored in Cognito custom attributes
- Can create games and view analytics

### 2. Game Upload Process
```
Developer Portal → S3 Upload → CloudFront CDN → Mobile App
```

**Detailed Steps**:
1. Developer logs into triolldev.com
2. Fills game metadata form:
   - Game name, description, category
   - Uploads thumbnail image
   - Uploads HTML5 game files (index.html + assets)
3. Files uploaded to S3: `trioll-prod-games-us-east-1/{gameId}/`
4. Game metadata saved to DynamoDB: `trioll-prod-games` table
5. Game immediately available via CloudFront: `dgq2nqysbn2z3.cloudfront.net`

### 3. Game Discovery in Mobile App
1. Mobile app calls `GET /games` endpoint
2. API returns all active games including developer-uploaded ones
3. Games filtered to allow both CDN domains:
   - `dgq2nqysbn2z3.cloudfront.net` (developer uploads)
   - `dk72g9i0333mv.cloudfront.net` (legacy/system games)
4. Games displayed in swipeable feed

### 4. Game Playing Experience
1. User taps play button on game card
2. TrialPlayerScreen loads with game URL
3. WebView loads game from CloudFront
4. User interactions tracked (plays, likes, ratings, bookmarks)
5. Analytics data available to developer

## Technical Implementation

### API Endpoints Used
- `POST /games` - Developer uploads new game
- `GET /games` - Mobile app fetches all games
- `PUT /games/{gameId}` - Developer updates game
- `GET /games/{gameId}` - Get specific game details
- `DELETE /games/{gameId}` - Developer removes game

### Database Schema (DynamoDB)
```javascript
{
  gameId: "unique-game-id",
  title: "Game Name",
  developerId: "dev_c84a7e",
  developerName: "Developer Name",
  category: "action",
  description: "Game description",
  thumbnailUrl: "https://dgq2nqysbn2z3.cloudfront.net/gameId/thumbnail.png",
  trialUrl: "https://dgq2nqysbn2z3.cloudfront.net/gameId/index.html",
  status: "active",
  createdAt: "2025-01-09T00:00:00Z",
  // Analytics fields (updated by interactions API)
  likeCount: 0,
  playCount: 0,
  ratingCount: 0,
  commentCount: 0,
  bookmarkCount: 0
}
```

### CloudFront Configuration
**Developer Portal CDN**: `dgq2nqysbn2z3.cloudfront.net`
- Origin: `trioll-prod-games-us-east-1.s3.amazonaws.com`
- Used for all developer-uploaded games
- Configured by developer portal

**Legacy/Mobile CDN**: `dk72g9i0333mv.cloudfront.net`
- Origin: Same S3 bucket
- Used for pre-existing games
- Fallback for games without explicit URLs

### Security & Permissions
1. **Developer Portal**:
   - Authenticated developers only
   - Can only modify their own games
   - Read access to their game analytics

2. **Mobile App**:
   - Public read access to active games
   - Guest users can play games
   - Authenticated users can comment

3. **S3 Bucket**:
   - Developer portal has write access via IAM roles
   - CloudFront has read access
   - Direct S3 access blocked (CloudFront only)

## Analytics Integration

Developers can view real-time analytics for their games:
- **Play Count**: Times game was launched
- **Like Count**: User likes
- **Rating**: Average star rating
- **Comments**: User feedback (authenticated users only)
- **Bookmarks**: Times saved by users

Analytics data flows:
1. User interaction in mobile app
2. Interaction API updates DynamoDB
3. Developer portal queries aggregated stats
4. Displays in analytics dashboard

## Common Issues & Solutions

### Game Not Appearing in Mobile App
- Verify game status is "active" in database
- Check game URL uses allowed CloudFront domain
- Ensure game files uploaded successfully to S3
- Pull to refresh in mobile app

### Game Won't Load When Play Pressed
- Check WebView console for JavaScript errors
- Verify index.html exists at the game URL
- Ensure CORS headers configured properly
- Check CloudFront distribution is working

### Analytics Not Updating
- Verify interactions API is deployed
- Check DynamoDB permissions
- Ensure game ID matches between systems

## Best Practices

### For Developers
1. Always test games locally before uploading
2. Use responsive design for mobile screens
3. Keep game size under 50MB for fast loading
4. Include clear game instructions
5. Use appropriate category tags

### For Platform Maintenance
1. Monitor CloudFront costs and usage
2. Regular backups of game metadata
3. Clear documentation for API changes
4. Maintain backward compatibility

## Future Enhancements
1. Direct SDK integration for native games
2. A/B testing framework for developers
3. Multiplayer game support
4. In-app purchase integration
5. Advanced analytics with user segments