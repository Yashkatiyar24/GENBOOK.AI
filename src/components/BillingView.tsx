import React, { useEffect, useState } from 'react';
<<<<<<< HEAD
import { CreditCard, CheckCircle, X, Building, User, Mail, Phone, Loader2, AlertCircle } from 'lucide-react';
=======
import { CreditCard, CheckCircle, X, Building, User, Mail, Phone } from 'lucide-react';
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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
<<<<<<< HEAD
    price: 2900, // ₹29.00 in paise (monthly)
=======
  price: 2900, // ₹29.00 in paise (monthly)
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
    interval: 'month',
    features: [
      'Unlimited appointments',
      'Advanced chatbot (1000 messages/month)',
      'Team collaboration (up to 5 users)',
      'Custom branding',
      'Priority support'
    ],
<<<<<<< HEAD
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PROFESSIONAL_PLAN_ID
=======
  razorpayPlanId: import.meta.env.VITE_RAZORPAY_PROFESSIONAL_PLAN_ID
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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
<<<<<<< HEAD
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_ENTERPRISE_PLAN_ID
=======
  razorpayPlanId: import.meta.env.VITE_RAZORPAY_ENTERPRISE_PLAN_ID
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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

<<<<<<< HEAD
// Enhanced User Details Modal Component
=======
// User Details Modal Component
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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
<<<<<<< HEAD
            setUserDetails({
              fullName: user.user_metadata?.full_name || '',
              email: user.email || '',
              phone: user.user_metadata?.phone || '',
=======
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name, phone')
              .eq('user_id', user.id)
              .single();
            
            setUserDetails({
              fullName: profile?.full_name || user.user_metadata?.full_name || '',
              email: user.email || '',
              phone: profile?.phone || user.user_metadata?.phone || '',
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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

<<<<<<< HEAD
  const validateForm = () => {
=======
  const validateForm = (): boolean => {
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
    const newErrors: Partial<UserDetails> = {};
    
    if (!userDetails.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!userDetails.email.trim()) {
      newErrors.email = 'Email is required';
<<<<<<< HEAD
    } else if (!/\S+@\S+\.\S+/.test(userDetails.email)) {
=======
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userDetails.email)) {
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!userDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
<<<<<<< HEAD
    } else if (!/^[6-9]\d{9}$/.test(userDetails.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
=======
    } else if (!/^[+]?[\d\s\-()]{10,}$/.test(userDetails.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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

<<<<<<< HEAD
  if (!isOpen) return null;

  const effectiveAmount = billingCycle === 'annual' ? (selectedPlan?.price || 0) * 10 : selectedPlan?.price || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Upgrade to {selectedPlan?.name}
              </h2>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {formatPaise(effectiveAmount)}
                <span className="text-sm font-normal text-gray-500">
                  /{billingCycle === 'annual' ? 'year' : 'month'}
                </span>
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
              </p>
            </div>
            <button
              onClick={onClose}
<<<<<<< HEAD
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Plan Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Plan Summary</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">{selectedPlan?.name} Plan</span>
              <span className="font-semibold text-gray-900">
                {formatPaise(effectiveAmount)}/{billingCycle === 'annual' ? 'year' : 'month'}
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
              </span>
            </div>
          </div>

<<<<<<< HEAD
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={16} />
                Full Name *
              </label>
              <input
                type="text"
                value={userDetails.fullName}
                onChange={(e) => setUserDetails({ ...userDetails, fullName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.fullName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail size={16} />
                Email *
              </label>
              <input
                type="email"
                value={userDetails.email}
                onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone size={16} />
                Phone Number *
              </label>
              <input
                type="tel"
                value={userDetails.phone}
                onChange={(e) => setUserDetails({ ...userDetails, phone: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Company/Organization */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building size={16} />
                Company/Organization (Optional)
              </label>
              <input
                type="text"
                value={userDetails.company}
                onChange={(e) => setUserDetails({ ...userDetails, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your company name"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h2>
          
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
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
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      </div>
    </div>
  );
};

const BillingView: React.FC<BillingViewProps> = ({ user: _user }) => {
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
<<<<<<< HEAD
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('starter');
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [lastError, setLastError] = useState<string>('');
=======
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('starter');
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db

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
<<<<<<< HEAD
    
    if (plan.id === currentPlan) {
      toast.info(`You are already on the ${plan.name} plan`);
      return;
    }
    
    setSelectedPlan(plan);
    setShowUserDetailsModal(true);
=======
  // mark plan selection with current billing cycle
  setSelectedPlan(plan);
  setShowUserDetailsModal(true);
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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
<<<<<<< HEAD
      // Prefer proxy (/api). If a VITE_API_BASE_URL is provided, use that instead (helps when proxy is misconfigured)
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment processor. Please try again.');
=======
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay. Please try again.');
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      }

      // Compute effective plan id and amount depending on billing cycle
      const effectivePlanId = billingCycle === 'annual' ? `${selectedPlan.id}_annual` : selectedPlan.id;
<<<<<<< HEAD
      const effectiveAmount = billingCycle === 'annual' ? selectedPlan.price * 10 : selectedPlan.price;

      // Create order on backend
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiBase}/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { 'Authorization': `Bearer ${session.access_token}` }
            : { ...(import.meta.env.DEV ? { 'X-Skip-Auth': 'true', 'X-Mock-Razorpay': 'true' } : {}) }
          )
=======
      const effectiveAmount = billingCycle === 'annual' ? selectedPlan.price * 10 : selectedPlan.price; // annual = 10x monthly

      // Create order on backend
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
        },
        body: JSON.stringify({
          planId: effectivePlanId,
          amount: effectiveAmount,
          userDetails: userDetails
        })
      });

      if (!response.ok) {
<<<<<<< HEAD
        // Try to parse error response as JSON, fallback to text
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
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
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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
<<<<<<< HEAD
            const verifyResponse = await fetch(`${apiBase}/razorpay/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token
                  ? { 'Authorization': `Bearer ${session.access_token}` }
                  : { ...(import.meta.env.DEV ? { 'X-Skip-Auth': 'true', 'X-Mock-Razorpay': 'true' } : {}) }
                )
=======
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
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
<<<<<<< HEAD
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
      
=======
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

>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      rzp.open();
      
    } catch (error: any) {
      console.error('Payment error:', error);
<<<<<<< HEAD
      setLastError(error.message || 'Failed to process payment');
      setShowErrorModal(true);
    } finally {
=======
      toast.error(error.message || 'Failed to process payment');
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
  const handleRetry = () => {
    setShowErrorModal(false);
    setShowUserDetailsModal(true);
  };

  const getCurrentPlan = () => plans.find(plan => plan.id === currentPlan) || plans[0];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Choose the perfect plan for your needs</p>
      </div>

      {/* Current Plan Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Current Plan</h2>
            <p className="text-blue-700">{getCurrentPlan().name} Plan</p>
            {subscription && (
              <p className="text-sm text-blue-600">
                Expires: {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Active
            </span>
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Annual
            <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const isUpgrade = plan.price > (getCurrentPlan().price || 0);
          
          return (
            <div
              key={plan.id}
              className={`relative bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                isCurrentPlan ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
<<<<<<< HEAD
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {displayPriceFor(plan, billingCycle)}
                </div>
                {plan.price === 0 && (
                  <p className="text-sm text-gray-500">Forever free</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgradeClick(plan)}
                disabled={isCurrentPlan || isLoading}
                className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : isUpgrade
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {isCurrentPlan ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
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
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      />
    </div>
  );
};

<<<<<<< HEAD
=======
// Declare Razorpay global
declare global {
  interface Window {
    Razorpay: any;
  }
}

>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
export default BillingView;