import { Router } from 'express';
import { requireRole } from '../middleware/tenant.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { supabase } from '../supabase.js';

const router = Router();
router.use(requireSubscription());

// List waitlist entries
router.get('/', async (req, res) => {
  try {
    const { status } = req.query as { status?: string };
    let query = supabase
      .from('waitlist_entries')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error listing waitlist:', error);
    res.status(500).json({ error: 'Failed to list waitlist entries' });
  }
});

// Get one
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Waitlist entry not found' });
    res.json(data);
  } catch (error) {
    console.error('Error fetching waitlist entry:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist entry' });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const row = { ...payload, tenant_id: req.tenantId };
    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating waitlist entry:', error);
    res.status(500).json({ error: 'Failed to create waitlist entry' });
  }
});

// Update
router.put('/:id', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if ('tenant_id' in updates) delete updates.tenant_id;
    const { data, error } = await supabase
      .from('waitlist_entries')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Waitlist entry not found' });
    res.json(data);
  } catch (error) {
    console.error('Error updating waitlist entry:', error);
    res.status(500).json({ error: 'Failed to update waitlist entry' });
  }
});

// Delete
router.delete('/:id', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('waitlist_entries')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Waitlist entry not found' });
    res.json({ message: 'Waitlist entry deleted' });
  } catch (error) {
    console.error('Error deleting waitlist entry:', error);
    res.status(500).json({ error: 'Failed to delete waitlist entry' });
  }
});

// Promote to appointment
router.post('/:id/promote', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { data: entry, error: eErr } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .single();
    if (eErr) throw eErr;
    if (!entry) return res.status(404).json({ error: 'Waitlist entry not found' });

    const appt = {
      tenant_id: req.tenantId,
      created_by: req.userId,
      title: entry.name ? `Appointment for ${entry.name}` : 'Appointment',
      description: entry.notes || null,
      start_time: entry.desired_start,
      end_time: entry.desired_end,
      status: 'scheduled',
      attendee_count: 1,
    };

    const { data: created, error: cErr } = await supabase
      .from('appointments')
      .insert([appt])
      .select()
      .single();
    if (cErr) throw cErr;

    await supabase
      .from('waitlist_entries')
      .update({ status: 'promoted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', req.tenantId);

    res.status(201).json({ message: 'Promoted to appointment', appointment: created });
  } catch (error) {
    console.error('Error promoting waitlist entry:', error);
    res.status(500).json({ error: 'Failed to promote waitlist entry' });
  }
});

export default router;
