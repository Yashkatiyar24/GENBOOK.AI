import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey);
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate Supabase URL format
try {
  new URL(supabaseUrl);
} catch (e) {
  throw new Error('Invalid Supabase URL format. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to test database connection and setup
export const testDatabaseConnection = async () => {
  try {
    // Try to select from appointments table to test if it exists
    const { data, error } = await supabase
      .from('appointments')
      .select('count', { count: 'exact' })
      .limit(1)

    if (error) {
      console.error('Database connection error:', error);
      return { success: false, error: error.message };
    }

    console.log('Database connection successful');
    return { success: true, data };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Function to setup database table (for development/testing)
export const setupDatabase = async () => {
  try {
    const { error } = await supabase.rpc('setup_appointments_table');
    
    if (error) {
      console.error('Database setup error:', error);
      return { success: false, error: error.message };
    }

    console.log('Database setup completed');
    return { success: true };
  } catch (error) {
    console.error('Database setup failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Enhanced types for appointments and related entities
export interface Appointment {
  id?: string
  user_id?: string | null
  title: string
  description?: string
  start_time: string
  end_time: string
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  color?: string
  location?: string
  meeting_link?: string
  attendees?: string[]
  tags?: string[]
  notes?: string
  attachments?: string[]
  buffer_before?: number // minutes
  buffer_after?: number // minutes
  is_recurring?: boolean
  recurring_pattern?: RecurringPattern
  parent_appointment_id?: string
  // Phase 1 schema fields
  series_id?: string
  max_attendees?: number
  attendee_count?: number
  cancellation_reason?: string
  no_show_probability?: number
  reminder_sent?: boolean
  confirmation_sent?: boolean
  feedback_requested?: boolean
  created_at?: string
  updated_at?: string
  doctor_name?: string // Added doctor_name field
  appointment_type?: string // Added appointment_type field
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number // every X days/weeks/months/years
  days_of_week?: number[] // for weekly: [0,1,2,3,4,5,6]
  end_date?: string
  max_occurrences?: number
}

export interface Contact {
  id?: string
  user_id?: string
  name: string
  email?: string
  phone?: string
  company?: string
  position?: string
  tags?: string[]
  notes?: string
  avatar_url?: string
  last_contact?: string
  contact_frequency?: number // days
  vip?: boolean
  created_at?: string
  updated_at?: string
}

export interface UserSettings {
  id?: string
  user_id: string
  working_hours_start: string // '09:00'
  working_hours_end: string // '17:00'
  working_days: number[] // [1,2,3,4,5] Monday-Friday
  timezone: string
  default_buffer_before: number // minutes
  default_buffer_after: number // minutes
  default_appointment_duration: number // minutes
  notification_preferences: {
    email_reminders: boolean
    sms_reminders: boolean
    push_notifications: boolean
    reminder_times: number[] // minutes before: [1440, 60, 15]
  }
  ai_preferences: {
    auto_suggest_times: boolean
    smart_scheduling: boolean
    no_show_prediction: boolean
    auto_reminders: boolean
  }
}

export interface ConflictCheck {
  has_conflict: boolean
  conflicting_appointments: Appointment[]
  suggested_times: Date[]
  message: string
}

// Function to create a new appointment
export const createAppointment = async (appointmentData: Appointment) => {
  try {
    console.log('Attempting to create appointment:', appointmentData);
    
    // Attach the authenticated user's id to satisfy common RLS policies
    const { data: authData } = await supabase.auth.getUser();
    const payload: Appointment = {
      ...appointmentData,
      user_id: appointmentData.user_id ?? (authData?.user?.id || undefined),
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([payload])
      .select()

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Appointment created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createAppointment function:', error);
    throw error;
  }
}

// Function to get all appointments for the current user
export const getAppointments = async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('start_time', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

// Function to update an appointment
export const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    throw error
  }

  return data
}

// Function to delete an appointment
export const deleteAppointment = async (id: string) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }

  return true
}

// Enhanced appointment management functions

// Function to check for appointment conflicts
export const checkAppointmentConflicts = async (
  startTime: string,
  endTime: string,
  userId: string,
  excludeAppointmentId?: string
): Promise<ConflictCheck> => {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .or(
        `and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`
      );

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data: conflictingAppointments, error } = await query;

    if (error) {
      throw error;
    }

    const hasConflict = conflictingAppointments && conflictingAppointments.length > 0;
    
    // Generate suggested alternative times if there's a conflict
    const suggestedTimes: Date[] = [];
    if (hasConflict) {
      // Parse dates in a cross-browser compatible way
      // First convert ISO string to parts
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      const suggestedSlots = await generateAlternativeTimeSlots(
        startDate,
        endDate,
        userId
      );
      suggestedTimes.push(...suggestedSlots);
    }

    return {
      has_conflict: hasConflict,
      conflicting_appointments: conflictingAppointments || [],
      suggested_times: suggestedTimes,
      message: hasConflict 
        ? `Conflict detected with ${conflictingAppointments?.length} existing appointment(s)` 
        : 'No conflicts found'
    };
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return {
      has_conflict: false,
      conflicting_appointments: [],
      suggested_times: [],
      message: 'Error checking conflicts'
    };
  }
};

// Function to generate alternative time slots
export const generateAlternativeTimeSlots = async (
  requestedStart: Date,
  requestedEnd: Date,
  userId: string,
  count: number = 5
): Promise<Date[]> => {
  const duration = requestedEnd.getTime() - requestedStart.getTime();
  const suggestions: Date[] = [];
  
  // Get user's existing appointments for the day
  // Create dates in a cross-browser compatible way
  const startOfDay = new Date(requestedStart.getFullYear(), requestedStart.getMonth(), requestedStart.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(requestedStart.getFullYear(), requestedStart.getMonth(), requestedStart.getDate(), 23, 59, 59, 999);
  
  const { data: dayAppointments } = await supabase
    .from('appointments')
    .select('start_time, end_time, buffer_before, buffer_after')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true });
  
  // Find available slots throughout the day
  const workStart = 9; // 9 AM
  const workEnd = 17; // 5 PM
  // slotDuration previously computed but unused; removed to satisfy noUnusedLocals
  
  for (let hour = workStart; hour < workEnd && suggestions.length < count; hour++) {
    for (let minute = 0; minute < 60 && suggestions.length < count; minute += 15) {
      // Create date in a cross-browser compatible way
      const potentialStart = new Date(requestedStart.getFullYear(), requestedStart.getMonth(), requestedStart.getDate(), hour, minute, 0, 0);
      const potentialEnd = new Date(potentialStart.getTime() + duration);
      
      // Check if this slot conflicts with existing appointments
      const hasConflict = dayAppointments?.some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        const bufferBefore = apt.buffer_before || 0;
        const bufferAfter = apt.buffer_after || 0;
        const bufferStart = new Date(aptStart.getTime() - bufferBefore * 60000);
        const bufferEnd = new Date(aptEnd.getTime() + bufferAfter * 60000);
        
        // Use getTime() for date comparisons to ensure cross-browser compatibility
        return (
          (potentialStart.getTime() >= bufferStart.getTime() && potentialStart.getTime() < bufferEnd.getTime()) ||
          (potentialEnd.getTime() > bufferStart.getTime() && potentialEnd.getTime() <= bufferEnd.getTime()) ||
          (potentialStart.getTime() <= bufferStart.getTime() && potentialEnd.getTime() >= bufferEnd.getTime())
        );
      });
      
      if (!hasConflict && potentialEnd.getHours() <= workEnd) {
        suggestions.push(potentialStart);
      }
    }
  }
  
  return suggestions;
};

// AI-powered suggestion functions

// Function to get personalized time slot suggestions based on user history
export const getPersonalizedTimeSlots = async (
  userId: string,
  date: Date,
  duration: number = 30
): Promise<Date[]> => {
  try {
    // Get user's appointment history to find patterns
    const { data: history } = await supabase
      .from('appointments')
      .select('start_time, status')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: false })
      .limit(50);

    if (!history || history.length === 0) {
      return generateDefaultTimeSlots(date, duration);
    }

    // Analyze preferred times (hour of day frequency)
    const hourFrequency = new Map<number, number>();
    history.forEach(apt => {
      const hour = new Date(apt.start_time).getHours();
      hourFrequency.set(hour, (hourFrequency.get(hour) || 0) + 1);
    });

    // Sort hours by frequency (most used first)
    const preferredHours = Array.from(hourFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([hour]) => hour)
      .slice(0, 3); // Top 3 preferred hours

    // Generate suggestions based on preferred times
    const suggestions: Date[] = [];
    // Create a new date in a cross-browser compatible way
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    for (const hour of preferredHours) {
      // Try the exact preferred time - create in a cross-browser compatible way
      const exactTime = new Date(year, month, day, hour, 0, 0, 0);
      suggestions.push(exactTime);
      
      // Try 30 minutes before and after - create in a cross-browser compatible way
      const earlier = new Date(year, month, day, hour, -30, 0, 0); // Using negative minutes will adjust the hour correctly
      suggestions.push(earlier);
      
      const later = new Date(year, month, day, hour, 30, 0, 0);
      suggestions.push(later);
    }
    
    // Remove duplicates and filter to working hours
    const uniqueSuggestions = suggestions
      .filter((time, index, arr) => 
        arr.findIndex(t => t.getTime() === time.getTime()) === index
      )
      .filter(time => {
        const hour = time.getHours();
        return hour >= 9 && hour <= 17; // Working hours
      })
      .slice(0, 5);
    
    return uniqueSuggestions.length > 0 ? uniqueSuggestions : generateDefaultTimeSlots(date, duration);
    
  } catch (error) {
    console.error('Error getting personalized slots:', error);
    return generateDefaultTimeSlots(date, duration);
  }
};

// Function to generate default time slots if no history available
const generateDefaultTimeSlots = (date: Date, duration: number): Date[] => {
  // Mark duration as used to satisfy noUnusedParameters without changing API
  void duration;
  const slots: Date[] = [];
  
  // Extract date components in a cross-browser compatible way
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Popular meeting times: 9 AM, 10 AM, 11 AM, 2 PM, 3 PM
  const popularHours = [9, 10, 11, 14, 15];
  
  popularHours.forEach(hour => {
    // Create date in a cross-browser compatible way
    const slot = new Date(year, month, day, hour, 0, 0, 0);
    slots.push(slot);
  });
  
  return slots;
};

// Function to predict no-show probability using simple heuristics
export const predictNoShowProbability = async (userId: string, appointmentData: Partial<Appointment>): Promise<number> => {
  try {
    // Get user's historical no-show rate
    const { data: history } = await supabase
      .from('appointments')
      .select('status, start_time')
      .eq('user_id', userId)
      .in('status', ['completed', 'no-show', 'cancelled'])
      .order('start_time', { ascending: false })
      .limit(20);

    if (!history || history.length < 3) {
      return 0.1; // Default 10% for new users
    }

    let baseNoShowRate = 0;
    let cancellationRate = 0;
    
    history.forEach(apt => {
      if (apt.status === 'no-show') baseNoShowRate++;
      if (apt.status === 'cancelled') cancellationRate++;
    });
    
    baseNoShowRate = baseNoShowRate / history.length;
    cancellationRate = cancellationRate / history.length;
    
    // Adjust probability based on factors
    let probability = baseNoShowRate;
    
    // Factor 1: High cancellation rate increases no-show risk
    if (cancellationRate > 0.3) probability += 0.15;
    
    // Factor 2: Same-day bookings have higher no-show rates
    if (appointmentData.start_time) {
      // Ensure proper date parsing across browsers
      const appointmentDate = new Date(appointmentData.start_time);
      const now = new Date();
      // Use getTime() for consistent cross-browser date math
      const daysDiff = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 1) probability += 0.2; // Same day
      else if (daysDiff < 3) probability += 0.1; // Within 3 days
    }
    
    // Factor 3: Friday afternoon appointments tend to have higher no-shows
    if (appointmentData.start_time) {
      // Ensure proper date parsing across browsers
      const appointmentDate = new Date(appointmentData.start_time);
      // Use consistent methods for date properties
      const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 5 = Friday
      const hour = appointmentDate.getHours();
      
      if (dayOfWeek === 5 && hour >= 15) probability += 0.1; // Friday afternoon
    }
    
    return Math.min(Math.max(probability, 0), 1); // Clamp between 0 and 1
    
  } catch (error) {
    console.error('Error predicting no-show:', error);
    return 0.1; // Default fallback
  }
};

// Contact management functions

// Function to create or update a contact
export const upsertContact = async (contactData: Contact): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from('contacts')
    .upsert(contactData, { onConflict: 'email' })
    .select();
  
  if (error) throw error;
  return data;
};

// Function to get all contacts for a user
export const getContacts = async (userId: string): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

// Function to search contacts
export const searchContacts = async (userId: string, query: string): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
    .order('name', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

// Function to get contacts that haven't been contacted recently
export const getContactsForFollowUp = async (userId: string, days: number = 30): Promise<Contact[]> => {
  // Create cutoff date in a cross-browser compatible way
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .or(`last_contact.is.null,last_contact.lt.${cutoffDate.toISOString()}`)
    .order('last_contact', { ascending: true, nullsFirst: true });
    
  if (error) throw error;
  return data || [];
};

// Function to get AI suggested times for appointments
export const getAISuggestedTimes = async (
  userId: string,
  date: Date,
  duration: number = 30
): Promise<Date[]> => {
  try {
    // First try to get personalized time slots based on user history
    const personalizedSlots = await getPersonalizedTimeSlots(userId, date, duration);
    
    if (personalizedSlots.length > 0) {
      return personalizedSlots;
    }
    
    // Fallback to generating alternative time slots
    // Create dates in a cross-browser compatible way
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Start at 9 AM
    const startOfDay = new Date(year, month, day, 9, 0, 0, 0);
    
    // End at 5 PM
    const endOfDay = new Date(year, month, day, 17, 0, 0, 0);
    
    return generateAlternativeTimeSlots(startOfDay, endOfDay, userId, 5);
  } catch (error) {
    console.error('Error getting AI suggested times:', error);
    return generateDefaultTimeSlots(date, duration);
  }
};
