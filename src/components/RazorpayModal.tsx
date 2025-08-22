
import React, { useState } from "react";

const MODAL_BG = "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]"; // GenBook.AI dark theme

type RazorpayModalProps = {
  open: boolean;
  onClose: () => void;
  plan: { name: string; price: number; interval: string };
  user?: { name: string; email: string; contact?: string } | null;
  onSuccess?: () => void;
};

export default function RazorpayModal({ open, onClose, plan, user, onSuccess }: RazorpayModalProps) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.contact || "");
  const [countryCode, setCountryCode] = useState("+91");
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!name || !email || !phone) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // 1. Create order on backend
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price * 100, // Convert to paise
          currency: "INR",
          receipt: `order_${Date.now()}`,
          notes: {
            plan: plan.name,
            customer_name: name,
            customer_email: email,
            customer_phone: countryCode + phone
          }
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create order');
      }

      const order = await res.json();

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "GenBook.AI",
        description: `${plan.name} Plan Subscription`,
        order_id: order.id,
        prefill: {
          name: name,
          email: email,
          contact: countryCode + phone,
        },
        theme: { color: "#00bfff" },
        handler: async function (response: any) {
          try {
            // 3. Verify payment on backend
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan: plan.name
              }),
            });

            if (verifyRes.ok) {
              alert("Payment successful! Your subscription has been upgraded.");
              onSuccess?.();
              onClose();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert("Payment completed but verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      alert("Payment failed. Please try again.");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${MODAL_BG} bg-opacity-80`}>
      <div className="bg-[#181f2a] rounded-xl shadow-lg p-8 w-full max-w-md relative text-white">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        {/* Modal Content */}
        <h2 className="text-2xl font-bold mb-2 text-[#e40046]">Contact Details</h2>
        <div className="space-y-4 mb-4">
          <input
            type="text"
            className="w-full px-4 py-2 rounded bg-[#23293a] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00bfff]"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            type="email"
            className="w-full px-4 py-2 rounded bg-[#23293a] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00bfff]"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
              className="px-2 py-2 rounded bg-[#23293a] text-white border border-gray-700 focus:outline-none"
              style={{ minWidth: 80 }}
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              {/* Add more country codes as needed */}
            </select>
            <input
              type="tel"
              className="w-full px-4 py-2 rounded bg-[#23293a] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00bfff]"
              placeholder="Phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              maxLength={10}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
            Notify me with offers and updates
          </label>
        </div>
        <h2 className="text-xl font-bold mb-2 text-[#e40046]">Order Summary</h2>
        <div className="flex items-center gap-4 mb-2">
          <img src="/vite.svg" alt="Plan" className="w-12 h-12 rounded" />
          <div>
            <div className="font-semibold">{plan.name} Plan</div>
            <div className="text-sm">Qty: 1</div>
          </div>
        </div>
        <div className="mb-4">
          <strong>Price: ₹{plan.price}</strong>
        </div>
        <button
          className="mt-2 w-full py-2 rounded bg-[#e40046] text-white font-semibold text-lg hover:bg-[#c2003a] transition"
          onClick={handlePayment}
          disabled={loading || !name || !email || !phone}
        >
          {loading ? "Processing..." : "Continue"}
        </button>
        <div className="mt-4 text-center text-xs text-gray-400">
          Secured by <span className="font-bold text-[#0d6efd]">Razorpay Magic</span>
        </div>
      </div>
    </div>
  );
}
