-- Enhanced Database Schema for GENBOOK.AI
-- This script adds all necessary tables and functions for the comprehensive appointment management system

-- Create user_profiles table (if not exists)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  address text,
  date_of_birth date,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_number text,
  medical_conditions text,
  allergies text,
  preferred_language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_settings table (if not exists)
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notification_settings jsonb DEFAULT '{
    "email_appointments": true,
    "email_reminders": true,
    "email_updates": false,
    "sms_appointments": false,
    "sms_reminders": true,
    "push_appointments": true,
    "push_reminders": true,
    "reminder_timing": 60
  }',
  ai_preferences jsonb DEFAULT '{}',
  working_hours jsonb DEFAULT '{
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday": {"start": "10:00", "end": "14:00", "enabled": false},
    "sunday": {"start": "10:00", "end": "14:00", "enabled": false}
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create family_members table (if not exists)
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date NOT NULL,
  phone text,
  email text,
  medical_conditions text,
  allergies text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Check if appointments table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
        CREATE TABLE appointments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            title text NOT NULL,
            description text,
            start_time timestamptz NOT NULL,
            end_time timestamptz NOT NULL,
            date date GENERATED ALWAYS AS (DATE(start_time)) STORED,
            time time GENERATED ALWAYS AS (TIME(start_time)) STORED,
            duration integer GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time))/60) STORED,
            status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no-show')),
            priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
            appointment_type text DEFAULT 'in-person' CHECK (appointment_type IN ('in-person', 'video', 'phone')),
            doctor_name text,
            doctor_specialty text,
            location text,
            instructions text,
            buffer_before integer DEFAULT 0,
            buffer_after integer DEFAULT 0,
            reminder_time integer,
            recurring_pattern jsonb,
            no_show_probability decimal(3,2) DEFAULT 0.0,
            rating integer CHECK (rating >= 1 AND rating <= 5),
            feedback text,
            prescription text,
            visit_summary text,
            diagnosis text,
            next_appointment_date date,
            cancellation_reason text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;
END $$;

-- Add new columns to existing appointments table if they don't exist
DO $$ 
BEGIN
    -- Add date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'date') THEN
        ALTER TABLE appointments ADD COLUMN date date GENERATED ALWAYS AS (DATE(start_time)) STORED;
    END IF;
    
    -- Add time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'time') THEN
        ALTER TABLE appointments ADD COLUMN time time GENERATED ALWAYS AS (TIME(start_time)) STORED;
    END IF;
    
    -- Add duration column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'duration') THEN
        ALTER TABLE appointments ADD COLUMN duration integer GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time))/60) STORED;
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'priority') THEN
        ALTER TABLE appointments ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
    END IF;
    
    -- Add appointment_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_type') THEN
        ALTER TABLE appointments ADD COLUMN appointment_type text DEFAULT 'in-person' CHECK (appointment_type IN ('in-person', 'video', 'phone'));
    END IF;
    
    -- Add doctor_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'doctor_name') THEN
        ALTER TABLE appointments ADD COLUMN doctor_name text;
    END IF;
    
    -- Add doctor_specialty column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctor_specialty' AND column_name = 'doctor_specialty') THEN
        ALTER TABLE appointments ADD COLUMN doctor_specialty text;
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'location') THEN
        ALTER TABLE appointments ADD COLUMN location text;
    END IF;
    
    -- Add instructions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'instructions') THEN
        ALTER TABLE appointments ADD COLUMN instructions text;
    END IF;
    
    -- Add buffer_before column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'buffer_before') THEN
        ALTER TABLE appointments ADD COLUMN buffer_before integer DEFAULT 0;
    END IF;
    
    -- Add buffer_after column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'buffer_after') THEN
        ALTER TABLE appointments ADD COLUMN buffer_after integer DEFAULT 0;
    END IF;
    
    -- Add reminder_time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'reminder_time') THEN
        ALTER TABLE appointments ADD COLUMN reminder_time integer;
    END IF;
    
    -- Add recurring_pattern column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'recurring_pattern') THEN
        ALTER TABLE appointments ADD COLUMN recurring_pattern jsonb;
    END IF;
    
    -- Add no_show_probability column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'no_show_probability') THEN
        ALTER TABLE appointments ADD COLUMN no_show_probability decimal(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'rating') THEN
        ALTER TABLE appointments ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);
    END IF;
    
    -- Add feedback column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'feedback') THEN
        ALTER TABLE appointments ADD COLUMN feedback text;
    END IF;
    
    -- Add prescription column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'prescription') THEN
        ALTER TABLE appointments ADD COLUMN prescription text;
    END IF;
    
    -- Add visit_summary column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'visit_summary') THEN
        ALTER TABLE appointments ADD COLUMN visit_summary text;
    END IF;
    
    -- Add diagnosis column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'diagnosis') THEN
        ALTER TABLE appointments ADD COLUMN diagnosis text;
    END IF;
    
    -- Add next_appointment_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'next_appointment_date') THEN
        ALTER TABLE appointments ADD COLUMN next_appointment_date date;
    END IF;
    
    -- Add cancellation_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE appointments ADD COLUMN cancellation_reason text;
    END IF;
    
    -- Update status column constraint if it exists
    BEGIN
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
        ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'));
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- Create contacts table for contact management
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  title text,
  tags text[],
  notes text,
  last_contact_date timestamptz,
  follow_up_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointment_analytics table for AI insights
CREATE TABLE IF NOT EXISTS appointment_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  scheduling_time timestamptz NOT NULL,
  time_to_appointment interval,
  cancellation_lead_time interval,
  reschedule_count integer DEFAULT 0,
  actual_duration integer,
  satisfaction_score decimal(2,1),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for family_members
DROP POLICY IF EXISTS "Users can manage own family members" ON family_members;
CREATE POLICY "Users can manage own family members" ON family_members FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for contacts
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for appointment_analytics
DROP POLICY IF EXISTS "Users can view own analytics" ON appointment_analytics;
CREATE POLICY "Users can view own analytics" ON appointment_analytics FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_analytics_user_id ON appointment_analytics(user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for demo purposes (optional - comment out if not needed)
/*
INSERT INTO appointments (user_id, title, description, start_time, end_time, status, priority, appointment_type, doctor_name, doctor_specialty, location)
VALUES 
  (auth.uid(), 'Annual Check-up', 'Routine health examination', '2024-02-15 10:00:00', '2024-02-15 11:00:00', 'scheduled', 'medium', 'in-person', 'Dr. Sarah Johnson', 'General Medicine', 'Medical Center Building A'),
  (auth.uid(), 'Dental Cleaning', 'Regular dental hygiene appointment', '2024-02-20 14:30:00', '2024-02-20 15:30:00', 'confirmed', 'low', 'in-person', 'Dr. Michael Chen', 'Dentistry', 'Dental Clinic 2nd Floor'),
  (auth.uid(), 'Cardiology Consultation', 'Follow-up for heart condition', '2024-02-25 09:00:00', '2024-02-25 10:00:00', 'scheduled', 'high', 'video', 'Dr. Emily Rodriguez', 'Cardiology', 'Virtual Meeting');
*/

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced database schema setup completed successfully!';
    RAISE NOTICE 'Tables created/updated: user_profiles, user_settings, family_members, appointments (enhanced), contacts, appointment_analytics';
    RAISE NOTICE 'All RLS policies and triggers are in place.';
    RAISE NOTICE 'You can now use the comprehensive appointment management features.';
END $$;
