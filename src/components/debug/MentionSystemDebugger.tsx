
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bug, Database, Users, Bell, RefreshCcw } from 'lucide-react';
import { 
  getMentionableUsers, 
  getMentionNotifications, 
  MentionableUser,
  MentionNotification 
} from '../../lib/commentApi';
import { supabase } from '../../lib/supabase';

interface MentionSystemDebuggerProps {
  isVisible: boolean;
  onClose: () => void;
  articleId?: string;
}

export const MentionSystemDebugger: React.FC<MentionSystemDebuggerProps> = ({
  isVisible,
  onClose,
  articleId
}) => {
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
  const [notifications, setNotifications] = useState<MentionNotification[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setDebugLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 19)]);
  };

  const testMentionableUsers = async () => {
    setIsLoading(true);
    addLog(`Testing getMentionableUsers with articleId: ${articleId || 'null'}, searchTerm: "${testSearchTerm}"`);
    
    try {
      const users = await getMentionableUsers(articleId, testSearchTerm);
      setMentionableUsers(users);
      addLog(`✅ Found ${users.length} mentionable users`);
      users.forEach(user => {
        addLog(`  - ${user.email} (${user.is_admin ? 'Admin' : 'User'}) -> ${user.mention_text}`);
      });
    } catch (error) {
      addLog(`❌ Error fetching mentionable users: ${error}`);
      console.error('Error fetching mentionable users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testNotifications = async () => {
    setIsLoading(true);
    addLog('Testing getMentionNotifications');
    
    try {
      const notifs = await getMentionNotifications();
      setNotifications(notifs);
      addLog(`✅ Found ${notifs.length} mention notifications`);
      notifs.slice(0, 5).forEach(notif => {
        addLog(`  - ${notif.mention_text} in comment ${notif.comment_id} (sent: ${notif.notification_sent})`);
      });
    } catch (error) {
      addLog(`❌ Error fetching notifications: ${error}`);
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabase = async () => {
    setIsLoading(true);
    addLog('Testing database connectivity and tables');
    
    try {
      // Test user_profiles table
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email, company_name')
        .limit(3);
      
      if (userError) {
        addLog(`❌ user_profiles error: ${userError.message}`);
      } else {
        addLog(`✅ user_profiles: ${userProfiles?.length} records found`);
      }

      // Test admin_profiles table
      const { data: adminProfiles, error: adminError } = await supabase
        .from('admin_profiles')
        .select('id, email, full_name')
        .limit(3);
      
      if (adminError) {
        addLog(`❌ admin_profiles error: ${adminError.message}`);
      } else {
        addLog(`✅ admin_profiles: ${adminProfiles?.length} records found`);
      }

      // Test comment_mentions table
      const { data: mentions, error: mentionsError } = await supabase
        .from('comment_mentions')
        .select('*')
        .limit(3);
      
      if (mentionsError) {
        addLog(`❌ comment_mentions error: ${mentionsError.message}`);
      } else {
        addLog(`✅ comment_mentions: ${mentions?.length} records found`);
      }

      // Test get_mentionable_users function directly
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_mentionable_users', {
          article_id_param: articleId || null,
          search_term: testSearchTerm || ''
        });
      
      if (rpcError) {
        addLog(`❌ get_mentionable_users RPC error: ${rpcError.message}`);
      } else {
        addLog(`✅ get_mentionable_users RPC: ${rpcResult?.length} users returned`);
      }

    } catch (error) {
      addLog(`❌ Database test error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        addLog(`❌ Auth error: ${error.message}`);
      } else {
        addLog(`✅ Current user: ${user?.email} (ID: ${user?.id})`);
      }
    } catch (error) {
      addLog(`❌ Auth test error: ${error}`);
    }
  };

  useEffect(() => {
    if (isVisible) {
      addLog('MentionSystemDebugger opened');
      getCurrentUser();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="h-6 w-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mention System Debugger</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Debug mention autocomplete and notifications
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Controls */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Controls</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Search Term
                </label>
                <input
                  type="text"
                  value={testSearchTerm}
                  onChange={(e) => setTestSearchTerm(e.target.value)}
                  placeholder="Enter search term..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={testMentionableUsers}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  <Users className="h-4 w-4" />
                  Test Mentionable Users
                </button>
                
                <button
                  onClick={testNotifications}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                >
                  <Bell className="h-4 w-4" />
                  Test Notifications
                </button>
                
                <button
                  onClick={testDatabase}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50"
                >
                  <Database className="h-4 w-4" />
                  Test Database
                </button>
              </div>

              {/* Current State */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Current State</h4>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Article ID: {articleId || 'Not provided'}</div>
                  <div>Mentionable Users: {mentionableUsers.length}</div>
                  <div>Notifications: {notifications.length}</div>
                </div>
              </div>
            </div>

            {/* Debug Logs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Debug Logs</h3>
                <button
                  onClick={() => setDebugLogs([])}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Clear
                </button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-500">No logs yet. Run some tests...</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          {mentionableUsers.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mentionable Users Result</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mentionableUsers.map((user, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${user.is_admin ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <span className="font-medium text-gray-900 dark:text-white">{user.mention_text}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {user.email} ({user.is_admin ? 'Admin' : 'User'})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};