// Debug script to check environment variables
console.log('=== Environment Variables Debug ===');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present (hidden for security)' : 'Missing');
console.log('All VITE_ variables:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

// Test if variables are properly loaded
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL is missing!');
} else {
  console.log('✅ VITE_SUPABASE_URL is present');
}

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is missing!');
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY is present');
}
