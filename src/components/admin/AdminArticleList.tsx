import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  User,
  Clock,
  Edit,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { adminArticlesApi } from '../../lib/adminApi';
import type { 
  ArticleListItem, 
  ArticleListParams, 
  UserProfile,
  AdminArticlesResponse 
} from '../../types/adminApi';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminArticleListProps {
  selectedUser?: UserProfile | null;
  onArticleSelect?: (article: ArticleListItem) => void;
  onEditArticle?: (article: ArticleListItem) => void;
  className?: string;
}

type SortField = 'last_edited_at' | 'created_at' | 'title' | 'editing_status';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'draft' | 'editing' | 'review' | 'final';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  editing: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  final: 'bg-green-100 text-green-800'
};

const STATUS_LABELS = {
  draft: 'Draft',
  editing: 'Editing',
  review: 'Review',
  final: 'Final'
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const AdminArticleList: React.FC<AdminArticleListProps> = ({
  selectedUser,
  onArticleSelect,
  onEditArticle,
  className = ''
}) => {
  // State
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortField, setSortField] = useState<SortField>('last_edited_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(20);

  // Fetch articles function
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Request timeout - please try again');
      toast.error('Request timed out. Please check your connection and try again.');
    }, 30000); // 30 second timeout

    try {
      const params: ArticleListParams = {
        page: currentPage,
        limit: pageSize,
        sort_by: sortField,
        sort_order: sortOrder
      };

      // Add search if provided
      if (searchTerm.trim()) {
        params.search = searchTerm;
      }

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Add user filter if user is selected
      if (selectedUser) {
        params.user_id = selectedUser.id;
      }

      // Add date range if provided
      if (dateRange.start) {
        params.start_date = dateRange.start;
      }
      if (dateRange.end) {
        params.end_date = dateRange.end;
      }

      const { data, error } = await adminArticlesApi.getArticles(params);

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      if (error) {
        setError(error.error);
        toast.error(`Failed to load articles: ${error.error}`);
      } else if (data) {
        setArticles(data.articles);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
        setCurrentPage(data.page);
      }
    } catch (err) {
      // Clear the timeout since we got an error response
      clearTimeout(timeoutId);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load articles';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, dateRange, sortField, sortOrder, selectedUser]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      setCurrentPage(1);
      fetchArticles();
    }, 300),
    [fetchArticles]
  );

  // Effects
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Effect to trigger search when searchTerm changes
  useEffect(() => {
    debouncedSearch();
  }, [searchTerm, debouncedSearch]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateRange, selectedUser, sortField, sortOrder]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setSortField('last_edited_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sort indicator component
  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedUser ? `Articles by ${selectedUser.email}` : 'All Articles'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalItems} total articles
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                showFilters 
                  ? 'border-blue-300 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button
              onClick={fetchArticles}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 bg-gray-50"
          >
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search articles..."
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="editing">Editing</option>
                    <option value="review">Review</option>
                    <option value="final">Final</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear all filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Title
                  <SortIndicator field="title" />
                </div>
              </th>
              {!selectedUser && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('editing_status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIndicator field="editing_status" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('last_edited_at')}
              >
                <div className="flex items-center">
                  Last Edited
                  <SortIndicator field="last_edited_at" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  Created
                  <SortIndicator field="created_at" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={selectedUser ? 7 : 8} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Loading articles...</p>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={selectedUser ? 7 : 8} className="px-6 py-12 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
                  <p className="text-red-600 mt-2">{error}</p>
                  <button
                    onClick={fetchArticles}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Try again
                  </button>
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={selectedUser ? 7 : 8} className="px-6 py-12 text-center">
                  <FileText className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">No articles found</p>
                  {(searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr 
                  key={article.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onArticleSelect?.(article)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {article.title || 'Untitled Article'}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {article.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  {!selectedUser && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {article.user_email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {article.user_company}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {article.product_name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[article.editing_status]}`}>
                      {STATUS_LABELS[article.editing_status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      {formatDate(article.last_edited_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      {formatDate(article.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      v{article.article_version}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onArticleSelect?.(article);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View article"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditArticle?.(article);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit article"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Show more options menu
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
              </span>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 