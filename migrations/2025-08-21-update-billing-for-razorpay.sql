-- Update subscriptions table for Razorpay
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
  ALTER COLUMN status SET DEFAULT 'inactive';

-- Rename payments table to payment_history for clarity
ALTER TABLE IF EXISTS public.payments RENAME TO payment_history;

-- Add Razorpay-specific columns to payments table
ALTER TABLE public.payment_history
  RENAME COLUMN stripe_invoice_id TO razorpay_payment_id;

ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS method TEXT,
  ADD COLUMN IF NOT EXISTS bank TEXT,
  ADD COLUMN IF NOT EXISTS wallet TEXT,
  ADD COLUMN IF NOT EXISTS vpa TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS contact TEXT;

-- Update RLS policies
DROP POLICY IF EXISTS subs_tenant_isolation ON public.subscriptions;
CREATE POLICY subs_tenant_isolation ON public.subscriptions
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Add index for Razorpay subscription ID
CREATE INDEX IF NOT EXISTS subscriptions_razorpay_id_idx ON public.subscriptions(razorpay_subscription_id);

-- Add index for payment lookups
CREATE INDEX IF NOT EXISTS payment_razorpay_id_idx ON public.payment_history(razorpay_payment_id);

-- Update subscriptions table to make razorpay_subscription_id unique
ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_razorpay_id_key UNIQUE (razorpay_subscription_id);

-- Update payment_history table to make razorpay_payment_id unique
ALTER TABLE public.payment_history 
  ADD CONSTRAINT payment_razorpay_id_key UNIQUE (razorpay_payment_id);
