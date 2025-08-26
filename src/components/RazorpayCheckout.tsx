import React from 'react'

type RazorpayCheckoutProps = {
  subscriptionId: string
  user: {
    id: string
    name: string
    email: string
    contact?: string
  }
}

export default function RazorpayCheckout(props: RazorpayCheckoutProps) {
  const { subscriptionId, user } = props
  React.useEffect(() => {
    if (!subscriptionId) return
    if (!user) return
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
      subscription_id: subscriptionId,
      name: 'GENBOOK.AI',
      handler: async function (response: any) {
        // Call verify-payment Edge Function
        const res = await fetch('/functions/v1/razorpay-verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
            userId: user.id
          })
        })
        const data = await res.json()
        if (data.success) {
          alert('Payment successful! Subscription activated.')
        } else {
          alert('Payment verification failed.')
        }
      },
      theme: { color: '#00bfff' }
    }
    // @ts-ignore
    const rzp = new window.Razorpay(options)
    rzp.open()
  }, [subscriptionId])
  return null
}
