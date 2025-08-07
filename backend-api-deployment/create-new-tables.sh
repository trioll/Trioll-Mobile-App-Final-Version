#!/bin/bash

# Create new DynamoDB tables for enhanced features

echo "Creating new DynamoDB tables for enhanced features..."

# 1. Game Progress Table
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
  --region us-east-1

# 2. User Streaks Table  
echo "Creating trioll-prod-user-streaks table..."
aws dynamodb create-table \
  --table-name trioll-prod-user-streaks \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# 3. Achievements Table
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
  --region us-east-1

echo "Waiting for tables to be active..."
aws dynamodb wait table-exists --table-name trioll-prod-game-progress --region us-east-1
aws dynamodb wait table-exists --table-name trioll-prod-user-streaks --region us-east-1
aws dynamodb wait table-exists --table-name trioll-prod-achievements --region us-east-1

echo "All tables created successfully!"

# Add tags
echo "Adding tags to tables..."
for table in trioll-prod-game-progress trioll-prod-user-streaks trioll-prod-achievements; do
  aws dynamodb tag-resource \
    --resource-arn arn:aws:dynamodb:us-east-1:$(aws sts get-caller-identity --query Account --output text):table/$table \
    --tags Key=Environment,Value=Production Key=Service,Value=Trioll Key=Feature,Value=EnhancedInteractions \
    --region us-east-1
done

echo "Tags added successfully!"