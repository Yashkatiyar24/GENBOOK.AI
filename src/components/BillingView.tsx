import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, X, Building, User, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabase';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  razorpayPlanId?: string;
}

interface UserDetails {
  fullName: string;
  email: string;
  phone: string;
  company: string;
}

interface BillingViewProps {
  user: any;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    interval: 'month',
    features: [
      'Up to 50 appointments/month',
      'Basic chatbot (100 messages/month)',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
  price: 2900, // ₹29.00 in paise (monthly)
    interval: 'month',
    features: [
      'Unlimited appointments',
      'Advanced chatbot (1000 messages/month)',
      'Team collaboration (up to 5 users)',
      'Custom branding',
      'Priority support'
    ],
  razorpayPlanId: import.meta.env.VITE_RAZORPAY_PROFESSIONAL_PLAN_ID
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9900, // ₹99.00 in paise
    interval: 'month',
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Advanced analytics',
      'API access',
      '24/7 phone support'
    ],
  razorpayPlanId: import.meta.env.VITE_RAZORPAY_ENTERPRISE_PLAN_ID
  }
];

// Format paise (integer) as INR currency string
const formatPaise = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price / 100);
};

const displayPriceFor = (plan: Plan | null, cycle: 'monthly' | 'annual') => {
  if (!plan) return '';
  return cycle === 'monthly' ? `${formatPaise(plan.price)}/month` : `${formatPaise(plan.price * 10)}/year`;
};

// User Details Modal Component
const UserDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: Plan | null;
  onSubmit: (details: UserDetails) => void;
  isLoading: boolean;
  billingCycle: 'monthly' | 'annual';
}> = ({ isOpen, onClose, selectedPlan, onSubmit, isLoading, billingCycle }) => {
  const [userDetails, setUserDetails] = useState<UserDetails>({
    fullName: '',
    email: '',
    phone: '',
    company: ''
  });
  const [errors, setErrors] = useState<Partial<UserDetails>>({});

  useEffect(() => {
    if (isOpen) {
      // Pre-fill with user data if available
      const fetchUserData = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name, phone')
              .eq('user_id', user.id)
              .single();
            
            setUserDetails({
              fullName: profile?.full_name || user.user_metadata?.full_name || '',
              email: user.email || '',
              phone: profile?.phone || user.user_metadata?.phone || '',
              company: user.user_metadata?.company || ''
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      fetchUserData();
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<UserDetails> = {};
    
    if (!userDetails.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!userDetails.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userDetails.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!userDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s\-()]{10,}$/.test(userDetails.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(userDetails);
    }
  };

  // use top-level formatter directly

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] border border-cyan-500/20 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-cyan-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Upgrade to {selectedPlan?.name}
              </h2>
              <p className="text-gray-400 mt-1">
                {selectedPlan && displayPriceFor(selectedPlan, billingCycle)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <User className="w-4 h-4 mr-2 text-cyan-400" />
              Full Name *
            </label>
            <input
              type="text"
              value={userDetails.fullName}
              onChange={(e) => setUserDetails(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              placeholder="Enter your full name"
            />
            {errors.fullName && <p className="text-red-400 text-sm">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <Mail className="w-4 h-4 mr-2 text-cyan-400" />
              Email *
            </label>
            <input
              type="email"
              value={userDetails.email}
              onChange={(e) => setUserDetails(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <Phone className="w-4 h-4 mr-2 text-cyan-400" />
              Phone Number *
            </label>
            <input
              type="tel"
              value={userDetails.phone}
              onChange={(e) => setUserDetails(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              placeholder="Enter your phone number"
            />
            {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
          </div>

          {/* Company (Optional) */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <Building className="w-4 h-4 mr-2 text-cyan-400" />
              Company/Organization (Optional)
            </label>
            <input
              type="text"
              value={userDetails.company}
              onChange={(e) => setUserDetails(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              placeholder="Enter your company name"
            />
          </div>

          {/* Plan Summary */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mt-6">
            <h3 className="text-cyan-400 font-medium mb-2">Plan Summary</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">{selectedPlan?.name} Plan</span>
              <span className="text-white font-bold">
                {selectedPlan && displayPriceFor(selectedPlan, billingCycle)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 bg-black/50 hover:bg-black/70 border border-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BillingView: React.FC<BillingViewProps> = ({ user: _user }) => {
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('starter');
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (subscription) {
          setCurrentPlan(subscription.plan || 'starter');
          setSubscription(subscription);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleUpgradeClick = (plan: Plan) => {
    if (plan.id === 'starter') {
      toast.info('You are already on the Starter plan');
      return;
    }
  // mark plan selection with current billing cycle
  setSelectedPlan(plan);
  setShowUserDetailsModal(true);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUserDetailsSubmit = async (userDetails: UserDetails) => {
    if (!selectedPlan) return;

    setIsLoading(true);
    
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay. Please try again.');
      }

      // Compute effective plan id and amount depending on billing cycle
      const effectivePlanId = billingCycle === 'annual' ? `${selectedPlan.id}_annual` : selectedPlan.id;
      const effectiveAmount = billingCycle === 'annual' ? selectedPlan.price * 10 : selectedPlan.price; // annual = 10x monthly

      // Create order on backend
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          planId: effectivePlanId,
          amount: effectiveAmount,
          userDetails: userDetails
        })
      });

      if (!response.ok) {
        // Capture server response for debugging (try JSON first, fallback to text)
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const data = await response.clone().json();
          console.error('create-order response JSON:', data);
          if (data?.message) errorMessage = data.message;
          else if (data?.error) errorMessage = data.error;
        } catch (e) {
          try {
            const text = await response.clone().text();
            console.error('create-order response text:', text);
            if (text) errorMessage = text;
          } catch {}
        }

        // Show server-provided message in UI during development to aid debugging
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      
      const orderData = await response.json();

  // Configure Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GENBOOK.AI',
        description: `${selectedPlan.name} Plan Subscription`,
        order_id: orderData.id,
        prefill: {
          name: userDetails.fullName,
          email: userDetails.email,
          contact: userDetails.phone,
        },
        notes: {
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          company: userDetails.company
        },
        theme: {
          color: '#06b6d4'
        },
        handler: async function (response: any) {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planId: selectedPlan.id,
                userDetails: userDetails
              })
            });

            if (!verifyResponse.ok) {
                // Try to extract server error details
                let vmsg = `Payment verification failed (${verifyResponse.status})`;
                try {
                  const vdata = await verifyResponse.clone().json();
                  console.error('verify-payment response JSON:', vdata);
                  if (vdata?.message) vmsg = vdata.message;
                  else if (vdata?.error) vmsg = vdata.error;
                } catch {
                  try {
                    const vtxt = await verifyResponse.clone().text();
                    console.error('verify-payment response text:', vtxt);
                    if (vtxt) vmsg = vtxt;
                  } catch {}
                }
                toast.error(vmsg);
                throw new Error(vmsg);
            }

            const result = await verifyResponse.json();
            
            if (result.success) {
              toast.success('Payment successful! Your subscription has been upgraded.');
              setShowUserDetailsModal(false);
              setSelectedPlan(null);
              fetchCurrentSubscription();
            } else {
              throw new Error(result.message || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error.message || 'Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
            toast.info('Payment cancelled');
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new (window as any).Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast.error(response.error.description || 'Payment failed');
        setIsLoading(false);
      });

      rzp.open();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    // price is stored in paise (integer). Convert to rupees for display.
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
          <p className="text-gray-400">Manage your subscription and billing details</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 p-1 border border-white/10">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${billingCycle === 'monthly' ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${billingCycle === 'annual' ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:text-white'}`}
            >
              Annual
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-400 font-medium">Secure Payments</span>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
        <h2 className="text-xl font-semibold text-white mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-cyan-400 capitalize">{currentPlan}</p>
            <p className="text-gray-400">
              {currentPlan === 'starter' ? 'Free plan' : (
                (() => {
                  const cp = plans.find(p => p.id === currentPlan);
                  return cp ? `${formatPrice(cp.price)}/${cp.interval}` : 'Paid plan';
                })()
              )}
            </p>
            {subscription?.status && (
              <p className="text-sm text-gray-500 mt-1">
                Status: <span className="text-green-400 capitalize">{subscription.status}</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-400" size={20} />
            <span className="text-green-400 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-black/20 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 ${
                plan.name === 'Professional' 
                  ? 'border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                  : 'border-cyan-500/10 hover:border-cyan-500/20'
              }`}
            >
              {plan.name === 'Professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
                    POPULAR
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-2">
                  {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-cyan-400">Free</span>
                    ) : (
                      <>
                        {/* Display monthly or annual price. Annual price defaults to 10x monthly */}
                        <span className="text-3xl font-bold text-white">
                          {billingCycle === 'monthly' ? formatPrice(plan.price) : formatPrice(plan.price * 10)}
                        </span>
                        <span className="text-gray-400">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                      </>
                    )}
                </div>
                <p className="text-gray-400 text-sm">
                  {plan.name === 'Starter' ? 'Perfect for getting started' :
                   plan.name === 'Professional' ? 'For growing businesses' :
                   'For large organizations'}
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="text-green-400 mr-3 mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleUpgradeClick(plan)}
                disabled={currentPlan === plan.id || isLoading}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                  currentPlan === plan.id 
                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                    : plan.name === 'Professional'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                    : plan.name === 'Enterprise'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {currentPlan === plan.id ? 'Current Plan' : 
                 plan.name === 'Starter' ? 'Current Plan' :
                 `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={showUserDetailsModal}
        onClose={() => {
          setShowUserDetailsModal(false);
          setSelectedPlan(null);
          setIsLoading(false);
        }}
        selectedPlan={selectedPlan}
        onSubmit={handleUserDetailsSubmit}
  isLoading={isLoading}
  billingCycle={billingCycle}
      />
    </div>
  );
};

// Declare Razorpay global
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default BillingView;