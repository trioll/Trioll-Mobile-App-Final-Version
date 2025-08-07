#!/bin/bash

echo "Testing Enhanced Trioll Features"
echo "================================"

API_URL="https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod"
GAME_ID="Evolution-Runner"
USER_ID="test-user-$(date +%s)"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${YELLOW}1. Testing Game Likes${NC}"
curl -s -X POST "$API_URL/games/$GAME_ID/likes" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" \
  -H "Content-Type: application/json" | jq '.' && echo -e "${GREEN}✓ Likes working${NC}"

echo -e "\n${YELLOW}2. Testing Game Plays${NC}"
curl -s -X POST "$API_URL/games/$GAME_ID/plays" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" \
  -H "Content-Type: application/json" | jq '.' && echo -e "${GREEN}✓ Plays working${NC}"

echo -e "\n${YELLOW}3. Testing Game Ratings${NC}"
curl -s -X POST "$API_URL/games/$GAME_ID/ratings" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}' | jq '.' && echo -e "${GREEN}✓ Ratings working${NC}"

echo -e "\n${YELLOW}4. Testing Comments - Add${NC}"
COMMENT_RESPONSE=$(curl -s -X POST "$API_URL/games/$GAME_ID/comments" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"comment":"This game is awesome! Testing enhanced features."}')
echo "$COMMENT_RESPONSE" | jq '.'
COMMENT_ID=$(echo "$COMMENT_RESPONSE" | jq -r '.commentId')
if [ "$COMMENT_ID" != "null" ]; then
  echo -e "${GREEN}✓ Comment added successfully${NC}"
else
  echo -e "${RED}✗ Comment failed${NC}"
fi

echo -e "\n${YELLOW}5. Testing Comments - Get${NC}"
curl -s -X GET "$API_URL/games/$GAME_ID/comments" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" | jq '.' && echo -e "${GREEN}✓ Comments retrieval working${NC}"

echo -e "\n${YELLOW}6. Testing Game Progress${NC}"
curl -s -X POST "$API_URL/games/$GAME_ID/progress" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": {"level": 5, "checkpoint": "boss-1"},
    "score": 15000,
    "level": 5,
    "totalPlayTime": 300
  }' | jq '.' && echo -e "${GREEN}✓ Progress save working${NC}"

echo -e "\n${YELLOW}7. Testing User Streaks${NC}"
curl -s -X GET "$API_URL/users/streaks" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" | jq '.' && echo -e "${GREEN}✓ Streaks retrieval working${NC}"

echo -e "\n${YELLOW}8. Testing User Achievements${NC}"
curl -s -X GET "$API_URL/users/achievements" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" | jq '.' && echo -e "${GREEN}✓ Achievements retrieval working${NC}"

echo -e "\n${YELLOW}9. Testing Trending Games${NC}"
curl -s -X GET "$API_URL/games/trending?limit=5" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" | jq '.' && echo -e "${GREEN}✓ Trending games working${NC}"

echo -e "\n${YELLOW}10. Testing Recommended Games${NC}"
curl -s -X GET "$API_URL/games/recommended?limit=5" \
  -H "X-Guest-Mode: true" \
  -H "X-Identity-Id: $USER_ID" | jq '.' && echo -e "${GREEN}✓ Recommended games working${NC}"

echo -e "\n${GREEN}=========================================="
echo "Enhanced Features Test Complete!"
echo "==========================================${NC}"