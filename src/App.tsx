import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Settings, Search, Plus, Mic, ChevronLeft, ChevronRight, X, LogOut, User, Bot, Zap, Sparkles, Brain, Activity, CreditCard, Building } from 'lucide-react';
import NewAppointmentForm from './NewAppointmentForm';
import AuthModal from './components/AuthModal';
import ScheduleView from './components/ScheduleView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import BillingView from './components/BillingView';
import TeamView from './components/TeamView';
import OrganizationSettings from './components/OrganizationSettings';
import ChatBot from './components/ChatBot';
import VoiceCommand from './components/VoiceCommand';
import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showVoiceCommand, setShowVoiceCommand] = useState(false);
  // Authentication state
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(true);

  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: '1', title: 'Team Sync', time: '10:00 AM', date: '2024-01-15', type: 'meeting' },
    { id: '2', title: 'Client Call', time: '2:00 PM', date: '2024-01-16', type: 'call' },
    { id: '3', title: 'Interview', time: '11:30 AM', date: '2024-01-18', type: 'interview' },
  ]);

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([
    { id: '1', title: 'Product Review', time: '9:00 AM', duration: '45 min', priority: 'high' },
    { id: '2', title: 'Design Sync', time: '3:30 PM', duration: '30 min', priority: 'medium' },
    { id: '3', title: 'Weekly Planning', time: '4:00 PM', duration: '60 min', priority: 'low' },
  ]);

  // Authentication effect
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.error('Error in getSession:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Authentication handlers
  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleJoinNow = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
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

  const handleBookSuggestion = (suggestion: AISuggestion) => {
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      title: suggestion.title,
      time: suggestion.time,
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: 'meeting'
    };
    setAppointments([...appointments, newAppointment]);
    setAiSuggestions(aiSuggestions.filter(s => s.id !== suggestion.id));
  };

  const handleNewAppointment = () => {
    setShowNewAppointment(true);
  };

  const handleVoiceCommand = () => {
    setShowVoiceCommand(true);
  };


  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f172a] to-[#1a1a2e] text-white overflow-hidden">
      <div className="flex h-full">
        {/* Left Sidebar */}
        <aside className="w-80 bg-black/20 backdrop-blur-xl border-r border-cyan-500/10 p-6 flex flex-col">
          <div className="mb-8">
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
              { icon: Settings, label: 'Settings' },
              { icon: CreditCard, label: 'Billing' },
              { icon: Users, label: 'Team' },
              { icon: Building, label: 'Organization' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label)}
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
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 p-0.5">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  <span className="text-sm font-bold">JD</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-gray-400">john@genbook.ai</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'Dashboard' && (
            <div className="flex h-full">
              {/* Calendar Panel */}
              <div className="flex-1 p-8 flex flex-col">
                <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
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

                      {/* Authentication Buttons */}
                      <div className="flex items-center space-x-3">
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
                        ) : user ? (
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-black" />
                              </div>
                              <span className="text-sm font-medium text-gray-300">
                                {user.user_metadata?.name || user.email?.split('@')[0]}
                              </span>
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

                  <div className="flex-1 flex flex-col justify-center">
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
                      onClick={() => setActiveTab('Schedule')}
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
                      onClick={() => setActiveTab('Settings')}
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
                  
                  {/* AI Insights Panel */}
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">AI Insights</h3>
                        <p className="text-xs text-indigo-300">Powered by advanced scheduling intelligence</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-black/20 rounded-xl p-4 border border-indigo-500/20">
                        <div className="flex items-center space-x-2 mb-2">
                          <Activity className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-green-400">Optimal Times</span>
                        </div>
                        <p className="text-xs text-gray-300">9-11 AM and 2-4 PM show highest success rates</p>
                      </div>
                      
                      <div className="bg-black/20 rounded-xl p-4 border border-indigo-500/20">
                        <div className="flex items-center space-x-2 mb-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-medium text-yellow-400">Quick Book</span>
                        </div>
                        <p className="text-xs text-gray-300">Voice booking is 3x faster than manual</p>
                      </div>
                      
                      <div className="bg-black/20 rounded-xl p-4 border border-indigo-500/20">
                        <div className="flex items-center space-x-2 mb-2">
                          <Bot className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-blue-400">Smart Suggestions</span>
                        </div>
                        <p className="text-xs text-gray-300">AI reduces scheduling conflicts by 85%</p>
                      </div>
                    </div>
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
                  {aiSuggestions.map((suggestion) => (
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
                  
                  {aiSuggestions.length === 0 && (
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
          )}

          {activeTab === 'Schedule' && <ScheduleView user={user} />}
          {activeTab === 'History' && <HistoryView user={user} />}
          {activeTab === 'Settings' && <SettingsView user={user} />}
          {activeTab === 'Billing' && <BillingView user={user} />}
          {activeTab === 'Team' && <TeamView user={user} />}
          {activeTab === 'Organization' && <OrganizationSettings user={user} />}
        </main>

        {/* Modals */}
        <NewAppointmentForm
          isOpen={showNewAppointment}
          onClose={() => setShowNewAppointment(false)}
          selectedDate={selectedDate}
        />



        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Voice Command Modal */}
        <VoiceCommand
          user={user}
          isOpen={showVoiceCommand}
          onClose={() => setShowVoiceCommand(false)}
          onAppointmentBooked={() => {
            // Refresh appointments or navigate to schedule
            setActiveTab('Schedule');
          }}
        />

        {/* Floating ChatBot Widget */}
        <ChatBot user={user} />
      </div>
    </div>
  );
}

export default App;
