import { Router } from 'express';
import { requireRole } from '../middleware/tenant.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { supabase } from '../supabase.js';

const router = Router();
router.use(requireSubscription());

// List recurring series for tenant
router.get('/series', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recurring_series')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error listing recurring series:', error);
    res.status(500).json({ error: 'Failed to list recurring series' });
  }
});

// Get single series
router.get('/series/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('recurring_series')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Series not found' });
    res.json(data);
  } catch (error) {
    console.error('Error fetching series:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// Create series
router.post('/series', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const payload = req.body;
    const toInsert = {
      ...payload,
      tenant_id: req.tenantId,
      created_by: req.userId,
      is_active: true,
    };
    const { data, error } = await supabase
      .from('recurring_series')
      .insert([toInsert])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating series:', error);
    res.status(500).json({ error: 'Failed to create series' });
  }
});

// Update series
router.put('/series/:id', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if ('tenant_id' in updates) delete updates.tenant_id;
    const { data, error } = await supabase
      .from('recurring_series')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Series not found' });
    res.json(data);
  } catch (error) {
    console.error('Error updating series:', error);
    res.status(500).json({ error: 'Failed to update series' });
  }
});

// Delete series
router.delete('/series/:id', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('recurring_series')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Series not found' });
    res.json({ message: 'Series deleted' });
  } catch (error) {
    console.error('Error deleting series:', error);
    res.status(500).json({ error: 'Failed to delete series' });
  }
});

// Expand series into future instances (basic naive expansion)
router.post('/series/:id/expand', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { instances } = req.body as { instances: Array<{ start_time: string; end_time: string; title?: string; description?: string }> };
    if (!Array.isArray(instances) || instances.length === 0) {
      return res.status(400).json({ error: 'instances array is required' });
    }

    const { data: series, error: sErr } = await supabase
      .from('recurring_series')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .single();
    if (sErr) throw sErr;
    if (!series) return res.status(404).json({ error: 'Series not found' });

    const rows = instances.map((i) => ({
      tenant_id: req.tenantId,
      created_by: req.userId,
      title: i.title ?? series.title,
      description: i.description ?? series.description,
      start_time: i.start_time,
      end_time: i.end_time,
      series_id: id,
      is_recurring: true,
      recurring_pattern: series.rule,
      attendee_count: 1,
    }));

    const { data, error } = await supabase
      .from('appointments')
      .insert(rows)
      .select();
    if (error) throw error;

    res.status(201).json({ created: data?.length ?? 0, appointments: data });
  } catch (error) {
    console.error('Error expanding series:', error);
    res.status(500).json({ error: 'Failed to expand series' });
  }
});

export default router;
