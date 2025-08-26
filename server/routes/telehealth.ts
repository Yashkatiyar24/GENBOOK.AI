import express from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireRole } from '../middleware/tenant.middleware.js';

const router = express.Router();

// Create telehealth session for an appointment
router.post('/sessions', requireRole(['admin', 'provider']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const providerUserId = (req as any).userId;
    const { appointment_id } = req.body || {};
    if (!appointment_id) return res.status(400).json({ error: 'appointment_id is required' });

    const { data, error } = await supabase
      .from('telehealth_sessions')
      .insert([{ tenant_id: tenantId, appointment_id, provider_user_id: providerUserId, status: 'scheduled' }])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create telehealth session' });
  }
});

// Get session details
router.get('/sessions/:id', requireRole(['admin', 'provider', 'user']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch session' });
  }
});

// End session
router.post('/sessions/:id/end', requireRole(['admin', 'provider']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .update({ status: 'ended', end_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to end session' });
  }
});

export default router;
