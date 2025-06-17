import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  Shield, 
  Key, 
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCcw,
  Sparkles,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface SecuritySettingsFormProps {
  user: any;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
  label: string;
}

export function SecuritySettingsForm({ user }: SecuritySettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });

  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score++;
    else feedback.push('At least 8 characters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('One uppercase letter');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('One lowercase letter');

    if (/\d/.test(password)) score++;
    else feedback.push('One number');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('One special character');

    const strengthMap = {
      0: { color: 'text-red-400', label: 'Very Weak' },
      1: { color: 'text-red-400', label: 'Weak' },
      2: { color: 'text-orange-400', label: 'Fair' },
      3: { color: 'text-yellow-400', label: 'Good' },
      4: { color: 'text-green-400', label: 'Strong' },
      5: { color: 'text-emerald-400', label: 'Very Strong' }
    };

    return {
      score,
      feedback,
      ...strengthMap[score as keyof typeof strengthMap]
    };
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const strength = checkPasswordStrength(passwordForm.newPassword);
    if (strength.score < 3) {
      toast.error('Password is too weak. Please choose a stronger password.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      });

      if (error) throw error;

      toast.success('Email update initiated. Please check your new email for verification.');
      setEmailForm({ newEmail: '', password: '' });
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success('Password reset email sent. Please check your inbox.');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const passwordStrength = checkPasswordStrength(passwordForm.newPassword);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center pb-6 border-b border-gray-700/50">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full border border-emerald-500/30">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Security Settings</h2>
        </div>
        <p className="text-gray-400 max-w-md mx-auto">
          Protect your account with strong authentication and keep your credentials secure.
        </p>
      </motion.div>

      {/* Current Account Info */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-500/20 rounded-full">
            <Zap className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Account Status</h3>
            <p className="text-gray-400 text-sm">Your current security information</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800/40 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Email Verified</span>
            </div>
            <p className="text-white font-mono text-sm">{user?.email}</p>
          </div>
          <div className="bg-gray-800/40 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Account Active</span>
            </div>
            <p className="text-gray-400 text-sm">Since {new Date(user?.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </motion.div>

      {/* Password Change */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h3 className="text-xl font-semibold text-white">Change Password</h3>
        </div>
        
        <form onSubmit={handlePasswordChange} className="space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Current Password</label>
            <div className="relative group">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 pr-12"
                placeholder="Enter your current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">New Password</label>
            <div className="relative group">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 pr-12"
                placeholder="Enter your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {passwordForm.newPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">Password Strength</span>
                  <span className={`text-sm font-semibold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        i < passwordStrength.score 
                          ? passwordStrength.score <= 2 ? 'bg-red-400' 
                            : passwordStrength.score <= 3 ? 'bg-orange-400'
                            : passwordStrength.score <= 4 ? 'bg-yellow-400'
                            : 'bg-green-400'
                          : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                
                {passwordStrength.feedback.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 mb-2">Missing requirements:</p>
                    {passwordStrength.feedback.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                        <XCircle size={12} className="text-red-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Confirm New Password</label>
            <div className="relative group">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`w-full px-4 py-4 bg-gray-800/60 border rounded-xl text-white placeholder-gray-400 focus:outline-none transition-all duration-200 pr-12 ${
                  passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                    ? 'border-red-400/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
                    : 'border-gray-600/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'
                }`}
                placeholder="Confirm your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                Passwords do not match
              </div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || passwordForm.newPassword !== passwordForm.confirmPassword}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Lock size={20} />
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Updating Password...
              </div>
            ) : (
              'Update Password'
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* Email Change */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-5 w-5 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Change Email</h3>
        </div>
        
        <form onSubmit={handleEmailChange} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">New Email Address</label>
            <input
              type="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
              className="w-full px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
              placeholder="Enter your new email address"
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={emailLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Mail size={20} />
            {emailLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Updating Email...
              </div>
            ) : (
              'Update Email'
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* Password Reset */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-500/20 rounded-full">
            <RefreshCcw className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">Password Reset</h3>
            <p className="text-gray-400 text-sm mb-4">
              Send a password reset email to your registered address. This is useful if you've forgotten your current password.
            </p>
            <motion.button
              onClick={handlePasswordReset}
              disabled={resetLoading}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCcw size={18} />
              {resetLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending Reset Email...
                </div>
              ) : (
                'Send Reset Email'
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 