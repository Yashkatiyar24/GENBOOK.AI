-- Quick Database Setup for GENBOOK.AI
-- Copy and paste this entire script into your Supabase SQL Editor and run it

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled',
    priority TEXT DEFAULT 'medium',
    color TEXT DEFAULT '#3b82f6',
    location TEXT,
    meeting_link TEXT,
    attendees TEXT[],
    tags TEXT[],
    notes TEXT,
    attachments TEXT[],
    buffer_before INTEGER DEFAULT 0,
    buffer_after INTEGER DEFAULT 0,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern JSONB,
    parent_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    cancellation_reason TEXT,
    no_show_probability DECIMAL(3,2) DEFAULT 0.1,
    reminder_sent BOOLEAN DEFAULT FALSE,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    feedback_requested BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    tags TEXT[],
    notes TEXT,
    avatar_url TEXT,
    last_contact TIMESTAMPTZ,
    contact_frequency INTEGER DEFAULT 30,
    vip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '17:00',
    working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    timezone TEXT DEFAULT 'UTC',
    default_buffer_before INTEGER DEFAULT 15,
    default_buffer_after INTEGER DEFAULT 15,
    default_appointment_duration INTEGER DEFAULT 60,
    notification_preferences JSONB DEFAULT '{"email_reminders": true, "sms_reminders": false, "push_notifications": true, "reminder_times": [1440, 60, 15]}',
    ai_preferences JSONB DEFAULT '{"auto_suggest_times": true, "smart_scheduling": true, "no_show_prediction": true, "auto_reminders": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for appointments
CREATE POLICY "Users can manage their own appointments" ON appointments
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for contacts
CREATE POLICY "Users can manage their own contacts" ON contacts
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
