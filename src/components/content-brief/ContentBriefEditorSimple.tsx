import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ContentBriefDisplay } from './ContentBriefDisplay';
import { getBriefById } from '../../lib/contentBriefs';

interface ContentBriefEditorSimpleProps {
  initialContent: string;
  onUpdate: (content: string, links: string[], titles: string[]) => void;
  briefId?: string;
  researchResultId?: string; // Added for pain points dropdown
}

// Define expected structure from Supabase
interface ExtendedContentBrief {
  brief_content_text?: string;
  brief_content: string;
  internal_links?: string[];
  suggested_links?: Array<{title: string; url: string; relevance: number} | string>;
  possible_article_titles?: string[];
  suggested_titles?: Array<{title: string} | string>;
  research_result_id?: string; // Added for connecting to approved_products data
}

// Helper function to clean content - removes markdown code blocks and formatting issues
const cleanContent = (content: any): string => {
  if (!content) return '';
  
  // Handle non-string content by converting to string
  let cleanedContent = typeof content !== 'string' 
    ? JSON.stringify(content, null, 2) 
    : content;
    
  console.log('Cleaning content type:', typeof cleanedContent);
  if (typeof cleanedContent === 'string') {
    console.log('Cleaning content preview:', cleanedContent.substring(0, 200) + (cleanedContent.length > 200 ? '...' : ''));
  } else {
    console.log('Cleaning content is not a string:', cleanedContent);
    return '';
  }
  
  // Only process string content
  if (typeof cleanedContent !== 'string') {
    console.warn('Cannot clean non-string content');
    return JSON.stringify(cleanedContent, null, 2);
  }

  // SPECIAL CASE: Handle the exact pattern from the screenshot with ```json prefix
  // This is the most aggressive fix targeting the specific issue
  if (cleanedContent.startsWith('```json')) {
    console.log('Detected content starting with ```json, removing code block markers');
    // Find the end marker or just remove the start if no end is found
    const endMarkerIndex = cleanedContent.lastIndexOf('```');
    if (endMarkerIndex > 6) { // If there's a closing marker (6 is the length of ```json)
      cleanedContent = cleanedContent.substring(7, endMarkerIndex).trim();
    } else {
      cleanedContent = cleanedContent.substring(7).trim();
    }
    console.log('After aggressive cleaning:', cleanedContent.substring(0, 50));
  }
  
  // Regular multiline handling - more reliable than simple regex
  if (cleanedContent.includes('```')) {
    const lines = cleanedContent.split('\n');
    const filteredLines = [];
    let inCodeBlock = false;
    
    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue; // Skip the code block delimiter lines
      }
      
      if (!inCodeBlock) {
        filteredLines.push(line);
      }
    }
    
    cleanedContent = filteredLines.join('\n').trim();
    console.log('After line-by-line code block cleaning:', cleanedContent.substring(0, 50));
  }
  
  // As a final fallback, use regex for simple cases
  const codeBlockRegex = /^\s*```(?:json|javascript|js)?([\s\S]*?)```\s*$/;
  const match = cleanedContent.match(codeBlockRegex);
  
  if (match && match[1]) {
    // If wrapped in code blocks, extract the content inside
    console.log('Content appears to be in code blocks, extracting inner content');
    cleanedContent = match[1].trim();
  }

  // Check if the content starts and ends with proper JSON braces/brackets
  if (cleanedContent && !cleanedContent.startsWith('{') && !cleanedContent.startsWith('[')) {
    console.warn('Content does not start with proper JSON opening character');
    // Try to find a JSON object start in the content
    const jsonStartIndex = cleanedContent.indexOf('{');
    if (jsonStartIndex >= 0) {
      console.log('Found JSON object start at position', jsonStartIndex);
      cleanedContent = cleanedContent.substring(jsonStartIndex);
    }
  }
  
  return cleanedContent;
};

export function ContentBriefEditorSimple({ initialContent, onUpdate, briefId, researchResultId: propResearchResultId }: ContentBriefEditorSimpleProps): JSX.Element {
  // Use plain text rather than trying to parse JSON
  const [content, setContent] = useState(cleanContent(initialContent) || '');
  const [isSaving, setIsSaving] = useState(false);
  const [internalLinks, setInternalLinks] = useState<string[]>([]);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [researchResultId, setResearchResultId] = useState<string | undefined>(propResearchResultId);
  
  // Refs to prevent save conflicts
  const saveInProgress = useRef(false);
  const pendingSave = useRef(false);
  
  // Critical refs to break update cycles
  const isProcessingExternalUpdate = useRef(false);
  const updatesInitiatedByUser = useRef(false);
  const skipNextSave = useRef(false);

  // Sample template structure for when content is empty
  const emptyContentTemplate = JSON.stringify({
    pain_points: [],
    usps: [],
    capabilities: [],
    competitors: [],
    internal_links: [],
    external_links: [],
    target_audience: [],
    keywords: [],
    notes: []
  }, null, 2);
  

  // Fetch brief content if briefId is provided
  useEffect(() => {
    const fetchBrief = async () => {
      if (!briefId) return;
      
      try {
        setIsSaving(true);
        
        // Use the getBriefById function to get complete brief data
        const briefData = await getBriefById(briefId) as ExtendedContentBrief;
        
        if (!briefData) {
          console.error('No brief found with ID:', briefId);
          toast.error('Content brief not found');
          return;
        }
        
        // Extract and store research_result_id from the brief data
        if (briefData.research_result_id) {
          console.log('Found research_result_id in brief data:', briefData.research_result_id);
          setResearchResultId(briefData.research_result_id);
        }
        
        // Set the content from brief_content_text (preferred) or brief_content
        let briefContent = '';
        if (briefData.brief_content_text && typeof briefData.brief_content_text === 'string') {
          briefContent = briefData.brief_content_text;
        } else if (briefData.brief_content) {
          // Handle case when brief_content is an object
          if (typeof briefData.brief_content === 'object') {
            briefContent = JSON.stringify(briefData.brief_content, null, 2);
            console.log('brief_content is an object, stringified it');
          } else if (typeof briefData.brief_content === 'string') {
            briefContent = briefData.brief_content;
          } else {
            console.log('brief_content is neither string nor object:', typeof briefData.brief_content);
            briefContent = String(briefData.brief_content || '');
          }
        }
        
        // Clean the content before setting it
        const cleanedContent = cleanContent(briefContent);
        console.log('Original content type:', typeof briefContent);
        if (typeof briefContent === 'string') {
          console.log('Original content length:', briefContent.length, 'Cleaned content length:', cleanedContent.length);
          
          // Check if content contains code block markers and log for debugging
          if (briefContent.includes('```')) {
            console.log('Content contains markdown code block markers, cleaning them');
          }
        } else {
          console.log('Original content is not a string:', briefContent);
        }
        
        setContent(cleanedContent);
        
        // Show raw data for debugging
        console.log('RAW DATA - internal_links:', briefData.internal_links);
        console.log('RAW DATA - possible_article_titles:', briefData.possible_article_titles);
        console.log('RAW DATA - suggested_links:', briefData.suggested_links);
        console.log('RAW DATA - suggested_titles:', briefData.suggested_titles);
        
        // Extract internal links - prioritize suggested_links which are transformed from database
        if (briefData.suggested_links && Array.isArray(briefData.suggested_links) && briefData.suggested_links.length > 0) {
          const links = briefData.suggested_links.map((link: any) => {
            return typeof link === 'string' ? link : link.url;
          });
          console.log('[ContentBriefEditorSimple] Setting internal links from suggested_links:', links);
          console.log('[ContentBriefEditorSimple] Raw suggested_links data:', briefData.suggested_links);
          setInternalLinks(links);
        }
        // Fall back to internal_links if available
        else if (briefData.internal_links) {
          if (Array.isArray(briefData.internal_links)) {
            console.log('Setting internal links from internal_links array:', briefData.internal_links);
            setInternalLinks(briefData.internal_links);
          } else if (typeof briefData.internal_links === 'string') {
            // Handle text-based format - but first check if it's a stringified JSON array
            const internalLinksStr = briefData.internal_links as string;
            
            // Check if it's a JSON array (stringified)
            let links: string[] = [];
            try {
              // First try parsing as a JSON array
              const parsed = JSON.parse(internalLinksStr);
              console.log('Parsed internal_links JSON:', parsed);
              
              if (Array.isArray(parsed)) {
                // It's already a proper array
                links = parsed.map((item: any) => {
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
                links = [internalLinksStr];
              }
            } catch (e) {
              // Not valid JSON, fall back to newline splitting
              console.log('Not valid JSON, using newline splitting for internal_links');
              links = internalLinksStr.split('\n').filter((link: string) => link.trim().length > 0);
            }
            console.log('Setting internal links from internal_links text format:', links);
            setInternalLinks(links);
            
            // Double-check the state update is working
            setTimeout(() => {
              console.log('AFTER STATE UPDATE - internalLinks state:', internalLinks);
            }, 0);
          } else {
            console.log('internal_links is neither array nor string:', typeof briefData.internal_links);
          }
        } else {
          console.log('No internal links found in brief data');
        }
        
        // Extract suggested titles - prioritize suggested_titles which are transformed from database
        if (briefData.suggested_titles && Array.isArray(briefData.suggested_titles) && briefData.suggested_titles.length > 0) {
          const titles = briefData.suggested_titles.map((title: any) => {
            return typeof title === 'string' ? title : title.title;
          });
          console.log('Setting suggested titles from suggested_titles:', titles);
          setSuggestedTitles(titles);
        }
        // Fall back to possible_article_titles if available
        else if (briefData.possible_article_titles) {
          if (Array.isArray(briefData.possible_article_titles)) {
            console.log('Setting suggested titles from possible_article_titles array:', briefData.possible_article_titles);
            setSuggestedTitles(briefData.possible_article_titles);
          } else if (typeof briefData.possible_article_titles === 'string') {
            // Handle text-based format - but first check if it's a stringified JSON array
            const titleStr = briefData.possible_article_titles as string;
            
            // Check if it's a JSON array (stringified)
            let titles: string[] = [];
            try {
              // First try parsing as a JSON array
              const parsed = JSON.parse(titleStr);
              console.log('Parsed possible_article_titles JSON:', parsed);
              
              if (Array.isArray(parsed)) {
                // It's already a proper array
                titles = parsed.map((item: any) => {
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
                titles = [titleStr];
              }
            } catch (e) {
              // Not valid JSON, fall back to newline splitting
              console.log('Not valid JSON, using newline splitting for possible_article_titles');
              titles = titleStr.split('\n').filter((title: string) => title.trim().length > 0);
            }
            console.log('Setting suggested titles from possible_article_titles text format:', titles);
            setSuggestedTitles(titles);
            
            // Double-check the state update is working
            setTimeout(() => {
              console.log('AFTER STATE UPDATE - suggestedTitles state:', suggestedTitles);
            }, 0);
          } else {
            console.log('possible_article_titles is neither array nor string:', typeof briefData.possible_article_titles);
          }
        } else {
          console.log('No suggested titles found in brief data');
        }
        
        // Add explicit debug logs after state is set to verify what's being passed to the child component
        setTimeout(() => {
          console.log('FINAL STATES BEFORE RENDER:', {
            internalLinks,
            suggestedTitles,
            content: content.substring(0, 100) + '...'
          });
        }, 0);
      } catch (error) {
        console.error('Error in fetchBrief:', error);
        toast.error('An error occurred when fetching brief data');
      } finally {
        setIsSaving(false);
      }
    };

    fetchBrief();
  }, [briefId]);

  // DIRECT API APPROACH: Save changes using the contentBriefs API
  const internalLinksRef = useRef(internalLinks);
  const suggestedTitlesRef = useRef(suggestedTitles);
  const contentRef = useRef(content);

  useEffect(() => {
    internalLinksRef.current = internalLinks;
  }, [internalLinks]);

  useEffect(() => {
    suggestedTitlesRef.current = suggestedTitles;
  }, [suggestedTitles]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const saveChanges = useCallback(async () => {
    const currentInternalLinks = internalLinksRef.current;
    const currentSuggestedTitles = suggestedTitlesRef.current;
    const currentContent = contentRef.current;

    console.log('ContentBriefEditorSimple: Preparing data for onUpdate callback - LOCKS ACQUIRED');
    
    // Prevent multiple saves from running at the same time
    if (saveInProgress.current) {
      pendingSave.current = true;
      console.log('Save already in progress, queuing next save');
      return;
    }

    if (!briefId) {
      // Just update via the onUpdate callback if no briefId
      const cleanedContent = cleanContent(currentContent);
      onUpdate(cleanedContent, currentInternalLinks || [], currentSuggestedTitles || []);
      return;
    }
    
    try {
      saveInProgress.current = true;
      setIsSaving(true);
      console.log('ContentBriefEditorSimple: Preparing data for onUpdate callback - LOCKS ACQUIRED');
      
      // Always clean content before saving to ensure no markdown or formatting artifacts
      let cleanedContent = cleanContent(currentContent);
      let briefObject: any = null;

      try {
        // Attempt to parse the cleanedContent if it looks like a JSON object/array
        if (cleanedContent && (cleanedContent.trim().startsWith('{') || cleanedContent.trim().startsWith('['))) {
          briefObject = JSON.parse(cleanedContent);
        } else if (cleanedContent) {
          console.warn('[saveChanges] cleanedContent does not appear to be a parseable JSON object/array. Content preview:', cleanedContent.substring(0, 200));
        } else {
          briefObject = {}; // Initialize to empty object if content is null/empty
        }
      } catch (e) {
        console.error("[saveChanges] Error parsing cleanedContent into JSON: ", e, "Content preview:", cleanedContent ? cleanedContent.substring(0,200) : "[EMPTY CONTENT]");
        // Do not toast error here, let parent decide based on its save attempt
      }

      if (briefObject) {
        // These fields will be re-embedded by the parent if needed by its save logic.
        // For now, ensure they are correctly formatted if part of the main content object.
        if (typeof briefObject.internal_links === 'string' || currentInternalLinks?.length) {
            briefObject.internal_links = (currentInternalLinks || []).join('\n');
        }
        if (typeof briefObject.possible_article_titles === 'string' || currentSuggestedTitles?.length) {
            briefObject.possible_article_titles = (currentSuggestedTitles || []).join('\n');
        }
        cleanedContent = JSON.stringify(briefObject, null, 2);
      } else {
        console.warn("[saveChanges] briefObject is null after parsing attempt. Proceeding with potentially non-JSON or original cleanedContent for onUpdate.");
      }
      
      // The parent (EditContentBrief) will handle the actual API save.
      // This component's responsibility is to provide the latest, cleaned data.
      console.log('ContentBriefEditorSimple: Calling onUpdate with prepared data.');
      onUpdate(cleanedContent, currentInternalLinks || [], currentSuggestedTitles || []);
      
      // Success/error handling (toast) is now managed by the parent component that calls the actual API.

    } catch (error) {
      // This catch block would now primarily catch errors from onUpdate or data prep, not API calls.
      console.error('ContentBriefEditorSimple: Error during data preparation or onUpdate callback:', error);
      toast.error('Failed to process content update'); // Generic error for this component's scope
    } finally {
      setIsSaving(false);
      saveInProgress.current = false;
      console.log('SAVE COMPLETE - locks released');
      
      if (pendingSave.current) {
        pendingSave.current = false;
        console.log('ContentBriefEditorSimple: Processing queued save request.');
        setTimeout(() => saveChanges(), 100); 
      }
    }
  }, [briefId, onUpdate, setIsSaving]); // Dependencies now only include stable props/setters or briefId

  const debouncedSave = useCallback(
    debounce(() => {
      console.log('Debounced: User changed content, triggering API save');
      saveChanges();
    }, 1500), 
    [saveChanges] 
  );

  // Handle content updates from the display component
  const handleContentUpdate = useCallback((updatedContent: string) => {
    // Prevent update cycles
    isProcessingExternalUpdate.current = true;
    
    // Ensure content is clean before saving
    const cleanedContent = cleanContent(updatedContent);
    setContent(cleanedContent);
    
    // Mark that we should skip the next save from onInternalLinksChange/onSuggestedTitlesChange
    skipNextSave.current = true;
    
    // Only trigger debouncedSave if the update wasn't initiated by our own save
    if (updatesInitiatedByUser.current) {
      console.log('User updated content, triggering debounced save');
      debouncedSave();
      updatesInitiatedByUser.current = false;
    }
    
    console.log('Content updated - current internal links:', internalLinks);
    
    // Reset the flag after a brief delay to allow updates to propagate
    setTimeout(() => {
      isProcessingExternalUpdate.current = false;
    }, 50);
  }, [debouncedSave, internalLinks]);

  // Add more debug info before rendering
  console.log('ContentBriefEditorSimple RENDER STATE:', {
    content: content ? content.substring(0, 50) + '...' : 'none',
    internalLinksLength: internalLinks?.length || 0,
    internalLinks,
    suggestedTitlesLength: suggestedTitles?.length || 0,
    suggestedTitles
  });
  
  // CRITICAL DEBUG: Log what we're about to pass to ContentBriefDisplay
  console.log('[ContentBriefEditorSimple] About to pass to ContentBriefDisplay:', {
    content: content ? content.substring(0, 100) + '...' : 'empty',
    additionalLinks: internalLinks || [],
    additionalLinksLength: (internalLinks || []).length,
    possibleTitles: suggestedTitles || [],
    possibleTitlesLength: (suggestedTitles || []).length
  });

  // Extract internal links from database strings if needed (as a fallback)
  // This ensures we always have data even if state updates haven't propagated
  // Use a ref to track whether we've already attempted to load from content
  const initialLoadAttempted = useRef(false);

  useEffect(() => {
    // Only run once to avoid circular dependencies/infinite loops
    if (initialLoadAttempted.current) {
      return;
    }
    
    // Mark that we've attempted the initial load
    initialLoadAttempted.current = true;

    // Only try to extract if we don't already have data
    const shouldLoadLinks = !internalLinks || internalLinks.length === 0;
    const shouldLoadTitles = !suggestedTitles || suggestedTitles.length === 0;
    
    if (!shouldLoadLinks && !shouldLoadTitles) {
      return; // Skip if we already have both data sets
    }

    let contentObj = null;
    
    // Try to parse content only once
    try {
      contentObj = typeof content === 'string' ? JSON.parse(content) : null;
    } catch (e) {
      console.log('Content is not valid JSON, skipping extraction');
      return;
    }
    
    if (!contentObj) {
      return;
    }

    // Extract internal links if needed
    if (shouldLoadLinks && contentObj.internal_links && Array.isArray(contentObj.internal_links)) {
      console.log('Setting internal links from JSON content:', contentObj.internal_links);
      setInternalLinks(contentObj.internal_links);
    }
    
    // Extract article titles if needed
    if (shouldLoadTitles && contentObj.possible_article_titles && Array.isArray(contentObj.possible_article_titles)) {
      console.log('Setting suggested titles from JSON content:', contentObj.possible_article_titles);
      setSuggestedTitles(contentObj.possible_article_titles);
    }
  }, [content]); // Only depend on content, not the state we're updating

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Content Brief</h2>
        <div>
          <button
            onClick={() => {
              console.log('Manual save button clicked');
              saveChanges();
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="border rounded-lg p-6 bg-white">
        <ContentBriefDisplay 
          content={(() => {
            const baseTemplate = JSON.parse(emptyContentTemplate);
            let currentBriefObject: Record<string, any> = {};
            try {
              if (content && content.trim()) {
                currentBriefObject = JSON.parse(content);
              } else {
                currentBriefObject = { ...baseTemplate }; // Use base if content is empty
              }
            } catch (e) {
              console.warn('ContentBriefEditorSimple: Error parsing current content, falling back to base template.', e);
              currentBriefObject = { ...baseTemplate }; // Fallback to base on error
            }

            // Ensure all keys from the base template are present
            for (const key in baseTemplate) {
              if (Object.prototype.hasOwnProperty.call(baseTemplate, key) && !Object.prototype.hasOwnProperty.call(currentBriefObject, key)) {
                currentBriefObject[key] = baseTemplate[key]; // Add missing keys with default values (e.g., empty arrays)
              }
            }
            return JSON.stringify(currentBriefObject, null, 2);
          })()} 
          onContentChange={handleContentUpdate}
          additionalLinks={internalLinks || []}
          possibleTitles={suggestedTitles || []}
          researchResultId={researchResultId} // Pass the research result ID for pain points dropdown
          onInternalLinksChange={(links) => {
            console.log('Links changed in ContentBriefDisplay:', links);
            
            // CRITICAL: Break the update cycle by ignoring changes initiated by our own save
            if (isProcessingExternalUpdate.current) {
              console.log('Ignoring internal links change during external update');
              return;
            }
            
            // Safety check - ensure it's an array
            if (!Array.isArray(links)) {
              console.warn('Received non-array links:', links);
              return;
            }
            
            // Verify if these are actually different from current links
            const currentLinks = [...(internalLinks || [])];
            const areDifferent = links.length !== currentLinks.length || 
              links.some((link, i) => currentLinks[i] !== link);
              
            if (!areDifferent) {
              console.log('Links unchanged, skipping update');
              return;
            }
              
            // Mark this as a user-initiated change
            updatesInitiatedByUser.current = true;
            
            // Update local state first
            setInternalLinks(links);
            
            // Only save if we're not already saving
            if (!saveInProgress.current && !skipNextSave.current) {
              console.log('User changed links, triggering API save');
              debouncedSave();
            }
            
            skipNextSave.current = false;
          }}
          onSuggestedTitlesChange={(titles) => {
            console.log('Titles changed in ContentBriefDisplay:', titles);
            
            // CRITICAL: Break the update cycle by ignoring changes initiated by our own save
            if (isProcessingExternalUpdate.current) {
              console.log('Ignoring suggested titles change during external update');
              return;
            }
            
            // Safety check - ensure it's an array
            if (!Array.isArray(titles)) {
              console.warn('Received non-array titles:', titles);
              return;
            }
            
            // Verify if these are actually different from current titles
            const currentTitles = [...(suggestedTitles || [])];
            const areDifferent = titles.length !== currentTitles.length || 
              titles.some((title, i) => currentTitles[i] !== title);
              
            if (!areDifferent) {
              console.log('Titles unchanged, skipping update');
              return;
            }
            
            // Mark this as a user-initiated change
            updatesInitiatedByUser.current = true;
            
            // Update local state first
            setSuggestedTitles(titles);
            
            // Only save if we're not already saving
            if (!saveInProgress.current && !skipNextSave.current) {
              console.log('User changed titles, triggering API save');
              debouncedSave();
            }
            
            skipNextSave.current = false;
          }}
        />
      </div>
    </div>
  );
}
