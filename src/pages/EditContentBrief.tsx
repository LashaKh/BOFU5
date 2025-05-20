import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { getBriefById, updateBrief } from '../lib/contentBriefs';
import { ContentBrief } from '../types/contentBrief';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import { BriefContent } from '../components/content-brief/BriefContent';
import { ContentBriefEditorSimple } from '../components/content-brief/ContentBriefEditorSimple';
import { ApproveContentBrief } from '../components/content/ApproveContentBrief';


export default function EditContentBrief() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useJsonEditor, setUseJsonEditor] = useState(false);
  const [jsonContent, setJsonContent] = useState('');

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

  // Helper function to ensure links are in string format (text)
  const ensureLinksAsText = (links: string[] | string | undefined): string => {
    if (!links) return '';
    if (typeof links === 'string') return links;
    return links.join('\n');
  };
  
  // Helper function to ensure array format when needed
  const ensureLinksAsArray = (links: string[] | string | undefined): string[] => {
    if (!links) return [];
    if (typeof links === 'string') {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(links);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Not JSON, split by newlines
        return links.split('\n').filter(l => l.trim().length > 0);
      }
    }
    if (Array.isArray(links)) return links;
    return [];
  };

  // Direct save function without debounce - more reliable for array values
  const saveToSupabase = useCallback(async (updates: {
    brief_content?: string;
    brief_content_text?: string;
    product_name?: string;
    status?: ContentBrief['status'];
    internal_links?: string[] | string; // Accept either string[] or string (for text format)
    possible_article_titles?: string[] | string; // Accept either string[] or string (for text format)
    suggested_content_frameworks?: string;
  }) => {
    if (!id || !brief) return;
    
    // Log the updates we're saving to help with debugging
    console.log('SAVING TO SUPABASE - RECEIVED UPDATES:', updates);
    
    try {
      setSaving(true);
      console.log('Saving to Supabase:', updates);
      
      // Always get latest data from state to ensure we have complete values
      const completeUpdates = {
        ...updates,
        // Include complete brief data
        brief_content: updates.brief_content || brief.brief_content,
        brief_content_text: updates.brief_content_text || brief.brief_content_text || updates.brief_content || brief.brief_content,
        product_name: updates.product_name || brief.product_name || '',
        status: updates.status || brief.status || 'pending',
        // Always ensure these are saved as text with newlines (string format for Supabase)
        internal_links: updates.internal_links !== undefined ? ensureLinksAsText(updates.internal_links) : ensureLinksAsText(brief.internal_links || []),
        possible_article_titles: updates.possible_article_titles !== undefined ? ensureLinksAsText(updates.possible_article_titles) : ensureLinksAsText(brief.possible_article_titles || []),
        suggested_content_frameworks: updates.suggested_content_frameworks || brief.suggested_content_frameworks || ''
      };
      
      console.log('Complete update to Supabase:', completeUpdates);
      
      // IMPORTANT: Allow empty values to be saved to Supabase
      // These lines are intentionally removed to allow clearing these fields
      // Log what we're doing to help debug
      console.log('Preserving current internal_links:', completeUpdates.internal_links);
      console.log('Preserving current possible_article_titles:', completeUpdates.possible_article_titles);
      
      const result = await updateBrief(id, completeUpdates);
      console.log('Update result:', result);
      
      // Update the local brief state to match what's in the database
      setBrief(prev => prev ? {
        ...prev,
        ...completeUpdates
      } : null);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [id, brief]);
  
  // Auto-save debounced function for text fields
  const handleAutoSave = useCallback(
    debounce(async (updates: {
      brief_content?: string;
      brief_content_text?: string;
      product_name?: string;
      status?: ContentBrief['status'];
      internal_links?: string[];
      possible_article_titles?: string[];
      suggested_content_frameworks?: string;
    }) => {
      saveToSupabase(updates);
    }, 1000),
    [saveToSupabase]
  );

  // Helper function to clean content with code block markers
  const cleanBriefContent = (content: string): string => {
    if (!content) return '';
    
    // Check if content has markdown code block markers
    const codeBlockRegex = /^\s*```(?:json|javascript|js)?([\s\S]*?)```\s*$/;
    const match = content.match(codeBlockRegex);
    
    if (match && match[1]) {
      console.log('EditContentBrief: Detected content in code blocks, cleaning');
      return match[1].trim();
    }
    
    return content;
  };

  // Handle JSON content update
  const handleJsonUpdate = useCallback(
    (content: string, newLinks: string[], newTitles: string[]) => {
      const cleanedContent = cleanBriefContent(content);
      setJsonContent(cleanedContent); // Update content for the JSON editor display

      // Update the main brief state
      setBrief(prev => {
        if (!prev) return null;
        // Ensure state stores arrays; saveToSupabase will handle text conversion
        const internal_links_array = ensureLinksAsArray(newLinks);
        const possible_article_titles_array = ensureLinksAsArray(newTitles);

        return {
          ...prev,
          brief_content: cleanedContent,
          brief_content_text: cleanedContent, // Assuming text is same as content for this editor path
          internal_links: internal_links_array,
          possible_article_titles: possible_article_titles_array,
        };
      });

      // Trigger debounced save with all data pieces
      console.log('EditContentBrief.handleJsonUpdate triggering auto-save with:', {
        brief_content: cleanedContent,
        internal_links: newLinks, // Pass as received, ensureLinksAsText is in saveToSupabase
        possible_article_titles: newTitles, // Pass as received
      });
      handleAutoSave({
        brief_content: cleanedContent,
        internal_links: newLinks,
        possible_article_titles: newTitles,
      });
    },
    [cleanBriefContent, handleAutoSave, ensureLinksAsArray] // Updated dependencies
  );

  // Function to handle link insertion was removed as it's now handled in BriefContent

  // Function to fetch suggestions - now handled in loadBrief
  const fetchSuggestions = useCallback(async () => {
    // Suggestions are now loaded with the initial brief data
    return;
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Load brief data
  useEffect(() => {
    async function loadBrief() {
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

        // First parse text-formatted links and titles into proper arrays
        let parsedInternalLinks: string[] = [];
        
        if (Array.isArray(data.internal_links)) {
          parsedInternalLinks = data.internal_links;
        } else if (typeof data.internal_links === 'string') {
          const internalLinksStr = data.internal_links as string;
          
          // Check if it's a JSON array (stringified)
          try {
            // First try parsing as a JSON array
            const parsed = JSON.parse(internalLinksStr);
            console.log('Parsed internal_links JSON:', parsed);
            
            if (Array.isArray(parsed)) {
              // It's already a proper array
              parsedInternalLinks = parsed.map((item: any) => {
                // Handle nested JSON strings that might be inside the array
                if (typeof item === 'string') {
                  try {
                    const parsedItem = JSON.parse(item);
                    if (Array.isArray(parsedItem)) {
                      return parsedItem; // This will return the inner array
                    }
                    return item;
                  } catch {
                    return item; // Return as-is if not JSON
                  }
                }
                return item;
              }).flat(); // Flatten in case we had nested arrays
            } else {
              // If it's JSON but not an array, add it as a single item
              parsedInternalLinks = [internalLinksStr];
            }
          } catch (e) {
            // Not valid JSON, fall back to newline splitting
            console.log('Not valid JSON, using newline splitting for internal_links');
            parsedInternalLinks = internalLinksStr.split('\n').filter((link: string) => link.trim().length > 0);
          }
        }
        
        // Do the same for possible_article_titles
        let parsedArticleTitles: string[] = [];
        
        if (Array.isArray(data.possible_article_titles)) {
          parsedArticleTitles = data.possible_article_titles;
        } else if (typeof data.possible_article_titles === 'string') {
          const titleStr = data.possible_article_titles as string;
          
          // Check if it's a JSON array (stringified)
          try {
            // First try parsing as a JSON array
            const parsed = JSON.parse(titleStr);
            console.log('Parsed possible_article_titles JSON:', parsed);
            
            if (Array.isArray(parsed)) {
              // It's already a proper array
              parsedArticleTitles = parsed.map((item: any) => {
                // Handle nested JSON strings that might be inside the array
                if (typeof item === 'string') {
                  try {
                    const parsedItem = JSON.parse(item);
                    if (Array.isArray(parsedItem)) {
                      return parsedItem; // This will return the inner array
                    }
                    return item;
                  } catch {
                    return item; // Return as-is if not JSON
                  }
                }
                return item;
              }).flat(); // Flatten in case we had nested arrays
            } else {
              // If it's JSON but not an array, add it as a single item
              parsedArticleTitles = [titleStr];
            }
          } catch (e) {
            // Not valid JSON, fall back to newline splitting
            console.log('Not valid JSON, using newline splitting for possible_article_titles');
            parsedArticleTitles = titleStr.split('\n').filter((title: string) => title.trim().length > 0);
          }
        }
          
        // Transform the data to match UI expectations
        const transformedBrief = {
          ...data,
          product_name: data.product_name || 'Untitled Product',
          title: data.title || data.product_name || 'Untitled Brief',
          status: data.status || 'pending',
          // Use the parsed arrays
          internal_links: parsedInternalLinks,
          possible_article_titles: parsedArticleTitles,
          // Create object structures for UI components based on the parsed arrays
          suggested_titles: parsedArticleTitles.map((title: string) => ({ title, score: 0 })),
          suggested_links: parsedInternalLinks.map((url: string) => {
            let displayTitle = url; // Default to the full URL string
            const lastSegment = url.substring(url.lastIndexOf('/') + 1).trim();

            if (lastSegment) {
              displayTitle = lastSegment;
            } else {
              // If lastSegment is empty (e.g., URL ends with '/'), try to use hostname
              if (url.includes('://')) {
                try {
                  displayTitle = new URL(url).hostname;
                } catch (e) {
                  // Parsing failed, displayTitle remains the original url, which is safe
                  console.warn(`Failed to parse URL for hostname: ${url}. Falling back to full URL or derived segment for title.`);
                }
              }
            }
            return { title: displayTitle, url, relevance: 1 };
          })
        };
        
        console.log('Loaded internal_links:', data.internal_links);
        console.log('Loaded possible_article_titles:', data.possible_article_titles);

        console.log('Brief loaded:', transformedBrief);

        // Check if content is JSON format
        try {
          let contentToUse = '';
        
          if (data?.brief_content_text && typeof data.brief_content_text === 'string') {
            // Use the brief_content_text field if available and it's a string
            contentToUse = data.brief_content_text;
            console.log('Using brief_content_text:', typeof contentToUse === 'string' ? contentToUse.substring(0, 50) : 'Not a string');
          } else if (data?.brief_content) {
            // Fall back to brief_content
            if (typeof data.brief_content === 'string') {
              contentToUse = data.brief_content;
              console.log('Using brief_content:', contentToUse.substring(0, 50));
            } else if (typeof data.brief_content === 'object') {
              // If brief_content is an object, convert it to a string representation
              contentToUse = JSON.stringify(data.brief_content, null, 2);
              console.log('Using stringified brief_content object');
            } else {
              console.log('brief_content is neither string nor object:', typeof data.brief_content);
            }
          } else {
            console.log('No content found in brief');
          }
        
          // Clean the content to remove code block markers or other issues
          if (typeof contentToUse === 'string' && contentToUse.includes('```')) {
            console.log('Content contains markdown code blocks, cleaning them');
            contentToUse = cleanBriefContent(contentToUse);
          }
        
          setJsonContent(contentToUse);
        
          // If we have an editor, set its content
          if (editor && contentToUse) {
            editor.commands.setContent(contentToUse);
          }
        } catch (e) {
          console.error('Error loading brief content:', e);
        }

        // Check if content is JSON format
        try {
          if (data.brief_content && typeof data.brief_content === 'string') {
            JSON.parse(data.brief_content);
            setUseJsonEditor(true);
          } else if (data.brief_content && typeof data.brief_content === 'object') {
            // Already an object, so we'll use the JSON editor
            setUseJsonEditor(true);
          }
        } catch (e) {
          // Not valid JSON, will use standard editor
          setUseJsonEditor(false);
        }
        
        setBrief(transformedBrief);
      } catch (error) {
        console.error('Error loading brief:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load content brief');
        navigate('/dashboard/content-briefs');
      } finally {
        setLoading(false);
      }
    }

    loadBrief();
  }, [id, navigate]);

  // Set initial content when editor is ready and brief is loaded
  useEffect(() => {
    if (editor && brief?.brief_content) {
      editor.commands.setContent(brief.brief_content);
    }
  }, [editor, brief?.brief_content]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setBrief(prev => prev ? { ...prev, title: newTitle } : null);
    handleAutoSave({ brief_content: editor?.getHTML(), product_name: newTitle });
  }, [handleAutoSave, editor]);

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
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex-1">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Product Name</label>
                <input
                  type="text"
                  value={brief.product_name || ''}
                  onChange={(e) => {
                    setBrief(prev => prev ? { ...prev, product_name: e.target.value } : null);
                    handleAutoSave({ product_name: e.target.value });
                  }}
                  className="text-2xl font-bold text-gray-900 w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                  placeholder="Enter product name"
                />
              </div>
              <div className="flex items-center text-sm text-gray-500 gap-3">
                <span>Last updated: {new Date(brief.updated_at).toLocaleDateString()} {new Date(brief.updated_at).toLocaleTimeString()}</span>
                {brief.status && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center ${
                      brief.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : brief.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : brief.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      brief.status === 'approved' ? 'bg-green-600' : 
                      brief.status === 'rejected' ? 'bg-red-600' : 
                      brief.status === 'pending' ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}></span>
                    {brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}
                  </span>
                )}
                {saving && <span className="text-primary-500 animate-pulse">Saving...</span>}
              </div>
            </div>
            
            <div className="hidden sm:block">
              <ApproveContentBrief
                contentBrief={brief.brief_content || editor?.getHTML() || ''}
                articleTitle={
                  Array.isArray(brief.possible_article_titles) && brief.possible_article_titles.length > 0 
                    ? brief.possible_article_titles[0] 
                    : (typeof brief.possible_article_titles === 'string' ? brief.possible_article_titles.split('\n')[0] : brief.title || '')
                }
                internalLinks={
                  // Handle both string and array formats for internal_links
                  typeof brief.internal_links === 'string' 
                    ? brief.internal_links 
                    : (Array.isArray(brief.internal_links) 
                      ? brief.internal_links.join('\n') 
                      : (brief.suggested_links?.map(link => link.url).join('\n') || ''))
                }
                contentFramework={brief.suggested_content_frameworks || brief.framework || ''}
                briefId={id || ''} // Pass the briefId
                onSuccess={() => {
                  toast.success('Content brief sent to AirOps successfully');
                  setBrief(prev => prev ? { ...prev, status: 'approved' } : null);
                  if (id) {
                    updateBrief(id, { status: 'approved' });
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col">
          <div className="bg-white rounded-lg shadow-sm mb-6">
            {useJsonEditor ? (
              <div className="p-6">
                <ContentBriefEditorSimple
                  initialContent={jsonContent} 
                  onUpdate={handleJsonUpdate}
                  briefId={id || ''}
                />
              </div>
            ) : (
              <BriefContent 
                editor={editor} 
                briefId={id || ''} 
                articleTitle={brief.title}
                onArticleTitleChange={(title) => {
                  // Update title in brief and save to server
                  handleTitleChange({ target: { value: title } } as React.ChangeEvent<HTMLInputElement>);
                }}
                onSuggestedTitlesChange={(titles) => {
                  console.log('EditContentBrief received titles update:', titles);
                  const titlesArray = ensureLinksAsArray(titles); // Use existing helper
                  setBrief(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      possible_article_titles: titlesArray, // Store as array
                    };
                  });
                  // Direct saveToSupabase and toast removed.
                  // The Tiptap editor's onUpdate will trigger handleAutoSave,
                  // which calls saveToSupabase, picking up the latest titles from state.
                  if (!titles || titlesArray.length === 0) {
                     console.warn('BriefContent: Suggested titles cleared or empty.');
                  }
                }}
                onInternalLinksChange={(links) => {
                  console.log('EditContentBrief received internal links update:', links);
                  const linksArray = ensureLinksAsArray(links); // Use existing helper
                  setBrief(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      internal_links: linksArray, // Store as array
                    };
                  });
                  // Direct saveToSupabase and toast removed.
                  // The Tiptap editor's onUpdate will trigger handleAutoSave,
                  // which calls saveToSupabase, picking up the latest links from state.
                  if (!links || linksArray.length === 0) {
                    console.warn('BriefContent: Internal links cleared or empty.');
                  }
                }}
                suggestedTitles={Array.isArray(brief.possible_article_titles) ? brief.possible_article_titles.map(title => ({ title, score: 0 })) : (brief.suggested_titles || [])}
                suggestedLinks={Array.isArray(brief.internal_links) ? brief.internal_links.map(url => ({ title: typeof url === 'string' ? url.split('/').pop() || url : url, url, relevance: 0 })) : (brief.suggested_links || [])}
              />
            )}
          </div>
          
          <div className="sm:hidden flex justify-center mt-4 mb-8">
            <ApproveContentBrief
              contentBrief={brief.brief_content || editor?.getHTML() || ''}
              articleTitle={
                Array.isArray(brief.possible_article_titles) && brief.possible_article_titles.length > 0 
                  ? brief.possible_article_titles[0] 
                  : (typeof brief.possible_article_titles === 'string' ? brief.possible_article_titles.split('\n')[0] : brief.title || '')
              }
              internalLinks={
                // Handle both string and array formats for internal_links
                typeof brief.internal_links === 'string' 
                  ? brief.internal_links 
                  : (Array.isArray(brief.internal_links) 
                    ? brief.internal_links.join('\n') 
                    : (brief.suggested_links?.map(link => link.url).join('\n') || ''))
              }
              contentFramework={brief.suggested_content_frameworks || brief.framework || ''}
              briefId={id || ''} // Pass the briefId
              onSuccess={() => {
                toast.success('Content brief sent to AirOps successfully');
                setBrief(prev => prev ? { ...prev, status: 'approved' } : null);
                if (id) {
                  updateBrief(id, { status: 'approved' });
                }
              }}
            />
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}
