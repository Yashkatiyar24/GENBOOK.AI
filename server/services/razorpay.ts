import Razorpay from 'razorpay';
import { supabase } from '../supabase.js';

type SubscriptionStatus = 
  | 'created' | 'authenticated' | 'active' | 'pending' | 'halted' 
  | 'cancelled' | 'completed' | 'expired' | 'paused';

interface CustomerDetails {
  name: string;
  email: string;
  contact?: string;
  userId?: string;
}

interface SubscriptionResult {
  success: boolean;
  subscription?: any;
  error?: string;
}

// Initialize Razorpay with error handling
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

/**
 * Creates a new subscription in Razorpay
 */
export const createSubscription = async (
  planId: string, 
  customer: CustomerDetails
): Promise<SubscriptionResult> => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return {
      success: false,
      error: 'Razorpay credentials not configured'
    };
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // 1 year subscription
      customer_notify: 1,
      notes: {
        userId: customer.userId,
        email: customer.email,
        name: customer.name
      },
      notify_info: {
        notify_email: customer.email,
        notify_phone: customer.contact || ''
      },
      // Add customer details if available
      ...(customer.contact && { phone: customer.contact }),
      ...(customer.email && { email: customer.email })
    });

    return { success: true, subscription };
  } catch (error: any) {
    console.error('Error creating Razorpay subscription:', error);
    return {
      success: false,
      error: error.description || error.message || 'Failed to create subscription'
    };
  }
};

/**
 * Updates an existing subscription to a new plan
 */
export const updateSubscription = async (
  subscriptionId: string, 
  newPlanId: string
): Promise<SubscriptionResult> => {
  try {
    // Get current subscription details
    const currentSub = await razorpay.subscriptions.fetch(subscriptionId);
    
    // Create a new subscription with the new plan
    const newSubscription = await razorpay.subscriptions.create({
      plan_id: newPlanId,
      customer_notify: 1,
      total_count: 12,
      notes: currentSub.notes,
      notify_info: currentSub.notify_info
    });

    // Cancel the old subscription
    await razorpay.subscriptions.cancel(subscriptionId);

    return { success: true, subscription: newSubscription };
  } catch (error: any) {
    console.error('Error updating Razorpay subscription:', error);
    return {
      success: false,
      error: error.description || error.message || 'Failed to update subscription'
    };
  }
};

/**
 * Cancels an existing subscription
 */
export const cancelSubscription = async (
  subscriptionId: string
): Promise<SubscriptionResult> => {
  try {
    // Fetch current subscription first to get details
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    
    // Only cancel if not already cancelled/completed
    if (!['cancelled', 'completed'].includes(subscription.status)) {
      await razorpay.subscriptions.cancel(subscriptionId);
    }

    return { 
      success: true, 
      subscription: await razorpay.subscriptions.fetch(subscriptionId) 
    };
  } catch (error: any) {
    console.error('Error cancelling Razorpay subscription:', error);
    return {
      success: false,
      error: error.description || error.message || 'Failed to cancel subscription'
    };
  }
};

/**
 * Fetches subscription details from Razorpay
 */
export const getSubscription = async (
  subscriptionId: string
): Promise<SubscriptionResult> => {
  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return { success: true, subscription };
  } catch (error: any) {
    console.error('Error fetching Razorpay subscription:', error);
    return {
      success: false,
      error: error.description || error.message || 'Failed to fetch subscription'
    };
  }
};

/**
 * Verifies a webhook signature from Razorpay
 */
export const verifyWebhookSignature = (
  body: string | Buffer,
  signature: string
): boolean => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured');
    return false;
  }

  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET);
    hmac.update(body);
    const digest = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};
