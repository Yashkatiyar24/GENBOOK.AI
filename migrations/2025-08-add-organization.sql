-- Migration: Add Organizations and Multitenancy Support
-- Date: 2025-08-09
-- Description: Transform GENBOOK.AI into SaaS with multitenancy, billing, and team features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
-- Add organization_id column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id column to family_members
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

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

-- Update existing table RLS policies to include organization_id

-- Drop existing policies and recreate with organization_id
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can view profiles in their organization" ON user_profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Appointments policies
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;

CREATE POLICY "Users can view appointments in their organization" ON appointments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert appointments in their organization" ON appointments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own appointments" ON appointments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own appointments" ON appointments
    FOR DELETE USING (user_id = auth.uid());

-- Contacts policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

CREATE POLICY "Users can view contacts in their organization" ON contacts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert contacts in their organization" ON contacts
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own contacts" ON contacts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (user_id = auth.uid());

-- User settings policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;

CREATE POLICY "Users can view settings in their organization" ON user_settings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (user_id = auth.uid());

-- Family members policies
DROP POLICY IF EXISTS "Users can view their own family members" ON family_members;
DROP POLICY IF EXISTS "Users can insert their own family members" ON family_members;
DROP POLICY IF EXISTS "Users can update their own family members" ON family_members;
DROP POLICY IF EXISTS "Users can delete their own family members" ON family_members;

CREATE POLICY "Users can view family members in their organization" ON family_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert family members in their organization" ON family_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own family members" ON family_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own family members" ON family_members
    FOR DELETE USING (user_id = auth.uid());

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

-- 12. Insert default data for existing users (migration helper)
-- This will create a default organization for existing users
DO $$
DECLARE
    user_record RECORD;
    new_org_id UUID;
BEGIN
    -- For each existing user without an organization
    FOR user_record IN 
        SELECT DISTINCT u.id, u.email, up.full_name
        FROM auth.users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN organization_members om ON u.id = om.user_id
        WHERE om.user_id IS NULL
    LOOP
        -- Create organization for user
        SELECT create_organization_with_admin(
            COALESCE(user_record.full_name, 'My Organization'),
            LOWER(REPLACE(COALESCE(user_record.full_name, user_record.email), ' ', '-')) || '-' || SUBSTRING(user_record.id::TEXT, 1, 8),
            user_record.id
        ) INTO new_org_id;
        
        -- Update existing user data with organization_id
        UPDATE user_profiles SET organization_id = new_org_id WHERE user_id = user_record.id;
        UPDATE appointments SET organization_id = new_org_id WHERE user_id = user_record.id;
        UPDATE contacts SET organization_id = new_org_id WHERE user_id = user_record.id;
        UPDATE user_settings SET organization_id = new_org_id WHERE user_id = user_record.id;
        UPDATE family_members SET organization_id = new_org_id WHERE user_id = user_record.id;
    END LOOP;
END $$;

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_organization_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission TO authenticated;

COMMENT ON TABLE organizations IS 'Organizations/tenants in the SaaS platform';
COMMENT ON TABLE subscriptions IS 'Stripe subscription data for billing';
COMMENT ON TABLE payments IS 'Payment transaction history';
COMMENT ON TABLE organization_members IS 'Users belonging to organizations with roles';
COMMENT ON TABLE invitations IS 'Pending invitations to join organizations';
COMMENT ON TABLE bot_settings IS 'Chatbot customization settings per organization';
