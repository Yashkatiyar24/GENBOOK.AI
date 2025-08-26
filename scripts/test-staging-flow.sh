#!/bin/bash

# Test script for GENBOOK.AI staging environment
# This script tests the complete Razorpay subscription flow in the staging environment

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
STAGING_URL="https://staging.genbook.ai"
API_URL="${STAGING_URL}/api/v1"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="Test@12345"

# Function to print step status
print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

# Function to print error and exit
fail() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "jq is required but not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    else
        sudo apt-get update && sudo apt-get install -y jq
    fi
fi

# Test API health check
print_step "Testing API health check..."
HEALTH_CHECK=$(curl -s "${API_URL}/health")
if [ "$HEALTH_CHECK" != "{\"status\":\"ok\"}" ]; then
    fail "API health check failed"
fi

# Register a test user
print_step "Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

echo $REGISTER_RESPONSE | jq

# Extract user ID and token
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.user.id')
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    fail "Failed to register user or get auth token"
fi

# Get available plans
print_step "Fetching available plans..."
PLANS_RESPONSE=$(curl -s -X GET "${API_URL}/billing/plans" \
    -H "Authorization: Bearer ${TOKEN}")

echo $PLANS_RESPONSE | jq

# Extract plan IDs
PRO_PLAN_ID=$(echo $PLANS_RESPONSE | jq -r '.plans[] | select(.name=="Professional") | .id')
ENT_PLAN_ID=$(echo $PLANS_RESPONSE | jq -r '.plans[] | select(.name=="Enterprise") | .id')

if [ -z "$PRO_PLAN_ID" ] || [ -z "$ENT_PLAN_ID" ]; then
    fail "Failed to get plan IDs"
fi

# Create a test subscription (Professional plan)
print_step "Creating test subscription..."
SUBSCRIPTION_RESPONSE=$(curl -s -X POST "${API_URL}/billing/subscribe" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"planId\":\"${PRO_PLAN_ID}\"}")

echo $SUBSCRIPTION_RESPONSE | jq

# Extract checkout URL and subscription ID
CHECKOUT_URL=$(echo $SUBSCRIPTION_RESPONSE | jq -r '.checkoutUrl')
SUBSCRIPTION_ID=$(echo $SUBSCRIPTION_RESPONSE | jq -r '.subscriptionId')

if [ -z "$CHECKOUT_URL" ] || [ "$CHECKOUT_URL" = "null" ]; then
    fail "Failed to create subscription"
fi

print_step "Subscription created successfully"
echo "Checkout URL: ${CHECKOUT_URL}"
echo "Subscription ID: ${SUBSCRIPTION_ID}"

# In a real test, you would:
# 1. Open the checkout URL in a browser
# 2. Complete the payment using Razorpay test card
# 3. Verify the webhook was received and processed
# 4. Check the subscription status

print_step "Test completed successfully!"
echo "Test user email: ${TEST_EMAIL}"
echo "Test user password: ${TEST_PASSWORD}"

# Cleanup (uncomment when ready to test cleanup)
# print_step "Cleaning up test data..."
# curl -X DELETE "${API_URL}/users/me" \
#     -H "Authorization: Bearer ${TOKEN}" \
#     -H "Content-Type: application/json"

print_step "Done!"
