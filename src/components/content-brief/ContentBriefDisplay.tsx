import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  FileText, 
  Lightbulb, 
  Radio, 
  Link as LinkIcon, 
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  Save,
  Trash2,
  X,
  Award,
  Target,
  ListChecks
} from 'lucide-react';
import TextAreaSection from './TextAreaSection';
import { createPortal } from 'react-dom';

// Interface for the content brief data structure
interface ContentBriefData {
  pain_points?: string[];
  usps?: string[];
  capabilities?: string[];
  competitors?: string[];
  internal_links?: string[];
  // Removed external_links as requested
  target_audience?: string[];
  keywords?: string[];
  notes?: string[];
  content_objectives?: string[];
  ctas?: string[];
  possible_article_titles?: string[];
  [key: string]: string[] | undefined;
}

// Interface for editing items
interface EditingItem {
  sectionKey: string;
  index: number;
  value: string;
}

// Interface for adding new items
interface NewItem {
  sectionKey: string;
  value: string;
}

interface ContentBriefDisplayProps {
  content: string;
  onContentChange?: (updatedContent: string) => void;
  onInternalLinksChange?: (links: string[]) => void;
  onSuggestedTitlesChange?: (titles: string[]) => void;
  readOnly?: boolean;
  possibleTitles?: string[];
  additionalLinks?: string[];
  researchResultId?: string; // Added to connect with approved_products
}

interface SectionItemProps {
  title: string;
  icon?: React.ReactNode;
  colorClass?: string;
  children: React.ReactNode;
}

// Section component for displaying each major content area
const SectionItem: React.FC<SectionItemProps> = ({ 
  title, 
  children, 
  icon = <FileText className="w-5 h-5 text-gray-500" />,
  colorClass = 'bg-gray-50 border-gray-100'
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <motion.div 
      className={`rounded-xl border shadow-sm mb-4 ${colorClass} overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-opacity-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <div className="mr-3">{icon}</div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div>
          {isExpanded ? 
            <ChevronUp className="w-5 h-5 text-gray-700 dark:text-gray-400" /> : 
            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-400" />
          }
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Helper component for rendering and editing lists
const ListSection: React.FC<{
  sectionKey: string,
  items: string[], 
  emptyMessage?: string,
  onAddItem?: (sectionKey: string, value: string) => void,
  onUpdateItem?: (sectionKey: string, index: number, value: string) => void,
  onRemoveItem?: (sectionKey: string, index: number) => void,
  readOnly?: boolean,
  researchResultId?: string, // Added for pain points dropdown
  suggestedItems?: string[] // Pre-fetched suggested items
}> = ({ 
  sectionKey, 
  items, 
  emptyMessage = 'No items',
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  readOnly = false,
  researchResultId,
  suggestedItems
 }) => {
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [newItem, setNewItem] = useState<NewItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLElement | null>(null);
  const [availablePainPoints, setAvailablePainPoints] = useState<string[] | null>(suggestedItems || null);
  const [availableCapabilities, setAvailableCapabilities] = useState<any[] | null>(null);
  
  // Check if this is a section that should have dropdown functionality
  const isPainPointsSection = sectionKey.toLowerCase().includes('pain_points') || sectionKey.toLowerCase().includes('pain points');
  const isCapabilitiesSection = sectionKey.toLowerCase().includes('capabilities');

  // Create portal root for dropdown on mount
  useEffect(() => {
    if (!isPainPointsSection && !isCapabilitiesSection) return;
    
    // Create portal root if it doesn't exist
    let portalRoot = document.getElementById('dropdown-portal-root');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'dropdown-portal-root';
      portalRoot.style.position = 'absolute';
      portalRoot.style.top = '0';
      portalRoot.style.left = '0';
      portalRoot.style.width = '100%';
      portalRoot.style.height = '0';
      portalRoot.style.overflow = 'visible';
      portalRoot.style.zIndex = '9999';
      document.body.appendChild(portalRoot);
    }
    dropdownPortalRef.current = portalRoot;
    
    // Add click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPainPointsSection]);
  
  // Fetch pain points if they're not provided already
  useEffect(() => {
    // Skip if this isn't the pain points section
    if (!isPainPointsSection) return;
    
    // Import the function here to avoid circular dependencies
    import('../../lib/contentBriefs').then(({ fetchPainPoints }) => {
      const getPainPoints = async () => {
        try {
          // Use the dedicated function that now supports both with and without researchResultId
          const painPoints = await fetchPainPoints(researchResultId);
          
          if (painPoints.length > 0) {
            // Store unique pain points in state
            setAvailablePainPoints(painPoints);
          }
        } catch (err) {
          console.error('Error fetching pain points:', err);
        }
      };
      
      getPainPoints();
    });
  }, [isPainPointsSection, researchResultId, availablePainPoints]);
  
  // Fetch capabilities if they're not provided already
  useEffect(() => {
    // Skip if we already have capabilities or this isn't the capabilities section
    if (!isCapabilitiesSection) return;
    
    // Import the function here to avoid circular dependencies
    import('../../lib/contentBriefs').then(({ fetchCapabilities }) => {
      const getCapabilities = async () => {
        try {
          // Use the dedicated function that now supports both with and without researchResultId
          const capabilities = await fetchCapabilities(researchResultId);
          
          if (capabilities.length > 0) {
            // Store unique capabilities in state
            setAvailableCapabilities(capabilities);
          }
        } catch (err) {
          console.error('Error fetching capabilities:', err);
        }
      };
      
      getCapabilities();
    });
  }, [isCapabilitiesSection, researchResultId, availableCapabilities]);
  
  // Position the dropdown near the button
  const positionDropdown = useCallback((buttonEl: HTMLElement) => {
    if (!buttonEl) return;

    const rect = buttonEl.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    // Position the dropdown below the button
    setDropdownPosition({
      top: rect.bottom + scrollTop,
      left: rect.left + scrollLeft
    });
  }, []);
  
  // Handle clicking on an item from dropdown
  const handleDropdownItemSelect = useCallback((item: any) => {
    if (onAddItem) {
      // If item is a capability object with fullText, use that for the complete content
      if (typeof item === 'object' && item.fullText) {
        onAddItem(sectionKey, item.fullText);
      } else {
        // Otherwise use the item directly (for pain points)
        onAddItem(sectionKey, String(item));
      }
    }
    setShowDropdown(false);
  }, [onAddItem, sectionKey]);
  
  // Render the dropdown using a portal
  const renderDropdown = useCallback(() => {
    // Get the appropriate items based on section type
    const dropdownItems = isPainPointsSection ? availablePainPoints : 
                         isCapabilitiesSection ? availableCapabilities : null;
                         
    if (!showDropdown || !dropdownPortalRef.current || !dropdownItems?.length) return null;

    return createPortal(
      <div 
        ref={dropdownRef}
        className="fixed overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 w-96 z-50"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
        }}
      >
        <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0">
          <h4 className="font-medium text-gray-700">{isPainPointsSection ? 'Available Pain Points' : 'Available Capabilities'}</h4>
        </div>
        <div className="p-1">
          {dropdownItems && dropdownItems.length > 0 ? (
            <div className="py-2">
              {dropdownItems && dropdownItems.map((item, index) => (
                <div 
                  key={`dropdown-item-${index}`}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleDropdownItemSelect(item)}
                >
                  {/* For capability objects with displayText property */}
                  {isCapabilitiesSection && typeof item === 'object' && item.displayText
                    ? <div>
                        <div className="font-medium">{item.title || ''}</div>
                        {item.description && <div className="text-xs text-gray-600 mt-1">{item.description}</div>}
                      </div>
                    : item /* For pain points strings */}
                </div>
              ))}
            </div>
          ) : (
            <p className="p-2 text-gray-500 text-sm">No items found</p>
          )}
        </div>
      </div>,
      dropdownPortalRef.current
    );
  }, [showDropdown, availablePainPoints, availableCapabilities, dropdownPosition, handleDropdownItemSelect, isPainPointsSection, isCapabilitiesSection]);

  if (!items || items.length === 0 && !newItem && readOnly) {
    return <p className="text-gray-500 italic">{emptyMessage}</p>;
  }
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {items && items.map((item, index) => (
            <motion.div 
              key={`${sectionKey}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group p-3 rounded-lg bg-white shadow-sm border border-gray-100 text-gray-700 relative"
            >
              {editingItem && editingItem.sectionKey === sectionKey && editingItem.index === index ? (
                <div className="flex items-center gap-2">
                  <textarea
                    value={editingItem.value}
                    onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                    className="flex-1 p-2 rounded border focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-y text-sm"
                    rows={3}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (onUpdateItem && editingItem.value.trim()) {
                        onUpdateItem(sectionKey, index, editingItem.value);
                      }
                      setEditingItem(null);
                    }}
                    className="p-1.5 rounded-full hover:bg-green-100 text-green-600"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="p-1.5 rounded-full hover:bg-red-100 text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="pr-16">{item}</span>
                  {!readOnly && (
                    <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingItem({ sectionKey, index, value: item })}
                        className="p-1.5 rounded-full hover:bg-blue-100 text-blue-600 mr-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log(`Delete button clicked for section ${sectionKey}, index ${index}`);
                          if (onRemoveItem) {
                            onRemoveItem(sectionKey, index);
                          } else {
                            console.error('onRemoveItem callback is not defined');
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-red-100 text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {!readOnly && (
        <div>
          {newItem && newItem.sectionKey === sectionKey ? (
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-white">
              <input
                type="text"
                value={newItem.value}
                onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                className="flex-1 p-2 rounded border focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Add new item..."
                autoFocus
              />
              <button
                onClick={() => {
                  if (onAddItem && newItem.value.trim()) {
                    onAddItem(sectionKey, newItem.value);
                  }
                  setNewItem(null);
                }}
                className="p-1.5 rounded-full hover:bg-green-100 text-green-600"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => setNewItem(null)}
                className="p-1.5 rounded-full hover:bg-red-100 text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNewItem({ sectionKey, value: '' })}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
              
              {/* Add dropdown button for pain points or capabilities sections */}
              {/* Only show dropdown button if we have items to display */}
              {((isPainPointsSection && Array.isArray(availablePainPoints) && availablePainPoints.length > 0) || 
                (isCapabilitiesSection && Array.isArray(availableCapabilities) && availableCapabilities.length > 0)) && (
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded"
                  onClick={(e) => {
                    setShowDropdown(true);
                    positionDropdown(e.currentTarget);
                  }}
                  title={isPainPointsSection ? "Show available pain points" : "Show available capabilities"}
                >
                  <ListChecks className="w-4 h-4" />
                  <span>Add from list</span>
                </button>
              )}
              
              {/* Render the dropdown portal */}
              {renderDropdown()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to parse the new content format
// Helper function to sanitize content before parsing
const sanitizeJsonContent = (content: string): string => {
  if (!content) return '{}';
  
  // Clean and log the original input for debugging
  console.log('Sanitizing content, length:', content.length);
  
  // 1. Handle common markdown code block formats with a more robust approach
  let cleanedContent = content;
  
  // Case 1: Content is completely wrapped in code blocks with language marker
  // This handles multiline content with code blocks at beginning and end
  const fullCodeBlockRegex = /^\s*```(?:json|javascript|js)?\s*([\s\S]*?)\s*```\s*$/;
  const fullMatch = cleanedContent.match(fullCodeBlockRegex);
  
  if (fullMatch && fullMatch[1]) {
    console.log('Detected full content wrapped in code blocks, extracting inner content');
    cleanedContent = fullMatch[1].trim();
    console.log('Extracted content first 50 chars:', cleanedContent.substring(0, 50));
  } else {
    // Case 2: Try individual start/end markers if the full match didn't work
    const codeBlockStartRegex = /^\s*```(?:json|javascript|js)?\s*/;
    const codeBlockEndRegex = /\s*```\s*$/;
    
    if (codeBlockStartRegex.test(cleanedContent)) {
      console.log('Detected code block start markers, removing them');
      cleanedContent = cleanedContent.replace(codeBlockStartRegex, '');
    }
    
    if (codeBlockEndRegex.test(cleanedContent)) {
      console.log('Detected code block end markers, removing them');
      cleanedContent = cleanedContent.replace(codeBlockEndRegex, '');
    }
  }
  
  // 2. Trim whitespace
  cleanedContent = cleanedContent.trim();
  
  // 3. Check if the content starts and ends with curly braces (basic JSON validation)
  if (!cleanedContent.startsWith('{') && !cleanedContent.startsWith('[')) {
    console.warn('Content does not start with { or [, might not be valid JSON');
    // Add opening curly brace if missing
    cleanedContent = '{' + cleanedContent;
  }
  
  if (!cleanedContent.endsWith('}') && !cleanedContent.endsWith(']')) {
    console.warn('Content does not end with } or ], might not be valid JSON');
    // Add closing curly brace if missing
    cleanedContent = cleanedContent + '}';
  }
  
  // Log what we're returning
  console.log('Sanitized content looks like JSON:', 
    cleanedContent.substring(0, 40) + '...' + 
    cleanedContent.substring(cleanedContent.length - 20));
    
  return cleanedContent;
};

const parseContent = (content: string, possibleTitles?: string[], additionalLinks?: string[]): ContentBriefData => {
  // Helper to ensure array format for display
  const ensureArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    if (typeof value === 'string') {
      // Convert string to array by splitting on newlines
      return value.split('\n').filter(item => item.trim() !== '');
    }
    return value;
  };
  
  if (!content) {
    return {
      pain_points: [],
      usps: [],
      capabilities: [],
      competitors: [],
      internal_links: ensureArray(additionalLinks),
      possible_article_titles: ensureArray(possibleTitles),
      keywords: [],
      target_audience: [],
      notes: [],
      content_objectives: [],
      ctas: []
    };
  }

  // Default empty data structure
  const defaultData: ContentBriefData = {
    pain_points: [],
    usps: [],
    capabilities: [],
    competitors: [],
    internal_links: [],
    possible_article_titles: [],
    keywords: [],
    target_audience: [],
    notes: [],
    content_objectives: [],
    ctas: []
  };

  try {
    // Clean the content before parsing
    const sanitizedContent = sanitizeJsonContent(content);
    
    // Try to parse as JSON
    const parsedContent = JSON.parse(sanitizedContent);
    
    // Check if it's the new structured format
    if (parsedContent['Content Brief'] || parsedContent['1. Overview'] || parsedContent['2. Target Audience']) {
      // New JSON format
      const result: ContentBriefData = { ...defaultData };
      
      // Extract pain points (Section 5)
      if (parsedContent['5. Key Pain Points to Address (Select 4-6)']) {
        result.pain_points = parsedContent['5. Key Pain Points to Address (Select 4-6)'];
      }
      
      // Extract USPs (Section 6)
      if (parsedContent['6. Unique Selling Propositions / Benefits (List up to 4)']) {
        result.usps = parsedContent['6. Unique Selling Propositions / Benefits (List up to 4)'];
      } else if (parsedContent.usps && Array.isArray(parsedContent.usps)) { // Fallback for simple 'usps' key
        result.usps = parsedContent.usps;
      }
      
      // Extract capabilities (Section 7)
      if (parsedContent['7. Capabilities (List up to 4)']) {
        result.capabilities = parsedContent['7. Capabilities (List up to 4)'];
      }
      
      // Extract competitors (Section 9)
      if (parsedContent['9. Competitors (List up to 4 relevant competitors)']) {
        result.competitors = parsedContent['9. Competitors (List up to 4 relevant competitors)'];
      }
      
      // Extract content objectives (Section 3)
      if (parsedContent['3. Content Objectives']) {
        result.content_objectives = parsedContent['3. Content Objectives'];
      }
      
      // Extract target audience (Section 2)
      if (parsedContent['2. Target Audience']) {
        const audience: string[] = [];
        if (parsedContent['2. Target Audience']['Primary Persona']) {
          audience.push(`Primary Persona: ${parsedContent['2. Target Audience']['Primary Persona']}`);
        }
        
        if (parsedContent['2. Target Audience']['Psychographics']) {
          Object.entries(parsedContent['2. Target Audience']['Psychographics']).forEach(([key, value]) => {
            audience.push(`${key}: ${value}`);
          });
        }
        
        result.target_audience = audience;
      }
      
      // Extract SEO keywords (Section 4)
      if (parsedContent['4. SEO Strategy']) {
        const keywords: string[] = [];
        if (parsedContent['4. SEO Strategy']['Primary Keyword']) {
          keywords.push(`Primary Keyword: ${parsedContent['4. SEO Strategy']['Primary Keyword']}`);
        }
        if (parsedContent['4. SEO Strategy']['Meta Description (Draft)']) {
          keywords.push(`Meta Description: ${parsedContent['4. SEO Strategy']['Meta Description (Draft)']}`);
        }
        if (parsedContent['4. SEO Strategy']['URL Slug (Draft)']) {
          keywords.push(`URL Slug: ${parsedContent['4. SEO Strategy']['URL Slug (Draft)']}`);
        }
        result.keywords = keywords;
      }
      
      // Extract CTAs (Section 8)
      if (parsedContent['8. Call-to-Actions (CTAs)']) {
        const ctas: string[] = [];
        Object.entries(parsedContent['8. Call-to-Actions (CTAs)']).forEach(([key, value]) => {
          ctas.push(`${key}: ${value}`);
        });
        result.ctas = ctas;
      }
      
      // Extract overview as notes (Section 1)
      if (parsedContent['1. Overview']) {
        const notes: string[] = [];
        Object.entries(parsedContent['1. Overview']).forEach(([key, value]) => {
          notes.push(`${key}: ${value}`);
        });
        result.notes = notes;
      }
      
      // Add document info as notes (Content Brief section)
      if (parsedContent['Content Brief']) {
        const docInfo: string[] = [];
        Object.entries(parsedContent['Content Brief']).forEach(([key, value]) => {
          docInfo.push(`${key}: ${value}`);
        });
        result.notes = [...(result.notes || []), ...docInfo];
      }
      
      // Add possible titles from separate column - prioritize this over parsed content
      if (possibleTitles && possibleTitles.length > 0) {
        console.log('Setting possible_article_titles from possibleTitles:', possibleTitles);
        // Create a new array to ensure React detects the change
        result.possible_article_titles = [...possibleTitles];
      } else {
        console.log('No possibleTitles available');
      }
      
      // Add internal links from separate column - prioritize this over parsed content
      if (additionalLinks && additionalLinks.length > 0) {
        console.log('Setting internal_links from additionalLinks:', additionalLinks);
        // Create a new array to ensure React detects the change
        result.internal_links = [...additionalLinks];
      } else {
        console.log('No additionalLinks available');
      }
      
      return result;
    } else {
      // Old/simple JSON format
      const result = { ...defaultData, ...parsedContent };
      
      // Add possible titles from separate column - prioritize this over parsed content
      if (possibleTitles && possibleTitles.length > 0) {
        console.log('Setting possible_article_titles from possibleTitles:', possibleTitles);
        // Create a new array to ensure React detects the change
        result.possible_article_titles = [...possibleTitles];
      } else {
        console.log('No possibleTitles available');
      }
      
      // Add internal links from separate column - prioritize this over parsed content
      if (additionalLinks && additionalLinks.length > 0) {
        console.log('Setting internal_links from additionalLinks:', additionalLinks);
        // Create a new array to ensure React detects the change
        result.internal_links = [...additionalLinks];
      } else {
        console.log('No additionalLinks available');
      }
      
      return result;
    }
  } catch (error) {
    // If not valid JSON, try to parse as text with sections
    console.log('Failed to parse sanitized content as JSON:', error);
    console.log('Attempting to parse as text with sections');
    
    try {
      // Try one more approach - if it's a stringified JSON string (double-encoded)
      // This handles cases where the JSON was accidentally stringified twice
      if (typeof content === 'string' && 
          (content.startsWith('"\\"') || content.startsWith('"[') || content.startsWith('"{')) && 
          (content.endsWith('\\"}"') || content.endsWith('"]"') || content.endsWith('"}"'))) {
        console.log('Detected possible double-encoded JSON, attempting to parse');
        // First unescape the string
        const unescaped = JSON.parse(content);
        // Then parse the result
        if (typeof unescaped === 'string') {
          const doublyParsed = JSON.parse(unescaped);
          console.log('Successfully parsed double-encoded JSON');
          return { ...defaultData, ...doublyParsed };
        }
      }
    } catch (doubleParseError) {
      console.log('Failed to parse as double-encoded JSON:', doubleParseError);
    }
    
    // Create result with default structure
    const result = { ...defaultData };
    
    // Try to clean up the content first - remove any markdown code blocks
    let cleanedContent = content;
    const codeBlockRegex = /^\s*```(?:json|javascript|js)?([\s\S]*?)```\s*$/;
    const match = cleanedContent.match(codeBlockRegex);
    
    if (match && match[1]) {
      // If the content is wrapped in code blocks, extract the content inside
      console.log('Content appears to be in code blocks, extracting inner content');
      cleanedContent = match[1].trim();
      
      // Try parsing this cleaned content as JSON one more time
      try {
        const parsedFromCodeBlock = JSON.parse(cleanedContent);
        console.log('Successfully parsed inner content as JSON');
        return { ...defaultData, ...parsedFromCodeBlock };
      } catch (codeBlockError) {
        console.log('Failed to parse inner content as JSON:', codeBlockError);
      }
    }
    
    // Parse text content (simple section-based format)
    const sectionRegex = /# ([^\n]+)\n([\s\S]*?)(?=\n# |$)/g;
    let sectionMatch;
    
    while ((sectionMatch = sectionRegex.exec(content)) !== null) {
      const sectionName = sectionMatch[1].trim().toLowerCase().replace(/ /g, '_');
      const sectionContent = sectionMatch[2].trim();
      
      // Extract bullet points or lines
      const lines = sectionContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim())
        .filter(line => line.length > 0);
      
      if (lines.length > 0) {
        result[sectionName] = lines;
      }
    }
    
    // Add possible titles from separate column - ensure we convert from text format if needed
    if (possibleTitles) {
      result.possible_article_titles = ensureArray(possibleTitles);
    }
    
    // Add internal links from separate column - ensure we convert from text format if needed
    if (additionalLinks) {
      result.internal_links = ensureArray(additionalLinks);
    }
    
    return result;
  }
};

export const ContentBriefDisplay: React.FC<ContentBriefDisplayProps> = ({ 
  content, 
  onContentChange,
  onInternalLinksChange,
  onSuggestedTitlesChange,
  readOnly = false,
  possibleTitles = [],
  additionalLinks = [],
  researchResultId
}) => {
  // DEBUG: Log props on mount to verify what is being passed in
  console.log('ContentBriefDisplay PROPS:', {
    content: content ? content.substring(0, 50) + '...' : 'none',
    possibleTitlesLength: possibleTitles?.length || 0,
    possibleTitles,
    additionalLinksLength: additionalLinks?.length || 0,
    additionalLinks,
    readOnly
  });

  // Store content in a ref to compare changes
  const previousContentRef = React.useRef<string>(content);
  const isInitialRender = React.useRef<boolean>(true);
  const updatingFromSections = React.useRef<boolean>(false);
  
  // Parse content once for initial state
  const [sections, setSections] = useState(() => {
    const parsed = parseContent(content, possibleTitles, additionalLinks);
    
    // IMPORTANT: Ensure the additional links and titles are always set initially,
    // even if parseContent didn't set them correctly
    if (additionalLinks && additionalLinks.length > 0) {
      console.log('FORCING additionalLinks into sections:', additionalLinks);
      parsed.internal_links = [...additionalLinks];
    }
    if (possibleTitles && possibleTitles.length > 0) {
      console.log('FORCING possibleTitles into sections:', possibleTitles);
      parsed.possible_article_titles = [...possibleTitles];
    }
    
    console.log('Initial parse results:', {
      'Links': parsed.internal_links ? parsed.internal_links.length : 0,
      'Titles': parsed.possible_article_titles ? parsed.possible_article_titles.length : 0
    });
    return parsed;
  });
  
  // Fix for navigation issue - ensure no capturing events prevent navigation
  React.useEffect(() => {
    const originalOnBeforeUnload = window.onbeforeunload;
    const originalOnPopState = window.onpopstate;
    
    // Clear any event handlers that might block navigation
    window.onbeforeunload = null;
    
    // Ensure back/forward navigation works properly
    const handlePopState = (event: PopStateEvent) => {
      if (originalOnPopState) {
        originalOnPopState.call(window, event);
      }
    };
    
    window.onpopstate = handlePopState;
    
    return () => {
      window.onbeforeunload = originalOnBeforeUnload;
      window.onpopstate = originalOnPopState;
    };
  }, []);
  
  // Helper function to generate content from sections
  const generateContentFromSections = (newSections: ContentBriefData) => {
    try {
      // Structure the JSON according to the specified format
      const formattedContent: any = {
        "Content Brief": {
          "Document Version": "1.0",
          "Date": new Date().toISOString().split('T')[0],
          "Prepared For": "Content Creation Team",
          "Prepared By": "Content Strategy AI Assistant"
        },
        "1. Overview": {},
        "2. Target Audience": {
          "Primary Persona": "",
          "Psychographics": {
            "Values": "",
            "Goals": "",
            "Challenges": "",
            "Information Sources": ""
          }
        },
        "3. Content Objectives": [],
        "4. SEO Strategy": {
          "Primary Keyword": "",
          "Meta Description (Draft)": "",
          "URL Slug (Draft)": ""
        },
        "5. Key Pain Points to Address (Select 4-6)": [],
        "6. Unique Selling Propositions / Benefits (List up to 4)": [],
        "7. Capabilities (List up to 4)": [],
        "8. Call-to-Actions (CTAs)": {
          "Primary CTA": "",
          "Secondary CTA": ""
        },
        "9. Competitors (List up to 4 relevant competitors)": []
      };
      
      // Populate the formatted content with data from sections
      if (newSections.pain_points && newSections.pain_points.length) {
        formattedContent["5. Key Pain Points to Address (Select 4-6)"] = newSections.pain_points;
      }
      
      if (newSections.usps && newSections.usps.length) {
        formattedContent["6. Unique Selling Propositions / Benefits (List up to 4)"] = newSections.usps;
      }
      
      if (newSections.capabilities && newSections.capabilities.length) {
        formattedContent["7. Capabilities (List up to 4)"] = newSections.capabilities;
      }
      
      if (newSections.competitors && newSections.competitors.length) {
        formattedContent["9. Competitors (List up to 4 relevant competitors)"] = newSections.competitors;
      }
      
      if (newSections.content_objectives && newSections.content_objectives.length) {
        formattedContent["3. Content Objectives"] = newSections.content_objectives;
      }
      
      // Parse target audience entries
      if (newSections.target_audience && newSections.target_audience.length) {
        newSections.target_audience.forEach(item => {
          if (item.startsWith('Primary Persona:')) {
            formattedContent["2. Target Audience"]["Primary Persona"] = item.replace('Primary Persona:', '').trim();
          } else if (item.startsWith('Values:')) {
            formattedContent["2. Target Audience"]["Psychographics"]["Values"] = item.replace('Values:', '').trim();
          } else if (item.startsWith('Goals:')) {
            formattedContent["2. Target Audience"]["Psychographics"]["Goals"] = item.replace('Goals:', '').trim();
          } else if (item.startsWith('Challenges:')) {
            formattedContent["2. Target Audience"]["Psychographics"]["Challenges"] = item.replace('Challenges:', '').trim();
          } else if (item.startsWith('Information Sources:')) {
            formattedContent["2. Target Audience"]["Psychographics"]["Information Sources"] = item.replace('Information Sources:', '').trim();
          }
        });
      }
      
      // Parse keywords
      if (newSections.keywords && newSections.keywords.length) {
        newSections.keywords.forEach(item => {
          if (item.startsWith('Primary Keyword:')) {
            formattedContent["4. SEO Strategy"]["Primary Keyword"] = item.replace('Primary Keyword:', '').trim();
          } else if (item.startsWith('Meta Description:')) {
            formattedContent["4. SEO Strategy"]["Meta Description (Draft)"] = item.replace('Meta Description:', '').trim();
          } else if (item.startsWith('URL Slug:')) {
            formattedContent["4. SEO Strategy"]["URL Slug (Draft)"] = item.replace('URL Slug:', '').trim();
          }
        });
      }
      
      // Parse CTAs
      if (newSections.ctas && newSections.ctas.length) {
        newSections.ctas.forEach(item => {
          if (item.startsWith('Primary CTA:')) {
            formattedContent["8. Call-to-Actions (CTAs)"]["Primary CTA"] = item.replace('Primary CTA:', '').trim();
          } else if (item.startsWith('Secondary CTA:')) {
            formattedContent["8. Call-to-Actions (CTAs)"]["Secondary CTA"] = item.replace('Secondary CTA:', '').trim();
          }
        });
      }
      
      // Parse notes for Overview
      if (newSections.notes && newSections.notes.length) {
        newSections.notes.forEach(item => {
          if (item.startsWith('Project Goal:')) {
            formattedContent["1. Overview"]["Project Goal"] = item.replace('Project Goal:', '').trim();
          } else if (item.startsWith('Content Format:')) {
            formattedContent["1. Overview"]["Content Format"] = item.replace('Content Format:', '').trim();
          }
        });
      }
      
      // Generate the JSON string with proper formatting
      const updatedContent = JSON.stringify(formattedContent, null, 2);
      return updatedContent;
    } catch (error) {
      console.error('Error updating content:', error);
      // Fallback to simple JSON if something goes wrong
      return JSON.stringify(newSections, null, 2);
    }
  };

  // Effect to update sections when content changes - only runs on explicit changes from parent
  React.useEffect(() => {
    // Skip on initial render - we already set initial state in useState
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    // Skip if we're in the middle of updating from sections changes to prevent loops
    if (updatingFromSections.current) {
      return;
    }
    
    // Check if content actually changed to avoid unnecessary updates
    if (previousContentRef.current === content) {
      return;
    }
    
    // Store current content for future comparisons
    previousContentRef.current = content;
    console.log('Content change from parent - updating sections');
    
    // Parse the incoming content first
    const parsed = parseContent(content);
    
    // Create a copy of parsed to apply additional data
    const updatedParsed = {...parsed};
    
    // Only include additionalLinks if actually present (not empty array)
    if (additionalLinks && additionalLinks.length > 0) {
      console.log('Ensuring additionalLinks are included in parsed content:', additionalLinks);
      updatedParsed.internal_links = [...additionalLinks];
    }
    
    // Only include possibleTitles if actually present (not empty array)
    if (possibleTitles && possibleTitles.length > 0) {
      console.log('Ensuring possibleTitles are included in parsed content:', possibleTitles);
      updatedParsed.possible_article_titles = [...possibleTitles];
    }
    
    // Update sections state with parsed content
    setSections(updatedParsed);
  // Critical: Only depend on content to avoid update loops from possibleTitles/additionalLinks changing
  }, [content]);
  
  // Dedicated effect to update sections when possibleTitles or additionalLinks change from parent
  React.useEffect(() => {
    // Skip on initial render since we already set these values in the initial state
    if (isInitialRender.current) {
      return;
    }
    
    // Skip if we're already updating from sections to avoid cycles
    if (updatingFromSections.current) {
      return;
    }
    
    // Determine if we actually have data to update (avoid empty array updates)
    const hasNewTitles = possibleTitles && possibleTitles.length > 0;
    const hasNewLinks = additionalLinks && additionalLinks.length > 0;
    
    // Skip if no meaningful data to update
    if (!hasNewTitles && !hasNewLinks) {
      return;
    }
    
    console.log('possibleTitles or additionalLinks changed from parent - updating sections');
    
    // Set flag to prevent update loops
    updatingFromSections.current = true;
    
    // Update the sections with the new data
    setSections(prev => {
      const updated = {...prev};
      
      if (hasNewTitles) {
        console.log('Updating sections with possibleTitles:', possibleTitles);
        updated.possible_article_titles = [...possibleTitles];
      }
      
      if (hasNewLinks) {
        console.log('Updating sections with additionalLinks:', additionalLinks);
        updated.internal_links = [...additionalLinks];
      }
      
      return updated;
    });
    
    // Reset the flag after a delay to break cycles
    setTimeout(() => {
      updatingFromSections.current = false;
    }, 50);
  }, [possibleTitles, additionalLinks]);
  
  // REWRITTEN: Effect to handle changes to special sections with update cycle breaking
  // This effect now has multiple safeguards against infinite update loops
  React.useEffect(() => {
    // Skip processing during initial render
    if (isInitialRender.current) {
      console.log('Skipping internal links/titles sync on initial render');
      return;
    }
    
    // CRITICAL: Skip if we're already processing a parent-initiated change
    if (updatingFromSections.current) {
      console.log('Skipping internal links/titles sync - already updating from sections');
      return;
    }
    
    // Compare existing values with props to avoid unnecessary updates
    const internal_links = Array.isArray(sections.internal_links) ? sections.internal_links : [];
    const possible_titles = Array.isArray(sections.possible_article_titles) ? sections.possible_article_titles : [];
    
    // Skip if both additionalLinks and possibleTitles are empty/undefined
    if ((!additionalLinks || additionalLinks.length === 0) && 
        (!possibleTitles || possibleTitles.length === 0)) {
      return;
    }
    
    // Skip if parent values are the same as what we have
    // No need to store previous content, we just check current state
    
    // Flag for whether we made any updates
    let updatedContent = false;
    
    // Compare with additionalLinks to see if they're already synced - but ONLY if additionalLinks has data
    if (additionalLinks && additionalLinks.length > 0) {
      const linksAlreadySynced = internal_links.length === additionalLinks.length && 
        internal_links.every((link, i) => additionalLinks[i] === link);
      
      // Only update if there's an actual difference to avoid trigger loops
      // CRITICAL: Only handle internal_links if they've changed and callback exists
      if (onInternalLinksChange && !linksAlreadySynced) {
        updatingFromSections.current = true;
        updatedContent = true;
        console.log('INTERNAL LINKS DIFFERENT - updating parent with:', internal_links);
        onInternalLinksChange(internal_links);
      }
    }
    
    // Compare with possibleTitles to see if they're already synced - but ONLY if possibleTitles has data
    if (possibleTitles && possibleTitles.length > 0) {
      const titlesAlreadySynced = possible_titles.length === possibleTitles.length && 
        possible_titles.every((title, i) => possibleTitles[i] === title);
      
      // Only update if there's an actual difference to avoid trigger loops
      if (onSuggestedTitlesChange && !titlesAlreadySynced) {
        updatingFromSections.current = true;
        updatedContent = true;
        console.log('SUGGESTED TITLES DIFFERENT - updating parent with:', possible_titles);
        onSuggestedTitlesChange(possible_titles);
      }
    }
    
    // If we made updates, reset the flag after a slight delay to break the cycle
    if (updatedContent) {
      setTimeout(() => {
        updatingFromSections.current = false;
      }, 50); // Shorter timeout to reduce latency
    }
  // Important: sections is a required dependency since we need to detect its changes
  // But remove updatingFromSections from dependencies - we just use .current value directly
  }, [sections, onInternalLinksChange, onSuggestedTitlesChange, additionalLinks, possibleTitles]);
  
  // Effect to update content when sections change (initiated by user actions)
  React.useEffect(() => {
    // Skip on initial render
    if (isInitialRender.current) {
      return;
    }
    
    // Skip update if we're already processing a parent-initiated change
    if (updatingFromSections.current) {
      return;
    }
    
    // Now handle main content updates as before
    // Compare the current sections with what would be parsed from content
    // This prevents triggering updates when the content prop matches our internal state
    const currentContentStr = JSON.stringify(sections);
    const parsedFromContent = JSON.stringify(parseContent(content, possibleTitles, additionalLinks));
    
    // If our sections already match the content prop, don't trigger another update
    if (currentContentStr === parsedFromContent) {
      return;
    }
    
    // Only trigger parent updates if we have callback and not in read-only mode
    if (!readOnly && onContentChange) {
      console.log('Content change from user actions - updating parent');
      updatingFromSections.current = true;
      
      try {
        // Generate and send content update
        const updatedContent = generateContentFromSections(sections);
        onContentChange(updatedContent);
        
        // Reset flag after a short delay to ensure all state updates have propagated
        setTimeout(() => {
          updatingFromSections.current = false;
        }, 50);
      } catch (error) {
        console.error('Error updating content:', error);
        updatingFromSections.current = false;
      }
    }
  }, [sections, onContentChange, readOnly, content, possibleTitles, additionalLinks]);

  // This effect is no longer needed as we've fixed the update logic
  // in the effects above

  
  // Handler for adding an item to a section
  const handleAddItem = useCallback((sectionKey: string, value: string) => {
    if (!value.trim()) return;
    
    setSections(prev => {
      const updated = { ...prev };
      if (!updated[sectionKey]) {
        updated[sectionKey] = [];
      }
      updated[sectionKey] = [...(updated[sectionKey] || []), value];
      
      // Immediately trigger parent callbacks for special sections
      // This ensures Supabase updates happen right away
      if (sectionKey === 'internal_links' && onInternalLinksChange && updated[sectionKey]) {
        console.log('DIRECT ADD to internal_links - calling parent handler immediately:', updated[sectionKey]);
        // We need to wait until after state update to call parent
        // Make a copy of the array to ensure we're passing a definite string[]
        const links = [...updated[sectionKey]];
        setTimeout(() => onInternalLinksChange(links), 0);
      }
      
      if (sectionKey === 'possible_article_titles' && onSuggestedTitlesChange && updated[sectionKey]) {
        console.log('DIRECT ADD to possible_article_titles - calling parent handler immediately:', updated[sectionKey]);
        // We need to wait until after state update to call parent
        // Make a copy of the array to ensure we're passing a definite string[]
        const titles = [...updated[sectionKey]];
        setTimeout(() => onSuggestedTitlesChange(titles), 0);
      }
      
      return updated;
    });
  }, [onInternalLinksChange, onSuggestedTitlesChange]);
  
  // Handler for updating an item in a section
  const handleUpdateItem = useCallback((sectionKey: string, index: number, value: string) => {
    if (!value.trim()) return;
    
    setSections(prev => {
      const updated = { ...prev };
      if (updated[sectionKey] && index >= 0 && updated[sectionKey]?.length && index < updated[sectionKey]!.length) {
        // Create a copy of the array we're modifying
        updated[sectionKey] = [...(updated[sectionKey] || [])];
        updated[sectionKey]![index] = value;
        
        // Immediately trigger parent callbacks for special sections
        // This ensures Supabase updates happen right away
        if (sectionKey === 'internal_links' && onInternalLinksChange && updated[sectionKey] && updated[sectionKey].length > 0) {
          console.log('DIRECT UPDATE to internal_links - calling parent handler immediately:', updated[sectionKey]);
          // We need to wait until after state update to call parent
          // Make a copy of the array to ensure we're passing a definite string[]
          const links = [...updated[sectionKey]];
          setTimeout(() => onInternalLinksChange(links), 0);
        }
        
        if (sectionKey === 'possible_article_titles' && onSuggestedTitlesChange && updated[sectionKey] && updated[sectionKey].length > 0) {
          console.log('DIRECT UPDATE to possible_article_titles - calling parent handler immediately:', updated[sectionKey]);
          // We need to wait until after state update to call parent
          // Make a copy of the array to ensure we're passing a definite string[]
          const titles = [...updated[sectionKey]];
          setTimeout(() => onSuggestedTitlesChange(titles), 0);
        }
      }
      return updated;
    });
  }, [onInternalLinksChange, onSuggestedTitlesChange]);
  
  // Handler for removing an item from a section
  // Handler for removing an item from a section - implemented with a direct approach
  const handleRemoveItem = useCallback((sectionKey: string, index: number) => {
    console.log(`🗑️ DELETING item at index ${index} from section ${sectionKey}`);
    
    // Use a direct state update with functional form to ensure we're working with the latest state
    setSections(prevSections => {
      // First log what we're working with
      console.log(`Current ${sectionKey} array:`, prevSections[sectionKey]);
      
      // Create a new object for the updated state
      const newSections = { ...prevSections };
      
      // Check if the section exists and is an array
      if (!newSections[sectionKey] || !Array.isArray(newSections[sectionKey])) {
        console.error(`Section ${sectionKey} doesn't exist or is not an array`);
        return prevSections; // Return unchanged state
      }
      
      // Check if the index is valid
      if (index < 0 || index >= newSections[sectionKey].length) {
        console.error(`Invalid index ${index} for section ${sectionKey} with length ${newSections[sectionKey].length}`);
        return prevSections; // Return unchanged state
      }
      
      // Create a new array with the item removed
      newSections[sectionKey] = [
        ...newSections[sectionKey].slice(0, index),
        ...newSections[sectionKey].slice(index + 1)
      ];
      
      console.log(`✅ Item removed. New ${sectionKey} array:`, newSections[sectionKey]);
      
      // Immediately trigger parent callbacks for special sections
      // This ensures Supabase updates happen right away
      if (sectionKey === 'internal_links' && onInternalLinksChange && newSections[sectionKey]) {
        console.log('DIRECT REMOVE from internal_links - calling parent handler immediately:', newSections[sectionKey]);
        // We need to wait until after state update to call parent
        // Make a copy of the array to ensure we're passing a definite string[]
        const links = [...newSections[sectionKey]];
        setTimeout(() => onInternalLinksChange(links), 0);
      }
      
      if (sectionKey === 'possible_article_titles' && onSuggestedTitlesChange && newSections[sectionKey]) {
        console.log('DIRECT REMOVE from possible_article_titles - calling parent handler immediately:', newSections[sectionKey]);
        // We need to wait until after state update to call parent
        // Make a copy of the array to ensure we're passing a definite string[]
        const titles = [...newSections[sectionKey]];
        setTimeout(() => onSuggestedTitlesChange(titles), 0);
      }
      
      return newSections;
    });
  }, [onInternalLinksChange, onSuggestedTitlesChange]);
  
  return (
    <div className="space-y-2">
      {/* Notes section - always shown first */}
      <SectionItem 
        title="Notes" 
        icon={<FileText className="w-5 h-5 text-gray-500" />}
        colorClass="bg-gray-50 border-gray-100"
      >
        <ListSection 
          sectionKey="notes"
          items={sections.notes || []} 
          onAddItem={!readOnly ? handleAddItem : undefined}
          onUpdateItem={!readOnly ? handleUpdateItem : undefined}
          onRemoveItem={!readOnly ? handleRemoveItem : undefined}
          readOnly={readOnly}
          emptyMessage="No notes available. Add general notes and comments here."
        />
      </SectionItem>
      
      {/* Suggested Titles section - always shown second */}
      <SectionItem 
        title="Suggested Titles" 
        icon={<ListChecks className="w-5 h-5 text-emerald-500" />}
        colorClass="bg-emerald-50 border-emerald-100"
      >
        <TextAreaSection 
          sectionKey="possible_article_titles"
          value={sections.possible_article_titles || []} 
          onUpdate={(sectionKey, value) => {
            // Split by newlines and filter empty lines
            const titles = value.split('\n').filter(line => line.trim() !== '');
            // Update the section directly
            setSections(prev => ({
              ...prev,
              [sectionKey]: titles
            }));
            // Call parent handler if provided
            if (onSuggestedTitlesChange) {
              onSuggestedTitlesChange(titles);
            }
          }}
          readOnly={readOnly}
          placeholder="Enter suggested article titles here, one per line"
        />
      </SectionItem>
      
      {/* Pain Points section with dropdown functionality */}
      {((sections.pain_points && sections.pain_points.length > 0) || !readOnly) && (
        <SectionItem 
          title="Pain Points" 
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          colorClass="bg-amber-50 border-amber-100"
        >
          <ListSection 
            sectionKey="pain_points"
            items={sections.pain_points || []} 
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
            researchResultId={researchResultId}
          />
        </SectionItem>
      )}
      
      {((sections.capabilities && sections.capabilities.length > 0) || !readOnly) && (
        <SectionItem 
          title="Capabilities" 
          icon={<Lightbulb className="w-5 h-5 text-blue-500" />}
          colorClass="bg-blue-50 border-blue-100"
        >
          <ListSection 
            sectionKey="capabilities"
            items={sections.capabilities || []} 
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
          />
        </SectionItem>
      )}

      {/* Unique Selling Points section */}
      {((sections.usps && sections.usps.length > 0) || !readOnly) && (
        <SectionItem
          title="Unique Selling Points"
          icon={<Award className="w-5 h-5 text-purple-500" />}
          colorClass="bg-purple-50 border-purple-100"
        >
          <ListSection
            sectionKey="usps"
            items={sections.usps || []}
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
            emptyMessage="No Unique Selling Points defined. Add USPs that highlight product/service benefits."
          />
        </SectionItem>
      )}
      
      {((sections.content_objectives && sections.content_objectives.length > 0) || !readOnly) && (
        <SectionItem 
          title="Content Objectives" 
          icon={<Target className="w-5 h-5 text-cyan-500" />}
          colorClass="bg-cyan-50 border-cyan-100"
        >
          <ListSection 
            sectionKey="content_objectives"
            items={sections.content_objectives || []} 
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
          />
        </SectionItem>
      )}
      
      {((sections.competitors && sections.competitors.length > 0) || !readOnly) && (
        <SectionItem 
          title="Competitors" 
          icon={<Radio className="w-5 h-5 text-purple-500" />}
          colorClass="bg-purple-50 border-purple-100"
        >
          <ListSection 
            sectionKey="competitors"
            items={sections.competitors || []} 
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
          />
        </SectionItem>
      )}
      
      {((sections.ctas && sections.ctas.length > 0) || !readOnly) && (
        <SectionItem 
          title="Call-to-Actions" 
          icon={<Award className="w-5 h-5 text-orange-500" />}
          colorClass="bg-orange-50 border-orange-100"
        >
          <ListSection 
            sectionKey="ctas"
            items={sections.ctas || []} 
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
          />
        </SectionItem>
      )}
      
      {/* Always show Internal Links section to ensure it displays data from Supabase */}
      <SectionItem 
        title="Internal Links" 
        icon={<LinkIcon className="w-5 h-5 text-green-500" />}
        colorClass="bg-green-50 border-green-100"
      >
        <TextAreaSection 
          sectionKey="internal_links"
          value={sections.internal_links || []} 
          onUpdate={(sectionKey, value) => {
            // Split by newlines and filter empty lines
            const links = value.split('\n').filter(line => line.trim() !== '');
            // Update the section directly
            setSections(prev => ({
              ...prev,
              [sectionKey]: links
            }));
            // Call parent handler if provided
            if (onInternalLinksChange) {
              onInternalLinksChange(links);
            }
          }}
          readOnly={readOnly}
          placeholder="Enter internal links here, one per line"
        />
      </SectionItem>
      
      {((sections.target_audience && sections.target_audience.length > 0) || !readOnly) && (
        <SectionItem 
          title="Target Audience" 
          icon={<FileText className="w-5 h-5 text-teal-500" />}
          colorClass="bg-teal-50 border-teal-100"
        >
          <ListSection 
            sectionKey="target_audience"
            items={sections.target_audience || []} 
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
          />
        </SectionItem>
      )}
      
      {((sections.keywords && sections.keywords.length > 0) || !readOnly) && (
        <SectionItem 
          title="Keywords" 
          icon={<FileText className="w-5 h-5 text-pink-500" />}
          colorClass="bg-pink-50 border-pink-100"
        >
          <ListSection 
            sectionKey="keywords"
            items={sections.keywords || []} 
            onAddItem={!readOnly ? handleAddItem : undefined}
            onUpdateItem={!readOnly ? handleUpdateItem : undefined}
            onRemoveItem={!readOnly ? handleRemoveItem : undefined}
            readOnly={readOnly}
          />
        </SectionItem>
      )}
      
      {/* Suggested Titles section was moved to be the first section */}
      
      {/* Notes section was moved to be the first section */}
      
      {/* Render any other sections that were found */}
      {Object.entries(sections)
        .filter(([key]) => 
          !['pain_points', 'usps', 'capabilities', 'competitors', 'internal_links', 
            'target_audience', 'keywords', 'notes', 'content_objectives', 
            'ctas', 'possible_article_titles'].includes(key)
            && sections[key] && sections[key]!.length > 0)
        .map(([key, items]) => (
          <SectionItem 
            key={key}
            title={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} 
            icon={<FileText className="w-5 h-5 text-gray-500" />}
            colorClass="bg-gray-50 border-gray-100"
          >
            <ListSection 
              sectionKey={key}
              items={items || []} 
              onAddItem={!readOnly ? handleAddItem : undefined}
              onUpdateItem={!readOnly ? handleUpdateItem : undefined}
              onRemoveItem={!readOnly ? handleRemoveItem : undefined}
              readOnly={readOnly}
            />
          </SectionItem>
        ))}
    </div>
  );
};
