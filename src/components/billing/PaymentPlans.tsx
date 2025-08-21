import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Razorpay config
const RZP_KEY: string | undefined = String(((import.meta.env as any).VITE_RAZORPAY_KEY_ID ?? '')).trim() || undefined;

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  featured?: boolean;
  features: string[];
}

interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused' | 'none';
  plan?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 999,
    currency: 'INR',
    period: 'month',
    features: [
      'Up to 100 appointments/month',
      'Basic support',
      'Email notifications',
      'Basic reporting'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 2499,
    currency: 'INR',
    period: 'month',
    featured: true,
    features: [
      'Up to 500 appointments/month',
      'Priority support',
      'SMS & Email notifications',
      'Advanced reporting',
      'API access'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    currency: 'INR',
    period: 'month',
    features: [
      'Unlimited appointments',
      '24/7 support',
      'Custom integrations',
      'Dedicated account manager',
      'Custom reporting',
      'API access'
    ]
  }
];

interface PaymentPlansProps {
  user: any;
}

export function PaymentPlans({ user }: PaymentPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Razorpay
  useEffect(() => {
    loadRazorpay();
    fetchSubscription();
  }, []);

  // Load Razorpay script dynamically
  const loadRazorpay = async (): Promise<boolean> => {
    if (window.Razorpay) return true;
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Fetch subscription details
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/billing/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle payment
  const handlePayment = async (planId: string) => {
    if (!RZP_KEY) {
      toast.error('Payment processor not configured');
      return;
    }

    try {
      setIsProcessing(true);
      setPaymentStatus('processing');
      setSelectedPlan(planId);
      
      // Ensure Razorpay is loaded
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error('Failed to load payment processor');
      }
      
      // Create order on the server
      const plan = PAYMENT_PLANS.find(p => p.id === planId);
      if (!plan) throw new Error('Invalid plan selected');
      
      const response = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.price * 100, // Convert to paise
          currency: plan.currency,
          notes: {
            plan_id: planId,
            plan_name: plan.name,
            user_id: user?.id || 'anonymous',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const order = await response.json();

      // Initialize Razorpay checkout
      const options = {
        key: RZP_KEY,
        amount: order.amount,
        currency: order.currency,
        name: 'Your Company Name',
        description: `${plan.name} Plan - ${formatCurrency(plan.price, plan.currency)}/${plan.period}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // Verify payment on server
            const verifyResponse = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const result = await verifyResponse.json();
            setPaymentStatus('success');
            toast.success('Payment successful! Your subscription is now active.');
            fetchSubscription(); // Refresh subscription details
          } catch (error: any) {
            console.error('Payment verification error:', error);
            setPaymentStatus('error');
            toast.error(error.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: function() {
            setPaymentStatus('idle');
            setSelectedPlan(null);
            toast.info('Payment window closed');
          },
        },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(response: any) {
        console.error('Payment failed:', response.error);
        setPaymentStatus('error');
        toast.error(response.error.description || 'Payment failed');
      });

      rzp.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
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
        <p className="text-muted-foreground">Choose a plan that works best for you</p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {subscription.plan 
                ? `You're currently on the ${subscription.plan} plan.` 
                : 'No active subscription.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription.status === 'active' && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>Your subscription is active</span>
              </div>
            )}
            {subscription.current_period_end && (
              <div className="mt-2 text-sm text-muted-foreground">
                Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {PAYMENT_PLANS.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative overflow-hidden ${plan.featured ? 'border-blue-500 ring-2 ring-blue-500' : ''}`}
          >
            {plan.featured && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 transform translate-x-2 -translate-y-2 rotate-12">
                POPULAR
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">
                  {formatCurrency(plan.price, plan.currency)}
                </span>
                <span className="ml-1 text-muted-foreground">/ {plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={plan.featured ? 'default' : 'outline'}
                onClick={() => handlePayment(plan.id)}
                disabled={isProcessing && selectedPlan === plan.id}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Payment Status */}
      {paymentStatus === 'success' && (
        <div className="p-4 bg-green-50 text-green-700 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">Payment Successful!</h3>
            <p className="text-sm">Your subscription has been activated. You can now access all the premium features.</p>
          </div>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">Payment Failed</h3>
            <p className="text-sm">There was an error processing your payment. Please try again or contact support.</p>
          </div>
        </div>
      )}
    </div>
  );
}
