import React, { useState } from 'react';
import { AdminArticleList } from './AdminArticleList';
import { UserSelector } from './UserSelector';
import type { UserProfile, ArticleListItem } from '../../types/adminApi';

export function AdminArticleListTest() {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleListItem | null>(null);

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedArticle(null); // Clear selected article when user changes
    console.log('Selected user for articles:', user);
  };

  const handleArticleSelect = (article: ArticleListItem) => {
    setSelectedArticle(article);
    console.log('Selected article:', article);
  };

  const clearUserSelection = () => {
    setSelectedUser(null);
    setSelectedArticle(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary-400 mb-8">Admin Article List Test</h1>
        
        <div className="space-y-8">
          {/* User Selection Section */}
          <div className="bg-secondary-800 rounded-lg border-2 border-primary-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-primary-400">User Selection</h2>
              {selectedUser && (
                <button
                  onClick={clearUserSelection}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            {selectedUser ? (
              <div className="bg-secondary-700 rounded-lg p-4">
                <p className="text-green-400 mb-2">✓ Selected User:</p>
                <div className="text-white">
                  <p className="font-medium">{selectedUser.company_name || 'No company'}</p>
                  <p className="text-gray-400">{selectedUser.email}</p>
                  <p className="text-sm text-gray-500">
                    Joined: {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Articles: {selectedUser.article_count}
                  </p>
                </div>
              </div>
            ) : (
              <UserSelector
                onUserSelect={handleUserSelect}
                className="max-w-md"
              />
            )}
          </div>

          {/* Article List Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-primary-400">
                Article List {selectedUser ? `(${selectedUser.company_name || selectedUser.email})` : '(All Users)'}
              </h2>
            </div>
            
            <AdminArticleList
              selectedUser={selectedUser}
              onArticleSelect={handleArticleSelect}
            />
          </div>

          {/* Selected Article Info */}
          {selectedArticle && (
            <div className="bg-secondary-800 rounded-lg border-2 border-green-500/20 p-6">
              <h2 className="text-xl font-semibold text-green-400 mb-4">Selected Article Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-400">Title</p>
                  <p className="text-white">{selectedArticle.title || 'Untitled Article'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Status</p>
                  <p className="text-white">{selectedArticle.editing_status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">User</p>
                  <p className="text-white">{selectedArticle.user_company}</p>
                  <p className="text-gray-400 text-sm">{selectedArticle.user_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Product</p>
                  <p className="text-white">{selectedArticle.product_name || 'No product'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Last Edited</p>
                  <p className="text-white">
                    {new Date(selectedArticle.last_edited_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Version</p>
                  <p className="text-white">v{selectedArticle.article_version}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-400">Article ID</p>
                  <p className="text-white font-mono text-xs">{selectedArticle.id}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-400">User ID</p>
                  <p className="text-white font-mono text-xs">{selectedArticle.user_id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Test Instructions */}
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-6">
            <h3 className="text-blue-400 font-semibold mb-3">Test Instructions</h3>
            <div className="space-y-2 text-gray-300">
              <p><strong>1. User Selection:</strong> Search for and select a user to filter articles by that user.</p>
              <p><strong>2. Article Filtering:</strong> Use the filters button to filter articles by status, date range.</p>
              <p><strong>3. Search:</strong> Use the search bar to find articles by title, content, or product name.</p>
              <p><strong>4. Sorting:</strong> Click on column headers (Title, Status, Last Edited) to sort.</p>
              <p><strong>5. Pagination:</strong> Navigate through multiple pages if there are many articles.</p>
              <p><strong>6. Article Selection:</strong> Click on any article row to select it and see details below.</p>
              <p><strong>7. Actions:</strong> Use the action buttons (View, Edit, More) on each article row.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 