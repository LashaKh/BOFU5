import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  ExternalLink, 
  FileText, 
  Lightbulb, 
  Link, 
  Plus, 
  Radio, 
  Save, 
  Tag, 
  Trash2, 
  X,
  List
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';

interface ContentBriefEditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
  briefId?: string;
}

interface EditingItem {
  path: string;
  index: number;
  value: string;
}

interface NewItem {
  path: string;
  value: string;
}

type ArrayOperation = 'add' | 'update' | 'remove';

export function ContentBriefEditorNew({ initialContent, onUpdate, briefId }: ContentBriefEditorProps): JSX.Element {
  // State initialization
  const [briefData, setBriefData] = useState<Record<string, any>>(() => {
    try {
      return initialContent ? JSON.parse(initialContent) : {};
    } catch (e) {
      console.error('Failed to parse initial content:', e);
      return {};
    }
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({}); 
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [newItem, setNewItem] = useState<NewItem | null>(null);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJson, setRawJson] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);

  // Pain points dropdown related states
  const [currentResearchResultId, setCurrentResearchResultId] = useState<string | null>(null);
  const [availablePainPoints, setAvailablePainPoints] = useState<string[] | null>(null);
  const [showPainPointsDropdown, setShowPainPointsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Initialize expandedSections based on parsed content
  useEffect(() => {
    const sections = Object.keys(briefData).reduce((acc, key) => {
      acc[key] = true; // Start with all sections expanded
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedSections(sections);
  }, [briefData]);
  
  // Initialize dropdown portal element
  useEffect(() => {
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
        setShowPainPointsDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fetch brief content if briefId is provided
  useEffect(() => {
    const fetchBrief = async () => {
      if (!briefId) return;
      
      try {
        setIsSaving(true);
        const { data, error } = await supabase
          .from('content_briefs')
          .select('brief_content, research_result_id')
          .eq('id', briefId)
          .single();

        if (error) {
          console.error('Error fetching content brief:', error);
          toast.error('Failed to fetch content brief');
          return;
        }

        if (data?.brief_content) {
          try {
            const parsed = JSON.parse(data.brief_content);
            setBriefData(parsed);
            setRawJson(data.brief_content);
            
            // Store the research_result_id for fetching pain points
            if (data?.research_result_id) {
              setCurrentResearchResultId(data.research_result_id);
            }
            
            // Initialize expandedSections based on parsed content
            const sections: Record<string, boolean> = {};
            Object.keys(parsed).forEach(key => {
              sections[key] = true; // Start with all sections expanded
            });
            setExpandedSections(sections);
          } catch (parseError) {
            console.error('Error parsing brief content:', parseError);
            toast.error('Invalid brief content format');
          }
        }
      } catch (error) {
        console.error('Error in fetchBrief:', error);
        toast.error('An error occurred');
      } finally {
        setIsSaving(false);
      }
    };

    fetchBrief();
  }, [briefId]);
  
  // Fetch pain points when research_result_id changes
  useEffect(() => {
    const fetchPainPoints = async () => {
      if (!currentResearchResultId) return;
      
      try {
        // Manually fetching pain points since we need to extract them from product_data JSON
        const { data, error } = await supabase
          .from('approved_products')
          .select('product_data')
          .eq('research_result_id', currentResearchResultId)
          .single();
          
        if (error) {
          console.error('Error fetching pain points:', error);
          return;
        }
        
        if (!data || !data.product_data) {
          console.log('No product data found for this research result');
          return;
        }
        
        // Parse the product_data JSON and extract pain points
        try {
          // If product_data is already an object
          const productData = typeof data.product_data === 'string' 
            ? JSON.parse(data.product_data) 
            : data.product_data;
          
          // Extract pain points array
          const painPoints = productData.painPoints || [];
          
          // Store unique pain points in state
          setAvailablePainPoints(Array.from(new Set(painPoints)));
        } catch (parseError) {
          console.error('Error parsing product data:', parseError);
        }
      } catch (error) {
        console.error('Unexpected error fetching pain points:', error);
      }
    };
    
    fetchPainPoints();
  }, [currentResearchResultId]);

  // Save changes debounced
  const debouncedSave = useCallback(
    debounce((data: Record<string, any>) => {
      const jsonString = JSON.stringify(data, null, 2);
      setRawJson(jsonString);
      onUpdate(jsonString);
    }, 500),
    [onUpdate]
  );
  
  // Save changes to Supabase if briefId is provided
  const saveChanges = useCallback(async () => {
    if (!briefId) {
      // Just update via the onUpdate callback if no briefId
      const jsonString = JSON.stringify(briefData, null, 2);
      onUpdate(jsonString);
      return;
    }
    
    try {
      setIsSaving(true);
      const jsonString = JSON.stringify(briefData, null, 2);
      setRawJson(jsonString);
      
      const { error } = await supabase
        .from('content_briefs')
        .update({ brief_content: jsonString })
        .eq('id', briefId);
        
      if (error) {
        console.error('Error saving content brief:', error);
        toast.error('Failed to save content brief');
        return;
      }
      
      toast.success('Content brief saved successfully');
      onUpdate(jsonString);
    } catch (error) {
      console.error('Error saving content brief:', error);
      toast.error('Failed to save content brief');
    } finally {
      setIsSaving(false);
    }
  }, [briefData, briefId, onUpdate]);
  
  // Save raw JSON content
  const saveRawJson = useCallback(async () => {
    try {
      // Validate JSON
      const parsed = JSON.parse(rawJson);
      setBriefData(parsed);
      
      if (briefId) {
        setIsSaving(true);
        const { error } = await supabase
          .from('content_briefs')
          .update({ brief_content: rawJson })
          .eq('id', briefId);
          
        if (error) {
          console.error('Error saving raw JSON:', error);
          toast.error('Failed to save content brief');
          return;
        }
        
        toast.success('Content brief saved successfully');
      }
      
      onUpdate(rawJson);
    } catch (error) {
      console.error('Error saving raw JSON:', error);
      toast.error('Invalid JSON format');
    } finally {
      setIsSaving(false);
    }
  }, [rawJson, briefId, onUpdate, setBriefData]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Handle array operations (add, update, remove)
  const handleArrayOperation = useCallback((operation: ArrayOperation, path: string, value?: string, index?: number) => {
    const pathParts = path.split('.');
    const newData = { ...briefData };
    let current = newData;
    
    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    // Get the array key (last part of the path)
    const arrayKey = pathParts[pathParts.length - 1];
    
    // Ensure we have an array at this location
    if (!Array.isArray(current[arrayKey])) {
      current[arrayKey] = [];
    }

    // Perform the operation
    switch (operation) {
      case 'add':
        if (value?.trim()) {
          current[arrayKey].push(value);
          setNewItem(null);
        }
        break;
      case 'update':
        if (typeof index === 'number' && value !== undefined) {
          current[arrayKey][index] = value;
          setEditingItem(null);
        }
        break;
      case 'remove':
        if (typeof index === 'number') {
          current[arrayKey] = current[arrayKey].filter((_: any, i: number) => i !== index);
        }
        break;
    }
    
    setBriefData(newData);
    debouncedSave(newData);
  }, [briefData, debouncedSave]);

  // Convenience functions for array operations
  const addArrayItem = useCallback((path: string, value: string) => {
    handleArrayOperation('add', path, value);
  }, [handleArrayOperation]);

  const updateArrayItem = useCallback((path: string, index: number, value: string) => {
    handleArrayOperation('update', path, value, index);
  }, [handleArrayOperation]);

  const removeArrayItem = useCallback((path: string, index: number) => {
    handleArrayOperation('remove', path, undefined, index);
  }, [handleArrayOperation]);

  // Get icon based on section name
  const getSectionIcon = useCallback((section: string) => {
    const sectionLower = section.toLowerCase();
    
    switch (true) {
      case sectionLower.includes('pain_points') || sectionLower.includes('pain points'):
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case sectionLower.includes('usps') || sectionLower.includes('usp'):
        return <Tag className="w-5 h-5 text-yellow-500" />;
      case sectionLower.includes('capabilities'):
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case sectionLower.includes('competitors'):
        return <Radio className="w-5 h-5 text-purple-500" />;
      case sectionLower.includes('internal_links') || sectionLower.includes('internal links'):
        return <Link className="w-5 h-5 text-green-500" />;
      case sectionLower.includes('external_links') || sectionLower.includes('external links'):
        return <ExternalLink className="w-5 h-5 text-indigo-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  }, []);

  // Get color for section based on section name
  const getColorForSection = useCallback((section: string) => {
    const sectionLower = section.toLowerCase();
    
    switch (true) {
      case sectionLower.includes('pain_points') || sectionLower.includes('pain points'):
        return 'border-amber-100 bg-amber-50';
      case sectionLower.includes('usps') || sectionLower.includes('usp'):
        return 'border-yellow-100 bg-yellow-50';
      case sectionLower.includes('capabilities'):
        return 'border-blue-100 bg-blue-50';
      case sectionLower.includes('competitors'):
        return 'border-purple-100 bg-purple-50';
      case sectionLower.includes('internal_links') || sectionLower.includes('internal links'):
        return 'border-green-100 bg-green-50';
      case sectionLower.includes('external_links') || sectionLower.includes('external links'):
        return 'border-indigo-100 bg-indigo-50';
      default:
        return 'border-gray-200 bg-white';
    }
  }, []);

  // Render an array item with edit/delete functionality
  const renderArrayItem = useCallback((path: string, item: string, index: number) => {
    const isEditing = editingItem?.path === path && editingItem?.index === index;
    const sectionBase = path.split('.')[0];
    const colorClass = getColorForSection(sectionBase);
    
    return (
      <motion.div
        key={`${path}-${index}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={`group relative p-3 rounded-lg ${colorClass} transition-colors`}
      >
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingItem?.value || ''}
              onChange={(e) => setEditingItem(prev => prev ? { ...prev, value: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingItem) {
                  updateArrayItem(path, index, editingItem.value);
                } else if (e.key === 'Escape') {
                  setEditingItem(null);
                }
              }}
              className="flex-1 p-2 rounded border focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <button
              onClick={() => editingItem && updateArrayItem(path, index, editingItem.value)}
              className="p-2 rounded-full hover:bg-green-100 text-green-600"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingItem(null)}
              className="p-2 rounded-full hover:bg-red-100 text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="flex-1">{item}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingItem({ path, index, value: item })}
                className="p-2 rounded-full hover:bg-blue-100 text-blue-600"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeArrayItem(path, index)}
                className="p-2 rounded-full hover:bg-red-100 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }, [editingItem, setEditingItem, updateArrayItem, removeArrayItem, getColorForSection]);

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

  // Handle clicking on a pain point from dropdown
  const handlePainPointSelect = useCallback((painPoint: string) => {
    if (newItem?.path) {
      addArrayItem(newItem.path, painPoint);
    }
    setShowPainPointsDropdown(false);
  }, [newItem, addArrayItem]);

  // Render the pain points dropdown using a portal
  const renderPainPointsDropdown = useCallback(() => {
    if (!showPainPointsDropdown || !dropdownPortalRef.current || !availablePainPoints?.length) return null;

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
          <h4 className="font-medium text-gray-700">Available Pain Points</h4>
        </div>
        <div className="p-1">
          {availablePainPoints.length > 0 ? (
            <div className="space-y-1">
              {availablePainPoints.map((painPoint, index) => (
                <button
                  key={`pain-point-${index}`}
                  onClick={() => handlePainPointSelect(painPoint)}
                  className="w-full text-left p-2 hover:bg-amber-50 rounded transition-colors truncate"
                >
                  {painPoint}
                </button>
              ))}
            </div>
          ) : (
            <p className="p-2 text-gray-500 text-sm">No pain points found</p>
          )}
        </div>
      </div>,
      dropdownPortalRef.current
    );
  }, [showPainPointsDropdown, availablePainPoints, dropdownPosition, handlePainPointSelect]);

  // Render an array section with all items and add functionality
  const renderArraySection = useCallback((path: string, items: string[]) => {
    const isAdding = newItem?.path === path;
    const isPainPointsSection = path.toLowerCase().includes('pain_points') || path.toLowerCase().includes('pain points');
    const isPainPointsDropdownEnabled = isPainPointsSection && availablePainPoints && availablePainPoints.length > 0;
    
    return (
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((item, index) => renderArrayItem(path, item, index))}
        </AnimatePresence>
        
        {isAdding ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItem?.value || ''}
              onChange={(e) => setNewItem(prev => prev ? { ...prev, value: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newItem) {
                  addArrayItem(path, newItem.value);
                } else if (e.key === 'Escape') {
                  setNewItem(null);
                  setShowPainPointsDropdown(false);
                }
              }}
              className="flex-1 p-2 rounded border focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Add new item..."
              autoFocus
            />
            <button
              onClick={() => newItem && addArrayItem(path, newItem.value)}
              className="p-2 rounded-full hover:bg-green-100 text-green-600"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => setNewItem(null)}
              className="p-2 rounded-full hover:bg-red-100 text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Show dropdown button only for pain points section when available pain points exist */}
            {isPainPointsDropdownEnabled && (
              <button
                onClick={(e) => {
                  setShowPainPointsDropdown(!showPainPointsDropdown);
                  positionDropdown(e.currentTarget);
                }}
                className="p-2 rounded-full hover:bg-amber-100 text-amber-600"
                title="Show available pain points"
              >
                <List className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewItem({ path, value: '' })}
              className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900"
            >
              <Plus className="w-4 h-4" />
              <span>Add item</span>
            </button>
            
            {/* Add dropdown button next to "Add item" for pain points section */}
            {isPainPointsDropdownEnabled && (
              <button
                onClick={(e) => {
                  setNewItem({ path, value: '' });
                  setTimeout(() => {
                    setShowPainPointsDropdown(true);
                    positionDropdown(e.currentTarget);
                  }, 100); // Slight delay to ensure the input is rendered first
                }}
                className="flex items-center gap-2 p-2 text-amber-600 hover:text-amber-800"
                title="Add from available pain points"
              >
                <List className="w-4 h-4" />
                <span>Add from suggestions</span>
              </button>
            )}
          </div>
        )}
        
        {/* Render pain points dropdown */}
        {renderPainPointsDropdown()}
      </div>
    );
  }, [newItem, setNewItem, addArrayItem, renderArrayItem, availablePainPoints, showPainPointsDropdown, renderPainPointsDropdown, positionDropdown]);

  // Render the content of a section based on its type
  const renderSectionContent = useCallback((section: string, content: any) => {
    if (Array.isArray(content)) {
      return renderArraySection(section, content);
    }

    if (typeof content === 'object' && content !== null) {
      return (
        <div className="space-y-4">
          {Object.entries(content).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <h4 className="font-medium text-gray-700">{key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</h4>
              {renderSectionContent(`${section}.${key}`, value)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <input
        type="text"
        value={content || ''}
        onChange={(e) => {
          const newData = { ...briefData };
          let current = newData;
          const parts = section.split('.');
          
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          
          current[parts[parts.length - 1]] = e.target.value;
          setBriefData(newData);
          debouncedSave(newData);
        }}
        className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 outline-none"
      />
    );
  }, [briefData, debouncedSave, renderArraySection]);

  // Render the raw JSON editor mode
  if (rawJsonMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Edit Raw JSON</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setRawJsonMode(false)}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={saveRawJson}
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
        
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          className="w-full h-96 px-4 py-3 bg-white border border-gray-300 text-gray-800 rounded-lg font-mono text-sm"
        />
      </div>
    );
  }

  // Render the visual editor mode
  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Content Brief</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setRawJsonMode(true)}
            className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <FileText size={16} />
            Edit Raw JSON
          </button>
          <button
            onClick={saveChanges}
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

      <div className="space-y-6">
        {Object.entries(briefData).map(([sectionKey, sectionData]) => {
          const isExpanded = expandedSections[sectionKey] || false;
          const sectionTitle = sectionKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          
          return (
            <div 
              key={`section-${sectionKey}`}
              className={`rounded-xl border shadow-sm transition-all ${getColorForSection(sectionKey)}`}
            >
              <div 
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleSection(sectionKey)}
              >
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  {getSectionIcon(sectionKey)}
                  {sectionTitle}
                </h3>
                <div className="flex items-center">
                  <button
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse section" : "Expand section"}
                  >
                    {isExpanded ? 
                      <ChevronUp className="text-gray-600" /> : 
                      <ChevronDown className="text-gray-600" />}
                  </button>
                </div>
              </div>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-gray-200">
                      {renderSectionContent(sectionKey, sectionData)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
