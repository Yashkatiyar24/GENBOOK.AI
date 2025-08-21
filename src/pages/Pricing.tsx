import React, { useState, useEffect } from 'react'
import RazorpayCheckout from '../components/RazorpayCheckout'
import { supabase } from '../utils/supabaseClient'

const plans = [
  { id: 1, name: 'Professional', price: 999, interval: 'monthly' },
  { id: 2, name: 'Enterprise', price: 2999, interval: 'monthly' }
]

export default function Pricing() {
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [])

  const handleSubscribe = async (planId: number) => {
    setSelectedPlan(planId)
    if (!userId) {
      alert('You must be logged in to subscribe.')
      return
    }
    // Call Edge Function to create Razorpay subscription
    const res = await fetch('/functions/v1/razorpay-create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, userId })
    })
    const data = await res.json()
    if (data && data.id) {
      setSubscriptionId(data.id)
    } else {
      alert('Failed to create subscription')
    }
  }

  return (
    <div>
      <h1>Choose Your Plan</h1>
      {plans.map(plan => (
        <div key={plan.id} style={{border: '1px solid #eee', padding: 16, marginBottom: 16}}>
          <h2>{plan.name}</h2>
          <p>₹{plan.price} / {plan.interval}</p>
          <button onClick={() => handleSubscribe(plan.id)}>Subscribe</button>
        </div>
      ))}
      {subscriptionId && <RazorpayCheckout subscriptionId={subscriptionId} />}
    </div>
  )
}
