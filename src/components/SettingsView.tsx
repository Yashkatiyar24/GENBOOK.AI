import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Users, Plus, Trash2, Edit, X } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  medical_conditions?: string;
  allergies?: string;
  preferred_language: string;
  timezone: string;
  avatar_url?: string;
}

interface NotificationSettings {
  email_appointments: boolean;
  email_reminders: boolean;
  email_updates: boolean;
  sms_appointments: boolean;
  sms_reminders: boolean;
  push_appointments: boolean;
  push_reminders: boolean;
  reminder_timing: number; // minutes before appointment
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  date_of_birth: string;
  phone?: string;
  email?: string;
  medical_conditions?: string;
  allergies?: string;
}

interface SettingsViewProps {
  user: SupabaseUser | null;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving2FA, setSaving2FA] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [twoFAUri, setTwoFAUri] = useState<string | null>(null);
  const [twoFAFactorId, setTwoFAFactorId] = useState<string | null>(null);
  const [twoFAVerificationCode, setTwoFAVerificationCode] = useState('');
  
  // Initialize default profile when user is available
  useEffect(() => {
    if (user && !profile) {
      const defaultProfile: UserProfile = {
        id: '',
        full_name: user?.user_metadata?.name || '',
        email: user?.email || '',
        phone: '',
        address: '',
        date_of_birth: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        insurance_provider: '',
        insurance_number: '',
        medical_conditions: '',
        allergies: '',
        preferred_language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        avatar_url: ''
      };
      setProfile(defaultProfile);
    }
  }, [user, profile]);
  
  // Helper function to update profile fields
  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile(prev => {
      if (prev) {
        return { ...prev, [field]: value };
      } else {
        // Create default profile if it doesn't exist
        return {
          id: '',
          full_name: field === 'full_name' ? value : user?.user_metadata?.name || '',
          email: field === 'email' ? value : user?.email || '',
          phone: field === 'phone' ? value : '',
          address: field === 'address' ? value : '',
          date_of_birth: field === 'date_of_birth' ? value : '',
          emergency_contact_name: field === 'emergency_contact_name' ? value : '',
          emergency_contact_phone: field === 'emergency_contact_phone' ? value : '',
          insurance_provider: field === 'insurance_provider' ? value : '',
          insurance_number: field === 'insurance_number' ? value : '',
          medical_conditions: field === 'medical_conditions' ? value : '',
          allergies: field === 'allergies' ? value : '',
          preferred_language: field === 'preferred_language' ? value : 'en',
          timezone: field === 'timezone' ? value : Intl.DateTimeFormat().resolvedOptions().timeZone,
          avatar_url: field === 'avatar_url' ? value : ''
        };
      }
    });
  };
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_appointments: true,
    email_reminders: true,
    email_updates: false,
    sms_appointments: false,
    sms_reminders: true,
    push_appointments: true,
    push_reminders: true,
    reminder_timing: 60
  });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);

  // Begin 2FA enrollment (best-effort using Supabase MFA if available)
  const beginEnable2FA = async () => {
    try {
      if (saving2FA) return; // prevent double-invoke
      setSaving2FA(true);
      const anyAuth: any = (supabase as any).auth;
      if (!anyAuth?.mfa?.enroll) {
        alert('2FA (TOTP) is not available. Ensure MFA is enabled in Supabase Auth and you are using @supabase/supabase-js v2.');
        return;
      }
      const { data, error } = await anyAuth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      // Expected shape from gotrue-js: { id, type, totp: { secret, uri } }
      const factorId = data?.id || null;
      const secret = data?.totp?.secret || null;
      const uri = data?.totp?.uri || null;
      if (!factorId || !secret || !uri) {
        throw new Error('Unexpected MFA enroll response');
      }
      setTwoFAFactorId(factorId);
      setTwoFASecret(secret);
      setTwoFAUri(uri);
      setShowTwoFactorModal(true);
    } catch (e: any) {
      console.error('Error starting 2FA enrollment:', e);
      const msg = e?.message || e?.error_description || e?.error || String(e);
      alert(`Could not start 2FA enrollment: ${msg}`);
    } finally {
      setSaving2FA(false);
    }
  };

  // Verify 2FA code
  const verify2FAEnrollment = async () => {
    try {
      if (!twoFAFactorId || !twoFAVerificationCode) return;
      setSaving2FA(true);
      const anyAuth: any = (supabase as any).auth;
      if (!anyAuth?.mfa?.verify) {
        alert('2FA verification not available.');
        return;
      }
      const { error } = await anyAuth.mfa.verify({ factorId: twoFAFactorId, code: twoFAVerificationCode });
      if (error) throw error;
      alert('Two-Factor Authentication enabled successfully.');
      setShowTwoFactorModal(false);
      setTwoFAVerificationCode('');
    } catch (e) {
      console.error('Error verifying 2FA code:', e);
      alert('Invalid code. Please try again.');
    } finally {
      setSaving2FA(false);
    }
  };

  // Export account data (PDF, styled similar to HistoryView appointment PDF)
  const exportAccountData = async () => {
    try {
      if (!user?.id) return;
      setSaving(true);
      const [profileRes, settingsRes, aptsRes, contactsRes, familyRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
        supabase.from('appointments').select('*').eq('user_id', user.id).order('start_time', { ascending: false }),
        supabase.from('contacts').select('*').eq('user_id', user.id),
        supabase.from('family_members').select('*').eq('user_id', user.id),
      ]);

      const profileData = profileRes.data || {};
      const settingsData: any = settingsRes.data || {};
      const notificationsAny = settingsData?.notification_settings || settingsData?.notification_preferences || {};
      const appointments = (aptsRes.data || []) as any[];
      const contacts = contactsRes.data || [];
      const family = familyRes.data || [];

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      let y = margin;

      // Colors (match HistoryView styling)
      const brandBlue = { r: 34, g: 197, b: 235 };
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
      const label = (text: string, x: number, yy: number) => { doc.setFont(undefined, 'bold'); setColor(textMuted); doc.text(text, x, yy); };
      const value = (text: string, x: number, yy: number) => { doc.setFont(undefined, 'normal'); setColor(textDark); doc.text(String(text ?? ''), x, yy); };
      const notSpecified = (x: number, yy: number) => { doc.setFont(undefined, 'normal'); setColor(textMuted); doc.text('Not specified', x, yy); };
      const formatFullDateTime = (iso?: string) => {
        try {
          if (!iso) return '—';
          const d = new Date(iso);
          if (isNaN(d.getTime())) return 'Invalid date';
          const day = d.toLocaleDateString(undefined, { weekday: 'long' });
          const date = d.toLocaleDateString(undefined, { day: '2-digit' });
          const month = d.toLocaleDateString(undefined, { month: 'short' });
          const year = d.getFullYear();
          const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          return `${day}, ${date} ${month} ${year} – ${time}`;
        } catch { return 'Invalid date'; }
      };
      const minutesBetween = (a?: string, b?: string) => {
        if (!a || !b) return undefined;
        const s = new Date(a).getTime();
        const e = new Date(b).getTime();
        if (isNaN(s) || isNaN(e) || e <= s) return undefined;
        return Math.round((e - s) / 60000);
      };

      // Header bar
      doc.setFillColor(softBlue.r, softBlue.g, softBlue.b);
      doc.rect(0, 0, pageWidth, 80, 'F');
      doc.setFontSize(18); setColor(brandBlue); doc.setFont(undefined, 'bold');
      doc.text('GenBook.AI', margin, 50);
      doc.setFontSize(12); setColor(textMuted); doc.setFont(undefined, 'normal');
      doc.text('Account Export', pageWidth - margin, 50, { align: 'right' });
      y = 100;

      // Card container border
      doc.setDrawColor(borderGray.r, borderGray.g, borderGray.b);
      doc.setLineWidth(1);
      doc.rect(margin, y, pageWidth - margin * 2, pageHeight - y - margin - 40);
      y += 32;

      // Title
      doc.setFontSize(16); setColor(textDark); doc.setFont(undefined, 'bold');
      doc.text('Account Summary', margin + 16, y);
      y += 20; drawDivider(y); y += 24;

      // Profile
      doc.setFontSize(12);
      label('Name:', margin + 16, y); value(profileData.full_name || user.email || '—', margin + 120, y); y += 18;
      label('Email:', margin + 16, y); value(profileData.email || user.email || '—', margin + 120, y); y += 18;
      label('Phone:', margin + 16, y); profileData.phone ? value(profileData.phone, margin + 120, y) : notSpecified(margin + 120, y); y += 18;
      label('Address:', margin + 16, y); profileData.address ? value(profileData.address, margin + 120, y) : notSpecified(margin + 120, y); y += 18;
      label('DOB:', margin + 16, y); profileData.date_of_birth ? value(profileData.date_of_birth, margin + 120, y) : notSpecified(margin + 120, y); y += 26;

      drawDivider(y); y += 24;

      // Notification settings
      doc.setFont(undefined, 'bold'); setColor(textDark); doc.text('Notification Preferences', margin + 16, y); y += 18;
      doc.setFont(undefined, 'normal');
      const notifEntries = Object.entries(notificationsAny);
      if (notifEntries.length === 0) {
        notSpecified(margin + 16, y); y += 18;
      } else {
        for (const [k, v] of notifEntries) {
          label(k.replace(/_/g, ' ') + ':', margin + 16, y);
          value(typeof v === 'boolean' ? (v ? 'Enabled' : 'Disabled') : String(v), margin + 180, y);
          y += 16;
          if (y > pageHeight - margin - 80) { doc.addPage(); y = margin; }
        }
      }

      y += 10; drawDivider(y); y += 24;

      // Counts
      label('Appointments:', margin + 16, y); value(String(appointments.length), margin + 180, y); y += 18;
      label('Contacts:', margin + 16, y); value(String(contacts.length), margin + 180, y); y += 18;
      label('Family members:', margin + 16, y); value(String(family.length), margin + 180, y); y += 26;

      // Footer of first page
      const footerY = pageHeight - margin;
      drawDivider(footerY - 16);
      doc.setFontSize(10); setColor(textMuted); doc.setFont(undefined, 'normal');
      doc.text(`Generated on ${formatFullDateTime(new Date().toISOString())}`, margin, footerY);
      doc.text('https://genbook.ai', pageWidth - margin, footerY, { align: 'right' });

      // Appointment pages - one per appointment, styled like HistoryView
      const renderAppointment = (apt: any) => {
        doc.addPage();
        let yy = margin;
        // Header bar
        doc.setFillColor(softBlue.r, softBlue.g, softBlue.b);
        doc.rect(0, 0, pageWidth, 80, 'F');
        doc.setFontSize(18); setColor(brandBlue); doc.setFont(undefined, 'bold');
        doc.text('GenBook.AI', margin, 50);
        doc.setFontSize(12); setColor(textMuted); doc.setFont(undefined, 'normal');
        doc.text('Appointment Details', pageWidth - margin, 50, { align: 'right' });
        yy = 100;

        // Border
        doc.setDrawColor(borderGray.r, borderGray.g, borderGray.b);
        doc.setLineWidth(1);
        doc.rect(margin, yy, pageWidth - margin * 2, pageHeight - yy - margin - 40);
        yy += 32;

        // Title
        doc.setFontSize(16); setColor(textDark); doc.setFont(undefined, 'bold');
        const title = apt.title || 'Appointment';
        doc.text(title, margin + 16, yy);
        yy += 20; drawDivider(yy); yy += 24;

        // Fields
        doc.setFontSize(12);
        const durationMin = apt.duration || minutesBetween(apt.start_time, apt.end_time) || 30;
        const typeDisplay = apt.appointment_type === 'in-person' ? 'In-person' : apt.appointment_type === 'video' ? 'Virtual (Video)' : apt.appointment_type === 'phone' ? 'Virtual (Phone)' : (apt.appointment_type || '—');
        label('Date & Time:', margin + 16, yy); value(formatFullDateTime(apt.start_time), margin + 120, yy); yy += 18;
        label('Status:', margin + 16, yy); value(apt.status ? (apt.status.charAt(0).toUpperCase() + apt.status.slice(1)) : 'Scheduled', margin + 120, yy); yy += 18;
        label('Type:', margin + 16, yy); value(typeDisplay, margin + 120, yy); yy += 18;
        label('Duration:', margin + 16, yy); value(`${durationMin} min`, margin + 120, yy); yy += 26;
        drawDivider(yy); yy += 24;
        label('Doctor:', margin + 16, yy);
        if (apt.doctor_name && String(apt.doctor_name).trim() !== '') { value(apt.doctor_name, margin + 120, yy); } else { notSpecified(margin + 120, yy); }
        yy += 18;
        if (apt.location && String(apt.location).trim() !== '') { label('Location:', margin + 16, yy); value(apt.location, margin + 120, yy); yy += 18; }
        if (apt.notes && String(apt.notes).trim() !== '') {
          label('Additional Notes:', margin + 16, yy); yy += 16;
          doc.setFont(undefined, 'normal'); setColor(textDark);
          const maxWidth = pageWidth - (margin + 120) - margin;
          const wrapped = doc.splitTextToSize(String(apt.notes), maxWidth);
          doc.text(wrapped, margin + 16, yy);
        }
        // Footer
        const footY = pageHeight - margin;
        drawDivider(footY - 16);
        doc.setFontSize(10); setColor(textMuted); doc.setFont(undefined, 'normal');
        doc.text('Generated by GenBook.AI', margin, footY);
        doc.text('https://genbook.ai', pageWidth - margin, footY, { align: 'right' });
      };

      for (const apt of appointments) {
        renderAppointment(apt);
      }

      doc.save(`genbook_account_export_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error('Error exporting account data:', e);
      alert('Failed to export account data.');
    } finally {
      setSaving(false);
    }
  };

  // Delete account (client-side best-effort: purge user-owned rows and sign out)
  const deleteAccount = async () => {
    try {
      if (!user?.id) return;
      if (!confirm('Are you sure you want to permanently delete your account and all data?')) return;
      if (!confirm('This action cannot be undone. Type OK to confirm.') || prompt('Type DELETE to confirm:') !== 'DELETE') return;

      setSaving(true);
      // Delete user data in application tables
      const tables = ['appointments', 'contacts', 'family_members', 'user_settings', 'user_profiles'];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', user.id);
        if (error) console.warn(`Delete from ${table} warning:`, error.message);
      }
      // Note: Deleting the auth user requires a server-side function with service role.
      await supabase.auth.signOut();
      alert('Your data has been removed. Account sign-out complete. For full account deletion from Auth, configure a secured edge function with the service role.');
      window.location.href = '/';
    } catch (e) {
      console.error('Error deleting account:', e);
      alert('Failed to delete account.');
    } finally {
      setSaving(false);
    }
  };
  const [editingFamily, setEditingFamily] = useState<FamilyMember | null>(null);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        // Map the database fields to the component's expected fields
        const mappedProfile: UserProfile = {
          id: profileData.id,
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone: profileData.phone,
          address: profileData.address,
          date_of_birth: profileData.date_of_birth,
          emergency_contact_name: profileData.emergency_contact_name,
          emergency_contact_phone: profileData.emergency_contact_phone,
          insurance_provider: profileData.insurance_provider,
          insurance_number: profileData.insurance_number,
          medical_conditions: profileData.medical_conditions,
          allergies: profileData.allergies,
          preferred_language: profileData.preferred_language || 'en',
          timezone: profileData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          avatar_url: profileData.avatar_url
        };
        setProfile(mappedProfile);
      } else {
        // Create default profile
        const defaultProfile: Partial<UserProfile> = {
          full_name: user?.user_metadata?.name || '',
          email: user?.email || '',
          preferred_language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        const { data, error } = await supabase
          .from('user_profiles')
          .insert(defaultProfile)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          // Map the database fields to the component's expected fields
          const mappedProfile: UserProfile = {
            id: data.id,
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone,
            address: data.address,
            date_of_birth: data.date_of_birth,
            emergency_contact_name: data.emergency_contact_name,
            emergency_contact_phone: data.emergency_contact_phone,
            insurance_provider: data.insurance_provider,
            insurance_number: data.insurance_number,
            medical_conditions: data.medical_conditions,
            allergies: data.allergies,
            preferred_language: data.preferred_language || 'en',
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            avatar_url: data.avatar_url
          };
          setProfile(mappedProfile);
        }
      }

      // Fetch notification settings
      const { data: notifData, error: notifError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (notifError && notifError.code !== 'PGRST116') {
        throw notifError;
      }

      if (notifData) {
        const prefs = (notifData as any).notification_settings || (notifData as any).notification_preferences;
        if (prefs) setNotifications(prefs);
      } else {
        // Create default settings if they don't exist
        const defaultSettingsV1 = {
          user_id: user?.id,
          notification_settings: notifications
        } as any;
        const defaultSettingsV0 = {
          user_id: user?.id,
          notification_preferences: notifications
        } as any;
        
        // Try new column first, then fallback to legacy
        let insertErr: any = null;
        const { error: insertErrorNew } = await supabase
          .from('user_settings')
          .insert(defaultSettingsV1);
        insertErr = insertErrorNew;
        if (insertErrorNew) {
          const msg = insertErrorNew?.message || '';
          if (msg.includes('notification_settings') || msg.includes('schema cache') || insertErrorNew?.code === '42703') {
            const { error: insertErrorLegacy } = await supabase
              .from('user_settings')
              .insert(defaultSettingsV0);
            insertErr = insertErrorLegacy;
          }
        }
        if (insertErr) throw insertErr;
      }

      // Fetch family members
      const { data: familyData, error: familyError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user?.id);

      if (familyError && familyError.code !== 'PGRST116') throw familyError;
      setFamilyMembers(familyData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      // Map the component's fields to the database fields
      const profileData = {
        user_id: user?.id,
        full_name: profile.full_name || null,
        email: profile.email || null,
        phone: profile.phone || null,
        address: profile.address || null,
        date_of_birth: profile.date_of_birth || null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
        insurance_provider: profile.insurance_provider || null,
        insurance_number: profile.insurance_number || null,
        medical_conditions: profile.medical_conditions || null,
        allergies: profile.allergies || null,
        preferred_language: profile.preferred_language || 'en',
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        avatar_url: profile.avatar_url || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;
      
      // Update auth metadata if name changed
      if (profile.full_name !== user?.user_metadata?.name) {
        await supabase.auth.updateUser({
          data: { name: profile.full_name }
        });
      }

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateNotifications = async () => {
    try {
      if (!user?.id) {
        alert('You must be signed in to update notifications.');
        return;
      }
      setSaving(true);

      // Normalize payload to match DB schema
      const normalized: NotificationSettings = {
        email_appointments: !!notifications.email_appointments,
        email_reminders: !!notifications.email_reminders,
        email_updates: !!notifications.email_updates,
        sms_appointments: !!notifications.sms_appointments,
        sms_reminders: !!notifications.sms_reminders,
        push_appointments: !!notifications.push_appointments,
        push_reminders: !!notifications.push_reminders,
        reminder_timing: Number.isFinite(Number((notifications as any).reminder_timing))
          ? Number((notifications as any).reminder_timing)
          : 60,
      };

      // Try writing to notification_settings; if column missing, fallback to notification_preferences
      let upsertErr: any = null;
      const { error: upsertNew } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            notification_settings: normalized,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'user_id' }
        );
      upsertErr = upsertNew;
      if (upsertNew) {
        const msg = upsertNew?.message || '';
        if (msg.includes('notification_settings') || msg.includes('schema cache') || upsertNew?.code === '42703') {
          const { error: upsertLegacy } = await supabase
            .from('user_settings')
            .upsert(
              {
                user_id: user.id,
                notification_preferences: normalized,
                updated_at: new Date().toISOString(),
              } as any,
              { onConflict: 'user_id' }
            );
          upsertErr = upsertLegacy;
        }
      }

      if (upsertErr) throw upsertErr;
      alert('Notification settings updated successfully!');
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      const msg = error?.message || error?.error_description || error?.error || 'Unknown error';
      alert(`Error updating notification settings: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.new.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });

      if (error) throw error;
      
      setShowPasswordChange(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addFamilyMember = async (member: Omit<FamilyMember, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          ...member,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setFamilyMembers([...familyMembers, data]);
      setShowAddFamily(false);
    } catch (error) {
      console.error('Error adding family member:', error);
      alert('Error adding family member. Please try again.');
    }
  };

  const updateFamilyMember = async (member: FamilyMember) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update(member)
        .eq('id', member.id);

      if (error) throw error;
      
      setFamilyMembers(familyMembers.map(fm => fm.id === member.id ? member : fm));
      setEditingFamily(null);
    } catch (error) {
      console.error('Error updating family member:', error);
      alert('Error updating family member. Please try again.');
    }
  };

  const deleteFamilyMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFamilyMembers(familyMembers.filter(fm => fm.id !== id));
    } catch (error) {
      console.error('Error deleting family member:', error);
      alert('Error removing family member. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-400 border-t-transparent"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'family', label: 'Family', icon: Users },
  ];

  return (
    <div className="flex-1 p-8">
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl border border-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-cyan-500/10">
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-gray-400 mt-1">Manage your account and preferences</p>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-black/20 border-r border-cyan-500/10 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profile?.full_name || ''}
                        onChange={(e) => updateProfileField('full_name', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        onChange={(e) => updateProfileField('email', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profile?.phone || ''}
                        onChange={(e) => updateProfileField('phone', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={profile?.date_of_birth || ''}
                        onChange={(e) => updateProfileField('date_of_birth', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-2">Address</label>
                      <textarea
                        value={profile?.address || ''}
                        onChange={(e) => updateProfileField('address', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50 h-20 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Contact Name</label>
                      <input
                        type="text"
                        value={profile?.emergency_contact_name || ''}
                        onChange={(e) => updateProfileField('emergency_contact_name', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Contact Phone</label>
                      <input
                        type="tel"
                        value={profile?.emergency_contact_phone || ''}
                        onChange={(e) => updateProfileField('emergency_contact_phone', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Insurance Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Insurance Provider</label>
                      <input
                        type="text"
                        value={profile?.insurance_provider || ''}
                        onChange={(e) => updateProfileField('insurance_provider', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Insurance Number</label>
                      <input
                        type="text"
                        value={profile?.insurance_number || ''}
                        onChange={(e) => updateProfileField('insurance_number', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Medical Conditions</label>
                      <textarea
                        value={profile?.medical_conditions || ''}
                        onChange={(e) => updateProfileField('medical_conditions', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50 h-20 resize-none"
                        placeholder="List any ongoing medical conditions..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Allergies</label>
                      <textarea
                        value={profile?.allergies || ''}
                        onChange={(e) => updateProfileField('allergies', e.target.value)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50 h-20 resize-none"
                        placeholder="List any known allergies..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={updateProfile}
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span>Appointment confirmations</span>
                      <input
                        type="checkbox"
                        checked={notifications.email_appointments}
                        onChange={(e) => setNotifications(prev => ({ ...prev, email_appointments: e.target.checked }))}
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Appointment reminders</span>
                      <input
                        type="checkbox"
                        checked={notifications.email_reminders}
                        onChange={(e) => setNotifications(prev => ({ ...prev, email_reminders: e.target.checked }))}
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>System updates and news</span>
                      <input
                        type="checkbox"
                        checked={notifications.email_updates}
                        onChange={(e) => setNotifications(prev => ({ ...prev, email_updates: e.target.checked }))}
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">SMS Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span>Appointment confirmations</span>
                      <input
                        type="checkbox"
                        checked={notifications.sms_appointments}
                        onChange={(e) => setNotifications(prev => ({ ...prev, sms_appointments: e.target.checked }))}
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Appointment reminders</span>
                      <input
                        type="checkbox"
                        checked={notifications.sms_reminders}
                        onChange={(e) => setNotifications(prev => ({ ...prev, sms_reminders: e.target.checked }))}
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span>Appointment confirmations</span>
                      <input
                        type="checkbox"
                        checked={notifications.push_appointments}
                        onChange={(e) => setNotifications(prev => ({ ...prev, push_appointments: e.target.checked }))}
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Appointment reminders</span>
                      <input
                        type="checkbox"
                        checked={notifications.push_reminders}
                        onChange={(e) => setNotifications(prev => ({ ...prev, push_reminders: e.target.checked }))}
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Reminder Timing</h3>
                  <div className="flex items-center space-x-4">
                    <span>Send reminders</span>
                    <select
                      value={notifications.reminder_timing}
                      onChange={(e) => setNotifications(prev => ({ ...prev, reminder_timing: parseInt(e.target.value) }))}
                      className="bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={1440}>1 day</option>
                    </select>
                    <span>before appointments</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={updateNotifications}
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Notifications'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Password</h3>
                  {!showPasswordChange ? (
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                    >
                      Change Password
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.current}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                          className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                        <input
                          type="password"
                          value={passwordData.new}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                          className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirm}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                          className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={changePassword}
                          disabled={saving}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Change Password'}
                        </button>
                        <button
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordData({ current: '', new: '', confirm: '' });
                          }}
                          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                    <div>
                      <p className="font-medium">Enable 2FA</p>
                      <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                    </div>
                    <button onClick={beginEnable2FA} disabled={saving2FA} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50">
                      Enable
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Data Sharing</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <div>
                        <span>Share anonymous usage data</span>
                        <p className="text-sm text-gray-400">Help improve our services</p>
                      </div>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <span>Marketing communications</span>
                        <p className="text-sm text-gray-400">Receive updates about new features</p>
                      </div>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded bg-black/30 border border-cyan-500/20 text-cyan-400 focus:ring-cyan-400/20"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Account Actions</h3>
                  <div className="space-y-3">
                    <button onClick={exportAccountData} className="w-full p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-left transition-colors">
                      <div className="font-medium text-yellow-400">Export Account Data</div>
                      <div className="text-sm text-gray-400">Download all your account information</div>
                    </button>
                    <button onClick={deleteAccount} className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-left transition-colors">
                      <div className="font-medium text-red-400">Delete Account</div>
                      <div className="text-sm text-gray-400">Permanently delete your account and all data</div>
                    </button>
                  </div>
                </div>
                {showTwoFactorModal && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-neutral-900 rounded-xl p-6 w-full max-w-md border border-cyan-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold">Enable Two-Factor Authentication</h4>
                        <button onClick={() => setShowTwoFactorModal(false)} className="text-gray-400 hover:text-white">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      {twoFAUri ? (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-300">Scan this QR code in Google Authenticator, 1Password, or Authy. Then enter the 6-digit code below.</p>
                          <div className="flex justify-center">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFAUri)}`} alt="2FA QR" className="rounded" loading="lazy" decoding="async" />
                          </div>
                          {twoFASecret && (
                            <div className="text-xs text-gray-400 break-all">Secret: {twoFASecret}</div>
                          )}
                          <input
                            type="text"
                            value={twoFAVerificationCode}
                            onChange={(e) => setTwoFAVerificationCode(e.target.value)}
                            placeholder="Enter 6-digit code"
                            className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                          />
                          <button onClick={verify2FAEnrollment} disabled={saving2FA || !twoFAVerificationCode}
                            className="w-full px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50">
                            {saving2FA ? 'Verifying...' : 'Verify & Enable'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Starting enrollment...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'family' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Family Members</h3>
                  <button
                    onClick={() => setShowAddFamily(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Family Member</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="bg-black/20 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold">{member.name}</h4>
                            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">
                              {member.relationship}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                            <div>
                              <p>Date of Birth: {new Date(member.date_of_birth).toLocaleDateString()}</p>
                              {member.phone && <p>Phone: {member.phone}</p>}
                              {member.email && <p>Email: {member.email}</p>}
                            </div>
                            <div>
                              {member.medical_conditions && (
                                <p>Conditions: {member.medical_conditions}</p>
                              )}
                              {member.allergies && (
                                <p>Allergies: {member.allergies}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingFamily(member)}
                            className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFamilyMember(member.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {familyMembers.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No family members added yet</p>
                      <p className="text-sm">Add family members to book appointments for them</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Family Member Modal */}
      {(showAddFamily || editingFamily) && (
        <FamilyMemberModal
          member={editingFamily}
          onClose={() => {
            setShowAddFamily(false);
            setEditingFamily(null);
          }}
          onSave={editingFamily ? updateFamilyMember : addFamilyMember}
        />
      )}
    </div>
  );
};

interface FamilyMemberModalProps {
  member?: FamilyMember | null;
  onClose: () => void;
  onSave: (member: any) => void;
}

const FamilyMemberModal: React.FC<FamilyMemberModalProps> = ({ member, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    relationship: member?.relationship || '',
    date_of_birth: member?.date_of_birth || '',
    phone: member?.phone || '',
    email: member?.email || '',
    medical_conditions: member?.medical_conditions || '',
    allergies: member?.allergies || ''
  });

  const handleSave = () => {
    if (!formData.name || !formData.relationship || !formData.date_of_birth) {
      alert('Please fill in all required fields');
      return;
    }

    if (member) {
      onSave({ ...member, ...formData });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {member ? 'Edit Family Member' : 'Add Family Member'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Relationship *</label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
              required
            >
              <option value="">Select relationship</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Date of Birth *</label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Medical Conditions</label>
            <textarea
              value={formData.medical_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_conditions: e.target.value }))}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50 h-20 resize-none"
              placeholder="Any ongoing medical conditions..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Allergies</label>
            <textarea
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50 h-20 resize-none"
              placeholder="Any known allergies..."
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
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
          >
            {member ? 'Update' : 'Add'} Member
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
