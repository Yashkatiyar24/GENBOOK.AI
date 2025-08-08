import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log(`Received webhook event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }
})

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Get organization by Stripe customer ID
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (orgError || !org) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  // Update organization subscription status
  const { error: updateOrgError } = await supabase
    .from('organizations')
    .update({
      subscription_status: subscription.status,
      subscription_plan: subscription.items.data[0]?.price?.nickname || 'starter',
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id)

  if (updateOrgError) {
    console.error('Error updating organization:', updateOrgError)
    return
  }

  // Upsert subscription record
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      organization_id: org.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      plan_name: subscription.items.data[0]?.price?.nickname || 'starter',
      plan_amount: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.currency,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'stripe_subscription_id'
    })

  if (subError) {
    console.error('Error upserting subscription:', subError)
  }

  console.log(`Subscription updated for organization ${org.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Get organization by Stripe customer ID
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (orgError || !org) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  // Update organization to cancelled status
  const { error: updateOrgError } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'cancelled',
      subscription_plan: 'starter', // Downgrade to starter
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id)

  if (updateOrgError) {
    console.error('Error updating organization:', updateOrgError)
    return
  }

  // Update subscription record
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (subError) {
    console.error('Error updating subscription:', subError)
  }

  console.log(`Subscription cancelled for organization ${org.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Get organization by Stripe customer ID
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (orgError || !org) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  // Record successful payment
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      organization_id: org.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      description: invoice.description || `Payment for ${invoice.lines.data[0]?.description}`,
      created_at: new Date().toISOString()
    })

  if (paymentError) {
    console.error('Error recording payment:', paymentError)
  }

  console.log(`Payment succeeded for organization ${org.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Get organization by Stripe customer ID
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (orgError || !org) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  // Update organization status to past_due
  const { error: updateOrgError } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id)

  if (updateOrgError) {
    console.error('Error updating organization:', updateOrgError)
  }

  // Record failed payment
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      organization_id: org.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: invoice.description || `Failed payment for ${invoice.lines.data[0]?.description}`,
      created_at: new Date().toISOString()
    })

  if (paymentError) {
    console.error('Error recording payment:', paymentError)
  }

  console.log(`Payment failed for organization ${org.id}`)
}
