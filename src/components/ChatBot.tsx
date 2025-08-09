import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, AlertCircle, User, Bot } from 'lucide-react';
import { supabase } from '../supabase';
import FeatureGating from '../utils/featureGating';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  user: any;
}

const ChatBot: React.FC<ChatBotProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [botSettings, setBotSettings] = useState<any>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      initializeChatbot();
    }
  }, [user]);

  const initializeChatbot = async () => {
    try {
      // Check if demo mode is enabled
      const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
      
      if (isDemoMode) {
        // In demo mode, enable chatbot with default settings
        setBotSettings({ enabled: true, welcome_message: 'Hello! I\'m your AI assistant. I can help you book appointments, answer questions about our services, and manage your schedule. How can I assist you today?' });
        setMessages([{
          id: '1',
          text: 'Hello! I\'m your AI assistant. I can help you book appointments, answer questions about our services, and manage your schedule. How can I assist you today?',
          sender: 'bot',
          timestamp: new Date(),
        }]);
        return;
      }

      // Production mode - try to get organization settings
      try {
        const { data: userOrgData } = await supabase.rpc('get_user_organization');
        if (!userOrgData || userOrgData.length === 0) {
          // Fallback to basic chatbot if no organization
          setBotSettings({ enabled: true });
          setMessages([{
            id: '1',
            text: 'Hello! I can help you book appointments and answer questions. How can I assist you today?',
            sender: 'bot',
            timestamp: new Date(),
          }]);
          return;
        }

        const orgId = userOrgData[0].organization_id;

        // Get bot settings
        const { data: botData, error: botError } = await supabase
          .from('bot_settings')
          .select('*')
          .eq('organization_id', orgId)
          .single();

        if (!botError && botData) {
          setBotSettings(botData);
          if (botData.enabled) {
            setMessages([{
              id: '1',
              text: botData.welcome_message || 'Hello! I can help you book appointments and answer questions about our services. How can I assist you today?',
              sender: 'bot',
              timestamp: new Date(),
            }]);
          }
        }

        // Check message limits (only in production)
        const { allowed } = await FeatureGating.canSendChatbotMessage(user.id);
        if (!allowed) {
          setIsLimitReached(true);
        }
      } catch (orgError) {
        console.log('Organization features not available, using basic chatbot');
        setBotSettings({ enabled: true });
        setMessages([{
          id: '1',
          text: 'Hello! I can help you book appointments and answer questions. How can I assist you today?',
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Error initializing chatbot:', error);
      // Fallback to basic chatbot
      setBotSettings({ enabled: true });
      setMessages([{
        id: '1',
        text: 'Hello! I can help you book appointments. How can I assist you today?',
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Check if chatbot is enabled
    if (!botSettings?.enabled) {
      alert('Chatbot is currently disabled.');
      return;
    }

    // Check limits only if not in demo mode
    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    if (!isDemoMode) {
      const { allowed, reason } = await FeatureGating.canSendChatbotMessage(user.id);
      if (!allowed) {
        alert(reason || 'Message limit reached');
        setIsLimitReached(true);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await processMessage(userMessage.text);
      setTimeout(() => {
        addMessage(response, 'bot');
        setIsLoading(false);
      }, 1000); // Simulate processing time
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage("Sorry, I encountered an error. Please try again.", 'bot');
      setIsLoading(false);
    }
  };

  const getAvailableSlots = async () => {
    try {
      // In demo mode, return sample slots
      const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
      if (isDemoMode) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        
        return [
          { date: tomorrow.toISOString().split('T')[0], time: '10:00 AM' },
          { date: tomorrow.toISOString().split('T')[0], time: '2:00 PM' },
          { date: dayAfter.toISOString().split('T')[0], time: '11:00 AM' },
          { date: dayAfter.toISOString().split('T')[0], time: '3:00 PM' }
        ];
      }

      // Production mode - try to get from database
      try {
        const { data: userOrgData } = await supabase.rpc('get_user_organization');
        if (!userOrgData || userOrgData.length === 0) return [];

        const orgId = userOrgData[0].organization_id;

        const { data, error } = await supabase
          .from('appointments')
          .select('date, time')
          .eq('organization_id', orgId)
          .gte('date', new Date().toISOString().split('T')[0])
          .limit(5);

        if (error) throw error;
        return data || [];
      } catch (orgError) {
        console.log('Organization features not available, using demo slots');
        // Fallback to demo slots
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return [
          { date: tomorrow.toISOString().split('T')[0], time: '10:00 AM' },
          { date: tomorrow.toISOString().split('T')[0], time: '2:00 PM' }
        ];
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return [];
    }
  };

  const createAppointment = async (date: string, time: string) => {
    try {
      // In demo mode, simulate successful appointment creation
      const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
      if (isDemoMode) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, data: { id: Date.now(), date, time } };
      }

      // Production mode - check limits and create appointment
      const { allowed, reason } = await FeatureGating.canCreateAppointment(user.id);
      if (!allowed) {
        return { success: false, error: reason };
      }

      try {
        // Get user's organization
        const { data: userOrgData } = await supabase.rpc('get_user_organization');
        if (!userOrgData || userOrgData.length === 0) {
          return { success: false, error: 'Organization not found' };
        }

        const orgId = userOrgData[0].organization_id;

        const { data, error } = await supabase
          .from('appointments')
          .insert({
            organization_id: orgId,
            user_id: user.id,
            date,
            time,
            status: 'confirmed',
            title: 'Appointment booked via chatbot',
            description: 'Appointment scheduled through AI assistant',
          });

        if (error) throw error;
        return { success: true, data };
      } catch (orgError) {
        console.log('Organization features not available, simulating appointment creation');
        // Fallback to basic appointment creation
        const { data, error } = await supabase
          .from('appointments')
          .insert({
            user_id: user.id,
            date,
            time,
            status: 'confirmed',
            title: 'Appointment booked via chatbot',
            description: 'Appointment scheduled through AI assistant',
          });

        if (error) throw error;
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      return { success: false, error: 'Failed to create appointment. Please try using the New Appointment button.' };
    }
  };

  const processMessage = async (message: string) => {
    const lowerMessage = message.toLowerCase();

    // Check availability
    if (lowerMessage.includes('available') || lowerMessage.includes('slots') || lowerMessage.includes('when')) {
      const slots = await getAvailableSlots();
      if (slots.length > 0) {
        const slotsList = slots.map(slot => {
          const date = new Date(slot.date);
          const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          return `• ${formattedDate} at ${slot.time}`;
        }).join('\n');
        return `Here are some available time slots:\n\n${slotsList}\n\nWould you like me to book one of these for you? Just say "book [time]" or "schedule [time]".`;
      } else {
        return "I couldn't find any available slots right now. Please try again later or contact support.";
      }
    }

    // Book appointment
    if (lowerMessage.includes('book') || lowerMessage.includes('schedule')) {
      const slots = await getAvailableSlots();
      if (slots.length > 0) {
        const firstSlot = slots[0];
        const result = await createAppointment(firstSlot.date, firstSlot.time);
        if (result.success) {
          return `Great! I've booked your appointment for ${new Date(firstSlot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${firstSlot.time}. You can view it in your dashboard.`;
        } else {
          return result.error || "Sorry, I couldn't create the booking. Please try again or use the New Appointment button.";
        }
      } else {
        return "Sorry, no slots are available right now. Please try again later.";
      }
    }

    // FAQ responses
    if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      return "I can help you with:\n\n• Checking available appointment slots\n• Booking new appointments\n• Answering questions about GENBOOK.AI\n• Managing your schedule\n\nJust ask me something like 'What slots are available?' or 'Book an appointment'.";
    }

    if (lowerMessage.includes('cancel') || lowerMessage.includes('reschedule')) {
      return "To cancel or reschedule appointments, please use the main dashboard or go to the Schedule tab. I can help you find new available times if needed!";
    }

    if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return "GENBOOK.AI offers flexible pricing plans. For detailed pricing information, please check the Settings tab or contact our support team.";
    }

    if (lowerMessage.includes('feature') || lowerMessage.includes('what can')) {
      return "GENBOOK.AI features:\n\n• AI-powered scheduling\n• Voice commands for booking\n• Smart conflict detection\n• Calendar integration\n• Real-time availability\n• Automated reminders\n\nTry saying 'show available slots' or 'book an appointment'!";
    }

    // Simple AI response logic (in a real app, this would call an AI service)
    let botResponse = botSettings?.fallback_message || 'I understand you\'re interested in booking. Let me help you with that!';
    
    if (lowerMessage.includes('book') || lowerMessage.includes('appointment')) {
      const availableSlots = await getAvailableSlots();
      if (availableSlots.length > 0) {
        const slot = availableSlots[0];
        botResponse = `I found an available slot on ${new Date(slot.date).toLocaleDateString()} at ${slot.time}. Would you like me to book this for you?`;
      } else {
        botResponse = 'I don\'t see any available slots right now. Please try again later or contact our support team.';
      }
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      botResponse = `Hello! I'm ${botSettings?.bot_name || 'your AI assistant'}. I'm here to help you book appointments and answer any questions you might have.`;
    } else if (lowerMessage.includes('help')) {
      botResponse = 'I can help you with:\n• Booking appointments\n• Checking available time slots\n• Answering questions about our services\n\nWhat would you like to do?';
    } else {
      botResponse = botSettings?.fallback_message || 'I apologize, but I don\'t understand that request. Please try rephrasing or contact our support team.';
    }

    return botResponse;
  };

  const addMessage = (text: string, sender: 'user' | 'bot') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all duration-300 z-50 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
      >
        <MessageCircle className="w-6 h-6 text-black" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-[#0D1117] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/30 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">{botSettings?.bot_name || 'AI Assistant'}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full hover:bg-red-500/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500' 
                      : 'bg-gradient-to-r from-purple-400 to-pink-500'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4 text-black" />
                    ) : (
                      <Bot className="w-4 h-4 text-black" />
                    )}
                  </div>
                  <div className={`rounded-2xl p-3 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-white'
                      : 'bg-black/40 border border-gray-600/30 text-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                  <div className="bg-black/40 border border-gray-600/30 rounded-2xl p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-600/20">
            {isLimitReached ? (
              <div className="flex items-center space-x-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Message limit reached. Upgrade your plan for more messages.</span>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 p-2 bg-black/30 border border-gray-600/30 rounded-lg text-white text-sm placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="p-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black rounded-lg hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Responsive Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default ChatBot;
