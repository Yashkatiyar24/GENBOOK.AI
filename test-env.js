// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '*** (exists but hidden for security)' : 'Not set');

// Test Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client created successfully');
  
  // Test a simple query
  supabase
    .from('subscription_plans')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.error('Error fetching subscription plans:', error);
      } else {
        console.log('Subscription plans:', data);
      }
    });
} else {
  console.error('Missing Supabase environment variables');
}
