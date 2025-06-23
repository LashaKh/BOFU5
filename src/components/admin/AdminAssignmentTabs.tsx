import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Shield, 
  Shuffle, 
  BarChart3,
  ChevronRight
} from 'lucide-react';

export type TabId = 'accounts' | 'assignments' | 'bulk' | 'analytics';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  count?: number;
}

interface AdminAssignmentTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts?: {
    accounts: number;
    assignments: number;
    bulk: number;
  };
}

export function AdminAssignmentTabs({ 
  activeTab, 
  onTabChange, 
  counts = { accounts: 0, assignments: 0, bulk: 0 }
}: AdminAssignmentTabsProps) {
  const tabs: Tab[] = [
    {
      id: 'accounts',
      label: 'Sub-Admin Accounts',
      icon: Shield,
      description: 'Create and manage sub-admin editor accounts',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/50',
      count: counts.accounts
    },
    {
      id: 'assignments',
      label: 'Client Assignment',
      icon: Users,
      description: 'Assign clients to sub-admin editors',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/50',
      count: counts.assignments
    },
    {
      id: 'bulk',
      label: 'Bulk Operations',
      icon: Shuffle,
      description: 'Perform bulk assignment operations',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/50',
      count: counts.bulk
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'View assignment analytics and insights',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50'
    }
  ];

  return (
    <div className="w-full">
      {/* Desktop Tab Navigation */}
      <div className="hidden md:flex bg-gray-800/40 rounded-xl p-2 gap-2 backdrop-blur-sm border border-gray-700/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 group transition-all duration-300 ${
                isActive ? 'z-10' : 'z-0'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Background with gradient and border */}
              <div className={`
                relative p-4 rounded-lg transition-all duration-300
                ${isActive 
                  ? `${tab.bgColor} ${tab.borderColor} border-2 shadow-lg shadow-${tab.color.replace('text-', '').replace('-400', '')}-500/20` 
                  : 'bg-gray-900/60 border border-gray-700 hover:bg-gray-800/80'
                }
              `}>
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 ${tab.bgColor} rounded-lg opacity-50`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                {/* Content */}
                <div className="relative flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg transition-all duration-300
                    ${isActive ? tab.bgColor : 'bg-gray-800 group-hover:bg-gray-700'}
                  `}>
                    <Icon className={`h-5 w-5 transition-colors duration-300 ${
                      isActive ? tab.color : 'text-gray-400 group-hover:text-gray-300'
                    }`} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold transition-colors duration-300 ${
                        isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                      }`}>
                        {tab.label}
                      </h3>
                      {tab.count !== undefined && (
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium transition-all duration-300
                          ${isActive 
                            ? `${tab.bgColor} ${tab.color}` 
                            : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'
                          }
                        `}>
                          {tab.count}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${
                      isActive ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                      {tab.description}
                    </p>
                  </div>
                  
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${tab.color}`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden space-y-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="w-full group"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={`
                p-4 rounded-lg border transition-all duration-300
                ${isActive 
                  ? `${tab.bgColor} ${tab.borderColor} border-2` 
                  : 'bg-gray-800/60 border border-gray-700 hover:bg-gray-700/60'
                }
              `}>
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg transition-all duration-300
                    ${isActive ? tab.bgColor : 'bg-gray-800 group-hover:bg-gray-700'}
                  `}>
                    <Icon className={`h-5 w-5 transition-colors duration-300 ${
                      isActive ? tab.color : 'text-gray-400 group-hover:text-gray-300'
                    }`} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold transition-colors duration-300 ${
                        isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                      }`}>
                        {tab.label}
                      </h3>
                      {tab.count !== undefined && (
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium transition-all duration-300
                          ${isActive 
                            ? `${tab.bgColor} ${tab.color}` 
                            : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'
                          }
                        `}>
                          {tab.count}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${
                      isActive ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                      {tab.description}
                    </p>
                  </div>
                  
                  <ChevronRight className={`h-5 w-5 transition-colors duration-300 ${
                    isActive ? tab.color : 'text-gray-400 group-hover:text-gray-300'
                  }`} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
} 