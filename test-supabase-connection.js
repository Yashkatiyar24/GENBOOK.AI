// Test Supabase connection
console.log('Testing Supabase connection...');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables');
  process.exit(1);
}

// Try to import supabase
import('@supabase/supabase-js').then(({ createClient }) => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test a simple query
  supabase
    .from('appointments')
    .select('*')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('Supabase query error:', error);
        process.exit(1);
      }
      console.log('Supabase connection successful!');
      console.log('Sample data:', data);
      process.exit(0);
    });
}).catch(err => {
  console.error('Error importing supabase:', err);
  process.exit(1);
});
