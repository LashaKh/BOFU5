import { useState, useEffect, useCallback } from 'react';
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
  X 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

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
  const [internalLinks, setInternalLinks] = useState<string[]>([]);
  const [possibleTitles, setPossibleTitles] = useState<string[]>([]);

  // Initialize expandedSections based on parsed content
  useEffect(() => {
    const sections = Object.keys(briefData).reduce((acc, key) => {
      acc[key] = true; // Start with all sections expanded
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedSections(sections);
  }, [briefData]);
  
  // Fetch brief content if briefId is provided
  useEffect(() => {
    const fetchBrief = async () => {
      if (!briefId) return;
      
      try {
        setIsSaving(true);
        const { data, error } = await supabase
          .from('content_briefs')
          .select('brief_content, internal_links, possible_article_titles')
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
            
            // Initialize expandedSections based on parsed content
            const sections: Record<string, boolean> = {};
            Object.keys(parsed).forEach(key => {
              sections[key] = true; // Start with all sections expanded
            });
            setExpandedSections(sections);
            
            // Process internal_links
            if (data.internal_links) {
              let links: string[] = [];
              
              // DEBUG: Log raw data from Supabase
              console.log('[ContentBriefEditorNew - fetchBrief] Raw data.internal_links:', data.internal_links);
              console.log('[ContentBriefEditorNew - fetchBrief] Raw data.possible_article_titles:', data.possible_article_titles);

              if (typeof data.internal_links === 'string') {
                // Split by newline if it's a string
                links = data.internal_links.split('\n').filter(link => link.trim().length > 0);
              } else if (Array.isArray(data.internal_links)) {
                links = data.internal_links;
              }
              
              setInternalLinks(links);
              // DEBUG: Log parsed array
              console.log('[ContentBriefEditorNew - fetchBrief] Parsed internalLinksArray:', links);
            }
            
            // Process possible_article_titles
            if (data.possible_article_titles) {
              let titles: string[] = [];
              
              if (typeof data.possible_article_titles === 'string') {
                // Split by newline if it's a string
                titles = data.possible_article_titles.split('\n').filter(title => title.trim().length > 0);
              } else if (Array.isArray(data.possible_article_titles)) {
                titles = data.possible_article_titles;
              }
              
              setPossibleTitles(titles);
              // DEBUG: Log parsed array
              console.log('[ContentBriefEditorNew - fetchBrief] Parsed possibleTitlesArray:', titles);
            }
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
      
      // Convert array fields to string format with newlines for Supabase
      const internalLinksString = internalLinks.join('\n');
      const possibleTitlesString = possibleTitles.join('\n');
      
      // Save all three fields to Supabase
      const { error } = await supabase
        .from('content_briefs')
        .update({ 
          brief_content: jsonString,
          internal_links: internalLinksString,
          possible_article_titles: possibleTitlesString
        })
        .eq('id', briefId);
        
      if (error) {
        console.error('Error saving content brief:', error);
        toast.error('Failed to save changes');
        return;
      }
      
      onUpdate(jsonString);
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error in saveChanges:', error);
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  }, [briefId, briefData, onUpdate, internalLinks, possibleTitles]);
  
  // Save raw JSON content
  const saveRawJson = useCallback(async () => {
    try {
      const parsed = JSON.parse(rawJson);
      setBriefData(parsed);
      
      // Extract internal_links and possible_article_titles from the parsed JSON
      let extractedInternalLinks: string[] = [];
      let extractedPossibleTitles: string[] = [];
      
      if (parsed.internal_links && Array.isArray(parsed.internal_links)) {
        extractedInternalLinks = parsed.internal_links;
      }
      
      if (parsed.possible_article_titles && Array.isArray(parsed.possible_article_titles)) {
        extractedPossibleTitles = parsed.possible_article_titles;
      }
      
      // Update the state
      setInternalLinks(extractedInternalLinks);
      setPossibleTitles(extractedPossibleTitles);
      
      if (briefId) {
        setIsSaving(true);
        
        // Convert arrays to string format with newlines for Supabase
        const internalLinksString = extractedInternalLinks.join('\n');
        const possibleTitlesString = extractedPossibleTitles.join('\n');
        
        const { error } = await supabase
          .from('content_briefs')
          .update({ 
            brief_content: rawJson,
            internal_links: internalLinksString,
            possible_article_titles: possibleTitlesString
          })
          .eq('id', briefId);
          
        if (error) {
          console.error('Error saving content brief:', error);
          toast.error('Failed to save changes');
          return;
        }
      }
      
      onUpdate(rawJson);
      setRawJsonMode(false);
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error parsing JSON:', error);
      toast.error('Invalid JSON format');
    } finally {
      setIsSaving(false);
    }
  }, [briefId, rawJson, onUpdate]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Handle array operations (add, update, remove)
  const handleArrayOperation = useCallback((operation: ArrayOperation, path: string, value?: string, index?: number) => {
    console.log(`Handling array operation: ${operation} on path ${path}`, { value, index });

    // Split path correctly - handle both top-level and nested paths
    const pathParts = path.split('.');
    
    // Deep clone briefData to avoid mutation issues
    const newData = JSON.parse(JSON.stringify(briefData));
    
    // Special case for top-level arrays (no need to traverse)
    if (pathParts.length === 1) {
      const key = pathParts[0];
      
      // Ensure the array exists
      if (!Array.isArray(newData[key])) {
        newData[key] = [];
      }
      
      // Perform operations directly on the top-level array
      switch (operation) {
        case 'add':
          if (value?.trim()) {
            newData[key].push(value);
            setNewItem(null);
          }
          break;
        case 'update':
          if (typeof index === 'number' && value !== undefined) {
            newData[key][index] = value;
            setEditingItem(null);
          }
          break;
        case 'remove':
          if (typeof index === 'number') {
            newData[key].splice(index, 1);
          }
          break;
      }
    } else {
      // For nested arrays, traverse the object hierarchy
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
            current[arrayKey].splice(index, 1);
          }
          break;
      }
    }
    
    console.log('Updated data after operation:', newData);
    setBriefData(newData);
    debouncedSave(newData);
  }, [briefData, debouncedSave]);

  // Convenience functions for array operations
  const addArrayItem = useCallback((path: string, value: string) => {
    // Normalize path - if path has a number prefix like "1.pain_points", extract just the field name
    const normalizedPath = path.includes('.') ? path.split('.').pop() || path : path;
    console.log(`Adding item to path: ${path}, normalized to: ${normalizedPath}`);
    
    // Use normalized path for the operation
    handleArrayOperation('add', normalizedPath, value);
  }, [handleArrayOperation]);

  const updateArrayItem = useCallback((path: string, index: number, value: string) => {
    // Normalize path - if path has a number prefix like "1.pain_points", extract just the field name
    const normalizedPath = path.includes('.') ? path.split('.').pop() || path : path;
    console.log(`Updating item at path: ${path}, normalized to: ${normalizedPath}, index: ${index}`);
    
    // Use normalized path for the operation
    handleArrayOperation('update', normalizedPath, value, index);
  }, [handleArrayOperation]);

  const removeArrayItem = useCallback((path: string, index: number) => {
    // Normalize path - if path has a number prefix like "1.pain_points", extract just the field name
    const normalizedPath = path.includes('.') ? path.split('.').pop() || path : path;
    console.log(`Removing item from path: ${path}, normalized to: ${normalizedPath}, index: ${index}`);
    
    // Use normalized path for the operation
    handleArrayOperation('remove', normalizedPath, undefined, index);
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
              className="flex-1 px-3 py-2 bg-white border border-gray-300 text-black placeholder:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter value"
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

  // Special handler for internal links
  const handleInternalLinksUpdate = useCallback((operation: ArrayOperation, index?: number, value?: string) => {
    let updatedLinks = [...internalLinks];
    
    switch (operation) {
      case 'add':
        if (value?.trim()) {
          updatedLinks.push(value.trim());
          setNewItem(null);
        }
        break;
      case 'update':
        if (typeof index === 'number' && value !== undefined) {
          updatedLinks[index] = value.trim();
          setEditingItem(null);
        }
        break;
      case 'remove':
        if (typeof index === 'number') {
          updatedLinks.splice(index, 1);
        }
        break;
    }
    
    // DEBUG: Log data being sent to updateBrief for internal_links
    console.log('[ContentBriefEditorNew - handleInternalLinksUpdate] Sending to updateBrief - internal_links:', updatedLinks);
    console.log('[ContentBriefEditorNew - handleInternalLinksUpdate] Current briefId:', briefId);

    // Update the state
    setInternalLinks(updatedLinks);
    
    // Also update in briefData to keep everything in sync
    const newData = { ...briefData };
    newData.internal_links = updatedLinks;
    setBriefData(newData);
    debouncedSave(newData);
    
    // For immediate feedback, use updateBrief function that properly handles Supabase updates
    if (briefId) {
      // Use the existing function from lib/contentBriefs that handles the format properly
      import('../../lib/contentBriefs').then(({ updateBrief }) => {
        updateBrief(briefId, { internal_links: updatedLinks })
          .then(() => {
            console.log('Internal links saved successfully to Supabase');
            toast.success('Internal links saved');
          })
          .catch(error => {
            console.error('Error saving internal links to Supabase:', error);
            toast.error('Failed to save internal links');
          });
      });
    }
  }, [internalLinks, briefData, briefId, debouncedSave]);

  // Special handler for possible article titles
  const handlePossibleTitlesUpdate = useCallback((operation: ArrayOperation, index?: number, value?: string) => {
    let updatedTitles = [...possibleTitles];
    
    switch (operation) {
      case 'add':
        if (value?.trim()) {
          updatedTitles.push(value.trim());
          setNewItem(null);
        }
        break;
      case 'update':
        if (typeof index === 'number' && value !== undefined) {
          updatedTitles[index] = value.trim();
          setEditingItem(null);
        }
        break;
      case 'remove':
        if (typeof index === 'number') {
          updatedTitles.splice(index, 1);
        }
        break;
    }
    
    // DEBUG: Log data being sent to updateBrief for possible_article_titles
    console.log('[ContentBriefEditorNew - handlePossibleTitlesUpdate] Sending to updateBrief - possible_article_titles:', updatedTitles);
    console.log('[ContentBriefEditorNew - handlePossibleTitlesUpdate] Current briefId:', briefId);

    setPossibleTitles(updatedTitles);
    
    // Also update in briefData to keep everything in sync
    const newData = { ...briefData };
    newData.possible_article_titles = updatedTitles;
    setBriefData(newData);
    debouncedSave(newData);
    
    // For immediate feedback, use updateBrief function that properly handles Supabase updates
    if (briefId) {
      // Use the existing function from lib/contentBriefs that handles the format properly
      import('../../lib/contentBriefs').then(({ updateBrief }) => {
        updateBrief(briefId, { possible_article_titles: updatedTitles })
          .then(() => {
            console.log('Possible article titles saved successfully to Supabase');
            toast.success('Article titles saved');
          })
          .catch(error => {
            console.error('Error saving possible article titles to Supabase:', error);
            toast.error('Failed to save article titles');
          });
      });
    }
  }, [possibleTitles, briefData, briefId, debouncedSave]);
  
  // Render an array section with all items and add functionality
  const renderArraySection = useCallback((path: string, items: string[]) => {
    const isAdding = newItem?.path === path;
    
    // Special handling for internal_links and possible_article_titles
    const isInternalLinks = path === 'internal_links';
    const isPossibleTitles = path === 'possible_article_titles';
    
    // Use the correct items array based on path
    let displayItems = items;
    if (isInternalLinks) {
      displayItems = internalLinks;
    } else if (isPossibleTitles) {
      displayItems = possibleTitles;
    }
    
    // Debugging
    console.log(`Rendering array section for path: ${path}`, displayItems);
    
    // Handle add item for special fields
    const handleAddItem = (value: string) => {
      if (isInternalLinks) {
        handleInternalLinksUpdate('add', undefined, value);
      } else if (isPossibleTitles) {
        handlePossibleTitlesUpdate('add', undefined, value);
      } else {
        addArrayItem(path, value);
      }
    };
    
    return (
      <div className="space-y-2">
        <AnimatePresence>
          {Array.isArray(displayItems) && displayItems.map((item, index) => {
            // Special handling for internal_links and possible_article_titles rendering
            if (isInternalLinks || isPossibleTitles) {
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
                            if (isInternalLinks) {
                              handleInternalLinksUpdate('update', index, editingItem.value);
                            } else if (isPossibleTitles) {
                              handlePossibleTitlesUpdate('update', index, editingItem.value);
                            }
                          } else if (e.key === 'Escape') {
                            setEditingItem(null);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 text-black placeholder:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter value"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editingItem) {
                            if (isInternalLinks) {
                              handleInternalLinksUpdate('update', index, editingItem.value);
                            } else if (isPossibleTitles) {
                              handlePossibleTitlesUpdate('update', index, editingItem.value);
                            }
                          }
                        }}
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
                          onClick={() => {
                            if (isInternalLinks) {
                              handleInternalLinksUpdate('remove', index);
                            } else if (isPossibleTitles) {
                              handlePossibleTitlesUpdate('remove', index);
                            } else {
                              removeArrayItem(path, index);
                            }
                          }}
                          className="p-2 rounded-full hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            } else {
              // For normal arrays, use the existing renderArrayItem function
              return renderArrayItem(path, item, index);
            }
          })}
        </AnimatePresence>
        
        {isAdding ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItem?.value || ''}
              onChange={(e) => setNewItem(prev => prev ? { ...prev, value: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newItem) {
                  handleAddItem(newItem.value);
                } else if (e.key === 'Escape') {
                  setNewItem(null);
                }
              }}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 text-black placeholder:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter value"
              autoFocus
            />
            <button
              onClick={() => newItem && handleAddItem(newItem.value)}
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
          </div>
        ) : (
          <button
            onClick={() => setNewItem({ path, value: '' })}
            className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900"
          >
            <Plus className="w-4 h-4" />
            <span>Add item</span>
          </button>
        )}
      </div>
    );
  }, [newItem, setNewItem, addArrayItem, renderArrayItem, internalLinks, possibleTitles, handleInternalLinksUpdate, handlePossibleTitlesUpdate, getColorForSection, editingItem, removeArrayItem]);

  // Render the content of a section based on its type
  const renderSectionContent = useCallback((section: string, content: any) => {
    // Debug current section and content being rendered
    console.log(`Rendering section: ${section}`, content);
    
    if (Array.isArray(content)) {
      // Important: For top-level arrays, don't use a composite path
      return renderArraySection(section, content);
    }

    if (typeof content === 'object' && content !== null) {
      return (
        <div className="space-y-4">
          {Object.entries(content).map(([key, value]) => {
            // Format the display name for the subsection
            const displayName = key.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            // Create the correct path for nested elements
            const nestedPath = `${section}.${key}`;
            
            return (
              <div key={`${section}-${key}`} className="space-y-2">
                <h4 className="font-medium text-gray-700">{displayName}</h4>
                {renderSectionContent(nestedPath, value)}
              </div>
            );
          })}
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
