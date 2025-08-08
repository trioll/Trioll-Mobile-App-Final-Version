#!/bin/bash

# Test Registration Flow
API_BASE="https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod"
TEST_EMAIL="freddiecaplin+test$(date +%s)@gmail.com"
TEST_PASSWORD="TestPassword123!"

echo "🧪 Testing Registration Flow"
echo "=========================="
echo ""

# 1. Test Registration
echo "1️⃣ Testing Registration..."
echo "Email: $TEST_EMAIL"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/users/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"username\": \"testuser$(date +%s)\",
    \"displayName\": \"Test User\"
  }")

echo "Response: $REGISTER_RESPONSE" | jq '.'
echo ""

# 2. Test Resend Verification
echo "2️⃣ Testing Resend Verification..."
sleep 2

RESEND_RESPONSE=$(curl -s -X POST "$API_BASE/users/resend-verification" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\"
  }")

echo "Response: $RESEND_RESPONSE" | jq '.'
echo ""

# 3. Instructions for manual verification
echo "3️⃣ Manual Verification Required"
echo "================================"
echo "1. Check your email for the verification code"
echo "2. To verify, run:"
echo ""
echo "curl -X POST \"$API_BASE/users/verify\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"email\": \"$TEST_EMAIL\","
echo "    \"code\": \"YOUR_CODE_HERE\","
echo "    \"password\": \"$TEST_PASSWORD\""
echo "  }'"
echo ""
echo "This will verify your email and automatically log you in."