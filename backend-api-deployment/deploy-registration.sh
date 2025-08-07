#!/bin/bash

# Complete deployment script for registration functionality
# This updates the Lambda function and adds API Gateway routes

set -e  # Exit on error

# Configuration
REGION="us-east-1"
FUNCTION_NAME="trioll-prod-users-api"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Deploying User Registration System${NC}"
echo -e "${YELLOW}========================================${NC}"

# Step 1: Backup current Lambda function
echo -e "\n${YELLOW}Step 1: Backing up current Lambda function...${NC}"
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.CodeSha256' --output text > lambda-backup-hash.txt
echo -e "${GREEN}✓ Backup hash saved${NC}"

# Step 2: Package Lambda function
echo -e "\n${YELLOW}Step 2: Packaging Lambda function...${NC}"
cd lambda-functions
cp users-api-with-registration.js index.js
zip -q function.zip index.js
echo -e "${GREEN}✓ Lambda function packaged${NC}"

# Step 3: Update Lambda function
echo -e "\n${YELLOW}Step 3: Updating Lambda function...${NC}"
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION >/dev/null

echo -e "${GREEN}✓ Lambda function updated${NC}"

# Step 4: Wait for function to be ready
echo -e "\n${YELLOW}Step 4: Waiting for Lambda to be ready...${NC}"
aws lambda wait function-updated \
    --function-name $FUNCTION_NAME \
    --region $REGION

echo -e "${GREEN}✓ Lambda function is ready${NC}"

# Step 5: Update Lambda environment variables (if needed)
echo -e "\n${YELLOW}Step 5: Updating Lambda environment variables...${NC}"
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{
        USERS_TABLE=trioll-prod-users,
        USER_POOL_ID=us-east-1_cLPH2acQd,
        CLIENT_ID=bft50gui77sdq2n4lcio4onql,
        AWS_REGION=us-east-1
    }" \
    --region $REGION >/dev/null

echo -e "${GREEN}✓ Environment variables updated${NC}"

# Clean up
rm index.js function.zip
cd ..

# Step 6: Add API Gateway routes
echo -e "\n${YELLOW}Step 6: Adding API Gateway routes...${NC}"
./add-registration-routes.sh

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Registration System Deployed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "What was deployed:"
echo "  • Updated trioll-prod-users-api Lambda function"
echo "  • Added POST /users/register endpoint"
echo "  • Added POST /users/verify endpoint"
echo "  • Configured CORS for both endpoints"
echo ""
echo "Test the registration endpoint:"
echo "  curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/register \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"test@example.com\",\"username\":\"testuser\",\"password\":\"Test123!\",\"displayName\":\"Test User\"}'"