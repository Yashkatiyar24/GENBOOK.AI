import express from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireRole } from '../middleware/tenant.middleware.js';

const router = express.Router();

// List notification jobs
router.get('/jobs', requireRole(['admin', 'provider']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const status = req.query.status as string | undefined;
    let query = supabase.from('notification_jobs').select('*').eq('tenant_id', tenantId).order('scheduled_for', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch jobs' });
  }
});

// Schedule a notification job
router.post('/schedule', requireRole(['admin', 'provider']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { channel, template_key, payload, scheduled_for } = req.body || {};
    const { data, error } = await supabase
      .from('notification_jobs')
      .insert([{ tenant_id: tenantId, channel, template_key, payload, scheduled_for }])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to schedule job' });
  }
});

// Templates CRUD (minimal)
router.get('/templates', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { data, error } = await supabase.from('notification_templates').select('*').eq('tenant_id', tenantId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch templates' });
  }
});

router.post('/templates', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { channel, key, subject, body_md, enabled = true } = req.body || {};
    const { data, error } = await supabase
      .from('notification_templates')
      .insert([{ tenant_id: tenantId, channel, key, subject, body_md, enabled }])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create template' });
  }
});

export default router;
