import { useState, useEffect, useRef, useCallback, FC } from 'react';
import { FeatureGate } from './FeatureGate';
import { Mic, MicOff, X } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [speechRecognitionFailed, setSpeechRecognitionFailed] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Booking form state (slot-filling via simple UI)
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    title: '',
    duration: '30',
    notes: '',
    priority: 'medium',
    provider: '',
  });

  const resetBooking = () => {
    setShowBookingForm(false);
    setBookingData({ date: '', time: '', title: '', duration: '30', notes: '', priority: 'medium', provider: '' });
  };

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    console.log('Initializing speech recognition...');
    
    if (typeof window === 'undefined') {
      console.log('Window is undefined - SSR environment');
      setError('Speech recognition is not available in this environment.');
      setSpeechRecognitionFailed(true);
      setShowTextInput(true);
      return false;
    }

    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      console.log('Web Speech API is supported');
      
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        
        // Add Brave-specific handling
        if (navigator.userAgent.indexOf('Brave') !== -1) {
          console.log('Brave browser detected - applying compatibility settings');
          // Request microphone permission explicitly
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              console.log('Microphone access granted in Brave');
              // Stop all tracks to release the microphone
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(err => {
              console.error('Microphone access denied in Brave:', err);
              setError('Microphone access is required for voice commands. Please allow microphone access in your browser settings.');
              setSpeechRecognitionFailed(true);
              setShowTextInput(true);
            });
        }
        
        // Add error handling specifically for Brave's privacy features
        if (navigator.userAgent.indexOf('Brave') !== -1) {
          console.log('Brave browser detected - applying compatibility settings');
          // Brave might need additional permissions handling
          if (!navigator.permissions) {
            console.warn('Permissions API not supported - some features may not work in Brave');
          } else {
            // Request microphone permission explicitly
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => {
                console.log('Microphone access granted');
                // Stop all tracks to release the microphone
                stream.getTracks().forEach(track => track.stop());
              })
              .catch(err => {
                console.error('Microphone access denied:', err);
                setError('Microphone access is required for voice commands. Please allow microphone access in your browser settings.');
                setSpeechRecognitionFailed(true);
                setShowTextInput(true);
              });
          }
        }

        // Use addEventListener instead of onstart for better compatibility
        recognition.addEventListener('start', () => {
          console.log("Voice recognition started. Try speaking into the microphone.");
          setIsListening(true);
          setError(null);
        });

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log("You said: ", transcript);
          setTranscript(transcript);
          setError(null);
          
          // Process the command
          const processCommand = async (command: string) => {
            if (!command) return;
            const normalizedCommand = command.toLowerCase().trim();
            setIsProcessing(true);
            
            if (normalizedCommand.includes('book')) {
              // Open booking form for structured capture
              setResponse('Great! Please confirm the details below to book your appointment.');
              setShowBookingForm(true);
              // Prefill defaults
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
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error detected:", event);
          
          // Handle different types of errors
          let errorMessage = 'Error with speech recognition. ';
          
          switch(event.error) {
            case 'network':
              errorMessage += 'Network connectivity issue. Please check your internet connection and try again.';
              // Add automatic retry logic
              if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = setTimeout(() => {
                console.log('Retrying speech recognition...');
                initializeSpeechRecognition();
              }, 2000);
              break;
            case 'not-allowed':
              errorMessage += 'Microphone access was denied. Please allow microphone access to use voice commands.';
              break;
            case 'audio-capture':
              errorMessage += 'No microphone was found. Please ensure a microphone is connected.';
              break;
            case 'no-speech':
              errorMessage = 'No speech was detected. Please try speaking again.';
              break;
            default:
              errorMessage += `Error: ${event.error}`;
          }
          
          setError(errorMessage);
          setIsListening(false);
          setSpeechRecognitionFailed(true);
          setShowTextInput(true);
        };

        recognition.onend = () => {
          console.log("Voice recognition ended.");
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        setIsSupported(true);
        setSpeechRecognitionFailed(false);
        console.log('Speech recognition initialized successfully');
        return true;
        
      } catch (err) {
        console.error('Error initializing speech recognition:', err);
        setError('Failed to initialize speech recognition. Please try again.');
        setSpeechRecognitionFailed(true);
        setShowTextInput(true);
        return false;
      }
    } else {
      console.log("Speech recognition not supported in this browser.");
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setSpeechRecognitionFailed(true);
      setShowTextInput(true);
      return false;
    }
      
      
  }, [isListening, error]);

  // Toggle voice recognition
  const toggleListening = useCallback(async () => {
    // Clear any existing timeouts to prevent multiple restarts
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }

    if (!recognitionRef.current) {
      const initialized = initializeSpeechRecognition();
      if (!initialized) return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      return;
    }

    // Reset states for new recognition
    setTranscript('');
    setError(null);
    setResponse('Listening...');
    
    try {
      // In Brave, ensure permissions are properly handled
      if (navigator.userAgent.indexOf('Brave') !== -1) {
        try {
          // Request microphone access first with a timeout
          const permissionPromise = navigator.mediaDevices.getUserMedia({ audio: true });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Permission request timed out')), 3000)
          );
          
          await Promise.race([permissionPromise, timeoutPromise]);
          
          // If we get here, permission was granted
          const stream = await permissionPromise;
          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('Microphone access error:', err);
          setError('Microphone access is required. Please allow microphone access in your browser settings.');
          setSpeechRecognitionFailed(true);
          setShowTextInput(true);
          return;
        }
      }
      
      // Configure recognition with error handling
      const recognition = recognitionRef.current;
      if (!recognition) return;
      
      // Reset any previous error handlers with proper typing
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.log('Default error handler:', event);
      };
      recognition.onend = () => {
        console.log('Default end handler');
      };
      
      // Set up new handlers
      recognition.onerror = (event) => {
        console.log('Recognition error event:', event);
        if (event.error === 'aborted') {
          console.log('Recognition was aborted, this is usually expected during restarts');
          return;
        }
        setError(`Recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('Recognition ended');
        setIsListening(false);
      };
      
      // Start recognition with error handling
      try {
        recognition.start();
        console.log('Recognition started');
        
        // Set a longer timeout for the first recognition attempt
        recognitionTimeoutRef.current = setTimeout(() => {
          if (isListening) return; // If we're already listening, do nothing
          
          console.log('Initial speech detection timeout - checking if we got any results');
          if (!transcript) {
            console.log('No speech detected, trying to restart recognition...');
            try {
              recognition.stop();
              // Small delay before restarting
              setTimeout(() => {
                try {
                  recognition.start();
                } catch (restartError) {
                  console.error('Error during recognition restart:', restartError);
                }
              }, 500);
            } catch (e) {
              console.error('Error stopping recognition for restart:', e);
            }
          }
        }, 3000); // Increased initial timeout to 3 seconds
        
      } catch (startError) {
        console.error('Error starting recognition:', startError);
        if (startError instanceof Error) {
          if (startError.name === 'AbortError' || startError.name === 'NotAllowedError') {
            setError('Cannot access microphone. Please check your browser permissions.');
          } else if (startError.name === 'NotReadableError') {
            setError('Microphone is not available. Another application might be using it.');
          } else {
            setError(`Error: ${startError.message}`);
          }
        }
        setSpeechRecognitionFailed(true);
        setShowTextInput(true);
      }
      
    } catch (err) {
      console.error('Error in voice recognition:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Voice recognition failed: ${errorMessage}`);
      setSpeechRecognitionFailed(true);
      setShowTextInput(true);
    }
  }, [isListening, initializeSpeechRecognition, transcript]);

  // Initialize on mount
  useEffect(() => {
    if (isOpen) {
      console.log('VoiceCommand opened, initializing...');
      const initialized = initializeSpeechRecognition();
      if (!initialized) {
        console.log('Speech recognition initialization failed, enabling text input fallback');
        // If initialization fails, show text input as fallback
        setShowTextInput(true);
        setSpeechRecognitionFailed(true);
      }
    }
  }, [isOpen, initializeSpeechRecognition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping recognition:', e);
        }
      }
      
      // Clear any pending timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (transcript && !isListening) {
      // Process voice command
      const processCommand = async (command: string) => {
        if (!command) return;

        const normalizedCommand = command.toLowerCase().trim();
        setIsProcessing(true);

        // Simple command processing - to be expanded
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
  }, [transcript, isListening]);

  if (!isOpen) return null;

  return (
    <FeatureGate featureKey="voice">
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-[#0a0a0a] via-[#0f172a] to-[#1a1a2e] border border-cyan-500/20 backdrop-blur-xl rounded-2xl p-8 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
              <Mic className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Voice Command
              </h2>
              <p className="text-sm text-gray-400">AI-powered voice assistant</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors duration-300"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          {speechRecognitionFailed && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl backdrop-blur-sm">
              <p className="text-sm text-yellow-300">
                <strong>Note:</strong> Voice recognition is not available in your browser. 
                You can still use text input to interact with the voice command system.
              </p>
            </div>
          )}
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <button
                onClick={toggleListening}
                disabled={!isSupported}
                className={`p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                  isListening 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                } text-white disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <div className="mt-3 text-sm text-gray-300">
                {isListening ? '🎤 Listening...' : speechRecognitionFailed ? '🎤 Voice unavailable - use text input' : '🎤 Click to speak'}
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
                    <input type="number" min={5} step={5} value={bookingData.duration} onChange={(e) => setBookingData({ ...bookingData, duration: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Priority</label>
                    <select value={bookingData.priority} onChange={(e) => setBookingData({ ...bookingData, priority: e.target.value })} className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg text-sm">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
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
    </FeatureGate>
  );
};

export default VoiceCommand;