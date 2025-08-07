#!/bin/bash

# Create DynamoDB table for comments
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
  --region us-east-1

echo "Table creation initiated. Checking status..."

# Wait for table to be active
aws dynamodb wait table-exists --table-name trioll-prod-comments --region us-east-1

echo "Table created successfully!"

# Add tags for organization
aws dynamodb tag-resource \
  --resource-arn arn:aws:dynamodb:us-east-1:$(aws sts get-caller-identity --query Account --output text):table/trioll-prod-comments \
  --tags Key=Environment,Value=Production Key=Service,Value=Trioll Key=Purpose,Value=GameComments \
  --region us-east-1

echo "Tags added to table."