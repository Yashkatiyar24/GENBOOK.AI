# Razorpay Integration Guide

This document provides an overview of the Razorpay integration in GENBOOK.AI, including setup instructions, testing procedures, and troubleshooting tips.

## Table of Contents
- [Overview](#overview)
- [Setup Instructions](#setup-instructions)
- [Testing the Integration](#testing-the-integration)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Overview

The Razorpay integration enables subscription management for GENBOOK.AI, allowing users to:
- Subscribe to different plans (Starter, Professional, Enterprise)
- Upgrade/downgrade their subscription
- Cancel their subscription
- Manage payment methods

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Frontend (.env.local)
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_RAZORPAY_PROFESSIONAL_PLAN_ID=your_pro_plan_id
VITE_RAZORPAY_ENTERPRISE_PLAN_ID=your_ent_plan_id

# Backend (server/.env)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Razorpay Dashboard Setup

1. Log in to your Razorpay Dashboard
2. Navigate to **Settings** > **API Keys**
   - Copy your Key ID and Key Secret
   - Add these to your environment variables
3. Create Plans in Razorpay:
   - Go to **Subscriptions** > **Plans** > **Create Plan**
   - Create plans for Professional and Enterprise tiers
   - Note down the Plan IDs and add them to your frontend `.env.local`
4. Set up Webhooks:
   - Go to **Settings** > **Webhooks**
   - Add a new webhook with your server's webhook URL
   - Select relevant subscription events
   - Add the webhook secret from your `.env` file

## Testing the Integration

### Automated Tests

Run the integration test script:

```bash
tsc scripts/test-razorpay-integration.ts
node scripts/test-razorpay-integration.js
```

### Manual Testing

1. **Subscription Flow**
   - Log in to the application
   - Navigate to Billing & Subscription
   - Select a plan and complete the payment
   - Verify the subscription is active in the UI
   - Check the database for the subscription record

2. **Webhook Testing**
   - Use the Razorpay Dashboard to send test webhooks
   - Verify the webhook handler processes events correctly
   - Check the database for updates

## Troubleshooting

### Common Issues

1. **Webhook Not Working**
   - Verify the webhook URL is correct and accessible
   - Check the webhook secret matches
   - Monitor server logs for errors

2. **Payment Failing**
   - Verify Razorpay API keys are correct
   - Check for sufficient test balance
   - Verify plan IDs match between Razorpay and your app

3. **Subscription Not Updating**
   - Check webhook delivery status in Razorpay Dashboard
   - Verify the webhook handler is processing events
   - Check database connection and logs

## API Reference

### Frontend API

- `useSubscription` hook: Handles subscription management
  ```typescript
  const {
    currentPlan,
    isLoading,
    loading,
    handleSubscription,
    cancelSubscription
  } = useSubscription();
  ```

### Backend API

- `POST /api/v1/billing/subscribe` - Create or update subscription
- `POST /api/v1/billing/cancel-subscription` - Cancel subscription
- `GET /api/v1/billing/subscription` - Get current subscription
- `POST /webhooks/razorpay` - Razorpay webhook handler

## Security Considerations

1. Never commit sensitive data to version control
2. Use environment variables for all secrets
3. Verify webhook signatures
4. Implement rate limiting on API endpoints
5. Monitor logs for suspicious activity
