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
  X
} from 'lucide-react';
import { ArticleEditor } from '../components/ArticleEditor';
import { loadArticleContent, ArticleContent } from '../lib/articleApi';
import { supabase } from '../lib/supabase';

interface ArticleEditorPageProps {}

export const ArticleEditorPage: React.FC<ArticleEditorPageProps> = () => {
  const { id: articleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Article data and loading states
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // UI states
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [timeKey, setTimeKey] = useState(0); // Force update key for time display

  // Load user authentication
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Update time display every minute to prevent constant re-renders
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeKey(prev => prev + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Load article data
  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        setError('No article ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await loadArticleContent(articleId);
        
        if (result.success && result.data) {
          setArticle(result.data);
          setLastSaved(new Date(result.data.updated_at));
        } else {
          setError(result.error || 'Failed to load article');
        }
      } catch (err) {
        setError('An error occurred while loading the article');
        console.error('Error loading article:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId]);

  // Handle navigation back
  const handleBack = () => {
    navigate('/dashboard/generated-articles');
  };

  // Handle save success
  const handleSaveSuccess = (content: string) => {
    setLastSaved(new Date());
    // Calculate word count and reading time
    const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
    setReadingTime(Math.ceil(words / 200)); // 200 words per minute
  };

  // Handle auto-save
  const handleAutoSave = (content: string) => {
    setLastSaved(new Date());
    // Update word count on auto-save too
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
    setReadingTime(Math.ceil(words / 200));
  };

  // Memoize the formatted last saved time to prevent constant re-renders
  const formattedLastSaved = useMemo(() => {
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
  }, [lastSaved, timeKey]); // Include timeKey to update periodically

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4"
        >
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Article</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 w-8 h-8 border-2 border-blue-200 rounded-full mx-auto"></div>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Loading Article</h2>
          <p className="text-gray-600">Please wait while we load your article...</p>
        </motion.div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Article Not Found</h2>
          <p className="text-gray-600 mb-6">The article you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Navigation and Article Info */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="font-medium">Back to Articles</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                    {article.title || 'Untitled Article'}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Tag size={14} />
                      <span>{article.product_name || 'No Product'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{new Date(article.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>Last saved {formattedLastSaved}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions and Stats */}
            <div className="flex items-center space-x-4">
              {/* Article Stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{wordCount}</span>
                  <span>words</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{readingTime}</span>
                  <span>min read</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Auto-saved</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${showPreview 
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  title={showPreview ? 'Hide Preview' : 'Show Preview'}
                >
                  {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Article Settings"
                >
                  <Settings size={18} />
                </button>
                
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="More Options"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Article Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gray-50 border-b border-gray-200"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Article Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="draft">Draft</option>
                  <option value="editing">In Progress</option>
                  <option value="review">Ready for Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="private">Private</option>
                  <option value="team">Team</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select Category</option>
                  <option value="product-review">Product Review</option>
                  <option value="how-to">How-to Guide</option>
                  <option value="comparison">Comparison</option>
                  <option value="news">News</option>
                </select>
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
        className="h-full"
      >
        <ArticleEditor
          articleId={articleId}
          initialContent={article.content || ''}
          onSave={handleSaveSuccess}
          onAutoSave={handleAutoSave}
          className="h-full"
        />
      </motion.main>

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
};

export default ArticleEditorPage; 