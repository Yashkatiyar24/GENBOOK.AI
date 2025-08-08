# GENBOOK.AI SaaS Setup Guide

This guide will help you set up GENBOOK.AI as a fully functional SaaS platform with multitenancy, billing, team management, and branding features.

## 🚀 Quick Start

### 1. Environment Variables

Create or update your `.env` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional: OpenAI for enhanced chatbot (if using)
OPENAI_API_KEY=your_openai_api_key
```

### 2. Database Setup

Run the database migration scripts in order:

```bash
# 1. Run the main database setup
psql -h your_supabase_host -U postgres -d postgres -f database-setup-final.sql

# 2. Run the SaaS migration
psql -h your_supabase_host -U postgres -d postgres -f migrations/2025-08-add-organization.sql
```

### 3. Supabase Edge Functions

Deploy the Stripe webhook and API endpoints:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your_project_ref

# Deploy edge functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy cancel-subscription
```

### 4. Stripe Configuration

1. **Create Products and Prices in Stripe Dashboard:**
   - Starter Plan: Free (for reference)
   - Professional Plan: $29/month (price_professional)
   - Enterprise Plan: $99/month (price_enterprise)

2. **Set up Webhook Endpoint:**
   - URL: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### 5. Install Dependencies

```bash
npm install @stripe/stripe-js stripe
```

## 🏗️ Architecture Overview

### Database Schema

The SaaS transformation adds the following key tables:

- **organizations**: Main tenant table with branding and subscription info
- **subscriptions**: Stripe subscription details
- **payments**: Payment history and records
- **organization_members**: Team members with roles
- **invitations**: Pending team invitations
- **bot_settings**: Per-organization chatbot configuration

### Key Features

#### 🏢 Multitenancy
- Organization-based data isolation
- Row Level Security (RLS) policies
- Automatic organization assignment for new users

#### 💳 Billing & Subscriptions
- Stripe integration for payments
- Multiple subscription tiers (Starter, Professional, Enterprise)
- Automatic subscription management via webhooks
- Payment history and invoice tracking

#### 👥 Team Management
- Role-based access control (Owner, Admin, Member)
- Team member invitations
- Permission management

#### 🎨 Branding & Customization
- Custom logos and colors
- Branded booking pages
- Custom CSS support
- Timezone configuration

#### 🤖 Enhanced Chatbot
- Per-organization bot settings
- Usage limits based on subscription tier
- Custom welcome and fallback messages
- Feature gating integration

## 🔧 Configuration

### Subscription Plans & Limits

| Feature | Starter (Free) | Professional ($29) | Enterprise ($99) |
|---------|----------------|-------------------|------------------|
| Appointments/month | 50 | Unlimited | Unlimited |
| Chatbot messages | 100 | 1,000 | Unlimited |
| Team members | 1 | 5 | Unlimited |
| Custom branding | ❌ | ✅ | ✅ |
| Advanced analytics | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| Priority support | ❌ | ✅ | ✅ |

### Feature Gating

The system automatically enforces limits based on subscription tiers:

```typescript
// Example usage
const { allowed, reason } = await FeatureGating.canCreateAppointment(userId);
if (!allowed) {
  alert(reason); // "Monthly appointment limit reached (50). Upgrade your plan for more appointments."
}
```

## 🚦 Testing

### 1. Basic Functionality Test
1. Sign up a new user
2. Verify organization creation
3. Test appointment creation within limits
4. Test chatbot functionality

### 2. Billing Integration Test
1. Navigate to Billing tab
2. Attempt to upgrade to Professional plan
3. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
4. Verify subscription status updates
5. Test feature unlocking

### 3. Team Management Test
1. Navigate to Team tab
2. Invite a team member
3. Test role assignments
4. Verify permission enforcement

### 4. Organization Settings Test
1. Navigate to Organization tab
2. Update branding settings
3. Test custom colors and logo upload
4. Configure chatbot settings

## 🔒 Security Features

- **Row Level Security**: All data access is filtered by organization
- **Role-based permissions**: Granular access control
- **Secure webhooks**: Stripe signature verification
- **Input validation**: All user inputs are sanitized
- **Rate limiting**: Built into Supabase Edge Functions

## 📊 Monitoring & Analytics

### Key Metrics to Track
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Churn rate
- Feature usage by plan
- Support ticket volume by plan

### Recommended Tools
- **Error Monitoring**: Sentry (integration ready)
- **Analytics**: PostHog or Mixpanel
- **Uptime**: Pingdom or UptimeRobot
- **Performance**: Vercel Analytics

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Stripe webhooks configured
- [ ] Edge functions deployed
- [ ] SSL certificates configured
- [ ] Monitoring tools set up
- [ ] Backup strategy implemented

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Supabase (managed)
- **CDN**: Cloudflare
- **Domain**: Custom domain with SSL

## 🆘 Troubleshooting

### Common Issues

#### Stripe Webhook Failures
- Check webhook URL is accessible
- Verify webhook secret matches
- Check Supabase function logs

#### Organization Not Found Errors
- Ensure user has been assigned to an organization
- Check RLS policies are correctly applied
- Verify database migrations completed

#### Feature Gating Not Working
- Clear feature gating cache: `FeatureGating.clearCache()`
- Check subscription status in database
- Verify Stripe webhook processed correctly

### Support
For technical support or questions about the SaaS implementation:
1. Check the troubleshooting section above
2. Review Supabase function logs
3. Check Stripe dashboard for webhook delivery status
4. Verify database RLS policies are active

## 🔄 Updates & Maintenance

### Regular Tasks
- Monitor subscription metrics
- Update Stripe product prices as needed
- Review and update feature limits
- Monitor system performance
- Update dependencies regularly

### Scaling Considerations
- Database connection pooling
- CDN for static assets
- Horizontal scaling for high traffic
- Background job processing for webhooks

---

**🎉 Congratulations!** You now have a fully functional SaaS version of GENBOOK.AI with multitenancy, billing, team management, and branding features.
