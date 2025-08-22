import React, { useState, useEffect } from 'react'
import RazorpayModal from '../components/RazorpayModal'
import { supabase } from '../utils/supabaseClient'

const plans = [
  { id: 1, name: 'Professional', price: 999, interval: 'month' },
  { id: 2, name: 'Enterprise', price: 2999, interval: 'month' }
]

export default function Pricing() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null)
  const [user, setUser] = useState<{ id: string, name: string, email: string, contact?: string } | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          id: user.id,
          name: user.user_metadata?.name || '',
          email: user.email || '',
          contact: user.user_metadata?.phone || ''
        })
      } else {
        setUser(null)
      }
    }
    getUser()
  }, [])

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan)
    setModalOpen(true)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[#00bfff]">Choose Your Plan</h1>
      <div className="flex gap-6 flex-wrap">
        {plans.map(plan => (
          <div key={plan.id} className="bg-[#181f2a] rounded-xl shadow p-6 w-full max-w-xs text-white">
            <h2 className="text-xl font-semibold mb-2 text-[#00bfff]">{plan.name}</h2>
            <p className="mb-4 text-lg font-medium">
              <span className="text-white">₹{plan.price}</span>
              <span className="text-gray-400"> / {plan.interval}</span>
            </p>
            <button
              className="w-full py-2 rounded bg-[#00bfff] text-white font-semibold text-lg hover:bg-[#0099cc] transition"
              onClick={() => handleSelectPlan(plan)}
            >
              Select Plan
            </button>
          </div>
        ))}
      </div>
      {selectedPlan && modalOpen && (
        <RazorpayModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          plan={selectedPlan}
          user={user}
        />
      )}
    </div>
  )
}
