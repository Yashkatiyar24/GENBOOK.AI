import React, { useEffect, useRef, useState } from 'react';
import { Message, listMessages, sendMessage, markRead } from '../../api/communications';
import { supabase } from '../../supabase';

interface Props {
  conversationId?: string;
}

export default function MessageThread({ conversationId }: Props) {
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (!conversationId) return;
    let isMounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const msgs = await listMessages(conversationId);
        if (!isMounted) return;
        setItems(msgs);
        markRead(conversationId).catch(() => {});
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to load messages');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communications_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems((prev) => [...prev, payload.new as any]);
          setTimeout(scrollToEnd, 50);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    setTimeout(scrollToEnd, 50);
  }, [items.length]);

  const handleSend = async () => {
    if (!conversationId || !draft.trim()) return;
    try {
      await sendMessage(conversationId, draft.trim());
      setDraft('');
    } catch (e: any) {
      setError(e?.message || 'Failed to send');
    }
  };

  if (!conversationId) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Select a conversation</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <div className="text-gray-400 text-sm">Loading...</div>}
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {items.map((m) => (
          <div key={m.id} className="bg-black/30 border border-cyan-500/10 rounded-lg p-3">
            <div className="text-sm text-gray-200 whitespace-pre-wrap">{m.body}</div>
            <div className="text-[10px] text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-cyan-500/10 p-3 flex gap-2">
        <input
          className="flex-1 px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm"
          placeholder="Type a message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <button onClick={handleSend} className="px-4 py-2 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg">Send</button>
      </div>
    </div>
  );
}
