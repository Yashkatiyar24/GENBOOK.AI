import React, { useEffect } from 'react'

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: any) => void;
  modal?: {
    ondismiss: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

type RazorpayCheckoutProps = {
  subscriptionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    contact?: string;
  };
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
};

export default function RazorpayCheckout({ 
  subscriptionId, 
  user,
  onSuccess,
  onError
}: RazorpayCheckoutProps) {
  useEffect(() => {
    if (!subscriptionId || !user) {
      console.error('Missing subscription ID or user data');
      onError?.('Missing required parameters');
      return;
    }

    const loadRazorpay = async () => {
      try {
        console.log('Starting Razorpay script load...');
        
        // Check if Razorpay is already loaded
        if (window.Razorpay) {
          console.log('Razorpay already loaded, initializing...');
          initializeRazorpay();
          return;
        }

        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onerror = (error) => {
          console.error('Failed to load Razorpay script:', error);
          onError?.(new Error('Failed to load payment processor. Please check your internet connection and try again.'));
        };
        
        // Add script to document
        document.body.appendChild(script);
        console.log('Razorpay script appended to document');

        // Set a timeout to handle cases where script.onload never fires
        const timeout = setTimeout(() => {
          if (!window.Razorpay) {
            console.error('Razorpay script load timeout');
            onError?.(new Error('Payment processor took too long to load. Please refresh and try again.'));
          }
        }, 10000); // 10 second timeout

        script.onload = () => {
          console.log('Razorpay script loaded successfully');
          clearTimeout(timeout);
          initializeRazorpay();
        };
      } catch (error) {
        console.error('Error loading Razorpay:', error);
        onError?.(error);
      }
    };

    const initializeRazorpay = () => {
      try {
        console.log('Initializing Razorpay...');
        
        if (!window.Razorpay) {
          throw new Error('Razorpay not available in window object. Make sure the Razorpay script is loading correctly.');
        }

        // Get the appropriate key based on environment
        const razorpayKey = import.meta.env.PROD 
          ? import.meta.env.VITE_RAZORPAY_LIVE_KEY_ID 
          : import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_LIVE_KEY_ID;
          
        const razorpaySecret = import.meta.env.PROD
          ? import.meta.env.VITE_RAZORPAY_LIVE_KEY_SECRET
          : import.meta.env.VITE_RAZORPAY_KEY_SECRET || import.meta.env.VITE_RAZORPAY_LIVE_KEY_SECRET;

        console.log('Environment:', import.meta.env.PROD ? 'Production' : 'Development');
        console.log('Using Razorpay key (first 8 chars):', razorpayKey ? `${razorpayKey.substring(0, 8)}...` : 'NOT FOUND');
        
        if (!razorpayKey || !razorpaySecret) {
          const missingVars = [];
          if (!razorpayKey) missingVars.push('VITE_RAZORPAY_LIVE_KEY_ID');
          if (!razorpaySecret) missingVars.push('VITE_RAZORPAY_LIVE_KEY_SECRET');
          
          throw new Error(`Razorpay configuration incomplete. Missing: ${missingVars.join(', ')}`);
        }

        const options: RazorpayOptions = {
          key: razorpayKey,
          subscription_id: subscriptionId,
          name: 'GENBOOK.AI',
          description: 'Subscription Payment',
          image: '/logo.png',
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.contact || '',
          },
          theme: {
            color: '#528FF0',
          },
          handler: async (response) => {
            try {
              console.log('Razorpay payment response:', response);
              
              // Verify the payment signature
              const verifyResponse = await fetch('/api/verify-razorpay-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  subscription_id: subscriptionId,
                  user_id: user.id
                })
              });
              
              const verification = await verifyResponse.json();
              
              if (verification.success) {
                console.log('Payment verification successful');
                onSuccess?.(response);
              } else {
                console.error('Payment verification failed:', verification.error);
                onError?.(new Error(verification.error || 'Payment verification failed'));
              }
            } catch (error) {
              console.error('Error verifying payment:', error);
              onError?.(error instanceof Error ? error : new Error('Error verifying payment'));
            }
          },
          modal: {
            ondismiss: () => {
              console.log('Payment modal dismissed by user');
              onError?.(new Error('Payment was cancelled by user'));
            }
          },
        };

        console.log('Creating Razorpay instance with options:', {
          ...options,
          key: `${options.key.substring(0, 8)}...`
        });
        
        try {
          const razorpay = new window.Razorpay(options);
          console.log('Razorpay instance created, opening checkout...');
          razorpay.open();
        } catch (error) {
          console.error('Error creating Razorpay instance:', error);
          throw new Error('Failed to initialize payment. Please try again later.');
        }
      } catch (error) {
        console.error('Error initializing Razorpay:', error);
        onError?.(error);
      }
    };

    loadRazorpay();

    return () => {
      // Cleanup
      const script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, [subscriptionId, user, onSuccess, onError]);
}