import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, X, Building, User, Mail, Phone, Loader2, AlertCircle } from 'lucide-react';
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

// Enhanced User Details Modal Component
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
            setUserDetails({
              fullName: user.user_metadata?.full_name || '',
              email: user.email || '',
              phone: user.user_metadata?.phone || '',
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

  const validateForm = () => {
    const newErrors: Partial<UserDetails> = {};
    
    if (!userDetails.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!userDetails.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(userDetails.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!userDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(userDetails.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
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

  if (!isOpen) return null;

  const effectiveAmount = billingCycle === 'annual' ? (selectedPlan?.price || 0) * 10 : selectedPlan?.price || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Upgrade to {selectedPlan?.name}
              </h2>
              <p className="text-3xl font-bold text-blue-400 mt-1">
                {formatPaise(effectiveAmount)}
                <span className="text-sm font-normal text-gray-400">
                  /{billingCycle === 'annual' ? 'year' : 'month'}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Plan Summary */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-white mb-2">Plan Summary</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">{selectedPlan?.name} Plan</span>
              <span className="font-semibold text-white">
                {formatPaise(effectiveAmount)}/{billingCycle === 'annual' ? 'year' : 'month'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <User size={16} />
                Full Name *
              </label>
              <input
                type="text"
                value={userDetails.fullName}
                onChange={(e) => setUserDetails({ ...userDetails, fullName: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.fullName ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Mail size={16} />
                Email *
              </label>
              <input
                type="email"
                value={userDetails.email}
                onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Phone size={16} />
                Phone Number *
              </label>
              <input
                type="tel"
                value={userDetails.phone}
                onChange={(e) => setUserDetails({ ...userDetails, phone: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Company/Organization */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Building size={16} />
                Company/Organization (Optional)
              </label>
              <input
                type="text"
                value={userDetails.company}
                onChange={(e) => setUserDetails({ ...userDetails, company: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your company name"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
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
    </div>
  );
};

// Success Modal Component
const SuccessModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  amount: string;
}> = ({ isOpen, onClose, planName, amount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          
          <p className="text-gray-600 mb-4">
            Welcome to the {planName} plan! Your subscription is now active.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Amount Paid</p>
            <p className="text-xl font-bold text-gray-900">{amount}</p>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            A confirmation email has been sent to your registered email address.
          </p>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Modal Component
const ErrorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  error: string;
  onRetry: () => void;
}> = ({ isOpen, onClose, error, onRetry }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-700">
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Payment Failed
          </h2>
          
          <p className="text-gray-300 mb-6">
            {error}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BillingView: React.FC<BillingViewProps> = ({ user: _user }) => {
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('starter');
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [lastError, setLastError] = useState<string>('');

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
    
    if (plan.id === currentPlan) {
      toast.info(`You are already on the ${plan.name} plan`);
      return;
    }
    
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
      // Prefer proxy (/api). If a VITE_API_BASE_URL is provided, use that instead (helps when proxy is misconfigured)
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL_2 || '/api';
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment processor. Please try again.');
      }

      // Compute effective plan id and amount depending on billing cycle
      const effectivePlanId = billingCycle === 'annual' ? `${selectedPlan.id}_annual` : selectedPlan.id;
      // Backend PLAN_CONFIG already has correct annual prices, so use the plan ID to get the right amount
      const effectiveAmount = billingCycle === 'annual' ? selectedPlan.price * 10 : selectedPlan.price;
      // Create order on backend
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { 'Authorization': `Bearer ${session.access_token}` }
            : { ...(import.meta.env.DEV ? { 'X-Skip-Auth': 'true', 'X-Mock-Razorpay': 'true' } : {}) }
          )
        },
        body: JSON.stringify({
          planId: effectivePlanId,
          amount: effectiveAmount,
          userDetails: userDetails
        })
      });

      if (!response.ok) {
        // Try to parse error response as JSON, fallback to text
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const responseClone = response.clone();
          const errorData = await responseClone.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            console.error('Failed to parse error response:', textError);
          }
        }
        throw new Error(errorMessage);
      }
      
      // Try to parse successful response as JSON
      let orderData;
      try {
        orderData = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        const responseText = await response.text();
        console.error('Response text:', responseText);
        throw new Error('Invalid response from server');
      }

      // Configure Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
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
            const verifyResponse = await fetch(`${apiBase}/razorpay/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token
                  ? { 'Authorization': `Bearer ${session.access_token}` }
                  : { ...(import.meta.env.DEV ? { 'X-Skip-Auth': 'true', 'X-Mock-Razorpay': 'true' } : {}) }
                )
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
              // Try to parse error response as JSON, fallback to text
              let errorMessage = `Payment verification failed: ${verifyResponse.status} ${verifyResponse.statusText}`;
              try {
                const errorData = await verifyResponse.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
              } catch (parseError) {
                try {
                  const errorText = await verifyResponse.text();
                  if (errorText) {
                    errorMessage = errorText;
                  }
                } catch (textError) {
                  console.error('Failed to parse verification error response:', textError);
                }
              }
              throw new Error(errorMessage);
            }

            // Try to parse successful response as JSON
            let result;
            try {
              result = await verifyResponse.json();
            } catch (parseError) {
              console.error('Failed to parse verification response as JSON:', parseError);
              const responseText = await verifyResponse.text();
              console.error('Verification response text:', responseText);
              throw new Error('Invalid response from payment verification');
            }
            
            // Close user details modal and show success
            setShowUserDetailsModal(false);
            setShowSuccessModal(true);
            
            // Update local state
            setCurrentPlan(selectedPlan.id);
            await fetchCurrentSubscription();
            
            toast.success('Payment successful! Welcome to your new plan.');
            
          } catch (error: any) {
            console.error('Payment verification error:', error);
            setLastError(error.message || 'Payment verification failed');
            setShowErrorModal(true);
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setIsLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        setLastError(response.error.description || 'Payment failed');
        setShowErrorModal(true);
        setIsLoading(false);
      });
      
      rzp.open();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setLastError(error.message || 'Failed to process payment');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setShowErrorModal(false);
    setShowUserDetailsModal(true);
  };

  const getCurrentPlan = () => plans.find(plan => plan.id === currentPlan) || plans[0];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
        <p className="text-gray-300">Choose the perfect plan for your needs</p>
      </div>

      {/* Current Plan Status */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-300">Current Plan</h2>
            <p className="text-blue-200">{getCurrentPlan().name} Plan</p>
            {subscription && (
              <p className="text-sm text-blue-300">
                Expires: {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800 rounded-lg p-1 border border-gray-700">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Annual
            <span className="ml-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isCurrentPlan = plan.id === currentPlan;
          const isUpgrade = plan.price > (getCurrentPlan().price || 0);
          const isPopular = plan.id === 'professional';
          
          // Different gradient backgrounds for each plan
          const getGradientClass = () => {
            if (plan.id === 'starter') return 'bg-gradient-to-br from-gray-800 to-gray-900';
            if (plan.id === 'professional') return 'bg-gradient-to-br from-blue-600 to-blue-800';
            if (plan.id === 'enterprise') return 'bg-gradient-to-br from-purple-600 to-purple-800';
            return 'bg-gradient-to-br from-gray-800 to-gray-900';
          };
          
          return (
            <div
              key={plan.id}
              className={`relative ${getGradientClass()} border rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                isCurrentPlan ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-gray-600'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </span>
                </div>
              )}
              
              {isCurrentPlan && !isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-white mb-1">
                  {displayPriceFor(plan, billingCycle)}
                </div>
                {plan.price === 0 && (
                  <p className="text-sm text-gray-300">Forever free</p>
                )}
                {plan.id === 'professional' && (
                  <p className="text-sm text-blue-200 mt-1">For growing businesses</p>
                )}
                {plan.id === 'enterprise' && (
                  <p className="text-sm text-purple-200 mt-1">For large organizations</p>
                )}
                {plan.id === 'starter' && (
                  <p className="text-sm text-gray-300 mt-1">Get started at no cost</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgradeClick(plan)}
                disabled={isCurrentPlan || isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isCurrentPlan
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : isUpgrade
                    ? plan.id === 'professional' 
                      ? 'bg-white text-blue-600 hover:bg-gray-100 font-bold'
                      : plan.id === 'enterprise'
                      ? 'bg-white text-purple-600 hover:bg-gray-100 font-bold'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {isCurrentPlan ? 'Current Plan' : isUpgrade ? 'Upgrade →' : 'Downgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <UserDetailsModal
        isOpen={showUserDetailsModal}
        onClose={() => setShowUserDetailsModal(false)}
        selectedPlan={selectedPlan}
        onSubmit={handleUserDetailsSubmit}
        isLoading={isLoading}
        billingCycle={billingCycle}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        planName={selectedPlan?.name || ''}
        amount={selectedPlan ? formatPaise(billingCycle === 'annual' ? selectedPlan.price * 10 : selectedPlan.price) : ''}
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        error={lastError}
        onRetry={handleRetry}
      />
    </div>
  );
};

export default BillingView;