import { createClient, type User, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`
    Missing Supabase environment variables.
    Please check your .env file and ensure the following are set:
    - VITE_SUPABASE_URL
    - VITE_SUPABASE_ANON_KEY
  `)
}

type AuthChangeHandler = (event: AuthChangeEvent, session: Session | null) => void

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    debug: import.meta.env.DEV
  }
})

// Helper function to handle auth state changes
export const handleAuthStateChange: AuthChangeHandler = (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    console.log('User signed in:', session.user.email)
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
}

// Initialize auth state listener
supabase.auth.onAuthStateChange(handleAuthStateChange)

export type { SupabaseClient }

// Export auth functions for easier access
export const signUp = async (email: string, password: string, userData?: Record<string, any>) => {
  try {
    console.log('Attempting to sign up user with email:', email);
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (result.error) {
      console.error('Signup error:', result.error);
      if (result.error.message.includes('already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      } else if (result.error.message.includes('password')) {
        throw new Error('Please choose a stronger password.');
      } else {
        throw new Error(result.error.message || 'Failed to create account. Please try again.');
      }
    }

    console.log('Signup successful, user:', result.data.user);
    return result;
  } catch (error: any) {
    console.error('Signup error details:', error);
    throw error;
  }
}

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password
  })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Appointment related functions
export interface Appointment {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  meeting_link?: string;
  provider?: string;
  notes?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const createAppointment = async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([
        {
          ...appointment,
          user_id: user.id,
          status: appointment.status || 'scheduled',
          priority: appointment.priority || 'medium'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { data: null, error };
  }
};

export const getAppointments = async (filters: Partial<Appointment> = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id);

    // Apply filters if provided
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query.order('start_time', { ascending: true });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { data: null, error };
  }
};
