import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Clock, User, MapPin, FileText, Bell, Tag, Sparkles, AlertTriangle, CheckCircle, Zap, Brain, Users } from 'lucide-react';
import { 
  createAppointment, 
  Appointment, 
  testDatabaseConnection, 
  supabase,
  checkAppointmentConflicts,
  getPersonalizedTimeSlots,
  predictNoShowProbability,
  ConflictCheck
} from './supabase';

interface NewAppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
  initialPrefill?: {
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    title: string;
    durationMin: number;
    notes?: string;
    priority?: 'high' | 'medium' | 'low';
    provider: string;
  } | null;
  autoSubmit?: boolean;
  user: {
    id?: string;
    email?: string;
    user_metadata?: {
      name?: string;
    };
  } | null;
}

interface FormData {
  clientName: string;
  provider: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: string;
  serviceType: string;
  location: string;
  notes: string;
  attachments: FileList | null;
  reminders: boolean;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  overrideTitle?: string; // if provided, use this as title instead of service/provider
}

const NewAppointmentForm: React.FC<NewAppointmentFormProps> = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  initialPrefill = null, 
  autoSubmit = false,
  user 
}) => {
  const [formData, setFormData] = useState<FormData>({
    clientName: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Client', // Use logged-in user's name, then email username, then fallback
    provider: '',
    appointmentDate: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    appointmentTime: '',
    duration: '30',
    serviceType: '',
    location: '',
    notes: '',
    attachments: null,
    reminders: true,
    tags: [],
    priority: 'medium', // Default priority
    overrideTitle: undefined,
  });

  // Update client name when user changes
  useEffect(() => {
    if (user?.user_metadata?.name || user?.email) {
      setFormData(prev => ({
        ...prev,
        clientName: user.user_metadata?.name || user.email?.split('@')[0] || 'Client'
      }));
    }
  }, [user]);

  const [newTag, setNewTag] = useState('');
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // New enhanced state
  const [conflictCheck, setConflictCheck] = useState<ConflictCheck | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Date[]>([]);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [noShowProbability, setNoShowProbability] = useState<number>(0);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [bufferBefore, setBufferBefore] = useState(15); // minutes
  const [bufferAfter, setBufferAfter] = useState(15); // minutes

  // Mock data for dropdowns
  const providers = [
    'Dr. Sarah Johnson',
    'Dr. Michael Chen',
    'Dr. Emily Rodriguez',
    'Dr. David Kim',
    'Dr. Lisa Thompson'
  ];

  const serviceTypes = [
    'Consultation',
    'Therapy',
    'Follow-up',
    'Initial Assessment',
    'Treatment',
    'Check-up'
  ];

  const availableTimeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const durationOptions = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' }
  ];

  const predefinedTags = ['urgent', 'follow-up', 'new-patient', 'consultation', 'therapy', 'routine'];

  // Test database connection when component mounts
  useEffect(() => {
    const checkDatabase = async () => {
      if (isOpen) {
        setDbConnectionStatus('checking');
        const result = await testDatabaseConnection();
        setDbConnectionStatus(result.success ? 'connected' : 'error');
        
        if (!result.success) {
          setSubmitError(`Database connection failed: ${result.error}. Please ensure the appointments table exists in your Supabase database.`);
        }
      }
    };

    checkDatabase();
  }, [isOpen]);

  // Apply initial prefill when provided
  useEffect(() => {
    if (isOpen && initialPrefill) {
      setFormData(prev => {
        const priorityTag = initialPrefill.priority ? [initialPrefill.priority] : [];
        return {
          ...prev,
          provider: initialPrefill.provider || prev.provider,
          appointmentDate: initialPrefill.date || prev.appointmentDate,
          appointmentTime: initialPrefill.time || prev.appointmentTime,
          duration: String(initialPrefill.durationMin ?? prev.duration),
          notes: initialPrefill.notes ?? prev.notes,
          tags: Array.from(new Set([...(prev.tags || []), ...priorityTag])),
          overrideTitle: initialPrefill.title || prev.overrideTitle,
        };
      });
    }
  }, [isOpen, initialPrefill]);

  // If autoSubmit is requested, validate and submit after conflicts check
  useEffect(() => {
    const runAutoSubmit = async () => {
      if (!isOpen || !autoSubmit || !initialPrefill) return;
      // Wait briefly for state to settle
      await new Promise(r => setTimeout(r, 200));
      await checkForConflicts();
      // If conflicts detected, do not auto-submit; let user review
      if (conflictCheck?.has_conflict) {
        setSubmitError('Conflict detected with the selected time. Please choose another slot.');
        setShowConflictWarning(true);
        return;
      }
      // Submit programmatically
      const fakeEvent = { preventDefault: () => {} } as unknown as React.FormEvent;
      await handleSubmit(fakeEvent);
    };
    runAutoSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoSubmit, initialPrefill]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      attachments: e.target.files
    }));
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Enhanced AI suggestion function
  const handleAISuggestion = async () => {
    if (!formData.appointmentDate) {
      setSubmitError('Please select a date first');
      return;
    }
    
    setIsLoadingAiSuggestions(true);
    setShowAISuggestion(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Parse date in a cross-browser compatible way
        const [year, month, day] = formData.appointmentDate.split('-').map(Number);
        // Create date object (months are 0-indexed in JavaScript Date)
        const targetDate = new Date(year, month - 1, day);
        
        const suggestions = await getPersonalizedTimeSlots(user.id, targetDate, parseInt(formData.duration));
        setAiSuggestions(suggestions);
        
        if (suggestions.length > 0) {
          const firstSuggestion = suggestions[0];
          // Format time in a cross-browser compatible way
          const hours = firstSuggestion.getHours().toString().padStart(2, '0');
          const minutes = firstSuggestion.getMinutes().toString().padStart(2, '0');
          const timeString = `${hours}:${minutes}`;
          handleInputChange('appointmentTime', timeString);
        }
      } else {
        // Fallback for non-authenticated users
        const suggestedTime = availableTimeSlots[Math.floor(Math.random() * availableTimeSlots.length)];
        handleInputChange('appointmentTime', suggestedTime);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      const suggestedTime = availableTimeSlots[Math.floor(Math.random() * availableTimeSlots.length)];
      handleInputChange('appointmentTime', suggestedTime);
    } finally {
      setIsLoadingAiSuggestions(false);
      setTimeout(() => setShowAISuggestion(false), 1000);
    }
  };
  
  // Function to check for conflicts when time/date changes
  const checkForConflicts = async () => {
    if (!formData.appointmentDate || !formData.appointmentTime || !formData.duration) {
      setConflictCheck(null);
      return;
    }
    
    setIsCheckingConflicts(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Parse date and time in a cross-browser compatible way
        const [year, month, day] = formData.appointmentDate.split('-').map(Number);
        const [hours, minutes] = formData.appointmentTime.split(':').map(Number);
        
        // Create date objects (months are 0-indexed in JavaScript Date)
        const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);
        
        const conflicts = await checkAppointmentConflicts(
          startDateTime.toISOString(),
          endDateTime.toISOString(),
          user.id
        );
        
        setConflictCheck(conflicts);
        setShowConflictWarning(conflicts.has_conflict);
        
        // Also predict no-show probability
        const probability = await predictNoShowProbability(user.id, {
          start_time: startDateTime.toISOString()
        });
        setNoShowProbability(probability);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setIsCheckingConflicts(false);
    }
  };
  
  // Effect to check conflicts when time/date changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.appointmentDate && formData.appointmentTime) {
        checkForConflicts();
      }
    }, 500); // Debounce
    
    return () => clearTimeout(timer);
  }, [formData.appointmentDate, formData.appointmentTime, formData.duration]);
  
  // Function to apply a suggested time
  const applySuggestedTime = (time: Date) => {
    // Format time in a cross-browser compatible way
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    handleInputChange('appointmentTime', timeString);
    setShowConflictWarning(false);
  };

  // ...existing code...
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setSubmitError(null);
  setSubmitSuccess(false);

  // Validation: Ensure required fields are filled
  if (
    !formData.provider ||
    !formData.appointmentDate ||
    !formData.appointmentTime ||
    !formData.duration
  ) {
    setSubmitError('Please fill all required fields.');
    setIsSubmitting(false);
    return;
  }

  try {
    // Calculate end time based on start time and duration
    // Parse date and time in a cross-browser compatible way
    const [year, month, day] = formData.appointmentDate.split('-').map(Number);
    const [hours, minutes] = formData.appointmentTime.split(':').map(Number);
    
    // Create date objects (months are 0-indexed in JavaScript Date)
    const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);

    // Create appointment title from provider and service type
    const title = formData.overrideTitle?.trim()
      ? formData.overrideTitle.trim()
      : `${formData.serviceType || 'Appointment'} with ${formData.provider}`;
    
    // Create description from form data
    const descriptionParts = [];
    if (formData.clientName) descriptionParts.push(`Client: ${formData.clientName}`);
    if (formData.location) descriptionParts.push(`Location: ${formData.location}`);
    if (formData.notes) descriptionParts.push(`Notes: ${formData.notes}`);
    if (formData.tags.length > 0) descriptionParts.push(`Tags: ${formData.tags.join(', ')}`);
    if (formData.reminders) descriptionParts.push('Reminders: Enabled');
    
    const description = descriptionParts.join('\n');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare appointment data for Supabase
    // Create a structured description with all details
    const structuredDescription = [
      `Doctor: ${formData.provider}`,
      `Location: ${formData.location || 'Not specified'}`,
      `Service Type: ${formData.serviceType || 'General'}`,
      `Priority: ${formData.priority || 'medium'}`,
      `Duration: ${formData.duration} minutes`,
      ...(description ? ['', 'Notes:', description] : []) // Add notes section if exists
    ].join('\n');
    
    const appointmentData: Appointment = {
      title: formData.overrideTitle || `${formData.serviceType || 'Appointment'} with ${formData.provider}`,
      description: structuredDescription,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status: 'scheduled',
      user_id: user?.id || null, // Include user_id if authenticated
      location: formData.location, // Include location if available
      priority: (formData.priority as 'low' | 'medium' | 'high') || 'medium' // Include priority
    };

    // Save to Supabase
    const result = await createAppointment(appointmentData);
    
    console.log('Appointment created successfully:', result);
    setSubmitSuccess(true);
    
    // Close the form after a brief success message
    setTimeout(() => {
      onClose();
    }, 1500);

  } catch (error) {
    console.error('Error creating appointment:', error);
    setSubmitError(error instanceof Error ? error.message : 'Failed to create appointment. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black/90 backdrop-blur-xl border-b border-cyan-500/10 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  New Appointment
                </h2>
                {dbConnectionStatus === 'checking' && (
                  <div className="flex items-center text-yellow-400 text-sm">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-400 border-t-transparent mr-1"></div>
                    Checking database...
                  </div>
                )}
                {dbConnectionStatus === 'connected' && (
                  <div className="flex items-center text-green-400 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                    Database connected
                  </div>
                )}
                {dbConnectionStatus === 'error' && (
                  <div className="flex items-center text-red-400 text-sm">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-1"></div>
                    Database error
                  </div>
                )}
              </div>
              <p className="text-gray-400 mt-1">
                Schedule a new appointment for {selectedDate ? selectedDate.toLocaleDateString() : 'today'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Name - Pre-filled and Read-only */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <User className="w-4 h-4 mr-2 text-cyan-400" />
                Client Name
              </label>
              <input
                type="text"
                value={formData.clientName}
                readOnly
                className="w-full px-4 py-3 bg-black/30 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* Select Provider */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <User className="w-4 h-4 mr-2 text-cyan-400" />
                Select Provider *
              </label>
              <select
                value={formData.provider}
                onChange={(e) => handleInputChange('provider', e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              >
                <option value="">Choose a provider...</option>
                {providers.map(provider => (
                  <option key={provider} value={provider} className="bg-black">
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            {/* Appointment Date */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <Calendar className="w-4 h-4 mr-2 text-cyan-400" />
                Appointment Date *
              </label>
              <input
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
            </div>

            {/* Appointment Time */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                Appointment Time *
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.appointmentTime}
                  onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                  required
                  className="flex-1 px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                >
                  <option value="">Select time...</option>
                  {availableTimeSlots.map(time => (
                    <option key={time} value={time} className="bg-black">
                      {time}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAISuggestion}
                  disabled={showAISuggestion}
                  className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Sparkles className={`w-4 h-4 ${showAISuggestion ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {showAISuggestion && (
                <p className="text-sm text-purple-400 animate-pulse">AI is finding the best available time...</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                Duration *
              </label>
              <select
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              >
                {durationOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-black">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <FileText className="w-4 h-4 mr-2 text-cyan-400" />
                Service Type
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => handleInputChange('serviceType', e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              >
                <option value="">Select service type...</option>
                {serviceTypes.map(type => (
                  <option key={type} value={type} className="bg-black">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location or Meeting Link */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <MapPin className="w-4 h-4 mr-2 text-cyan-400" />
              Location or Meeting Link
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter physical address or virtual meeting link..."
              className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          {/* Notes or Reason */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <FileText className="w-4 h-4 mr-2 text-cyan-400" />
              Notes or Reason
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Describe the purpose of the appointment..."
              rows={4}
              className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors resize-none"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <Upload className="w-4 h-4 mr-2 text-cyan-400" />
              Attachments
            </label>
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/30"
              />
            </div>
            {formData.attachments && formData.attachments.length > 0 && (
              <div className="text-sm text-gray-400">
                {formData.attachments.length} file(s) selected
              </div>
            )}
          </div>

          {/* Reminders */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <Bell className="w-4 h-4 mr-2 text-cyan-400" />
              Reminders
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.reminders}
                  onChange={(e) => handleInputChange('reminders', e.target.checked)}
                  className="w-4 h-4 text-cyan-400 bg-black/30 border-cyan-500/20 rounded focus:ring-cyan-400 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Enable email/SMS reminders</span>
              </label>
            </div>
          </div>

          {/* Tags or Category */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <Tag className="w-4 h-4 mr-2 text-cyan-400" />
              Tags or Category
            </label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {predefinedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400'
                        : 'bg-black/30 border-gray-600 text-gray-400 hover:border-cyan-500/50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newTag))}
                  placeholder="Add custom tag..."
                  className="flex-1 px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => addTag(newTag)}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/20 rounded-lg transition-colors text-sm"
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 text-xs bg-cyan-500/20 border border-cyan-400 text-cyan-400 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Suggestions Panel */}
          {aiSuggestions.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Brain className="w-5 h-5 text-purple-400 mr-2" />
                <h4 className="font-medium text-purple-400">AI Suggested Times</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {aiSuggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applySuggestedTime(suggestion)}
                    className="px-3 py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors"
                  >
                    {suggestion.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conflict Warning */}
          {showConflictWarning && conflictCheck && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-400 mb-2">Scheduling Conflict Detected</h4>
                  <p className="text-red-300 text-sm mb-3">{conflictCheck.message}</p>
                  
                  {conflictCheck.conflicting_appointments.map((conflict, index) => (
                    <div key={index} className="bg-black/30 rounded p-2 mb-2">
                      <div className="text-sm text-gray-300">
                        <strong>{conflict.title}</strong>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(conflict.start_time).toLocaleString()} - 
                        {new Date(conflict.end_time).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  
                  {conflictCheck.suggested_times.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-red-300 mb-2">Suggested alternative times:</p>
                      <div className="flex flex-wrap gap-2">
                        {conflictCheck.suggested_times.slice(0, 4).map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => applySuggestedTime(suggestion)}
                            className="px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded transition-colors"
                          >
                            {suggestion.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No-Show Risk Assessment */}
          {noShowProbability > 0.3 && formData.appointmentDate && formData.appointmentTime && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-400 mb-2">High No-Show Risk</h4>
                  <p className="text-yellow-300 text-sm">
                    This appointment has a {Math.round(noShowProbability * 100)}% predicted no-show probability.
                    Consider sending additional reminders or confirming closer to the appointment time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buffer Time Settings */}
          <div className="bg-black/20 border border-cyan-500/20 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Clock className="w-5 h-5 text-cyan-400 mr-2" />
              <h4 className="font-medium text-cyan-400">Buffer Times</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Buffer Before (minutes)</label>
                <select
                  value={bufferBefore}
                  onChange={(e) => setBufferBefore(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors text-sm"
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Buffer After (minutes)</label>
                <select
                  value={bufferAfter}
                  onChange={(e) => setBufferAfter(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors text-sm"
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Buffer times help prevent back-to-back scheduling conflicts and allow for preparation/cleanup time.
            </p>
          </div>

          {/* Conflict Check Status */}
          {isCheckingConflicts && (
            <div className="flex items-center justify-center p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent bg-transparent mr-2"></div>
              <span className="text-cyan-400 text-sm">Checking for conflicts...</span>
            </div>
          )}

          {conflictCheck && !conflictCheck.has_conflict && formData.appointmentTime && (
            <div className="flex items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-green-400 text-sm">No conflicts found - time slot is available!</span>
            </div>
          )}

          {/* Error and Success Messages */}
          {submitError && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm font-medium mb-2">Error:</p>
              <p className="text-red-300 text-sm">{submitError}</p>
              {dbConnectionStatus === 'error' && (
                <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-600">
                  <p className="text-gray-300 text-sm font-medium mb-2">Database Setup Required:</p>
                  <p className="text-gray-400 text-sm mb-2">
                    It looks like your Supabase database doesn't have the appointments table set up yet. 
                    Please run the following SQL in your Supabase SQL Editor:
                  </p>
                  <div className="bg-black/50 p-2 rounded text-xs text-gray-300 font-mono border border-gray-700 overflow-x-auto">
                    {`CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- For testing without authentication:
CREATE POLICY "Allow anonymous access" ON appointments FOR ALL USING (true);`}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {submitSuccess && (
            <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">✅ Appointment created successfully!</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-cyan-500/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-black/50 hover:bg-black/70 border border-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || dbConnectionStatus !== 'connected'}
              className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent mr-2"></div>
                  Creating...
                </>
              ) : dbConnectionStatus === 'checking' ? (
                'Checking Database...'
              ) : dbConnectionStatus === 'error' ? (
                'Database Setup Required'
              ) : (
                'Book Appointment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAppointmentForm;
