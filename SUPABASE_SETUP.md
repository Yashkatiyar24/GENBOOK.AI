# Supabase Setup Guide for GENBOOK.AI

This guide will help you connect your New Appointments form to Supabase database.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. This project cloned and dependencies installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `genbook-ai` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be set up (usually takes 2-3 minutes)

## Step 2: Run Database Migration

1. In your Supabase project dashboard, go to the "SQL Editor"
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/add_appointment_columns.sql`
4. Click "Run" to execute the migration
5. This will create the `appointments` table with proper structure and security policies

### For Testing Without Authentication (Optional)

If you want to test the form without setting up authentication first:

1. In the SQL Editor, create another new query
2. Copy and paste the contents of `supabase/migrations/testing_policies.sql`
3. Click "Run" to execute the testing policies
4. **IMPORTANT**: Remove these policies before going to production by running:
   ```sql
   DROP POLICY "Allow anonymous insert for testing" ON appointments;
   DROP POLICY "Allow anonymous select for testing" ON appointments;
   DROP POLICY "Allow anonymous update for testing" ON appointments;
   DROP POLICY "Allow anonymous delete for testing" ON appointments;
   ```

## Step 3: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to "Settings" → "API"
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 4: Configure Environment Variables

1. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace the placeholder values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 5: Set Up Authentication (Optional but Recommended)

For production use, you should set up user authentication:

1. In Supabase dashboard, go to "Authentication" → "Settings"
2. Configure your preferred authentication providers
3. Update the Row Level Security policies if needed

## Step 6: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser
3. Try creating a new appointment through the form
4. Check your Supabase dashboard → "Table Editor" → "appointments" to see if the data was saved

## Database Schema

The appointments table has the following structure:

```sql
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);
```

## Form Data Mapping

The form data is mapped to the database as follows:

- **title**: Combination of service type and provider name
- **description**: Includes client name, location, notes, tags, and reminder settings
- **start_time**: Calculated from appointment date and time
- **end_time**: Calculated from start time + duration
- **status**: Always set to 'scheduled' for new appointments
- **user_id**: Will be automatically set when authentication is implemented

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables" error**
   - Make sure your `.env` file exists and has the correct variable names
   - Restart your development server after creating/updating `.env`

2. **"Failed to create appointment" error**
   - Check that the database migration was run successfully
   - Verify your Supabase credentials are correct
   - Check the browser console for detailed error messages

3. **Row Level Security errors**
   - For testing without authentication, you can temporarily disable RLS:
     ```sql
     ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
     ```
   - Remember to re-enable it for production use

4. **CORS errors**
   - Make sure your domain is added to the allowed origins in Supabase settings
   - For local development, `localhost` should work by default

## Next Steps

1. Implement user authentication
2. Add appointment listing and management features
3. Set up real-time subscriptions for live updates
4. Add file upload functionality for attachments
5. Implement email/SMS reminders

## Support

If you encounter any issues:
1. Check the Supabase documentation: https://supabase.com/docs
2. Review the browser console for error messages
3. Check the Supabase dashboard logs for server-side errors
