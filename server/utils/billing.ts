import Stripe from 'stripe';
import { supabase } from '../supabase.js';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.warn('[billing] STRIPE_SECRET_KEY is not set; billing routes will not function.');
}
export const stripe = stripeSecret ? new Stripe(stripeSecret) : (undefined as unknown as Stripe);

export async function getOrCreateCustomer(tenantId: string, email?: string) {
  // Look up existing customer by tenant mapping in subscriptions or orgs table if exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .neq('stripe_customer_id', null)
    .limit(1)
    .single();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id as string;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { tenantId },
  });

  // Upsert into subscriptions row with customer id (no subscription yet)
  await supabase
    .from('subscriptions')
    .upsert({
      tenant_id: tenantId,
      stripe_customer_id: customer.id,
      status: 'no_subscription',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });

  return customer.id;
}

export async function upsertSubscriptionFromEvent(tenantId: string, sub: Stripe.Subscription) {
  const s: any = sub as any;
  const planPriceId = (s.items?.data?.[0]?.price?.id) || null;
  const status = s.status;
  const current_period_start = s.current_period_start ? new Date(s.current_period_start * 1000).toISOString() : null;
  const current_period_end = s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null;

  await supabase
    .from('subscriptions')
    .upsert({
      tenant_id: tenantId,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      status,
      plan: planPriceId,
      current_period_start,
      current_period_end,
      canceled_at: s.canceled_at ? new Date(s.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });
}

export async function recordInvoicePayment(tenantId: string, invoice: Stripe.Invoice) {
  await supabase.from('payments').insert({
    tenant_id: tenantId,
    stripe_invoice_id: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
    hosted_invoice_url: invoice.hosted_invoice_url,
    created_at: new Date().toISOString(),
  });
}
