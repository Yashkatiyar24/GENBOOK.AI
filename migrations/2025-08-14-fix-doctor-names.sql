-- Migration to fix and standardize doctor names in existing appointments
-- This will update all existing appointments to have properly formatted doctor names

-- First, create a function to clean up doctor names
CREATE OR REPLACE FUNCTION clean_doctor_name(name text) 
RETURNS text AS $$
DECLARE
  cleaned_name text;
BEGIN
  IF name IS NULL OR name = '' THEN
    RETURN NULL;
  END IF;
  
  -- Clean up the doctor name - remove 'with', 'Dr.', and trim whitespace
  cleaned_name := regexp_replace(name, '^(with|dr\.?|\s)+', '', 'i');
  cleaned_name := regexp_replace(cleaned_name, '\s+', ' ', 'g');
  cleaned_name := trim(cleaned_name);
  
  -- Capitalize first letter of each word
  SELECT string_agg(
    upper(substring(word, 1, 1)) || 
    lower(substring(word, 2)), 
    ' '
  ) INTO cleaned_name
  FROM unnest(string_to_array(cleaned_name, ' ')) as word;
  
  -- Add 'Dr.' prefix if not already present
  IF cleaned_name !~* '^dr\.?\s' THEN
    RETURN 'Dr. ' || cleaned_name;
  ELSE
    RETURN 'Dr. ' || regexp_replace(cleaned_name, '^dr\.?\s*', '', 'i');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update all existing appointments with the cleaned doctor names
UPDATE appointments
SET 
  doctor_name = clean_doctor_name(doctor_name),
  updated_at = NOW()
WHERE 
  doctor_name IS NOT NULL 
  AND doctor_name != '' 
  AND doctor_name != clean_doctor_name(doctor_name);

-- Drop the function if not needed anymore
-- DROP FUNCTION IF EXISTS clean_doctor_name(text);
