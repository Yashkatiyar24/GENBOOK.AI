import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Calendar, Clock, Users, Settings, Search, Plus, Mic, ChevronLeft, ChevronRight, LogOut, User, Zap, Sparkles, Brain, CreditCard, Building, Menu, MessageSquare } from 'lucide-react';
import type { QuickPreviewInitial } from './components/QuickPreviewModal';
import { supabase, createAppointment, type Appointment as SupabaseAppointment } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
// Lazy-loaded heavy components
const FeatureFormModal = lazy(() => import('./components/FeatureFormModal'));
const NewAppointmentForm = lazy(() => import('./NewAppointmentForm'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const ScheduleView = lazy(() => import('./components/ScheduleView'));
const HistoryView = lazy(() => import('./components/HistoryView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const BillingView = lazy(() => import('./components/BillingView'));
const TeamView = lazy(() => import('./components/TeamView'));
const OrganizationSettings = lazy(() => import('./components/OrganizationSettings'));
const ChatBot = lazy(() => import('./components/ChatBot'));
const QuickPreviewModal = lazy(() => import('./components/QuickPreviewModal'));
const VoiceCommand = lazy(() => import('./components/VoiceCommand'));
const InsightsCharts = lazy(() => import('./components/dashboard/InsightsCharts'));
const CommunicationsPanel = lazy(() => import('./components/comm/CommunicationsPanel'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const BottomSheet = lazy(() => import('./components/ui/BottomSheet'));
const GetStartedSheet = lazy(() => import('./components/footer/GetStartedSheet'));
const SupportSheet = lazy(() => import('./components/footer/SupportSheet'));
const ContactSheet = lazy(() => import('./components/footer/ContactSheet'));
import EntitlementsStatus from './components/EntitlementsStatus';

interface Appointment {
  id: string;
  title: string;
  time: string;
  date: string;
  type: 'meeting' | 'call' | 'interview';
}

interface AISuggestion {
  id: string;
  title: string;
  time: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
}

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');
  // Tabs that require an authenticated user
  const protectedTabs = useMemo(() => new Set([
    'Schedule',
    'History',
    'Communications',
    'Settings',
    'Billing',
    'Team',
    'Organization',
  ]), []);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showVoiceCommand, setShowVoiceCommand] = useState(false);
  const [showQuickPreview, setShowQuickPreview] = useState(false);
  const [quickInitial, setQuickInitial] = useState<QuickPreviewInitial | null>(null);
  const [newApptPrefill, setNewApptPrefill] = useState<{
    date: string;
    time: string;
    title: string;
    durationMin: number;
    notes?: string;
    priority?: 'high' | 'medium' | 'low';
    provider: string;
  } | null>(null);
  const [autoSubmitNewAppt, setAutoSubmitNewAppt] = useState(false);
  // Authentication state
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(true);
  // If a part of the app requests the auth modal while we are still
  // resolving the initial session, store the request and process it
  // after loading completes. This prevents the modal from flashing on
  // page refresh when a valid session may still be established.
  const [pendingAuthRequest, setPendingAuthRequest] = useState<'signin' | 'signup' | null>(null);

  // Request showing the auth modal in a safe way. If the auth system
  // is still loading the initial session, defer the request.
  function requestShowAuth(mode: 'signin' | 'signup') {
    if (!loading) {
      // Only open if there's no authenticated user
      if (!user) {
        setAuthMode(mode);
        setShowAuthModal(true);
      }
    } else {
      setPendingAuthRequest(mode);
    }
  }
  // Bottom sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<'get-started' | 'support' | 'contact'>('get-started');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync tab state with URL hash for deep linking (e.g., #/pricing, #/billing)
  useEffect(() => {
    const hashToTab = (hash: string) => {
      const key = hash.replace('#/', '').toLowerCase();
      switch (key) {
        case 'dashboard': return 'Dashboard';
        case 'schedule': return 'Schedule';
        case 'history': return 'History';
        case 'communications': return 'Communications';
        case 'settings': return 'Settings';
        case 'pricing': return 'Pricing';
        case 'billing': return 'Billing';
        case 'team': return 'Team';
        case 'organization': return 'Organization';
        default: return null;
      }
    };
    
    // Listen for tab change events from other components
    const handleTabChange = (event: Event) => {
      const tab = (event as CustomEvent).detail;
      if (tab && typeof tab === 'string') {
        console.log('Tab change event received:', tab);
        setActiveTab(tab);
        localStorage.setItem('activeTab', tab);
        window.location.hash = `#/${tab.toLowerCase()}`;
      }
    };
    
    window.addEventListener('tabChange', handleTabChange as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
    };

    const applyHash = () => {
      const t = hashToTab(window.location.hash);
      if (!t) return;
      // If user not logged in and trying to navigate to protected tab via URL, block and show auth
      if (!user && protectedTabs.has(t)) {
        // Use requestShowAuth to avoid opening while initial session is resolving
        requestShowAuth('signin');
        // Revert hash to dashboard without triggering another modal
        const safe = '#/dashboard';
        if (window.location.hash !== safe) window.location.hash = safe;
        setActiveTab('Dashboard');
        return;
      }
      setActiveTab(t);
    };

    // On mount
    applyHash();
    // On change
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [user, protectedTabs]);

  // Handle Supabase password recovery deep link when the URL contains type=recovery
  useEffect(() => {
    const parseParams = (): URLSearchParams => {
      const combined = window.location.hash?.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash || '';
      const search = window.location.search?.startsWith('?')
        ? window.location.search.slice(1)
        : window.location.search || '';
      // Prefer hash (Supabase default), fallback to query
      const src = combined || search;
      return new URLSearchParams(src);
    };

    const params = parseParams();
    const type = params.get('type');
    if (type !== 'recovery') return;

    (async () => {
      try {
        // If tokens are present, ensure session is established first
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        const newPassword = window.prompt('Enter your new password');
        if (!newPassword) return;

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        alert('Password updated successfully. You can now sign in with your new password.');
        window.location.replace('/');
      } catch (err) {
        console.error('Error completing password recovery:', err);
        alert('Failed to complete password reset. Please request a new reset email.');
      }
    })();
  }, []);

  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: '1', title: 'Team Sync', time: '10:00 AM', date: '2024-01-15', type: 'meeting' },
    { id: '2', title: 'Client Call', time: '2:00 PM', date: '2024-01-16', type: 'call' },
    { id: '3', title: 'Interview', time: '11:30 AM', date: '2024-01-18', type: 'interview' },
  ]);

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<{title: string, time: string} | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      console.log('Fetching AI suggestions...');
      try {
        const { data, error } = await supabase
          .from('ai_suggestions')
          .select('*')
          .in('title', ['Product Review', 'Design Sync', 'Weekly Planning']);
        
        console.log('AI suggestions response:', { data, error });
        
        if (error) {
          console.error('Error fetching suggestions:', error);
          // Fallback to default suggestions
          const defaultSuggestions: AISuggestion[] = [
            { id: '1', title: 'Product Review', time: '10:00 AM', duration: '30 min', priority: 'high' },
            { id: '2', title: 'Design Sync', time: '2:00 PM', duration: '45 min', priority: 'medium' },
            { id: '3', title: 'Weekly Planning', time: '9:00 AM', duration: '60 min', priority: 'high' },
          ];
          setAiSuggestions(defaultSuggestions);
          return;
        }
        
        if (data && data.length > 0) {
          console.log('Setting AI suggestions:', data);
          setAiSuggestions(data);
        } else {
          console.log('No AI suggestions found in the database, using defaults');
          // Fallback to default suggestions if no data is returned
          const defaultSuggestions: AISuggestion[] = [
            { id: '1', title: 'Product Review', time: '10:00 AM', duration: '30 min', priority: 'high' },
            { id: '2', title: 'Design Sync', time: '2:00 PM', duration: '45 min', priority: 'medium' },
            { id: '3', title: 'Weekly Planning', time: '9:00 AM', duration: '60 min', priority: 'high' },
          ];
          setAiSuggestions(defaultSuggestions);
        }
      } catch (err) {
        console.error('Exception when fetching suggestions:', err);
      }
    };
    
    fetchSuggestions();
    
    // Also add a button to manually refresh suggestions
    const handleRefresh = () => fetchSuggestions();
    // @ts-ignore
    window.refreshSuggestions = handleRefresh;
    
    return () => {
      // @ts-ignore
      window.refreshSuggestions = undefined;
    };
  }, []);

  // Authentication effect
  useEffect(() => {
    // Get initial session with better error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any invalid tokens
          if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
            console.log('Clearing invalid session...');
            await supabase.auth.signOut();
          }
        }
        
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (err) {
        console.error('Error in getSession:', err);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes with better error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🎉 User logged in successfully!');
        console.log('📧 Email:', session.user.email);
        console.log('👤 Name:', session.user.user_metadata?.name || 'Not provided');
        console.log('🆔 User ID:', session.user.id);
        console.log('📅 Created:', new Date(session.user.created_at).toLocaleDateString());
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
      }
      
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle Supabase password recovery link
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const query = hash.startsWith('#') ? new URLSearchParams(hash.slice(1)) : new URLSearchParams(window.location.search);
      const type = query.get('type');
      const accessToken = query.get('access_token');
      if (type === 'recovery' && accessToken) {
        // Ask user for a new password and update
        const newPassword = window.prompt('Enter your new password (min 6 characters):');
        if (!newPassword) return;
        if (newPassword.length < 6) {
          alert('Password must be at least 6 characters.');
          return;
        }
        (async () => {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) {
            alert(`Failed to update password: ${error.message}`);
          } else {
            alert('Your password has been updated. You can now sign in.');
            // Clean the URL to remove tokens
            const url = new URL(window.location.href);
            url.hash = '';
            url.search = '';
            window.history.replaceState({}, document.title, url.toString());
          }
        })();
      }
    } catch (e) {
      console.warn('Password recovery handler error:', e);
    }
  }, []);

  // Handle tab change (with auth guard)
  const handleTabChange = (tab: string) => {
    // If the tab is protected and no user, show auth modal and abort
    if (!user && protectedTabs.has(tab)) {
  requestShowAuth('signin');
      return;
    }

    console.log('Tab changed to:', tab);
    setActiveTab(tab);
    // Save the active tab to localStorage
    localStorage.setItem('activeTab', tab);
    // Update hash for deep-linking
    const tabToHash = (t: string) => `#/${t.toLowerCase()}`;
    if (window.location.hash !== tabToHash(tab)) {
      window.location.hash = tabToHash(tab);
    }
    
    // Force refresh history view when switching to it
    if (tab === 'History') {
      console.log('Forcing refresh of history view...');
      // Use a small timeout to ensure the component is mounted
      setTimeout(() => {
        const historyView = document.querySelector('[data-view="history"]');
        if (historyView) {
          const refreshButton = historyView.querySelector('button[onclick*="fetchAppointmentHistory"]');
          if (refreshButton) {
            console.log('Clicking refresh button...');
            (refreshButton as HTMLButtonElement).click();
          } else {
            console.log('Refresh button not found in history view');
          }
        } else {
          console.log('History view not found in DOM');
        }
      }, 100);
    }
  };

  // If an auth request was queued while we were loading the initial
  // session, process it now that loading has finished.
  useEffect(() => {
    if (!loading && pendingAuthRequest) {
      // If user became authenticated while loading, do not open modal
      if (!user) {
        requestShowAuth(pendingAuthRequest);
      }
      setPendingAuthRequest(null);
    }
  }, [loading, pendingAuthRequest, user]);

  // Authentication handlers
  const handleSignIn = () => {
  requestShowAuth('signin');
  };

  const handleJoinNow = () => {
  requestShowAuth('signup');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const handleBookSuggestion = async (suggestion: AISuggestion) => {
    if (!user) {
      // If user is not logged in, show auth modal
  requestShowAuth('signin');
      return;
    }

    try {
      const dateISO = (selectedDate || new Date()).toISOString().split('T')[0];
      
      // Prefill modal values based on suggestion
      setQuickInitial({
        eventName: suggestion.title,
        dateISO,
        time: suggestion.time,
        durationMin: parseInt(suggestion.duration) || 45,
        priority: suggestion.priority as 'high' | 'medium' | 'low',
        notes: `AI-suggested ${suggestion.title} appointment`,
        location: 'Online',
        participants: [],
      });
      
      // Show the quick preview modal
      setShowQuickPreview(true);
      
      // Optional: Remove the suggestion from the list after showing the preview
      // setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
    } catch (error) {
      console.error('Error preparing suggestion:', error);
      alert('Failed to prepare appointment. Please try again.');
    }
  };

  const handleFeatureSubmit = async (formData: any) => {
    if (!user) {
      alert('Please sign in to book a feature.');
  requestShowAuth('signin');
      return;
    }

    try {
      // Format the time to 24-hour format for proper parsing
      const formatTimeTo24Hour = (time12h: string) => {
        // Handle case where time might already be in 24h format
        if (time12h.includes(':')) {
          const [time, modifier] = time12h.split(' ');
          if (!modifier) return time; // Already in 24h format
          
          let [hours, minutes] = time.split(':');
          hours = hours.padStart(2, '0');
          minutes = (minutes || '00').padStart(2, '0');
          
          if (modifier === 'PM' && hours !== '12') {
            hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
          } else if (modifier === 'AM' && hours === '12') {
            hours = '00';
          }
          
          return `${hours}:${minutes}`;
        }
        return '12:00'; // Default fallback
      };
      
      // Parse the selected time (e.g., '10:00 AM' -> '10:00')
      const selectedTime = selectedFeature?.time || '12:00 PM';
      const time24Hour = formatTimeTo24Hour(selectedTime);
      
      // Create date strings in ISO format
      const dateStr = formData.dueDate;
      const [year, month, day] = dateStr.split('-');
      const [hours, minutes] = time24Hour.split(':');
      
      // Create date in local timezone
      const startDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // months are 0-indexed
        parseInt(day),
        parseInt(hours),
        parseInt(minutes || '0'),
        0
      );
      
      // Add 1 hour for end time
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      
      // 1. First, create the appointment
      const appointmentData = {
        // Required fields for basic functionality
        title: formData.title || 'New Appointment',
        description: formData.description || '',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'scheduled',
        priority: formData.priority || 'medium',
        location: 'Online',
        user_id: user.id,
        
        // Additional fields for history view
        appointment_date: formData.dueDate || new Date().toISOString().split('T')[0],
        appointment_time: selectedFeature?.time || '12:00 PM',
        duration_minutes: 60, // Default 1 hour
        doctor_name: user.user_metadata?.name || 'AI Assistant',
        doctor_specialty: 'AI Assistant',
        appointment_type: 'video',
        instructions: formData.description || '',
        
        // Optional fields with defaults
        attendees: formData.participants ? 
          formData.participants.split(',').map((email: string) => email.trim()) : [],
        tags: formData.featureType ? [formData.featureType] : [],
        notes: formData.description || '',
        
        // System fields
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Initialize empty fields that might be filled later
        rating: null,
        feedback: null,
        prescription: null,
        visit_summary: null,
        diagnosis: null,
        next_appointment_date: null
      };

      console.log('Creating appointment with data:', appointmentData);

      // Insert into appointments table
      console.log('Attempting to save appointment to database...');
      console.log('Appointment data:', JSON.stringify(appointmentData, null, 2));
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (appointmentError) {
        console.error('Error saving appointment:', appointmentError);
        throw appointmentError;
      }
      console.log('Appointment created successfully:', appointment);

      // 2. Create feature submission
      const featureSubmission = {
        user_id: user.id,
        appointment_id: appointment.id,
        feature_type: formData.featureType,
        status: 'scheduled',
        priority: formData.priority,
        details: {
          description: formData.description,
          participants: formData.participants.split(',').map((email: string) => email.trim()),
          due_date: formData.dueDate,
          notes: formData.description
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating feature submission:', featureSubmission);

      // Insert into feature_submissions table
      const { data: submission, error: submissionError } = await supabase
        .from('feature_submissions')
        .insert([featureSubmission])
        .select()
        .single();

      if (submissionError) {
        console.warn('Could not save to feature_submissions:', submissionError.message);
        // Continue even if this fails
      } else {
        console.log('Feature submission created:', submission);
      }

      // 3. Verify the appointment was saved
      console.log('Verifying appointment was saved...');
      const { data: savedAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointment.id)
        .single();
        
      if (fetchError) {
        console.error('Error verifying appointment:', fetchError);
      } else {
        console.log('Verified saved appointment:', savedAppointment);
      }
      
      // 4. Update UI
      setAiSuggestions(prev => prev.filter(s => s.title !== formData.featureType));
      setSelectedFeature(null);
      
      // Show success message
      alert(`Successfully booked ${formData.featureType}!`);
      
      // Force refresh the history view
      if (activeTab === 'History') {
        const historyView = document.querySelector('[data-view="history"]');
        if (historyView) {
          const refreshButton = historyView.querySelector('button[onclick*="fetchAppointmentHistory"]');
          if (refreshButton) {
            (refreshButton as HTMLButtonElement).click();
          }
        }
      }
      
    } catch (error: any) {
      console.error('Error in handleFeatureSubmit:', error);
      alert(`Failed to book feature: ${error.message || 'Unknown error'}`);
    }
  };

  const handleNewAppointment = () => {
    setShowNewAppointment(true);
  };

  const handleVoiceCommand = () => {
    setShowVoiceCommand(true);
  };


  return (
    <div className={`min-h-screen overflow-y-auto pb-24 md:pb-28 bg-gradient-to-br from-[#0a0a0a] via-[#0f172a] to-[#1a1a2e] text-white`}>
      <div className="app-root flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <aside aria-label="sidebar" className="sidebar hidden lg:flex lg:w-80 bg-black/20 backdrop-blur-xl border-r border-cyan-500/10 p-6 flex-col">
          <div className="mb-8 flex items-center group">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              GENBOOK.AI
            </h1>
          </div>
          
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400/60 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-xl px-10 py-3 text-sm placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300"
            />
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { icon: Calendar, label: 'Dashboard' },
              { icon: Clock, label: 'Schedule' },
              { icon: Users, label: 'History' },
              { icon: MessageSquare, label: 'Communications' },
              { icon: Settings, label: 'Settings' },
              { icon: Zap, label: 'Pricing' },
              { icon: CreditCard, label: 'Billing' },
              { icon: Users, label: 'Team' },
              { icon: Building, label: 'Organization' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleTabChange(item.label)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === item.label
                    ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-cyan-500/10">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <span className="text-sm font-bold">
                      {user.user_metadata?.name 
                        ? user.user_metadata.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
                        : user.email?.substring(0, 2).toUpperCase() || 'US'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {user.user_metadata?.name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Guest User</p>
                  <p className="text-xs text-gray-500">Sign in to continue</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Top Bar */}
        <div className="md:hidden px-4 py-4 flex items-center justify-between border-b border-cyan-500/10 bg-black/20 backdrop-blur-xl">
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">GENBOOK.AI</h1>
          <div className="flex items-center gap-3">
            <EntitlementsStatus />
            <button onClick={() => setMobileNavOpen(true)} className="p-2 rounded-lg hover:bg-cyan-500/20" aria-label="Open navigation">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs bg-black/90 border-r border-cyan-500/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Menu</h2>
                <button onClick={() => setMobileNavOpen(false)} className="px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 text-sm">Close</button>
              </div>
              <nav className="space-y-2">
                {[
                  { icon: Calendar, label: 'Dashboard' },
                  { icon: Clock, label: 'Schedule' },
                  { icon: Users, label: 'History' },
                  { icon: MessageSquare, label: 'Communications' },
                  { icon: Settings, label: 'Settings' },
                  { icon: Zap, label: 'Pricing' },
                  { icon: CreditCard, label: 'Billing' },
                  { icon: Users, label: 'Team' },
                  { icon: Building, label: 'Organization' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { handleTabChange(item.label); setMobileNavOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      activeTab === item.label
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="mt-6">
                {user ? (
                  <button
                    onClick={() => { handleSignOut(); setMobileNavOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/40 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { handleSignIn(); setMobileNavOpen(false); }} className="px-4 py-2 bg-black/30 hover:bg-black/50 border border-cyan-500/20 hover:border-cyan-400/50 rounded-lg text-sm font-medium">Sign In</button>
                    <button onClick={() => { handleJoinNow(); setMobileNavOpen(false); }} className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-medium rounded-lg text-sm">Join Now</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-y-auto scroll-smooth">
          {activeTab === 'Dashboard' && (
            <>
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
              {/* Calendar Panel */}
              <div className="flex-1 px-4 sm:px-6 lg:px-12 py-6 lg:py-12 flex flex-col gap-6 lg:gap-8">
                <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-8 lg:p-10 border border-cyan-500/10 flex flex-col mb-8">
                  <div className="flex items-center justify-between mb-6 sticky top-0 z-10 px-4 py-4 lg:-mx-8 lg:-mt-8 lg:px-8 lg:py-6 bg-black/40 backdrop-blur-xl border-b border-cyan-500/10 rounded-t-2xl">
                    <h2 className="text-2xl font-bold">Calendar Overview</h2>
                    <div className="flex items-center space-x-4">
                      {/* Calendar Navigation */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                          className="p-2 rounded-lg hover:bg-cyan-500/20 transition-all duration-300"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-medium px-4">
                          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                          className="p-2 rounded-lg hover:bg-cyan-500/20 transition-all duration-300"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Plan badge + usage */}
                      <EntitlementsStatus />

                      {/* Authentication Buttons */}
                      <div className="flex items-center space-x-3">
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
                        ) : user ? (
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2 group relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center cursor-pointer">
                                <User className="w-4 h-4 text-black" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-300">
                                  {user.user_metadata?.name || user.email?.split('@')[0]}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {user.email}
                                </span>
                              </div>
                              
                              {/* User Info Tooltip */}
                              <div className="absolute top-full left-0 mt-2 w-64 bg-black/90 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                                      <User className="w-3 h-3 text-black" />
                                    </div>
                                    <span className="text-sm font-medium text-white">
                                      {user.user_metadata?.name || 'User'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-300">
                                    <div><strong>Email:</strong> {user.email}</div>
                                    <div><strong>User ID:</strong> {user.id}</div>
                                    <div><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</div>
                                    {user.last_sign_in_at && (
                                      <div><strong>Last Sign In:</strong> {new Date(user.last_sign_in_at).toLocaleDateString()}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={handleSignOut}
                              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all duration-300"
                            >
                              <LogOut className="w-4 h-4" />
                              <span className="text-sm font-medium">Sign Out</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={handleSignIn}
                              className="px-4 py-2 bg-black/30 hover:bg-black/50 border border-cyan-500/20 hover:border-cyan-400/50 rounded-lg transition-all duration-300 text-sm font-medium"
                            >
                              Sign In
                            </button>
                            <button
                              onClick={handleJoinNow}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-medium rounded-lg transition-all duration-300 text-sm"
                            >
                              Join Now
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="grid grid-cols-7 gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs text-gray-400 py-1">
                          {day}
                        </div>
                      ))}
                      {getDaysInMonth(currentDate).map((day, index) => (
                        <div
                          key={index}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-300 ${
                            day
                              ? selectedDate?.toDateString() === day.toDateString()
                                ? 'bg-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                : 'hover:bg-cyan-500/10 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                              : ''
                          }`}
                          onClick={() => day && setSelectedDate(day)}
                        >
                          {day && (
                            <div className="relative">
                              <span className="text-xs">{day.getDate()}</span>
                              {appointments.some(a => new Date(a.date).toDateString() === day.toDateString()) && (
                                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI-Enhanced Quick Actions */}
                <div className={`mt-4 space-y-4`}>
                  {/* Primary Quick Actions */}
                  <div className={`grid ${user ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'} gap-3`}>
                    {user && (
                      <button
                        onClick={handleNewAppointment}
                        className="group bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-4 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:scale-105"
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Plus className="w-5 h-5 text-black" />
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-semibold text-white">New Appointment</span>
                            <p className="text-xs text-cyan-300 mt-0.5">AI-powered scheduling</p>
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => handleTabChange('Schedule')}
                      className="group bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 hover:border-purple-400/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <Clock className="w-5 h-5 text-black" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-semibold text-white">Smart Schedule</span>
                          <p className="text-xs text-purple-300 mt-0.5">View & manage bookings</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleVoiceCommand}
                      className="group bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/30 rounded-xl p-4 hover:border-green-400/60 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <Mic className="w-5 h-5 text-black" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-semibold text-white">Voice Commands</span>
                          <p className="text-xs text-green-300 mt-0.5">Book with voice</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleTabChange('Settings')}
                      className="group bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl border border-orange-500/30 rounded-xl p-4 hover:border-orange-400/60 hover:shadow-[0_0_20px_rgba(251,146,60,0.4)] transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <Settings className="w-5 h-5 text-black" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-semibold text-white">Smart Settings</span>
                          <p className="text-xs text-orange-300 mt-0.5">AI preferences</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  {/* AI Insights Panel (Interactive) */}
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">AI Insights</h3>
                        <p className="text-xs text-indigo-300">Interactive analytics powered by mock live data</p>
                      </div>
                    </div>
                    <Suspense fallback={<div className="text-xs text-gray-400">Loading insights…</div>}>
                      <InsightsCharts />
                    </Suspense>
                  </div>
                </div>
                </div>

                {/* Enhanced AI Suggestions Panel */}
                <aside className="w-96 bg-black/20 backdrop-blur-xl border-l border-cyan-500/10 p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-black" />
                    </div>
                    <h3 className="text-xl font-bold">AI Suggestions</h3>
                  </div>
                
                <div className="space-y-4">
                  {aiSuggestions
                    .filter(suggestion => 
                      ['Product Review', 'Design Sync', 'Weekly Planning'].includes(suggestion.title)
                    )
                    // Remove duplicates by title
                    .filter((suggestion, index, self) => 
                      index === self.findIndex(s => s.title === suggestion.title)
                    )
                    .map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="bg-black/30 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-400/50 transition-all duration-300 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-white">{suggestion.title}</h4>
                            <div className={`w-2 h-2 rounded-full ${
                              suggestion.priority === 'high' ? 'bg-red-400' :
                              suggestion.priority === 'medium' ? 'bg-yellow-400' :
                              'bg-green-400'
                            }`}></div>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{suggestion.time} • {suggestion.duration}</p>
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                            suggestion.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              suggestion.priority === 'high' ? 'bg-red-400' :
                              suggestion.priority === 'medium' ? 'bg-yellow-400' :
                              'bg-green-400'
                            }`}></span>
                            <span className="capitalize">{suggestion.priority} Priority</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBookSuggestion(suggestion)}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 text-sm group-hover:scale-105 transform"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {aiSuggestions.filter(s => 
                    ['Product Review', 'Design Sync', 'Weekly Planning'].includes(s.title)
                  ).length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-gray-400 text-sm">AI is analyzing your schedule...</p>
                      <p className="text-gray-500 text-xs mt-1">New suggestions will appear soon</p>
                    </div>
                  )}
                </div>
                
                {/* AI Quick Stats */}
                <div className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                  <h4 className="text-sm font-medium text-purple-300 mb-3">Your AI Stats</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Suggestions Accepted</span>
                      <span className="text-purple-300 font-medium">87%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Time Saved</span>
                      <span className="text-green-300 font-medium">2.4 hours</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Conflicts Avoided</span>
                      <span className="text-cyan-300 font-medium">12</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
            {/* Pricing section appended under Dashboard for continuous scroll */}
            <div className="px-8 pb-8">
              <div className="mt-8 border-t border-cyan-500/10 pt-8">
                <Suspense fallback={<div className="text-center text-sm text-gray-400">Loading pricing…</div>}>
                  <PricingPage
                    onGetStarted={() => { setSheetView('get-started'); setIsSheetOpen(true); }}
                    onSupport={() => { setSheetView('support'); setIsSheetOpen(true); }}
                    onContact={() => { setSheetView('contact'); setIsSheetOpen(true); }}
                  />
                </Suspense>
              </div>
            </div>
            </>
          )}

          {activeTab === 'Schedule' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading schedule…</div>}>
              <ScheduleView user={user} />
            </Suspense>
          )}
          {activeTab === 'History' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading history…</div>}>
              <HistoryView user={user} />
            </Suspense>
          )}
          {activeTab === 'Communications' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading communications…</div>}>
              <div className="flex-1 p-4 sm:p-6 lg:p-8 flex">
                <CommunicationsPanel />
              </div>
            </Suspense>
          )}
          {activeTab === 'Settings' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading settings…</div>}>
              <SettingsView user={user} />
            </Suspense>
          )}
          {activeTab === 'Pricing' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading pricing…</div>}>
              <PricingPage
                onGetStarted={() => { setSheetView('get-started'); setIsSheetOpen(true); }}
                onSupport={() => { setSheetView('support'); setIsSheetOpen(true); }}
                onContact={() => { setSheetView('contact'); setIsSheetOpen(true); }}
              />
            </Suspense>
          )}
          {activeTab === 'Billing' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading billing…</div>}>
              <BillingView user={user} />
            </Suspense>
          )}
          {activeTab === 'Team' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading team…</div>}>
              <TeamView user={user} />
            </Suspense>
          )}
          {activeTab === 'Organization' && (
            <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading organization…</div>}>
              <OrganizationSettings user={user} />
            </Suspense>
          )}
        </main>

        {/* Modals */}
        <Suspense fallback={null}>
        <NewAppointmentForm
          isOpen={showNewAppointment}
          onClose={() => setShowNewAppointment(false)}
          selectedDate={selectedDate}
          initialPrefill={newApptPrefill}
          autoSubmit={autoSubmitNewAppt}
          user={user}
        />
        </Suspense>

        <Suspense fallback={null}>
        <QuickPreviewModal
          isOpen={showQuickPreview}
          onClose={() => setShowQuickPreview(false)}
          initial={quickInitial}
          onConfirm={async (data) => {
            try {
              // Parse the time string (format: 'HH:MM AM/PM')
              const parseTimeString = (timeStr: string, dateStr: string) => {
                const [time, period] = timeStr.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                
                // Convert to 24-hour format
                if (period?.toLowerCase() === 'pm' && hours < 12) {
                  hours += 12;
                } else if (period?.toLowerCase() === 'am' && hours === 12) {
                  hours = 0;
                }
                
                // Create date object with local time
                const [year, month, day] = dateStr.split('-').map(Number);
                const date = new Date(year, month - 1, day, hours, minutes || 0);
                
                // Validate the date
                if (isNaN(date.getTime())) {
                  throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
                }
                
                return date;
              };
              
              // Parse start time and calculate end time
              const startTime = parseTimeString(data.time, data.dateISO);
              const endTime = new Date(startTime.getTime() + (data.durationMin * 60000));
              
              // Create appointment data with proper typing using SupabaseAppointment
              const appointmentData: Omit<SupabaseAppointment, 'id' | 'created_at' | 'updated_at'> = {
                title: data.eventName,
                description: data.notes || `Meeting about ${data.eventName}`,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'scheduled',
                priority: data.priority || 'medium',
                user_id: user?.id || undefined,
                color: '#3b82f6', // Blue color
                location: data.location || 'Online',
                attendees: data.participants || [],
                tags: ['product-review'],
                buffer_before: 5, // 5 minutes
                buffer_after: 5,  // 5 minutes
                is_recurring: false,
                // Ensure all required fields are included
                meeting_link: undefined,
                cancellation_reason: undefined,
                no_show_probability: 0,
                reminder_sent: false,
                confirmation_sent: false,
                feedback_requested: false,
                parent_appointment_id: undefined,
                recurring_pattern: undefined
              };

              console.log('Creating appointment with data:', appointmentData);
              
              const createdAppointment = await createAppointment(appointmentData);
              
              if (!createdAppointment) {
                throw new Error('No appointment was created');
              }
              
              console.log('Appointment created successfully:', createdAppointment);
              
              // Update local state for immediate UI feedback
              const newAppointment: Appointment = {
                id: createdAppointment[0]?.id || Date.now().toString(),
                title: data.eventName,
                time: data.time,
                date: data.dateISO,
                type: 'meeting',
              };
              setAppointments(prev => [...prev, newAppointment]);
              
              // Remove matching suggestion if exists
              setAiSuggestions(prev => prev.filter(s => s.title !== data.eventName));
              
              // Show success message
              alert('Appointment created successfully!');
            } catch (error) {
              console.error('Error creating appointment:', error);
              alert(`Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }}
          onRescheduleSuggestion={async (data: any) => {
            // Simple placeholder: keep same time for now
            // In a real implementation, call AI/service to suggest a better time
            setQuickInitial({ ...data, time: data.time });
          }}
          onAISuggestAgenda={async (currentNotes: string) => {
            // Generate AI-suggested agenda items
            const bullets = [
              'Welcome & Introductions',
              'Review objectives and agenda',
              'Key discussion points',
              'Action items and next steps',
              'Q&A and closing remarks'
            ];
            return (currentNotes ? currentNotes + '\n\n' : '') + bullets.map(b => `• ${b}`).join('\n');
          }}
          onFindBestTime={async (data: { dateISO: string; time: string }) => {
            // Keep same date/time by default (can be enhanced with availability checking)
            return { dateISO: data.dateISO, time: data.time };
          }}
          onAutoAddMeetingLink={async () => {
            // Generate a meeting link (integrate with calendar provider in production)
            return 'https://meet.google.com/new';
          }}
        />

        </Suspense>



        {/* Authentication Modal */}
        <Suspense fallback={null}>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
          onAuthSuccess={handleAuthSuccess}
        />
        </Suspense>

        {/* Voice Command Modal */}
        <Suspense fallback={null}>
        <VoiceCommand
          user={user}
          isOpen={showVoiceCommand}
          onClose={() => setShowVoiceCommand(false)}
          onAppointmentBooked={(details: { date: string; time: string; title: string; duration: string; notes?: string; priority?: 'high' | 'medium' | 'low'; provider: string; }) => {
            // Switch UI to New Appointment and prefill
            handleTabChange('Dashboard');
            setNewApptPrefill({
              date: details.date,
              time: details.time,
              title: details.title,
              durationMin: parseInt(details.duration || '30', 10) || 30,
              notes: details.notes,
              priority: details.priority,
              provider: details.provider,
            });
            setAutoSubmitNewAppt(true);
            setShowNewAppointment(true);
          }}
        />
        </Suspense>

        {/* Floating ChatBot Widget */}
        <Suspense fallback={null}>
          <ChatBot user={user} />
        </Suspense>

        {/* Mobile Agent Button (re-add) */}
        <div className="md:hidden fixed left-4 bottom-24 z-40">
          <button
            aria-label="Open Agent"
            onClick={() => setShowVoiceCommand(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold shadow-lg shadow-cyan-500/20 border border-white/10"
          >
            <span className="w-2 h-2 rounded-full bg-black/70"></span>
            ZENBOOK.AI AGENT
          </button>
        </div>

        {/* Feature Form Modal */}
        <FeatureFormModal
          isOpen={!!selectedFeature}
          onClose={() => setSelectedFeature(null)}
          featureTitle={selectedFeature?.title || ''}
          onSubmit={handleFeatureSubmit}
        />

        {/* Animated Bottom Sheet */}
        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title={
            sheetView === 'get-started' ? 'Get Started' :
            sheetView === 'support' ? 'Support' :
            'Contact'
          }
        >
          {sheetView === 'get-started' && (
            <GetStartedSheet user={user} onDone={() => setIsSheetOpen(false)} />
          )}
          {sheetView === 'support' && <SupportSheet />}
          {sheetView === 'contact' && <ContactSheet />}
        </BottomSheet>
      </div>
    </div>
  );
}

export default App;