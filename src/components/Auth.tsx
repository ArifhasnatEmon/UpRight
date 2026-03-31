import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Mail, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  onAuth: (user: { name: string, email: string | null }) => void;
}

// Auth component handles user authentication, registration, and password reset
export const Auth: React.FC<AuthProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [forgotStep, setForgotStep] = useState<'email' | 'password' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to clear error messages
  const clearError = () => setError(null);

  // Handle form submission for login and registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Validate password match for registration
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Retrieve accounts from local storage
    const accounts = JSON.parse(localStorage.getItem('upright_accounts') || '[]');
    // Hash password for secure storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(email + ':' + password));
    const passwordHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (isLogin) {
      // Login logic
      const account = accounts.find((a: any) => a.email === email);
      if (!account) {
        setError('Email not found. Please register first.');
        return;
      }
      if (account.passwordHash !== passwordHash) {
        setError('Incorrect password. Please try again.');
        return;
      }
      
      // Store current user and authenticate
      localStorage.setItem('upright_current_user', JSON.stringify({ email: account.email, name: account.name }));
      onAuth({ name: account.name, email: account.email });
    } else {
      // Registration logic
      if (accounts.some((a: any) => a.email === email)) {
        setError('Email already registered. Please sign in.');
        return;
      }

      const newAccount = { email, name, passwordHash };
      accounts.push(newAccount);
      localStorage.setItem('upright_accounts', JSON.stringify(accounts));
      localStorage.setItem('upright_current_user', JSON.stringify({ email, name }));
      onAuth({ name, email });
    }
  };

  // Handle forgot password email verification
  const handleForgotEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const accounts = JSON.parse(localStorage.getItem('upright_accounts') || '[]');
    if (accounts.some((a: any) => a.email === email)) {
      setForgotStep('password');
    } else {
      setError('Email not found.');
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const accounts = JSON.parse(localStorage.getItem('upright_accounts') || '[]');
    const accountIndex = accounts.findIndex((a: any) => a.email === email);
    
    // Hash new password
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(email + ':' + password));
    const passwordHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    accounts[accountIndex].passwordHash = passwordHash;
    localStorage.setItem('upright_accounts', JSON.stringify(accounts));
    
    alert('Password reset successfully! Please sign in.');
    setForgotStep(null);
    setIsLogin(true);
    setPassword('');
    setConfirmPassword('');
  };

  // Determine title based on current auth step
  const getTitle = () => {
    if (forgotStep === 'email') return 'Verify Email';
    if (forgotStep === 'password') return 'Reset Password';
    return isLogin ? 'Welcome Back' : 'Create Account';
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-neutral-50 flex items-start justify-center p-6 overflow-y-auto py-12">
      <div className="max-w-md w-full glass rounded-[2.5rem] p-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold">
            {getTitle()}
          </h2>
          <p className="text-neutral-500">
            {forgotStep === 'email' ? 'Enter your email to verify account.' : 
             forgotStep === 'password' ? 'Enter your new password.' : 
             'Your data is encrypted and stored locally.'}
          </p>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold"
            >
              {error}
            </motion.div>
          )}
        </div>

        <form onSubmit={forgotStep === 'email' ? handleForgotEmailSubmit : (forgotStep === 'password' ? handleResetPassword : handleSubmit)} className="space-y-4">
          {!isLogin && !forgotStep && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => { setName(e.target.value); clearError(); }}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); clearError(); }}
                placeholder="hello@example.com"
                className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>
          {forgotStep !== 'email' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {(!isLogin || forgotStep === 'password') && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); clearError(); }}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl flex items-center justify-center gap-2 group"
          >
            {forgotStep === 'email' ? 'Verify Email' : (forgotStep === 'password' ? 'Reset Password' : (isLogin ? 'Sign In' : 'Create Account'))}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="flex justify-between items-center text-sm">
          <button
            onClick={() => { 
              if (forgotStep) {
                setForgotStep(null);
                setIsLogin(true);
              } else {
                setIsLogin(!isLogin);
              }
              clearError(); 
            }}
            className="font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            {forgotStep ? "Back to Sign In" : (isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in")}
          </button>
          {isLogin && !forgotStep && (
            <button
              onClick={() => { setForgotStep('email'); clearError(); }}
              className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>

        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        <button
          type="button"
          onClick={() => onAuth({ name: 'Guest User', email: null })}
          className="w-full py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-all text-sm"
        >
          Continue as Guest
        </button>

        <div className="pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-50 border border-brand-100">
            <Shield className="w-5 h-5 text-brand-600 shrink-0" />
            <p className="text-[10px] text-brand-800 leading-relaxed">
              <strong>Offline-First:</strong> All AI monitoring runs locally. Login unlocks cloud backup and AI-powered insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
