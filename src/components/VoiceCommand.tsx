import React, { useState, useEffect, useRef, FC } from 'react';
import { Mic, MicOff, X, Send, Volume2, VolumeX } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { createAppointment } from '../utils/supabaseClient';

interface VoiceCommandProps {
  user: SupabaseUser | null;
  isOpen: boolean;
  onClose: () => void;
  onAppointmentBooked?: (appointment: any) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  new (): SpeechRecognition;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

// --- Natural language date/time parser ---
function parseNaturalDateTime(text: string): { date: string; time: string } | null {
  const now = new Date();
  let date = '';
  let time = '';
  const lower = text.toLowerCase();

  if (lower.includes('today')) {
    date = formatDate(now);
  } else if (lower.includes('day after tomorrow')) {
    const d = new Date(now); d.setDate(d.getDate() + 2); date = formatDate(d);
  } else if (lower.includes('tomorrow')) {
    const d = new Date(now); d.setDate(d.getDate() + 1); date = formatDate(d);
  } else {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < dayNames.length; i++) {
      if (lower.includes(dayNames[i])) {
        const d = new Date(now);
        const diff = (i - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        date = formatDate(d);
        break;
      }
    }
  }

  const timeMatch = lower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.replace(/\./g, '');
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    if (!ampm && hours >= 1 && hours <= 7) hours += 12; // assume PM for 1-7 without ampm
    time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  if (!date && !time) return null;
  if (!date) date = formatDate(now);
  if (!time) {
    const nextHour = new Date(now); nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    time = `${nextHour.getHours().toString().padStart(2, '0')}:00`;
  }
  return { date, time };
}

function formatDate(d: Date): string { return d.toISOString().split('T')[0]; }

function formatTimeDisplay(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// --- Booking state stored in a ref to avoid stale closures ---
interface BookingState {
  step: 'idle' | 'title' | 'datetime' | 'confirm';
  title: string;
  date: string;
  time: string;
}

const VoiceCommand: FC<VoiceCommandProps> = ({ user: _user, isOpen, onClose: handleClose, onAppointmentBooked }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([]);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const bookingRef = useRef<BookingState>({ step: 'idle', title: '', date: '', time: '' });
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const shouldAutoListen = useRef(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- Text-to-speech ---
  const speak = (text: string, thenListen = true) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      if (thenListen) startListeningDelayed();
      return;
    }
    window.speechSynthesis.cancel();
    // Strip emoji for cleaner TTS
    const clean = text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[📋📅🕐📍✅❌⚠️•]/gu, '').replace(/\n+/g, '. ').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'en-US';
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onend = () => { if (thenListen) startListeningDelayed(); };
    utterance.onerror = () => { if (thenListen) startListeningDelayed(); };
    window.speechSynthesis.speak(utterance);
  };

  const startListeningDelayed = () => {
    setTimeout(() => {
      if (recognitionRef.current && !isListeningRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          isListeningRef.current = true;
        } catch { /* already started */ }
      }
    }, 300);
  };

  // --- Message helpers ---
  const addMsg = (role: 'assistant' | 'user', text: string) => setMessages(prev => [...prev, { role, text }]);

  const addAssistantAndSpeak = (text: string, thenListen = true) => {
    addMsg('assistant', text);
    speak(text, thenListen);
  };

  // --- Speech recognition setup ---
  useEffect(() => {
    if (!isOpen) return;

    bookingRef.current = { step: 'idle', title: '', date: '', time: '' };
    setMessages([]);
    setTranscript('');
    setError('');

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); return; }
    setIsSupported(true);

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) { finalTranscript += t; } else { interimTranscript += t; }
      }
      if (interimTranscript) setTranscript(interimTranscript);
      if (finalTranscript) {
        setTranscript('');
        processCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech error:', event.error);
      isListeningRef.current = false;
      setIsListening(false);
      if (event.error === 'no-speech') {
        // Auto-restart if we were in a booking flow
        if (bookingRef.current.step !== 'idle') startListeningDelayed();
      } else if (event.error !== 'aborted') {
        setError(`Mic error: ${event.error}. You can also type below.`);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Welcome message with slight delay
    setTimeout(() => {
      addAssistantAndSpeak(
        'Hi! I can book appointments for you. Say something like "Book a meeting tomorrow at 3pm" or just say "Book appointment".',
        true
      );
    }, 400);

    return () => {
      recognition.stop();
      isListeningRef.current = false;
      window.speechSynthesis?.cancel();
    };
  }, [isOpen]);

  // --- Toggle mic manually ---
  const toggleListening = () => {
    if (isListeningRef.current) {
      recognitionRef.current?.stop();
      isListeningRef.current = false;
      setIsListening(false);
    } else if (recognitionRef.current) {
      window.speechSynthesis?.cancel(); // stop any TTS
      setError('');
      try {
        recognitionRef.current.start();
        isListeningRef.current = true;
        setIsListening(true);
      } catch { /* already started */ }
    }
  };

  // --- Process command (uses ref to avoid stale closure) ---
  const processCommand = (text: string) => {
    addMsg('user', text);
    const lower = text.toLowerCase().trim();
    const b = bookingRef.current;

    if (b.step === 'idle') {
      if (lower.includes('book') || lower.includes('schedule') || lower.includes('appointment') || lower.includes('meeting') || lower.includes('call')) {
        const parsed = parseNaturalDateTime(text);
        // Try extracting title from "book a <title> tomorrow at 3pm"
        const titleMatch = text.match(/(?:book|schedule)\s+(?:a|an)?\s*(.*?)(?:\s+(?:on|at|for|tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b)/i);
        const title = titleMatch?.[1]?.trim() || '';

        if (parsed && title) {
          bookingRef.current = { step: 'confirm', title, date: parsed.date, time: parsed.time };
          addAssistantAndSpeak(`Got it! Here's what I have:\n📋 ${title}\n📅 ${formatDateDisplay(parsed.date)}\n🕐 ${formatTimeDisplay(parsed.time)}\n📍 Online\n\nShall I confirm this? Say yes or no.`);
        } else if (parsed) {
          bookingRef.current = { ...b, step: 'title', date: parsed.date, time: parsed.time };
          addAssistantAndSpeak(`I'll schedule that for ${formatDateDisplay(parsed.date)} at ${formatTimeDisplay(parsed.time)}. What should I call this appointment?`);
        } else {
          bookingRef.current = { ...b, step: 'title' };
          addAssistantAndSpeak('Sure! What would you like to name this appointment?');
        }
      } else {
        addAssistantAndSpeak('I can help you book appointments! Try saying "Book a meeting tomorrow at 3pm" or "Schedule an appointment".');
      }
      return;
    }

    if (b.step === 'title') {
      bookingRef.current = { ...b, step: b.date ? 'confirm' : 'datetime', title: text };
      if (b.date && b.time) {
        addAssistantAndSpeak(`Here's your appointment:\n📋 ${text}\n📅 ${formatDateDisplay(b.date)}\n🕐 ${formatTimeDisplay(b.time)}\n📍 Online\n\nShall I confirm? Say yes or no.`);
      } else {
        addAssistantAndSpeak(`"${text}" — got it! When should I schedule it? Say something like "tomorrow at 3pm" or "Monday 10am".`);
      }
      return;
    }

    if (b.step === 'datetime') {
      const parsed = parseNaturalDateTime(text);
      if (parsed) {
        bookingRef.current = { ...b, step: 'confirm', date: parsed.date, time: parsed.time };
        addAssistantAndSpeak(`Here's your appointment:\n📋 ${b.title}\n📅 ${formatDateDisplay(parsed.date)}\n🕐 ${formatTimeDisplay(parsed.time)}\n📍 Online\n\nShall I confirm? Say yes or no.`);
      } else {
        addAssistantAndSpeak('I couldn\'t understand the date and time. Try saying "tomorrow at 3pm" or "next Monday at 10am".');
      }
      return;
    }

    if (b.step === 'confirm') {
      if (lower.includes('yes') || lower.includes('confirm') || lower.includes('sure') || lower.includes('yeah') || lower.includes('ok')) {
        confirmBooking();
      } else if (lower.includes('no') || lower.includes('cancel') || lower.includes('start over')) {
        bookingRef.current = { step: 'idle', title: '', date: '', time: '' };
        addAssistantAndSpeak('No problem! Say "book appointment" to start again.');
      } else {
        addAssistantAndSpeak('Please say "yes" to confirm or "no" to cancel.');
      }
    }
  };

  // --- Confirm and create appointment ---
  const confirmBooking = async () => {
    if (!_user) {
      addAssistantAndSpeak('Please sign in first to book appointments.', false);
      return;
    }
    setIsProcessing(true);
    const { title, date, time } = bookingRef.current;
    try {
      const startDate = new Date(`${date}T${time}:00`);
      const endDate = new Date(startDate.getTime() + 30 * 60000);

      const result = await createAppointment({
        title,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'scheduled',
        priority: 'medium',
        location: 'Online',
        notes: 'Booked via Voice Command',
      });

      if (result.error) throw result.error;

      bookingRef.current = { step: 'idle', title: '', date: '', time: '' };
      addAssistantAndSpeak(`Appointment booked!\n\n📋 ${title}\n📅 ${formatDateDisplay(date)}\n🕐 ${formatTimeDisplay(time)}\n\nYou can view it in your Schedule. Say "book appointment" to book another.`, true);
      toast.success('Appointment booked via voice!');
      onAppointmentBooked?.(result.data);
    } catch (err: any) {
      console.error('Booking error:', err);
      addAssistantAndSpeak(`Failed to book: ${err?.message || 'Unknown error'}. Please try again.`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Text input submit ---
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      // Stop listening while processing text
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      processCommand(textInput.trim());
      setTextInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-[#0f172a] via-[#131b2e] to-[#1a1a2e] rounded-2xl shadow-2xl w-full max-w-md border border-cyan-500/20 overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/10 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-gray-500'}`} />
            <h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Voice Assistant
            </h3>
            {isListening && <span className="text-xs text-green-400 animate-pulse">Listening…</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTtsEnabled(t => !t); window.speechSynthesis?.cancel(); }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              title={ttsEnabled ? 'Mute assistant' : 'Unmute assistant'}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button onClick={() => { window.speechSynthesis?.cancel(); handleClose(); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black rounded-br-md'
                  : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {transcript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 rounded-br-md">
                🎤 {transcript}…
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 rounded-bl-md flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                <span className="text-xs text-gray-400">Booking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-cyan-500/10 p-4 space-y-3 shrink-0">
          {/* Mic button — primary */}
          <button
            onClick={toggleListening}
            disabled={!isSupported || isProcessing}
            className={`w-full flex items-center justify-center py-3.5 rounded-xl font-medium text-sm transition-all ${
              isListening
                ? 'bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-300 border border-red-500/40 hover:from-red-500/40 hover:to-red-600/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 hover:from-cyan-500/30 hover:to-blue-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
            } ${!isSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {isListening ? (
              <><MicOff className="mr-2" size={18} /> Stop Listening</>
            ) : (
              <><Mic className="mr-2" size={18} /> {isSupported ? 'Tap to Speak' : 'Mic not supported'}</>
            )}
          </button>

          {/* Text input — fallback */}
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="Or type here…"
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 transition-all"
            />
            <button type="submit" disabled={!textInput.trim() || isProcessing} className="px-3 py-2.5 bg-white/10 border border-white/10 rounded-xl text-gray-400 disabled:opacity-30 hover:text-white hover:bg-white/15 transition-all">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommand;
