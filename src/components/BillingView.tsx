import React, { useState, useEffect } from 'react';
import { CreditCard, Download, Calendar, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../supabase';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface BillingViewProps {
  user: any;
}

interface Organization {
  id: string;
  name: string;
  subscription_status: string;
  subscription_plan: string;
  trial_ends_at: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  plan_amount: number;
  currency: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

const BillingView: React.FC<BillingViewProps> = ({ user }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);

      // Get user's organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', (await getUserOrganization())?.organization_id)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Get subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', orgData.id)
        .single();

      if (!subError && subData) {
        setSubscription(subData);
      }

      // Get payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', orgData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!paymentsError && paymentsData) {
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserOrganization = async () => {
    const { data, error } = await supabase.rpc('get_user_organization');
    if (error) throw error;
    return data[0];
  };

  const handleUpgrade = async (planName: string, priceId: string) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          organizationId: organization?.id,
          userId: user.id,
        }),
      });

      const session = await response.json();

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        console.error('Stripe error:', result.error);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization?.id,
        }),
      });

      if (response.ok) {
        await fetchBillingData();
        alert('Subscription cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'trial':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'past_due':
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'trial':
        return 'text-yellow-400';
      case 'past_due':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
        <p className="text-gray-400">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan */}
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Current Plan</h2>
          {organization && (
            <div className="flex items-center space-x-2">
              {getStatusIcon(organization.subscription_status)}
              <span className={`text-sm font-medium capitalize ${getStatusColor(organization.subscription_status)}`}>
                {organization.subscription_status}
              </span>
            </div>
          )}
        </div>

        {organization && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
              <div className="flex items-center space-x-3 mb-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">Plan</span>
              </div>
              <p className="text-lg font-semibold text-white capitalize">
                {organization.subscription_plan}
              </p>
            </div>

            {subscription && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center space-x-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Amount</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(subscription.plan_amount, subscription.currency)}/month
                </p>
              </div>
            )}

            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center space-x-3 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">
                  {organization.subscription_status === 'trial' ? 'Trial Ends' : 'Next Billing'}
                </span>
              </div>
              <p className="text-lg font-semibold text-white">
                {organization.subscription_status === 'trial'
                  ? new Date(organization.trial_ends_at).toLocaleDateString()
                  : subscription
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        )}

        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => setShowPricingModal(true)}
            className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
          >
            {organization?.subscription_status === 'trial' ? 'Choose Plan' : 'Upgrade Plan'}
          </button>
          
          {organization?.subscription_status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-medium rounded-lg transition-all duration-300"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Payment History</h2>
          <button className="flex items-center space-x-2 px-4 py-2 bg-black/30 hover:bg-black/50 border border-cyan-500/20 hover:border-cyan-400/50 rounded-lg transition-all duration-300">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export</span>
          </button>
        </div>

        {payments.length > 0 ? (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-600/20"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    payment.status === 'succeeded' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-white font-medium">{payment.description}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className={`text-sm capitalize ${
                    payment.status === 'succeeded' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {payment.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No payment history available</p>
          </div>
        )}
      </div>

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D1117] border border-cyan-500/30 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
              <button
                onClick={() => setShowPricingModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors"
              >
                <span className="text-gray-400 hover:text-red-400">✕</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter Plan */}
              <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-xl p-6 border border-gray-500/20">
                <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
                <p className="text-3xl font-bold text-white mb-1">Free</p>
                <p className="text-gray-400 mb-6">Perfect for getting started</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Up to 50 appointments/month</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Basic chatbot (100 messages/month)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Email support</span>
                  </li>
                </ul>
                <button
                  disabled={organization?.subscription_plan === 'starter'}
                  className="w-full py-2 px-4 bg-gray-500/20 text-gray-400 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              </div>

              {/* Professional Plan */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/20 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-3 py-1 rounded-full text-xs font-semibold">
                    POPULAR
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Professional</h3>
                <p className="text-3xl font-bold text-white mb-1">$29<span className="text-lg">/month</span></p>
                <p className="text-gray-400 mb-6">For growing businesses</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Unlimited appointments</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Advanced chatbot (1000 messages/month)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Team collaboration (up to 5 users)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Custom branding</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Priority support</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgrade('professional', 'price_professional')}
                  className="w-full py-2 px-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
                >
                  Upgrade to Professional
                </button>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
                <p className="text-3xl font-bold text-white mb-1">$99<span className="text-lg">/month</span></p>
                <p className="text-gray-400 mb-6">For large organizations</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Everything in Professional</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Unlimited team members</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Advanced analytics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">API access</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">24/7 phone support</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgrade('enterprise', 'price_enterprise')}
                  className="w-full py-2 px-4 bg-gradient-to-r from-purple-400 to-pink-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-300"
                >
                  Upgrade to Enterprise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingView;
