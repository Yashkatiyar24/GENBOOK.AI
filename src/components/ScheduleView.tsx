import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, List, Grid } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Shared UI helpers
const getStatusColor = (status: string = 'scheduled'): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  switch ((status || '').toLowerCase()) {
    case 'confirmed':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'rescheduled':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
    case 'no-show':
      return 'bg-red-100 text-red-800';
    case 'scheduled':
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

interface Appointment {
  id: string;
  title: string;
  description?: string;
  start_time: string;  // ISO string format
  end_time: string;    // ISO string format
  doctor_name: string;
  doctor_specialty?: string;
  location?: string;
  appointment_type: 'in-person' | 'video' | 'phone';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'no-show';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reminder_sent?: boolean;
  instructions?: string;
  no_show_probability?: number;
  rating?: number;
}

interface ScheduleViewProps {
  user: SupabaseUser | null;
}

// Month names for calendar header
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ScheduleView = ({ user }: ScheduleViewProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month' | 'calendar'>('week');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  // Initialize with current date to ensure calendar shows up
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setLoading] = useState<boolean>(false);
  // Remove unused error state
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) {
      console.log('No user found, skipping appointments fetch');
      return;
    }
    
    console.log('Starting to fetch appointments for user:', user.id);
    
    try {
      setLoading(true);
      console.log('Executing Supabase query...');
      
      // Add more specific error handling and logging
      const { data, error, status, statusText } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      console.log('Supabase response:', { status, statusText, error, data: data?.length });
      
      if (error) {
        console.error('Supabase query error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Successfully fetched appointments:', data?.length || 0);

      // Normalize doctor names consistently
      const normalizeDoctorName = (apt: any): string | undefined => {
        const candidates = ['doctor_name', 'doctor', 'provider_name', 'provider', 'with', 'doctorName', 'providerName', 'assigned_to'];
        let name = '';
        for (const f of candidates) {
          const v = typeof apt[f] === 'string' ? (apt[f] as string).trim() : '';
          if (v) { name = v; break; }
        }
        // Try title e.g., "Check-up with Dr. Lisa Thompson"
        if (!name && typeof apt.title === 'string' && apt.title) {
          const m = apt.title.match(/with\s+(Dr\.?\s*)?(.+)/i);
          if (m && (m[2] || m[1])) name = (m[2] || m[1] || '').trim();
        }
        // Try description e.g., "Doctor: Lisa Henace"
        if (!name && typeof apt.description === 'string' && apt.description) {
          const m2 = apt.description.match(/Doctor:\s*([^\n]+)/i);
          if (m2 && m2[1]) name = m2[1].trim();
        }
        if (!name) return undefined;
        // Clean and format
        name = name
          .replace(/^with\s+/i, '')
          .replace(/^dr\.?\s*/i, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!name) return undefined;
        name = name.toLowerCase().split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
        return `Dr. ${name}`;
      };

      const processed = (data || []).map(apt => ({
        ...apt,
        doctor_name: normalizeDoctorName(apt) || (typeof apt.doctor_name === 'string' ? apt.doctor_name : ''),
      }));

      setAppointments(processed as Appointment[]);
      
      // If we have a selected date, update the appointments for that date
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        console.log('Filtering appointments for selected date:', dateStr);
        const filtered = (data || []).filter(apt => {
          try {
            if (!apt.start_time) {
              console.warn('Appointment missing start_time:', apt.id);
              return false;
            }
            const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
            return aptDate === dateStr;
          } catch (dateError) {
            console.error('Error processing appointment date:', {
              appointmentId: apt.id,
              error: dateError,
              start_time: apt.start_time
            });
            return false;
          }
        });
        console.log('Filtered appointments:', filtered.length);
      }
    } catch (err: unknown) {
      const safe = {
        error: err,
        name: (err as any)?.name,
        message: (err as any)?.message,
        stack: (err as any)?.stack,
      };
      console.error('Error in fetchAppointments:', safe);
      // Set an empty array to prevent rendering errors
      setAppointments([]);
    } finally {
      console.log('Finished loading appointments');
      setLoading(false);
    }
  };

  const handleReschedule = async (appointmentId: string, date: string, time: string) => {
    const newDate = new Date(`${date}T${time}`);
    try {
      // Create new start and end times based on the selected date and original appointment time
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;
      
      const oldStart = new Date(appointment.start_time);
      const oldEnd = new Date(appointment.end_time);
      const duration = oldEnd.getTime() - oldStart.getTime();
      
      // Set the new start time to the selected date with the original time
      const newStart = new Date(newDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
      
      // Calculate new end time based on original duration
      const newEnd = new Date(newStart.getTime() + duration);
      
      const { error } = await supabase
        .from('appointments')
        .update({ 
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
          status: 'scheduled' 
        })
        .eq('id', appointmentId);

      if (error) throw error;
      
      fetchAppointments();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
    }
  };

  // (Removed unused handlers to satisfy TypeScript noUnusedLocals)

  const handleDateClick = async (date: Date) => {
    if (!date) return; // Skip if no date provided
    
    try {
      // Update the selected date immediately for better UX
      setSelectedDate(date);
      
      if (!user) {
        console.log('No user logged in');
        return;
      }
      
      // Format date if needed in future (removed unused var to satisfy lints)
      
      // Show all appointments for the selected date
      const dayAppointments = getAppointmentsForDate(date);
      
      if (dayAppointments.length > 0) {
        const appointmentList = dayAppointments
          .map(apt => {
            const timeStr = apt.start_time 
              ? new Date(apt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
              : 'Time not set';
            return `• ${timeStr} - ${apt.title || 'Appointment'}${apt.doctor_name ? ` (${apt.doctor_name})` : ''}`;
          })
          .join('\n');
        
        alert(`Appointments on ${date.toDateString()}:\n\n${appointmentList}`);
      } else {
        alert(`No appointments found for ${date.toDateString()}`);
      }
    } catch (err) {
      console.error('Error in handleDateClick:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        date: date?.toISOString()
      });
      
      // Show a more user-friendly error message
      alert('Unable to load appointments. Please try again later.');
    }
  };

  const generateDays = () => {
    // Use the visible month (currentDate) to render the grid so header and grid stay in sync
    const date = currentDate || new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add empty cells to complete the last week
    const totalCells = Math.ceil((days.length) / 7) * 7;
    while (days.length < totalCells) {
      days.push(null);
    }
    
    return days;
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    if (!date) {
      console.log('No date provided to getAppointmentsForDate');
      return [];
    }
    
    const dateStr = date.toISOString().split('T')[0];
    console.log('Filtering appointments for date:', dateStr);
    
    const filtered = appointments.filter(appointment => {
      if (!appointment.start_time) return false;
      
      const aptDate = new Date(appointment.start_time).toISOString().split('T')[0];
      const matches = aptDate === dateStr && 
                     (filterStatus === 'all' || appointment.status === filterStatus);
      
      if (matches) {
        console.log('Matching appointment:', { 
          id: appointment.id, 
          start_time: appointment.start_time, 
          status: appointment.status,
          title: appointment.title
        });
      }
      return matches;
    });
    
    console.log(`Found ${filtered.length} appointments for ${dateStr}`);
    return filtered;
  };
  
  const renderAppointmentDetails = (appointment: Appointment) => {
    const startTime = new Date(appointment.start_time);
    
    return (
      <div className="p-6 space-y-6">
        <h3 className="text-lg font-semibold">{appointment.title}</h3>
        <p className="text-sm text-gray-500">
          <Calendar className="inline mr-1 w-4 h-4" />
          {startTime.toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-500">
          <Clock className="inline mr-1 w-4 h-4" />
          {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
        </p>
      </div>
    );
  };

  

  const renderAppointmentItem = (appointment: Appointment) => {
    const startTime = new Date(appointment.start_time);
    
    return (
      <div 
        key={appointment.id} 
        className={`p-4 rounded-lg border ${getStatusColor(appointment.status)}`}
        onClick={() => setSelectedAppointment(appointment)}
      >
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{appointment.title}</h4>
            <p className="text-sm text-gray-500">
              {startTime.toLocaleDateString()} • {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Compute filtered list once for list view
  const filteredAppointments = appointments.filter(apt =>
    filterStatus === 'all' || apt.status === filterStatus
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-10 md:p-12">
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-8 md:p-10 border border-cyan-500/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <h2 className="text-2xl font-bold">Schedule</h2>
            <div className="flex items-center space-x-2 bg-black/30 rounded-lg p-1.5 md:p-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm transition-all duration-300 ${
                  viewMode === 'calendar' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-cyan-400'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm transition-all duration-300 ${
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
              className="bg-black/30 border border-cyan-500/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400/50"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            {viewMode === 'calendar' && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
                    setCurrentDate(prev);
                    // Keep selection within the visible month (defaults to 1st of month)
                    setSelectedDate(prev);
                  }}
                  className="p-2.5 rounded-lg hover:bg-cyan-500/20 transition-all duration-300"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-lg font-medium px-4">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <button
                  onClick={() => {
                    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                    setCurrentDate(next);
                    // Keep selection within the visible month (defaults to 1st of month)
                    setSelectedDate(next);
                  }}
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
          <div className="space-y-8 min-h-[680px]">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-3 md:gap-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm text-gray-400 py-2 font-medium">
                  {day}
                </div>
              ))}
              {generateDays().map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] flex flex-col p-3 md:p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                    day
                      ? selectedDate?.toDateString() === day.toDateString()
                        ? 'bg-cyan-500/30 border border-cyan-400/50'
                        : 'bg-black/30 hover:bg-cyan-500/20 border border-cyan-500/10 hover:border-cyan-400/30'
                      : 'opacity-30'
                  }`}
                  onClick={() => day && handleDateClick(day)}
                >
                  <div className="text-right text-sm font-medium mb-2">
                    {day ? day.getDate() : ''}
                  </div>
                  {day && (
                    <div className="flex-1 overflow-y-auto max-h-24">
                      {getAppointmentsForDate(day).slice(0, 2).map((appointment) => (
                        <div 
                          key={appointment.id}
                          className="text-xs p-1 mb-1 rounded truncate"
                          style={{
                            backgroundColor: 'rgba(34, 211, 238, 0.2)',
                            borderLeft: '2px solid rgb(34, 211, 238)'
                          }}
                        >
                          <div className="font-medium truncate">
                            {appointment.title || 'Appointment'}
                          </div>
                          <div className="text-cyan-300/80 truncate">
                            {appointment.doctor_name || 'No doctor'}
                          </div>
                          <div className="text-cyan-200/60 text-xxs">
                            {appointment.start_time 
                              ? new Date(appointment.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                              : ''}
                          </div>
                        </div>
                      ))}
                      {getAppointmentsForDate(day).length > 2 && (
                        <div className="text-cyan-400/70 text-xs text-center mt-1.5">
                          +{getAppointmentsForDate(day).length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
              <div className="bg-black/30 rounded-xl p-8 md:p-10">
                <h3 className="text-lg font-semibold mb-4">
                  Appointments for {selectedDate.toLocaleDateString()}
                </h3>
                <div className="space-y-4">
                  {getAppointmentsForDate(selectedDate).map(apt => (
                    <div key={apt.id}>
                      {renderAppointmentDetails(apt)}
                    </div>
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
          <div className="space-y-6">
            {filteredAppointments.map(apt => (
              <div key={apt.id}>
                {renderAppointmentItem(apt)}
              </div>
            ))}
            {filteredAppointments.length === 0 && (
              <div className="text-center py-14">
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
            Current: {appointment.title} - {new Date(appointment.start_time).toLocaleDateString()} at {new Date(appointment.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
