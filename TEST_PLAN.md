# GENBOOK.AI Razorpay Integration Test Plan

This document outlines the test cases and procedures for verifying the Razorpay integration in the staging environment.

## Test Environment

- **Frontend URL**: https://staging.genbook.ai
- **API URL**: https://staging.genbook.ai/api/v1
- **Test Cards**:
  - Success: 4111 1111 1111 1111
  - Failure: 5104 0600 0000 0008
  - Authentication: 4012 0000 3333 0044

## Test Cases

### 1. User Registration and Authentication

#### 1.1 New User Registration
- [ ] Register a new user with valid credentials
- [ ] Verify user receives confirmation email
- [ ] Verify user can log in with new credentials

#### 1.2 User Login
- [ ] Log in with valid credentials
- [ ] Verify JWT token is returned
- [ ] Verify token can be used to access protected endpoints

### 2. Subscription Management

#### 2.1 View Available Plans
- [ ] Fetch available subscription plans
- [ ] Verify plan details (name, price, features)
- [ ] Verify free plan is available

#### 2.2 Subscribe to a Plan
- [ ] Select Professional plan
- [ ] Verify Razorpay checkout is loaded
- [ ] Complete payment with test card
- [ ] Verify success redirect
- [ ] Verify subscription is active in database
- [ ] Verify webhook event is received and processed

#### 2.3 Upgrade Subscription
- [ ] While on Professional plan, upgrade to Enterprise
- [ ] Verify prorated charge is calculated correctly
- [ ] Verify subscription is updated in database
- [ ] Verify webhook event is received

#### 2.4 Cancel Subscription
- [ ] Cancel active subscription
- [ ] Verify subscription remains active until end of billing period
- [ ] Verify cancellation webhook is received
- [ ] Verify user is downgraded to free plan after period end

### 3. Webhook Testing

#### 3.1 Subscription Activated
- [ ] Simulate subscription.activated webhook
- [ ] Verify subscription is activated in database
- [ ] Verify user has correct permissions

#### 3.2 Payment Success
- [ ] Simulate payment.captured webhook
- [ ] Verify payment is recorded
- [ ] Verify subscription period is extended

#### 3.3 Payment Failure
- [ ] Simulate payment.failed webhook
- [ ] Verify retry mechanism works
- [ ] Verify user is notified of payment failure

#### 3.4 Subscription Cancelled
- [ ] Simulate subscription.cancelled webhook
- [ ] Verify subscription end date is set
- [ ] Verify user is notified

### 4. Security Tests

#### 4.1 Webhook Signature Verification
- [ ] Send webhook with invalid signature
- [ ] Verify request is rejected
- [ ] Verify appropriate error is logged

#### 4.2 API Authentication
- [ ] Access protected endpoints without token
- [ ] Access with invalid/expired token
- [ ] Verify proper error responses

### 5. End-to-End Flow

#### 5.1 Complete Subscription Flow
1. Register new user
2. Log in
3. View plans
4. Subscribe to Professional plan
5. Complete payment
6. Verify subscription is active
7. Upgrade to Enterprise
8. Verify upgrade
9. Cancel subscription
10. Verify cancellation

## Test Data

### Test Users
- **Free Tier**: free@test.genbook.ai
- **Professional Tier**: pro@test.genbook.ai
- **Enterprise Tier**: ent@test.genbook.ai

### Test Cards
- **Success**: 4111 1111 1111 1111
- **Failure**: 5104 0600 0000 0008
- **Authentication**: 4012 0000 3333 0044

## Test Execution

### Manual Testing
1. Deploy latest code to staging
2. Run through each test case manually
3. Document results
4. Log any issues found

### Automated Testing
```bash
# Run integration tests
npm test

# Run end-to-end tests
npm run test:e2e
```

## Expected Results
- All test cases should pass
- No errors in server logs
- All webhook events processed successfully
- Database remains consistent

## Sign-off

- [ ] Development Lead
- [ ] QA Lead
- [ ] Product Owner
- [ ] DevOps
