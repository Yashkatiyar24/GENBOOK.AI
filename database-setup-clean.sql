-- =====================================================
-- GENBOOK.AI Enhanced Database Schema - CLEAN VERSION
-- This version works with existing appointments table
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ADD NEW COLUMNS TO EXISTING APPOINTMENTS TABLE
-- =====================================================

-- Add new columns to existing appointments table (safe to run multiple times)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS meeting_link text,
ADD COLUMN IF NOT EXISTS attendees text[],
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS attachments text[],
ADD COLUMN IF NOT EXISTS buffer_before integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS buffer_after integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_pattern jsonb,
ADD COLUMN IF NOT EXISTS parent_appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS no_show_probability decimal(3,2),
ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmation_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS feedback_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add constraints for status and priority (safe to run multiple times)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'appointments_status_check'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_status_check 
        CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no-show'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'appointments_priority_check'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_priority_check 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- Add new indexes (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_priority ON appointments(priority);
CREATE INDEX IF NOT EXISTS idx_appointments_updated_at ON appointments(updated_at);

-- =====================================================
-- 2. CREATE NEW TABLES
-- =====================================================

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic contact information
  name text NOT NULL,
  email text,
  phone text,
  company text,
  position text,
  
  -- Organization and metadata
  tags text[],
  notes text,
  avatar_url text,
  
  -- Relationship tracking
  last_contact timestamptz,
  contact_frequency integer DEFAULT 30,
  vip boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, email)
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Working hours configuration
  working_hours_start time DEFAULT '09:00',
  working_hours_end time DEFAULT '17:00',
  working_days integer[] DEFAULT '{1,2,3,4,5}',
  timezone text DEFAULT 'UTC',
  
  -- Default appointment settings
  default_buffer_before integer DEFAULT 15,
  default_buffer_after integer DEFAULT 15,
  default_appointment_duration integer DEFAULT 30,
  
  -- Notification preferences
  notification_preferences jsonb DEFAULT '{
    "email_reminders": true,
    "sms_reminders": false,
    "push_notifications": true,
    "reminder_times": [1440, 60, 15]
  }',
  
  -- AI and automation preferences
  ai_preferences jsonb DEFAULT '{
    "auto_suggest_times": true,
    "smart_scheduling": true,
    "no_show_prediction": true,
    "auto_reminders": true
  }',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointment analytics table
CREATE TABLE IF NOT EXISTS appointment_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Analytics data
  booking_lead_time interval,
  modification_count integer DEFAULT 0,
  reminder_count integer DEFAULT 0,
  client_response_time interval,
  
  -- Outcome tracking
  actual_duration interval,
  satisfaction_score integer CHECK (satisfaction_score BETWEEN 1 AND 5),
  follow_up_required boolean DEFAULT false,
  
  -- Timestamps
  recorded_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. CREATE INDEXES FOR NEW TABLES
-- =====================================================

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY FOR NEW TABLES ONLY
-- =====================================================

-- Enable RLS on new tables (appointments already has RLS)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE POLICIES FOR NEW TABLES ONLY
-- =====================================================

-- Contacts policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contacts' AND policyname = 'Users can view own contacts'
    ) THEN
        CREATE POLICY "Users can view own contacts" ON contacts
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contacts' AND policyname = 'Users can insert own contacts'
    ) THEN
        CREATE POLICY "Users can insert own contacts" ON contacts
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contacts' AND policyname = 'Users can update own contacts'
    ) THEN
        CREATE POLICY "Users can update own contacts" ON contacts
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contacts' AND policyname = 'Users can delete own contacts'
    ) THEN
        CREATE POLICY "Users can delete own contacts" ON contacts
          FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- User settings policies  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' AND policyname = 'Users can view own settings'
    ) THEN
        CREATE POLICY "Users can view own settings" ON user_settings
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' AND policyname = 'Users can insert own settings'
    ) THEN
        CREATE POLICY "Users can insert own settings" ON user_settings
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' AND policyname = 'Users can update own settings'
    ) THEN
        CREATE POLICY "Users can update own settings" ON user_settings
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Analytics policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointment_analytics' AND policyname = 'Users can view own analytics'
    ) THEN
        CREATE POLICY "Users can view own analytics" ON appointment_analytics
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointment_analytics' AND policyname = 'Users can insert own analytics'
    ) THEN
        CREATE POLICY "Users can insert own analytics" ON appointment_analytics
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- =====================================================
-- 6. CREATE UTILITY FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (safe to run multiple times)
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CREATE DEFAULT USER SETTINGS
-- =====================================================

-- Insert default user settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_settings WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 8. CREATE HELPFUL VIEWS
-- =====================================================

-- Drop and recreate views to avoid conflicts
DROP VIEW IF EXISTS upcoming_appointments;
CREATE VIEW upcoming_appointments AS
SELECT 
  a.*,
  EXTRACT(EPOCH FROM (a.start_time - now())) / 3600 as hours_until,
  CASE 
    WHEN a.no_show_probability > 0.3 THEN 'high'
    WHEN a.no_show_probability > 0.15 THEN 'medium'
    ELSE 'low'
  END as no_show_risk
FROM appointments a
WHERE a.start_time > now()
  AND (a.status IS NULL OR a.status IN ('scheduled', 'confirmed'))
ORDER BY a.start_time;

DROP VIEW IF EXISTS appointment_stats;
CREATE VIEW appointment_stats AS
SELECT 
  user_id,
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  COUNT(*) FILTER (WHERE status = 'no-show') as no_show_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'no-show') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'no-show')), 0), 
    2
  ) as no_show_rate,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) as avg_duration_minutes
FROM appointments
GROUP BY user_id;

-- =====================================================
-- 9. VERIFICATION
-- =====================================================

-- Show what tables we have now
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename IN ('appointments', 'contacts', 'user_settings', 'appointment_analytics')
ORDER BY tablename;

-- Show new columns added to appointments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'appointments' 
  AND column_name IN ('status', 'priority', 'buffer_before', 'buffer_after', 'no_show_probability', 'tags', 'notes')
ORDER BY column_name;
