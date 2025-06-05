import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { ContentBrief } from '../types/contentBrief';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Edit, Clock, Check, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

// Helper function to extract keywords from brief content
const extractKeywords = (content: any = ''): string[] => {
  if (!content || typeof content !== 'string') return ['content', 'brief'];
  
  // Extract words from content, filter common words, and return top 4 as keywords
  const words = content.toLowerCase().split(/\s+/);
  const commonWords = new Set(['the', 'and', 'of', 'to', 'in', 'a', 'for', 'with', 'on', 'is', 'are', 'that', 'this', 'by', 'as', 'an', 'it', 'if', 'from', 'at', 'or', 'be', 'so']);
  const keywordMap: Record<string, number> = {};
  
  words.forEach(word => {
    if (word.length > 3 && !commonWords.has(word)) {
      keywordMap[word] = (keywordMap[word] || 0) + 1;
    }
  });
  
  const sortedKeywords = Object.entries(keywordMap)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 4);
  
  return sortedKeywords.length ? sortedKeywords : ['content', 'brief'];
};

// Add enhanced interface for UI display
interface EnhancedContentBrief extends ContentBrief {
  title: string;
  date: Date;
  keywords: string[];
  author: string;
}

// Card and pagination styles
const cardStyles = `
  .brief-card {
    transition: all 0.2s ease-in-out;
    border: 1px solid #e5e7eb;
  }
  .brief-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.1);
  }
  .brief-card .action-btn {
    @apply inline-flex items-center justify-center p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200;
  }
  .brief-card .keyword-tag {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200;
  }
  .pagination-btn {
    @apply flex items-center justify-center w-8 h-8 rounded-full border transition-colors duration-200;
  }
  .pagination-btn.active {
    @apply bg-primary-500 text-white border-primary-500;
  }
  .dashboard-stat {
    @apply p-4 rounded-xl shadow-sm border overflow-hidden transition-all duration-300;
  }
`;

export default function UserContentBriefs() {
  // Add the styles to the document head
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = cardStyles;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<EnhancedContentBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContentBrief['status'] | 'all'>('all');
  const [totalBriefs, setTotalBriefs] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadBriefs();
    }
  }, [user, page, statusFilter]);

  useEffect(() => {
    if (user) {
      loadBriefs();
    }
  }, []);

  const loadBriefs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error, count } = await supabase
        .from('content_briefs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const transformedBriefs: EnhancedContentBrief[] = data.map(brief => ({
        ...brief,
        status: brief.status || 'draft',
        title: brief.product_name || 'Untitled Brief',
        date: new Date(brief.created_at),
        keywords: extractKeywords(brief.brief_content) || ['content', 'brief'],
        author: user.email || 'Anonymous'
      }));
      
      setBriefs(transformedBriefs);
      setTotalBriefs(count || 0);
      setTotalPages(Math.ceil((count || 0) / 10));
      
      const drafts = transformedBriefs.filter(brief => brief.status === 'draft').length;
      const pending = transformedBriefs.filter(brief => brief.status === 'pending').length;
      const approved = transformedBriefs.filter(brief => brief.status === 'approved').length;
      
      setDraftCount(drafts);
      setPendingCount(pending);
      setApprovedCount(approved);
    } catch (error) {
      console.error('Error loading briefs:', error);
      toast.error('Failed to load content briefs');
    } finally {
      setLoading(false);
    }
  };

  // Status updates are currently not exposed in the UI

  const filteredBriefs = statusFilter === 'all'
    ? briefs
    : briefs.filter(brief => brief.status === statusFilter);

  return (
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0 text-gray-800 flex items-center">
            <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">Content Briefs</span>
          </h1>
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContentBrief['status'] | 'all')}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="dashboard-stat border-primary-100 bg-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Briefs</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalBriefs}</h3>
                </div>
                <div className="p-3 bg-primary-50 rounded-lg">
                  <FileText size={20} className="text-primary-500" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="dashboard-stat border-green-100 bg-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Approved</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{approvedCount}</h3>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Check size={20} className="text-green-500" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${totalBriefs ? (approvedCount / totalBriefs) * 100 : 0}%` }} 
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="dashboard-stat border-amber-100 bg-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Clock size={20} className="text-amber-500" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${totalBriefs ? (pendingCount / totalBriefs) * 100 : 0}%` }} 
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="dashboard-stat border-gray-100 bg-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Drafts</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{draftCount}</h3>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Edit size={20} className="text-gray-500" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-400 rounded-full" 
                  style={{ width: `${totalBriefs ? (draftCount / totalBriefs) * 100 : 0}%` }} 
                />
              </div>
            </motion.div>
          </div>

        {/* Removed New Content Brief form */}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="animate-pulse bg-white rounded-xl shadow-sm p-6 brief-card"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="h-20 bg-gray-100 rounded mb-4"></div>
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex justify-end gap-2">
                  <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : filteredBriefs.length === 0 ? (
          <div className="text-center py-12 bg-white shadow-sm rounded-xl">
            <div className="p-4 bg-gray-50 rounded-full inline-flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No content briefs found</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Get started by creating a new content brief for your products or services.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBriefs.map((brief) => (
              <motion.div
                key={brief.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-xl shadow-sm overflow-hidden brief-card ${
                  brief.status === 'approved' ? 'border-l-4 border-l-green-500' : 
                  brief.status === 'pending' ? 'border-l-4 border-l-amber-500' : 
                  'border-l-4 border-l-gray-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        brief.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        brief.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}
                    </span>
                    <p className="text-xs text-gray-500">
                      {new Date(brief.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{brief.title}</h3>
                  
                  {brief.product_name && (
                    <p className="text-sm text-primary-600 font-medium mb-3">
                      {brief.product_name}
                    </p>
                  )}

                  
                  <div className="flex justify-between items-center mt-4">
                    <button
                      title="Delete"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this brief? This action cannot be undone.')) {
                          supabase
                            .from('content_briefs')
                            .delete()
                            .eq('id', brief.id)
                            .then(({ error }) => {
                              if (error) {
                                console.error('Error deleting brief:', error);
                                toast.error('Failed to delete brief');
                              } else {
                                toast.success('Brief deleted successfully');
                                loadBriefs();
                              }
                            });
                        }
                      }}
                      className="action-btn text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      title="Edit"
                      onClick={() => navigate(`/dashboard/content-briefs/edit/${brief.id}`)}
                      className="action-btn bg-primary-50 text-primary-600 hover:bg-primary-100"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
