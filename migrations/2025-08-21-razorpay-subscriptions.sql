-- Supabase migration for Razorpay plans and subscriptions

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  interval TEXT NOT NULL, -- 'monthly', 'yearly'
  razorpay_plan_id TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id INTEGER REFERENCES plans(id),
  razorpay_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- 'active', 'cancelled', 'pending'
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
