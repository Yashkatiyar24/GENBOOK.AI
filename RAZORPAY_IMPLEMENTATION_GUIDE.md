# Complete Razorpay Payment System Implementation Guide

This guide provides a comprehensive implementation of a secure Razorpay payment system for your React + Node.js application.

## Table of Contents

1. [Razorpay Flow Overview](#razorpay-flow-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Security Features](#security-features)
5. [Database Schema](#database-schema)
6. [Webhook Handling](#webhook-handling)
7. [Testing](#testing)
8. [Best Practices](#best-practices)
9. [Common Pitfalls](#common-pitfalls)
10. [Troubleshooting](#troubleshooting)

## Razorpay Flow Overview

### Step-by-Step Payment Flow

1. **User Selection**: User selects a plan and clicks "Proceed to Payment"
2. **User Details Collection**: Modal collects user information (name, email, phone, company)
3. **Backend Order Creation**: Frontend calls `/api/razorpay/create-order` with plan details
4. **Razorpay Checkout**: Frontend opens Razorpay popup with order details
5. **Payment Processing**: User completes payment in Razorpay
6. **Payment Verification**: Frontend calls `/api/razorpay/verify-payment` to verify signature
7. **Database Update**: Backend updates user subscription and sends confirmation

### Architecture Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │  Razorpay   │    │  Database   │
│             │    │             │    │             │    │             │
│ 1. User     │───▶│ 2. Create   │───▶│ 3. Process  │    │             │
│    selects  │    │    order    │    │   payment   │    │             │
│    plan     │    │             │    │             │    │             │
│             │    │             │    │             │    │             │
│ 4. Open     │◀───│ 5. Return   │◀───│ 6. Payment  │    │             │
│    checkout │    │   order     │    │   success   │    │             │
│             │    │             │    │             │    │             │
│ 7. Verify   │───▶│ 8. Verify   │    │             │───▶│ 9. Update   │
│    payment  │    │  signature  │    │             │    │ subscription│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Backend Implementation

### 1. Enhanced Razorpay Route (`server/routes/razorpay.ts`)

The backend implementation includes:

- **Secure order creation** with validation
- **Payment signature verification** using HMAC-SHA256
- **Comprehensive error handling** with detailed logging
- **Database updates** for subscriptions and payment history
- **User profile management**

Key Features:
```typescript
// Enhanced signature verification
function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// Comprehensive order creation
router.post('/create-order', requireAuth, async (req: Request, res: Response) => {
  // Validates required fields
  // Creates Razorpay order
  // Returns order details for frontend
});

// Secure payment verification
router.post('/verify-payment', requireAuth, async (req: Request, res: Response) => {
  // Verifies payment signature
  // Updates subscription in database
  // Records payment history
  // Sends confirmation email
});
```

### 2. Webhook Handler (`server/routes/webhooks.ts`)

Handles all Razorpay webhook events:

```typescript
// Supported webhook events
- payment.captured
- payment.failed
- subscription.activated
- subscription.cancelled
- subscription.charged
- subscription.halted
- subscription.paused
- subscription.resumed
- subscription.updated
```

Features:
- **Signature verification** for security
- **Idempotency** to prevent duplicate processing
- **Comprehensive event handling** for all subscription states
- **Error logging** and monitoring

## Frontend Implementation

### 1. Enhanced Billing Component (`src/components/BillingView.tsx`)

The frontend implementation includes:

- **Modern UI/UX** with clear plan selection
- **User details collection** with validation
- **Razorpay integration** with error handling
- **Success/Error modals** for better user experience
- **Loading states** and progress indicators

Key Features:
```typescript
// Plan selection with billing cycle toggle
const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

// User details modal with validation
const UserDetailsModal = ({ isOpen, onClose, selectedPlan, onSubmit }) => {
  // Form validation
  // Pre-fill user data
  // Plan summary display
};

// Payment processing with error handling
const handleUserDetailsSubmit = async (userDetails: UserDetails) => {
  // Load Razorpay script
  // Create order on backend
  // Open Razorpay checkout
  // Handle success/failure
};
```

### 2. UX Best Practices Implemented

✅ **Clear button design** for "Proceed to Payment"
✅ **Plan summary** before payment
✅ **Confirmation screen** after success
✅ **Friendly error messages** on failure
✅ **Loading states** and progress indicators
✅ **Form validation** with helpful error messages
✅ **Responsive design** for all devices

## Security Features

### 1. Payment Signature Verification

```typescript
// Backend signature verification
function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}
```

### 2. Webhook Security

- **Signature verification** for all webhook events
- **Idempotency** to prevent duplicate processing
- **Event logging** for audit trails

### 3. API Security

- **Authentication middleware** for all payment endpoints
- **Input validation** and sanitization
- **Rate limiting** (can be added)
- **CORS configuration** for production

## Database Schema

### Required Tables

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'inactive',
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_subscription_id TEXT UNIQUE,
  amount_paid INTEGER,
  currency VARCHAR(3) DEFAULT 'INR',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment history table
CREATE TABLE payment_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  amount INTEGER,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending',
  plan_id VARCHAR(50),
  method VARCHAR(50),
  email TEXT,
  contact TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing events table (for webhook idempotency)
CREATE TABLE billing_events (
  event_id TEXT PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Webhook Handling

### Webhook Events Supported

1. **payment.captured** - Payment successfully completed
2. **payment.failed** - Payment failed
3. **subscription.activated** - Subscription activated
4. **subscription.cancelled** - Subscription cancelled
5. **subscription.charged** - Subscription charged
6. **subscription.halted** - Subscription halted
7. **subscription.paused** - Subscription paused
8. **subscription.resumed** - Subscription resumed
9. **subscription.updated** - Subscription updated

### Webhook Security

```typescript
// Verify webhook signature
const isValid = verifyWebhookSignature(req.body, razorpaySignature, webhookSecret);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}

// Check for duplicate events (idempotency)
const eventId = `${eventType}_${payload.payment?.entity?.id || payload.subscription?.entity?.id}`;
const { data: existingEvent } = await supabase
  .from('billing_events')
  .select('event_id')
  .eq('event_id', eventId)
  .single();

if (existingEvent) {
  return res.json({ received: true, message: 'Duplicate event ignored' });
}
```

## Testing

### 1. Automated Test Script

Run the comprehensive test script:

```bash
# Install dependencies
npm install

# Run the test script
npx tsx scripts/test-razorpay-integration.ts
```

The test script covers:
- ✅ Environment variables validation
- ✅ Razorpay connection test
- ✅ Order creation test
- ✅ Backend API tests
- ✅ Signature verification test
- ✅ Webhook simulation test
- ✅ Database schema validation

### 2. Manual Testing

#### Test Cards (Razorpay Test Mode)
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **Authentication**: 4000 0000 0000 3220

#### Test Flow
1. Start your development servers
2. Navigate to Billing section
3. Click "Upgrade to Professional" or "Upgrade to Enterprise"
4. Fill in the user details form
5. Complete payment with test card
6. Verify subscription update in database

### 3. Local Development with Webhooks

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3001

# Update your webhook URL in Razorpay dashboard with the ngrok URL
# Example: https://abc123.ngrok.io/api/webhooks/razorpay
```

## Best Practices

### 1. Security Best Practices

✅ **Never expose API keys in frontend**
- Keep `RAZORPAY_KEY_SECRET` only in backend environment variables
- Only expose `RAZORPAY_KEY_ID` in frontend (it's safe to be public)

✅ **Always verify webhook signatures**
- Use HMAC-SHA256 for signature verification
- Implement timing-safe comparison

✅ **Implement idempotency**
- Prevent duplicate webhook processing
- Use unique event IDs for tracking

✅ **Validate all inputs**
- Sanitize user inputs
- Validate payment amounts and plan IDs

### 2. UX Best Practices

✅ **Clear button design**
- Prominent "Proceed to Payment" button
- Clear visual hierarchy
- Loading states and progress indicators

✅ **Plan summary before payment**
- Show selected plan details
- Display total amount clearly
- Allow users to review before proceeding

✅ **Confirmation and error handling**
- Success confirmation screen
- Friendly error messages
- Retry options for failed payments

✅ **Form validation**
- Real-time validation
- Helpful error messages
- Required field indicators

### 3. Code Quality Best Practices

✅ **Comprehensive error handling**
- Try-catch blocks for all async operations
- Detailed error logging
- User-friendly error messages

✅ **Type safety**
- TypeScript interfaces for all data structures
- Proper type checking
- IntelliSense support

✅ **Code organization**
- Modular component structure
- Separation of concerns
- Reusable utility functions

## Common Pitfalls

### ❌ Exposing API Keys in Frontend

**Problem**: Including `RAZORPAY_KEY_SECRET` in frontend code
**Solution**: Keep secrets only in backend environment variables

### ❌ Skipping Signature Verification

**Problem**: Not verifying webhook signatures
**Solution**: Always verify signatures using HMAC-SHA256

### ❌ Not Handling Duplicate Webhooks

**Problem**: Processing the same webhook multiple times
**Solution**: Implement idempotency with unique event IDs

### ❌ Poor Error Handling

**Problem**: Generic error messages
**Solution**: Provide specific, actionable error messages

### ❌ Not Testing Webhooks Locally

**Problem**: Webhook issues in production
**Solution**: Use ngrok for local webhook testing

### ❌ Missing Database Transactions

**Problem**: Inconsistent database state
**Solution**: Use database transactions for related operations

## Troubleshooting

### Issue: "Razorpay credentials not configured"

**Solution**: Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in your backend `.env` file.

### Issue: "Invalid payment signature"

**Solution**: Ensure you're using the correct webhook secret and that signature verification is working properly.

### Issue: "Webhook not receiving events"

**Solution**: 
1. Check that your webhook URL is accessible from the internet
2. Verify the webhook URL in Razorpay dashboard
3. Check server logs for any errors

### Issue: "Payment modal not opening"

**Solution**:
1. Ensure Razorpay script is loading properly
2. Check that `VITE_RAZORPAY_KEY_ID` is set correctly
3. Verify that the order creation API is working

### Issue: "Database errors"

**Solution**:
1. Check database connection
2. Verify table schema matches requirements
3. Check for missing indexes or constraints

## Environment Setup

### Required Environment Variables

#### Frontend (.env.local)
```bash
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
VITE_RAZORPAY_PROFESSIONAL_PLAN_ID=plan_professional_id_here
VITE_RAZORPAY_ENTERPRISE_PLAN_ID=plan_enterprise_id_here
```

#### Backend (server/.env)
```bash
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

## Production Deployment

### 1. Environment Variables for Production

```bash
# Production Razorpay Keys (Live Mode)
RAZORPAY_KEY_ID=rzp_live_your_live_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
RAZORPAY_WEBHOOK_SECRET=your_production_webhook_secret

# Production URLs
CORS_ORIGIN=https://yourdomain.com
RAZORPAY_WEBHOOK_URL=https://yourdomain.com/api/webhooks/razorpay
```

### 2. SSL Certificate

Ensure your production domain has a valid SSL certificate, as Razorpay requires HTTPS for webhooks.

### 3. Monitoring

Implement monitoring for:
- Payment success/failure rates
- Webhook delivery monitoring
- Database performance
- Error tracking (e.g., Sentry)

## Support and Documentation

- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Razorpay Webhook Guide](https://razorpay.com/docs/webhooks/)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/test-mode/)

For additional support, refer to the main README.md file or contact the development team.

---

This implementation provides a complete, secure, and user-friendly Razorpay payment system with comprehensive error handling, security features, and best practices for production deployment.
