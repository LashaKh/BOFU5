import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Building, Camera, Sparkles, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProfileApi } from '../../lib/profileApi';
import { useProfileContext } from '../../contexts/ProfileContext';
import type { CompanyProfile } from '../../types';

interface ProfileEditFormProps {
  user: any;
  onUpdate: () => void;
}

export function ProfileEditForm({ user, onUpdate }: ProfileEditFormProps) {
  const { currentProfile, refreshProfiles } = useProfileContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    profile_name: '',
    profile_role: '',
    profile_avatar_url: '',
    bio: '',
    preferences: {}
  });

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        profile_name: currentProfile.profile_name || '',
        profile_role: currentProfile.profile_role || '',
        profile_avatar_url: currentProfile.profile_avatar_url || '',
        bio: '',
        preferences: {}
      });
    }
  }, [currentProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    setIsLoading(true);
    try {
      const response = await ProfileApi.updateProfile(currentProfile.id, {
        profile_name: formData.profile_name,
        profile_avatar_url: formData.profile_avatar_url
      });

      if (response.success) {
        toast.success('Profile updated successfully');
        await refreshProfiles();
        onUpdate();
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const avatarOptions = [
    '👤', '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '🤵', '👸', '🧑‍🚀',
    '👨‍🔬', '👩‍🔬', '👨‍⚕️', '👩‍⚕️', '👨‍🏫', '👩‍🏫', '👨‍🎤', '👩‍🎤', '🤖', '🎭'
  ];

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
          <div className="p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-500/30">
            <Sparkles className="h-6 w-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Profile Information</h2>
        </div>
        <p className="text-gray-400 max-w-md mx-auto">
          Customize your profile with a unique avatar and personal information that represents you.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Avatar Selection */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <label className="block text-lg font-semibold text-white mb-4">
            <Camera className="inline w-5 h-5 mr-3 text-blue-400" />
            Choose Your Avatar
          </label>
          <p className="text-gray-400 text-sm mb-6">Select an avatar that represents your personality and role.</p>
          
          <div className="grid grid-cols-8 gap-3">
            {avatarOptions.map((emoji, index) => (
              <motion.button
                key={emoji}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, profile_avatar_url: emoji }))}
                className={`relative aspect-square rounded-xl border-2 flex items-center justify-center text-2xl transition-all duration-200 ${
                  formData.profile_avatar_url === emoji
                    ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/25 scale-110'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 hover:scale-105'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {emoji}
                {formData.profile_avatar_url === emoji && (
                  <motion.div
                    layoutId="selectedAvatar"
                    className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <Crown className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Name */}
          <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
            <label className="block text-lg font-semibold text-white mb-4">
              <User className="inline w-5 h-5 mr-3 text-emerald-400" />
              Display Name
            </label>
            <div className="relative group">
              <input
                type="text"
                name="profile_name"
                value={formData.profile_name}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-lg"
                placeholder="Enter your display name"
                required
              />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </div>
            <p className="text-gray-400 text-sm mt-3">This is how your name will appear to others in the platform.</p>
          </motion.div>

          {/* Role Display */}
          <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
            <label className="block text-lg font-semibold text-white mb-4">
              <Building className="inline w-5 h-5 mr-3 text-purple-400" />
              Role & Permissions
            </label>
            <div className="px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span className="text-white font-medium">{formData.profile_role || 'No role assigned'}</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-3">
              Your role is managed by your company administrator and determines your access level.
            </p>
          </motion.div>
        </div>

        {/* Bio Section */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <label className="block text-lg font-semibold text-white mb-4">
            About You
          </label>
          <div className="relative group">
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200 resize-none"
              placeholder="Tell us about yourself, your interests, or your professional background..."
            />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none" />
          </div>
          <p className="text-gray-400 text-sm mt-3">Share a bit about yourself with your team members.</p>
        </motion.div>

        {/* Company Information */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <label className="block text-lg font-semibold text-white mb-4">
            Company Information
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company ID</label>
              <div className="px-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl text-gray-400 font-mono text-sm">
                {currentProfile?.company_id || 'Not assigned'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Account Email</label>
              <div className="px-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl text-gray-400">
                {user?.email || 'No email'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div 
          variants={itemVariants}
          className="flex justify-end pt-6 border-t border-gray-700/50"
        >
          <motion.button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed min-w-[160px] justify-center"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save size={20} />
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
} 