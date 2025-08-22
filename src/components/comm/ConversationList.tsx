import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Conversation, listConversations, createConversation } from '../../api/communications';

interface Props {
  onSelect: (c: Conversation) => void;
  selectedId?: string;
}

export default function ConversationList({ onSelect, selectedId }: Props) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      const list = await listConversations(userId ? { participant_user_id: userId } : undefined);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      const conv = await createConversation({ title: newTitle || 'New Conversation', type: 'care', participant_user_ids: userId ? [userId] : [] });
      setNewTitle('');
      setItems((prev) => [conv, ...prev]);
      onSelect(conv);
    } catch (e: any) {
      setError(e?.message || 'Failed to create conversation');
    }
  };

  return (
    <div className="h-full flex flex-col border-r border-cyan-500/20">
      <div className="p-3 border-b border-cyan-500/10">
        <div className="text-sm text-gray-400 mb-2">Conversations</div>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm"
            placeholder="Start a new conversation"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button onClick={handleCreate} className="px-3 py-2 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg">New</button>
        </div>
        {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-gray-400 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-3 text-gray-500 text-sm">No conversations yet.</div>
        ) : (
          <ul>
            {items.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c)}
                  className={`w-full text-left px-3 py-2 hover:bg-cyan-500/10 border-b border-cyan-500/10 ${selectedId === c.id ? 'bg-cyan-500/10' : ''}`}
                >
                  <div className="text-sm text-gray-200 truncate">{c.title || 'Untitled'}</div>
                  <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
