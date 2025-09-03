import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

interface FeatureAccess {
  hasAccess: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check if the current user has access to a specific feature
 * @param feature The feature to check access for
 * @returns Object containing access status, loading state, and any error
 */
export const useFeatureAccess = (feature: 'voice_commands' | 'advanced_analytics' | 'team_collaboration'): FeatureAccess => {
  const [state, setState] = useState<FeatureAccess>({
    hasAccess: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error(userError?.message || 'User not authenticated');
        }

        // Get the user's subscription
        const { data: subscription, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('plan_id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subscriptionError || !subscription) {
          // No active subscription, check for free tier access
          const freeTierAccess = await checkFreeTierAccess(feature);
          setState({
            hasAccess: freeTierAccess,
            isLoading: false,
            error: null,
          });
          return;
        }

        // Check if the user's plan includes the requested feature
        const planAccess = await checkPlanAccess(subscription.plan_id, feature);
        
        setState({
          hasAccess: planAccess,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error checking feature access:', error);
        setState({
          hasAccess: false,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to check feature access'),
        });
      }
    };

    checkAccess();
  }, [feature]);

  return state;
};

/**
 * Check if a feature is available in the free tier
 */
async function checkFreeTierAccess(feature: string): Promise<boolean> {
  // Define which features are available in the free tier
  const freeTierFeatures: Record<string, boolean> = {
    voice_commands: false, // Voice commands are not available in free tier
    advanced_analytics: false,
    team_collaboration: false,
    basic_analytics: true,
  };

  return freeTierFeatures[feature] || false;
}

/**
 * Check if a plan includes a specific feature
 */
async function checkPlanAccess(planId: string, feature: string): Promise<boolean> {
  try {
    // Get the plan details
    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('features')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      console.error('Error fetching plan details:', error);
      return false;
    }

    // Check if the feature is included in the plan
    const features = plan.features as string[];
    console.log(`Plan ${planId} features:`, features);
    console.log(`Checking for feature: ${feature}`);
    
    const hasFeature = features.includes(feature);
    console.log(`Feature ${feature} ${hasFeature ? 'found' : 'not found'} in plan ${planId}`);
    
    return hasFeature;
  } catch (err) {
    console.error('Error in checkPlanAccess:', err);
    return false;
  }
}
