# GENBOOK.AI Setup Guide

Welcome to the enhanced GENBOOK.AI appointment booking application! This guide will help you set up all the advanced features including AI-powered scheduling, conflict checking, and smart analytics.

## 🚀 Quick Start

### 1. Database Setup

First, run the database schema setup:

```bash
# If you have Supabase CLI installed (recommended)
supabase db reset --local
supabase db migrate up

# Or manually execute the SQL file in your Supabase dashboard
# Copy and paste the contents of database-setup.sql into the SQL editor
```

**Alternative:** Use the provided SQL file:
- Open your Supabase project dashboard
- Go to SQL Editor
- Copy and paste the entire contents of `database-setup.sql`
- Execute the script

### 2. Environment Variables

Create or update your `.env.local` file:

```env
# Existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# For email functionality (optional but recommended)
RESEND_API_KEY=your_resend_api_key

# AI Features (optional - uses fallback if not provided)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Install Dependencies

```bash
npm install

# Install additional packages for enhanced features
npm install lucide-react @radix-ui/react-alert-dialog @radix-ui/react-select
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your enhanced booking application!

## 🔧 Feature Configuration

### Database Verification

After running the setup, verify your tables were created:

1. Go to Supabase Dashboard → Database → Tables
2. You should see these new tables:
   - `appointments` (enhanced with new fields)
   - `contacts`
   - `user_settings`
   - `appointment_analytics`

### Testing Enhanced Features

1. **Sign up** for a new account (auto-verification enabled)
2. **Create an appointment** to test conflict checking
3. **Try AI suggestions** for optimal time slots
4. **Set buffer times** to prevent back-to-back meetings
5. **View no-show predictions** for risk assessment

## 📚 Feature Overview

### ✅ Currently Implemented

- **Authentication-Based Access Control**
  - Only logged-in users can book appointments
  - Dynamic UI based on auth state

- **Enhanced Signup Flow**
  - Auto email verification
  - Beautiful welcome emails
  - Immediate login after registration

- **Smart Appointment Booking**
  - Real-time conflict checking
  - AI-powered time suggestions
  - No-show probability predictions
  - Customizable buffer times

- **Advanced Database Schema**
  - Comprehensive appointment tracking
  - Contact management system
  - User preferences and settings
  - Analytics and reporting foundation

### 🚧 Roadmap Features

- **Calendar Integration** (Google Calendar, Outlook)
- **SMS Notifications** (Twilio integration)
- **Voice Commands** (Speech recognition)
- **Advanced Analytics Dashboard**
- **Recurring Appointments**
- **Team Scheduling**
- **API Webhooks**

## 🎯 Usage Examples

### Creating Your First Smart Appointment

1. Click "New Appointment" (only visible when logged in)
2. Fill in appointment details
3. Select date and time
4. Watch AI suggest optimal time slots
5. See conflict warnings if overlaps exist
6. Adjust buffer times as needed
7. Review no-show risk assessment
8. Save your appointment

### Managing Contacts

```javascript
// Contacts are automatically managed when creating appointments
// Add custom contacts through the enhanced UI (coming soon)
```

### Customizing User Settings

Default settings are created automatically, but you can customize:
- Working hours (9 AM - 5 PM by default)
- Buffer times (15 minutes before/after)
- Notification preferences
- AI automation preferences

## 🔍 Troubleshooting

### Common Issues

**Database not found:**
- Ensure you've run the SQL setup script
- Check your Supabase connection

**AI suggestions not working:**
- Verify your OpenAI API key (optional)
- Check browser console for errors
- Fallback suggestions will still work

**Email not sending:**
- Verify Resend API key
- Check Supabase Edge Functions are deployed

### Support

1. Check the browser developer console for errors
2. Verify all environment variables are set
3. Ensure database tables exist
4. Test with a fresh user account

## 📈 Performance Tips

- Database indexes are automatically created
- Conflict checking is optimized for speed
- AI suggestions are cached when possible
- Use buffer times to reduce conflicts

## 🔐 Security

All features respect Row Level Security (RLS):
- Users only see their own data
- Authentication required for all operations
- Secure API endpoints with proper authorization

## 📞 Next Steps

1. **Test all features** with sample data
2. **Customize styling** to match your brand
3. **Deploy to production** when ready
4. **Monitor usage** through built-in analytics
5. **Request additional features** as needed

---

## 🎉 You're Ready!

Your GENBOOK.AI application now includes:
- ✨ Smart conflict checking
- 🤖 AI-powered scheduling
- 📊 No-show predictions
- 🎨 Enhanced user experience
- 📱 Mobile-friendly design
- 🔒 Secure data handling

Enjoy building amazing booking experiences! 🚀
