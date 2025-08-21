-- Create a function to execute SQL statements safely
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error executing SQL: %. %', SQLERRM, query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
