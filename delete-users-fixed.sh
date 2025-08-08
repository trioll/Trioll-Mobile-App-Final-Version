#!/bin/bash

echo "🔍 Searching for users in DynamoDB..."

# Scan for users with these emails
SCAN_RESULT=$(aws dynamodb scan \
  --table-name trioll-prod-users \
  --filter-expression "email IN (:email1, :email2)" \
  --expression-attribute-values '{":email1": {"S": "freddiecaplin@hotmail.com"}, ":email2": {"S": "freddiecaplin@gmail.com"}}' \
  --output json)

# Check if any users found
COUNT=$(echo $SCAN_RESULT | jq '.Count')

if [ "$COUNT" -eq "0" ]; then
  echo "❌ No users found with those email addresses"
  exit 0
fi

echo "📊 Found $COUNT users to delete:"
echo "$SCAN_RESULT" | jq -r '.Items[] | "Email: \(.email.S), UserId: \(.userId.S), CreatedAt: \(.createdAt.S)"'

# Delete each user from DynamoDB (need both userId and createdAt)
echo ""
echo "🗑️  Deleting from DynamoDB..."

echo "$SCAN_RESULT" | jq -c '.Items[]' | while read -r item; do
  USER_ID=$(echo $item | jq -r '.userId.S')
  CREATED_AT=$(echo $item | jq -r '.createdAt.S')
  EMAIL=$(echo $item | jq -r '.email.S')
  
  echo "Deleting user: $EMAIL (ID: $USER_ID)"
  
  aws dynamodb delete-item \
    --table-name trioll-prod-users \
    --key "{\"userId\": {\"S\": \"$USER_ID\"}, \"createdAt\": {\"S\": \"$CREATED_AT\"}}"
    
  if [ $? -eq 0 ]; then
    echo "✅ Deleted from DynamoDB"
  else
    echo "❌ Failed to delete from DynamoDB"
  fi
done

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "Note: The users were already deleted from Cognito in the previous run."
echo "You can now register with these email addresses again."