-- Phase 1: Recurring, Waitlist, Group Appointments, Basic Analytics Aggregates
-- Safe, idempotent migration for Supabase (Postgres)

-- 1) Recurring series table
CREATE TABLE IF NOT EXISTS recurring_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid,
  title text,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  rule jsonb NOT NULL, -- iCal-like or custom: {freq: 'weekly', interval: 1, byDay: ['MO','WE']}
  timezone text DEFAULT 'UTC',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- series index
CREATE INDEX IF NOT EXISTS idx_recurring_series_tenant ON recurring_series(tenant_id);

-- 2) Appointments references to series and group settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='series_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN series_id uuid REFERENCES recurring_series(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='max_attendees'
  ) THEN
    ALTER TABLE appointments ADD COLUMN max_attendees int CHECK (max_attendees >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='attendee_count'
  ) THEN
    ALTER TABLE appointments ADD COLUMN attendee_count int DEFAULT 1 CHECK (attendee_count >= 0);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_appointments_series_id ON appointments(series_id);

-- 3) Group appointment attendees pivot
CREATE TABLE IF NOT EXISTS appointment_attendees (
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (appointment_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_attendees_tenant ON appointment_attendees(tenant_id);

-- 4) Waitlist
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contact_id uuid,
  name text,
  email text,
  phone text,
  desired_start timestamptz,
  desired_end timestamptz,
  notes text,
  priority int DEFAULT 0, -- higher = more urgent
  status text DEFAULT 'open', -- open|promoted|closed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant ON waitlist_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);

-- 5) RLS enablement (mirrors existing style)
ALTER TABLE recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Simple RLS: tenant isolation
DROP POLICY IF EXISTS "tenant_select_recurring_series" ON recurring_series;
CREATE POLICY "tenant_select_recurring_series" ON recurring_series
  FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
DROP POLICY IF EXISTS "tenant_modify_recurring_series" ON recurring_series;
CREATE POLICY "tenant_modify_recurring_series" ON recurring_series
  FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS "tenant_select_attendees" ON appointment_attendees;
CREATE POLICY "tenant_select_attendees" ON appointment_attendees
  FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
DROP POLICY IF EXISTS "tenant_modify_attendees" ON appointment_attendees;
CREATE POLICY "tenant_modify_attendees" ON appointment_attendees
  FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS "tenant_select_waitlist" ON waitlist_entries;
CREATE POLICY "tenant_select_waitlist" ON waitlist_entries
  FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
DROP POLICY IF EXISTS "tenant_modify_waitlist" ON waitlist_entries;
CREATE POLICY "tenant_modify_waitlist" ON waitlist_entries
  FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

-- 6) Helper view for analytics v1 (appointment counts per day)
CREATE OR REPLACE VIEW v_appointment_counts_daily AS
SELECT 
  tenant_id,
  date_trunc('day', start_time) AS day,
  count(*) AS appointment_count
FROM appointments
GROUP BY tenant_id, date_trunc('day', start_time);
