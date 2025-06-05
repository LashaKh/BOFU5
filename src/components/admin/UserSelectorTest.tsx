import React, { useState } from 'react';
import { UserSelector } from './UserSelector';
import type { UserProfile } from '../../types/adminApi';

export function UserSelectorTest() {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    console.log('Selected user:', user);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary-400 mb-8">User Selector Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Selector */}
          <div>
            <UserSelector
              onUserSelect={handleUserSelect}
              selectedUserId={selectedUser?.id}
              className="h-fit"
            />
          </div>

          {/* Selected User Display */}
          <div className="bg-secondary-800 rounded-lg border-2 border-primary-500/20 shadow-glow p-6">
            <h2 className="text-xl font-semibold text-primary-400 mb-4">Selected User</h2>
            {selectedUser ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Company</label>
                  <p className="text-white font-medium">
                    {selectedUser.company_name || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">User ID</label>
                  <p className="text-white font-mono text-sm">{selectedUser.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Articles</label>
                  <p className="text-white">{selectedUser.article_count} articles</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Joined</label>
                  <p className="text-white">
                    {new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No user selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 