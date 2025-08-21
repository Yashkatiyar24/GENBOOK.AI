import React, { useState, useEffect } from 'react';
import { Building, Palette, Upload, Save, Eye, Bot, Globe, Lock, KeyRound, Shield, BarChart3, CreditCard } from 'lucide-react';
import { supabase } from '../supabase';

interface OrganizationSettingsProps {
  user: any;
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  booking_page_title: string;
  booking_page_description: string;
  custom_css: string;
  timezone: string;
}

interface BotSettings {
  id: string;
  organization_id: string;
  bot_name: string;
  welcome_message: string;
  fallback_message: string;
  max_messages_per_month: number;
  enabled: boolean;
}

const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ user }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [botSettings, setBotSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [userRole, setUserRole] = useState('member');
  const [activeSection, setActiveSection] = useState<'none' | 'billing' | 'org' | 'integrations' | 'security' | 'analytics'>('none');

  useEffect(() => {
    if (user) {
      fetchOrganizationData();
    }
  }, [user]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);

      // Get user's organization and role
      const { data: userOrgData, error: userOrgError } = await supabase.rpc('get_user_organization');
      if (userOrgError) throw userOrgError;
      
      if (userOrgData && userOrgData.length > 0) {
        setUserRole(userOrgData[0].role);
        const orgId = userOrgData[0].organization_id;

        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();

        if (orgError) throw orgError;
        setOrganization(orgData);

        // Get bot settings
        const { data: botData, error: botError } = await supabase
          .from('bot_settings')
          .select('*')
          .eq('organization_id', orgId)
          .single();

        if (!botError && botData) {
          setBotSettings(botData);
        } else {
          // Create default bot settings
          const defaultBotSettings = {
            organization_id: orgId,
            bot_name: 'AI Assistant',
            welcome_message: 'Hello! I can help you book appointments and answer questions about our services.',
            fallback_message: 'I apologize, but I don\'t understand that request. Please try rephrasing or contact our support team.',
            max_messages_per_month: 100,
            enabled: true,
          };
          setBotSettings(defaultBotSettings as BotSettings);
        }
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organization) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          domain: organization.domain,
          logo_url: organization.logo_url,
          primary_color: organization.primary_color,
          secondary_color: organization.secondary_color,
          booking_page_title: organization.booking_page_title,
          booking_page_description: organization.booking_page_description,
          custom_css: organization.custom_css,
          timezone: organization.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      alert('Organization settings saved successfully!');
    } catch (error) {
      console.error('Error saving organization:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBotSettings = async () => {
    if (!botSettings) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('bot_settings')
        .upsert({
          ...botSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id'
        });

      if (error) throw error;

      alert('Bot settings saved successfully!');
    } catch (error) {
      console.error('Error saving bot settings:', error);
      alert('Error saving bot settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization) return;

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName);

      setOrganization({
        ...organization,
        logo_url: data.publicUrl,
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo. Please try again.');
    }
  };

  // Role helpers
  const isOwner = userRole?.toLowerCase() === 'owner';
  const isViewer = userRole?.toLowerCase() === 'viewer';
  const canEdit = isOwner; // per requirement, only Owner has full CRUD in Organization tab

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent"></div>
      </div>
    );
  }

  // Viewers can access Organization but everything is read-only and certain sections are locked

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Organization Settings</h1>
        <p className="text-gray-400">Configure your organization's branding and preferences</p>
        <div className="mt-2 text-sm">
          <span className="text-gray-400">Your role: </span>
          <span className="text-cyan-400 font-medium capitalize">{userRole}</span>
        </div>
      </div>

      {/* Organization Overview Cards (match dashboard-style UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Billing */}
        <div className={`bg-black/20 backdrop-blur-xl rounded-2xl p-4 border ${isViewer ? 'border-red-500/20' : 'border-cyan-500/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <h3 className="font-medium">Billing</h3>
            </div>
            {isViewer && <Lock className="w-4 h-4 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-400 mt-2">Invoices, Payment Methods, Plan</p>
          <div className="mt-3 text-right">
            <button
              onClick={() => setActiveSection('billing')}
              className={`px-3 py-1.5 text-sm rounded-md ${isViewer ? 'bg-gray-700/40 text-gray-300 hover:bg-gray-700/50' : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'} transition`}
            >
              Manage
            </button>
          </div>
          {isViewer && <p className="mt-3 text-xs text-gray-500">Read‑only for your role.</p>}
        </div>
        {/* Org-wide Settings */}
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-4 border border-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-cyan-400" />
              <h3 className="font-medium">Organization-wide Settings</h3>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">Timezones, Working Hours, Notifications</p>
          <div className="mt-3 text-right">
            <button
              onClick={() => setActiveSection('org')}
              className="px-3 py-1.5 text-sm rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition"
            >
              Open
            </button>
          </div>
        </div>

        {/* API & Integrations */}
        <div className={`bg-black/20 backdrop-blur-xl rounded-2xl p-4 border ${isViewer ? 'border-red-500/20' : 'border-cyan-500/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <h3 className="font-medium">API & Integrations</h3>
            </div>
            {isViewer && (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-400 mt-2">API Keys, Webhooks, Third‑party Apps</p>
          {!isViewer && (
            <div className="mt-3 text-right">
              <button className="px-3 py-1.5 text-sm rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition">Manage</button>
            </div>
          )}
          {isViewer && (
            <p className="mt-3 text-xs text-gray-500">You do not have permission to manage this section.</p>
          )}
        </div>

        {/* Advanced Security */}
        <div className={`bg-black/20 backdrop-blur-xl rounded-2xl p-4 border ${isViewer ? 'border-red-500/20' : 'border-cyan-500/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h3 className="font-medium">Advanced Security</h3>
            </div>
            {isViewer && <Lock className="w-4 h-4 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-400 mt-2">MFA, IP Restrictions, Session Policies</p>
          <div className="mt-3 text-right">
            <button
              onClick={() => setActiveSection('security')}
              className={`px-3 py-1.5 text-sm rounded-md ${isViewer ? 'bg-gray-700/40 text-gray-300 hover:bg-gray-700/50' : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'} transition`}
            >
              Configure
            </button>
          </div>
          {isViewer && (<p className="mt-3 text-xs text-gray-500">Read‑only for your role.</p>)}
        </div>

        {/* Usage & Analytics */}
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-4 border border-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="font-medium">Usage & Analytics</h3>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">Organization‑wide Reports</p>
          <div className="mt-3 text-right">
            <button
              onClick={() => setActiveSection('analytics')}
              className="px-3 py-1.5 text-sm rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition"
            >
              Open
            </button>
          </div>
          {isViewer && (<p className="mt-3 text-xs text-gray-500">Overview only. Exports/filters disabled for your role.</p>)}
        </div>
      </div>

      {/* Section Panels (open from overview cards) */}
      {activeSection !== 'none' && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
          {activeSection === 'billing' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Billing</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h3 className="text-white font-medium mb-3">Invoices</h3>
                  <div className="rounded-lg border border-gray-600/20 divide-y divide-gray-600/10">
                    <div className="p-3 flex items-center justify-between text-sm text-gray-300"><span>#INV-0001</span><span>$199</span><span>Aug 01, 2025</span><button disabled className="px-2 py-1 rounded bg-gray-700/40 text-gray-300">Download</button></div>
                    <div className="p-3 flex items-center justify-between text-sm text-gray-300"><span>#INV-0000</span><span>$199</span><span>Jul 01, 2025</span><button disabled className="px-2 py-1 rounded bg-gray-700/40 text-gray-300">Download</button></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-3">Plan</h3>
                  <div className="p-4 rounded-lg border border-gray-600/20">
                    <div className="text-gray-300">Current Plan: <span className="text-white font-medium">Pro</span></div>
                    <div className="text-gray-400 text-sm mt-1">Seats: 10 • Renewal: Sep 01, 2025</div>
                    <button disabled={!canEdit} className={`mt-3 px-3 py-1.5 text-sm rounded-md ${canEdit ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-gray-700/40 text-gray-300 cursor-not-allowed'}`}>Change Plan</button>
                  </div>
                  <h3 className="text-white font-medium mt-6 mb-3">Payment Methods</h3>
                  <div className="p-4 rounded-lg border border-gray-600/20">
                    <div className="text-gray-300 text-sm">Visa •••• 4242 — Default</div>
                    <div className="mt-3 flex gap-2">
                      <button disabled={!canEdit} className={`px-3 py-1.5 text-sm rounded-md ${canEdit ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-gray-700/40 text-gray-300 cursor-not-allowed'}`}>Add</button>
                      <button disabled={!canEdit} className={`px-3 py-1.5 text-sm rounded-md ${canEdit ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-gray-700/40 text-gray-300 cursor-not-allowed'}`}>Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'org' && organization && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Organization-wide Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                  <select
                    value={organization.timezone || 'UTC'}
                    onChange={(e) => setOrganization({ ...organization, timezone: e.target.value })}
                    disabled={!canEdit}
                    className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Working Hours</label>
                  <input disabled={!canEdit} placeholder="e.g., Mon–Fri 9:00–17:00" className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notification Preferences</label>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-gray-300 text-sm">
                      <input type="checkbox" disabled={!canEdit} className="accent-cyan-400" /> Email
                    </label>
                    <label className="inline-flex items-center gap-2 text-gray-300 text-sm">
                      <input type="checkbox" disabled={!canEdit} className="accent-cyan-400" /> SMS
                    </label>
                    <label className="inline-flex items-center gap-2 text-gray-300 text-sm">
                      <input type="checkbox" disabled={!canEdit} className="accent-cyan-400" /> In‑app
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button disabled={!canEdit || saving} onClick={handleSaveOrganization} className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">API & Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-medium mb-2">API Keys</h3>
                  <div className="rounded-lg border border-gray-600/20 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>Public API Key</span>
                      <div className="flex gap-2">
                        <button disabled={!canEdit} className={`px-2 py-1 rounded ${canEdit ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-700/40 text-gray-300'}`}>Copy</button>
                        <button disabled={!canEdit} className={`px-2 py-1 rounded ${canEdit ? 'bg-red-500/20 text-red-300' : 'bg-gray-700/40 text-gray-300'}`}>Revoke</button>
                      </div>
                    </div>
                    <button disabled={!canEdit} className={`px-3 py-1.5 text-sm rounded-md ${canEdit ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-700/40 text-gray-300'}`}>Create New Key</button>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">Webhooks</h3>
                  <div className="rounded-lg border border-gray-600/20 p-4 space-y-3">
                    <input disabled={!canEdit} placeholder="Webhook URL" className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`} />
                    <button disabled={!canEdit} className={`px-3 py-1.5 text-sm rounded-md ${canEdit ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-700/40 text-gray-300'}`}>Add Webhook</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Advanced Security</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Require MFA</div>
                    <div className="text-gray-400 text-sm">All members must enable multi‑factor authentication</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" disabled={!canEdit} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">IP Restrictions</label>
                  <textarea disabled={!canEdit} placeholder="Allow only these CIDR ranges..." rows={3} className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (minutes)</label>
                  <input type="number" disabled={!canEdit} placeholder="30" className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`} />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button disabled={!canEdit} className="px-6 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 disabled:opacity-50">Save Security Settings</button>
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Usage & Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-gray-600/20">
                  <div className="text-sm text-gray-400">Active Users</div>
                  <div className="text-2xl font-bold text-white mt-1">128</div>
                </div>
                <div className="p-4 rounded-lg border border-gray-600/20">
                  <div className="text-sm text-gray-400">Messages This Month</div>
                  <div className="text-2xl font-bold text-white mt-1">4,209</div>
                </div>
                <div className="p-4 rounded-lg border border-gray-600/20">
                  <div className="text-sm text-gray-400">Bookings</div>
                  <div className="text-2xl font-bold text-white mt-1">312</div>
                </div>
              </div>
              <div className="mt-6 text-sm text-gray-400">Charts and export options can be added here. Exports disabled for Viewers.</div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-black/20 backdrop-blur-xl rounded-xl p-1 border border-cyan-500/10">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'general'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black'
              : 'text-gray-400 hover:text-white hover:bg-black/30'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>General</span>
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'branding'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black'
              : 'text-gray-400 hover:text-white hover:bg-black/30'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Branding</span>
        </button>
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'booking'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black'
              : 'text-gray-400 hover:text-white hover:bg-black/30'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Booking Page</span>
        </button>
        <button
          onClick={() => setActiveTab('chatbot')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'chatbot'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black'
              : 'text-gray-400 hover:text-white hover:bg-black/30'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Chatbot</span>
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && organization && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
          <h2 className="text-xl font-semibold text-white mb-6">General Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
              <input
                type="text"
                value={organization.name}
                onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Domain</label>
              <input
                type="text"
                value={organization.domain || ''}
                onChange={(e) => setOrganization({ ...organization, domain: e.target.value })}
                placeholder="your-company.com"
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
              <select
                value={organization.timezone || 'UTC'}
                onChange={(e) => setOrganization({ ...organization, timezone: e.target.value })}
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveOrganization}
              disabled={saving || !canEdit}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Branding Settings */}
      {activeTab === 'branding' && organization && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
          <h2 className="text-xl font-semibold text-white mb-6">Branding & Colors</h2>
          
          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
              <div className="flex items-center space-x-4">
                {organization.logo_url && (
                  <img
                    src={organization.logo_url}
                    alt="Organization Logo"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-600/20"
                  />
                )}
                <label className={`flex items-center space-x-2 px-4 py-2 ${canEdit ? 'bg-black/30 hover:bg-black/50 hover:border-cyan-400/50 cursor-pointer' : 'bg-black/20 opacity-60 cursor-not-allowed'} border border-gray-600/20 rounded-lg transition-all duration-300`}>
                  <Upload className="w-4 h-4" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={!canEdit}
                  />
                </label>
              </div>
            </div>

            {/* Color Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={organization.primary_color || '#06b6d4'}
                    onChange={(e) => setOrganization({ ...organization, primary_color: e.target.value })}
                    disabled={!canEdit}
                    className={`w-12 h-12 rounded-lg border border-gray-600/20 bg-transparent ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  />
                  <input
                    type="text"
                    value={organization.primary_color || '#06b6d4'}
                    onChange={(e) => setOrganization({ ...organization, primary_color: e.target.value })}
                    disabled={!canEdit}
                    className={`flex-1 p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={organization.secondary_color || '#3b82f6'}
                    onChange={(e) => setOrganization({ ...organization, secondary_color: e.target.value })}
                    disabled={!canEdit}
                    className={`w-12 h-12 rounded-lg border border-gray-600/20 bg-transparent ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  />
                  <input
                    type="text"
                    value={organization.secondary_color || '#3b82f6'}
                    onChange={(e) => setOrganization({ ...organization, secondary_color: e.target.value })}
                    disabled={!canEdit}
                    className={`flex-1 p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Custom CSS */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Custom CSS</label>
              <textarea
                value={organization.custom_css || ''}
                onChange={(e) => setOrganization({ ...organization, custom_css: e.target.value })}
                placeholder="/* Add your custom CSS here */"
                rows={8}
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none font-mono text-sm ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveOrganization}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Booking Page Settings */}
      {activeTab === 'booking' && organization && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
          <h2 className="text-xl font-semibold text-white mb-6">Booking Page Configuration</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Page Title</label>
              <input
                type="text"
                value={organization.booking_page_title || ''}
                onChange={(e) => setOrganization({ ...organization, booking_page_title: e.target.value })}
                placeholder="Book an Appointment"
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Page Description</label>
              <textarea
                value={organization.booking_page_description || ''}
                onChange={(e) => setOrganization({ ...organization, booking_page_description: e.target.value })}
                placeholder="Schedule your appointment with us. Choose a convenient time that works for you."
                rows={4}
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-400 font-medium">Preview</span>
              </div>
              <div className="bg-white rounded-lg p-6 text-black">
                {organization.logo_url && (
                  <img
                    src={organization.logo_url}
                    alt="Logo"
                    className="h-12 mb-4"
                  />
                )}
                <h1 className="text-2xl font-bold mb-2" style={{ color: organization.primary_color }}>
                  {organization.booking_page_title || 'Book an Appointment'}
                </h1>
                <p className="text-gray-600 mb-4">
                  {organization.booking_page_description || 'Schedule your appointment with us. Choose a convenient time that works for you.'}
                </p>
                <button
                  className="px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: organization.primary_color }}
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveOrganization}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Chatbot Settings */}
      {activeTab === 'chatbot' && botSettings && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
          <h2 className="text-xl font-semibold text-white mb-6">Chatbot Configuration</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Enable Chatbot</h3>
                <p className="text-sm text-gray-400">Allow visitors to interact with your AI assistant</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={botSettings.enabled}
                  onChange={(e) => setBotSettings({ ...botSettings, enabled: e.target.checked })}
                  disabled={!canEdit}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bot Name</label>
                <input
                  type="text"
                  value={botSettings.bot_name}
                  onChange={(e) => setBotSettings({ ...botSettings, bot_name: e.target.value })}
                  disabled={!canEdit}
                  className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Messages/Month</label>
                <input
                  type="number"
                  value={botSettings.max_messages_per_month}
                  onChange={(e) => setBotSettings({ ...botSettings, max_messages_per_month: parseInt(e.target.value) })}
                  disabled={!canEdit}
                  className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Welcome Message</label>
              <textarea
                value={botSettings.welcome_message}
                onChange={(e) => setBotSettings({ ...botSettings, welcome_message: e.target.value })}
                rows={3}
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fallback Message</label>
              <textarea
                value={botSettings.fallback_message}
                onChange={(e) => setBotSettings({ ...botSettings, fallback_message: e.target.value })}
                rows={3}
                disabled={!canEdit}
                className={`w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveBotSettings}
              disabled={saving || !canEdit}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSettings;
