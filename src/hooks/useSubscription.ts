import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useSubscription = () => {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch('/api/v1/billing/subscription');
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.plan_id || null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscription = async (planId: string) => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Load Razorpay SDK
      const loaded = await loadRazorpay();
      if (!loaded) {
        throw new Error('Failed to load payment processor');
      }

      // Create or update subscription
      const response = await fetch('/api/v1/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process subscription');
      }

      // Open Razorpay checkout
      const options = {
        ...data.subscription,
        key: data.key,
        handler: function (response: any) {
          // Handle successful payment
          toast.success('Subscription updated successfully!');
          fetchCurrentPlan();
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment was cancelled');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    try {
      const response = await fetch('/api/v1/billing/cancel-subscription', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      await fetchCurrentPlan();
      toast.success('Subscription cancelled successfully');
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    }
  };

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  return {
    currentPlan,
    isLoading,
    loading,
    handleSubscription,
    cancelSubscription,
  };
};
