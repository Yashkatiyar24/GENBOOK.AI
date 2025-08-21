# Razorpay Integration Setup

This guide will help you set up the Razorpay integration for GENBOOK.AI.

## Environment Variables

### Backend (server/.env)
```
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_generate_a_secure_random_string

# Webhook URL (Update with your production URL)
RAZORPAY_WEBHOOK_URL=https://yourdomain.com/api/v1/billing/webhook
```

### Frontend (.env.local)
```
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# Plan IDs (Update with your actual Razorpay plan IDs)
VITE_RAZORPAY_PROFESSIONAL_PLAN_ID=your_professional_plan_id
VITE_RAZORPAY_ENTERPRISE_PLAN_ID=your_enterprise_plan_id
```

## Razorpay Dashboard Setup

1. Log in to your Razorpay Dashboard
2. Navigate to **Settings** > **API Keys**
   - Copy your Key ID and Key Secret
   - Add these to your backend `.env` file

3. Create Plans in Razorpay:
   - Go to **Subscriptions** > **Plans** > **Create Plan**
   - Create plans for Professional and Enterprise tiers
   - Note down the Plan IDs and add them to your frontend `.env.local`

4. Set up Webhooks:
   - Go to **Settings** > **Webhooks**
   - Add a new webhook with the URL: `https://yourdomain.com/api/v1/billing/webhook`
   - Select the following events to listen for:
     - `subscription.activated`
     - `subscription.cancelled`
     - `subscription.charged`
     - `subscription.halted`
     - `subscription.paused`
     - `subscription.pending`
     - `subscription.resumed`
     - `subscription.updated`
   - Add the webhook secret from your `.env` file
   - Save the webhook

## Testing in Development

1. Use Razorpay Test Mode:
   - Enable Test Mode in Razorpay Dashboard
   - Use test card numbers from Razorpay's test cards documentation
   - Test successful and failed payment scenarios

2. Local Development with Webhooks:
   - Use a service like ngrok to expose your local server
   - Update the webhook URL in Razorpay Dashboard to point to your ngrok URL
   - Test webhook delivery in the Razorpay Dashboard

## Security Considerations

1. Never commit your Razorpay Key Secret or Webhook Secret to version control
2. Use environment variables for all sensitive data
3. Verify webhook signatures in production
4. Implement rate limiting on webhook endpoints
5. Log all webhook events for debugging and auditing

## Troubleshooting

- **Webhook not working?**
  - Check if your server is accessible from the internet
  - Verify the webhook secret matches between Razorpay and your .env file
  - Check server logs for any errors

- **Payment failing?**
  - Verify your Razorpay API keys are correct
  - Check that you're using test cards in development mode
  - Ensure your account has sufficient funds (for live mode)

- **Subscription not updating?**
  - Check the webhook delivery status in Razorpay Dashboard
  - Verify your database connection is working
  - Ensure your webhook handler is correctly processing events
