import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { ContentBrief } from '../types/contentBrief';
import { motion } from 'framer-motion';
import { Edit, FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// Enhanced interface for UI display
interface EnhancedContentBrief extends ContentBrief {
  title: string;
  date: Date;
  keywords: string[];
  author: string;
}

// Card styles
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
`;

export default function ApprovedContent() {
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
  const [totalApproved, setTotalApproved] = useState(0);

  // Load approved briefs
  useEffect(() => {
    if (user) {
      loadApprovedBriefs();
    }
  }, [user]);
  
  const loadApprovedBriefs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get briefs from Supabase with status 'approved'
      const { data, error, count } = await supabase
        .from('content_briefs')
        .select('*', { count: 'exact' })
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process each brief to generate keyword-based titles
      const transformedBriefs: EnhancedContentBrief[] = await Promise.all(
        data.map(async (brief) => {
          // Helper function to generate title using keywords instead of product_name
          const generateTitle = async () => {
            // First try to get keywords from approved product data if research_result_id exists
            if (brief.research_result_id) {
              try {
                const { data: approvedProduct, error: productError } = await supabase
                  .from('approved_products')
                  .select('product_data')
                  .eq('research_result_id', brief.research_result_id)
                  .single();

                if (!productError && approvedProduct?.product_data) {
                  // Extract keywords from product_data
                  const productData = typeof approvedProduct.product_data === 'string' 
                    ? JSON.parse(approvedProduct.product_data) 
                    : approvedProduct.product_data;
                  
                  if (productData.keywords && Array.isArray(productData.keywords) && productData.keywords.length > 0) {
                    // Use the first keyword for the title
                    return `${productData.keywords[0]} - Content Brief`;
                  }
                }
              } catch (productError) {
                console.warn('Could not fetch keywords from approved product:', productError);
              }
            }
            
            // Fallback to product_name if no keywords available
            return brief.product_name || 'Untitled Brief';
          };

          const title = await generateTitle();
          
          return {
            ...brief,
            status: brief.status || 'approved',
            title,
            date: new Date(brief.created_at),
            keywords: [],
            author: user.email || 'Anonymous'
          };
        })
      );
      
      setBriefs(transformedBriefs);
      setTotalApproved(count || 0);
    } catch (error) {
      console.error('Error loading approved briefs:', error);
      toast.error('Failed to load approved content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0 text-gray-800 flex items-center">
            <span className="bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">Approved Content</span>
          </h1>
        </div>
        
        {/* Dashboard header with stats */}
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg mr-4">
              <FileText size={24} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Approved Briefs</h2>
              <p className="text-sm text-gray-500 mt-1">
                You have <span className="font-medium text-green-600">{totalApproved}</span> approved {totalApproved === 1 ? 'brief' : 'briefs'} ready for use
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
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
                <div className="flex justify-end gap-2">
                  <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : briefs.length === 0 ? (
          <div className="text-center py-12 bg-white shadow-sm rounded-xl">
            <div className="p-4 bg-gray-50 rounded-full inline-flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No approved content found</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Create content briefs and get them approved to see them here.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/dashboard/content-briefs')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Go to Content Briefs
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {briefs.map((brief) => (
              <motion.div
                key={brief.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden brief-card border-l-4 border-l-green-500"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Approved
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
                                loadApprovedBriefs();
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
                      onClick={() => navigate(`/dashboard/content-briefs/${brief.id}/edit`)}
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
      </div>
    </UserDashboardLayout>
  );
}
