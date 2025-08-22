# Razorpay Integration Setup Guide

This guide will help you set up the complete Razorpay integration for your GENBOOK.AI SaaS project.

## 1. Razorpay Dashboard Setup

### Create Razorpay Account
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up or log in to your account
3. Complete KYC verification for live payments

### Get API Keys
1. Navigate to **Settings** → **API Keys**
2. Copy your **Key ID** and **Key Secret**
3. For testing, use Test Mode keys
4. For production, activate your account and use Live Mode keys

### Create Plans (Optional - for subscription model)
1. Go to **Subscriptions** → **Plans**
2. Create plans for Professional and Enterprise
3. Note down the Plan IDs

### Set up Webhooks
1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/razorpay/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
4. Generate and save webhook secret

## 2. Environment Configuration

### Frontend (.env)
```env
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
VITE_RAZORPAY_PROFESSIONAL_PLAN_ID=plan_professional_id
VITE_RAZORPAY_ENTERPRISE_PLAN_ID=plan_enterprise_id
```

### Backend (server/.env)
```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## 3. Database Setup

Run the migration to create required tables:

```bash
# In your Supabase SQL Editor, run:
# Copy and paste the contents of server/migrations/add_payment_tables.sql
```

## 4. Testing

### Test Cards (Razorpay Test Mode)
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **Authentication**: 4000 0000 0000 3220

### Test Flow
1. Start your development servers:
   ```bash
   npm run dev          # Frontend
   npm run dev:server   # Backend
   ```

2. Navigate to Billing section
3. Click "Upgrade to Professional" or "Upgrade to Enterprise"
4. Fill in the user details form
5. Complete payment with test card
6. Verify subscription update in database

## 5. Production Deployment

### Security Checklist
- [ ] Use Live Mode API keys in production
- [ ] Verify webhook signatures
- [ ] Use HTTPS for webhook endpoints
- [ ] Implement rate limiting
- [ ] Log all transactions
- [ ] Set up monitoring and alerts

### Webhook Configuration
- Update webhook URL to your production domain
- Ensure webhook endpoint is accessible
- Test webhook delivery in Razorpay dashboard

## 6. Features Included

### Frontend
- ✅ User details collection modal
- ✅ Dynamic plan pricing
- ✅ Razorpay checkout integration
- ✅ Payment success/failure handling
- ✅ Form validation
- ✅ Loading states and error handling

### Backend
- ✅ Order creation API
- ✅ Payment verification
- ✅ Webhook handling
- ✅ Database updates
- ✅ Security measures
- ✅ Error handling

### Database
- ✅ Payment orders tracking
- ✅ Subscription management
- ✅ Payment history
- ✅ Row Level Security (RLS)

## 7. API Endpoints

### POST /api/razorpay/create-order
Creates a new Razorpay order for subscription payment.

**Request:**
```json
{
  "planId": "professional",
  "amount": 2900,
  "userDetails": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "company": "Acme Corp"
  }
}
```

### POST /api/razorpay/verify-payment
Verifies payment signature and updates subscription.

**Request:**
```json
{
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_signature": "signature_xxxxx",
  "planId": "professional",
  "userDetails": { ... }
}
```

### POST /api/razorpay/webhook
Handles Razorpay webhook events for payment status updates.

## 8. Troubleshooting

### Common Issues

**Payment fails with "Invalid key"**
- Check if you're using the correct API keys
- Ensure Test/Live mode consistency

**Webhook not receiving events**
- Verify webhook URL is accessible
- Check webhook secret configuration
- Review Razorpay webhook logs

**Database errors**
- Ensure migration has been run
- Check RLS policies
- Verify user authentication

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
```

## 9. Next Steps

1. **Email Integration**: Set up email confirmations for successful payments
2. **Invoice Generation**: Create PDF invoices for payments
3. **Subscription Management**: Add plan change and cancellation features
4. **Analytics**: Track payment metrics and conversion rates
5. **Customer Portal**: Allow users to manage their billing details

## Support

For issues with this integration:
1. Check Razorpay documentation: https://razorpay.com/docs/
2. Review server logs for detailed error messages
3. Test with Razorpay's test environment first
4. Contact Razorpay support for payment gateway issues

Your Razorpay integration is now ready for production! 🚀