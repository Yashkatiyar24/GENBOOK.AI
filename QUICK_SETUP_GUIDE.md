# Quick Setup Guide - Fix the Payment Error

The error you're seeing is because the Razorpay credentials are not configured. Here's how to fix it:

## Step 1: Set Up Environment Variables

### Create `server/.env` file:

```bash
# Razorpay Configuration (Get these from Razorpay Dashboard)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Server Configuration
PORT=54321
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Development Settings
TEST_USER_ID=test_user_id_for_development
TEST_USER_EMAIL=test@example.com
TEST_RAZORPAY_MOCK=false
```

### Create `.env.local` file in project root:

```bash
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
VITE_RAZORPAY_PROFESSIONAL_PLAN_ID=plan_professional_id_here
VITE_RAZORPAY_ENTERPRISE_PLAN_ID=plan_enterprise_id_here

# App Configuration
VITE_APP_NAME=GENBOOK.AI
VITE_APP_URL=http://localhost:5173
```

## Step 2: Get Razorpay Credentials

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up or log in
3. Go to **Settings** → **API Keys**
4. Copy your **Key ID** and **Key Secret**
5. For testing, use Test Mode keys (they start with `rzp_test_`)

## Step 3: Start the Servers

### Terminal 1 - Start Backend Server:
```bash
npm run dev:server
```

### Terminal 2 - Start Frontend:
```bash
npm run dev
```

## Step 4: Test the Setup

Run the test script to verify everything is working:

```bash
node test-razorpay-setup.js
```

You should see:
- ✅ Environment Variables: All set
- ✅ Server is running
- ✅ Razorpay connection successful

## Step 5: Test the Payment Flow

1. Open your app in the browser
2. Go to the billing section
3. Click "Upgrade to Professional"
4. Fill in the user details
5. Click "Proceed to Payment"
6. Use test card: `4111 1111 1111 1111`

## Common Issues & Solutions

### Issue: "Environment variables missing"
**Solution**: Make sure you created the `.env` files with your actual Razorpay credentials

### Issue: "Server not running"
**Solution**: Run `npm run dev:server` in a separate terminal

### Issue: "Razorpay connection failed"
**Solution**: Check that your Razorpay credentials are correct and you're using test mode keys

### Issue: "Payment modal not opening"
**Solution**: Make sure both frontend and backend are running

## Test Cards (Razorpay Test Mode)

- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **Authentication**: 4000 0000 0000 3220

## Need Help?

If you're still having issues:

1. Check the browser console for errors
2. Check the server console for errors
3. Run `node test-razorpay-setup.js` to verify setup
4. Make sure both servers are running on the correct ports

The payment system should work perfectly once you have the environment variables set up correctly!
