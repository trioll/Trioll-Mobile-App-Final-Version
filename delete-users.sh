#!/bin/bash

echo "🔍 Searching for users in DynamoDB..."

# Scan for users with these emails
SCAN_RESULT=$(aws dynamodb scan \
  --table-name trioll-prod-users \
  --filter-expression "email IN (:email1, :email2)" \
  --expression-attribute-values '{":email1": {"S": "freddiecaplin@hotmail.com"}, ":email2": {"S": "freddiecaplin@gmail.com"}}' \
  --output json)

# Extract userIds
USER_IDS=$(echo $SCAN_RESULT | jq -r '.Items[] | .userId.S')

if [ -z "$USER_IDS" ]; then
  echo "❌ No users found with those email addresses"
  exit 0
fi

echo "📊 Found users to delete:"
echo "$SCAN_RESULT" | jq -r '.Items[] | "Email: \(.email.S), UserId: \(.userId.S)"'

# Delete each user from DynamoDB
echo ""
echo "🗑️  Deleting from DynamoDB..."
for USER_ID in $USER_IDS; do
  echo "Deleting user: $USER_ID"
  aws dynamodb delete-item \
    --table-name trioll-prod-users \
    --key "{\"userId\": {\"S\": \"$USER_ID\"}}"
done

echo ""
echo "✅ Deleted from DynamoDB!"

# Now delete from Cognito
echo ""
echo "🔍 Searching for users in Cognito..."

for EMAIL in "freddiecaplin@hotmail.com" "freddiecaplin@gmail.com"; do
  echo ""
  echo "Looking for: $EMAIL"
  
  # List users with this email
  COGNITO_USERS=$(aws cognito-idp list-users \
    --user-pool-id us-east-1_cLPH2acQd \
    --filter "email = \"$EMAIL\"" \
    --output json 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    USERNAME=$(echo $COGNITO_USERS | jq -r '.Users[0].Username // empty')
    
    if [ ! -z "$USERNAME" ]; then
      echo "Found Cognito user: $USERNAME"
      echo "Deleting from Cognito..."
      
      aws cognito-idp admin-delete-user \
        --user-pool-id us-east-1_cLPH2acQd \
        --username "$USERNAME" 2>/dev/null
      
      if [ $? -eq 0 ]; then
        echo "✅ Deleted from Cognito"
      else
        echo "⚠️  Could not delete from Cognito (may not have admin permissions)"
      fi
    else
      echo "❌ Not found in Cognito"
    fi
  else
    echo "⚠️  Could not search Cognito (may not have permissions)"
  fi
done

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "You can now register with these email addresses again."