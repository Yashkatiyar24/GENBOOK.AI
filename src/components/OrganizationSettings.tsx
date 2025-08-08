import React, { useState, useEffect } from 'react';
import { Building, Palette, Upload, Save, Eye, Bot, Globe } from 'lucide-react';
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

  const canManageSettings = userRole === 'owner' || userRole === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!canManageSettings) {
    return (
      <div className="text-center py-16">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Access Restricted</h2>
        <p className="text-gray-400">You need admin or owner permissions to access organization settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Organization Settings</h1>
        <p className="text-gray-400">Configure your organization's branding and preferences</p>
      </div>

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
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Domain</label>
              <input
                type="text"
                value={organization.domain || ''}
                onChange={(e) => setOrganization({ ...organization, domain: e.target.value })}
                placeholder="your-company.com"
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
              <select
                value={organization.timezone || 'UTC'}
                onChange={(e) => setOrganization({ ...organization, timezone: e.target.value })}
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white focus:border-cyan-400/50 focus:outline-none"
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
              disabled={saving}
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
                <label className="flex items-center space-x-2 px-4 py-2 bg-black/30 hover:bg-black/50 border border-gray-600/20 hover:border-cyan-400/50 rounded-lg cursor-pointer transition-all duration-300">
                  <Upload className="w-4 h-4" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
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
                    className="w-12 h-12 rounded-lg border border-gray-600/20 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={organization.primary_color || '#06b6d4'}
                    onChange={(e) => setOrganization({ ...organization, primary_color: e.target.value })}
                    className="flex-1 p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
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
                    className="w-12 h-12 rounded-lg border border-gray-600/20 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={organization.secondary_color || '#3b82f6'}
                    onChange={(e) => setOrganization({ ...organization, secondary_color: e.target.value })}
                    className="flex-1 p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
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
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none font-mono text-sm"
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
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Page Description</label>
              <textarea
                value={organization.booking_page_description || ''}
                onChange={(e) => setOrganization({ ...organization, booking_page_description: e.target.value })}
                placeholder="Schedule your appointment with us. Choose a convenient time that works for you."
                rows={4}
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
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
                  className="sr-only peer"
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
                  className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Messages/Month</label>
                <input
                  type="number"
                  value={botSettings.max_messages_per_month}
                  onChange={(e) => setBotSettings({ ...botSettings, max_messages_per_month: parseInt(e.target.value) })}
                  className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Welcome Message</label>
              <textarea
                value={botSettings.welcome_message}
                onChange={(e) => setBotSettings({ ...botSettings, welcome_message: e.target.value })}
                rows={3}
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fallback Message</label>
              <textarea
                value={botSettings.fallback_message}
                onChange={(e) => setBotSettings({ ...botSettings, fallback_message: e.target.value })}
                rows={3}
                className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveBotSettings}
              disabled={saving}
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
