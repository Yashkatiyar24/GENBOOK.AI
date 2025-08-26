// Feature gating utility for subscription-based features
import { supabase } from '../supabase';

// Check if demo mode is enabled
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const defaultPlan = import.meta.env.VITE_DEFAULT_PLAN || 'professional';

interface SubscriptionPlan {
  name: string;
  maxAppointments: number;
  maxTeamMembers: number;
  maxChatbotMessages: number;
  features: string[];
}

interface FeatureLimits {
  maxAppointmentsPerMonth: number;
  maxChatbotMessages: number;
  maxTeamMembers: number;
  hasCustomBranding: boolean;
  hasAdvancedAnalytics: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
}

export const PLAN_LIMITS: Record<string, FeatureLimits> = {
  starter: {
    maxAppointmentsPerMonth: 50,
    maxChatbotMessages: 100,
    maxTeamMembers: 1,
    hasCustomBranding: false,
    hasAdvancedAnalytics: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  professional: {
    maxAppointmentsPerMonth: -1, // unlimited
    maxChatbotMessages: 1000,
    maxTeamMembers: 5,
    hasCustomBranding: true,
    hasAdvancedAnalytics: false,
    hasApiAccess: false,
    hasPrioritySupport: true,
  },
  enterprise: {
    maxAppointmentsPerMonth: -1, // unlimited
    maxChatbotMessages: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    hasCustomBranding: true,
    hasAdvancedAnalytics: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
};

export class FeatureGating {
  private static organizationCache: Map<string, any> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async getOrganization(userId: string): Promise<any> {
    const now = Date.now();
    const cached = this.organizationCache.get(userId);
    const expiry = this.cacheExpiry.get(userId) || 0;

    if (cached && now < expiry) {
      return cached;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_organization');
      if (error) throw error;

      if (data && data.length > 0) {
        const orgData = data[0];
        this.organizationCache.set(userId, orgData);
        this.cacheExpiry.set(userId, now + this.CACHE_DURATION);
        return orgData;
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }

    return null;
  }

  static async canCreateAppointment(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // In demo mode, allow all features
    if (isDemoMode) {
      return { allowed: true };
    }

    const org = await this.getOrganization(userId);
    if (!org) return { allowed: false, reason: 'Organization not found' };

    const limits = PLAN_LIMITS[org.subscription_plan] || PLAN_LIMITS.starter;
    
    if (limits.maxAppointmentsPerMonth === -1) {
      return { allowed: true };
    }

    // Check current month's appointment count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.organization_id)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error checking appointment count:', error);
      return { allowed: false, reason: 'Error checking limits' };
    }

    if ((count || 0) >= limits.maxAppointmentsPerMonth) {
      return { 
        allowed: false, 
        reason: `Monthly appointment limit reached (${limits.maxAppointmentsPerMonth}). Upgrade your plan for more appointments.` 
      };
    }

    return { allowed: true };
  }

  static async canSendChatbotMessage(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    const org = await this.getOrganization(userId);
    if (!org) return { allowed: false, reason: 'Organization not found' };

    // Get bot settings for this organization
    const { data: botSettings, error: botError } = await supabase
      .from('bot_settings')
      .select('max_messages_per_month, enabled')
      .eq('organization_id', org.organization_id)
      .single();

    if (botError || !botSettings || !botSettings.enabled) {
      return { allowed: false, reason: 'Chatbot is disabled' };
    }

    if (botSettings.max_messages_per_month === -1) {
      return { allowed: true };
    }

    // Check current month's message count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // This would require a chatbot_messages table to track usage
    // For now, we'll use a simple check against the bot settings
    const remaining = Math.max(0, botSettings.max_messages_per_month);
    
    if (remaining <= 0) {
      return { 
        allowed: false, 
        reason: `Monthly chatbot message limit reached (${botSettings.max_messages_per_month}). Upgrade your plan for more messages.`,
        remaining: 0
      };
    }

    return { allowed: true, remaining };
  }

  static async canInviteTeamMember(userId: string): Promise<{ allowed: boolean; reason?: string; currentCount?: number; maxAllowed?: number }> {
    const org = await this.getOrganization(userId);
    if (!org) return { allowed: false, reason: 'Organization not found' };

    const limits = PLAN_LIMITS[org.subscription_plan] || PLAN_LIMITS.starter;
    
    if (limits.maxTeamMembers === -1) {
      return { allowed: true };
    }

    // Check current team member count
    const { count, error } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.organization_id)
      .eq('status', 'active');

    if (error) {
      console.error('Error checking team member count:', error);
      return { allowed: false, reason: 'Error checking limits' };
    }

    const currentCount = count || 0;

    if (currentCount >= limits.maxTeamMembers) {
      return { 
        allowed: false, 
        reason: `Team member limit reached (${limits.maxTeamMembers}). Upgrade your plan to invite more members.`,
        currentCount,
        maxAllowed: limits.maxTeamMembers
      };
    }

    return { allowed: true, currentCount, maxAllowed: limits.maxTeamMembers };
  }

  static async hasFeature(userId: string, feature: keyof FeatureLimits): Promise<boolean> {
    const org = await this.getOrganization(userId);
    if (!org) return false;

    const limits = PLAN_LIMITS[org.subscription_plan] || PLAN_LIMITS.starter;
    return limits[feature] as boolean;
  }

  static async getSubscriptionStatus(userId: string): Promise<{ 
    plan: string; 
    status: string; 
    trialEndsAt?: string; 
    isActive: boolean;
    isPastDue: boolean;
  }> {
    const org = await this.getOrganization(userId);
    if (!org) {
      return { 
        plan: 'starter', 
        status: 'active', 
        isActive: true, 
        isPastDue: false 
      };
    }

    const isActive = ['active', 'trial'].includes(org.subscription_status);
    const isPastDue = org.subscription_status === 'past_due';

    return {
      plan: org.subscription_plan,
      status: org.subscription_status,
      trialEndsAt: org.trial_ends_at,
      isActive,
      isPastDue,
    };
  }

  static clearCache(userId?: string): void {
    if (userId) {
      this.organizationCache.delete(userId);
      this.cacheExpiry.delete(userId);
    } else {
      this.organizationCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

export default FeatureGating;
