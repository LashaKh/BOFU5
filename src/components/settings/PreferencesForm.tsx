import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Palette, 
  Bell, 
  Monitor, 
  Sun, 
  Moon, 
  Globe, 
  Accessibility, 
  Layout,
  Eye,
  Volume2,
  Smartphone,
  Languages,
  Settings as SettingsIcon,
  Sparkles,
  Zap,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PreferencesFormProps {
  user: any;
  onUpdate: () => void;
}

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ComponentType<any>;
  color?: string;
}

const PreferenceToggle: React.FC<PreferenceToggleProps> = ({ 
  label, 
  description, 
  checked, 
  onChange, 
  icon: Icon = CheckCircle,
  color = 'emerald'
}) => {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
      <div className="flex items-start gap-3 flex-1">
        <div className={`p-2 bg-${color}-500/20 rounded-lg mt-1`}>
          <Icon className={`h-4 w-4 text-${color}-400`} />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-medium mb-1">{label}</h4>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
      <motion.button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? `bg-${color}-500` : 'bg-gray-600'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
};

export function PreferencesForm({ user, onUpdate }: PreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    // Theme Settings
    theme: 'dark' as 'light' | 'dark' | 'auto',
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    weeklyDigest: true,
    collaborationUpdates: true,
    systemAlerts: true,
    
    // Dashboard Settings
    compactLayout: false,
    showTutorialTips: true,
    autoSaveFrequency: 30,
    
    // Accessibility Settings
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    
    // Language & Region
    language: 'en',
    timezone: 'auto',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    
    // Advanced Settings
    experimentalFeatures: false,
    analyticsOptOut: false,
    dataExportReminders: true
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Here you would typically save to your backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success('Preferences saved successfully');
      onUpdate();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Clean bright interface' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { value: 'auto', label: 'Auto', icon: Monitor, description: 'Follows system preference' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'ja', label: '日本語', flag: '🇯🇵' },
    { value: 'zh', label: '中文', flag: '🇨🇳' }
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
          <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
            <SettingsIcon className="h-6 w-6 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Preferences</h2>
        </div>
        <p className="text-gray-400 max-w-md mx-auto">
          Customize your experience with personalized settings and accessibility options.
        </p>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Theme Settings */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-5 w-5 text-purple-400" />
            <h3 className="text-xl font-semibold text-white">Appearance</h3>
          </div>
          
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">Theme Preference</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = preferences.theme === option.value;
                
                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => setPreferences(prev => ({ ...prev, theme: option.value as any }))}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/25' 
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
                    }`}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`p-3 rounded-full mb-3 ${
                        isSelected ? 'bg-purple-500/20' : 'bg-gray-700'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          isSelected ? 'text-purple-400' : 'text-gray-400'
                        }`} />
                      </div>
                      <h4 className={`font-semibold mb-1 ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`}>
                        {option.label}
                      </h4>
                      <p className="text-sm text-gray-400">{option.description}</p>
                    </div>
                    {isSelected && (
                      <motion.div
                        layoutId="selectedTheme"
                        className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Notification Settings */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <PreferenceToggle
              label="Email Notifications"
              description="Receive important updates and alerts via email"
              checked={preferences.emailNotifications}
              onChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
              icon={Bell}
              color="blue"
            />
            <PreferenceToggle
              label="Push Notifications"
              description="Get real-time notifications in your browser"
              checked={preferences.pushNotifications}
              onChange={(checked) => setPreferences(prev => ({ ...prev, pushNotifications: checked }))}
              icon={Smartphone}
              color="green"
            />
            <PreferenceToggle
              label="Weekly Digest"
              description="Summary of your activity and achievements"
              checked={preferences.weeklyDigest}
              onChange={(checked) => setPreferences(prev => ({ ...prev, weeklyDigest: checked }))}
              icon={Layout}
              color="purple"
            />
            <PreferenceToggle
              label="Collaboration Updates"
              description="Notifications when team members make changes"
              checked={preferences.collaborationUpdates}
              onChange={(checked) => setPreferences(prev => ({ ...prev, collaborationUpdates: checked }))}
              icon={Zap}
              color="yellow"
            />
            <PreferenceToggle
              label="Marketing Emails"
              description="Product updates, tips, and special offers"
              checked={preferences.marketingEmails}
              onChange={(checked) => setPreferences(prev => ({ ...prev, marketingEmails: checked }))}
              icon={Sparkles}
              color="pink"
            />
          </div>
        </motion.div>

        {/* Dashboard Settings */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Layout className="h-5 w-5 text-emerald-400" />
            <h3 className="text-xl font-semibold text-white">Dashboard</h3>
          </div>
          
          <div className="space-y-4">
            <PreferenceToggle
              label="Compact Layout"
              description="Show more content in less space"
              checked={preferences.compactLayout}
              onChange={(checked) => setPreferences(prev => ({ ...prev, compactLayout: checked }))}
              icon={Layout}
              color="emerald"
            />
            <PreferenceToggle
              label="Tutorial Tips"
              description="Show helpful tips and guidance"
              checked={preferences.showTutorialTips}
              onChange={(checked) => setPreferences(prev => ({ ...prev, showTutorialTips: checked }))}
              icon={Sparkles}
              color="blue"
            />
            
            <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white font-medium">Auto-save Frequency</h4>
                  <p className="text-gray-400 text-sm">How often to automatically save your work</p>
                </div>
                <span className="text-emerald-400 font-semibold">{preferences.autoSaveFrequency}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={preferences.autoSaveFrequency}
                onChange={(e) => setPreferences(prev => ({ ...prev, autoSaveFrequency: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10s</span>
                <span>5min</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Accessibility Settings */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Accessibility className="h-5 w-5 text-orange-400" />
            <h3 className="text-xl font-semibold text-white">Accessibility</h3>
          </div>
          
          <div className="space-y-4">
            <PreferenceToggle
              label="Reduced Motion"
              description="Minimize animations and transitions"
              checked={preferences.reducedMotion}
              onChange={(checked) => setPreferences(prev => ({ ...prev, reducedMotion: checked }))}
              icon={Eye}
              color="orange"
            />
            <PreferenceToggle
              label="High Contrast"
              description="Increase color contrast for better visibility"
              checked={preferences.highContrast}
              onChange={(checked) => setPreferences(prev => ({ ...prev, highContrast: checked }))}
              icon={Eye}
              color="yellow"
            />
            <PreferenceToggle
              label="Large Text"
              description="Increase font size throughout the interface"
              checked={preferences.largeText}
              onChange={(checked) => setPreferences(prev => ({ ...prev, largeText: checked }))}
              icon={Eye}
              color="green"
            />
            <PreferenceToggle
              label="Keyboard Navigation"
              description="Enhanced keyboard shortcuts and navigation"
              checked={preferences.keyboardNavigation}
              onChange={(checked) => setPreferences(prev => ({ ...prev, keyboardNavigation: checked }))}
              icon={Accessibility}
              color="blue"
            />
          </div>
        </motion.div>

        {/* Language & Region */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-5 w-5 text-cyan-400" />
            <h3 className="text-xl font-semibold text-white">Language & Region</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Language</label>
              <div className="relative">
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 appearance-none"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.flag} {option.label}
                    </option>
                  ))}
                </select>
                <Languages className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Date Format</label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => setPreferences(prev => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full px-4 py-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Advanced Settings */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-red-500/5 to-orange-500/5 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold text-white">Advanced</h3>
          </div>
          
          <div className="space-y-4">
            <PreferenceToggle
              label="Experimental Features"
              description="Try out new features before they're officially released"
              checked={preferences.experimentalFeatures}
              onChange={(checked) => setPreferences(prev => ({ ...prev, experimentalFeatures: checked }))}
              icon={Zap}
              color="red"
            />
            <PreferenceToggle
              label="Analytics Opt-out"
              description="Disable anonymous usage analytics"
              checked={preferences.analyticsOptOut}
              onChange={(checked) => setPreferences(prev => ({ ...prev, analyticsOptOut: checked }))}
              icon={Eye}
              color="gray"
            />
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
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed min-w-[180px] justify-center"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save size={20} />
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving Preferences...
              </div>
            ) : (
              'Save Preferences'
            )}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
} 