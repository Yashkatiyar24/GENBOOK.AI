import React, { useState } from "react";

const MODAL_BG = "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]"; // GenBook.AI dark theme

type RazorpayModalProps = {
  open: boolean;
  onClose: () => void;
  plan: { name: string; price: number; interval: string };
  user?: { name: string; email: string; contact?: string } | null;
};

export default function RazorpayModal({ open, onClose, plan, user }: RazorpayModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#18181B] rounded-2xl shadow-xl p-8 w-full max-w-4xl flex flex-col items-center">
        <div className="flex justify-center mb-8">
          <button className="px-4 py-2 rounded-lg bg-[#23232A] text-white mr-2">Monthly</button>
          <button className="px-4 py-2 rounded-lg bg-[#23232A] text-white">Annual</button>
        </div>
        <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
          {/* Free Plan */}
          <div className="bg-[#1A1A1F] rounded-xl p-6 flex-1 flex flex-col items-start">
            <h2 className="text-white text-2xl font-bold mb-2">Free</h2>
            <p className="text-white text-4xl font-bold mb-2">Free</p>
            <p className="text-gray-400 mb-4">Get started at no cost</p>
            <ul className="mb-6 space-y-2">
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Basic scheduling</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Email reminders</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> 1 team member</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Community support</li>
            </ul>
            <button className="w-full py-2 rounded-lg bg-[#23232A] text-white font-semibold">Start Free →</button>
          </div>
          {/* Professional Plan */}
          <div className="bg-[#181A2A] rounded-xl p-6 flex-1 flex flex-col items-start border-2 border-blue-500 shadow-lg relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">Most Popular</div>
            <h2 className="text-white text-2xl font-bold mb-2">Professional</h2>
            <p className="text-white text-4xl font-bold mb-2">$29 <span className="text-lg font-normal">/month</span></p>
            <p className="text-gray-400 mb-4">For growing businesses</p>
            <ul className="mb-6 space-y-2">
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Unlimited appointments</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Advanced chatbot (1000 messages/mo)</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Team collaboration (up to 5 users)</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Custom branding</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Priority support</li>
            </ul>
            <button className="w-full py-2 rounded-lg bg-blue-500 text-white font-semibold">Upgrade to Professional →</button>
          </div>
          {/* Enterprise Plan */}
          <div className="bg-[#2A1A2A] rounded-xl p-6 flex-1 flex flex-col items-start">
            <h2 className="text-white text-2xl font-bold mb-2">Enterprise</h2>
            <p className="text-white text-4xl font-bold mb-2">$99 <span className="text-lg font-normal">/month</span></p>
            <p className="text-gray-400 mb-4">For large organizations</p>
            <ul className="mb-6 space-y-2">
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Everything in Professional</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Unlimited team members</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> Advanced analytics</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> API access</li>
              <li className="flex items-center text-green-400"><span className="mr-2">✔</span> 24/7 phone support</li>
            </ul>
            <button className="w-full py-2 rounded-lg bg-[#23232A] text-white font-semibold">Contact Sales →</button>
          </div>
        </div>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl" onClick={onClose}>&times;</button>
      </div>
    </div>
  );
}
