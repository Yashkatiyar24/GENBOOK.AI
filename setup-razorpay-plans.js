import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: './server/.env' });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Plan configurations
const plans = [
  {
    name: 'Professional Monthly',
    identifier: 'professional_monthly',
  amount: 2900, // ₹29.00
    currency: 'INR',
    interval: 'monthly',
    description: 'Professional plan with monthly billing',
  },
  {
    name: 'Enterprise Monthly',
    identifier: 'enterprise_monthly',
    amount: 9900, // ₹99.00
    currency: 'INR',
    interval: 'monthly',
    description: 'Enterprise plan with monthly billing',
  },
  {
    name: 'Professional Yearly',
    identifier: 'professional_yearly',
  amount: 29000, // ₹290.00 (equivalent to ~₹24.17/month)
    currency: 'INR',
    interval: 'yearly',
    description: 'Professional plan with yearly billing (2 months free)',
  },
  {
    name: 'Enterprise Yearly',
    identifier: 'enterprise_yearly',
    amount: 99000, // ₹990.00 (equivalent to ~₹82.50/month)
    currency: 'INR',
    interval: 'yearly',
    description: 'Enterprise plan with yearly billing (2 months free)',
  }
];

async function createPlans() {
  const results = [];
  
  for (const plan of plans) {
    try {
      const response = await razorpay.plans.create({
        period: plan.interval === 'monthly' ? 'monthly' : 'yearly',
        interval: 1,
        item: {
          name: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          description: plan.description,
        },
        notes: {
          identifier: plan.identifier,
          description: plan.description,
        },
      });
      
      console.log(`✅ Created ${plan.name} plan:`, response.id);
      results.push({
        name: plan.name,
        id: response.id,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        identifier: plan.identifier
      });
    } catch (error) {
      console.error(`❌ Error creating ${plan.name} plan:`, error.message);
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log('🚀 Setting up Razorpay plans...');
    const createdPlans = await createPlans();
    
    // Generate .env.local content
    const envContent = createdPlans
      .map(plan => {
        const varName = `VITE_RAZORPAY_PLAN_${plan.identifier.toUpperCase()}`;
        return `${varName}=${plan.id}`;
      })
      .join('\n');
    
    // Write to .env.local
    fs.writeFileSync('.env.local', envContent, { flag: 'a' });
    
    console.log('\n✅ Successfully created plans and updated .env.local');
    console.log('\n📋 Created plans:', JSON.stringify(createdPlans, null, 2));
    console.log('\n🔑 Added plan IDs to .env.local');
    
  } catch (error) {
    console.error('❌ Error setting up plans:', error.message);
    process.exit(1);
  }
}

main();
