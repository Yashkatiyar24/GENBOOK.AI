-- Insert valid Razorpay plans into Supabase
INSERT INTO plans (name, price, interval, razorpay_plan_id)
VALUES
  ('Professional', 999, 'monthly', 'plan_professional_xyz123'),
  ('Enterprise', 2999, 'monthly', 'plan_enterprise_abc456');
