import React, { useState } from 'react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import type { Conversation } from '../../api/communications';

export default function CommunicationsPanel() {
  const [selected, setSelected] = useState<Conversation | null>(null);

  return (
    <div className="h-full w-full flex bg-black/60 border border-cyan-500/20 rounded-xl overflow-hidden">
      <div className="w-80 md:w-96">
        <ConversationList selectedId={selected?.id} onSelect={setSelected} />
      </div>
      <div className="flex-1 min-w-0">
        <MessageThread conversationId={selected?.id} />
      </div>
    </div>
  );
}
