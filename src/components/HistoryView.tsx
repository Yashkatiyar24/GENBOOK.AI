import React, { useState, useEffect } from 'react';
import { Search, FileText, Download } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

interface HistoryAppointment {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  duration: number;
  doctor_name?: string | null;
  doctor_id?: string;
  provider_name?: string;
  provider?: string;
  appointment_type: 'in-person' | 'video' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  location?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

interface HistoryViewProps {
  user: SupabaseUser | null;
}

const HistoryView: React.FC<HistoryViewProps> = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [appointments, setAppointments] = useState<HistoryAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointments from Supabase
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });

        if (error) throw error;

        console.log('Raw appointment data from database:', data);
        if (data && data.length > 0) {
          console.log('First appointment data:', JSON.stringify(data[0], null, 2));
          console.log('All appointment fields:', Object.keys(data[0]));
        }
        
        // Process and format the appointments
        const processedAppointments = (data || []).map(apt => {
          console.log('Processing appointment:', { 
            id: apt.id, 
            allFields: Object.keys(apt).filter(k => k.includes('doctor') || k.includes('provider') || k.includes('with'))
          });
          
          // Try to find doctor name in various possible fields
          let doctorName = 'Not specified';
          const possibleDoctorFields = [
            'doctor_name', 'doctor', 'provider_name', 'provider', 
            'with', 'doctorName', 'providerName', 'assigned_to'
          ];
          
          // Try each possible field
          for (const field of possibleDoctorFields) {
            if (apt[field] && apt[field].trim() !== '') {
              doctorName = apt[field];
              console.log(`Found doctor name in field '${field}':`, doctorName);
              break;
            }
          }
          
          // If not yet found, try extracting from title like: "Check-up with Dr. Lisa Thompson"
          if (doctorName === 'Not specified' && typeof apt.title === 'string' && apt.title) {
            const m = apt.title.match(/with\s+(Dr\.?\s*)?(.+)/i);
            if (m && (m[2] || m[1])) {
              doctorName = (m[2] || m[1] || '').trim();
            }
          }

          // Clean up and normalize doctor name if we have something
          if (doctorName !== 'Not specified') {
            let cleaned = String(doctorName)
              .replace(/^with\s+/i, '')
              .replace(/^dr\.?\s*/i, '')
              .replace(/\s+/g, ' ')
              .trim();

            // Capitalize words
            cleaned = cleaned
              .toLowerCase()
              .split(' ')
              .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w)
              .join(' ');

            // Final normalized with prefix
            doctorName = cleaned ? `Dr. ${cleaned}` : 'Not specified';
          }
            
          // Ensure we have valid dates and format them
          const startTime = apt.start_time ? new Date(apt.start_time) : new Date();
          const endTime = apt.end_time ? new Date(apt.end_time) : new Date(startTime.getTime() + (apt.duration || 30) * 60000);
          
          return {
            ...apt,
            doctor_name: doctorName,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            date: startTime.toISOString().split('T')[0], // For backward compatibility
            time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: apt.duration || 30,
            status: apt.status || 'scheduled',
            appointment_type: apt.appointment_type || 'in-person',
          };
        });

        setAppointments(processedAppointments);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  // Filter appointments based on search and status
  const filteredAppointments = appointments.filter((appointment) => {
    // Handle search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const doctorName = appointment.doctor_name || '';
      
      const matchesSearch = (
        appointment.title.toLowerCase().includes(query) ||
        doctorName.toLowerCase().includes(query) ||
        (appointment.notes && appointment.notes.toLowerCase().includes(query)) ||
        formatDate(appointment.start_time).toLowerCase().includes(query) ||
        appointment.status.toLowerCase().includes(query)
      );
      
      if (!matchesSearch) return false;
    }
    
    // Handle status filter
    if (filterStatus === 'upcoming') {
      return new Date(appointment.start_time) > new Date();
    } else if (filterStatus !== 'all') {
      return appointment.status === filterStatus;
    }
    
    return true;
  });

  // Generate PDF for an appointment (modern, branded, dynamic)
  const downloadAppointmentDetails = (appointment: HistoryAppointment) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48; // 48pt (~0.67in)
    let y = margin;

    // Colors
    const brandBlue = { r: 34, g: 197, b: 235 }; // light cyan/blue
    const softBlue = { r: 226, g: 244, b: 250 };
    const borderGray = { r: 220, g: 224, b: 230 };
    const textDark = { r: 35, g: 38, b: 47 };
    const textMuted = { r: 120, g: 129, b: 149 };

    // Helpers
    const setColor = (c: { r: number; g: number; b: number }) => doc.setTextColor(c.r, c.g, c.b);
    const drawDivider = (yy: number) => {
      doc.setDrawColor(borderGray.r, borderGray.g, borderGray.b);
      doc.setLineWidth(0.6);
      doc.line(margin, yy, pageWidth - margin, yy);
    };
    const label = (text: string, x: number, yy: number) => {
      doc.setFont(undefined, 'bold'); setColor(textMuted); doc.text(text, x, yy);
    };
    const value = (text: string, x: number, yy: number) => {
      doc.setFont(undefined, 'normal'); setColor(textDark); doc.text(text, x, yy);
    };
    const notSpecified = (x: number, yy: number) => {
      doc.setFont(undefined, 'normal'); setColor(textMuted); doc.text('Not specified', x, yy);
    };
    const formatFullDateTime = (iso: string) => {
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return 'Invalid date';
        const day = d.toLocaleDateString(undefined, { weekday: 'long' });
        const date = d.toLocaleDateString(undefined, { day: '2-digit' });
        const month = d.toLocaleDateString(undefined, { month: 'short' });
        const year = d.getFullYear();
        const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        return `${day}, ${date} ${month} ${year} – ${time}`;
      } catch {
        return 'Invalid date';
      }
    };
    const minutesBetween = (a?: string, b?: string) => {
      if (!a || !b) return undefined;
      const s = new Date(a).getTime();
      const e = new Date(b).getTime();
      if (isNaN(s) || isNaN(e) || e <= s) return undefined;
      return Math.round((e - s) / 60000);
    };
    const durationMin = appointment.duration || minutesBetween(appointment.start_time, appointment.end_time) || 30;
    const typeDisplay = appointment.appointment_type === 'in-person'
      ? 'In-person'
      : appointment.appointment_type === 'video'
      ? 'Virtual (Video)'
      : appointment.appointment_type === 'phone'
      ? 'Virtual (Phone)'
      : appointment.appointment_type;

    // Header bar
    doc.setFillColor(softBlue.r, softBlue.g, softBlue.b);
    doc.rect(0, 0, pageWidth, 80, 'F');
    doc.setFontSize(18); setColor(brandBlue); doc.setFont(undefined, 'bold');
    doc.text('GenBook.AI', margin, 50);
    doc.setFontSize(12); setColor(textMuted); doc.setFont(undefined, 'normal');
    doc.text('Appointment Confirmation', pageWidth - margin, 50, { align: 'right' });
    y = 100;

    // Card container border
    doc.setDrawColor(borderGray.r, borderGray.g, borderGray.b);
    doc.setLineWidth(1);
    doc.rect(margin, y, pageWidth - margin * 2, pageHeight - y - margin - 40);
    y += 32;

    // Title
    doc.setFontSize(16); setColor(textDark); doc.setFont(undefined, 'bold');
    const title = appointment.title || 'Appointment';
    doc.text(title, margin + 16, y);
    y += 20;
    drawDivider(y); y += 24;

    // Primary details: Date & Time, Status, Type
    doc.setFontSize(12);
    // Date & Time
    label('Date & Time:', margin + 16, y); 
    value(formatFullDateTime(appointment.start_time), margin + 120, y);
    y += 18;
    // Status
    label('Status:', margin + 16, y);
    value(appointment.status ? (appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)) : 'Scheduled', margin + 120, y);
    y += 18;
    // Type
    label('Type:', margin + 16, y);
    value(typeDisplay, margin + 120, y);
    y += 18;
    // Duration
    label('Duration:', margin + 16, y);
    value(`${durationMin} min`, margin + 120, y);
    y += 26;

    drawDivider(y); y += 24;

    // Secondary details: Doctor, Location (conditional), Notes (wrap)
    // Doctor
    label('Doctor:', margin + 16, y);
    if (appointment.doctor_name && appointment.doctor_name.trim() !== '') {
      value(appointment.doctor_name, margin + 120, y);
    } else {
      notSpecified(margin + 120, y);
    }
    y += 18;
    // Location
    if (appointment.location && appointment.location.trim() !== '') {
      label('Location:', margin + 16, y);
      value(appointment.location, margin + 120, y);
      y += 18;
    }
    // Notes
    if (appointment.notes && appointment.notes.trim() !== '') {
      label('Additional Notes:', margin + 16, y);
      y += 16;
      doc.setFont(undefined, 'normal'); setColor(textDark);
      const maxWidth = pageWidth - (margin + 120) - margin;
      const wrapped = doc.splitTextToSize(appointment.notes, maxWidth);
      doc.text(wrapped, margin + 16, y);
      y += wrapped.length * 14;
    }

    // Footer
    const footerY = pageHeight - margin;
    drawDivider(footerY - 16);
    doc.setFontSize(10); setColor(textMuted); doc.setFont(undefined, 'normal');
    doc.text('Generated by GenBook.AI', margin, footerY);
    doc.text('https://genbook.ai', pageWidth - margin, footerY, { align: 'right' });

    // Save
    doc.save(`appointment-${appointment.id}.pdf`);
  };

  // Get status badge with appropriate styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Scheduled</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Cancelled</span>;
      case 'no-show':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">No Show</span>;
      case 'upcoming':
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Upcoming</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short',
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      return date.toLocaleDateString(undefined, options);
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid time';
      
      const options: Intl.DateTimeFormatOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      };
      return date.toLocaleTimeString(undefined, options);
    } catch (e) {
      console.error('Error formatting time:', e);
      return 'Invalid time';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 md:p-12 max-w-7xl mx-auto bg-background text-foreground">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <h2 className="text-2xl font-bold">Appointment History</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto min-w-[300px]">
          <div className="relative flex-1 min-w-[250px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search appointments..."
              className="block w-full pl-10 pr-4 py-2.5 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm text-foreground placeholder:text-muted-foreground bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            className="block w-full pl-3 pr-10 py-2.5 text-base bg-card border border-input focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm rounded-lg text-foreground"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No Show</option>
          </select>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="bg-card border rounded-lg shadow-sm">
          <div className="px-6 py-8 sm:px-8 sm:py-10 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">No appointments</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || filterStatus !== 'all' 
                ? 'No appointments match your current filters.' 
                : 'You have no appointments scheduled yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg shadow-sm bg-card">
          <div className="overflow-x-auto p-2 md:p-4">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Appointment
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Doctor
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="font-medium">{appointment.title}</div>
                      <div className="text-sm text-muted-foreground">{appointment.appointment_type}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {(() => {
                          // Try to extract doctor name from the description
                          if (appointment.description) {
                            const doctorMatch = appointment.description.match(/Doctor: ([^\n]+)/);
                            if (doctorMatch && doctorMatch[1]) {
                              return doctorMatch[1].trim();
                            }
                          }
                          // Fallback to doctor_name field if available
                          return appointment.doctor_name || 'Not specified';
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm">
                        {formatDate(appointment.start_time)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(appointment.start_time)} • {formatDuration(appointment.duration)}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {getStatusBadge(appointment.status)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => downloadAppointmentDetails(appointment)}
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="Download Details"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
