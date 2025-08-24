import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load project root .env
dotenv.config({ path: join(process.cwd(), '.env') });

const app = express();
app.use(bodyParser.json());

// Import the razorpay router
import('../server/routes/razorpay.ts').then(({ default: razorpayRouter }) => {
  app.use('/api/razorpay', razorpayRouter);

  const server = app.listen(4005, () => {
    console.log('Test razorpay router running on http://localhost:4005');
  });
}).catch(err => {
  console.error('Failed to import razorpay router:', err);
  process.exit(1);
});
