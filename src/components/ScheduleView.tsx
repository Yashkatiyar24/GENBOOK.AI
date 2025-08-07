import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Edit3, Trash2, Bell, Phone, Video, ChevronLeft, ChevronRight, Filter, List, Grid, Star, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getAISuggestedTimes, checkAppointmentConflicts, predictNoShowProbability } from '../supabase';

interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  doctor_name: string;
  doctor_specialty?: string;
  location?: string;
  appointment_type: 'in-person' | 'video' | 'phone';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high';
  reminder_time?: number;
  instructions?: string;
  no_show_probability?: number;
  rating?: number;
}

interface ScheduleViewProps {
  user: SupabaseUser | null;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ user }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      
      // Add AI predictions to appointments
      const appointmentsWithAI = await Promise.all(
        (data || []).map(async (apt) => {
          const noShowProb = await predictNoShowProbability(apt.id, user?.id || '');
          return { ...apt, no_show_probability: noShowProb };
        })
      );
      
      setAppointments(appointmentsWithAI);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          date: newDate, 
          time: newTime,
          status: 'scheduled' 
        })
        .eq('id', appointmentId);

      if (error) throw error;
      
      fetchAppointments();
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
    }
  };

  const handleCancel = async (appointmentId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason
        })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  const setReminder = async (appointmentId: string, reminderTime: number) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ reminder_time: reminderTime })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchAppointments();
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  const getAISuggestionsForReschedule = async (appointment: Appointment) => {
    if (!user) return;
    
    const suggestions = await getAISuggestedTimes(
      user.id,
      appointment.duration,
      appointment.doctor_name
    );
    setAiSuggestions(suggestions);
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

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      new Date(apt.date).toDateString() === date.toDateString() &&
      (filterStatus === 'all' || apt.status === filterStatus)
    );
  };

  const filteredAppointments = appointments.filter(apt => 
    filterStatus === 'all' || apt.status === filterStatus
  );

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-500/10';
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10';
      default: return 'border-green-500/50 bg-green-500/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'cancelled': return 'text-red-400';
      case 'completed': return 'text-blue-400';
      default: return 'text-yellow-400';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">Schedule</h2>
            <div className="flex items-center space-x-2 bg-black/30 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-md text-sm transition-all duration-300 ${
                  viewMode === 'calendar' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-cyan-400'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md text-sm transition-all duration-300 ${
                  viewMode === 'list' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-cyan-400'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            {viewMode === 'calendar' && (
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
            )}
          </div>
        </div>

        {/* Content */}
        {viewMode === 'calendar' ? (
          <div className="space-y-6">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm text-gray-400 py-2 font-medium">
                  {day}
                </div>
              ))}
              {getDaysInMonth(currentDate).map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] flex flex-col p-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    day
                      ? selectedDate?.toDateString() === day.toDateString()
                        ? 'bg-cyan-500/20 border border-cyan-400/50'
                        : 'bg-black/20 hover:bg-cyan-500/10 border border-cyan-500/10 hover:border-cyan-400/30'
                      : ''
                  }`}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium mb-1">{day.getDate()}</div>
                      <div className="flex-1 space-y-1">
                        {getAppointmentsForDate(day).slice(0, 3).map(apt => (
                          <div
                            key={apt.id}
                            className={`text-xs p-1 rounded border-l-2 ${getPriorityColor(apt.priority)}`}
                          >
                            <div className="font-medium truncate">{apt.title}</div>
                            <div className="text-gray-400">{apt.time}</div>
                          </div>
                        ))}
                        {getAppointmentsForDate(day).length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{getAppointmentsForDate(day).length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
              <div className="bg-black/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Appointments for {selectedDate.toLocaleDateString()}
                </h3>
                <div className="space-y-3">
                  {getAppointmentsForDate(selectedDate).map(apt => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onReschedule={(apt) => {
                        setSelectedAppointment(apt);
                        getAISuggestionsForReschedule(apt);
                        setShowRescheduleModal(true);
                      }}
                      onCancel={handleCancel}
                      onSetReminder={setReminder}
                    />
                  ))}
                  {getAppointmentsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-400 text-center py-8">
                      No appointments scheduled for this date
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredAppointments.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onReschedule={(apt) => {
                  setSelectedAppointment(apt);
                  getAISuggestionsForReschedule(apt);
                  setShowRescheduleModal(true);
                }}
                onCancel={handleCancel}
                onSetReminder={setReminder}
                showDate={true}
              />
            ))}
            {filteredAppointments.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No appointments found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <RescheduleModal
          appointment={selectedAppointment}
          aiSuggestions={aiSuggestions}
          onClose={() => {
            setShowRescheduleModal(false);
            setSelectedAppointment(null);
            setAiSuggestions([]);
          }}
          onReschedule={handleReschedule}
        />
      )}
    </div>
  );
};

interface AppointmentCardProps {
  appointment: Appointment;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (id: string, reason?: string) => void;
  onSetReminder: (id: string, time: number) => void;
  showDate?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onReschedule,
  onCancel,
  onSetReminder,
  showDate = false
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-black/20 border-l-4 rounded-xl p-4 ${getPriorityColor(appointment.priority)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="font-semibold text-lg">{appointment.title}</h4>
            {appointment.no_show_probability && appointment.no_show_probability > 0.7 && (
              <div className="flex items-center space-x-1 bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>High Risk</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="space-y-1">
              {showDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(appointment.date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{appointment.time} ({appointment.duration} min)</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{appointment.doctor_name}</span>
                {appointment.doctor_specialty && (
                  <span className="text-gray-400">• {appointment.doctor_specialty}</span>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {getTypeIcon(appointment.appointment_type)}
                <span className="capitalize">{appointment.appointment_type}</span>
              </div>
              {appointment.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{appointment.location}</span>
                </div>
              )}
              <div className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
                Status: {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </div>
            </div>
          </div>

          {appointment.instructions && (
            <div className="mt-3 p-3 bg-blue-500/10 rounded-lg">
              <p className="text-sm text-blue-300">{appointment.instructions}</p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => setShowReminderModal(true)}
            className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
            title="Set Reminder"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReschedule(appointment)}
            className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
            title="Reschedule"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCancelModal(true)}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Cancel"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {appointment.rating && (
        <div className="flex items-center space-x-1 mt-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < appointment.rating! ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
            />
          ))}
          <span className="text-sm text-gray-400 ml-2">Rated after visit</span>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Appointment</h3>
            <p className="text-gray-300 mb-4">Please provide a reason for cancellation:</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:border-cyan-400/50"
              placeholder="Reason for cancellation..."
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCancel(appointment.id, cancelReason);
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Reminder</h3>
            <div className="space-y-3">
              {[15, 30, 60, 120, 1440].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => {
                    onSetReminder(appointment.id, minutes);
                    setShowReminderModal(false);
                  }}
                  className="w-full p-3 bg-black/30 hover:bg-cyan-500/20 rounded-lg transition-colors text-left"
                >
                  {minutes < 60 
                    ? `${minutes} minutes before`
                    : minutes < 1440
                    ? `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''} before`
                    : '1 day before'
                  }
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReminderModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface RescheduleModalProps {
  appointment: Appointment;
  aiSuggestions: string[];
  onClose: () => void;
  onReschedule: (id: string, date: string, time: string) => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  appointment,
  aiSuggestions,
  onClose,
  onReschedule
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Reschedule Appointment</h3>
        
        <div className="mb-4 p-3 bg-blue-500/10 rounded-lg">
          <p className="text-sm text-blue-300">
            Current: {appointment.title} - {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
          </p>
        </div>

        {aiSuggestions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-cyan-400">AI Suggested Times:</h4>
            <div className="space-y-2">
              {aiSuggestions.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const [date, time] = suggestion.split(' ');
                    setNewDate(date);
                    setNewTime(time);
                  }}
                  className="w-full p-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg text-left text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">New Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">New Time</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (newDate && newTime) {
                onReschedule(appointment.id, newDate, newTime);
              }
            }}
            disabled={!newDate || !newTime}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reschedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
