-- GENBOOK.AI SaaS Database Setup - Complete Schema
-- This file contains the complete database schema for the SaaS version
-- Run this on a fresh Supabase project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
            appointment_date date,
            appointment_time time,
            duration_minutes integer,
            status text DEFAULT 'scheduled',
            priority text DEFAULT 'medium',
            appointment_type text DEFAULT 'in-person',
            doctor_name text,
            doctor_specialty text,
            location text,
            instructions text,
            buffer_before integer DEFAULT 0,
            buffer_after integer DEFAULT 0,
            reminder_time integer,
            recurring_pattern jsonb,
            no_show_probability decimal(3,2) DEFAULT 0.0,
            rating integer,
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
    -- Add appointment_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_date') THEN
        ALTER TABLE appointments ADD COLUMN appointment_date date;
    END IF;
    
    -- Add appointment_time column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_time') THEN
        ALTER TABLE appointments ADD COLUMN appointment_time time;
    END IF;
    
    -- Add duration_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'duration_minutes') THEN
        ALTER TABLE appointments ADD COLUMN duration_minutes integer;
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'priority') THEN
        ALTER TABLE appointments ADD COLUMN priority text DEFAULT 'medium';
    END IF;
    
    -- Add appointment_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_type') THEN
        ALTER TABLE appointments ADD COLUMN appointment_type text DEFAULT 'in-person';
    END IF;
    
    -- Add doctor_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'doctor_name') THEN
        ALTER TABLE appointments ADD COLUMN doctor_name text;
    END IF;
    
    -- Add doctor_specialty column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'doctor_specialty') THEN
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
        ALTER TABLE appointments ADD COLUMN rating integer;
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
END $$;

-- Add constraints after all columns are created
DO $$
BEGIN
    -- Add status constraint
    BEGIN
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
        ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'));
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    -- Add priority constraint
    BEGIN
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_priority_check;
        ALTER TABLE appointments ADD CONSTRAINT appointments_priority_check CHECK (priority IN ('low', 'medium', 'high'));
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    -- Add appointment_type constraint
    BEGIN
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check;
        ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (appointment_type IN ('in-person', 'video', 'phone'));
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    -- Add rating constraint
    BEGIN
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_rating_check;
        ALTER TABLE appointments ADD CONSTRAINT appointments_rating_check CHECK (rating >= 1 AND rating <= 5);
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- Create function to update appointment date/time fields automatically
CREATE OR REPLACE FUNCTION update_appointment_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Update appointment_date and appointment_time from start_time using proper PostgreSQL syntax
    NEW.appointment_date := NEW.start_time::date;
    NEW.appointment_time := NEW.start_time::time;
    
    -- Update duration_minutes from start_time and end_time
    IF NEW.end_time IS NOT NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/60;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update appointment fields
DROP TRIGGER IF EXISTS update_appointment_fields_trigger ON appointments;
CREATE TRIGGER update_appointment_fields_trigger 
    BEFORE INSERT OR UPDATE ON appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_appointment_fields();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_analytics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on appointments table if not already enabled
DO $$
BEGIN
    ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

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

-- Create RLS policies for appointments (if not exist)
DROP POLICY IF EXISTS "Users can manage own appointments" ON appointments;
CREATE POLICY "Users can manage own appointments" ON appointments FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
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

-- Update existing appointments to populate new fields with correct PostgreSQL syntax
UPDATE appointments 
SET 
    appointment_date = start_time::date,
    appointment_time = start_time::time,
    duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time))/60
WHERE appointment_date IS NULL OR appointment_time IS NULL OR duration_minutes IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced database schema setup completed successfully!';
    RAISE NOTICE 'Tables created/updated: user_profiles, user_settings, family_members, appointments (enhanced), contacts, appointment_analytics';
    RAISE NOTICE 'All RLS policies and triggers are in place.';
    RAISE NOTICE 'Automatic field updates enabled for appointments.';
    RAISE NOTICE 'You can now use the comprehensive appointment management features.';
END $$;

-- ========================================
-- SAAS MULTITENANCY SCHEMA ADDITION
-- ========================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#06B6D4', -- Default cyan color
    subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, cancelled, past_due
    subscription_plan VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create subscriptions table for billing
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- active, cancelled, past_due, etc.
    plan_name VARCHAR(100) NOT NULL,
    plan_amount INTEGER NOT NULL, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount INTEGER NOT NULL, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- succeeded, failed, pending
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create user roles and team management
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'viewer');

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'staff',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 5. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'staff',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- 6. Create bot_settings table for chatbot customization
CREATE TABLE IF NOT EXISTS bot_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bot_name VARCHAR(100) DEFAULT 'GENBOOK Assistant',
    welcome_message TEXT DEFAULT 'Hi! I''m your GENBOOK Assistant. I can help you book appointments, check availability, or answer questions about the platform. How can I help you today?',
    primary_color VARCHAR(7) DEFAULT '#06B6D4',
    is_enabled BOOLEAN DEFAULT true,
    monthly_message_limit INTEGER DEFAULT 1000,
    messages_used_this_month INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- 7. Add organization_id to existing tables
DO $$
BEGIN
    -- Add organization_id column to user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE user_profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add organization_id column to appointments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'organization_id') THEN
        ALTER TABLE appointments ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add organization_id column to contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'organization_id') THEN
        ALTER TABLE contacts ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add organization_id column to user_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'organization_id') THEN
        ALTER TABLE user_settings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add organization_id column to family_members
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'family_members' AND column_name = 'organization_id') THEN
        ALTER TABLE family_members ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_bot_settings_org_id ON bot_settings(organization_id);

-- Add indexes to existing tables for organization_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_org_id ON user_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_family_members_org_id ON family_members(organization_id);

-- 9. Update RLS policies for tenant isolation

-- Organizations RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Organization members RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization members" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can manage members" ON organization_members
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Subscriptions RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization subscription" ON subscriptions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Payments RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization payments" ON payments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Invitations RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization admins can manage invitations" ON invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Bot settings RLS
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization bot settings" ON bot_settings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can update bot settings" ON bot_settings
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Create functions for organization management

-- Function to create a new organization and make user admin
CREATE OR REPLACE FUNCTION create_organization_with_admin(
    org_name TEXT,
    org_slug TEXT,
    user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Insert new organization
    INSERT INTO organizations (name, slug)
    VALUES (org_name, org_slug)
    RETURNING id INTO new_org_id;
    
    -- Add user as admin
    INSERT INTO organization_members (organization_id, user_id, role, joined_at)
    VALUES (new_org_id, user_id, 'admin', NOW());
    
    -- Create default bot settings
    INSERT INTO bot_settings (organization_id)
    VALUES (new_org_id);
    
    RETURN new_org_id;
END;
$$;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        om.role
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = get_user_organization.user_id;
END;
$$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    required_role user_role,
    user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM organization_members
    WHERE organization_members.user_id = user_has_permission.user_id;
    
    -- Admin has all permissions
    IF user_role_val = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Staff can do staff and viewer actions
    IF user_role_val = 'staff' AND required_role IN ('staff', 'viewer') THEN
        RETURN TRUE;
    END IF;
    
    -- Viewer can only do viewer actions
    IF user_role_val = 'viewer' AND required_role = 'viewer' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 11. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_settings_updated_at BEFORE UPDATE ON bot_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_organization_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission TO authenticated;

-- Final setup message
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'GENBOOK.AI SaaS SETUP COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Multitenancy: Organizations, roles, and tenant isolation enabled';
    RAISE NOTICE 'Billing: Stripe integration tables created';
    RAISE NOTICE 'Team Management: Invitations and role-based access ready';
    RAISE NOTICE 'Bot Settings: Per-tenant chatbot customization available';
    RAISE NOTICE 'Next Steps: Configure Stripe webhooks and deploy frontend';
    RAISE NOTICE '=========================================';
END $$;
