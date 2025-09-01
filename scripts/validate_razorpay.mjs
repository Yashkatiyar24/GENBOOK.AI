import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import fetch from 'node-fetch';

dotenv.config({ path: process.cwd() + '/.env' });

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

(async () => {
  try {
    console.log('Running Razorpay SDK order.create test (no secrets will be printed)');
    const order = await razorpay.orders.create({ amount: 100, currency: 'INR', receipt: `validate_${Date.now()}` });
    console.log('ORDER_OK', { id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    try {
      console.error('ORDER_ERROR', err && err.statusCode ? { statusCode: err.statusCode, error: err.error || err } : err);
    } catch (e) {
      console.error('ORDER_ERROR', err);
    }
  }

  // Now try the local create-order endpoint (uses server code path)
  try {
    console.log('\nCalling local create-order endpoint at http://localhost:4005/api/razorpay/create-order');
    const resp = await fetch('http://localhost:4005/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Skip-Auth': '1' },
      body: JSON.stringify({ planId: 'professional', amount: 2900, userDetails: { fullName: 'Validator', email: 'val@example.com', phone: '9999999999' } })
    });
    const text = await resp.text();
    console.log('LOCAL_RESP_STATUS', resp.status);
    console.log('LOCAL_RESP_BODY', text);
  } catch (err) {
    console.error('LOCAL_REQ_ERROR', err);
  }
})();
