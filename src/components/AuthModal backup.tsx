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
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      });

      if (error) {
        console.error('Sign in error:', error);
        setError(error.message || 'Failed to sign in. Please check your credentials and try again.');
        return;
      }

      if (!data.user) {
        setError('Authentication failed. Please try again.');
        return;
      }

      setSuccess('Successfully signed in!');
      setTimeout(() => {
        onAuthSuccess();
        onClose();
      }, 1000);

    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (!signUpData.agreeToTerms) {
      setError('Please agree to the Terms & Privacy Policy');
      setIsSubmitting(false);
      return;
    }

    if (signUpData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      // Sign up without email confirmation requirement
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            name: signUpData.name,
            email_confirmed_at: new Date().toISOString() // Auto-confirm email
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        setError(error.message || 'Failed to create account. Please try again.');
        return;
      }

      // If signup successful, send welcome email and auto-login
      if (data.user) {
        try {
          // Send welcome email
          await sendWelcomeEmail(signUpData.email, signUpData.name);
        } catch (emailError) {
          console.warn('Failed to send welcome email:', emailError);
          // Continue with signup even if email fails
        }
        
        // Auto-login the user immediately
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: signUpData.email,
          password: signUpData.password
        });

        if (signInError) {
          console.error('Auto-login error:', signInError);
          // If auto-login fails, show success message and switch to sign-in
          setSuccess('Account created successfully! Please sign in with your credentials.');
          setTimeout(() => {
            onModeChange('signin');
            setSuccess(null);
          }, 3000);
        } else if (!signInData.user) {
          setError('Account created but login failed. Please try signing in manually.');
        } else {
          // Auto-login successful
          setSuccess('Welcome to GENBOOK.AI! Your account has been created successfully.');
          
          // Show welcome email preview in development
          if (process.env.NODE_ENV === 'development') {
            console.log('🎉 Welcome Email Preview: http://localhost:5179/welcome-email-template.html');
            console.log(`📧 Welcome email would be sent to: ${signUpData.email}`);
            console.log(`👤 User: ${signUpData.name || 'New User'}`);
          }
          
          setTimeout(() => {
            onAuthSuccess();
            onClose();
          }, 2500);
        }
      } else {
        setError('Failed to create account. Please try again.');
      }

    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
// Function to send welcome email
const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    // Use our email service to send the welcome email
    await sendEmail({
      to: email,
      subject: 'Welcome to Genbook AI!',
      template: 'welcome-email',
      context: {
        user_first_name: name || 'there',
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

  // Fallback welcome notification (could be replaced with another email service)
  
  const resetForm = () => {
    setSignInData({ email: '', password: '' });
    setSignUpData({ name: '', email: '', password: '', confirmPassword: '', agreeToTerms: false });
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
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
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
                    className="w-full px-4 py-3 bg-black/30 border border-cyan-500/20 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12"
                    placeholder="Create a password (min 6 characters)"
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

              {/* Terms Agreement */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  checked={signUpData.agreeToTerms}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                  className="w-4 h-4 mt-1 text-cyan-400 bg-black/30 border-cyan-500/20 rounded focus:ring-cyan-400 focus:ring-2"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-300">
                  I agree to the{' '}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    Privacy Policy
                  </a>
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
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