import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createAppointment } from '../utils/supabaseClient';

// Type declarations
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
  const [error, setError] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [speechRecognitionFailed, setSpeechRecognitionFailed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bookingStep, setBookingStep] = useState<'idle' | 'provider' | 'datetime' | 'location' | 'confirm'>('idle');
  const [appointmentDetails, setAppointmentDetails] = useState({
    provider: '',
    date: '',
    time: '',
    location: '',
    meetingLink: ''
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const navigate = useNavigate();
  const { hasAccess, isLoading: isAccessLoading } = useFeatureAccess('voice_commands');

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback((): SpeechRecognition | null => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('Speech Recognition API not supported');
        setIsSupported(false);
        return null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setTranscript(transcript);

        if (event.results[0].isFinal) {
          processCommand(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
        setSpeechRecognitionFailed(true);
      };

      recognition.onend = () => {
        if (isListening) {
          recognition.start();
        }
      };

      setIsSupported(true);
      return recognition;
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setIsSupported(false);
      return null;
    }
  }, [isListening]);

  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        setError('');
      }
    }
  }, [isListening]);

  // Process voice command
  const processCommand = useCallback((command: string) => {
    console.log('Processing command:', command);
    const normalizedCommand = command.toLowerCase().trim();
    
    // Handle booking flow
    if (bookingStep !== 'idle' || normalizedCommand.includes('book') || normalizedCommand.includes('schedule')) {
      handleBookingStep(command);
      return;
    }
    
    // Add other command handlers here
    setResponse(`I heard: ${command}`);
  }, [bookingStep]);

  // Handle booking flow steps
  const handleBookingStep = useCallback(async (command: string) => {
    const normalizedCommand = command.toLowerCase().trim();
    
    switch (bookingStep) {
      case 'idle':
        if (normalizedCommand.includes('book') || normalizedCommand.includes('schedule')) {
          setBookingStep('provider');
          setResponse('Which provider would you like to book with?');
        }
        break;
        
      case 'provider': {
        const extractedProvider = command.replace(/^(book|schedule|with|an?|appointment|for)/i, '').trim();
        if (extractedProvider) {
          setAppointmentDetails(prev => ({ ...prev, provider: extractedProvider }));
          setBookingStep('datetime');
          setResponse(`Got it, ${extractedProvider}. What date and time should I schedule it for?`);
        } else {
          setResponse('I didn\'t catch the provider name. Please try again.');
        }
        break;
      }
      
      case 'datetime': {
        if (command) {
          setAppointmentDetails(prev => ({ ...prev, date: command, time: '' })); // Assuming combined date/time for now
          setBookingStep('location');
          setResponse('Would you like this to be an online or offline appointment?');
        } else {
          setResponse('I didn\'t catch that. What date and time?');
        }
        break;
      }

      case 'location': {
        const location = normalizedCommand.includes('online') ? 'online' : (normalizedCommand.includes('offline') ? 'offline' : '');
        if (location) {
          setAppointmentDetails(prev => ({ ...prev, location }));
          setBookingStep('confirm');
          const { provider, date } = appointmentDetails;
          setResponse(`Great! I’ve scheduled your appointment with ${provider} on ${date} (${location}). Is that correct?`);
        } else {
          setResponse('Online or offline?');
        }
        break;
      }

      case 'confirm': {
        if (normalizedCommand.includes('yes')) {
          setIsProcessing(true);
          try {
            const { provider, date, location } = appointmentDetails;
            const newAppointment = {
              user_id: _user!.id,
              title: `Appointment with ${provider}`,
              start_time: new Date(date), // This might need a robust date parser
              end_time: new Date(new Date(date).getTime() + 30 * 60000),
              provider,
              is_online: location === 'online',
            };
            
            const bookedAppointment = await createAppointment(newAppointment as any);
            
            if (onAppointmentBooked) {
              onAppointmentBooked(bookedAppointment);
            }
            
            setResponse(`Great! I’ve scheduled your appointment with ${provider} on ${date} (${location}).`);
            toast.success('Appointment booked successfully!');
            
            // Reset state
            setBookingStep('idle');
            setAppointmentDetails({ provider: '', date: '', time: '', location: '', meetingLink: '' });

          } catch (error) {
            console.error(error);
            setResponse('Sorry, something went wrong.');
            setError('Could not book appointment.');
          } finally {
            setIsProcessing(false);
          }
        } else {
          setBookingStep('idle');
          setResponse('Okay, starting over. Say "Book an appointment" to begin.');
        }
        break;
      }
      
      default:
        setResponse('I\'m not sure how to handle that. Please try again.');
    }
  }, [bookingStep, appointmentDetails, _user, onAppointmentBooked]);

  // Initialize on mount
  useEffect(() => {
    if (!isOpen) return;
    
    const recognition = initializeSpeechRecognition();
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen, initializeSpeechRecognition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesis && isSpeaking) {
        synthesis.cancel();
      }
    };
  }, [synthesis, isSpeaking]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-xl w-96 max-w-[90vw] overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 text-white flex justify-between items-center">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isListening ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
          <h3 className="font-semibold text-lg">Voice Assistant</h3>
        </div>
        <button 
          onClick={handleClose}
          className="p-1 rounded-full hover:bg-indigo-500/50 transition-colors"
          aria-label="Close voice command"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="mb-4 h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
          {response ? (
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-full mr-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h3l3 3v-3h1a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex-1">
                  <p className="text-gray-800">{response}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                  <Mic className="text-indigo-500" size={20} />
                </div>
                <p className="text-gray-500">Say something like "Book an appointment" to get started.</p>
              </div>
            </div>
          )}
          
          {transcript && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Listening...
              </div>
              <p className="text-gray-700 bg-gray-100 p-2 rounded">{transcript}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start">
              <svg className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <button
            onClick={toggleListening}
            disabled={!isSupported || isProcessing}
            className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-colors ${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? (
              <>
                <MicOff className="mr-2" size={18} />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="mr-2" size={18} />
                {isProcessing ? 'Processing...' : 'Start Speaking'}
              </>
            )}
          </button>
          
          {!isSupported && (
            <p className="text-sm text-red-600 text-center">
              Your browser doesn't support speech recognition. Try using Chrome or Edge.
            </p>
          )}
          
          {isLoading && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              <span className="text-sm text-gray-500 ml-2">Loading voice recognition...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCommand;
