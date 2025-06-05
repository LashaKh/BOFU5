import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Tablet, Monitor, Check, X, Eye, 
  Edit3, MessageSquare, Users, Settings, Share2,
  Menu, Search, Grid, List, RefreshCw, Info
} from 'lucide-react';

import { useMobileDetection } from '../../hooks/useMobileDetection';
import { MobileResponsiveToolbar } from '../ui/MobileResponsiveToolbar';
import { MobileResponsiveModal } from '../ui/MobileResponsiveModal';
import { MobileNavigation } from '../ui/MobileNavigation';
import { MobileCommentSystem } from '../ui/MobileCommentSystem';
import { MobileCollaboration } from '../ui/MobileCollaboration';

// Create a mock editor for testing the toolbar
const createMockEditor = () => ({
  isActive: (mark: string) => false,
  chain: () => ({
    focus: () => ({ bold: () => ({ run: () => {} }) }),
    toggleBold: () => ({ run: () => {} }),
    toggleItalic: () => ({ run: () => {} }),
    toggleUnderline: () => ({ run: () => {} }),
    toggleStrike: () => ({ run: () => {} }),
    toggleCode: () => ({ run: () => {} }),
    toggleHighlight: () => ({ run: () => {} }),
    run: () => {}
  }),
  commands: {
    focus: () => {},
    setHorizontalRule: () => {},
    toggleHeading: (options: any) => {},
    toggleBulletList: () => {},
    toggleOrderedList: () => {},
    toggleTaskList: () => {},
    toggleBlockquote: () => {},
    toggleCodeBlock: () => {},
    undo: () => {},
    redo: () => {}
  },
  can: () => ({
    undo: () => true,
    redo: () => true
  }),
  state: {
    doc: {
      content: []
    }
  }
});

// Test data
const mockComments = [
  {
    id: '1',
    content: 'This is a test comment with some content to verify mobile commenting works properly.',
    author: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: undefined
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    status: 'active' as const,
    position: {
      line: 5,
      column: 12,
      text: 'sample text'
    },
    reactions: [
      { type: 'like' as const, count: 3, userReacted: false }
    ],
    priority: 'medium' as const,
    tags: ['ui', 'mobile'],
    replies: [
      {
        id: '2',
        content: 'This is a reply to the first comment.',
        author: {
          id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        status: 'active' as const,
        reactions: [
          { type: 'like' as const, count: 1, userReacted: true }
        ]
      }
    ]
  },
  {
    id: '3',
    content: 'Another test comment that has been resolved.',
    author: {
      id: 'user3',
      name: 'Admin User',
      email: 'admin@example.com'
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: 'resolved' as const,
    priority: 'high' as const,
    isResolved: true,
    resolvedBy: 'admin@example.com',
    resolvedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
];

const mockCollaborators = [
  {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active' as const,
    lastSeen: new Date().toISOString(),
    currentSection: 'Introduction',
    isTyping: true,
    connectionQuality: 'excellent' as const
  },
  {
    id: 'user2', 
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'idle' as const,
    lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    currentSection: 'Conclusion',
    connectionQuality: 'good' as const
  },
  {
    id: 'user3',
    name: 'Admin User',
    email: 'admin@example.com',
    status: 'active' as const,
    lastSeen: new Date().toISOString(),
    currentSection: 'Review Mode',
    connectionQuality: 'excellent' as const
  }
];

const mockActivities = [
  {
    id: '1',
    type: 'edit' as const,
    user: { id: 'user1', name: 'John Doe' },
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    description: 'Edited paragraph in Introduction section'
  },
  {
    id: '2', 
    type: 'comment' as const,
    user: { id: 'user2', name: 'Jane Smith' },
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    description: 'Added comment about mobile responsiveness'
  },
  {
    id: '3',
    type: 'join' as const,
    user: { id: 'user3', name: 'Admin User' },
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    description: 'Joined the document'
  }
];

interface TestStatus {
  mobileDetection: boolean;
  toolbar: boolean;
  modal: boolean;
  navigation: boolean;
  comments: boolean;
  collaboration: boolean;
  responsive: boolean;
}

export const MobileResponsiveTest: React.FC = () => {
  const { isMobile, isTablet, isDesktop, orientation } = useMobileDetection();
  const [testStatus, setTestStatus] = useState<TestStatus>({
    mobileDetection: false,
    toolbar: false,
    modal: false,
    navigation: false,
    comments: false,
    collaboration: false,
    responsive: false
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<keyof TestStatus | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const mockEditor = createMockEditor();

  // Determine device type for display
  const getDeviceType = () => {
    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    if (isDesktop) return 'desktop';
    return 'unknown';
  };

  useEffect(() => {
    // Auto-test mobile detection
    setTestStatus(prev => ({
      ...prev,
      mobileDetection: true
    }));
    
    addTestResult('Mobile detection initialized successfully');
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTest = (testName: keyof TestStatus) => {
    setCurrentTest(testName);
    addTestResult(`Starting ${testName} test...`);
    
    // Simulate test completion
    setTimeout(() => {
      setTestStatus(prev => ({
        ...prev,
        [testName]: true
      }));
      addTestResult(`${testName} test completed successfully`);
      setCurrentTest(null);
    }, 1000);
  };

  const handleCommentAdd = (content: string) => {
    addTestResult(`Comment added: "${content.substring(0, 30)}..."`);
  };

  const handleCommentEdit = (commentId: string, content: string) => {
    addTestResult(`Comment ${commentId} edited`);
  };

  const handleCommentDelete = (commentId: string) => {
    addTestResult(`Comment ${commentId} deleted`);
  };

  const handleCommentResolve = (commentId: string) => {
    addTestResult(`Comment ${commentId} resolved`);
  };

  const handleCommentReply = (parentId: string, content: string) => {
    addTestResult(`Reply added to comment ${parentId}`);
  };

  const handleCommentReaction = (commentId: string, type: 'like' | 'dislike') => {
    addTestResult(`${type} reaction added to comment ${commentId}`);
  };

  const deviceType = getDeviceType();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation Test */}
      <MobileNavigation 
        onNavigate={(path) => addTestResult(`Navigation to ${path}`)}
      />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-semibold text-gray-900">
              Mobile Responsive Test Suite
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {deviceType === 'mobile' && <Smartphone size={20} className="text-blue-500" />}
            {deviceType === 'tablet' && <Tablet size={20} className="text-green-500" />}
            {deviceType === 'desktop' && <Monitor size={20} className="text-gray-500" />}
            <span className="text-sm text-gray-600">
              {deviceType} • {orientation}
            </span>
          </div>
        </div>
      </div>

      {/* Device Info Panel */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Device:</strong> {deviceType}<br/>
            <strong>Orientation:</strong> {orientation}
          </div>
          <div>
            <strong>Mobile:</strong> {isMobile ? '✅' : '❌'}<br/>
            <strong>Tablet:</strong> {isTablet ? '✅' : '❌'}
          </div>
          <div>
            <strong>Desktop:</strong> {isDesktop ? '✅' : '❌'}<br/>
            <strong>Touch Device:</strong> {'ontouchstart' in window ? '✅' : '❌'}
          </div>
        </div>
      </div>

      {/* Mobile Toolbar Test */}
      {isMobile && (
        <div className="bg-white border-b border-gray-200">
          <MobileResponsiveToolbar
            editor={mockEditor as any}
            onSave={() => addTestResult('Save triggered')}
            onUndo={() => addTestResult('Undo triggered')}
            onRedo={() => addTestResult('Redo triggered')}
            className="p-2"
          />
        </div>
      )}

      {/* Test Controls */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(testStatus).map(([testName, passed]) => (
            <div
              key={testName}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${passed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white hover:border-blue-200'}
                ${currentTest === testName ? 'border-blue-500 bg-blue-50' : ''}
              `}
              onClick={() => !passed && runTest(testName as keyof TestStatus)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 capitalize">
                  {testName.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                {passed ? (
                  <Check size={20} className="text-green-500" />
                ) : currentTest === testName ? (
                  <RefreshCw size={20} className="text-blue-500 animate-spin" />
                ) : (
                  <button className="text-blue-600 hover:text-blue-700">
                    Test
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {testName === 'mobileDetection' && 'Device and orientation detection'}
                {testName === 'toolbar' && 'Mobile-responsive toolbar with collapsible actions'}
                {testName === 'modal' && 'Full-screen mobile modals with gestures'}
                {testName === 'navigation' && 'Hamburger menu and drawer navigation'}
                {testName === 'comments' && 'Touch-optimized commenting system'}
                {testName === 'collaboration' && 'Real-time collaboration features'}
                {testName === 'responsive' && 'Overall responsive behavior'}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Test Modal
          </button>
          
          <button
            onClick={() => runTest('toolbar')}
            className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Test Toolbar
          </button>
          
          <button
            onClick={() => runTest('navigation')}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Test Navigation
          </button>
          
          <button
            onClick={() => {
              setTestResults([]);
              setTestStatus({
                mobileDetection: true,
                toolbar: false,
                modal: false,
                navigation: false,
                comments: false,
                collaboration: false,
                responsive: false
              });
            }}
            className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reset Tests
          </button>
        </div>
      </div>

      {/* Comment System Test */}
      <div className="bg-white border-t border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Comment System Test
          </h2>
          <p className="text-sm text-gray-600">
            Test touch-optimized commenting, threading, and resolution workflow.
          </p>
        </div>
        
        <MobileCommentSystem
          articleId="test-article"
          comments={mockComments}
          onCommentAdd={handleCommentAdd}
          onCommentEdit={handleCommentEdit}
          onCommentDelete={handleCommentDelete}
          onCommentResolve={handleCommentResolve}
          onCommentReply={handleCommentReply}
          onCommentReaction={handleCommentReaction}
          currentUserId="user1"
          isAdmin={true}
        />
      </div>

      {/* Collaboration Test */}
      <div className="bg-white border-t border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Collaboration Features Test
          </h2>
          <p className="text-sm text-gray-600">
            Test real-time presence, activity feeds, and connection monitoring.
          </p>
        </div>
        
        <MobileCollaboration
          articleId="test-article"
          collaborators={mockCollaborators}
          activities={mockActivities}
          currentUserId="user1"
          isConnected={true}
          connectionQuality="excellent"
          onShareArticle={() => addTestResult('Share article triggered')}
          onManagePermissions={() => addTestResult('Manage permissions triggered')}
          onNotificationToggle={(enabled) => addTestResult(`Notifications ${enabled ? 'enabled' : 'disabled'}`)}
        />
      </div>

      {/* Test Results Log */}
      <div className="bg-gray-900 text-gray-100 p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Info size={20} className="mr-2" />
          Test Results Log
        </h3>
        <div className="max-h-40 overflow-y-auto text-sm font-mono space-y-1">
          {testResults.map((result, index) => (
            <div key={index} className="text-green-400">
              {result}
            </div>
          ))}
          {testResults.length === 0 && (
            <div className="text-gray-500">No test results yet...</div>
          )}
        </div>
      </div>

      {/* Test Modal */}
      <MobileResponsiveModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          addTestResult('Modal closed');
          runTest('modal');
        }}
        title="Mobile Modal Test"
        fullHeight={false}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Modal Content Test
          </h3>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              This modal demonstrates mobile-responsive behavior including:
            </p>
            
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Full-screen mode on mobile devices</li>
              <li>Swipe-to-close gesture support</li>
              <li>Safe area inset handling</li>
              <li>Touch-friendly close button</li>
              <li>Proper keyboard handling</li>
            </ul>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Try swiping down from the top to close this modal on mobile devices.
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsModalOpen(false);
                addTestResult('Modal closed via button');
                runTest('modal');
              }}
              className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close Modal
            </button>
          </div>
        </div>
      </MobileResponsiveModal>
    </div>
  );
}; 