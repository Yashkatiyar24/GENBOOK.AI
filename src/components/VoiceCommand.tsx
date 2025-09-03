import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

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

// TypeScript interfaces for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

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

const VoiceCommand: FC<VoiceCommandProps> = ({
  user: _user,
  isOpen,
  onClose: handleClose,
  onAppointmentBooked,
}) => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [speechRecognitionFailed, setSpeechRecognitionFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  // Define the booking data type
  interface BookingData {
    name: string;
    email: string;
    date: string;
    time: string;
    notes: string;
    title: string;
    duration: number; // Ensure duration is always a number
    priority: 'low' | 'medium' | 'high';
    provider: string;
  }

  const [bookingData, setBookingData] = useState<BookingData>({
    name: '',
    email: '',
    date: '',
    time: '',
    notes: '',
    title: '',
    duration: 30, // default 30 minutes
    priority: 'medium',
    provider: ''
  });
  
  const resetBooking = () => {
    setBookingData(prev => ({
      ...prev,
      name: '',
      email: '',
      date: '',
      time: '',
      notes: '',
      title: '',
      duration: 30,
      priority: 'medium',
      provider: ''
    }));
    setShowBookingForm(false);
  };

  // Refs and hooks
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const navigate = useNavigate();
  const { hasAccess } = useFeatureAccess('voice_commands');

    // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('VoiceCommand - Access state:', { hasAccess, isLoading, error });
    }
  }, [hasAccess, isLoading, error]);

  // Start listening to voice commands
  const startListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Could not start voice recognition. Please try again.');
    }
  };

  // Stop listening to voice commands
  const stopListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  };

  // Handle voice command start with access check
  const handleStartListening = useCallback(() => {
    console.log('handleStartListening - hasAccess:', hasAccess, 'isLoading:', isLoading, 'navigate function:', typeof navigate);
    
    if (isLoading) {
      console.log('Access check still loading...');
      return;
    }
    
    if (!hasAccess) {
      console.log('No access to voice commands, redirecting to billing...');
      const billingPath = '/billing';
      console.log('Navigating to:', billingPath);
      window.location.href = billingPath;
      navigate(billingPath, { replace: true });
      return;
    }
    
    if (!isListening) {
      console.log('Starting voice command...');
      startListening();
    } else {
      console.log('Stopping voice command...');
      stopListening();
    }
  }, [hasAccess, isLoading, isListening, navigate, startListening, stopListening]);

  // Process voice command
  const processCommand = useCallback((command: string) => {
    console.log('Processing command:', command);
    
    // Convert to lowercase for easier matching
    const normalizedCommand = command.toLowerCase().trim();
    
    // Simple command matching
    if (normalizedCommand.includes('book appointment') || 
        normalizedCommand.includes('schedule appointment')) {
      setResponse('Opening appointment booking form...');
      setShowBookingForm(true);
    } else if (normalizedCommand.includes('cancel') || 
              normalizedCommand.includes('stop')) {
      setResponse('Stopping voice command...');
      stopListening();
    } else if (normalizedCommand.includes('help')) {
      setResponse('You can say: "Book an appointment", "Cancel", or "Help"');
    } else {
      setResponse(`I didn't understand: "${command}". Try saying "Help" for available commands.`);
    }
  }, [stopListening]);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    console.log('Initializing speech recognition...');
    
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.error('Speech recognition not supported');
        setSpeechRecognitionFailed(true);
        setIsSupported(false);
        return null;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
          
        setTranscript(transcript);
        
        if (event.results[0].isFinal) {
          processCommand(transcript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      return recognition;
    }
    
    return null;
  }, []);

  // Initialize speech recognition when component mounts or isOpen changes
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('VoiceCommand opened, initializing...');
    const recognition = initializeSpeechRecognition();
    
    if (!recognition) {
      console.log('Speech recognition initialization failed');
      setSpeechRecognitionFailed(true);
      setIsLoading(false);
      return;
    }
    
    recognitionRef.current = recognition;
    setIsSupported(true);
    setIsLoading(false);
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen, initializeSpeechRecognition]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-cyan-400 flex items-center">
            <span className="mr-2">🎙️</span> Voice Command
          </h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Close voice command"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          {isLoading ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Checking voice command access...</p>
            </div>
          ) : !isSupported ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MicOff className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Voice Commands Not Supported</h3>
              <p className="text-gray-400 mb-6">Your browser doesn't support the Web Speech API. Try using Chrome or Edge.</p>
            </div>
          ) : (
            <button
              onClick={handleStartListening}
              disabled={isProcessing}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? 'bg-red-500/20 border-2 border-red-500/50 shadow-lg shadow-red-500/20'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-2 border-cyan-500/30 hover:border-cyan-500/50'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <div className={`absolute inset-0 rounded-full ${
                isListening ? 'animate-ping bg-red-500/30' : ''
              }`}></div>
              {isProcessing ? (
                <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Mic className={`w-8 h-8 ${isListening ? 'text-red-400' : 'text-cyan-400'}`} />
              )}
            </button>
          )}

          {transcript && (
            <div className="mt-8 w-full bg-black/30 rounded-lg p-4 border border-cyan-500/20">
              <p className="text-sm text-gray-400 mb-1">You said:</p>
              <p className="text-white">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="mt-4 w-full bg-black/30 rounded-lg p-4 border border-cyan-500/20">
              <p className="text-sm text-cyan-400 mb-1">Response:</p>
              <p className="text-gray-300">{response}</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          {speechRecognitionFailed && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl backdrop-blur-sm">
              <p className="text-sm text-yellow-300">
                <strong>Note:</strong> Voice recognition is not available in your browser. You can still use text input to interact with the voice command system.
              </p>
            </div>
          )}
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <button
                onClick={handleStartListening}
                disabled={!isSupported || isProcessing || speechRecognitionFailed || isLoading}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 hover:scale-105 shadow-lg shadow-blue-500/30'
                } text-white disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <div className="mt-3 text-sm text-gray-300">
                {isLoading ? (
                  'Checking access...'
                ) : !hasAccess ? (
                  '🔒 Upgrade to use voice commands'
                ) : isListening ? (
                  '🎤 Listening...'
                ) : speechRecognitionFailed ? (
                  '🎤 Voice unavailable - use text input'
                ) : (
                  '🎤 Click to speak'
                )}
              </div>
            </div>
          </div>

          {transcript && (
            <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-cyan-300 font-medium">You said:</span>
              </div>
              <p className="text-sm text-white">{transcript}</p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent"></div>
                <span className="text-sm text-cyan-300 font-medium">Processing your command...</span>
              </div>
            </div>
          )}

          {response && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-blue-300 font-medium">AI Response:</span>
              </div>
              <p className="text-sm text-white">{response}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs text-red-300 font-medium">Error:</span>
              </div>
              <p className="text-sm text-white mb-3">{error}</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setError(null);
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.start();
                        setIsListening(true);
                      } catch (err) {
                        console.error('Error restarting after error:', err);
                      }
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-colors duration-300"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setShowTextInput(true);
                    setSpeechRecognitionFailed(true);
                  }}
                  className="px-3 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg transition-colors duration-300"
                >
                  Use Text Input
                </button>
              </div>
            </div>
          )}

          {/* Manual text input fallback */}
          {(showTextInput || speechRecognitionFailed || (!isListening && !transcript)) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                {speechRecognitionFailed ? '🎤 Voice recognition unavailable. Type your command:' : 'Or type your command:'}
              </label>
              <input
                type="text"
                placeholder="e.g., book an appointment, check schedule..."
                className="w-full px-4 py-3 bg-black/20 border border-cyan-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400/50 text-white placeholder-gray-400 transition-all duration-300"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && transcript.trim()) {
                    // Process the command
                    const processCommand = async (command: string) => {
                      if (!command) return;
                      const normalizedCommand = command.toLowerCase().trim();
                      setIsProcessing(true);
                      
                      if (normalizedCommand.includes('book')) {
                        setResponse('Great! Please confirm the details below to book your appointment.');
                        setShowBookingForm(true);
                        const todayISO = new Date().toISOString().split('T')[0];
                        setBookingData(prev => ({ ...prev, date: todayISO }));
                      } else if (normalizedCommand.includes('cancel')) {
                        setResponse('Which appointment would you like to cancel?');
                      } else if (normalizedCommand.includes('next') || normalizedCommand.includes('upcoming')) {
                        setResponse('Here are your upcoming appointments...');
                      } else if (normalizedCommand.includes('availability')) {
                        setResponse('Here are the available time slots...');
                      } else {
                        setResponse('I\'m not sure how to help with that. Try saying "book an appointment" or "check availability".');
                      }
                      setIsProcessing(false);
                    };
                    processCommand(transcript);
                  }
                }}
              />
            </div>
          )}

          {/* Booking form (structured capture) */}
          {showBookingForm && (
            <div className="mb-6 p-4 bg-black/20 border border-cyan-500/20 rounded-xl">
              <h4 className="text-sm font-medium text-cyan-300 mb-3">New Appointment Details</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date *</label>
                    <input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Time *</label>
                    <input type="time" value={bookingData.time} onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Appointment Title *</label>
                  <input type="text" value={bookingData.title} onChange={(e) => setBookingData({ ...bookingData, title: e.target.value })} placeholder="e.g., Consultation with Dr. Lee" className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Duration (min) *</label>
                    <input 
  type="number" 
  min={5} 
  step={5} 
  value={bookingData.duration} 
  onChange={(e) => {
    const numValue = parseInt(e.target.value, 10);
    if (!isNaN(numValue)) {
      setBookingData({ ...bookingData, duration: numValue });
    }
  }} 
  className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm" 
/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={bookingData.priority}
                      onChange={(e) => {
                        const { name, value, type } = e.target;
                        setBookingData(prev => {
                          if (name === 'priority' && (value === 'low' || value === 'medium' || value === 'high')) {
                            return {
                              ...prev,
                              [name]: value
                            };
                          }
                          return prev;
                        });
                      }}
                      className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Provider *</label>
                  <input type="text" value={bookingData.provider} onChange={(e) => setBookingData({ ...bookingData, provider: e.target.value })} placeholder="e.g., Dr. Sarah Johnson" className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes</label>
                  <textarea value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Please review carefully. I will auto-submit once you confirm.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      resetBooking();
                      setResponse('Okay, cancelled.');
                    }}
                    className="px-4 py-2 bg-black/30 hover:bg-black/50 border border-gray-600/50 text-white rounded-lg text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Validate required fields
                      if (!bookingData.date || !bookingData.time || !bookingData.title || !bookingData.duration || !bookingData.provider) {
                        setResponse('Missing some required details. Please fill all starred fields.');
                        return;
                      }
                      onAppointmentBooked?.({ ...bookingData });
                      // Close voice modal
                      handleClose();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg text-sm hover:from-cyan-500 hover:to-blue-600 transition-all"
                  >
                    Confirm & Book
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Examples */}
          <div className="mb-6 p-5 bg-black/20 border border-cyan-500/20 rounded-xl backdrop-blur-sm">
            <h4 className="text-sm font-medium text-cyan-300 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Try saying:
            </h4>
            <div className="space-y-3 text-sm text-gray-300">
              <p className="flex items-center">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-3"></span>
                "Book an appointment with Dr. Smith tomorrow at 2 PM"
              </p>
              <p className="flex items-center">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-3"></span>
                "Show my schedule for today"
              </p>
              <p className="flex items-center">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-3"></span>
                "What times are available tomorrow?"
              </p>
              <p className="flex items-center">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-3"></span>
                "Cancel my appointment with Dr. Johnson"
              </p>
              <p className="flex items-center">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-3"></span>
                "Help" - for more commands
              </p>
            </div>
            
            {speechRecognitionFailed && (
              <div className="mt-4 pt-4 border-t border-cyan-500/20">
                <button
                  onClick={() => {
                    setSpeechRecognitionFailed(false);
                    setShowTextInput(false);
                    setError(null);
                    setTranscript('');
                    // Try to reinitialize speech recognition
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.start();
                        setIsListening(true);
                      } catch (err) {
                        console.error('Error restarting speech recognition:', err);
                        setError('Failed to restart voice recognition. Please use text input.');
                        setSpeechRecognitionFailed(true);
                        setShowTextInput(true);
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  🎤 Try Voice Recognition Again
                </button>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="w-full px-6 py-3 bg-black/30 hover:bg-black/50 border border-cyan-500/20 hover:border-cyan-400/50 text-white rounded-xl transition-all duration-300"
          >
            Close Voice Command
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommand;