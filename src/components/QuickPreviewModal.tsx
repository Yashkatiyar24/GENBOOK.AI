import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Users, MapPin } from 'lucide-react';

export type Priority = 'high' | 'medium' | 'low';

export interface QuickPreviewInitial {
  eventName: string;
  dateISO: string; // YYYY-MM-DD
  time: string; // e.g. 09:00 AM
  durationMin: number; // minutes
  priority: Priority;
  notes?: string;
  location?: string;
  participants?: string[]; // emails
}

interface QuickPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial: QuickPreviewInitial | null;
  onConfirm: (data: QuickPreviewInitial) => Promise<void> | void;
  onRescheduleSuggestion?: (data: QuickPreviewInitial) => Promise<void> | void;
  onAISuggestAgenda?: (currentNotes: string) => Promise<string> | string;
  onFindBestTime?: (data: QuickPreviewInitial) => Promise<{ dateISO: string; time: string }> | { dateISO: string; time: string };
  onAutoAddMeetingLink?: () => Promise<string> | string; // returns URL
}

const QuickPreviewModal: React.FC<QuickPreviewModalProps> = ({
  isOpen,
  onClose,
  initial,
  onConfirm,
  onRescheduleSuggestion,
  onAISuggestAgenda,
  onFindBestTime,
  onAutoAddMeetingLink,
}) => {
  const [form, setForm] = useState<QuickPreviewInitial | null>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
    setError(null);
    setSuccess(null);
  }, [initial, isOpen]);

  const participantsText = useMemo(() => (form?.participants || []).join(', '), [form]);

  if (!isOpen || !form) return null;

  const setField = <K extends keyof QuickPreviewInitial>(key: K, value: QuickPreviewInitial[K]) =>
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));

  const handleAISuggestAgenda = async () => {
    try {
      if (!onAISuggestAgenda) return;
      const result = await onAISuggestAgenda(form.notes || '');
      setField('notes', result);
      setSuccess('Agenda suggested. You can edit before sending.');
    } catch (e: any) {
      setError(e?.message || 'Failed to generate agenda.');
    }
  };

  const handleFindBestTime = async () => {
    try {
      if (!onFindBestTime) return;
      const best = await onFindBestTime(form);
      if (best?.dateISO && best?.time) {
        setField('dateISO', best.dateISO);
        setField('time', best.time);
        setSuccess('Updated to the best available time.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to find a better time.');
    }
  };

  const handleAutoAddLink = async () => {
    try {
      if (!onAutoAddMeetingLink) return;
      const url = await onAutoAddMeetingLink();
      const loc = form.location ? `${form.location} • ${url}` : url;
      setField('location', loc);
      setSuccess('Meeting link added.');
    } catch (e: any) {
      setError(e?.message || 'Failed to create meeting link.');
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await onConfirm(form);
      setSuccess('Invite sent.');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to confirm and send invite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!onRescheduleSuggestion) return onClose();
    try {
      await onRescheduleSuggestion(form);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to suggest a new time.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-[#0b1220] border border-cyan-500/20 rounded-2xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-cyan-300">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-white mb-4">Quick Preview</h3>

        {/* Event Name */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Event Name</label>
          <input
            value={form.eventName}
            onChange={(e) => setField('eventName', e.target.value)}
            className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Date & Time + Duration */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Date</label>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={form.dateISO}
                onChange={(e) => setField('dateISO', e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-black/30 border border-cyan-500/20 rounded-lg text-white focus:border-cyan-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Time</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={form.time}
                onChange={(e) => setField('time', e.target.value)}
                placeholder="9:00 AM"
                className="w-full pl-9 pr-3 py-3 bg-black/30 border border-cyan-500/20 rounded-lg text-white focus:border-cyan-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Duration</label>
            <input
              type="number"
              min={15}
              step={15}
              value={form.durationMin}
              onChange={(e) => setField('durationMin', Number(e.target.value))}
              className="w-full px-3 py-3 bg-black/30 border border-cyan-500/20 rounded-lg text-white focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Priority */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Priority</label>
          <div className="flex items-center space-x-2">
            {(['high','medium','low'] as Priority[]).map(p => (
              <button
                key={p}
                onClick={() => setField('priority', p)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  form.priority === p
                    ? p === 'high' ? 'bg-red-500/20 border-red-400 text-red-300' : p === 'medium' ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300' : 'bg-green-500/20 border-green-400 text-green-300'
                    : 'bg-black/30 border-cyan-500/20 text-gray-300'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Description / Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => setField('notes', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg text-white focus:border-cyan-400"
            placeholder="Agenda items, context, goals..."
          />
        </div>

        {/* Location & Participants */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Location</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={form.location || ''}
                onChange={(e) => setField('location', e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-black/30 border border-cyan-500/20 rounded-lg text-white focus:border-cyan-400"
                placeholder="Conference Room or https://meet..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Participants</label>
            <div className="relative">
              <Users className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={participantsText}
                onChange={(e) => setField('participants', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="alice@acme.com, bob@acme.com"
                className="w-full pl-9 pr-3 py-3 bg-black/30 border border-cyan-500/20 rounded-lg text-white focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* AI Actions */}
        <div className="flex items-center space-x-4 text-sm mb-4">
          <button onClick={handleAISuggestAgenda} className="text-cyan-300 hover:text-cyan-200">AI Suggest Agenda</button>
          <span className="text-gray-600">|</span>
          <button onClick={handleFindBestTime} className="text-cyan-300 hover:text-cyan-2 00">Find Best Time</button>
          <span className="text-gray-600">|</span>
          <button onClick={handleAutoAddLink} className="text-cyan-300 hover:text-cyan-200">Auto-Add Meeting Link</button>
        </div>

        {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-3 text-green-400 text-sm">{success}</div>}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReschedule}
            className="px-4 py-2 bg-black/30 border border-cyan-500/20 text-gray-200 rounded-lg hover:border-cyan-400"
          >
            Reschedule Suggestion
          </button>
          <div className="space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-black/30 border border-gray-600/30 text-gray-300 rounded-lg">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black rounded-lg hover:shadow-[0_0_16px_rgba(6,182,212,0.5)] disabled:opacity-50"
            >
              Confirm & Send Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickPreviewModal;
