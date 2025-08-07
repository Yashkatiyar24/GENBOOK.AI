# GENBOOK.AI

## Setup Instructions

### Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. This project cloned and dependencies installed

### Supabase Setup

1. Create a Supabase project:
   - Go to https://supabase.com and sign in
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - Name: `genbook-ai` (or your preferred name)
     - Database Password: Create a strong password
     - Region: Choose closest to your users
   - Click "Create new project"
   - Wait for the project to be set up (usually takes 2-3 minutes)

2. Run Database Migration:
   - In your Supabase project dashboard, go to the "SQL Editor"
   - Click "New Query"
   - Copy and paste the contents of `database-setup-final.sql`
   - Click "Run" to execute the migration
   - This will create the necessary tables with proper structure and security policies

3. Get Your Supabase Credentials:
   - In your Supabase project dashboard, go to "Settings" → "API"
   - Copy the following values:
     - **Project URL** (looks like: `https://your-project-id.supabase.co`)
     - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

4. Configure Environment Variables:
   - Open `.env` file in your project root
   - Replace the placeholder values with your actual Supabase credentials:
     ```
     VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-actual-anon-key
     ```

### Testing the Components

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser

3. Test the History View:
   - Navigate to the History tab
   - The component should fetch and display appointment history from Supabase

4. Test the Settings View:
   - Navigate to the Settings tab
   - The component should fetch and display user profile, notification settings, and family members from Supabase
   - Try updating your profile information and saving the changes

### Troubleshooting

#### Common Issues:

1. **"Missing Supabase environment variables" error**
   - Make sure your `.env` file exists and has the correct variable names
   - Restart your development server after creating/updating `.env`

2. **"Failed to fetch data" error**
   - Check that the database migration was run successfully
   - Verify your Supabase credentials are correct
   - Check the browser console for detailed error messages

3. **Row Level Security errors**
   - For testing without authentication, you can temporarily disable RLS:
     ```sql
     ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
     ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
     ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
     ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
     ```
   - Remember to re-enable it for production use

### Support

If you encounter any issues:
1. Check the Supabase documentation: https://supabase.com/docs
2. Review the browser console for error messages
3. Check the Supabase dashboard logs for server-side errors