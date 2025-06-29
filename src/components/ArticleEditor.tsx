import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Type, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Table as TableIcon, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Highlighter, 
  Undo, 
  Redo, 
  ChevronDown, 
  Check, 
  Loader2, 
  Monitor, 
  Maximize2, 
  Minimize2, 
  Focus as FocusIcon, 
  Eye, 
  MoreVertical,
  MessageSquare,
  User,
  Users,
  Upload as UploadIcon,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  Keyboard,
  History,
  MessageCircle,
  Sparkles,
  Columns,
  CheckSquare,
  Grid3X3,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Settings,
  PaintBucket,
} from 'lucide-react';
import { ExportButton } from './ui/ExportButton';
import { ImageUpload } from './ui/ImageUpload';
import { LinkTooltip } from './ui/LinkTooltip';
import { CommentingSystem, ArticleComment } from './ui/CommentingSystem';
import { InlineCommentingExtension } from './ui/InlineCommentingExtension';
import { loadArticleContent, saveArticleContent, ArticleContent, autoSaveArticleContentAsAdmin, saveArticleContentAsAdmin } from '../lib/articleApi';
import { adminArticlesApi } from '../lib/adminApi';
import { getArticleComments } from '../lib/commentApi';
import { debounce } from 'lodash';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node } from 'prosemirror-model';
import { supabase } from '../lib/supabase';
import { joinArticlePresence, leaveArticlePresence } from '../lib/presenceApi';

// Import enhanced CSS styles
import '../styles/article-editor-enhanced.css';

// Define UserProfile interface
interface UserProfile {
  id: string;
  email: string;
  company_name?: string;
  role?: string;
  avatar_url?: string;
  status?: 'viewing' | 'editing' | 'idle';
}

// Enhanced theme hook for better state management
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Initialize from localStorage or system preference
    const saved = localStorage.getItem('article-editor-theme');
    if (saved) return saved as 'light' | 'dark';
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return { theme };
};

// Helper function for text node positioning
const getTextNodeAtOffset = (container: HTMLElement, offset: number): { node: Text; offset: number } | null => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let currentNode = walker.nextNode() as Text;
  
  while (currentNode) {
    const nodeLength = currentNode.textContent?.length || 0;
    if (currentOffset + nodeLength >= offset) {
      return { node: currentNode, offset: offset - currentOffset };
    }
    currentOffset += nodeLength;
    currentNode = walker.nextNode() as Text;
  }
  return null;
};

// Helper function to get text offset within container
const getTextOffset = (container: HTMLElement, targetNode: Node, targetOffset: number): number => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let currentNode = walker.nextNode();
  
  while (currentNode) {
    if (currentNode === targetNode) {
      return currentOffset + targetOffset;
    }
    currentOffset += currentNode.textContent?.length || 0;
    currentNode = walker.nextNode();
  }
  
  return currentOffset;
};

// Enhanced User Presence Component with Real-time Collaboration
const UserPresence = ({ articleId }: { articleId: string }) => {
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let presenceChannel: any = null;

    const initializePresence = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.log('No authenticated user for presence tracking');
          setLoading(false);
          return;
        }

        // Update user presence to mark as viewing
        const { error: presenceError } = await supabase.rpc('update_user_presence', {
          p_article_id: articleId,
          p_status: 'viewing'
        });

        if (presenceError) {
          console.error('Error updating presence:', presenceError);
        }

        // Fetch initial active users
        await fetchActiveUsers();

        // Set up real-time channel for presence updates
        presenceChannel = supabase.channel(`article_presence_${articleId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'article_presence',
            filter: `article_id=eq.${articleId}`
          }, () => {
            // Refetch active users when presence changes
            fetchActiveUsers();
          })
          .subscribe();

      } catch (error) {
        console.error('Error initializing presence:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('get_active_article_users', {
          p_article_id: articleId
        });

        if (error) {
          console.error('Error fetching active users:', error);
          return;
        }

        if (mounted) {
          const users = data?.map((user: any) => ({
            id: user.user_id,
            email: user.user_email || 'Unknown',
            company_name: user.user_company,
            role: user.user_role,
            status: user.status
          })) || [];
          
          setActiveUsers(users);
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    initializePresence();

    // Update status to editing when user interacts
    const handleStatusChange = async (status: 'viewing' | 'editing' | 'idle') => {
      try {
        await supabase.rpc('update_user_presence', {
          p_article_id: articleId,
          p_status: status
        });
      } catch (error) {
        console.error('Error updating status:', error);
      }
    };

    // Debounced status change to prevent rapid updates during comment interactions
    let statusChangeTimeout: NodeJS.Timeout | null = null;
    
    const debouncedStatusChange = (status: 'viewing' | 'editing' | 'idle') => {
      if (statusChangeTimeout) {
        clearTimeout(statusChangeTimeout);
      }
      statusChangeTimeout = setTimeout(() => {
        handleStatusChange(status);
      }, 300); // 300ms debounce to prevent rapid status changes
    };

    // Listen for editor focus/blur events
    const handleFocus = () => debouncedStatusChange('editing');
    const handleBlur = () => debouncedStatusChange('viewing');

    const editorElement = document.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('focus', handleFocus);
      editorElement.addEventListener('blur', handleBlur);
    }

    // Cleanup function
    return () => {
      mounted = false;
      
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }

      if (editorElement) {
        editorElement.removeEventListener('focus', handleFocus);
        editorElement.removeEventListener('blur', handleBlur);
      }

      // Leave article when component unmounts
      supabase.rpc('leave_article', { p_article_id: articleId });
    };
  }, [articleId]);

  const getInitials = (email: string) => {
    if (!email) return '?';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const getStatusColor = (status?: string, role?: string) => {
    if (role === 'admin') return 'from-red-400 to-red-600';
    if (role === 'manager') return 'from-blue-400 to-blue-600';
    if (status === 'editing') return 'from-green-400 to-green-600';
    return 'from-blue-400 to-purple-500';
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-1">
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      {activeUsers.slice(0, 5).map((user) => (
        <div key={user.id} className="relative group">
          <div 
            className={`w-8 h-8 bg-gradient-to-br ${getStatusColor(user.status, user.role)} rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800 shadow-sm transition-transform hover:scale-110`}
            title={`${user.email}${user.company_name ? ` (${user.company_name})` : ''} - ${user.status || 'viewing'}${user.role ? ` [${user.role}]` : ''}`}
          >
            {getInitials(user.email)}
          </div>
          {user.status === 'editing' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-800"></div>
          )}
        </div>
      ))}
      
      {activeUsers.length > 5 && (
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800 shadow-sm">
          +{activeUsers.length - 5}
        </div>
      )}
      
      {activeUsers.length === 0 && (
        <div className="text-sm text-gray-500">No active collaborators</div>
      )}
    </div>
  );
};

// Enhanced Undo/Redo History Panel with better design
const UndoRedoHistoryPanel = ({ editor }: { editor: any }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateCounts = () => {
      // Access history from editor if available
      const history = editor.extensionManager.extensions.find((ext: any) => ext.name === 'history');
      if (history) {
        // Mock counts for demonstration
        setUndoCount(Math.min(editor.can().undo() ? 5 : 0, 5));
        setRedoCount(Math.min(editor.can().redo() ? 3 : 0, 3));
      }
    };

    updateCounts();
    editor.on('transaction', updateCounts);

    return () => {
      editor.off('transaction', updateCounts);
    };
  }, [editor]);

  const handleBulkUndo = (steps: number) => {
    for (let i = 0; i < steps && editor?.can().undo(); i++) {
      editor.chain().undo().run();
    }
    setShowHistory(false);
  };

  const handleBulkRedo = (steps: number) => {
    for (let i = 0; i < steps && editor?.can().redo(); i++) {
      editor.chain().redo().run();
    }
    setShowHistory(false);
  };

  return (
    <div className="relative flex items-center space-x-1">
      <ToolbarButton
        icon={Undo}
        label={`Undo${undoCount > 0 ? ` (${undoCount})` : ''}`}
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!editor?.can().undo()}
        variant="ghost"
        badge={undoCount > 0 ? undoCount : undefined}
      />
      <ToolbarButton
        icon={Redo}
        label={`Redo${redoCount > 0 ? ` (${redoCount})` : ''}`}
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!editor?.can().redo()}
        variant="ghost"
        badge={redoCount > 0 ? redoCount : undefined}
      />
      <ToolbarButton
        icon={History}
        label="History Options"
        onClick={() => setShowHistory(!showHistory)}
        variant="ghost"
        size="sm"
      />

      {/* History Dropdown */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-50 min-w-[200px]"
          >
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                Bulk Operations
              </div>
              {[1, 5, 10, 20].map((steps) => (
                <div key={`undo-${steps}`} className="flex space-x-1">
                  <button
                    onClick={() => handleBulkUndo(steps)}
                    disabled={!editor?.can().undo()}
                    className="flex-1 text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Undo {steps} steps
                  </button>
                  <button
                    onClick={() => handleBulkRedo(steps)}
                    disabled={!editor?.can().redo()}
                    className="flex-1 text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Redo {steps} steps
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Professional Color Picker Component
const ColorPicker = ({ 
  onColorSelect, 
  currentColor, 
  type = 'text' 
}: { 
  onColorSelect: (color: string) => void;
  currentColor?: string;
  type?: 'text' | 'highlight';
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const textColors = [
    { name: 'Default', value: '#000000' },
    { name: 'Gray', value: '#6b7280' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Green', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
  ];

  const highlightColors = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#bbf7d0' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Purple', value: '#e9d5ff' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Orange', value: '#fed7aa' },
    { name: 'Red', value: '#fecaca' },
    { name: 'Gray', value: '#f3f4f6' },
  ];

  const colors = type === 'highlight' ? highlightColors : textColors;

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <ToolbarButton
        icon={type === 'highlight' ? Highlighter : PaintBucket}
        label={type === 'highlight' ? 'Highlight Color' : 'Text Color'}
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
      >
        <div 
          className="w-3 h-3 rounded-sm ml-1 border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: currentColor || (type === 'highlight' ? '#fef08a' : '#000000') }}
        />
      </ToolbarButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50"
          >
            <div className="grid grid-cols-4 gap-2 min-w-[200px]">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorSelect(color.value)}
                  className="group relative w-8 h-8 rounded border-2 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {currentColor === color.value && (
                    <Check className="w-4 h-4 text-gray-800 absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Custom color input */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <input
                type="color"
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-full h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
                title="Custom color"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Enhanced Link Editor Modal
const LinkEditor = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialUrl = '', 
  initialText = '' 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, text: string) => void;
  initialUrl?: string;
  initialText?: string;
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setText(initialText);
    }
  }, [isOpen, initialUrl, initialText]);

  const handleSave = () => {
    if (url.trim()) {
      onSave(url.trim(), text.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {initialUrl ? 'Edit Link' : 'Add Link'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link Text (optional)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Link description"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {initialUrl ? 'Update' : 'Add'} Link
          </button>
        </div>
        
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Press Ctrl+Enter to save quickly
        </div>
      </motion.div>
    </motion.div>
  );
};

// Simple type for user profile
interface UserProfile {
  id: string;
  email: string;
  company_name?: string;
  role?: string;
  avatar_url?: string;
  status?: 'viewing' | 'editing' | 'idle';
}

// Enhanced helper functions
const htmlToMarkdown = (html: string): string => {
  // Enhanced HTML to markdown conversion with better pattern matching
  return html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n')
    
    // Text formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    
    // Links and images
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    
    // Lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    
    // Blockquotes and code
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n')
    
    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    
    // Clean up remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();
};

const autoSaveArticleContent = async (
  articleId: string, 
  content: string, 
  adminMode: boolean = false, 
  adminUserId?: string, 
  originalAuthorId?: string
) => {
  if (adminMode && adminUserId && originalAuthorId) {
    const success = await autoSaveArticleContentAsAdmin(articleId, content, adminUserId, originalAuthorId);
    return {
      success,
      error: success ? undefined : 'Failed to save as admin'
    };
  }
  return saveArticleContent(articleId, content);
};

interface ArticleEditorProps {
  articleId?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onAutoSave?: (content: string) => void;
  className?: string;
  // Admin-specific props
  adminMode?: boolean;
  adminUser?: UserProfile | null;
  originalAuthor?: UserProfile | null;
  onStatusChange?: (status: 'draft' | 'editing' | 'review' | 'final' | 'published') => void;
  onOwnershipTransfer?: (newOwnerId: string) => void;
  onAdminNote?: (note: string) => void;
}

type ViewMode = 'editor' | 'preview' | 'split';
type FocusMode = 'normal' | 'focused' | 'zen';

// Enhanced Toolbar Button Component with premium design
const ToolbarButton = ({ 
  icon: Icon, 
  label, 
  isActive = false, 
  onClick, 
  disabled = false,
  variant = 'default',
  size = 'sm',
  className = '',
  badge,
  children
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  badge?: string | number;
  children?: React.ReactNode;
}) => {
  const baseClasses = "relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
  
  const variantClasses = {
    default: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md border border-primary/20",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md border border-green-400/20",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow-md border border-amber-400/20",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md border border-red-400/20",
    ghost: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
    outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
  };

  const sizeClasses = {
    xs: 'h-7 px-2 text-xs rounded-md',
    sm: 'h-8 px-3 text-sm rounded-lg',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-xl'
  };

  const activeClasses = isActive ? 
    "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-[0.98]" : 
    variantClasses[variant];

  // Enhanced click handler with proper event handling
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔘 Toolbar button clicked:', label);
    
    if (!disabled) {
      try {
        onClick();
      } catch (error) {
        console.error('❌ Error in toolbar button onClick:', error);
      }
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onMouseDown={(e) => {
        // Prevent default mousedown behavior that might cause scrolling
        e.preventDefault();
      }}
      disabled={disabled}
      title={label}
      type="button"
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${activeClasses}
        ${className}
      `}
    >
      <Icon className={`${size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'} ${children ? 'mr-1.5' : ''}`} />
      {children && <span className="hidden sm:inline">{children}</span>}
      {badge && (
        <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </motion.button>
  );
};

// Enhanced Toolbar Separator
const ToolbarSeparator = () => (
  <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-1" />
);

// Enhanced Status Indicator with beautiful animations
const StatusIndicator = ({ 
  status, 
  isAutoSaving, 
  lastSaved,
  theme 
}: { 
  status: 'saved' | 'saving' | 'error' | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  theme: 'light' | 'dark';
}) => {
  const getStatusConfig = () => {
    if (isAutoSaving || status === 'saving') {
      return {
        icon: Loader2,
        text: 'Saving...',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        iconClassName: 'animate-spin text-blue-500'
      };
    }
    
    if (status === 'saved') {
      return {
        icon: CheckCircle,
        text: lastSaved ? `Saved ${formatTimeAgo(lastSaved)}` : 'Saved',
        className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
        iconClassName: 'text-green-500'
      };
    }
    
    if (status === 'error') {
      return {
        icon: AlertCircle,
        text: 'Save failed',
        className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
        iconClassName: 'text-red-500'
      };
    }
    
    return {
      icon: Save,
      text: 'Ready',
      className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      iconClassName: 'text-gray-500'
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
        border backdrop-blur-sm
        ${config.className}
      `}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      <span>{config.text}</span>
    </motion.div>
  );
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  articleId,
  initialContent = '',
  onSave,
  onAutoSave,
  className = '',
  // Admin-specific props
  adminMode = false,
  adminUser,
  originalAuthor,
  onStatusChange,
  onOwnershipTransfer,
  onAdminNote
}) => {
  // Enhanced theme management
  const { theme } = useTheme();
  
  // UI State with better organization
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [focusMode, setFocusMode] = useState<FocusMode>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkTooltip, setShowLinkTooltip] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('#fef08a');
  
  // Content and Save State
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Force re-render counter for ensuring UI updates
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Comments and Collaboration
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [textSelection, setTextSelection] = useState<{ start: number; end: number; text: string; range?: Range } | null>(null);
  const [linkData, setLinkData] = useState<any>(null);
  
  // Word count and stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  const [article, setArticle] = useState<ArticleContent | null>(null);
  const mounted = useRef(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [linkTooltip, setLinkTooltip] = useState<{
    show: boolean;
    data: any | null;
    position: { x: number; y: number };
  }>({ show: false, data: null, position: { x: 0, y: 0 } });

  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  
  // Use a ref to access current comments without causing re-renders
  const commentsRef = useRef<ArticleComment[]>([]);
  
  // Update the ref whenever comments change
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const loadComments = useCallback(async () => {
    if (!articleId) return;
    try {
      const fetchedComments = await getArticleComments(articleId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('❌ Error loading comments in ArticleEditor:', error);
    }
  }, [articleId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Text selection tracking for inline comments
  useEffect(() => {
    if (!editorRef.current) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setTextSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedTextContent = selection.toString().trim();

      if (!selectedTextContent || selectedTextContent.length < 3) {
        setTextSelection(null);
        return;
      }

      // Check if selection is within the editor
      if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) {
        setTextSelection(null);
        return;
      }

      // Calculate text offsets
      const editorTextContent = editorRef.current.textContent || '';
      const startNode = getTextNodeAtOffset(editorRef.current, 0);
      
      if (startNode) {
        const startOffset = getTextOffset(editorRef.current, range.startContainer, range.startOffset);
        const endOffset = startOffset + selectedTextContent.length;

        setTextSelection({
          start: startOffset,
          end: endOffset,
          text: selectedTextContent,
          range: range.cloneRange()
        });
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorRef]);

  // Load article content when articleId is provided
  useEffect(() => {
    let isMounted = true;

    const loadArticleData = async () => {
      if (!articleId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔄 Loading article content...', { articleId, adminMode });

        let articleData;

        if (adminMode) {
          // Use admin API to load article
          const result = await adminArticlesApi.getArticle(articleId);
          if (result.error || !result.data) {
            console.error('❌ Error loading article as admin:', result.error);
            setIsLoading(false);
            return;
          }
          articleData = {
            id: result.data.id,
            title: result.data.title,
            content: result.data.article_content,
            editing_status: result.data.editing_status,
            last_edited_at: result.data.last_edited_at,
            last_edited_by: result.data.last_edited_by,
            article_version: result.data.article_version,
            user_id: result.data.user_id,
            product_name: result.data.product_name,
            created_at: result.data.created_at,
            updated_at: result.data.updated_at
          };
        } else {
          // Use regular user API to load article
          const result = await loadArticleContent(articleId);
          if (!result.success || !result.data) {
            console.error('❌ Error loading article content:', result.error);
            setIsLoading(false);
            return;
          }
          articleData = result.data;
        }

        if (isMounted && articleData) {
          console.log('✅ Article loaded successfully:', articleData.id);
          setArticle(articleData);
          
          // Set initial content if not already set
          if (articleData.content && !content) {
            setContent(articleData.content);
            // Note: Editor will be updated in a separate useEffect when editor is ready
          }
        }
      } catch (error) {
        console.error('❌ Error loading article:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadArticleData();

    return () => {
      isMounted = false;
    };
  }, [articleId, adminMode]);

  const getEditorExtensions = useMemo(() => {
    return [
      StarterKit.configure({
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
        // Disable extensions we'll add individually to avoid duplicates
        strike: false,
        horizontalRule: false,
        codeBlock: false,
        paragraph: {
          HTMLAttributes: {
            class: 'text-base text-gray-300 leading-relaxed',
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['ftp', 'mailto'],
        HTMLAttributes: {
          class: 'text-blue-400 hover:text-blue-300 transition-colors cursor-pointer',
        },
      }),
      Highlight.configure({ 
        multicolor: true,
        HTMLAttributes: {
          class: 'text-highlight'
        }
      }),
      Typography,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ];
  }, []);

  // Memoize the decorations function to prevent excessive re-renders
  // Use a stable function that gets the current highlightedCommentId from ref
  const highlightedCommentIdRef = useRef(highlightedCommentId);
  
  const editorDecorations = useCallback((state: any) => {
    const currentHighlightedId = highlightedCommentIdRef.current;
    if (!currentHighlightedId) return null;

    const decorations: Decoration[] = [];
    const commentToHighlight = commentsRef.current.find(c => c.id === currentHighlightedId);

    if (commentToHighlight && typeof commentToHighlight.selection_start === 'number' && typeof commentToHighlight.selection_end === 'number') {
      decorations.push(
        Decoration.inline(commentToHighlight.selection_start, commentToHighlight.selection_end, {
          class: 'comment-highlight-active',
        })
      );
    }

    return DecorationSet.create(state.doc, decorations);
  }, []); // Empty dependencies - this function is now stable

  const editor = useEditor({
    extensions: getEditorExtensions,
    content: content,
    editable: true,
    autofocus: true,
    editorProps: {
      attributes: {
        class: `prose ${theme === 'dark' ? 'prose-invert' : ''} max-w-none focus:outline-none p-6 editor-scrollbar`,
        'data-testid': 'article-editor-content',
        contenteditable: 'true', // Explicitly ensure contenteditable
        spellcheck: 'false', // Disable spellcheck to prevent Grammarly interference
      },
      decorations: editorDecorations,
      handleKeyDown: (view, event) => {
        console.log('🎹 Key event in editor:', event.key, event.type);
        return false; // Allow normal key handling
      },
      handleClick: (view, pos, event) => {
        console.log('🖱️ Click event in editor:', pos);
        // Ensure editor gets focus on click
        if (editor && !editor.isFocused) {
          editor.commands.focus();
        }
        return false; // Allow normal click handling
      },
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (newContent !== content) { // Only update if content actually changed
        console.log('✏️ Editor content updated:', newContent.length, 'characters');
        setContent(newContent);
        setHasUnsavedChanges(true);
        
        // Force UI update to ensure changes are visible
        setUpdateCounter(prev => prev + 1);
        
        if (articleId && newContent.trim() !== content.trim()) {
          debouncedAutoSave(newContent);
        }
      }
    },
    onCreate: ({ editor }) => {
      console.log('🎯 Editor created successfully', { 
        isEditable: editor.isEditable, 
        isFocused: editor.isFocused 
      });
      
      // Force focus after a short delay to ensure editor is ready
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.focus();
          console.log('🎯 Editor focused programmatically');
        }
      }, 100);
    },
    onFocus: () => {
      console.log('🎯 Editor received focus');
    },
    onBlur: () => {
      console.log('🎯 Editor lost focus');
    },
  }, [getEditorExtensions, theme, content]); // Removed editorDecorations from dependencies
  
  // Update ref when highlightedCommentId changes and force decoration update
  useEffect(() => {
    highlightedCommentIdRef.current = highlightedCommentId;
    // Force decoration update without recreating editor
    if (editor && !editor.isDestroyed) {
      editor.view.updateState(editor.view.state);
    }
  }, [highlightedCommentId, editor]);

  // Auto-save functionality with stable debounced function
  const debouncedAutoSave = useMemo(
    () => debounce(async (content: string) => {
      if (!articleId || !content.trim()) return;
      
      try {
        setIsAutoSaving(true);
        setSaveStatus('saving');
        const result = await autoSaveArticleContent(articleId, content, adminMode, adminUser?.id, originalAuthor?.id);
        
        if (result.success) {
          setSaveStatus('saved');
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          if (onAutoSave) onAutoSave(content);
        } else {
          setSaveStatus('error');
          console.error('Auto-save failed:', result.error);
        }
      } catch (error) {
        setSaveStatus('error');
        console.error('Auto-save error:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 2000),
    [articleId, adminMode, adminUser, originalAuthor, onAutoSave] // Stable dependencies only
  );

  // Manual save functionality
  const handleSave = async () => {
    if (!editor || !articleId) return;
    
    const currentContent = editor.getHTML();
    
    try {
      setIsAutoSaving(true);
      setSaveStatus('saving');
      
      let result;
      if (adminMode && adminUser?.id && originalAuthor?.id) {
        const adminResult = await saveArticleContentAsAdmin(
          articleId, 
          currentContent, 
          adminUser.id, 
          originalAuthor.id, 
          'editing'
        );
        result = {
          success: !!adminResult,
          error: adminResult ? undefined : 'Failed to save as admin'
        };
      } else {
        result = await saveArticleContent(articleId, currentContent);
      }
      
      if (result.success) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        if (onSave) onSave(currentContent);
      } else {
        setSaveStatus('error');
        console.error('Save failed:', result.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Enhanced word count calculation
  const updateWordCount = useCallback((content: string) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const reading = Math.ceil(words / 200); // 200 words per minute
    
    setWordCount(words);
    setCharCount(chars);
    setReadingTime(reading);
  }, []);

  // Monitor content changes for word count
  useEffect(() => {
    if (content) {
      updateWordCount(content);
    }
  }, [content, updateWordCount]);

  const hasAdminUser = useMemo(() => !!adminUser, [adminUser]);
  const hasOriginalAuthor = useMemo(() => originalAuthor?.id === adminUser?.id, [originalAuthor, adminUser]);

  // Handle image insert
  const handleImageInsert = (imageUrl: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
  };

  // Handle edit link
  const handleEditLink = (linkData: any) => {
    setLinkData(linkData);
    setShowLinkEditor(true);
  };

  // Handle link save from modal
  const handleLinkSave = (url: string, text: string) => {
    if (!editor) return;
    
    if (text) {
      // Insert link with custom text
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
    } else {
      // Set link for selected text or insert URL as text
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
    
    setShowLinkEditor(false);
    setLinkData(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (isCtrlOrCmd) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSave();
            break;
          case 'm':
            event.preventDefault();
            setShowComments(!showComments);
            break;
        }
      }

      // Escape key
      if (event.key === 'Escape') {
        setShowImageUpload(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showComments]);

  // Auto-show comments if there are existing comments
  useEffect(() => {
    if (comments.length > 0 && !showComments) {
      setShowComments(true);
    }
  }, [comments.length]);

  // Cleanup debounced save on unmount
  useEffect(() => {
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [debouncedAutoSave]);

  // Update editor content when article is loaded and editor is ready
  useEffect(() => {
    if (editor && !editor.isDestroyed && article && article.content) {
      // Only update editor if we don't have any content yet (initial load)
      // Don't reset user changes back to original article content
      const shouldUpdateContent = !content;
      
      if (shouldUpdateContent) {
        console.log('🔄 Setting editor content from loaded article (initial load only):', {
          articleId: article.id,
          hasContent: !!article.content,
          adminMode,
          contentLength: article.content.length
        });
        editor.commands.setContent(article.content);
        setContent(article.content);
      } else {
        console.log('⏭️ Skipping content update - user has made changes:', {
          currentContentLength: content.length,
          articleContentLength: article.content.length,
          hasUserChanges: content !== article.content
        });
      }
    }
  }, [editor, article, adminMode]); // Removed 'content' from dependencies to prevent reset loop

  // Focus management effect - ensure editor is focusable
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Double-check editable state
      if (!editor.isEditable) {
        console.log('⚠️ Editor not editable, making it editable');
        editor.setEditable(true);
      }
      
      // Log editor state for debugging
      console.log('📊 Editor state:', {
        isEditable: editor.isEditable,
        isFocused: editor.isFocused,
        isEmpty: editor.isEmpty,
        canEdit: editor.can().insertContent('test')
      });
    }
  }, [editor]);

  // Add a manual focus handler for the editor container
  const handleEditorContainerClick = useCallback((e: React.MouseEvent) => {
    console.log('🖱️ Editor container clicked');
    if (editor && !editor.isDestroyed) {
      // Small delay to ensure click event completes
      setTimeout(() => {
        editor.commands.focus();
        console.log('🎯 Editor focused from container click');
      }, 10);
    }
  }, [editor]);

  // Enhanced command handlers that maintain selection and focus
  const executeCommand = useCallback((commandFn: () => any, commandName: string) => {
    if (!editor || editor.isDestroyed) {
      console.error('❌ Editor not available for command:', commandName);
      return false;
    }

    try {
      console.log('🎯 Executing command:', commandName, {
        hasSelection: !editor.state.selection.empty,
        selectionFrom: editor.state.selection.from,
        selectionTo: editor.state.selection.to,
        isFocused: editor.isFocused,
        isEditable: editor.isEditable
      });

      // Store the current selection
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      
      console.log('📝 Selected text:', selectedText);

      // Execute the command
      const result = commandFn();
      
      console.log('✅ Command executed:', commandName, result);
      
      // Force editor focus and UI update
      if (!editor.isFocused) {
        editor.commands.focus();
      }
      
      // Force editor to update its internal state and trigger re-render
      setTimeout(() => {
        editor.commands.focus();
        // Trigger a content update to force re-render
        const currentContent = editor.getHTML();
        setContent(currentContent);
        console.log('🔄 Forced UI update after command:', commandName);
      }, 10);
      
      return result;
    } catch (error) {
      console.error('❌ Error executing command:', commandName, error);
      return false;
    }
  }, [editor]);

  const toggleBold = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBold().run(), 'toggleBold');
  }, [editor, executeCommand]);

  const toggleItalic = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleItalic().run(), 'toggleItalic');
  }, [editor, executeCommand]);

  const toggleUnderline = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleUnderline().run(), 'toggleUnderline');
  }, [editor, executeCommand]);

  const toggleStrike = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleStrike().run(), 'toggleStrike');
  }, [editor, executeCommand]);

  const setTextColor = useCallback((color: string) => {
    return executeCommand(() => editor?.chain().focus().setColor(color).run(), `setColor(${color})`);
  }, [editor, executeCommand]);

  const setHighlight = useCallback((color: string) => {
    return executeCommand(() => editor?.chain().focus().toggleHighlight({ color }).run(), `setHighlight(${color})`);
  }, [editor, executeCommand]);

  const toggleHeading = useCallback((level: 1 | 2 | 3 | 4) => {
    return executeCommand(() => editor?.chain().focus().toggleHeading({ level }).run(), `toggleHeading(${level})`);
  }, [editor, executeCommand]);

  const toggleBulletList = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBulletList().run(), 'toggleBulletList');
  }, [editor, executeCommand]);

  const toggleOrderedList = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleOrderedList().run(), 'toggleOrderedList');
  }, [editor, executeCommand]);

  const setTextAlign = useCallback((alignment: 'left' | 'center' | 'right') => {
    return executeCommand(() => editor?.chain().focus().setTextAlign(alignment).run(), `setTextAlign(${alignment})`);
  }, [editor, executeCommand]);

  const toggleBlockquote = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBlockquote().run(), 'toggleBlockquote');
  }, [editor, executeCommand]);

  const toggleCodeBlock = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleCodeBlock().run(), 'toggleCodeBlock');
  }, [editor, executeCommand]);


  // Render main toolbar
  const renderMainToolbar = () => (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`
        ${focusMode === 'zen' ? 'hidden' : 'block'}
        bg-white/95 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4
        ${theme === 'dark' ? 'bg-gray-900/95 border-gray-700/50 dark' : ''}
        fixed top-20 z-40 w-full shadow-sm
      `}
    >
      {/* Top toolbar row */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: File operations */}
        <div className="flex items-center gap-3">
          <ToolbarButton
            icon={Save}
            label="Save (Ctrl+S)"
            onClick={handleSave}
            disabled={isAutoSaving}
            variant="primary"
            size="md"
          >
            Save
          </ToolbarButton>
          
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1 gap-1">
            <ExportButton 
              editor={editor}
              articleTitle={article?.title || 'Untitled Article'}
              articleId={articleId}
            />
            <ToolbarButton
              icon={Upload}
              label="Import"
              onClick={() => setShowImageUpload(true)}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>

        {/* Center: Status indicator */}
        <div className="flex items-center gap-3">
          <StatusIndicator 
            status={saveStatus}
            isAutoSaving={isAutoSaving}
            lastSaved={lastSaved}
            theme={theme}
          />
          {articleId && (
            <UserPresence articleId={articleId} />
          )}
        </div>

        {/* Right: View and settings controls */}
        <div className="flex items-center gap-3">
          {/* Focus and theme controls */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1 gap-1">
            <ToolbarButton
              icon={MessageCircle}
              label="Toggle Comments (Ctrl+M)"
              isActive={showComments}
              onClick={() => setShowComments(!showComments)}
              variant={showComments ? 'primary' : 'ghost'}
              size="sm"
              badge={comments.length > 0 ? comments.length : undefined}
            />
            <ToolbarButton
              icon={focusMode === 'zen' ? Minimize2 : Maximize2}
              label={focusMode === 'zen' ? 'Exit Zen Mode' : 'Zen Mode'}
              onClick={() => setFocusMode(focusMode === 'zen' ? 'normal' : 'zen')}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Main formatting toolbar */}
      <div className="flex items-center justify-between">
        {/* Left: Primary formatting tools */}
        <div className="flex items-center gap-3">
          {/* Undo/Redo */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1">
            <UndoRedoHistoryPanel editor={editor} />
          </div>

          <ToolbarSeparator />

          {/* Text formatting */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1">
            <ToolbarButton
              icon={Bold}
              label="Bold (Ctrl+B)"
              isActive={editor?.isActive('bold')}
              onClick={toggleBold}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Italic}
              label="Italic (Ctrl+I)"
              isActive={editor?.isActive('italic')}
              onClick={toggleItalic}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={UnderlineIcon}
              label="Underline (Ctrl+U)"
              isActive={editor?.isActive('underline')}
              onClick={toggleUnderline}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Strikethrough}
              label="Strikethrough"
              isActive={editor?.isActive('strike')}
              onClick={toggleStrike}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Headings */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1">
            <ToolbarButton
              icon={Heading1}
              label="Heading 1"
              isActive={editor?.isActive('heading', { level: 1 })}
              onClick={() => toggleHeading(1)}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Heading2}
              label="Heading 2"
              isActive={editor?.isActive('heading', { level: 2 })}
              onClick={() => toggleHeading(2)}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Heading3}
              label="Heading 3"
              isActive={editor?.isActive('heading', { level: 3 })}
              onClick={() => toggleHeading(3)}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Heading4}
              label="Heading 4"
              isActive={editor?.isActive('heading', { level: 4 })}
              onClick={() => toggleHeading(4)}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Lists and alignment */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1">
            <ToolbarButton
              icon={List}
              label="Bullet List"
              isActive={editor?.isActive('bulletList')}
              onClick={toggleBulletList}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={ListOrdered}
              label="Numbered List"
              isActive={editor?.isActive('orderedList')}
              onClick={toggleOrderedList}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Text alignment */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1">
            <ToolbarButton
              icon={AlignLeft}
              label="Align Left"
              isActive={editor?.isActive({ textAlign: 'left' })}
              onClick={() => setTextAlign('left')}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={AlignCenter}
              label="Align Center"
              isActive={editor?.isActive({ textAlign: 'center' })}
              onClick={() => setTextAlign('center')}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={AlignRight}
              label="Align Right"
              isActive={editor?.isActive({ textAlign: 'right' })}
              onClick={() => setTextAlign('right')}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>

        {/* Right: Advanced tools and stats */}
        <div className="flex items-center gap-3">
          {/* Insert tools */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1">
            <ToolbarButton
              icon={LinkIcon}
              label="Insert Link"
              isActive={editor?.isActive('link')}
              onClick={() => {
                const selectedText = editor?.state.doc.textBetween(
                  editor.state.selection.from,
                  editor.state.selection.to
                );
                setSelectedText(selectedText || '');
                setShowLinkEditor(true);
              }}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={ImageIcon}
              label="Insert Image"
              onClick={() => setShowImageUpload(true)}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={TableIcon}
              label="Insert Table"
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Quote}
              label="Quote"
              isActive={editor?.isActive('blockquote')}
              onClick={toggleBlockquote}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Code}
              label="Code Block"
              isActive={editor?.isActive('codeBlock')}
              onClick={toggleCodeBlock}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Text styling */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1">
            <ColorPicker
              onColorSelect={(color) => {
                setTextColor(color);
                setCurrentTextColor(color);
              }}
              currentColor={currentTextColor}
              type="text"
            />
            <ColorPicker
              onColorSelect={(color) => {
                setHighlight(color);
                setCurrentHighlightColor(color);
              }}
              currentColor={currentHighlightColor}
              type="highlight"
            />
          </div>

          <ToolbarSeparator />

          {/* Word count and stats */}
          <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100/50 dark:bg-gray-800/50 px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">{wordCount} words</span>
              <span>{charCount} chars</span>
              <span>{readingTime} min read</span>
              {showComments && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{comments.length}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Prevent unwanted scrolling behavior
  useEffect(() => {
    const preventScrollOnClick = (e: Event) => {
      // Check if the click target is a toolbar button
      const target = e.target as HTMLElement;
      if (target && target.closest('[role="button"]') || target.closest('button')) {
        // Prevent any scroll-related behavior
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add scroll prevention
    document.addEventListener('scroll', (e) => {
      // If we detect unwanted scrolling during button clicks, prevent it
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        e.preventDefault();
      }
    }, { passive: false });

    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) {
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`
        ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}
        ${className}
        ${theme === 'dark' ? 'bg-gray-900 dark' : 'bg-gray-50'}
        w-full flex flex-col
        ${focusMode === 'zen' ? 'h-screen' : ''}
      `}
      style={{
        ...(focusMode === 'zen' && {
          overflow: 'auto',
        })
      }}
    >
      {/* Custom styles for heading hierarchy */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .article-editor-content h1 {
            font-size: 2.5rem !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            margin-top: 2rem !important;
            margin-bottom: 1rem !important;
            color: ${theme === 'dark' ? '#f9fafb' : '#111827'} !important;
          }
          .article-editor-content h2 {
            font-size: 2rem !important;
            font-weight: 600 !important;
            line-height: 1.3 !important;
            margin-top: 1.75rem !important;
            margin-bottom: 0.875rem !important;
            color: ${theme === 'dark' ? '#f3f4f6' : '#1f2937'} !important;
          }
          .article-editor-content h3 {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
            line-height: 1.4 !important;
            margin-top: 1.5rem !important;
            margin-bottom: 0.75rem !important;
            color: ${theme === 'dark' ? '#e5e7eb' : '#374151'} !important;
          }
          .article-editor-content h4 {
            font-size: 1.25rem !important;
            font-weight: 600 !important;
            line-height: 1.5 !important;
            margin-top: 1.25rem !important;
            margin-bottom: 0.625rem !important;
            color: ${theme === 'dark' ? '#d1d5db' : '#4b5563'} !important;
          }
          .article-editor-content p {
            font-size: 1.125rem !important;
            line-height: 1.7 !important;
            margin-bottom: 1rem !important;
            color: ${theme === 'dark' ? '#d1d5db' : '#374151'} !important;
          }
        `
      }} />

      {/* Main toolbar - Fixed at top */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        {renderMainToolbar()}
      </div>

      {/* Main content area with proper layout - Make wider overall */}
      <div className="flex-1 flex overflow-hidden pt-28" style={{ maxWidth: '100vw' }}>
        {/* Editor area - takes most space */}
        <div className={`flex-1 flex flex-col min-w-0 ${focusMode === 'zen' ? 'overflow-y-auto' : 'overflow-hidden'}`} style={{ minWidth: '60%' }}>
          {/* Editor container - properly contained with overflow handling */}
          <div className={`flex-1 ${focusMode === 'zen' ? 'overflow-visible' : 'overflow-y-auto'}`}>
            <div 
              ref={editorRef}
              data-editor="true"
              className={`
                px-8 pt-8 min-h-full
                ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
                ${focusMode === 'zen' ? 'prose-2xl max-w-5xl mx-auto' : 'prose-xl max-w-none'}
                ${isMobile ? 'prose-lg' : ''}
                w-full leading-relaxed
                article-editor-content
              `}
              onClick={handleEditorContainerClick}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              style={{
                scrollBehavior: 'auto', // Prevent smooth scrolling that might interfere
                ...(focusMode === 'zen' && {
                  minHeight: '100vh',
                  paddingBottom: '50vh', // Extra space for zen mode scrolling
                })
              }}
            >
              <EditorContent 
                editor={editor} 
                className={`
                  prose prose-xl max-w-none focus:outline-none
                  ${theme === 'dark' ? 'prose-invert dark' : ''}
                  ${focusMode === 'zen' ? 'prose-2xl max-w-5xl mx-auto' : 'prose-xl max-w-none'}
                  ${isMobile ? 'prose-lg' : ''}
                  w-full leading-relaxed
                `}
                style={{
                  lineHeight: focusMode === 'zen' ? '2' : '1.8',
                  fontSize: '18px',
                  paddingBottom: '2rem', // Minimal bottom padding
                  maxWidth: focusMode === 'zen' ? '1400px' : 'none',
                  margin: focusMode === 'zen' ? '0 auto' : '0',
                  pointerEvents: 'auto', // Ensure pointer events are enabled
                  userSelect: 'text', // Ensure text selection is enabled
                  cursor: 'text', // Show text cursor
                  minHeight: '200px', // Ensure minimum height for clicking
                }}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
              
              {/* Empty state hint */}
              {editor?.isEmpty && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-12 left-12 text-gray-400 pointer-events-none select-none"
                >
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <Sparkles size={20} className="text-blue-400 animate-pulse-glow" />
                      <span className="text-xl font-light">Start writing your article here...</span>
                    </div>
                    {article?.product_name && (
                      <div className="text-base text-gray-500 max-w-2xl">
                        <div className="font-medium text-gray-600 mb-3 text-lg">Article: {article.product_name}</div>
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <span className="text-blue-500 mt-1">💡</span>
                            <div>
                              <strong>This article was created from a Google Doc.</strong> The content is currently empty in our editor.
                            </div>
                          </div>
                          <div className="ml-8 space-y-2 text-sm">
                            <div>• <strong>Start typing here</strong> to create new content</div>
                            <div>• <strong>Copy & paste</strong> from the Google Doc if you want to edit it here</div>
                            <div>• <strong>Use "Open Google Doc"</strong> button to view the original</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Inline Comments - Always rendered for seamless UX */}
        {articleId && (
          <InlineCommentingExtension
            articleId={articleId}
            editorRef={editorRef}
            selectedText={textSelection}
            comments={comments}
            onCommentsChange={setComments}
            getMarkerPosition={(start, end, ref) => {
              // Import the positioning logic from CommentingSystem
              if (!ref.current) return null;
              
              try {
                const editorTextContent = ref.current.textContent || '';
                const startNode = getTextNodeAtOffset(ref.current, start);
                const endNode = getTextNodeAtOffset(ref.current, end);
                
                if (!startNode || !endNode) return null;
                
                const range = document.createRange();
                range.setStart(startNode.node, startNode.offset);
                range.setEnd(endNode.node, endNode.offset);
                
                const rect = range.getBoundingClientRect();
                const editorRect = ref.current.getBoundingClientRect();
                
                return {
                  top: rect.top - editorRect.top,
                  left: rect.left - editorRect.left,
                  width: rect.width,
                  height: rect.height
                };
              } catch (error) {
                console.warn('Failed to calculate marker position:', error);
                return null;
              }
            }}
            onCommentClick={(comment) => {
              setHighlightedCommentId(comment.id);
              if (!showComments) {
                setShowComments(true); // Auto-open sidebar when clicking a comment
              }
            }}
            onCommentStatusChange={async (commentId, status) => {
              try {
                // Update comment status
                const updatedComments = comments.map(c => 
                  c.id === commentId ? { ...c, status } : c
                );
                setComments(updatedComments);
              } catch (error) {
                console.error('Failed to update comment status:', error);
              }
            }}
            inlineMode={true}
          />
        )}

        {/* Comments area - wider and properly constrained for scrolling */}
        {showComments && articleId && (
          <div className="flex-shrink-0 border-l border-gray-200 bg-gray-50" style={{ width: '420px', maxWidth: '420px' }}>
            <CommentingSystem
              key={`comments-${articleId}`}
              articleId={articleId}
              editorRef={editorRef}
              comments={comments}
              onCommentsChange={setComments}
              highlightedCommentId={highlightedCommentId}
              onHighlightComment={setHighlightedCommentId}
              adminMode={adminMode}
              adminUser={adminUser}
              inlineMode={false}
            />
          </div>
        )}
      </div>

      {/* Floating action button for zen mode */}
      <AnimatePresence>
        {focusMode === 'zen' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => setFocusMode('normal')}
            className="fixed top-6 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
          >
            <X size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Link Editor Modal */}
      <AnimatePresence>
        {showLinkEditor && (
          <LinkEditor
            isOpen={showLinkEditor}
            onClose={() => {
              setShowLinkEditor(false);
              setLinkData(null);
            }}
            onSave={handleLinkSave}
            initialUrl={linkData?.href || ''}
            initialText={selectedText}
          />
        )}
      </AnimatePresence>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <ImageUpload
              onImageInsert={handleImageInsert}
              articleId={articleId}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowImageUpload(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Tooltip */}
      {showLinkTooltip && linkData && editor && (
        <LinkTooltip
          editor={editor}
          isVisible={showLinkTooltip}
          linkData={linkData}
          position={linkTooltip.position}
          onEdit={() => handleEditLink(linkData)}
          onClose={() => setShowLinkTooltip(false)}
        />
      )}
    </motion.div>
  );
};