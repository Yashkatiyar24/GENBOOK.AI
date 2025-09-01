import { Router } from 'express';
import { supabase } from '../supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { normalizeRole } from '../types/roles.js';

const router = Router();

// Register a new tenant with admin user
router.post('/register', async (req, res) => {
  try {
    const { organizationName, adminEmail, adminPassword, adminName } = req.body;

    // Validate input
    if (!organizationName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a new tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ name: organizationName }])
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: adminName || 'Admin',
          tenant_id: tenant.id,
          role: 'admin'
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile in public.users
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: adminEmail,
          name: adminName || 'Admin',
          tenant_id: tenant.id,
          role: 'admin',
          created_at: new Date().toISOString()
        }
      ]);

    if (profileError) throw profileError;

    res.status(201).json({
      message: 'Tenant and admin user created successfully',
      userId: authData.user.id,
      tenantId: tenant.id
    });
  } catch (error: unknown) {
    const msg = (error as any)?.message || 'Registration failed';
    console.error('Registration error:', error);
    res.status(500).json({ error: msg });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user found');

    // Get or create user profile with tenant info (invited users may not have a row yet)
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      const meta = (data.user.user_metadata || {}) as any;
      const tenant_id = meta.tenant_id;
      const role = normalizeRole(meta.role || 'member');
      const name = meta.full_name || data.user.email?.split('@')[0] || 'Member';
      if (!tenant_id) {
        return res.status(403).json({ error: 'User not associated with any tenant' });
      }
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            name,
            tenant_id,
            role: role || 'member',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      if (insertErr) throw insertErr;
      userData = inserted as any;
    }

    // Generate a new session token with tenant and role claims
    const { data: { session }, error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    if (sessionError) throw sessionError;

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userData.role,
        tenantId: userData.tenant_id,
        name: userData.name
      },
      session
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ message: 'Logged out successfully' });
  } catch (error: unknown) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Conditionally set redirectTo only when FRONTEND_URL is configured.
    // If omitted, Supabase uses the project Auth Site URL (best fallback).
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL;
    const redirectTo = frontendUrl
      ? `${String(frontendUrl).replace(/\/$/, '')}/reset-password`
      : undefined;

    const options = redirectTo ? { redirectTo } : undefined;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, options as any);

    if (error) throw error;
    res.json({ message: 'Password reset email sent' });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { password, token } = req.body;
    if (!password || !token) {
      return res.status(400).json({ error: 'Password and token are required' });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (error) throw error;

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) throw updateError;

    res.json({ message: 'Password updated successfully' });
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;
