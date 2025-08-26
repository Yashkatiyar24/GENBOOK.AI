import { Router } from 'express';
import { requireRole } from '../middleware/tenant.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { supabase } from '../supabase.js';
import { validateWithZod } from '../middleware/validate.js';
import { AppointmentCreateSchemaWithRules } from '../validation/appointments.js';
import { cached } from '../utils/cache.js';
import { canCreateAppointment, incrementUsage } from '../utils/feature-gating.js';

const router = Router();

// Require an active subscription for all appointment routes
router.use(requireSubscription());

// Get all appointments for the current tenant
router.get('/', async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Tenant context not found' });
    }

    const { data, error } = await cached(`appts:${req.tenantId}:list`, 15, async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', req.tenantId)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data;
    }).then((d) => ({ data: d as any, error: null as any }));

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get a single appointment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Create a new appointment
router.post('/', requireRole(['admin', 'owner']), validateWithZod(AppointmentCreateSchemaWithRules), async (req, res) => {
  try {
    const appointmentData = req.body;

    // Enforce plan limits
    const tenantId = (req as any).tenantId as string | undefined;
    const { allowed, limit, used, plan } = await canCreateAppointment(tenantId!);
    if (!allowed) {
      return res.status(402).json({
        error: 'Monthly appointment limit reached',
        plan,
        used,
        limit,
        message: 'Please upgrade your plan to create more appointments.',
      });
    }

    // Add tenant_id to the appointment data
    const appointmentWithTenant = {
      ...appointmentData,
      tenant_id: tenantId,
      created_by: req.userId
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([appointmentWithTenant])
      .select()
      .single();

    if (error) throw error;

    // Increment usage counter on success
    try { await incrementUsage(tenantId!, 'appointments_month', 1); } catch (e) {}

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update an appointment
router.put('/:id', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating tenant_id
    if (updates.tenant_id) {
      delete updates.tenant_id;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete an appointment
router.delete('/:id', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// Check for appointment conflicts
router.post('/check-conflicts', async (req, res) => {
  try {
    const { start_time, end_time, exclude_id } = req.body;
    
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }

    let query = supabase
      .from('appointments')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`);

    if (exclude_id) {
      query = query.neq('id', exclude_id);
    }

    const { data: conflicts, error } = await query;

    if (error) throw error;

    res.json({
      has_conflict: conflicts.length > 0,
      conflicting_appointments: conflicts
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check for conflicts' });
  }
});

export default router;

// --- Group appointment attendees ---
// List attendees for an appointment
router.get('/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointment_attendees')
      .select('*')
      .eq('appointment_id', id)
      .eq('tenant_id', req.tenantId);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error listing attendees:', error);
    res.status(500).json({ error: 'Failed to list attendees' });
  }
});

// Add attendee to a group appointment
router.post('/:id/attendees', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { contact_id } = req.body as { contact_id: string };
    if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });

    // Fetch appointment to check capacity
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, tenant_id, max_attendees, attendee_count')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .single();
    if (apptErr) throw apptErr;
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    if (appt.max_attendees && appt.attendee_count >= appt.max_attendees) {
      return res.status(400).json({ error: 'Appointment is at capacity' });
    }

    const { data, error } = await supabase
      .from('appointment_attendees')
      .insert([{ appointment_id: id, contact_id, tenant_id: req.tenantId }])
      .select()
      .single();
    if (error) throw error;

    // Increment attendee_count
    await supabase
      .from('appointments')
      .update({ attendee_count: (appt.attendee_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', req.tenantId);

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding attendee:', error);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

// Remove attendee from a group appointment
router.delete('/:id/attendees/:contactId', requireRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id, contactId } = req.params;

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, tenant_id, attendee_count')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .single();
    if (apptErr) throw apptErr;
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const { data, error } = await supabase
      .from('appointment_attendees')
      .delete()
      .eq('appointment_id', id)
      .eq('contact_id', contactId)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from('appointments')
      .update({ attendee_count: Math.max(0, (appt.attendee_count || 0) - 1), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', req.tenantId);

    res.json({ message: 'Attendee removed', removed: data });
  } catch (error) {
    console.error('Error removing attendee:', error);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});
