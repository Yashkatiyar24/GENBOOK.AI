import { supabase } from './supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Check if the current user has access to voice commands
 * @returns {Promise<{hasAccess: boolean, message?: string}>}
 */
export const checkVoiceCommandAccess = async () => {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { hasAccess: false, message: 'Please sign in to use voice commands' };
    }

    // Get the user's subscription status
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      return { 
        hasAccess: false, 
        message: 'No active subscription found' 
      };
    }

    // Check if the user has a paid plan
    const paidPlans = ['professional', 'enterprise'];
    const hasPaidPlan = paidPlans.includes(subscription.plan) && 
                       subscription.status === 'active';

    if (!hasPaidPlan) {
      return { 
        hasAccess: false, 
        message: 'Voice booking is available with a paid plan. Redirecting you to Billing so you can activate it.'
      };
    }

    return { hasAccess: true };
  } catch (error) {
    console.error('Error checking voice command access:', error);
    return { 
      hasAccess: false, 
      message: 'An error occurred while checking your subscription status' 
    };
  }
};

/**
 * Hook to check voice command access and handle redirection
 */
export const useVoiceCommandAccess = () => {
  const navigate = useNavigate();

  const checkAndHandleAccess = async () => {
    const { hasAccess, message } = await checkVoiceCommandAccess();
    
    if (!hasAccess && message) {
      toast.info(message);
      
      if (message.includes('redirecting')) {
        // Small delay to show the toast before redirecting
        setTimeout(() => navigate('/billing'), 2000);
      }
      
      return false;
    }
    
    return true;
  };

  return { checkAccess: checkAndHandleAccess };
};
