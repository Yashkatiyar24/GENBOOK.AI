-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- in paise (smallest currency unit)
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_interval TEXT NOT NULL, -- 'month' or 'year'
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription_plans
CREATE POLICY "Enable read access for all users" 
ON public.subscription_plans
FOR SELECT USING (true);

-- Insert default plans if they don't exist
INSERT INTO public.subscription_plans (id, name, description, price, currency, billing_interval, features, is_active)
VALUES 
  ('free', 'Free', 'Basic plan with limited features', 0, 'INR', 'month', '["Up to 50 appointments/month", "Basic chatbot (100 messages/month)", "Email support"]'::jsonb, true),
  ('professional', 'Professional', 'For professionals and small teams', 2900, 'INR', 'month', '["Unlimited appointments", "Advanced chatbot (1000 messages/month)", "Team collaboration (up to 5 users)", "Custom branding", "Priority support", "voice_commands"]'::jsonb, true),
  ('enterprise', 'Enterprise', 'For large organizations', 9900, 'INR', 'month', '["Unlimited appointments", "Unlimited chatbot messages", "Unlimited team members", "Custom branding", "24/7 priority support", "Dedicated account manager", "voice_commands"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'unpaid', etc.
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  razorpay_subscription_id TEXT,
  razorpay_payment_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canceled_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to handle subscription updates
CREATE OR REPLACE FUNCTION public.handle_subscription_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's profile with the current plan
  UPDATE public.profiles
  SET 
    subscription_plan = NEW.plan_id,
    subscription_status = NEW.status,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update user profile when subscription changes
CREATE TRIGGER on_subscription_updated
AFTER INSERT OR UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_updated();

-- Create a function to get the current user's subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription()
RETURNS JSONB AS $$
DECLARE
  subscription_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan_id', us.plan_id,
    'status', us.status,
    'current_period_start', us.current_period_start,
    'current_period_end', us.current_period_end,
    'cancel_at_period_end', us.cancel_at_period_end,
    'plan_details', jsonb_build_object(
      'name', sp.name,
      'price', sp.price,
      'currency', sp.currency,
      'billing_interval', sp.billing_interval,
      'features', sp.features
    )
  ) INTO subscription_data
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = auth.uid()
  AND us.status = 'active'
  ORDER BY us.current_period_end DESC
  LIMIT 1;
  
  RETURN subscription_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
