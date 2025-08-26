import { useState } from 'react';
import { loadScript } from '@razorpay/checkout/dist/razorpay-utils';

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeRazorpay = async (): Promise<boolean> => {
    if (window.Razorpay) return true;
    
    try {
      await loadScript({
        key_id: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: 0, // Will be set when creating order
        currency: 'INR',
        name: 'Your App Name',
        description: 'Subscription Payment',
        image: '/logo.png',
        handler: () => {},
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#6366F1'
        }
      });
      return true;
    } catch (err) {
      console.error('Failed to load Razorpay SDK', err);
      setError('Failed to load payment processor');
      return false;
    }
  };

  const createSubscription = async (planId: string, userEmail: string, userName: string) => {
    setLoading(true);
    setError(null);

    try {
      // Initialize Razorpay
      const isInitialized = await initializeRazorpay();
      if (!isInitialized) throw new Error('Payment processor not available');

      // Create subscription on the server
      const response = await fetch('/api/v1/billing/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
          email: userEmail,
          name: userName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create subscription');
      }

      const subscription = await response.json();
      
      // Open Razorpay checkout
      const options = {
        ...subscription,
        handler: async function (response: any) {
          // Handle successful payment
          window.location.href = `${window.location.origin}/dashboard/billing?subscription_id=${response.razorpay_payment_id}`;
        },
        prefill: {
          name: userName,
          email: userEmail,
        },
        modal: {
          ondismiss: () => {
            // Handle modal dismissal
            console.log('Payment modal dismissed');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to process subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createSubscription,
  };
};

declare global {
  interface Window {
    Razorpay: any;
  }
}
