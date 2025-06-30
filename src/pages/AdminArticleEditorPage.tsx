import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Settings, 
  MoreHorizontal, 
  ExternalLink,
  Clock,
  User,
  Calendar,
  Tag,
  Share2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Shield,
  UserCircle,
  Edit3,
  FileText,
  Brain,
  Sparkles
} from 'lucide-react';
import { ArticleEditor } from '../components/ArticleEditor';
import { supabaseAdmin } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import ArticleAICoPilot from '../components/admin/ArticleAICoPilot';
import { useAdminCheck } from '../hooks/useAdminCheck';
import { GoogleDocLink } from '../components/ui/GoogleDocLink';

interface AdminArticleEditorPageProps {}

interface ArticleContent {
  id: string;
  title?: string;
  content: string;
  product_name?: string;
  created_at: string;
  updated_at: string;
  editing_status?: string;
  article_version?: number;
  user_id: string;
  google_doc_url?: string;
  [key: string]: any;
}

interface OriginalAuthor {
  id: string;
  email: string;
  company_name?: string;
  profile_name?: string;
  avatar_url?: string;
}

export const AdminArticleEditorPage: React.FC<AdminArticleEditorPageProps> = () => {
  try {
    console.log('🔥 [AdminArticleEditorPage] Component mounted');
    
    const { articleId } = useParams<{ articleId: string }>();
    const navigate = useNavigate();
    const { isAdmin, loading: adminLoading } = useAdminCheck();
    
    console.log('🔥 [AdminArticleEditorPage] Article ID from params:', articleId);
    console.log('🔥 [AdminArticleEditorPage] supabaseAdmin available:', !!supabaseAdmin);
    
    // Validate critical dependencies early
    if (!supabaseAdmin) {
      console.error('🔥 [AdminArticleEditorPage] CRITICAL: supabaseAdmin is null/undefined');
      throw new Error('Admin client not available - service role key may be missing');
    }
    
    if (!articleId || articleId.trim() === '') {
      console.error('🔥 [AdminArticleEditorPage] CRITICAL: No article ID provided');
      throw new Error('No article ID provided in URL parameters');
    }
    
    // Article data and loading states
    const [article, setArticle] = useState<ArticleContent | null>(null);
    const [originalAuthor, setOriginalAuthor] = useState<OriginalAuthor | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // UI states
    const [showPreview, setShowPreview] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [readingTime, setReadingTime] = useState(0);
    const [timeKey, setTimeKey] = useState(0); // Force update key for time display

    // Admin-specific states
    const [adminNote, setAdminNote] = useState('');
    const [articleStatus, setArticleStatus] = useState<'draft' | 'editing' | 'review' | 'final' | 'published'>('draft');
    
    // AI Co-Pilot states
    const [showAICoPilot, setShowAICoPilot] = useState(false);
    const [currentArticleContent, setCurrentArticleContent] = useState('');

    // Update time display every minute to prevent constant re-renders
    useEffect(() => {
      try {
        console.log('🔥 [AdminArticleEditorPage] Setting up time interval');
        const interval = setInterval(() => {
          setTimeKey(prev => prev + 1);
        }, 60000); // Update every minute
        return () => {
          console.log('🔥 [AdminArticleEditorPage] Cleaning up time interval');
          clearInterval(interval);
        };
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error in time interval effect:', err);
      }
    }, []);

    // Load article data with admin privileges
    useEffect(() => {
      console.log('🔥 [AdminArticleEditorPage] useEffect triggered for article loading');
      console.log('🔥 [AdminArticleEditorPage] Dependencies:', { articleId, supabaseAdmin: !!supabaseAdmin });
      
      const loadArticle = async () => {
        try {
          console.log('🔥 [AdminArticleEditorPage] Starting loadArticle function');
          
          if (!articleId) {
            console.error('🔥 [AdminArticleEditorPage] No article ID provided');
            setError('No article ID provided');
            setIsLoading(false);
            return;
          }

          setIsLoading(true);
          console.log('🔥 [AdminArticleEditorPage] Loading started for article:', articleId);

          if (!supabaseAdmin) {
            console.error('🔥 [AdminArticleEditorPage] Admin client not available');
            throw new Error('Admin client not available - service role key may be missing');
          }

          console.log('🔥 [AdminArticleEditorPage] Making database query for content_briefs');

          // Load the article content
          const { data: contentData, error: contentError } = await supabaseAdmin
            .from('content_briefs')
            .select('*')
            .eq('id', articleId)
            .single();

          console.log('🔥 [AdminArticleEditorPage] Content query result:', { 
            data: !!contentData, 
            error: contentError,
            contentId: contentData?.id 
          });

          if (contentError) {
            console.error('🔥 [AdminArticleEditorPage] Content query error:', contentError);
            throw new Error(`Failed to load article: ${contentError.message}`);
          }

          console.log('🔥 [AdminArticleEditorPage] Making database query for user_profiles');

          // Load the original author info
          const { data: authorData, error: authorError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', contentData.user_id)
            .single();

          console.log('🔥 [AdminArticleEditorPage] Author query result:', { 
            data: !!authorData, 
            error: authorError,
            authorId: authorData?.id 
          });

          if (authorError && authorError.code !== 'PGRST116') {
            console.warn('🔥 [AdminArticleEditorPage] Could not load author info:', authorError);
          }

          console.log('🔥 [AdminArticleEditorPage] Setting state with loaded data');
          setArticle(contentData);
          setOriginalAuthor(authorData || null);
          setArticleStatus(contentData.editing_status || 'draft');
          setLastSaved(new Date(contentData.updated_at));
          setCurrentArticleContent(contentData.article_content || '');

          // Calculate initial word count
          if (contentData.article_content) {
            const text = contentData.article_content.replace(/<[^>]*>/g, '');
            const words = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
            setWordCount(words);
            setReadingTime(Math.ceil(words / 200));
            console.log('🔥 [AdminArticleEditorPage] Word count calculated:', words);
          }

          console.log('🔥 [AdminArticleEditorPage] Article loading completed successfully');

        } catch (err) {
          console.error('🔥 [AdminArticleEditorPage] Error in loadArticle:', err);
          const errorMessage = err instanceof Error ? err.message : 'An error occurred while loading the article';
          setError(errorMessage);
          toast.error(`Failed to load article: ${errorMessage}`);
        } finally {
          console.log('🔥 [AdminArticleEditorPage] Setting loading to false');
          setIsLoading(false);
        }
      };

      // Wrap the loadArticle call in try-catch too
      try {
        loadArticle();
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error calling loadArticle:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize article loading');
        setIsLoading(false);
      }
    }, [articleId]);

    // Handle navigation back to admin
    const handleBack = () => {
      try {
        console.log('🔥 [AdminArticleEditorPage] Navigating back to admin');
        navigate('/admin');
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error navigating back:', err);
        // Fallback navigation
        window.location.href = '/admin';
      }
    };

    // Handle save success with admin-specific logic
    const handleSaveSuccess = (content: string) => {
      try {
        setLastSaved(new Date());
        // Calculate word count and reading time
        const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
        const words = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        setWordCount(words);
        setReadingTime(Math.ceil(words / 200)); // 200 words per minute
        toast.success('Article saved successfully');
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error in handleSaveSuccess:', err);
      }
    };

    // Handle auto-save
    const handleAutoSave = (content: string) => {
      try {
        setLastSaved(new Date());
        setCurrentArticleContent(content);
        // Update word count on auto-save too
        const text = content.replace(/<[^>]*>/g, '');
        const words = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        setWordCount(words);
        setReadingTime(Math.ceil(words / 200));
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error in handleAutoSave:', err);
      }
    };

    // Handle status change
    const handleStatusChange = async (newStatus: 'draft' | 'editing' | 'review' | 'final' | 'published') => {
      try {
        if (!article || !supabaseAdmin) return;

        const { error } = await supabaseAdmin
          .from('content_briefs')
          .update({ editing_status: newStatus })
          .eq('id', article.id);

        if (error) throw error;

        setArticleStatus(newStatus);
        toast.success(`Article status updated to ${newStatus}`);
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error updating status:', err);
        toast.error('Failed to update status');
      }
    };

    // Handle admin note
    const handleAdminNoteSubmit = async () => {
      try {
        if (!article || !adminNote.trim() || !supabaseAdmin) return;

        // This would typically save to an admin_notes table
        // For now, we'll show a success message
        setAdminNote('');
        toast.success('Admin note added successfully');
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error adding admin note:', err);
        toast.error('Failed to add admin note');
      }
    };

    // Memoize the formatted last saved time to prevent constant re-renders
    const formattedLastSaved = useMemo(() => {
      try {
        if (!lastSaved) return 'Never';
        const now = new Date();
        const diffMs = now.getTime() - lastSaved.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return lastSaved.toLocaleDateString();
      } catch (err) {
        console.error('🔥 [AdminArticleEditorPage] Error formatting last saved time:', err);
        return 'Unknown';
      }
    }, [lastSaved, timeKey]); // Include timeKey to update periodically

    // Error state
    if (error) {
      console.log('🔥 [AdminArticleEditorPage] Rendering ERROR state:', error);
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-gray-700"
          >
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Error Loading Article</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    // Loading state
    if (isLoading) {
      console.log('🔥 [AdminArticleEditorPage] Rendering LOADING state');
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="relative">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
              <div className="absolute inset-0 w-8 h-8 border-2 border-blue-200 rounded-full mx-auto"></div>
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Loading Article</h2>
            <p className="text-gray-400">Please wait while we load the article for editing...</p>
          </motion.div>
        </div>
      );
    }

    if (!article) {
      console.log('🔥 [AdminArticleEditorPage] Rendering NOT FOUND state - article is null');
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Article Not Found</h2>
            <p className="text-gray-400 mb-6">The article you're looking for doesn't exist or you don't have access to it.</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back to Admin
            </button>
          </div>
        </div>
      );
    }

    console.log('🔥 [AdminArticleEditorPage] Rendering MAIN content with article:', article.id);
    console.log('🔥 [AdminArticleEditorPage] Article data:', { 
      productName: article.product_name, 
      hasContent: !!article.article_content,
      status: article.editing_status 
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header Navigation */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 fixed top-0 z-50 w-full"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Navigation and Article Info */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft size={18} />
                  <span className="font-medium">Back to Admin</span>
                </button>
                
                <div className="h-6 w-px bg-gray-600" />
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Shield className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white truncate max-w-md">
                      {article.product_name || 'Untitled Article'}
                    </h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <UserCircle size={14} />
                        <span>By: {originalAuthor?.profile_name || originalAuthor?.email || 'Unknown Author'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>Last saved {formattedLastSaved}</span>
                      </div>
                      {article.google_doc_url && (
                        <GoogleDocLink 
                          url={article.google_doc_url}
                          variant="dark"
                          size="md"
                          showCopyButton={true}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Actions and Stats */}
              <div className="flex items-center space-x-4">
                {/* Article Stats */}
                <div className="hidden md:flex items-center space-x-6 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-white">{wordCount}</span>
                    <span>words</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-white">{readingTime}</span>
                    <span>min read</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Auto-saved</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tag size={14} />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      articleStatus === 'published' ? 'bg-green-500/20 text-green-300' :
                      articleStatus === 'final' ? 'bg-blue-500/20 text-blue-300' :
                      articleStatus === 'review' ? 'bg-yellow-500/20 text-yellow-300' :
                      articleStatus === 'editing' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {articleStatus}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* AI Co-Pilot Button - Admin Only */}
                  {isAdmin && (
                    <motion.button
                      onClick={() => setShowAICoPilot(!showAICoPilot)}
                      className={`
                        p-2 rounded-lg transition-all duration-200 relative group
                        ${showAICoPilot 
                          ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                          : 'text-gray-400 hover:text-purple-300 hover:bg-purple-500/10'
                        }
                      `}
                      title={showAICoPilot ? 'Hide AI Co-Pilot' : 'Show AI Co-Pilot'}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Brain size={18} />
                      {showAICoPilot && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full"
                        >
                          <Sparkles className="w-2 h-2 text-white absolute inset-0.5" />
                        </motion.div>
                      )}
                      {/* Admin Badge */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-500 rounded-full border border-gray-800"
                        title="Admin Feature"
                      >
                        <Shield className="w-2 h-2 text-gray-800 absolute inset-0.5" />
                      </motion.div>
                    </motion.button>
                  )}

                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`
                      p-2 rounded-lg transition-colors
                      ${showPreview 
                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      }
                    `}
                    title={showPreview ? 'Hide Preview' : 'Show Preview'}
                  >
                    {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Admin Settings"
                  >
                    <Settings size={18} />
                  </button>
                  
                  <button
                    className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    title="More Options"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Admin Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 fixed top-[73px] z-40 w-full"
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  Admin Controls
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-gray-400 hover:text-gray-300 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Article Status</label>
                  <select 
                    value={articleStatus}
                    onChange={(e) => handleStatusChange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="editing">In Progress</option>
                    <option value="review">Ready for Review</option>
                    <option value="final">Final</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Original Author</label>
                  <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                    {originalAuthor?.profile_name || originalAuthor?.email || 'Unknown'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
                  <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                    {originalAuthor?.company_name || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Article Version</label>
                  <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                    v{article.article_version || 1}
                  </div>
                </div>
              </div>
              
              {/* Admin Note Section */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Admin Note</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add an admin note..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAdminNoteSubmit}
                    disabled={!adminNote.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Editor Area */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`h-full ${showSettings ? 'pt-48' : 'pt-24'}`}
          style={{ 
            background: 'linear-gradient(to bottom right, #111827, #1f2937)',
            width: showAICoPilot ? 'calc(100% - 420px)' : '100%',
            transition: 'width 0.3s ease'
          }}
        >
          <ArticleEditor
            articleId={articleId}
            initialContent={article.article_content || ''}
            onSave={handleSaveSuccess}
            onAutoSave={handleAutoSave}
            className="h-full"
            adminMode={true}
            originalAuthor={originalAuthor}
            onStatusChange={handleStatusChange}
            onOwnershipTransfer={(newOwnerId: string) => console.log('Ownership transfer:', newOwnerId)}
            onAdminNote={(note: string) => console.log('Admin note:', note)}
            isAiCopilotOpen={showAICoPilot}
          />
        </motion.main>

        {/* AI Co-Pilot - Admin Only */}
        {isAdmin && (
          <ArticleAICoPilot
            isVisible={showAICoPilot}
            onToggle={() => setShowAICoPilot(!showAICoPilot)}
            articleContent={currentArticleContent}
            articleTitle={article.product_name || 'Untitled Article'}
            authorCompanyName={originalAuthor?.company_name}
            onSuggestion={(suggestion) => {
              // Handle AI suggestions - could integrate with editor
              console.log('AI Suggestion:', suggestion);
              toast.success('AI suggestion received! Check the console for details.');
            }}
          />
        )}

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <button
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            title="Save Article"
          >
            <Save size={20} />
          </button>
        </div>

        {/* Success Toast (could be enhanced with a toast library) */}
        {lastSaved && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
          >
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Article saved successfully</span>
          </motion.div>
        )}
      </div>
    );
  } catch (err) {
    console.error('🔥 [AdminArticleEditorPage] CRITICAL ERROR in component:', err);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-gray-700"
        >
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Critical Error</h2>
            <p className="text-gray-400 mb-4">
              An unexpected error occurred while loading the admin article editor.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Error: {err instanceof Error ? err.message : 'Unknown error'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/admin'}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Back to Admin
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
};

export default AdminArticleEditorPage; 