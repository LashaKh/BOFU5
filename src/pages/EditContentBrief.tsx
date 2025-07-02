import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { getBriefById, updateBrief } from '../lib/contentBriefs';
import { ContentBrief } from '../types/contentBrief';
import { toast } from 'react-hot-toast';
import { BriefContent } from '../components/content-brief/BriefContent';
import { ContentBriefEditorSimple } from '../components/content-brief/ContentBriefEditorSimple';
import { SimpleApprovalButton } from '../components/content/SimpleApprovalButton';
import { 
  ensureLinksAsText, 
  ensureLinksAsArray,
  ensureTitlesAsArray 
} from '../utils/contentFormatUtils';
import { 
  cleanBriefContent, 
  shouldUseJsonEditor, 
  prepareContentForEditor 
} from '../utils/contentProcessor';
import { motion } from 'framer-motion';
import { Edit3, ArrowLeft, Package, FileText, AlertCircle } from 'lucide-react';
import { useBriefAutoSave } from '../hooks/useBriefAutoSave';
import { supabase } from '../lib/supabase';

export default function EditContentBrief() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [useJsonEditor, setUseJsonEditor] = useState(false);
  const [jsonContent, setJsonContent] = useState('');

  // Use the extracted auto-save hook
  const { saving, saveToSupabase, handleAutoSave } = useBriefAutoSave(id, brief);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-inside',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside',
          },
        },
      }),
    ],
    content: brief?.brief_content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] border border-gray-200 rounded-lg p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const brief_content = editor.getHTML();
      handleAutoSave({ brief_content });
    },
  });

  // Handle JSON content update
  const handleJsonUpdate = useCallback(
    (content: string, newLinks: string[], newTitles: string[]) => {
      const cleanedContent = cleanBriefContent(content);
      setJsonContent(cleanedContent);

      // Update the main brief state
      setBrief(prev => {
        if (!prev) return null;
        const internal_links_array = ensureLinksAsArray(newLinks);
        const possible_article_titles_array = ensureLinksAsArray(newTitles);

        return {
          ...prev,
          brief_content: cleanedContent,
          brief_content_text: cleanedContent,
          internal_links: internal_links_array,
          possible_article_titles: possible_article_titles_array,
        };
      });

      // Trigger debounced save with all data pieces
      console.log('EditContentBrief.handleJsonUpdate triggering auto-save with:', {
        brief_content: cleanedContent,
        internal_links: newLinks,
        possible_article_titles: newTitles,
        titlesLength: newTitles.length,
        titlesIsEmpty: newTitles.length === 0,
      });
      handleAutoSave({
        brief_content: cleanedContent,
        internal_links: newLinks,
        possible_article_titles: newTitles,
      });
    },
    [handleAutoSave]
  );

  // Function to fetch suggestions - now handled in loadBrief
  const fetchSuggestions = useCallback(async () => {
    // Suggestions are now loaded with the initial brief data
    return;
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Parse links and titles from various formats
  const parseLinksAndTitles = (data: any) => {
    const parseField = (field: any): string[] => {
      if (Array.isArray(field)) {
        return field;
      } else if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => {
              if (typeof item === 'string') {
                try {
                  const parsedItem = JSON.parse(item);
                  if (Array.isArray(parsedItem)) {
                    return parsedItem;
                  }
                  return item;
                } catch {
                  return item;
                }
              }
              return item;
            }).flat();
          } else {
            return [field];
          }
        } catch {
          return field.split('\n').filter((item: string) => item.trim().length > 0);
        }
      }
      return [];
    };

    return {
      parsedInternalLinks: parseField(data.internal_links),
      parsedArticleTitles: parseField(data.possible_article_titles)
    };
  };

  // Load brief data
  const loadBrief = useCallback(async () => {
      if (!id) {
        console.log('No brief ID provided');
        return;
      }

      try {
        setLoading(true);
        const data = await getBriefById(id);
        
        if (!data) {
          console.error('No brief found with ID:', id);
          toast.error('Content brief not found');
          navigate('/dashboard/content-briefs');
          return;
        }

        // getBriefById already handles parsing, so use the parsed data directly
        console.log('Data received from getBriefById:', {
          internal_links: data.internal_links,
          suggested_links: data.suggested_links,
          possible_article_titles: data.possible_article_titles,
          suggested_titles: data.suggested_titles,
          possible_article_titles_type: Array.isArray(data.possible_article_titles) ? 'array' : typeof data.possible_article_titles,
          possible_article_titles_length: Array.isArray(data.possible_article_titles) ? data.possible_article_titles.length : 'N/A'
        });
        
        // Use the already-parsed and transformed data from getBriefById
        const transformedBrief = {
          ...data,
          product_name: data.product_name || 'Untitled Product',
          status: data.status || 'pending'
        };
        
        console.log('Brief loaded:', transformedBrief);

        // Prepare content for editor using extracted utilities
        const contentToUse = prepareContentForEditor(
          data?.brief_content_text || data?.brief_content
        );
        setJsonContent(contentToUse);

        // Set editor content if available
        if (editor && contentToUse) {
          editor.commands.setContent(contentToUse);
        }

        // Determine editor mode using extracted utility
        setUseJsonEditor(shouldUseJsonEditor(data.brief_content));
        
        setBrief(transformedBrief);
      } catch (error) {
        console.error('Error loading brief:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load content brief');
        navigate('/dashboard/content-briefs');
      } finally {
        setLoading(false);
      }
  }, [id, navigate, editor]);

  useEffect(() => {
    loadBrief();
  }, [loadBrief]);

  // Real-time subscription for content brief updates
  useEffect(() => {
    if (!id) return;

    console.log('🔄 Setting up real-time subscription for content brief:', id);
    
    const subscription = supabase
      .channel(`content_brief_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_briefs',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('🔄 Real-time update detected for content brief:', payload);
          
          // Reload the brief data to get the latest changes
          loadBrief();
          
          // Show a notification that the content was updated
          toast.success('Content brief updated', {
            duration: 2000,
            position: 'bottom-right'
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('🔄 Cleaning up real-time subscription for content brief:', id);
      subscription.unsubscribe();
    };
  }, [id, loadBrief]);

  // Set initial content when editor is ready and brief is loaded
  useEffect(() => {
    if (editor && brief?.brief_content) {
      editor.commands.setContent(brief.brief_content);
    }
  }, [editor, brief?.brief_content]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setBrief(prev => prev ? { ...prev, product_name: newTitle } : null);
    handleAutoSave({ brief_content: editor?.getHTML(), product_name: newTitle });
  }, [handleAutoSave, editor]);

  // Handle approval success
  const handleApprovalSuccess = useCallback(() => {
    toast.success('Content brief sent to AirOps successfully');
    setBrief(prev => prev ? { ...prev, status: 'approved' } : null);
    if (id) {
      updateBrief(id, { status: 'approved' });
    }
  }, [id]);

  if (loading) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </UserDashboardLayout>
    );
  }

  if (!brief) {
    return (
      <UserDashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Brief not found</h3>
          <button
            onClick={() => navigate('/dashboard/content-briefs')}
            className="text-primary-600 hover:text-primary-900"
          >
            Return to Content Briefs
          </button>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Professional Navigation Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard/content-briefs')}
                className="group flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-all duration-200 rounded-lg hover:bg-gray-100/80"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="font-medium">Back to Content Briefs</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                  <Edit3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Edit Content Brief</h1>
                  <p className="text-sm text-gray-500">Customize your content strategy</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status Indicator */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Auto-saving</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Main Content Container */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-purple-50/30"></div>
        </div>
        
        {/* Content Container */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-20"
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-gray-600 font-medium">Loading content brief...</div>
                <div className="text-sm text-gray-500">Please wait while we fetch your data</div>
              </div>
            </motion.div>
          ) : brief ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Professional Product Header Card */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 rounded-2xl opacity-80"></div>
                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
                  <div className="bg-blue-600 px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white">{brief.product_name}</h2>
                          <p className="text-blue-100 font-medium">Content Brief Editor</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <SimpleApprovalButton 
                          briefId={id || ''}
                          onSuccess={handleApprovalSuccess}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Product Info Section */}
                  {brief.product_name && (
                    <div className="px-8 py-6 border-b border-gray-200/50">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mt-1">
                          <FileText className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">Product Overview</h3>
                          <p className="text-gray-700 leading-relaxed">Editing content brief for <span className="font-medium">{brief.product_name}</span></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Editor Section */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-2xl opacity-60"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-white">
                    <div className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                          <Edit3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Content Editor</h3>
                          <p className="text-gray-600">Edit and organize your content brief sections</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <ContentBriefEditorSimple
                      initialContent={brief?.brief_content_text || brief?.brief_content || ''}
                      onUpdate={(content: string, links: string[], titles: string[]) => {
                        console.log('ContentBriefEditorSimple onUpdate called with titles:', titles, 'isEmpty:', titles.length === 0);
                        setBrief(prev => prev ? { ...prev, brief_content: content, internal_links: links, possible_article_titles: titles } : null);
                        handleAutoSave({ brief_content: content, internal_links: links, possible_article_titles: titles });
                      }}
                      briefId={id || ''}
                      researchResultId={brief?.research_result_id}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Content Brief Not Found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  The content brief you're looking for doesn't exist or you don't have permission to access it.
                </p>
                <button
                  onClick={() => navigate('/dashboard/content-briefs')}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Return to Content Briefs
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
