import React, { useEffect, useState } from 'react';
import RazorpayModal from './RazorpayModal';
import { CreditCard, DollarSign, Loader2, CheckCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { useSubscription } from '../hooks/useSubscription';
import { PlanCard } from './PlanCard';
import { toast } from 'sonner';
import { supabase } from '../supabase';

interface Plan {
  name: string;
  price: number;
  interval: string;
  features: string[];
}

const plans: Plan[] = [
  {
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
    name: 'Professional',
    price: 29,
    interval: 'month',
    features: [
      'Unlimited appointments',
      'Advanced chatbot (1000 messages/month)',
      'Team collaboration (up to 5 users)',
      'Custom branding',
      'Priority support'
    ]
  },
  {
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Advanced analytics',
      'API access',
      '24/7 phone support'
    ]
  }
];

export default function BillingView() {
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('Starter');
  const [user, setUser] = useState<{ name: string; email: string; contact?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
    fetchCurrentSubscription();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get profile data first
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();
        
        setUser({
          name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          email: user.email || '',
          contact: profile?.phone || user.user_metadata?.phone || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      setApiError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to fetch from API first, fallback to direct Supabase query
        try {
          const response = await fetch('/api/billing/subscription', {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.plan) {
              setCurrentPlan(data.plan);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('API not available, using direct database query');
        }

        // Fallback to direct Supabase query
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
        
        if (subscription) {
          setCurrentPlan(subscription.plan);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setApiError('Unable to load subscription data. Please refresh the page.');
    }
  };

  const handleUpgradeClick = () => {
    setShowPlansModal(true);
  };

  const handlePlanSelect = (plan: Plan) => {
    if (plan.name === 'Starter') {
      toast.info('You are already on the Starter plan');
      return;
    }
    
    setSelectedPlan(plan);
    setShowPlansModal(false);
    setShowRazorpayModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowRazorpayModal(false);
    setSelectedPlan(null);
    toast.success('Payment successful! Your subscription has been upgraded.');
    fetchCurrentSubscription();
  };

  const PlansModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#0f172a] rounded-xl shadow-lg p-6 w-full max-w-6xl mx-4 text-white relative">
        <button
          onClick={() => setShowPlansModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-3xl font-bold mb-8 text-center text-[#00bfff]">Choose Your Plan</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div 
              key={plan.name}
              className={`bg-[#181f2a] rounded-xl p-6 border-2 relative ${
                plan.name === 'Professional' ? 'border-[#00bfff]' : 'border-gray-700'
              }`}
            >
              {plan.name === 'Professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-[#00bfff] text-white px-3 py-1 rounded-full text-sm font-semibold">
                    POPULAR
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-[#00bfff]">{plan.name}</h3>
                <div className="mb-2">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-gray-400">/{plan.interval}</span>
                    </>
                  )}
                </div>
                <p className="text-gray-400">
                  {plan.name === 'Starter' ? 'Perfect for getting started' :
                   plan.name === 'Professional' ? 'For growing businesses' :
                   'For large organizations'}
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <CheckCircle className="text-green-500 mr-3 mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handlePlanSelect(plan)}
                disabled={currentPlan === plan.name}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  currentPlan === plan.name 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : plan.name === 'Starter'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : plan.name === 'Professional'
                    ? 'bg-[#00bfff] hover:bg-[#0099cc] text-white'
                    : 'bg-[#6366f1] hover:bg-[#5855eb] text-white'
                }`}
              >
                {currentPlan === plan.name ? 'Current Plan' : 
                 plan.name === 'Starter' ? 'View Plans' :
                 `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#00bfff]">Billing & Subscription</h1>
        <Button onClick={handleUpgradeClick} className="bg-[#00bfff] hover:bg-[#0099cc]">
          <CreditCard className="mr-2" size={16} />
          Upgrade Plan
        </Button>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{apiError}</p>
          <button 
            onClick={() => { setApiError(null); fetchCurrentSubscription(); }}
            className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-[#181f2a] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-[#00bfff]">{currentPlan}</p>
            <p className="text-gray-400">
              {currentPlan === 'Starter' ? 'Free plan' : 
               currentPlan === 'Professional' ? '$29/month' : 
               '$99/month'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-green-500 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {showPlansModal && <PlansModal />}
      
      {showRazorpayModal && selectedPlan && (
        <RazorpayModal
          open={showRazorpayModal}
          onClose={() => setShowRazorpayModal(false)}
          plan={selectedPlan}
          user={user}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

interface BillingViewProps {
  user: any;
}

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    description: 'Perfect for individuals getting started',
    features: [
      '1 User',
      'Basic Features',
      'Limited Support',
      'Community Access'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 999,
    description: 'For professionals who need more power',
    features: [
      '5 Users',
      'All Basic Features',
      'Priority Support',
      'API Access',
      'Advanced Analytics'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2499,
    description: 'For businesses with advanced needs',
    features: [
      'Unlimited Users',
      'All Professional Features',
      '24/7 Support',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA 99.9% Uptime'
    ]
  }
];

const BillingView: React.FC<BillingViewProps> = ({ user }) => {
  const {
    currentPlan,
    isLoading,
    loading: processing,
    cancelSubscription
  } = useSubscription();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const currentPlanData = PLANS.find(plan => plan.id === currentPlan) || PLANS[0];
  const isFreePlan = currentPlan === 'free' || !currentPlan;

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods</p>
      </div>

      {/* Current Plan Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center space-x-3 mb-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Current Plan</span>
          </div>
          <p className="text-lg font-semibold text-white capitalize">
            {currentPlanData.name}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center space-x-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-green-400">Status</span>
          </div>
          <div className="flex items-center space-x-2">
            {!isFreePlan ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-400">Active</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span className="text-gray-400">Inactive</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">Features</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {currentPlanData.features.length} Included
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {isFreePlan ? (
          <Button 
            onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
          >
            Upgrade Plan
          </Button>
        ) : (
          <Button 
            onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
            variant="outline"
          >
            Change Plan
          </Button>
        )}

        {!isFreePlan && (
          <Button
            onClick={cancelSubscription}
            variant="outline"
            className="text-red-500 border-red-500 hover:bg-red-500/10 hover:text-red-500"
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Cancel Subscription'}
          </Button>
        )}
      </div>

      {/* Payment Plans */}
      <div id="plans" className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Choose the right plan for you</h2>
          <p className="text-muted-foreground">
            Select a plan that fits your needs and start building with GENBOOK.AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div key={plan.id}>
              <PlanCard
                name={plan.name}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                isCurrent={currentPlan === plan.id}
                isUpgrading={processing && currentPlan === plan.id}
                onSelect={() => handleSelectPlan(plan)}
                highlight={plan.id === 'professional'}
              />
            </div>
          ))}
        </div>
        {modalOpen && selectedPlan && (
          <RazorpayModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            plan={selectedPlan}
            user={user}
          />
        )}
      </div>

    </div>
  );
};

export default BillingView;
