<<<<<<< HEAD
# Environment Setup Guide for Razorpay Integration

This guide will help you set up all the necessary environment variables and configurations for the Razorpay payment system.

## 1. Frontend Environment Variables (.env.local)

Create a `.env.local` file in your project root:

```bash
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
VITE_RAZORPAY_PROFESSIONAL_PLAN_ID=plan_professional_id_here
VITE_RAZORPAY_ENTERPRISE_PLAN_ID=plan_enterprise_id_here

# App Configuration
VITE_APP_NAME=GENBOOK.AI
VITE_APP_URL=http://localhost:5173

# Supabase Configuration (if using Supabase)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Backend Environment Variables (server/.env)

Create a `.env` file in your `server` directory:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Database Configuration
DATABASE_URL=your_database_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Development Settings
TEST_USER_ID=test_user_id_for_development
TEST_USER_EMAIL=test@example.com
TEST_RAZORPAY_MOCK=false
```

## 3. Razorpay Dashboard Setup

### Step 1: Create Razorpay Account
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up or log in to your account
3. Complete KYC verification for live payments

### Step 2: Get API Keys
1. Navigate to **Settings** → **API Keys**
2. Copy your **Key ID** and **Key Secret**
3. For testing, use Test Mode keys
4. For production, activate your account and use Live Mode keys

### Step 3: Create Plans (Optional - for subscription model)
1. Go to **Subscriptions** → **Plans**
2. Create plans for Professional and Enterprise:
   - **Professional Plan**: ₹29/month
   - **Enterprise Plan**: ₹99/month
3. Note down the Plan IDs and add them to your frontend `.env.local`

### Step 4: Set up Webhooks
1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select the following events:
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.cancelled`
   - `subscription.charged`
   - `subscription.halted`
   - `subscription.paused`
   - `subscription.resumed`
   - `subscription.updated`
4. Generate and save webhook secret
5. Add the webhook secret to your backend `.env` file

## 4. Database Setup

### Required Tables

Make sure you have the following tables in your database:

```sql
-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
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
CREATE TABLE IF NOT EXISTS payment_history (
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
CREATE TABLE IF NOT EXISTS billing_events (
  event_id TEXT PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table (optional)
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5. Testing Configuration

### Test Cards (Razorpay Test Mode)
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **Authentication**: 4000 0000 0000 3220

### Local Development with Webhooks
For local development, you can use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3001

# Update your webhook URL in Razorpay dashboard with the ngrok URL
# Example: https://abc123.ngrok.io/api/webhooks/razorpay
```

## 6. Production Deployment

### Environment Variables for Production
Update your production environment variables:

```bash
# Production Razorpay Keys (Live Mode)
RAZORPAY_KEY_ID=rzp_live_your_live_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
RAZORPAY_WEBHOOK_SECRET=your_production_webhook_secret

# Production URLs
CORS_ORIGIN=https://yourdomain.com
RAZORPAY_WEBHOOK_URL=https://yourdomain.com/api/webhooks/razorpay

# Security (use strong, unique secrets)
JWT_SECRET=your_very_strong_jwt_secret
SESSION_SECRET=your_very_strong_session_secret
```

### SSL Certificate
Ensure your production domain has a valid SSL certificate, as Razorpay requires HTTPS for webhooks.

## 7. Security Best Practices

### 1. Never Expose API Keys in Frontend
- Keep `RAZORPAY_KEY_SECRET` only in backend environment variables
- Only expose `RAZORPAY_KEY_ID` in frontend (it's safe to be public)

### 2. Webhook Security
- Always verify webhook signatures
- Use strong, unique webhook secrets
- Implement idempotency to prevent duplicate processing

### 3. Database Security
- Use parameterized queries to prevent SQL injection
- Implement proper Row Level Security (RLS) policies
- Regularly backup your database

### 4. Environment Variables
- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate secrets regularly

## 8. Common Issues and Solutions

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

## 9. Monitoring and Logging

### Enable Debug Logging
Set `NODE_ENV=development` to see detailed logs:

```bash
# Backend logs will show:
[Razorpay] Order created: order_xxx for user xxx, plan professional
[Razorpay] Payment verified successfully: pay_xxx for user xxx
[Webhook] Processing Razorpay event: payment.captured
```

### Production Monitoring
Consider implementing:
- Payment success/failure rate monitoring
- Webhook delivery monitoring
- Database performance monitoring
- Error tracking (e.g., Sentry)

## 10. Support and Documentation

- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Razorpay Webhook Guide](https://razorpay.com/docs/webhooks/)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/test-mode/)

For additional support, refer to the main README.md file or contact the development team.
=======
# Environment Setup Guide

## Issues Fixed

The following errors have been resolved:

1. ✅ **Stripe Integration Error**: Added proper error handling for missing publishable key
2. ✅ **Speech Recognition Network Error**: Improved error handling and added fallback mechanisms
3. ✅ **Supabase Authentication Error**: Added better error handling

## Required Environment Variables

To fully resolve the remaining issues, you need to create a `.env` file in your project root with the following variables:

### 1. Create `.env` file

Create a file named `.env` in your project root directory with the following content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://deddapftymntugxdxnmo.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Stripe Configuration (Optional - for billing features)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Development Configuration
VITE_APP_ENV=development
```

### 2. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the following values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 3. Get Your Stripe Credentials (Optional)

If you want to use billing features:

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Developers → API keys
3. Copy the **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`

## Current Status

### ✅ Fixed Issues:
- **VoiceCommand Network Error**: Now handles network errors gracefully with retry mechanisms
- **Stripe Configuration Error**: Added proper error handling for missing keys
- **Speech Recognition**: Added fallback text input option
- **Better Error Messages**: More helpful error messages for users

### 🔧 Improvements Made:
- Added secure context check for speech recognition
- Added manual text input fallback
- Improved error recovery mechanisms
- Better user experience with clear error messages

## Testing the VoiceCommand

The VoiceCommand component now works in the following ways:

1. **Voice Recognition**: Try speaking commands like "book an appointment"
2. **Text Input Fallback**: If voice fails, you can type commands
3. **Error Recovery**: Clear error messages with retry options
4. **Network Resilience**: Better handling of network issues

## Next Steps

1. Create the `.env` file with your actual credentials
2. Restart your development server: `npm run dev`
3. Test the VoiceCommand component
4. The Stripe errors will be resolved once you add the publishable key

## Browser Compatibility

VoiceCommand works best with:
- Chrome (recommended)
- Edge
- Safari
- Firefox (limited support)

Make sure to allow microphone access when prompted!
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
