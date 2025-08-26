import express from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireRole } from '../middleware/tenant.middleware.js';

const router = express.Router();

// Create conversation
router.post('/conversations', requireRole(['admin', 'provider']), async (req: Request, res: Response) => {
  try {
    const { title, type = 'care', participant_user_ids = [], participant_contact_ids = [] } = req.body || {};
    const tenantId = (req as any).tenantId;

    const { data: conv, error: convErr } = await supabase
      .from('communications_conversations')
      .insert([{ tenant_id: tenantId, title, type, created_by: (req as any).userId }])
      .select()
      .single();
    if (convErr) return res.status(400).json({ error: convErr.message });

    const participants: any[] = [];
    for (const uid of participant_user_ids) participants.push({ conversation_id: conv.id, user_id: uid, role: 'provider' });
    for (const cid of participant_contact_ids) participants.push({ conversation_id: conv.id, contact_id: cid, role: 'patient' });
    if (participants.length) {
      const { error: partErr } = await supabase.from('communications_participants').insert(participants);
      if (partErr) return res.status(400).json({ error: partErr.message });
    }

    res.status(201).json(conv);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create conversation' });
  }
});

// List conversations (optionally by participant)
router.get('/conversations', requireRole(['admin', 'provider', 'user']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const participantUserId = String(req.query.participant_user_id || '') || undefined;
    const participantContactId = String(req.query.participant_contact_id || '') || undefined;

    let query = supabase.from('communications_conversations').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });

    if (participantUserId || participantContactId) {
      // Filter via participants join (simple approach using RPC or materialized view would be better later)
      const { data: parts, error: partsErr } = await supabase
        .from('communications_participants')
        .select('conversation_id, user_id, contact_id')
        .or([
          participantUserId ? `user_id.eq.${participantUserId}` : '',
          participantContactId ? `contact_id.eq.${participantContactId}` : '',
        ].filter(Boolean).join(','));
      if (partsErr) return res.status(400).json({ error: partsErr.message });
      const convIds = Array.from(new Set((parts || []).map(p => p.conversation_id)));
      if (convIds.length === 0) return res.json([]);
      query = query.in('id', convIds);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch conversations' });
  }
});

// Get messages for conversation
router.get('/conversations/:id/messages', requireRole(['admin', 'provider', 'user']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('communications_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch messages' });
  }
});

// Send message in a conversation
router.post('/conversations/:id/messages', requireRole(['admin', 'provider', 'user']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const senderUserId = (req as any).userId; // if patient portal later, map to contact id
    const { id } = req.params;
    const { body, attachment_urls = [] } = req.body || {};
    const { data, error } = await supabase
      .from('communications_messages')
      .insert([{ tenant_id: tenantId, conversation_id: id, sender_user_id: senderUserId, body, attachment_urls }])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to send message' });
  }
});

// Mark conversation as read
router.post('/conversations/:id/read', requireRole(['admin', 'provider', 'user']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const { error } = await supabase
      .from('communications_participants')
      .update({ last_read_at: new Date().toISOString() })
      .match({ conversation_id: id, user_id: userId });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to mark as read' });
  }
});

export default router;
