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
  Moon, 
  Sun, 
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
  Shield,
  History,
  MessageCircle,
  Sparkles,
  Columns,
  CheckSquare,
  Grid3X3,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';
import { ExportButton } from './ui/ExportButton';
import { ImageUpload } from './ui/ImageUpload';
import { LinkTooltip } from './ui/LinkTooltip';
import { CommentingSystem } from './ui/CommentingSystem';
import { loadArticleContent, saveArticleContent, ArticleContent } from '../lib/articleApi';
import { debounce } from 'lodash';

// Import enhanced CSS styles
import '../styles/article-editor-enhanced.css';

// Mock components for missing ones
const UserPresence = ({ articleId }: { articleId: string }) => null;
const UndoRedoHistoryPanel = ({ editor }: { editor: any }) => (
  <div className="flex items-center space-x-1">
    <ToolbarButton
      icon={Undo}
      label="Undo"
      onClick={() => editor?.chain().focus().undo().run()}
      disabled={!editor?.can().undo()}
    />
    <ToolbarButton
      icon={Redo}
      label="Redo"
      onClick={() => editor?.chain().focus().redo().run()}
      disabled={!editor?.can().redo()}
    />
  </div>
);

// Simple type for user profile
interface UserProfile {
  id: string;
  email: string;
  company_name?: string;
}

// Helper functions (simplified)
const htmlToMarkdown = (html: string): string => {
  // Simple HTML to markdown conversion
  return html
    .replace(/<h1>(.*?)<\/h1>/g, '# $1')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '');
};

const autoSaveArticleContent = async (articleId: string, content: string) => {
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
type Theme = 'light' | 'dark';
type FocusMode = 'normal' | 'focused' | 'zen';

// Enhanced Toolbar Button Component
const ToolbarButton = ({ 
  icon: Icon, 
  label, 
  isActive = false, 
  onClick, 
  disabled = false,
  variant = 'default',
  size = 'sm',
  className = ''
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) => {
  const variantClasses = {
    default: 'hover:bg-gray-100 hover:text-gray-900',
    primary: 'hover:bg-blue-100 hover:text-blue-900',
    success: 'hover:bg-green-100 hover:text-green-900',
    warning: 'hover:bg-yellow-100 hover:text-yellow-900',
    danger: 'hover:bg-red-100 hover:text-red-900'
  };

  const sizeClasses = {
    xs: 'p-1.5 text-xs',
    sm: 'p-2 text-sm',
    md: 'p-3 text-base'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        relative rounded-lg transition-all duration-200 ease-in-out toolbar-btn
        ${sizeClasses[size]}
        ${isActive 
          ? 'bg-blue-500 text-white shadow-md active' 
          : `text-gray-600 ${variantClasses[variant]}`
        }
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'active:transform active:scale-95'
        }
        ${className}
      `}
    >
      <Icon size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
        />
      )}
    </motion.button>
  );
};

// Enhanced Toolbar Separator
const ToolbarSeparator = () => (
  <div className="w-px h-6 bg-gray-200 mx-2" />
);

// Status Indicator Component
const StatusIndicator = ({ 
  status, 
  isAutoSaving, 
  lastSaved 
}: { 
  status: 'saved' | 'saving' | 'error' | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
}) => {
  const getStatusIcon = () => {
    if (isAutoSaving || status === 'saving') return <Loader2 className="animate-spin" size={14} />;
    if (status === 'error') return <AlertCircle size={14} />;
    if (status === 'saved') return <CheckCircle size={14} />;
    return null;
  };

  const getStatusColor = () => {
    if (isAutoSaving || status === 'saving') return 'text-blue-500';
    if (status === 'error') return 'text-red-500';
    if (status === 'saved') return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (isAutoSaving) return 'Auto-saving...';
    if (status === 'saving') return 'Saving...';
    if (status === 'error') return 'Error saving';
    if (status === 'saved' && lastSaved) {
      const now = new Date();
      const diff = Math.round((now.getTime() - lastSaved.getTime()) / 1000);
      if (diff < 60) return `Saved ${diff}s ago`;
      if (diff < 3600) return `Saved ${Math.round(diff / 60)}m ago`;
      return `Saved ${Math.round(diff / 3600)}h ago`;
    }
    return 'Not saved';
  };

  const statusClass = isAutoSaving || status === 'saving' ? 'saving' : 
                     status === 'saved' ? 'saved' : 
                     status === 'error' ? 'error' : '';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full shadow-sm border status-indicator ${statusClass} ${getStatusColor()}`}
    >
      {getStatusIcon()}
      <span className="text-xs font-medium">{getStatusText()}</span>
    </motion.div>
  );
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
  console.log('🔥 ArticleEditor component initialized with props:', {
    articleId,
    adminMode,
    hasAdminUser: !!adminUser,
    hasOriginalAuthor: !!originalAuthor,
    className
  });

  // Core editor state
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [articleData, setArticleData] = useState<ArticleContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [theme, setTheme] = useState<Theme>('light');
  const [focusMode, setFocusMode] = useState<FocusMode>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');

  // Modal states
  const [showImageUpload, setShowImageUpload] = useState(false);

  // Feature states
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  // Link management
  const [linkTooltip, setLinkTooltip] = useState({
    show: false,
    data: null as { href: string; text: string; target?: string; title?: string } | null,
    position: { x: 0, y: 0 }
  });

  // Admin-specific state
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'editing' | 'review' | 'final' | 'published'>('draft');

  // Mobile detection
  const isMobile = false; // Simplified for now
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize editor with simplified extensions (remove duplicates)
  const getEditorExtensions = () => {
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
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'article-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'article-link',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ];
  };

  // Initialize editor
  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent,
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none enhanced-editor-content enhanced-scrollbar ${theme === 'dark' ? 'prose-invert dark' : 'prose-gray'} ${focusMode === 'zen' ? 'prose-xl zen-mode' : ''} ${focusMode === 'focused' ? 'focus-mode' : ''}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      setMarkdownContent(markdown);
      
      // Update word count and reading time
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(words);
      setReadingTime(Math.ceil(words / 200)); // 200 words per minute average
    },
  });

  // Load article data
  const loadArticleData = async () => {
    if (!articleId) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await loadArticleContent(articleId);
      if (result.success && result.data) {
        setArticleData(result.data);
        if (editor && result.data.content) {
          editor.commands.setContent(result.data.content);
        }
        setCurrentStatus(result.data.editing_status);
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticleData();
  }, [articleId, editor]);

  // Auto-save functionality
  const debouncedAutoSave = useCallback(
    debounce(async () => {
      if (!editor || !articleId) return;

      setIsAutoSaving(true);
      try {
        const content = editor.getHTML();
        await autoSaveArticleContent(articleId, content);
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('error');
      } finally {
        setIsAutoSaving(false);
      }
    }, 2000),
    [editor, articleId]
  );

  useEffect(() => {
    if (editor && articleId) {
      debouncedAutoSave();
    }
  }, [markdownContent, debouncedAutoSave]);

  // Manual save
  const handleSave = async () => {
    if (!editor) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const content = editor.getHTML();
      
      if (articleId) {
        await saveArticleContent(articleId, content);
      }
      
      onSave?.(content);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image insert
  const handleImageInsert = (imageUrl: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setShowImageUpload(false);
  };

  // Handle edit link
  const handleEditLink = (linkData: any) => {
    // Simple link editing implementation
    const url = prompt('Enter URL:', linkData?.href || '');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
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
        }
      }

      // Escape key
      if (event.key === 'Escape') {
        setShowImageUpload(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render main toolbar
  const renderMainToolbar = () => (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`
        ${focusMode === 'zen' ? 'hidden' : 'block'}
        bg-white border-b border-gray-200 px-4 py-3 floating-toolbar
        ${theme === 'dark' ? 'bg-gray-900 border-gray-700 dark' : ''}
        sticky top-0 z-40
      `}
    >
      {/* Top toolbar row */}
      <div className="flex items-center justify-between mb-3">
        {/* Left: File operations */}
        <div className="flex items-center space-x-2">
          <ToolbarButton
            icon={Save}
            label="Save (Ctrl+S)"
            onClick={handleSave}
            disabled={isSaving}
            variant="primary"
          />
          <ExportButton 
            editor={editor}
            articleTitle={articleData?.title || 'Untitled Article'}
            articleId={articleId}
            className="ml-1"
          />
          <ToolbarButton
            icon={Upload}
            label="Import Markdown"
            onClick={() => setShowImageUpload(true)}
          />
        </div>

        {/* Center: Status indicator */}
        <StatusIndicator 
          status={saveStatus}
          isAutoSaving={isAutoSaving}
          lastSaved={lastSaved}
        />

        {/* Right: View controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <ToolbarButton
              icon={Type}
              label="Editor"
              isActive={viewMode === 'editor'}
              onClick={() => setViewMode('editor')}
              size="xs"
            />
            <ToolbarButton
              icon={Eye}
              label="Preview"
              isActive={viewMode === 'preview'}
              onClick={() => setViewMode('preview')}
              size="xs"
            />
          </div>
          
          <ToolbarSeparator />
          
          <ToolbarButton
            icon={focusMode === 'zen' ? Minimize2 : Maximize2}
            label={focusMode === 'zen' ? 'Exit Zen Mode' : 'Zen Mode'}
            onClick={() => setFocusMode(focusMode === 'zen' ? 'normal' : 'zen')}
          />
          <ToolbarButton
            icon={theme === 'dark' ? Sun : Moon}
            label="Toggle Theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </div>
      </div>

      {/* Main formatting toolbar */}
      <div className="flex items-center justify-between">
        {/* Left: Formatting tools */}
        <div className="flex items-center space-x-1">
          {/* Text formatting */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <ToolbarButton
              icon={Bold}
              label="Bold (Ctrl+B)"
              isActive={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              icon={Italic}
              label="Italic (Ctrl+I)"
              isActive={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              icon={UnderlineIcon}
              label="Underline (Ctrl+U)"
              isActive={editor?.isActive('underline')}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            />
          </div>

          <ToolbarSeparator />

          {/* Headings */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <ToolbarButton
              icon={Heading1}
              label="Heading 1"
              isActive={editor?.isActive('heading', { level: 1 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              icon={Heading2}
              label="Heading 2"
              isActive={editor?.isActive('heading', { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              icon={Heading3}
              label="Heading 3"
              isActive={editor?.isActive('heading', { level: 3 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            />
          </div>

          <ToolbarSeparator />

          {/* Lists */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <ToolbarButton
              icon={List}
              label="Bullet List"
              isActive={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              icon={ListOrdered}
              label="Numbered List"
              isActive={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
          </div>

          <ToolbarSeparator />

          {/* Insert tools */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <ToolbarButton
              icon={LinkIcon}
              label="Insert Link"
              isActive={editor?.isActive('link')}
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run();
                }
              }}
            />
            <ToolbarButton
              icon={ImageIcon}
              label="Insert Image"
              onClick={() => setShowImageUpload(true)}
            />
            <ToolbarButton
              icon={Grid3X3}
              label="Insert Table"
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            />
          </div>
        </div>

        {/* Right: Advanced tools */}
        <div className="flex items-center space-x-1">
          <UndoRedoHistoryPanel editor={editor} />
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500 editor-stats">
        <div className="flex items-center space-x-4">
          <span>{wordCount} words</span>
          <span>{readingTime} min read</span>
          {commentsEnabled && (
            <span className="flex items-center space-x-1">
              <MessageCircle size={12} />
              <span>{commentCount} comments</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>Article ID: {articleId || 'Draft'}</span>
        </div>
      </div>
    </motion.div>
  );

  // Render editor content
  const renderEditor = () => (
    <div 
      ref={editorRef}
      className={`
        relative min-h-[500px] p-6
        ${theme === 'dark' ? 'bg-gray-900 text-white zen-mode dark' : 'bg-white text-gray-900'}
        ${focusMode === 'zen' ? 'min-h-screen zen-mode' : ''}
        ${focusMode === 'focused' ? 'max-w-4xl mx-auto focus-mode' : ''}
      `}
    >
      <EditorContent 
        editor={editor} 
        className={`
          prose max-w-none focus:outline-none enhanced-scrollbar
          ${theme === 'dark' ? 'prose-invert dark' : 'prose-gray'}
          ${focusMode === 'zen' ? 'prose-xl' : 'prose-lg'}
          ${isMobile ? 'prose-sm' : ''}
          min-h-[400px] w-full
        `}
        style={{
          minHeight: focusMode === 'zen' ? '80vh' : '400px',
          lineHeight: focusMode === 'zen' ? '1.8' : '1.6'
        }}
      />
      
      {/* Empty state hint */}
      {editor?.isEmpty && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-6 left-6 text-gray-400 pointer-events-none select-none animate-fade-in-scale"
        >
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-blue-400 animate-pulse-glow" />
            <span>Start writing your article...</span>
          </div>
        </motion.div>
      )}
    </div>
  );

  // Render content based on view mode
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center animate-slide-in-up"
          >
            <div className="skeleton w-8 h-8 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your article...</p>
          </motion.div>
        </div>
      );
    }

    return renderEditor();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`
        ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}
        ${className}
        border rounded-xl shadow-lg overflow-hidden
        ${theme === 'dark' ? 'bg-gray-900 border-gray-700 dark' : 'bg-white border-gray-200'}
        ${focusMode === 'zen' ? 'zen-mode' : ''}
      `}
    >
      {/* Main toolbar */}
      {renderMainToolbar()}

      {/* Editor content */}
      <div className="relative">
        {renderContent()}
      </div>

      {/* Floating action button for zen mode */}
      <AnimatePresence>
        {focusMode === 'zen' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => setFocusMode('normal')}
            className="fixed top-6 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50 animate-pulse-glow"
          >
            <X size={20} />
          </motion.button>
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
      {linkTooltip.show && linkTooltip.data && editor && (
        <LinkTooltip
          editor={editor}
          isVisible={linkTooltip.show}
          linkData={linkTooltip.data}
          position={linkTooltip.position}
          onEdit={() => handleEditLink(linkTooltip.data!)}
          onClose={() => setLinkTooltip({ show: false, data: null, position: { x: 0, y: 0 } })}
        />
      )}

      {/* Commenting system */}
      {commentsEnabled && articleId && (
        <CommentingSystem
          articleId={articleId}
          editorRef={editorRef}
          onCommentsChange={(comments) => setCommentCount(comments.length)}
        />
      )}
    </motion.div>
  );
};