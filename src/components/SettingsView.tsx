import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Users, CreditCard, Phone, Mail, MapPin, Calendar, Eye, EyeOff, Plus, Trash2, Edit, Save, X, Upload, Smartphone, Monitor, Volume2 } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
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
        setProfile(profileData);
      } else {
        // Create default profile
        const defaultProfile: Partial<UserProfile> = {
          id: user?.id,
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
        setProfile(data);
      }

      // Fetch notification settings
      const { data: notifData, error: notifError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (notifData) {
        setNotifications(notifData.notification_settings || notifications);
      }

      // Fetch family members
      const { data: familyData, error: familyError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user?.id);

      if (familyError) throw familyError;
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
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          ...profile,
          user_id: user?.id,
          updated_at: new Date().toISOString()
        });

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
      setSaving(true);
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          notification_settings: notifications,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Notification settings updated successfully!');
    } catch (error) {
      console.error('Error updating notifications:', error);
      alert('Error updating notification settings. Please try again.');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
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
                        onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profile?.phone || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={profile?.date_of_birth || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, date_of_birth: e.target.value } : null)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-2">Address</label>
                      <textarea
                        value={profile?.address || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, address: e.target.value } : null)}
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
                        onChange={(e) => setProfile(prev => prev ? { ...prev, emergency_contact_name: e.target.value } : null)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Contact Phone</label>
                      <input
                        type="tel"
                        value={profile?.emergency_contact_phone || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, emergency_contact_phone: e.target.value } : null)}
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
                        onChange={(e) => setProfile(prev => prev ? { ...prev, insurance_provider: e.target.value } : null)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Insurance Number</label>
                      <input
                        type="text"
                        value={profile?.insurance_number || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, insurance_number: e.target.value } : null)}
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
                        onChange={(e) => setProfile(prev => prev ? { ...prev, medical_conditions: e.target.value } : null)}
                        className="w-full bg-black/30 border border-cyan-500/20 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400/50 h-20 resize-none"
                        placeholder="List any ongoing medical conditions..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Allergies</label>
                      <textarea
                        value={profile?.allergies || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, allergies: e.target.value } : null)}
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
                    <button className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
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
                    <button className="w-full p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-left transition-colors">
                      <div className="font-medium text-yellow-400">Export Account Data</div>
                      <div className="text-sm text-gray-400">Download all your account information</div>
                    </button>
                    <button className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-left transition-colors">
                      <div className="font-medium text-red-400">Delete Account</div>
                      <div className="text-sm text-gray-400">Permanently delete your account and all data</div>
                    </button>
                  </div>
                </div>
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
