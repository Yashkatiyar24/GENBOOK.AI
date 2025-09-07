-- Appointment Monthly Usage Counter
-- Creates a lightweight aggregate table that stores per-organization monthly appointment counts.
-- Safe to run multiple times: uses IF NOT EXISTS guards.

-- 1. Table to store monthly counts
CREATE TABLE IF NOT EXISTS appointment_usage_monthly (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL, -- 1-12
  appointment_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, year, month)
);

-- 2. Helper function to increment on insert
CREATE OR REPLACE FUNCTION increment_appointment_monthly_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM NEW.created_at);
  v_month int := EXTRACT(MONTH FROM NEW.created_at);
BEGIN
  IF NEW.organization_id IS NULL THEN
    -- Skip if no organization context (can extend later for personal usage)
    RETURN NEW;
  END IF;

  INSERT INTO appointment_usage_monthly (organization_id, year, month, appointment_count)
  VALUES (NEW.organization_id, v_year, v_month, 1)
  ON CONFLICT (organization_id, year, month)
  DO UPDATE SET 
    appointment_count = appointment_usage_monthly.appointment_count + 1,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper function to decrement on delete (keeps counts accurate if an appointment is removed)
CREATE OR REPLACE FUNCTION decrement_appointment_monthly_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM OLD.created_at);
  v_month int := EXTRACT(MONTH FROM OLD.created_at);
BEGIN
  IF OLD.organization_id IS NULL THEN
    RETURN OLD;
  END IF;

  UPDATE appointment_usage_monthly
     SET appointment_count = GREATEST(appointment_count - 1, 0),
         updated_at = now()
   WHERE organization_id = OLD.organization_id
     AND year = v_year
     AND month = v_month;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger creation (idempotent: drop & recreate for latest logic)
DROP TRIGGER IF EXISTS trg_increment_appointment_monthly_usage ON appointments;
CREATE TRIGGER trg_increment_appointment_monthly_usage
AFTER INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION increment_appointment_monthly_usage();

DROP TRIGGER IF EXISTS trg_decrement_appointment_monthly_usage ON appointments;
CREATE TRIGGER trg_decrement_appointment_monthly_usage
AFTER DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION decrement_appointment_monthly_usage();

-- 5. Backfill existing data (optional; guarded to avoid double counting)
DO $$
BEGIN
  -- Only backfill if table is empty
  IF NOT EXISTS (SELECT 1 FROM appointment_usage_monthly) THEN
    INSERT INTO appointment_usage_monthly (organization_id, year, month, appointment_count)
    SELECT organization_id,
           EXTRACT(YEAR FROM created_at)::int AS year,
           EXTRACT(MONTH FROM created_at)::int AS month,
           COUNT(*)::int AS appointment_count
    FROM appointments
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id, year, month;
  END IF;
END $$;

-- 6. RLS (optional) - mirror organization_id policies
ALTER TABLE appointment_usage_monthly ENABLE ROW LEVEL SECURITY;
-- Allow org members to read their usage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='appointment_usage_monthly' AND policyname='Org members view usage') THEN
    CREATE POLICY "Org members view usage" ON appointment_usage_monthly
      FOR SELECT USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- (Optional) expose a helper view for current month usage
CREATE OR REPLACE VIEW v_current_month_appointment_usage AS
SELECT organization_id,
       appointment_count,
       year,
       month
FROM appointment_usage_monthly
WHERE year = EXTRACT(YEAR FROM now())::int
  AND month = EXTRACT(MONTH FROM now())::int;

-- Done.
