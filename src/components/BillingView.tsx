import React, { useEffect, useState } from 'react';
import RazorpayModal from './RazorpayModal';
import { CreditCard, DollarSign, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useSubscription } from '../hooks/useSubscription';
import { PlanCard } from './PlanCard';
import { toast } from 'sonner';

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
