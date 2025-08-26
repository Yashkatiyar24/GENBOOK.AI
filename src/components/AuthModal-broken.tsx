import { sendEmail } from '../utils/emailService';
import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Building } from 'lucide-react';
import { supabase } from '../supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
  onAuthSuccess: () => void;
}

interface SignInFormData {
  email: string;
  password: string;
}

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  agreeToTerms: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  mode, 
  onModeChange, 
  onAuthSuccess 
}) => {
  const [signInData, setSignInData] = useState<SignInFormData>({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = useState<SignUpFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    agreeToTerms: false
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) throw error;
      
      // Verify user has a tenant
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', data.user?.id)
        .single();

      if (userError) throw userError;
      if (!userData?.tenant_id) {
        throw new Error('User is not associated with any organization. Please contact support.');
      }
      
      setSuccess('Successfully signed in!');
      onAuthSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!signUpData.organizationName) {
      setError('Organization name is required');
      return;
    }

    if (!signUpData.agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the user in Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.name,
            organization_name: signUpData.organizationName,
            role: 'admin'
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // 2. Create tenant record
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{ 
          name: signUpData.organizationName,
          owner_id: authData.user.id,
          subscription_tier: 'free'
        }])
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 3. Update user with tenant_id and role
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          tenant_id: tenantData.id,
          role: 'admin'
        })
        .eq('id', authData.user.id);

      if (userError) throw userError;

      // 4. Send welcome email
      await sendWelcomeEmail(signUpData.email, signUpData.name, signUpData.organizationName);
      
      setSuccess('Organization and admin account created successfully! Please check your email to verify your account.');
      onModeChange('signin');
      resetForm();
    } catch (error: any) {
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to send welcome email
  const sendWelcomeEmail = async (email: string, name: string, organizationName: string) => {
    try {
      // Use our email service to send the welcome email
      await sendEmail({
        to: email,
        subject: `Welcome to ${organizationName}'s Genbook AI!`,
        template: 'welcome-email',
        context: {
          user_first_name: name || 'there',
          organization_name: organizationName,
          login_url: `${window.location.origin}/login`,
          help_center_url: `${window.location.origin}/help`,
          privacy_policy_url: `${window.location.origin}/privacy`,
          terms_url: `${window.location.origin}/terms`
        }
      });
      console.log('Welcome email sent successfully');
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Even if email fails, we don't want to block the signup process
      // Just log the error and continue
    }
  };

  const resetForm = () => {
    setSignInData({ email: '', password: '' });
    setSignUpData({ 
      name: '', 
      email: '', 
      password: '', 
      confirmPassword: '', 
      organizationName: '',
      agreeToTerms: false 
    });
    setError(null);
    setSuccess(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // Rest of your component JSX...
  // [Previous JSX content remains the same]
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg text-sm">
              {success}
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="you@example.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </div>

              <div className="text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signup')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Sign up
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="John Doe"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({...signUpData, name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Organization Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Your Company Name"
                    value={signUpData.organizationName}
                    onChange={(e) => setSignUpData({...signUpData, organizationName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="you@example.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="••••••••"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-600"
                    checked={signUpData.agreeToTerms}
                    onChange={(e) => setSignUpData({...signUpData, agreeToTerms: e.target.checked})}
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-gray-300">
                    I agree to the{' '}
                    <a href="/terms" className="text-cyan-400 hover:text-cyan-300">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-cyan-400 hover:text-cyan-300">
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
              </div>

              <div className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signin')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
