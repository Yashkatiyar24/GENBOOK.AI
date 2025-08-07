-- =====================================================
-- GENBOOK.AI Enhanced Database Schema
-- Complete setup for all advanced features
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENHANCED APPOINTMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  
  -- Enhanced status options
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no-show')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  color text,
  
  -- Location and meeting details
  location text,
  meeting_link text,
  attendees text[], -- Array of email addresses or names
  
  -- Organization and metadata
  tags text[],
  notes text,
  attachments text[], -- Array of file URLs/paths
  
  -- Buffer time management (in minutes)
  buffer_before integer DEFAULT 15,
  buffer_after integer DEFAULT 15,
  
  -- Recurring appointments
  is_recurring boolean DEFAULT false,
  recurring_pattern jsonb, -- Store recurring rules as JSON
  parent_appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Analytics and tracking
  cancellation_reason text,
  no_show_probability decimal(3,2), -- 0.00 to 1.00
  
  -- Communication tracking
  reminder_sent boolean DEFAULT false,
  confirmation_sent boolean DEFAULT false,
  feedback_requested boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments(start_time, end_time);

-- =====================================================
-- 2. CONTACTS MANAGEMENT TABLE
-- =====================================================

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
  contact_frequency integer DEFAULT 30, -- Days between contacts
  vip boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, email) -- Prevent duplicate emails per user
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact);

-- =====================================================
-- 3. USER SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Working hours configuration
  working_hours_start time DEFAULT '09:00',
  working_hours_end time DEFAULT '17:00',
  working_days integer[] DEFAULT '{1,2,3,4,5}', -- 0=Sunday, 1=Monday, etc.
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

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =====================================================
-- 4. APPOINTMENT ANALYTICS TABLE (Optional)
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Analytics data
  booking_lead_time interval, -- How far in advance was it booked
  modification_count integer DEFAULT 0,
  reminder_count integer DEFAULT 0,
  client_response_time interval, -- How quickly client responds
  
  -- Outcome tracking
  actual_duration interval,
  satisfaction_score integer CHECK (satisfaction_score BETWEEN 1 AND 5),
  follow_up_required boolean DEFAULT false,
  
  -- Timestamps
  recorded_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_analytics ENABLE ROW LEVEL SECURITY;

-- Appointments policies
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments" ON appointments
  FOR DELETE USING (auth.uid() = user_id);

-- Contacts policies
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON appointment_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON appointment_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. UTILITY FUNCTIONS
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Insert default user settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 8. HELPFUL VIEWS
-- =====================================================

-- View for upcoming appointments
CREATE OR REPLACE VIEW upcoming_appointments AS
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
  AND a.status IN ('scheduled', 'confirmed')
ORDER BY a.start_time;

-- View for appointment statistics
CREATE OR REPLACE VIEW appointment_stats AS
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
-- SETUP COMPLETE!
-- =====================================================

-- Verify tables were created successfully
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename IN ('appointments', 'contacts', 'user_settings', 'appointment_analytics')
ORDER BY tablename;
