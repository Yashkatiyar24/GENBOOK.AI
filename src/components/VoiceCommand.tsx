import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface VoiceCommandProps {
  user: SupabaseUser | null;
  isOpen: boolean;
  onClose: () => void;
  onAppointmentBooked?: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceCommand: React.FC<VoiceCommandProps> = ({ user, isOpen, onClose, onAppointmentBooked }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user) {
      initializeSpeechRecognition();
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isOpen, user]);

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
      setResponse('');
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        processVoiceCommand(finalTranscript);
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setError(`Speech recognition error: ${event.error}`);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
  };

  const startListening = () => {
    if (!user) {
      setError('Voice commands are currently unavailable. Please log in to Zenbook AI or check your connection to continue.');
      return;
    }

    if (!recognition) {
      setError('Voice commands are currently unavailable. Please log in to Zenbook AI or check your connection to continue.');
      return;
    }

    try {
      recognition.start();
    } catch (err) {
      setError('Voice commands are currently unavailable. Please log in to Zenbook AI or check your connection to continue.');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
  };

  const processVoiceCommand = async (command: string) => {
    if (!user) {
      setResponse('Voice commands are currently unavailable. Please log in to Zenbook AI or check your connection to continue.');
      return;
    }

    setIsProcessing(true);
    const lowerCommand = command.toLowerCase();

    try {
      // Book appointment commands
      if (lowerCommand.includes('book') || lowerCommand.includes('schedule') || lowerCommand.includes('appointment')) {
        await handleBookingCommand(lowerCommand);
      }
      // Check availability commands
      else if (lowerCommand.includes('available') || lowerCommand.includes('free') || lowerCommand.includes('open')) {
        await handleAvailabilityCommand(lowerCommand);
      }
      // Cancel appointment commands
      else if (lowerCommand.includes('cancel') || lowerCommand.includes('delete')) {
        await handleCancelCommand(lowerCommand);
      }
      // Show schedule commands
      else if (lowerCommand.includes('show') || lowerCommand.includes('list') || lowerCommand.includes('schedule')) {
        await handleScheduleCommand(lowerCommand);
      }
      // Help commands
      else if (lowerCommand.includes('help') || lowerCommand.includes('what can')) {
        setResponse('I can help you with:\n• "Book an appointment with Dr. Smith tomorrow at 2 PM"\n• "Show my schedule for today"\n• "What appointments do I have this week?"\n• "Cancel my appointment with Dr. Johnson"\n• "What times are available tomorrow?"');
      }
      else {
        setResponse('I didn\'t understand that command. Try saying something like "Book an appointment" or "Show my schedule" or say "Help" for more options.');
      }
    } catch (err) {
      setResponse('Voice commands are currently unavailable. Please log in to Zenbook AI or check your connection to continue.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBookingCommand = async (command: string) => {
    try {
      // Extract appointment details from voice command
      const appointmentData = parseBookingCommand(command);
      
      if (!appointmentData.provider) {
        setResponse('Please specify which doctor you\'d like to book with. For example: "Book an appointment with Dr. Smith"');
        return;
      }

      // Create the appointment
      const startDateTime = new Date(appointmentData.date);
      startDateTime.setHours(appointmentData.hour, appointmentData.minute, 0, 0);
      
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutes default

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          title: `Appointment with ${appointmentData.provider}`,
          description: `Booked via voice command: "${command}"`,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'scheduled',
          doctor_name: appointmentData.provider
        })
        .select()
        .single();

      if (error) throw error;

      setResponse(`Great! I've booked your appointment with ${appointmentData.provider} for ${startDateTime.toLocaleDateString()} at ${startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. You can view it in your dashboard.`);
      
      if (onAppointmentBooked) {
        onAppointmentBooked();
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      setResponse('I couldn\'t book that appointment. Please try using the New Appointment button or be more specific with the details.');
    }
  };

  const handleAvailabilityCommand = async (command: string) => {
    try {
      const date = parseDateFromCommand(command);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('user_id', user.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;

      const busyTimes = appointments?.map(apt => ({
        start: new Date(apt.start_time),
        end: new Date(apt.end_time)
      })) || [];

      const availableSlots = findAvailableSlots(date, busyTimes);
      
      if (availableSlots.length > 0) {
        const slotsList = availableSlots.slice(0, 5).map(slot => 
          slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        ).join(', ');
        setResponse(`Available times for ${date.toLocaleDateString()}: ${slotsList}. Would you like me to book one of these?`);
      } else {
        setResponse(`No available time slots found for ${date.toLocaleDateString()}. Try a different date.`);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setResponse('I couldn\'t check availability right now. Please try again or use the calendar view.');
    }
  };

  const handleCancelCommand = async (command: string) => {
    try {
      // Get upcoming appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(5);

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        setResponse('You don\'t have any upcoming appointments to cancel.');
        return;
      }

      // For now, ask for confirmation rather than automatically canceling
      const nextAppointment = appointments[0];
      setResponse(`Your next appointment is with ${nextAppointment.doctor_name || 'your provider'} on ${new Date(nextAppointment.start_time).toLocaleDateString()} at ${new Date(nextAppointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. To cancel this appointment, please use the Schedule tab for confirmation.`);
    } catch (error) {
      console.error('Error handling cancel command:', error);
      setResponse('I couldn\'t process that cancellation. Please use the Schedule tab to cancel appointments.');
    }
  };

  const handleScheduleCommand = async (command: string) => {
    try {
      const date = parseDateFromCommand(command);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        setResponse(`You have no appointments scheduled for ${date.toLocaleDateString()}.`);
        return;
      }

      const appointmentsList = appointments.map(apt => {
        const startTime = new Date(apt.start_time);
        return `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${apt.title}`;
      }).join('\n');

      setResponse(`Your appointments for ${date.toLocaleDateString()}:\n${appointmentsList}`);
    } catch (error) {
      console.error('Error getting schedule:', error);
      setResponse('I couldn\'t retrieve your schedule. Please check the Schedule tab.');
    }
  };

  const parseBookingCommand = (command: string) => {
    const result = {
      provider: '',
      date: new Date(),
      hour: 9,
      minute: 0
    };

    // Extract doctor name
    const doctorMatch = command.match(/(?:with|see)\s+(?:dr\.?\s+)?([a-zA-Z\s]+?)(?:\s+(?:on|at|for|tomorrow|today|next))/i);
    if (doctorMatch) {
      result.provider = `Dr. ${doctorMatch[1].trim()}`;
    }

    // Extract date
    if (command.includes('tomorrow')) {
      result.date = new Date();
      result.date.setDate(result.date.getDate() + 1);
    } else if (command.includes('today')) {
      result.date = new Date();
    } else if (command.includes('next week')) {
      result.date = new Date();
      result.date.setDate(result.date.getDate() + 7);
    }

    // Extract time
    const timeMatch = command.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2] || '0');
      const period = timeMatch[3]?.toLowerCase();

      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }

      result.hour = hour;
      result.minute = minute;
    }

    return result;
  };

  const parseDateFromCommand = (command: string): Date => {
    const today = new Date();
    
    if (command.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    } else if (command.includes('today')) {
      return today;
    } else if (command.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    return today;
  };

  const findAvailableSlots = (date: Date, busyTimes: { start: Date; end: Date }[]): Date[] => {
    const slots: Date[] = [];
    const workStart = 9; // 9 AM
    const workEnd = 17; // 5 PM

    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

        const isAvailable = !busyTimes.some(busy => 
          (slotStart >= busy.start && slotStart < busy.end) ||
          (slotEnd > busy.start && slotEnd <= busy.end) ||
          (slotStart <= busy.start && slotEnd >= busy.end)
        );

        if (isAvailable) {
          slots.push(slotStart);
        }
      }
    }

    return slots;
  };

  const handleClose = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    setTranscript('');
    setResponse('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  // Check if user is logged in
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-black/80 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white text-center">Voice Commands Unavailable</h3>
            <p className="text-red-300 text-center">
              Voice commands are currently unavailable. Please log in to Zenbook AI or check your connection to continue.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/40 text-red-400 font-medium rounded-lg transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 max-w-lg w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
              Voice Commands
            </h3>
            <p className="text-gray-400">
              Speak naturally to book appointments, check availability, or manage your schedule
            </p>
          </div>

          {/* Microphone Button */}
          <div className="relative">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? 'bg-red-500/20 border-2 border-red-400 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 text-red-400" />
              ) : (
                <Mic className="w-10 h-10 text-black" />
              )}
            </button>
            
            {isListening && (
              <div className="absolute -inset-2 rounded-full border-2 border-cyan-400 animate-ping"></div>
            )}
          </div>

          {/* Status */}
          <div className="text-center min-h-[60px] flex flex-col justify-center">
            {isListening && (
              <div className="flex items-center justify-center space-x-2 text-cyan-400">
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span>Listening... Speak now</span>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center justify-center space-x-2 text-yellow-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                <span>Processing your command...</span>
              </div>
            )}
            
            {!isListening && !isProcessing && (
              <p className="text-gray-400">
                Click the microphone to start voice commands
              </p>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="w-full bg-black/30 border border-cyan-500/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-cyan-400 mb-2">You said:</h4>
              <p className="text-white">{transcript}</p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="w-full bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-400 mb-2">Response:</h4>
              <p className="text-green-300 whitespace-pre-line">{response}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-400 mb-2">Error:</h4>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Examples */}
          <div className="w-full bg-black/20 border border-gray-600/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Try saying:</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <p>• "Book an appointment with Dr. Smith tomorrow at 2 PM"</p>
              <p>• "Show my schedule for today"</p>
              <p>• "What times are available tomorrow?"</p>
              <p>• "Cancel my appointment with Dr. Johnson"</p>
              <p>• "Help" - for more commands</p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-black/50 hover:bg-black/70 border border-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommand;