import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { AdminAssignmentTabs, TabId } from './AdminAssignmentTabs';
import { SubAdminAccountPanel } from './SubAdminAccountPanel';
import { ClientAssignmentPanel } from './ClientAssignmentPanel';
import { BulkAssignmentPanel } from './BulkAssignmentPanel';
import { AssignmentAnalytics } from './AssignmentAnalytics';
import { 
  Users, 
  Shield, 
  Settings, 
  ArrowLeft,
  Sparkles,
  Zap
} from 'lucide-react';

interface AdminAssignmentHubProps {
  onBack?: () => void;
}

export function AdminAssignmentHub({ onBack }: AdminAssignmentHubProps) {
  const { adminRole, allAdmins, unassignedClients } = useAdminContext();
  const [activeTab, setActiveTab] = useState<TabId>('accounts');
  const [isLoaded, setIsLoaded] = useState(false);

  // Only super-admins can access this component
  if (adminRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Shield className="h-24 w-24 mx-auto mb-6 opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-lg">Only super-admins can access the Admin Assignment Hub</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-6 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate counts for tab badges
  const subAdmins = allAdmins.filter(admin => admin.admin_role === 'sub_admin');
  const totalAssignedClients = subAdmins.reduce((sum, admin) => sum + (admin.assigned_clients_count || 0), 0);
  
  const counts = {
    accounts: subAdmins.length,
    assignments: totalAssignedClients,
    bulk: unassignedClients.length
  };

  // Animation setup
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Render the appropriate panel based on active tab
  const renderActivePanel = () => {
    const panelProps = {
      className: "flex-1"
    };

    switch (activeTab) {
      case 'accounts':
        return <SubAdminAccountPanel {...panelProps} />;
      case 'assignments':
        return <ClientAssignmentPanel {...panelProps} />;
      case 'bulk':
        return <BulkAssignmentPanel {...panelProps} />;
      case 'analytics':
        return <AssignmentAnalytics {...panelProps} />;
      default:
        return <SubAdminAccountPanel {...panelProps} />;
    }
  };

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-3/4 w-96 h-96 bg-green-500/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
        className="relative z-10 p-6 max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                    <Settings className="h-8 w-8 text-blue-400" />
                  </div>
                  Admin Assignment Hub
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-300">Enterprise</span>
                  </div>
                </h1>
                <p className="text-gray-400 mt-2 text-lg">
                  Comprehensive admin assignment management with world-class user experience
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{counts.accounts}</div>
                <div className="text-xs text-gray-400">Sub-Admins</div>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{counts.assignments}</div>
                <div className="text-xs text-gray-400">Assigned</div>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{counts.bulk}</div>
                <div className="text-xs text-gray-400">Unassigned</div>
              </div>
            </div>
          </div>

          {/* Performance Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-gradient-to-r from-gray-800/60 to-gray-800/40 border border-gray-700/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Zap className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">System Status</h3>
                  <p className="text-sm text-gray-400">All assignment systems operational</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {totalAssignedClients + unassignedClients.length > 0 
                      ? Math.round((totalAssignedClients / (totalAssignedClients + unassignedClients.length)) * 100)
                      : 0
                    }% Utilization
                  </div>
                  <div className="text-xs text-gray-400">Assignment efficiency</div>
                </div>
                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${totalAssignedClients + unassignedClients.length > 0 
                        ? Math.round((totalAssignedClients / (totalAssignedClients + unassignedClients.length)) * 100)
                        : 0
                      }%` 
                    }}
                    transition={{ delay: 0.8, duration: 1.2 }}
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div variants={itemVariants} className="mb-8">
          <AdminAssignmentTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </motion.div>

        {/* Main Content Area */}
        <motion.div 
          variants={itemVariants}
          className="rounded-2xl bg-gray-800/30 border border-gray-700/50 backdrop-blur-sm shadow-2xl overflow-hidden"
        >
          <div className={`p-6 ${activeTab === 'assignments' ? 'h-[calc(100vh-230px)]' : 'h-[calc(100vh-320px)]'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {renderActivePanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          variants={itemVariants}
          className="mt-6 text-center text-gray-500"
        >
          <p className="text-sm">
            Admin Assignment Hub • Enterprise-grade client management • 
            <span className="text-blue-400 ml-1">Powered by BOFU AI</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
} 