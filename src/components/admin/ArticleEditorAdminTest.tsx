import React, { useState } from 'react';
import { ArticleEditor } from '../ArticleEditor';
import type { UserProfile } from '../../types/adminApi';

export function ArticleEditorAdminTest() {
  const [testContent, setTestContent] = useState(`
# Test Article in Admin Mode

This is a test article to demonstrate the admin editing capabilities of the ArticleEditor component.

## Features to Test

1. **Admin Mode Visual Indicators**: Look for the red "ADMIN MODE" badge in the toolbar
2. **Admin Control Panel**: Click the shield icon to open admin controls
3. **Status Management**: Change article status from the admin panel
4. **Version History**: Click the history icon to view past versions
5. **Internal Notes**: Add admin-only notes visible to other admins
6. **Ownership Transfer**: Transfer article ownership to another user

## Sample Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

- List item 1
- List item 2
- List item 3

> This is a blockquote for testing purposes.

\`\`\`javascript
// Sample code block
function testAdmin() {
  console.log('Admin mode is active!');
}
\`\`\`

**Bold text** and *italic text* for formatting tests.
  `);

  // Mock admin user
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User'
  };

  // Mock original author
  const mockOriginalAuthor = {
    id: 'user-456',
    email: 'user@company.com',
    company_name: 'Test Company Inc.'
  };

  const handleStatusChange = (status: 'draft' | 'editing' | 'review' | 'final') => {
    console.log('Status changed to:', status);
    alert(`Article status changed to: ${status}`);
  };

  const handleOwnershipTransfer = (newOwnerId: string) => {
    console.log('Ownership transfer to:', newOwnerId);
    alert(`Ownership would be transferred to user: ${newOwnerId}`);
  };

  const handleAdminNote = (note: string) => {
    console.log('Admin note added:', note);
    alert(`Admin note saved: ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}`);
  };

  const handleSave = (content: string) => {
    console.log('Article saved with content length:', content.length);
    alert('Article saved successfully!');
  };

  const handleAutoSave = (content: string) => {
    console.log('Auto-save triggered with content length:', content.length);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ArticleEditor Admin Mode Test</h1>
        
        {/* Test Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-blue-900 font-semibold mb-4">🧪 Test Instructions</h2>
          <div className="space-y-2 text-blue-800">
            <p><strong>1. Admin Visual Indicators:</strong> Look for the red "ADMIN MODE" badge in the toolbar</p>
            <p><strong>2. Admin Panel:</strong> Click the shield (🛡️) icon to open the admin control panel</p>
            <p><strong>3. Status Management:</strong> Use the admin panel to change article status</p>
            <p><strong>4. Version History:</strong> Click the history (📅) icon to view version history</p>
            <p><strong>5. Admin Notes:</strong> Add internal notes in the admin panel</p>
            <p><strong>6. Context Information:</strong> View admin user and original author information</p>
          </div>
        </div>

        {/* Mock User Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 Admin User</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">ID:</span> {mockAdminUser.id}</p>
              <p><span className="font-medium">Email:</span> {mockAdminUser.email}</p>
              <p><span className="font-medium">Name:</span> {mockAdminUser.name}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">✍️ Original Author</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">ID:</span> {mockOriginalAuthor.id}</p>
              <p><span className="font-medium">Email:</span> {mockOriginalAuthor.email}</p>
              <p><span className="font-medium">Company:</span> {mockOriginalAuthor.company_name}</p>
            </div>
          </div>
        </div>

        {/* Admin Mode Editor */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Article Editor (Admin Mode)</h2>
            <p className="text-gray-600 text-sm mt-1">
              This editor is running in admin mode with all admin features enabled.
            </p>
          </div>
          
          <ArticleEditor
            articleId="test-article-123"
            initialContent={testContent}
            onSave={handleSave}
            onAutoSave={handleAutoSave}
            className="border-0"
            // Admin props
            adminMode={true}
            adminUser={mockAdminUser}
            originalAuthor={mockOriginalAuthor}
            onStatusChange={handleStatusChange}
            onOwnershipTransfer={handleOwnershipTransfer}
            onAdminNote={handleAdminNote}
          />
        </div>

        {/* Event Log */}
        <div className="mt-8 bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Event Log</h3>
          <p className="text-gray-600 text-sm">
            Admin actions will trigger console logs and alert messages. Open the browser console to see detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
} 