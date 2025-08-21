import React from 'react'

export default function RazorpayCheckout({ subscriptionId }: { subscriptionId: string }) {
  React.useEffect(() => {
    const options = {
      key: process.env.RAZORPAY_KEY_ID || '',
      subscription_id: subscriptionId,
      name: 'GENBOOK.AI',
      handler: function (response: any) {
        // TODO: Call verify-payment Edge Function
      }
    }
    // @ts-ignore
    const rzp = new window.Razorpay(options)
    rzp.open()
  }, [subscriptionId])
  return null
}
