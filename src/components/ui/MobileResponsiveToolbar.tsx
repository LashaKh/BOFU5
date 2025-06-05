import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, 
  Image as ImageIcon, Heading1, Heading2, Heading3, Undo, Redo, Link as LinkIcon,
  Quote, Code, Highlighter, Save, Loader2, AlertCircle, CheckCircle, Minus,
  Type, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  CheckSquare, Terminal, Eye, EyeOff, Download, Upload, FileText, 
  SplitSquareHorizontal, Indent, Outdent, MoreHorizontal, Hash, HelpCircle,
  MessageCircle, Shield, ShieldCheck, History, Users, UserCheck, 
  AlertTriangle, Settings, Crown, Edit, ArrowRightLeft, Menu, X,
  ChevronDown, ChevronRight, AlignLeft, Palette
} from 'lucide-react';

import { useMobileDetection, isTouchDevice } from '../../hooks/useMobileDetection';
import { ColorPicker } from './ColorPicker';
import { AlignmentDropdown } from './AlignmentDropdown';
import { TypographyControls } from './TypographyControls';

interface MobileResponsiveToolbarProps {
  editor: Editor;
  isSaving?: boolean;
  isAutoSaving?: boolean;
  saveStatus?: 'saved' | 'saving' | 'error' | null;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFindReplace?: () => void;
  onSpecialCharacters?: () => void;
  onKeyboardShortcuts?: () => void;
  onImageUpload?: () => void;
  onMarkdownHelp?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onPreview?: () => void;
  // View mode controls
  viewMode?: 'editor' | 'preview' | 'split';
  onViewModeChange?: (mode: 'editor' | 'preview' | 'split') => void;
  // Comment system
  commentsEnabled?: boolean;
  onToggleComments?: () => void;
  commentCount?: number;
  // Collaboration
  articleId?: string;
  // Admin controls
  adminMode?: boolean;
  onAdminPanel?: () => void;
  onVersionHistory?: () => void;
  className?: string;
}

type ToolbarSection = 
  | 'primary' 
  | 'formatting' 
  | 'headings' 
  | 'lists' 
  | 'advanced' 
  | 'media' 
  | 'collaboration' 
  | 'admin';

interface ToolbarSectionConfig {
  id: ToolbarSection;
  title: string;
  priority: number; // Higher priority shows first on mobile
  alwaysVisible?: boolean; // Always shown even on very small screens
  mobileCollapsed?: boolean; // Start collapsed on mobile
}

const TOOLBAR_SECTIONS: ToolbarSectionConfig[] = [
  { id: 'primary', title: 'Primary', priority: 10, alwaysVisible: true },
  { id: 'formatting', title: 'Formatting', priority: 9, mobileCollapsed: false },
  { id: 'headings', title: 'Headings', priority: 8, mobileCollapsed: false },
  { id: 'lists', title: 'Lists', priority: 7, mobileCollapsed: true },
  { id: 'advanced', title: 'Advanced', priority: 6, mobileCollapsed: true },
  { id: 'media', title: 'Media', priority: 5, mobileCollapsed: true },
  { id: 'collaboration', title: 'Collaboration', priority: 4, mobileCollapsed: true },
  { id: 'admin', title: 'Admin', priority: 3, mobileCollapsed: true },
];

const ToolbarSeparator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-px h-6 bg-gray-300 mx-1 ${className}`} />
);

const MobileToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  icon: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, icon, className = '', children }) => {
  const { isMobile } = useMobileDetection();
  const isTouch = isTouchDevice();
  
  // Touch-friendly button size (minimum 44px touch target)
  const buttonSize = isMobile || isTouch ? 'min-w-[44px] min-h-[44px] p-2.5' : 'p-2';
  const iconSize = isMobile || isTouch ? 18 : 16;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${buttonSize} 
        rounded 
        hover:bg-gray-200 
        active:bg-gray-300 
        transition-colors 
        duration-150 
        disabled:opacity-50 
        disabled:cursor-not-allowed
        flex 
        items-center 
        justify-center
        ${isActive ? 'bg-primary-500/20 text-primary-600' : 'text-gray-600'}
        ${className}
      `}
      title={title}
    >
      {React.cloneElement(icon as React.ReactElement, { size: iconSize })}
      {children}
    </button>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ title, isCollapsed, onToggle, children, className = '' }) => {
  const { isMobile } = useMobileDetection();
  
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 rounded-t-lg hover:bg-gray-100"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </button>
      {!isCollapsed && (
        <div className="p-2 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const MobileResponsiveToolbar: React.FC<MobileResponsiveToolbarProps> = ({
  editor,
  isSaving,
  isAutoSaving,
  saveStatus,
  onSave,
  onUndo,
  onRedo,
  onFindReplace,
  onSpecialCharacters,
  onKeyboardShortcuts,
  onImageUpload,
  onMarkdownHelp,
  onExport,
  onImport,
  onPreview,
  viewMode = 'editor',
  onViewModeChange,
  commentsEnabled,
  onToggleComments,
  commentCount = 0,
  articleId,
  adminMode,
  onAdminPanel,
  onVersionHistory,
  className = ''
}) => {
  const { isMobile, isTablet, screenWidth } = useMobileDetection();
  const [collapsedSections, setCollapsedSections] = useState<Set<ToolbarSection>>(
    new Set(TOOLBAR_SECTIONS.filter(s => s.mobileCollapsed && isMobile).map(s => s.id))
  );
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Update collapsed sections based on screen size changes
  useEffect(() => {
    if (isMobile) {
      setCollapsedSections(new Set(TOOLBAR_SECTIONS.filter(s => s.mobileCollapsed).map(s => s.id)));
    } else {
      setCollapsedSections(new Set());
    }
  }, [isMobile]);
  
  const toggleSection = (sectionId: ToolbarSection) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };
  
  const renderPrimarySection = () => (
    <div className="flex items-center flex-wrap gap-1">
      {/* Save Status and Controls */}
      <div className="flex items-center">
        {onSave && (
          <MobileToolbarButton
            onClick={onSave}
            disabled={isSaving}
            title="Save (Ctrl+S)"
            icon={isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          />
        )}
        
        {saveStatus && (
          <div className="ml-2 flex items-center text-sm">
            {saveStatus === 'saved' && <CheckCircle className="text-green-500" size={16} />}
            {saveStatus === 'saving' && <Loader2 className="animate-spin text-blue-500" size={16} />}
            {saveStatus === 'error' && <AlertCircle className="text-red-500" size={16} />}
          </div>
        )}
      </div>
      
      <ToolbarSeparator />
      
      {/* Undo/Redo */}
      <div className="flex items-center">
        <MobileToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
          icon={<Undo />}
        />
        <MobileToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
          icon={<Redo />}
        />
      </div>
      
      {/* View Mode Controls (Mobile Horizontal Scroll) */}
      {onViewModeChange && (
        <>
          <ToolbarSeparator />
          <div className="flex items-center">
            <MobileToolbarButton
              onClick={() => onViewModeChange('editor')}
              isActive={viewMode === 'editor'}
              title="Editor View"
              icon={<Type />}
            />
            <MobileToolbarButton
              onClick={() => onViewModeChange('preview')}
              isActive={viewMode === 'preview'}
              title="Preview View"
              icon={<Eye />}
            />
            {!isMobile && (
              <MobileToolbarButton
                onClick={() => onViewModeChange('split')}
                isActive={viewMode === 'split'}
                title="Split View"
                icon={<SplitSquareHorizontal />}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
  
  const renderFormattingSection = () => (
    <div className="flex items-center flex-wrap gap-1">
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
        icon={<Bold />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
        icon={<Italic />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
        icon={<UnderlineIcon />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
        icon={<Strikethrough />}
      />
      
      {/* Color Controls - Adapted for mobile */}
      <div className="flex items-center">
        <ColorPicker
          currentColor={editor.getAttributes('textStyle').color}
          onColorSelect={(color) => editor.chain().focus().setColor(color).run()}
          type="text"
        />
        <ColorPicker
          currentColor={editor.getAttributes('highlight').color}
          onColorSelect={(color) => 
            color ? editor.chain().focus().toggleHighlight({ color }).run() : editor.chain().focus().unsetHighlight().run()
          }
          type="highlight"
        />
      </div>
    </div>
  );
  
  const renderHeadingsSection = () => (
    <div className="flex items-center flex-wrap gap-1">
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
        icon={<Heading1 />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
        icon={<Heading2 />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
        icon={<Heading3 />}
      />
      
      {/* Alignment Dropdown */}
      <AlignmentDropdown
        currentAlignment={editor.getAttributes('paragraph').textAlign || 'left'}
        onAlignmentSelect={(alignment) => editor.chain().focus().setTextAlign(alignment).run()}
      />
    </div>
  );
  
  const renderListsSection = () => (
    <div className="flex items-center flex-wrap gap-1">
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
        icon={<List />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
        icon={<ListOrdered />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        title="Task List"
        icon={<CheckSquare />}
      />
      
      {/* Indentation Controls */}
      <MobileToolbarButton
        onClick={() => {
          if (editor.can().sinkListItem('listItem')) {
            editor.chain().focus().sinkListItem('listItem').run();
          } else if (editor.can().sinkListItem('taskItem')) {
            editor.chain().focus().sinkListItem('taskItem').run();
          }
        }}
        disabled={!editor.can().sinkListItem('listItem') && !editor.can().sinkListItem('taskItem')}
        title="Increase Indentation (Tab)"
        icon={<Indent />}
      />
      <MobileToolbarButton
        onClick={() => {
          if (editor.can().liftListItem('listItem')) {
            editor.chain().focus().liftListItem('listItem').run();
          } else if (editor.can().liftListItem('taskItem')) {
            editor.chain().focus().liftListItem('taskItem').run();
          }
        }}
        disabled={!editor.can().liftListItem('listItem') && !editor.can().liftListItem('taskItem')}
        title="Decrease Indentation (Shift+Tab)"
        icon={<Outdent />}
      />
      
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
        icon={<Quote />}
      />
    </div>
  );
  
  const renderAdvancedSection = () => (
    <div className="flex items-center flex-wrap gap-1">
      {onFindReplace && (
        <MobileToolbarButton
          onClick={onFindReplace}
          title="Find & Replace (Ctrl+F)"
          icon={<>🔍</>}
        />
      )}
      
      {onSpecialCharacters && (
        <MobileToolbarButton
          onClick={onSpecialCharacters}
          title="Insert Special Characters"
          icon={<Hash />}
        />
      )}
      
      {onKeyboardShortcuts && (
        <MobileToolbarButton
          onClick={onKeyboardShortcuts}
          title="Keyboard Shortcuts (Ctrl+/)"
          icon={<HelpCircle />}
        />
      )}
      
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive('subscript')}
        title="Subscript"
        icon={<SubscriptIcon />}
      />
      <MobileToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive('superscript')}
        title="Superscript"
        icon={<SuperscriptIcon />}
      />
      
      <MobileToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Insert Horizontal Rule"
        icon={<Minus />}
      />
    </div>
  );
  
  const renderMediaSection = () => (
    <div className="flex items-center flex-wrap gap-1">
      {onImageUpload && (
        <MobileToolbarButton
          onClick={onImageUpload}
          title="Upload Image"
          icon={<ImageIcon />}
        />
      )}
      
      {onImport && (
        <MobileToolbarButton
          onClick={onImport}
          title="Import Markdown"
          icon={<Upload />}
        />
      )}
      
      {onExport && (
        <MobileToolbarButton
          onClick={onExport}
          title="Export Options"
          icon={<Download />}
        />
      )}
      
      {onPreview && (
        <MobileToolbarButton
          onClick={onPreview}
          title="Full Preview"
          icon={<FileText />}
        />
      )}
      
      {onMarkdownHelp && (
        <MobileToolbarButton
          onClick={onMarkdownHelp}
          title="Markdown Help"
          icon={<HelpCircle />}
        />
      )}
    </div>
  );
  
  const renderCollaborationSection = () => {
    if (!articleId) return null;
    
    return (
      <div className="flex items-center flex-wrap gap-1">
        {onToggleComments && (
          <MobileToolbarButton
            onClick={onToggleComments}
            isActive={commentsEnabled}
            title={`${commentsEnabled ? 'Disable' : 'Enable'} Comments`}
            icon={<MessageCircle />}
          >
            {commentCount > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                {commentCount}
              </span>
            )}
          </MobileToolbarButton>
        )}
        
        {/* User Presence component will be added here */}
        <div className="flex items-center">
          <Users size={16} className="text-gray-500" />
          <span className="ml-1 text-xs text-gray-500">Collaboration</span>
        </div>
      </div>
    );
  };
  
  const renderAdminSection = () => {
    if (!adminMode) return null;
    
    return (
      <div className="flex items-center flex-wrap gap-1 bg-red-50 rounded border border-red-200 p-1">
        <div className="flex items-center space-x-1 mr-2">
          <Crown className="text-red-500" size={14} />
          <span className="text-red-600 text-xs font-medium">ADMIN</span>
        </div>
        
        {onAdminPanel && (
          <MobileToolbarButton
            onClick={onAdminPanel}
            title="Open Admin Control Panel"
            icon={<Shield />}
            className="text-red-600 hover:bg-red-100"
          />
        )}
        
        {onVersionHistory && (
          <MobileToolbarButton
            onClick={onVersionHistory}
            title="View Version History"
            icon={<History />}
            className="text-red-600 hover:bg-red-100"
          />
        )}
      </div>
    );
  };
  
  const renderSection = (sectionId: ToolbarSection) => {
    switch (sectionId) {
      case 'primary':
        return renderPrimarySection();
      case 'formatting':
        return renderFormattingSection();
      case 'headings':
        return renderHeadingsSection();
      case 'lists':
        return renderListsSection();
      case 'advanced':
        return renderAdvancedSection();
      case 'media':
        return renderMediaSection();
      case 'collaboration':
        return renderCollaborationSection();
      case 'admin':
        return renderAdminSection();
      default:
        return null;
    }
  };
  
  if (isMobile) {
    return (
      <div ref={toolbarRef} className={`border-b border-gray-300 bg-gray-50 ${className}`}>
        {/* Always Visible Primary Actions */}
        <div className="p-2 border-b border-gray-200">
          {renderPrimarySection()}
        </div>
        
        {/* Mobile Menu Toggle */}
        <div className="px-3 py-2 flex items-center justify-between">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="flex items-center space-x-2 px-3 py-2 bg-white rounded border border-gray-300 hover:bg-gray-50"
          >
            {showMobileMenu ? <X size={16} /> : <Menu size={16} />}
            <span className="text-sm font-medium">
              {showMobileMenu ? 'Close Tools' : 'Show Tools'}
            </span>
          </button>
        </div>
        
        {/* Collapsible Mobile Sections */}
        {showMobileMenu && (
          <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
            {TOOLBAR_SECTIONS
              .filter(section => section.id !== 'primary' && renderSection(section.id))
              .sort((a, b) => b.priority - a.priority)
              .map(section => (
                <CollapsibleSection
                  key={section.id}
                  title={section.title}
                  isCollapsed={collapsedSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  className="bg-white"
                >
                  {renderSection(section.id)}
                </CollapsibleSection>
              ))}
          </div>
        )}
      </div>
    );
  }
  
  // Desktop Layout - Traditional Horizontal Toolbar
  return (
    <div className={`border-b border-gray-300 p-3 bg-gray-50 ${className}`}>
      <div className="flex flex-wrap items-center gap-1">
        {TOOLBAR_SECTIONS
          .sort((a, b) => b.priority - a.priority)
          .map(section => {
            const content = renderSection(section.id);
            if (!content) return null;
            
            return (
              <React.Fragment key={section.id}>
                {content}
                <ToolbarSeparator />
              </React.Fragment>
            );
          })}
      </div>
    </div>
  );
}; 