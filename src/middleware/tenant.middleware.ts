import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../server/supabase.js';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userRole?: string;
      userId?: string;
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip for public routes
    const publicRoutes = ['/auth/login', '/auth/register'];
    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // Verify JWT and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user's tenant and role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: 'User not found or not assigned to a tenant' });
    }

    // Attach tenant and role to request
    req.tenantId = userData.tenant_id;
    req.userRole = userData.role;
    req.userId = user.id;

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: req.tenantId });

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        requiredRoles: roles,
        userRole: req.userRole 
      });
    }
    next();
  };
};
