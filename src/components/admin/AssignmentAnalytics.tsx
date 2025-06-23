import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { 
  BarChart3,
  Users,
  UserCheck,
  UserX,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  PieChart,
  Calendar
} from 'lucide-react';

interface AssignmentAnalyticsProps {
  className?: string;
}

interface AnalyticsData {
  totalSubAdmins: number;
  totalClients: number;
  assignedClients: number;
  unassignedClients: number;
  avgClientsPerAdmin: number;
  mostAssignedAdmin: string;
  leastAssignedAdmin: string;
  recentAssignments: number;
  distribution: { adminEmail: string; clientCount: number; utilization: number }[];
}

export function AssignmentAnalytics({ className = '' }: AssignmentAnalyticsProps) {
  const { adminRole, allAdmins, unassignedClients } = useAdminContext();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Only super-admins can access this component
  if (adminRole !== 'super_admin') {
    return (
      <div className={`${className} flex items-center justify-center h-96`}>
        <div className="text-center text-gray-500">
          <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p>Only super-admins can access assignment analytics</p>
        </div>
      </div>
    );
  }

  // Calculate analytics data
  useEffect(() => {
    const calculateAnalytics = () => {
      const subAdmins = allAdmins.filter(admin => admin.admin_role === 'sub_admin');
      const totalSubAdmins = subAdmins.length;
      const unassignedCount = unassignedClients.length;
      
      // Calculate assigned clients and distribution
      const distribution = subAdmins.map(admin => ({
        adminEmail: admin.email,
        clientCount: admin.assigned_clients_count || 0,
        utilization: totalSubAdmins > 0 ? ((admin.assigned_clients_count || 0) / Math.max(1, (admin.assigned_clients_count || 0) + unassignedCount / totalSubAdmins)) * 100 : 0
      }));

      const totalAssignedClients = distribution.reduce((sum, admin) => sum + admin.clientCount, 0);
      const totalClients = totalAssignedClients + unassignedCount;
      
      const avgClientsPerAdmin = totalSubAdmins > 0 ? totalAssignedClients / totalSubAdmins : 0;
      
      const mostAssigned = distribution.reduce((max, admin) => 
        admin.clientCount > max.clientCount ? admin : max, 
        { adminEmail: 'None', clientCount: 0 }
      );
      
      const leastAssigned = distribution.reduce((min, admin) => 
        admin.clientCount < min.clientCount ? admin : min, 
        { adminEmail: 'None', clientCount: Infinity }
      );

      setAnalytics({
        totalSubAdmins,
        totalClients,
        assignedClients: totalAssignedClients,
        unassignedClients: unassignedCount,
        avgClientsPerAdmin,
        mostAssignedAdmin: mostAssigned.adminEmail,
        leastAssignedAdmin: leastAssigned.clientCount === Infinity ? 'None' : leastAssigned.adminEmail,
        recentAssignments: 0, // Would need assignment timestamps from database
        distribution
      });
      setIsLoading(false);
    };

    calculateAnalytics();
  }, [allAdmins, unassignedClients]);

  if (isLoading || !analytics) {
    return (
      <div className={`${className} flex items-center justify-center h-96`}>
        <div className="flex items-center gap-3 text-gray-400">
          <div className="animate-spin">
            <Activity className="h-6 w-6" />
          </div>
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  const utilizationRate = analytics.totalClients > 0 ? (analytics.assignedClients / analytics.totalClients) * 100 : 0;
  const balanceScore = analytics.distribution.length > 0 ? 
    100 - (Math.max(...analytics.distribution.map(d => d.clientCount)) - Math.min(...analytics.distribution.map(d => d.clientCount))) * 10 : 100;

  return (
    <div className={`${className} h-full flex flex-col space-y-6`}>
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-green-500/20">
            <BarChart3 className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Assignment Analytics</h2>
            <p className="text-sm text-gray-400">Insights into admin assignment patterns and utilization</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-lg bg-gray-800/60 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-xs text-gray-400">TOTAL</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.totalClients}</div>
          <div className="text-sm text-gray-400">Total Clients</div>
        </motion.div>

        {/* Assigned Clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-lg bg-gray-800/60 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="h-5 w-5 text-green-400" />
            <span className="text-xs text-gray-400">ASSIGNED</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.assignedClients}</div>
          <div className="text-sm text-gray-400">
            {utilizationRate.toFixed(1)}% utilization
          </div>
        </motion.div>

        {/* Unassigned Clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-lg bg-gray-800/60 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <UserX className="h-5 w-5 text-orange-400" />
            <span className="text-xs text-gray-400">UNASSIGNED</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.unassignedClients}</div>
          <div className="text-sm text-gray-400">Need assignment</div>
        </motion.div>

        {/* Sub-Admins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-lg bg-gray-800/60 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <span className="text-xs text-gray-400">ADMINS</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.totalSubAdmins}</div>
          <div className="text-sm text-gray-400">Sub-admin editors</div>
        </motion.div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Utilization Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-lg bg-gray-800/60 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-400" />
            System Utilization
          </h3>
          
          <div className="space-y-4">
            {/* Utilization Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Client Assignment Rate</span>
                <span className="text-sm font-medium text-white">{utilizationRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${utilizationRate}%` }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full"
                />
              </div>
            </div>

            {/* Balance Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Load Balance Score</span>
                <span className="text-sm font-medium text-white">{balanceScore.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${balanceScore}%` }}
                  transition={{ delay: 1, duration: 1 }}
                  className={`h-2 rounded-full ${
                    balanceScore >= 80 
                      ? 'bg-gradient-to-r from-green-500 to-green-400'
                      : balanceScore >= 60
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                        : 'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                />
              </div>
            </div>

            {/* Average Clients per Admin */}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Avg. Clients per Admin</span>
                <span className="text-lg font-semibold text-white">
                  {analytics.avgClientsPerAdmin.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 rounded-lg bg-gray-800/60 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-400" />
            Admin Distribution
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {analytics.distribution.map((admin, index) => (
              <motion.div
                key={admin.adminEmail}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-900/60"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {admin.adminEmail}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {admin.clientCount} clients
                    </span>
                    <div className="flex-1 bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-400 h-1 rounded-full"
                        style={{
                          width: `${Math.min(100, (admin.clientCount / Math.max(...analytics.distribution.map(d => d.clientCount)) || 1) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <span className="text-sm font-medium text-white">
                    {admin.clientCount}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {analytics.distribution.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No sub-admin accounts found</p>
                <p className="text-sm">Create sub-admin accounts to see distribution</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="p-6 rounded-lg bg-gray-800/60 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-yellow-400" />
          Insights & Recommendations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Utilization Insight */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              {utilizationRate >= 80 ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              )}
              <span className="text-sm font-medium text-white">Client Coverage</span>
            </div>
            <p className="text-sm text-gray-300">
              {utilizationRate >= 80 
                ? "Excellent! Most clients are assigned to admins."
                : utilizationRate >= 60
                  ? "Good coverage. Consider assigning remaining clients."
                  : "Many clients are unassigned. Assign them to improve efficiency."
              }
            </p>
          </div>

          {/* Balance Insight */}
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              {balanceScore >= 80 ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              )}
              <span className="text-sm font-medium text-white">Load Balance</span>
            </div>
            <p className="text-sm text-gray-300">
              {balanceScore >= 80 
                ? "Well-balanced workload across all admins."
                : "Workload imbalance detected. Consider redistributing clients."
              }
            </p>
          </div>

          {/* Performance Insight */}
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Top Performer</span>
            </div>
            <p className="text-sm text-gray-300">
              {analytics.mostAssignedAdmin !== 'None' 
                ? `${analytics.mostAssignedAdmin} handles the most clients.`
                : "No assignments yet. Start assigning clients to track performance."
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 