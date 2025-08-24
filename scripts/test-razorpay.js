import Razorpay from 'razorpay';
import 'dotenv/config';

(async () => {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    console.log('Using RAZORPAY_KEY_ID set?', !!key_id);
    console.log('Using RAZORPAY_KEY_SECRET set?', !!key_secret);
    if (!key_id || !key_secret) throw new Error('Missing Razorpay credentials in env');

    const rzp = new Razorpay({ key_id, key_secret });
    // Create a small order (1 INR = 100 paise)
    const order = await rzp.orders.create({ amount: 100, currency: 'INR', receipt: `test_${Date.now()}` });
    console.log('Order created:', order.id, order.amount, order.currency);
  } catch (err) {
    console.error('Razorpay test error:', err && (err.message || err));
    process.exit(1);
  }
})();
