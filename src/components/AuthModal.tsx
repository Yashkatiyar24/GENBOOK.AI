import { sendEmail } from '../utils/emailService';
import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
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
  organizationName: string;
  email: string;
  password: string;
  confirmPassword: string;
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
    organizationName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) throw error;
      
      setSuccess('Successfully signed in!');
      onAuthSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);
    const email = (signInData.email || '').trim();
    if (!email) {
      setError('Please enter your email above to reset your password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.genbookai.tech/reset-password',
      });
      if (error) throw error;
      setSuccess('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email.');
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

    if (!signUpData.agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call backend to register tenant + admin
      const apiBase = (import.meta as any)?.env?.VITE_BACKEND_URL ? String((import.meta as any).env.VITE_BACKEND_URL).replace(/\/$/, '') : '';
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: signUpData.organizationName,
          adminEmail: signUpData.email,
          adminPassword: signUpData.password,
          adminName: signUpData.name,
        }),
      });

      if (!res.ok) {
        const payload = await (async () => { try { return await res.json(); } catch { return {}; } })();
        const msg = payload?.error || payload?.message || `Failed to register (${res.status})`;
        throw new Error(msg);
      }

      // Optionally send welcome email (non-blocking)
      try { await sendWelcomeEmail(signUpData.email, signUpData.name); } catch {}

      setSuccess('Account created! Please check your email to confirm your address.');
      // Notify parent that signup step is complete (may close modal or change view)
      onAuthSuccess();
      resetForm();
    } catch (error: any) {
      setError(error?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to send welcome email
  const sendWelcomeEmail = async (email: string, name: string) => {
    try {
      // Use our email service to send the welcome email
      const origin = window.location.origin;
      await sendEmail({
        to: email,
        subject: 'Welcome to Genbook AI!',
        template: 'welcome-email',
        context: {
          user_first_name: name || 'there',
          // Ask server to generate Supabase confirmation link
          confirm_url: 'AUTO',
          redirect_to: `${origin}/login`,
          app_origin: origin,
          app_name: import.meta.env.VITE_APP_NAME || 'GENBOOK.AI',
          // Legacy fields still available in the template if needed
          login_url: `${origin}/login`,
          help_center_url: `${origin}/help`,
          privacy_policy_url: `${origin}/privacy`,
          terms_url: `${origin}/terms`
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
    setSignUpData({ name: '', organizationName: '', email: '', password: '', confirmPassword: '', agreeToTerms: false });
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-cyan-500/10 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {mode === 'signin' ? 'Sign In' : 'Join GENBOOK.AI'}
              </h2>
              <p className="text-gray-400 mt-1">
                {mode === 'signin' 
                  ? 'Welcome back! Please sign in to your account.' 
                  : 'Create your account to start booking appointments.'
                }
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          {/* Error and Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-300">
                  <Mail className="w-4 h-4 mr-2 text-cyan-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={signInData.email}
                  onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-300">
                  <Lock className="w-4 h-4 mr-2 text-cyan-400" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signInData.password}
                    onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Switch to Sign Up */}
              <div className="text-center pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onModeChange('signup')}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  >
                    Join Now
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Organization Name */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-300">
                  <User className="w-4 h-4 mr-2 text-cyan-400" />
                  Organization Name
                </label>
                <input
                  type="text"
                  value={signUpData.organizationName}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, organizationName: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder="Your company or team name"
                />
              </div>
              {/* Name */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-300">
                  <User className="w-4 h-4 mr-2 text-cyan-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={signUpData.name}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-300">
                  <Mail className="w-4 h-4 mr-2 text-cyan-400" />
                  Email *
                </label>
                <input
                  type="email"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-300">
                  <Lock className="w-4 h-4 mr-2 text-cyan-400" />
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-300">
                  <Lock className="w-4 h-4 mr-2 text-cyan-400" />
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  checked={signUpData.agreeToTerms}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-cyan-500/30 bg-black/30 text-cyan-400 focus:ring-cyan-400"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-400">
                  I agree to the{' '}
                  <a href="/terms" className="text-cyan-400 hover:underline">Terms of Service</a> and{' '}
                  <a href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</a>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent mr-2"></div>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Switch to Sign In */}
              <div className="text-center pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onModeChange('signin')}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
