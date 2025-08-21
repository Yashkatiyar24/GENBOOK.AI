// Check environment configuration
console.log('=== Environment Configuration ===');
console.log('VITE_RAZORPAY_KEY_ID:', process.env.VITE_RAZORPAY_KEY_ID || 'Not set');
console.log('VITE_BACKEND_URL:', process.env.VITE_BACKEND_URL || 'Not set');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID || 'Not set');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '***' : 'Not set');
console.log('RAZORPAY_WEBHOOK_SECRET:', process.env.RAZORPAY_WEBHOOK_SECRET ? '***' : 'Not set');

// Check Razorpay plan IDs
const planVars = [
  'VITE_RAZORPAY_PLAN_PROFESSIONAL',
  'VITE_RAZORPAY_PLAN_ENTERPRISE',
  'VITE_RAZORPAY_PLAN_PROFESSIONAL_MONTHLY',
  'VITE_RAZORPAY_PLAN_ENTERPRISE_MONTHLY',
  'VITE_RAZORPAY_PLAN_PROFESSIONAL_YEARLY',
  'VITE_RAZORPAY_PLAN_ENTERPRISE_YEARLY'
];

console.log('\n=== Razorpay Plan IDs ===');
planVars.forEach(varName => {
  console.log(`${varName}:`, process.env[varName] || 'Not set');
});
