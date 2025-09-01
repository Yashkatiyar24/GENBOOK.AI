import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireRole } from '../middleware/tenant.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { canInviteMember } from '../utils/feature-gating.js';

const router = Router();

// Require an active subscription for all team routes (starter/pro/enterprise)
router.use(requireSubscription());

// GET /api/team/members - list members for current tenant
router.get('/members', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ members: data || [] });
  } catch (error: any) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// POST /api/team/invite - invite a member by email
router.post('/invite', requireSubscription(['professional', 'enterprise']), requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const { email, name, role } = (req.body || {}) as { email?: string; name?: string; role?: string };
    if (!email || !role) return res.status(400).json({ error: 'email and role are required' });

    // Enforce team member limits based on plan
    const { allowed, limit, used, plan } = await canInviteMember(tenantId);
    if (!allowed) {
      return res.status(402).json({
        error: 'Team member limit reached for your plan',
        plan,
        used,
        limit,
        message: 'Please upgrade your plan to invite more team members.'
      });
    }

    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;

    // Send invite using service-role admin API
    const { data, error } = await (supabase as any).auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: name || '', tenant_id: tenantId, role: (role || 'member').toLowerCase() },
    });

    if (error) throw error;

    res.status(200).json({ message: 'Invite sent', email, role, user: data?.user || null });
  } catch (error: any) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

export default router;
