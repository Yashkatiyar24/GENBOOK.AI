import React, { useEffect, useState } from 'react'

export default function Dashboard() {
  const [subscriptionStatus, setSubscriptionStatus] = useState('free')
  const [plan, setPlan] = useState('')
  const [renewalDate, setRenewalDate] = useState('')

  useEffect(() => {
    // TODO: Fetch user subscription status, plan, renewal date from Supabase
    // setSubscriptionStatus(...)
    // setPlan(...)
    // setRenewalDate(...)
  }, [])

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Current Plan: {plan || 'Free'}</p>
      <p>Subscription Status: {subscriptionStatus}</p>
      {renewalDate && <p>Renewal Date: {renewalDate}</p>}
    </div>
  )
}
