import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Settings as SettingsIcon, 
  Bell,
  Palette,
  Globe,
  Accessibility,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ProfileEditForm } from '../components/settings/ProfileEditForm';
import { SecuritySettingsForm } from '../components/settings/SecuritySettingsForm';
import { PreferencesForm } from '../components/settings/PreferencesForm';
import { getCurrentUser } from '../lib/auth';

type TabKey = 'profile' | 'security' | 'preferences';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  gradient: string;
}

const tabs: Tab[] = [
  {
    key: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your personal information and avatar',
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    key: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Password, email, and account security',
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-green-500/20'
  },
  {
    key: 'preferences',
    label: 'Preferences',
    icon: SettingsIcon,
    description: 'Theme, notifications, and accessibility',
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/20'
  }
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
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 }
  }
};

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.3 }
  }
};

export function UserSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user data
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        navigate('/');
      }
    };

    loadUser();
  }, [navigate]);

  const handleUpdate = () => {
    // Trigger any necessary updates
    console.log('User data updated');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Loading user settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Header */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-between mb-8"
        >
          <motion.button
            onClick={() => navigate(-1)}
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group"
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 group-hover:border-gray-600/50 transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-medium">Back</span>
          </motion.button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Manage your account and preferences</p>
          </div>

          <div className="w-20"></div> {/* Spacer for centering */}
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-3"
          >
            <div className="bg-gradient-to-b from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 sticky top-8">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-700/50">
                <div className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30">
                  <Sparkles className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Settings</h3>
                  <p className="text-sm text-gray-400">Customize your experience</p>
                </div>
              </div>

              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  
                  return (
                    <motion.button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-white shadow-lg' 
                          : 'hover:bg-gray-700/30 text-gray-300 hover:text-white border border-transparent'
                      }`}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-blue-500/20' : 'bg-gray-700/50'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          isActive ? 'text-blue-400' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                          {tab.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {tab.description}
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-4 w-4 text-blue-400" />
                      )}
                    </motion.button>
                  );
                })}
              </nav>

              {/* Quick Stats */}
              <motion.div 
                variants={itemVariants}
                className="mt-8 pt-6 border-t border-gray-700/50"
              >
                <h4 className="text-sm font-medium text-gray-400 mb-4">Account Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Member since</span>
                    <span className="text-white font-medium">
                      {user?.created_at ? new Date(user.created_at).getFullYear() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Account type</span>
                    <span className="text-green-400 font-medium">Active</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-9"
          >
            <div className="bg-gradient-to-b from-gray-800/30 to-gray-700/30 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeTab === 'profile' && <ProfileEditForm user={user} onUpdate={handleUpdate} />}
                  {activeTab === 'security' && <SecuritySettingsForm user={user} />}
                  {activeTab === 'preferences' && <PreferencesForm user={user} onUpdate={handleUpdate} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default UserSettingsPage; 