import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Star, Download, Printer, Search, Filter, FileText, MessageSquare, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface HistoryAppointment {
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
  status: 'completed' | 'cancelled' | 'no-show';
  priority: 'low' | 'medium' | 'high';
  instructions?: string;
  rating?: number;
  feedback?: string;
  prescription?: string;
  visit_summary?: string;
  diagnosis?: string;
  next_appointment_date?: string;
}

interface HistoryViewProps {
  user: SupabaseUser | null;
}

const HistoryView: React.FC<HistoryViewProps> = ({ user }) => {
  const [appointments, setAppointments] = useState<HistoryAppointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<HistoryAppointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'doctor' | 'rating'>('date');
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<HistoryAppointment | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAppointmentHistory();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortAppointments();
  }, [appointments, searchQuery, filterDoctor, filterType, filterStatus, sortBy]);

  const fetchAppointmentHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['completed', 'cancelled', 'no-show'])
        .lt('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortAppointments = () => {
    let filtered = appointments.filter(apt => {
      const matchesSearch = 
        apt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDoctor = filterDoctor === 'all' || apt.doctor_name === filterDoctor;
      const matchesType = filterType === 'all' || apt.appointment_type === filterType;
      const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;

      return matchesSearch && matchesDoctor && matchesType && matchesStatus;
    });

    // Sort appointments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'doctor':
          return a.doctor_name.localeCompare(b.doctor_name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    setFilteredAppointments(filtered);
  };

  const submitFeedback = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          rating,
          feedback 
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === selectedAppointment.id 
          ? { ...apt, rating, feedback }
          : apt
      ));

      setShowFeedbackModal(false);
      setSelectedAppointment(null);
      setRating(0);
      setFeedback('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const downloadReport = async (appointment: HistoryAppointment) => {
    try {
      const reportData = {
        patient: user?.user_metadata?.name || user?.email?.split('@')[0],
        appointment: appointment.title,
        date: new Date(appointment.date).toLocaleDateString(),
        time: appointment.time,
        doctor: appointment.doctor_name,
        specialty: appointment.doctor_specialty,
        diagnosis: appointment.diagnosis,
        prescription: appointment.prescription,
        visitSummary: appointment.visit_summary,
        nextAppointment: appointment.next_appointment_date
      };

      const content = `
APPOINTMENT REPORT
==================

Patient: ${reportData.patient}
Appointment: ${reportData.appointment}
Date: ${reportData.date} at ${reportData.time}
Doctor: ${reportData.doctor}${reportData.specialty ? ` (${reportData.specialty})` : ''}

${reportData.diagnosis ? `DIAGNOSIS:\n${reportData.diagnosis}\n\n` : ''}
${reportData.prescription ? `PRESCRIPTION:\n${reportData.prescription}\n\n` : ''}
${reportData.visitSummary ? `VISIT SUMMARY:\n${reportData.visitSummary}\n\n` : ''}
${reportData.nextAppointment ? `NEXT APPOINTMENT:\n${new Date(reportData.nextAppointment).toLocaleDateString()}\n\n` : ''}

Generated on: ${new Date().toLocaleString()}
      `.trim();

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointment-report-${appointment.date}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const printReport = async (appointment: HistoryAppointment) => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const reportData = {
      patient: user?.user_metadata?.name || user?.email?.split('@')[0],
      appointment: appointment.title,
      date: new Date(appointment.date).toLocaleDateString(),
      time: appointment.time,
      doctor: appointment.doctor_name,
      specialty: appointment.doctor_specialty,
      diagnosis: appointment.diagnosis,
      prescription: appointment.prescription,
      visitSummary: appointment.visit_summary,
      nextAppointment: appointment.next_appointment_date
    };

    reportWindow.document.write(`
      <html>
        <head>
          <title>Appointment Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #333; }
            .value { margin-bottom: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>APPOINTMENT REPORT</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="section">
            <div class="label">Patient:</div>
            <div class="value">${reportData.patient}</div>
          </div>
          
          <div class="section">
            <div class="label">Appointment:</div>
            <div class="value">${reportData.appointment}</div>
          </div>
          
          <div class="section">
            <div class="label">Date & Time:</div>
            <div class="value">${reportData.date} at ${reportData.time}</div>
          </div>
          
          <div class="section">
            <div class="label">Doctor:</div>
            <div class="value">${reportData.doctor}${reportData.specialty ? ` (${reportData.specialty})` : ''}</div>
          </div>
          
          ${reportData.diagnosis ? `
          <div class="section">
            <div class="label">Diagnosis:</div>
            <div class="value">${reportData.diagnosis}</div>
          </div>
          ` : ''}
          
          ${reportData.prescription ? `
          <div class="section">
            <div class="label">Prescription:</div>
            <div class="value">${reportData.prescription}</div>
          </div>
          ` : ''}
          
          ${reportData.visitSummary ? `
          <div class="section">
            <div class="label">Visit Summary:</div>
            <div class="value">${reportData.visitSummary}</div>
          </div>
          ` : ''}
          
          ${reportData.nextAppointment ? `
          <div class="section">
            <div class="label">Next Appointment:</div>
            <div class="value">${new Date(reportData.nextAppointment).toLocaleDateString()}</div>
          </div>
          ` : ''}
          
          <button class="no-print" onclick="window.print()" style="margin-top: 30px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
        </body>
      </html>
    `);
    
    reportWindow.document.close();
  };

  const uniqueDoctors = [...new Set(appointments.map(apt => apt.doctor_name))];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'cancelled': return 'text-red-400';
      case 'no-show': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-500/10';
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10';
      default: return 'border-green-500/50 bg-green-500/10';
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
    <div className="flex-1 p-8 space-y-6">
      {/* Header with Filters */}
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Appointment History</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{filteredAppointments.length} appointments found</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400/60 w-4 h-4" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-10 py-2 text-sm focus:outline-none focus:border-cyan-400/50"
            />
          </div>

          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50"
          >
            <option value="all">All Doctors</option>
            {uniqueDoctors.map(doctor => (
              <option key={doctor} value={doctor}>{doctor}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50"
          >
            <option value="all">All Types</option>
            <option value="in-person">In-Person</option>
            <option value="video">Video Call</option>
            <option value="phone">Phone Call</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No Show</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'doctor' | 'rating')}
            className="bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50"
          >
            <option value="date">Sort by Date</option>
            <option value="doctor">Sort by Doctor</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
        {filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map(appointment => (
              <div
                key={appointment.id}
                className={`bg-black/20 border-l-4 rounded-xl p-4 ${getPriorityColor(appointment.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-lg">{appointment.title}</h4>
                      <div className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(appointment.date).toLocaleDateString()}</span>
                        </div>
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
                        <div className="flex items-center space-x-2 capitalize">
                          <MapPin className="w-4 h-4" />
                          <span>{appointment.appointment_type.replace('-', ' ')}</span>
                        </div>
                        {appointment.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{appointment.location}</span>
                          </div>
                        )}
                        {appointment.rating && (
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < appointment.rating! ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {appointment.diagnosis && (
                      <div className="mb-3 p-3 bg-blue-500/10 rounded-lg">
                        <p className="text-sm text-blue-300">
                          <span className="font-medium">Diagnosis:</span> {appointment.diagnosis}
                        </p>
                      </div>
                    )}

                    {appointment.next_appointment_date && (
                      <div className="mb-3 p-3 bg-green-500/10 rounded-lg">
                        <p className="text-sm text-green-300">
                          <span className="font-medium">Next Appointment:</span> {new Date(appointment.next_appointment_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setShowDetailsModal(true);
                      }}
                      className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {appointment.status === 'completed' && !appointment.rating && (
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowFeedbackModal(true);
                        }}
                        className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                        title="Leave Feedback"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => downloadReport(appointment)}
                      className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
                      title="Download Report"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => printReport(appointment)}
                      className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
                      title="Print Report"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400">No appointment history found</p>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Leave Feedback</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-2">
                How would you rate your appointment with {selectedAppointment.doctor_name}?
              </p>
              
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setRating(i + 1)}
                    className="p-1 rounded transition-colors hover:bg-cyan-500/20"
                  >
                    <Star
                      className={`w-6 h-6 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Additional Comments (Optional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full bg-black/30 border border-cyan-500/20 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:border-cyan-400/50"
                placeholder="Share your experience..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSelectedAppointment(null);
                  setRating(0);
                  setFeedback('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                disabled={rating === 0}
                className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Appointment Details</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAppointment(null);
                }}
                className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Appointment</label>
                  <p className="text-white">{selectedAppointment.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Date & Time</label>
                  <p className="text-white">
                    {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Doctor</label>
                  <p className="text-white">{selectedAppointment.doctor_name}</p>
                  {selectedAppointment.doctor_specialty && (
                    <p className="text-gray-400 text-sm">{selectedAppointment.doctor_specialty}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                  <p className="text-white capitalize">{selectedAppointment.appointment_type.replace('-', ' ')}</p>
                </div>
              </div>

              {selectedAppointment.diagnosis && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Diagnosis</label>
                  <p className="text-white bg-blue-500/10 p-3 rounded-lg">{selectedAppointment.diagnosis}</p>
                </div>
              )}

              {selectedAppointment.prescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Prescription</label>
                  <p className="text-white bg-green-500/10 p-3 rounded-lg">{selectedAppointment.prescription}</p>
                </div>
              )}

              {selectedAppointment.visit_summary && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Visit Summary</label>
                  <p className="text-white bg-gray-500/10 p-3 rounded-lg">{selectedAppointment.visit_summary}</p>
                </div>
              )}

              {selectedAppointment.feedback && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Your Feedback</label>
                  <div className="bg-yellow-500/10 p-3 rounded-lg">
                    {selectedAppointment.rating && (
                      <div className="flex items-center space-x-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < selectedAppointment.rating! ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-white">{selectedAppointment.feedback}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => downloadReport(selectedAppointment)}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                Download Report
              </button>
              <button
                onClick={() => printReport(selectedAppointment)}
                className="px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
              >
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
