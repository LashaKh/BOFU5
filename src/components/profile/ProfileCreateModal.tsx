import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  UserIcon, 
  CheckCircleIcon, 
  SparklesIcon,
  ShieldCheckIcon,
  PencilIcon,
  EyeIcon,
  CogIcon,
  UserGroupIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  KeyIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useProfileContext } from '../../contexts/ProfileContext';
import { CompanyProfile } from '../../types';

interface ProfileCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (profile: CompanyProfile) => void;
}

interface FormData {
  profile_name: string;
  profile_role: 'admin' | 'manager' | 'editor' | 'viewer';
  profile_avatar_url: string;
  email: string;
  password: string;
}

const roleConfig = {
  admin: {
    icon: ShieldCheckIcon,
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-300',
    description: 'Full system access with administrative privileges',
    permissions: ['All permissions', 'User management', 'System configuration', 'Data export']
  },
  manager: {
    icon: UserGroupIcon,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-300',
    description: 'Team management with content oversight',
    permissions: ['Content management', 'Analytics access', 'Team oversight', 'Export reports']
  },
  editor: {
    icon: PencilIcon,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-300',
    description: 'Create and edit content with collaboration tools',
    permissions: ['Create content', 'Edit content', 'Collaborate', 'Basic analytics']
  },
  viewer: {
    icon: EyeIcon,
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    textColor: 'text-gray-300',
    description: 'Read-only access for viewing and reviewing',
    permissions: ['View content', 'Basic dashboard', 'Download reports', 'Comment on content']
  }
};

const avatarOptions = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1494790108755-2616b612b4d0?ixlib=rb-4.0.3&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80'
];

// Password generator utility
const generatePassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Password strength checker
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score < 2) return { score, label: 'Weak', color: 'text-red-400' };
  if (score < 4) return { score, label: 'Medium', color: 'text-yellow-400' };
  return { score, label: 'Strong', color: 'text-green-400' };
};

export function ProfileCreateModal({ isOpen, onClose, onSuccess }: ProfileCreateModalProps) {
  const { createProfile } = useProfileContext();
  
  const [formData, setFormData] = useState<FormData>({
    profile_name: '',
    profile_role: 'viewer',
    profile_avatar_url: avatarOptions[0],
    email: '',
    password: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [step, setStep] = useState<'basic' | 'credentials' | 'role' | 'avatar' | 'review'>('basic');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        profile_name: '',
        profile_role: 'viewer',
        profile_avatar_url: avatarOptions[0],
        email: '',
        password: ''
      });
      setErrors({});
      setStep('basic');
      setShowSuccess(false);
      setShowPassword(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.profile_name.trim()) {
      newErrors.profile_name = 'Profile name is required';
    } else if (formData.profile_name.length < 2) {
      newErrors.profile_name = 'Profile name must be at least 2 characters';
    } else if (formData.profile_name.length > 50) {
      newErrors.profile_name = 'Profile name must be less than 50 characters';
    }
    
    if (!formData.profile_avatar_url) {
      newErrors.profile_avatar_url = 'Please select an avatar';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 'basic') {
      if (formData.profile_name.trim()) {
        setStep('credentials');
      }
    } else if (step === 'credentials') {
      if (formData.email && formData.password) {
        setStep('role');
      }
    } else if (step === 'role') {
      setStep('avatar');
    } else if (step === 'avatar') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'review') setStep('avatar');
    else if (step === 'avatar') setStep('role');
    else if (step === 'role') setStep('credentials');
    else if (step === 'credentials') setStep('basic');
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData({ ...formData, password: newPassword });
  };

  const createRegularProfile = async () => {
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const result = await createProfile({
        profile_name: formData.profile_name.trim(),
        profile_role: formData.profile_role,
        profile_avatar_url: formData.profile_avatar_url
        // Note: No email/password for regular profiles
      } as any);

      if (result.success && result.profile) {
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess?.(result.profile!);
          onClose();
        }, 2000);
      } else {
        setErrors({ profile_name: result.error || 'Failed to create regular profile' });
      }
    } catch (error) {
      setErrors({ profile_name: 'An unexpected error occurred creating regular profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await createProfile({
        profile_name: formData.profile_name.trim(),
        profile_role: formData.profile_role,
        profile_avatar_url: formData.profile_avatar_url,
        email: formData.email,
        password: formData.password
      } as any);

      if (result.success && result.profile) {
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess?.(result.profile!);
          onClose();
        }, 2000);
      } else {
        // Check if it's an Edge Function deployment error
        if (result.error?.includes('Edge Function')) {
          setErrors({ 
            profile_name: result.error + '\n\nWould you like to create a regular profile instead?' 
          });
        } else {
          // Show detailed error for debugging
          console.error('[ProfileCreateModal] Detailed error:', result.error);
          setErrors({ 
            profile_name: `${result.error || 'Failed to create profile'}

🐛 Debug Info:
If this error persists, please check the browser console for more details or try creating a regular profile instead.` 
          });
        }
      }
    } catch (error) {
      setErrors({ profile_name: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-secondary-900 rounded-2xl shadow-2xl w-full max-w-md border border-secondary-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-full">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create New Profile</h2>
                <p className="text-primary-100/80 text-sm">Set up your workspace identity</p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-6 flex items-center gap-2">
              {['basic', 'credentials', 'role', 'avatar', 'review'].map((stepName, index) => (
                <div
                  key={stepName}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    ['basic', 'credentials', 'role', 'avatar', 'review'].indexOf(step) >= index
                      ? 'bg-white'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", damping: 15 }}
                    className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white mb-2">Profile Created!</h3>
                  <p className="text-gray-300 text-sm">Your new profile is ready to use</p>
                </motion.div>
              ) : (
                <>
                  {/* Step 1: Basic Info */}
                  {step === 'basic' && (
                    <motion.div
                      key="basic"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Profile Name</h3>
                        <p className="text-gray-400 text-sm mb-4">Choose a name that reflects your role or purpose</p>
                        
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={formData.profile_name}
                            onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleNext()}
                            placeholder="e.g., Marketing Manager, Content Creator"
                            className="w-full pl-11 pr-4 py-3 bg-white border border-secondary-600 rounded-lg text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                            autoFocus
                          />
                        </div>
                        
                        {errors.profile_name && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 flex items-center gap-2"
                          >
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            {errors.profile_name}
                          </motion.p>
                        )}
                      </div>

                      <div className="bg-secondary-800/50 rounded-lg p-4 border border-secondary-700/50">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <CogIcon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium text-sm">Pro Tip</h4>
                            <p className="text-gray-400 text-xs mt-1">Use descriptive names like "Marketing Lead" or "Content Writer" to help team members understand your role at a glance.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Email and Password */}
                  {step === 'credentials' && (
                    <motion.div
                      key="credentials"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Email and Password</h3>
                        <p className="text-gray-400 text-sm mb-6">Enter your email and password for the new user account</p>
                      </div>

                      <div className="relative">
                        <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleNext()}
                          placeholder="e.g., john@example.com"
                          className="w-full pl-11 pr-4 py-3 bg-white border border-secondary-600 rounded-lg text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                        />
                      </div>

                      <div className="relative">
                        <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleNext()}
                          placeholder="Password"
                          className="w-full pl-11 pr-4 py-3 bg-white border border-secondary-600 rounded-lg text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                        />
                        <button
                          onClick={(e) => { e.preventDefault(); setShowPassword(!showPassword); }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-white/10 rounded-full"
                        >
                          {showPassword ? (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-secondary-800/50 rounded-lg border border-secondary-700/50">
                        <KeyIcon className="h-5 w-5 text-primary-400" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">Generate Strong Password</p>
                          <p className="text-gray-400 text-xs">Click to generate a secure password automatically</p>
                        </div>
                        <button
                          onClick={handleGeneratePassword}
                          className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Generate
                        </button>
                      </div>

                      {formData.password && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Password Strength</span>
                            <span className={`text-sm font-medium ${getPasswordStrength(formData.password).color}`}>
                              {getPasswordStrength(formData.password).label}
                            </span>
                          </div>
                          <div className="w-full bg-secondary-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                getPasswordStrength(formData.password).score < 2
                                  ? 'bg-red-500'
                                  : getPasswordStrength(formData.password).score < 4
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${(getPasswordStrength(formData.password).score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {(errors.email || errors.password) && (
                        <div className="space-y-2">
                          {errors.email && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm flex items-center gap-2"
                            >
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              {errors.email}
                            </motion.p>
                          )}
                          {errors.password && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm flex items-center gap-2"
                            >
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              {errors.password}
                            </motion.p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 3: Role Selection */}
                  {step === 'role' && (
                    <motion.div
                      key="role"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Select Role</h3>
                        <p className="text-gray-400 text-sm mb-6">Choose the role that best fits your responsibilities</p>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(roleConfig).map(([role, config]) => {
                          const IconComponent = config.icon;
                          const isSelected = formData.profile_role === role;
                          
                          return (
                            <motion.button
                              key={role}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setFormData({ ...formData, profile_role: role as any })}
                              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? `${config.borderColor} ${config.bgColor}`
                                  : 'border-secondary-600 bg-secondary-800/30 hover:border-secondary-500'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${isSelected ? config.bgColor : 'bg-secondary-700'}`}>
                                  <IconComponent className={`h-5 w-5 ${isSelected ? config.textColor : 'text-gray-400'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className={`font-medium capitalize ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                      {role}
                                    </h4>
                                    {isSelected && (
                                      <CheckCircleIcon className="h-5 w-5 text-primary-400" />
                                    )}
                                  </div>
                                  <p className="text-gray-400 text-sm mt-1">{config.description}</p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {config.permissions.slice(0, 2).map((permission, index) => (
                                      <span
                                        key={index}
                                        className="inline-block px-2 py-1 bg-secondary-700 rounded text-xs text-gray-300"
                                      >
                                        {permission}
                                      </span>
                                    ))}
                                    {config.permissions.length > 2 && (
                                      <span className="inline-block px-2 py-1 bg-secondary-700 rounded text-xs text-gray-400">
                                        +{config.permissions.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Avatar Selection */}
                  {step === 'avatar' && (
                    <motion.div
                      key="avatar"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Choose Avatar</h3>
                        <p className="text-gray-400 text-sm mb-6">Pick an avatar that represents you</p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {avatarOptions.map((avatarUrl, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFormData({ ...formData, profile_avatar_url: avatarUrl })}
                            className={`relative p-2 rounded-lg border-2 transition-all ${
                              formData.profile_avatar_url === avatarUrl
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-secondary-600 hover:border-secondary-500'
                            }`}
                          >
                            <img
                              src={avatarUrl}
                              alt={`Avatar option ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                            {formData.profile_avatar_url === avatarUrl && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                              >
                                <CheckCircleIcon className="h-4 w-4 text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-secondary-800/50 rounded-lg border border-secondary-700/50">
                        <PhotoIcon className="h-5 w-5 text-primary-400" />
                        <div>
                          <p className="text-white text-sm font-medium">Custom Avatar</p>
                          <p className="text-gray-400 text-xs">Custom avatar uploads coming soon!</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Review */}
                  {step === 'review' && (
                    <motion.div
                      key="review"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Review Profile</h3>
                        <p className="text-gray-400 text-sm mb-6">Double-check your profile details before creating</p>
                      </div>

                      <div className="bg-secondary-800/50 rounded-lg p-6 border border-secondary-700/50">
                        <div className="flex items-center gap-4 mb-4">
                          <img
                            src={formData.profile_avatar_url}
                            alt="Profile avatar"
                            className="w-16 h-16 rounded-full object-cover border-2 border-primary-500/50"
                          />
                          <div>
                            <h4 className="text-white font-semibold text-lg">{formData.profile_name}</h4>
                            <p className="text-gray-300 text-sm capitalize">{formData.profile_role}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h5 className="text-white font-medium text-sm mb-2">Login Credentials</h5>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">{formData.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <KeyIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">••••••••</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  getPasswordStrength(formData.password).score < 2
                                    ? 'bg-red-500/20 text-red-300'
                                    : getPasswordStrength(formData.password).score < 4
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-green-500/20 text-green-300'
                                }`}>
                                  {getPasswordStrength(formData.password).label}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="text-white font-medium text-sm mb-2">Permissions</h5>
                            <div className="flex flex-wrap gap-2">
                              {roleConfig[formData.profile_role].permissions.map((permission, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-3 py-1 bg-secondary-700 rounded-full text-xs text-gray-300"
                                >
                                  {permission}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {errors.profile_name && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-900/20 border border-red-500/30 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                            <p className="text-red-300 text-sm">{errors.profile_name}</p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!showSuccess && (
            <div className="p-6 border-t border-secondary-700/50 bg-secondary-800/30">
              <div className="flex justify-between gap-3">
                <button
                  onClick={step === 'basic' ? onClose : handleBack}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  {step === 'basic' ? 'Cancel' : 'Back'}
                </button>

                <div className="flex gap-3">
                  {step !== 'review' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNext}
                      disabled={step === 'basic' && !formData.profile_name.trim()}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </motion.button>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Creating...
                          </div>
                        ) : (
                          'Create Profile'
                        )}
                      </motion.button>
                      
                      {/* Fallback button for Edge Function errors */}
                      {errors.profile_name && errors.profile_name.includes('Edge Function') && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={createRegularProfile}
                          disabled={isSubmitting}
                          className="px-6 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmitting ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Creating...
                            </div>
                          ) : (
                            'Create Regular Profile'
                          )}
                        </motion.button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 