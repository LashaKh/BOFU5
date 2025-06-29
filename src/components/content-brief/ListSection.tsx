import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Plus, 
  GripVertical, 
  Edit3, 
  X, 
  Check, 
  ListChecks
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { fetchUSPs, fetchCompetitors } from '../../lib/contentBriefs';

interface ListSectionProps {
  sectionKey: string;
  items: string[];
  emptyMessage?: string;
  onAddItem: (sectionKey: string, value: string) => void;
  onUpdateItem: (sectionKey: string, index: number, value: string) => void;
  onRemoveItem: (sectionKey: string, index: number) => void;
  readOnly?: boolean;
  researchResultId?: string;
  suggestedItems?: any[];
  className?: string;
}

/**
 * Enhanced list editing component with modern UI/UX
 * Supports dropdown suggestions and inline editing with production-ready design
 */
export const ListSection: React.FC<ListSectionProps> = ({ 
  sectionKey, 
  items, 
  emptyMessage = 'No items',
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  readOnly = false,
  researchResultId,
  suggestedItems,
  className = ""
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newItem, setNewItem] = useState<{ sectionKey: string; value: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [availablePainPoints, setAvailablePainPoints] = useState<string[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<any[]>([]);
  const [availableUSPs, setAvailableUSPs] = useState<string[]>([]);
  const [availableCompetitors, setAvailableCompetitors] = useState<string[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  const editingRef = useRef<HTMLTextAreaElement>(null);
  const newItemRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLElement | null>(null);

  // Auto-resize textarea
  const autoResize = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = Math.max(element.scrollHeight, 80) + 'px';
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent, mode: 'edit' | 'add') => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'edit' && editingIndex !== null && editingValue.trim()) {
        onUpdateItem(sectionKey, editingIndex, editingValue.trim());
        setEditingIndex(null);
        setEditingValue('');
      } else if (mode === 'add' && newItem?.value.trim()) {
        onAddItem(sectionKey, newItem.value.trim());
        setNewItem(null);
        if (newItemRef.current) {
          newItemRef.current.style.height = '80px';
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (mode === 'edit') {
        setEditingIndex(null);
        setEditingValue('');
      } else if (mode === 'add') {
        setNewItem(null);
        if (newItemRef.current) {
          newItemRef.current.style.height = '80px';
        }
      }
    }
  };

  // Start editing an item
  const handleStartEdit = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
    setTimeout(() => {
      if (editingRef.current) {
        editingRef.current.focus();
        autoResize(editingRef.current);
      }
    }, 50);
  };

  // Section type checks
  const isPainPointsSection = sectionKey === 'pain_points';
  const isCapabilitiesSection = sectionKey === 'capabilities';
  const isUSPsSection = sectionKey === 'usps';
  const isCompetitorsSection = sectionKey === 'competitors';
  
  // Set up portal container for dropdown
  useEffect(() => {
    // Create or find the portal root - don't remove it on unmount since multiple components might use it
    let portalRoot = document.getElementById('dropdown-portal-root');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'dropdown-portal-root';
      portalRoot.style.position = 'fixed';
      portalRoot.style.top = '0';
      portalRoot.style.left = '0';
      portalRoot.style.width = '100vw';
      portalRoot.style.height = '100vh';
      portalRoot.style.pointerEvents = 'none';
      portalRoot.style.zIndex = '9999';
      document.body.appendChild(portalRoot);
      console.log('Created new dropdown portal root');
    }
    dropdownPortalRef.current = portalRoot;
    console.log('Portal setup complete, portal element:', portalRoot);

    // Don't remove the portal on unmount since other components might be using it
  }, []);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Enhanced error handling and loading states - using only fallback data
  useEffect(() => {
    if (isPainPointsSection && showDropdown) {
      const getPainPoints = () => {
        console.log('Loading pain points fallback data...');
        setAvailablePainPoints([
          'High operational costs',
          'Inefficient processes',
          'Limited market reach',
          'Technology bottlenecks',
          'Resource constraints',
          'Complex workflows',
          'Manual data entry tasks',
          'Poor customer experience',
          'Lack of real-time visibility',
          'Integration challenges'
        ]);
        console.log('Pain points data loaded successfully');
      };

      getPainPoints();
    }
  }, [isPainPointsSection, showDropdown]);

  useEffect(() => {
    if (isCapabilitiesSection && showDropdown) {
      const getCapabilities = async () => {
        console.log('Loading capabilities data...', { researchResultId });
        
        try {
          // First try to fetch from research result if researchResultId is available
          if (researchResultId) {
            console.log('Fetching capabilities from research result:', researchResultId);
            
            const { supabase } = await import('../../lib/supabase');
            
            // Try research_results table first
            const { data: researchData, error } = await supabase
              .from('research_results')
              .select('data')
              .eq('id', researchResultId)
              .single();
              
            if (error) {
              console.error('Error fetching research result:', error);
            } else if (researchData?.data && Array.isArray(researchData.data)) {
              console.log('Research result data found:', researchData.data);
              
              // Extract combined features and capabilities from all products in this research result
              const allCapabilities: any[] = [];
              
              researchData.data.forEach((product: any, productIndex: number) => {
                // Combine features (titles) with capabilities (descriptions) as pairs
                const features = product.features || [];
                const capabilities = product.capabilities || [];
                
                console.log(`Product ${productIndex}: ${features.length} features, ${capabilities.length} capabilities`);
                
                // Method 1: Try to pair features with capabilities by index
                const maxLength = Math.max(features.length, capabilities.length);
                for (let i = 0; i < maxLength; i++) {
                  const feature = features[i];
                  const capability = capabilities[i];
                  
                  if (feature || capability) {
                    let title = '';
                    let description = '';
                    let fullText = '';
                    
                    // If we have both feature and capability, combine them
                    if (feature && capability) {
                      if (typeof capability === 'object' && capability.content) {
                        title = feature;
                        description = capability.content;
                        fullText = `${feature}: ${capability.content}`;
                      } else if (typeof capability === 'string') {
                        title = feature;
                        description = capability;
                        fullText = `${feature}: ${capability}`;
                      } else {
                        title = feature;
                        description = capability.description || capability.title || 'No description';
                        fullText = `${feature}: ${description}`;
                      }
                    } else if (feature) {
                      // Only feature available
                      title = feature;
                      description = 'Product feature';
                      fullText = feature;
                    } else if (capability) {
                      // Only capability available
                      if (typeof capability === 'object' && capability.content) {
                        title = capability.title || 'Capability';
                        description = capability.content;
                        fullText = capability.content;
                      } else {
                        title = String(capability);
                        description = '';
                        fullText = String(capability);
                      }
                    }
                    
                    allCapabilities.push({
                      title: title,
                      description: description,
                      fullText: fullText,
                      displayText: description ? `${title} - ${description.substring(0, 80)}${description.length > 80 ? '...' : ''}` : title,
                      images: (typeof capability === 'object' && capability.images) ? capability.images : [],
                      source: 'research_result'
                    });
                  }
                }
              });
              
              if (allCapabilities.length > 0) {
                console.log(`Successfully extracted ${allCapabilities.length} capabilities from research result`);
                setAvailableCapabilities(allCapabilities);
                return;
              } else {
                console.log('No capabilities found in research result data');
              }
            }
            
            // If research result doesn't have good data, try approved_products table
            console.log('Trying approved_products table as fallback...');
            const { data: approvedData, error: approvedError } = await supabase
              .from('approved_products')
              .select('product_data')
              .eq('id', researchResultId)
              .single();
              
            if (!approvedError && approvedData?.product_data) {
              console.log('Approved product data found:', approvedData.product_data);
              
              const productData = approvedData.product_data;
              const capabilities = productData.capabilities || [];
              
              if (capabilities.length > 0) {
                const allCapabilities = capabilities.map((cap: any) => ({
                  title: cap.title || 'Unnamed Capability',
                  description: cap.content || cap.description || '',
                  fullText: cap.content || cap.description || cap.title || 'No description available',
                  displayText: `${cap.title || 'Unnamed'} - ${(cap.content || cap.description || 'No description').substring(0, 80)}...`,
                  images: cap.images || [],
                  source: 'approved_product'
                }));
                
                console.log(`Successfully extracted ${allCapabilities.length} capabilities from approved product`);
                setAvailableCapabilities(allCapabilities);
                return;
              }
            }
          }
          
          // Fallback to default capabilities if no data from research result
          console.log('Using fallback capabilities data...');
          setAvailableCapabilities([
            {
              title: 'AI-Powered Automation',
              description: 'Intelligent workflow automation',
              fullText: 'AI-Powered Automation - Intelligent workflow automation that reduces manual tasks and improves efficiency',
              displayText: 'AI-Powered Automation - Intelligent workflow automation'
            },
            {
              title: 'Real-time Monitoring',
              description: 'Live system performance tracking',
              fullText: 'Real-time Monitoring - Live system performance tracking and alerting for proactive issue resolution',
              displayText: 'Real-time Monitoring - Live system performance tracking'
            },
            {
              title: 'Enterprise Integration',
              description: 'Seamless system connectivity',
              fullText: 'Enterprise Integration - Seamless connectivity with existing enterprise systems and workflows',
              displayText: 'Enterprise Integration - Seamless system connectivity'
            },
            {
              title: 'Advanced Analytics',
              description: 'Data-driven insights and reporting',
              fullText: 'Advanced Analytics - Comprehensive data analysis and reporting capabilities for informed decision-making',
              displayText: 'Advanced Analytics - Data-driven insights and reporting'
            },
            {
              title: 'Scalable Infrastructure',
              description: 'Cloud-based scaling solutions',
              fullText: 'Scalable Infrastructure - Cloud-native architecture that grows with your business needs',
              displayText: 'Scalable Infrastructure - Cloud-based scaling solutions'
            },
            {
              title: 'Security Framework',
              description: 'Enterprise-grade security measures',
              fullText: 'Security Framework - Comprehensive security protocols and compliance standards',
              displayText: 'Security Framework - Enterprise-grade security measures'
            }
          ]);
          console.log('Capabilities data loaded successfully');
        } catch (error) {
          console.error('Error loading capabilities:', error);
          // Use fallback data on error
          setAvailableCapabilities([
            {
              title: 'Generic Capability',
              description: 'Placeholder capability',
              fullText: 'Generic capability placeholder',
              displayText: 'Generic Capability - Placeholder'
            }
          ]);
        }
      };

      getCapabilities();
    }
  }, [isCapabilitiesSection, showDropdown, researchResultId]);

  // New useEffect for USPs
  useEffect(() => {
    if (isUSPsSection && showDropdown) {
      const getUSPs = async () => {
        console.log('Loading USPs data...');
        try {
          // First try to fetch from database if researchResultId is available
          if (researchResultId) {
            const fetchedUSPs = await fetchUSPs(researchResultId);
            if (fetchedUSPs.length > 0) {
              console.log('USPs fetched from database:', fetchedUSPs);
              setAvailableUSPs(fetchedUSPs);
              return;
            }
          }
          
          // Fallback to default USPs if no data from database
          console.log('Using fallback USPs data...');
          setAvailableUSPs([
            'Market-leading performance and reliability',
            'Comprehensive automation that reduces manual work by 80%',
            'Enterprise-grade security with military-level encryption',
            'Seamless integration with 500+ popular business tools',
            'AI-powered insights that drive data-driven decision making',
            'Cloud-native architecture for unlimited scalability',
            'Real-time collaboration and communication features',
            'Advanced analytics and customizable reporting dashboards',
            'Industry-leading customer support with 24/7 availability',
            'Cost-effective solution that delivers immediate ROI',
            'User-friendly interface requiring minimal training',
            'Compliance with industry standards and regulations'
          ]);
          console.log('USPs data loaded successfully');
        } catch (error) {
          console.error('Error fetching USPs:', error);
          // Use fallback data on error
          setAvailableUSPs([
            'Unique competitive advantage',
            'Superior product quality',
            'Exceptional customer service',
            'Cost-effective solution',
            'Innovative technology'
          ]);
        }
      };

      getUSPs();
    }
  }, [isUSPsSection, showDropdown, researchResultId]);

  // New useEffect for Competitors
  useEffect(() => {
    if (isCompetitorsSection && showDropdown) {
      const getCompetitors = async () => {
        console.log('Loading competitors data...');
        console.log('isCompetitorsSection:', isCompetitorsSection);
        console.log('showDropdown:', showDropdown);
        console.log('researchResultId:', researchResultId);
        console.log('sectionKey:', sectionKey);
        
        try {
          // First try to fetch from database if researchResultId is available
          if (researchResultId) {
            console.log('Calling fetchCompetitors with researchResultId:', researchResultId);
            const fetchedCompetitors = await fetchCompetitors(researchResultId);
            console.log('fetchCompetitors returned:', fetchedCompetitors);
            console.log('fetchedCompetitors.length:', fetchedCompetitors.length);
            
            if (fetchedCompetitors.length > 0) {
              console.log('✅ Competitors fetched from database:', fetchedCompetitors);
              setAvailableCompetitors(fetchedCompetitors);
              return;
            } else {
              console.log('❌ fetchCompetitors returned empty array');
            }
          } else {
            console.log('❌ No researchResultId provided');
          }
          
          // Fallback to minimal competitors if no data from database
          console.log('🔄 No competitors found in database, using minimal fallback...');
          setAvailableCompetitors([
            'Industry Competitor 1',
            'Industry Competitor 2',
            'Alternative Solution Provider',
            'Market Leader',
            'Similar Platform'
          ]);
          console.log('Competitors data loaded successfully');
        } catch (error) {
          console.error('❌ Error fetching competitors:', error);
          // Use fallback data on error
          setAvailableCompetitors([
            'Competitor A',
            'Competitor B',
            'Competitor C',
            'Industry Leader',
            'Alternative Solution'
          ]);
        }
      };

      getCompetitors();
    }
  }, [isCompetitorsSection, showDropdown, researchResultId]);

  // Position dropdown relative to button
  const positionDropdown = useCallback((buttonEl: HTMLElement) => {
    console.log('Positioning dropdown for button:', buttonEl);
    const rect = buttonEl.getBoundingClientRect();
    console.log('Button rect:', rect);
    
    // Calculate position relative to viewport, not document scroll
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 256; // max-h-64 = 256px
    
    // Position below button, but ensure it stays in viewport
    let top = rect.bottom + 8; // 8px spacing below button
    let left = rect.left;
    
    // If dropdown would go below viewport, position it above the button
    if (top + dropdownHeight > viewportHeight) {
      top = rect.top - dropdownHeight - 8; // Position above with 8px spacing
    }
    
    // Ensure dropdown doesn't go off the left or right edge
    const dropdownWidth = 384; // w-96 = 384px
    const viewportWidth = window.innerWidth;
    
    if (left + dropdownWidth > viewportWidth) {
      left = viewportWidth - dropdownWidth - 16; // 16px margin from edge
    }
    
    if (left < 16) {
      left = 16; // Minimum 16px from left edge
    }

    const newPosition = {
      top: Math.max(16, top), // Minimum 16px from top
      left: Math.max(16, left) // Minimum 16px from left
    };
    
    console.log('Setting dropdown position:', newPosition);
    setDropdownPosition(newPosition);
  }, []);
  
  // Handle clicking on an item from dropdown
  const handleDropdownItemSelect = useCallback((item: any) => {
    console.log('Dropdown item selected:', item);
    // If item is a capability object with fullText, use that for the complete content
    if (typeof item === 'object' && item.fullText) {
      let contentToAdd = item.fullText;
      
      // If there are images, append them to the content for capabilities section
      if (item.images && item.images.length > 0) {
        const imageLinks = item.images.map((url: string, index: number) => 
          `Image ${index + 1}: ${url}`
        ).join('\n');
        contentToAdd = `${item.fullText}\n\nImages:\n${imageLinks}`;
      }
      
      onAddItem(sectionKey, contentToAdd);
    } else {
      // Otherwise use the item directly (for pain points)
      onAddItem(sectionKey, String(item));
    }
    setShowDropdown(false);
  }, [onAddItem, sectionKey]);
  
  // Render the dropdown using a portal
  const renderDropdown = useCallback(() => {
    // Get the appropriate items based on section type
    const dropdownItems = isPainPointsSection ? availablePainPoints : 
                         isCapabilitiesSection ? availableCapabilities :
                         isUSPsSection ? availableUSPs :
                         isCompetitorsSection ? availableCompetitors : null;
                         
    console.log('Rendering dropdown:', {
      showDropdown,
      hasPortal: !!dropdownPortalRef.current,
      itemsLength: dropdownItems?.length || 0,
      dropdownPosition,
      isPainPointsSection,
      isCapabilitiesSection,
      isUSPsSection,
      isCompetitorsSection,
      sectionKey
    });
                         
    if (!showDropdown || !dropdownPortalRef.current) {
      console.log('Dropdown not shown because:', { 
        showDropdown, 
        hasPortal: !!dropdownPortalRef.current 
      });
      return null;
    }

    return createPortal(
      <div 
        ref={dropdownRef}
        className="fixed bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 w-96"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          zIndex: 10000,
          pointerEvents: 'auto',
          maxHeight: '256px',
          width: '384px'
        }}
      >
        <div className="p-3 border-b border-gray-200 bg-gray-50 sticky top-0">
          <h4 className="font-medium text-gray-700 text-sm">
            {isPainPointsSection ? 'Available Pain Points' : 
             isCapabilitiesSection ? 'Available Capabilities' : 
             isUSPsSection ? 'Available USPs' :
             isCompetitorsSection ? 'Available Competitors' : 'Available Items'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {dropdownItems?.length || 0} items available
          </p>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {dropdownItems && dropdownItems.length > 0 ? (
            dropdownItems.map((item, index) => (
              <div 
                key={`dropdown-item-${index}`}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                onClick={() => handleDropdownItemSelect(item)}
              >
                {/* For capability objects with displayText property */}
                {isCapabilitiesSection && typeof item === 'object' && item.displayText
                  ? <div>
                      <div className="font-medium text-gray-900">{item.title || ''}</div>
                      {item.description && item.description !== 'Product feature' && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-3">{item.description}</div>
                      )}
                      {item.images && item.images.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-green-600 font-medium mb-1">
                            📷 Images ({item.images.length})
                          </div>
                          <div className="space-y-1">
                            {item.images.map((imageUrl: string, imgIndex: number) => (
                              <div key={imgIndex} className="text-xs">
                                <a 
                                  href={imageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline break-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Image {imgIndex + 1}: {imageUrl.split('/').pop()?.substring(0, 20)}...
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-blue-500 mt-2 font-medium">
                        {item.source === 'combined' ? 'Feature + Capability' : 
                         item.source === 'approved_product' ? 'Approved Product' :
                         `Source: ${item.source}`}
                      </div>
                    </div>
                  : <div className="text-gray-900">{String(item)}</div>
                }
              </div>
            ))
          ) : (
            <div className="p-4 text-gray-500 text-center text-sm">
              No {isPainPointsSection ? 'pain points' : 
                   isCapabilitiesSection ? 'capabilities' : 
                   isUSPsSection ? 'USPs' :
                   isCompetitorsSection ? 'competitors' : 'items'} available
              {researchResultId ? ` for research result ${researchResultId}` : ' (no research result ID)'}
            </div>
          )}
        </div>
      </div>,
      dropdownPortalRef.current
    );
  }, [showDropdown, availablePainPoints, availableCapabilities, availableUSPs, availableCompetitors, dropdownPosition, handleDropdownItemSelect, isPainPointsSection, isCapabilitiesSection, isUSPsSection, isCompetitorsSection, researchResultId, sectionKey]);

  if (readOnly && (!items || items.length === 0)) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="space-y-2">
          <p className="text-lg font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Compact Items Display */}
      <AnimatePresence mode="popLayout">
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <motion.div
              key={`${sectionKey}-${index}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="group relative"
            >
              {editingIndex === index ? (
                /* Enhanced Edit Mode with Better Contrast */
                <div className="bg-white border-2 border-blue-400 rounded-lg p-4 shadow-lg">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-2">
                        <GripVertical className="w-3 h-3 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <textarea
                          ref={editingRef}
                          value={editingValue}
                          onChange={(e) => {
                            setEditingValue(e.target.value);
                            autoResize(e.target);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, 'edit')}
                          className="w-full p-3 text-sm leading-relaxed border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none transition-all duration-200"
                          placeholder="Enter your content..."
                          style={{ minHeight: '80px' }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 font-medium">
                        Cmd/Ctrl + Enter to save • Escape to cancel
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingIndex(null);
                            setEditingValue('');
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (editingIndex !== null && editingValue.trim()) {
                              onUpdateItem(sectionKey, editingIndex, editingValue.trim());
                              setEditingIndex(null);
                              setEditingValue('');
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center space-x-2 shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Compact Display Mode */
                <div className="bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-sm">
                  <div className="flex items-start space-x-3 group">
                    <div className="flex-shrink-0 mt-1">
                      <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Special handling for capabilities with image URLs */}
                      {isCapabilitiesSection && item.includes('https://') ? (
                        <div className="space-y-3">
                          {(() => {
                            // Split content and extract image URLs
                            const parts = item.split('\n\nImages:\n');
                            const mainContent = parts[0];
                            const imageUrls = parts[1] ? parts[1].split('\n').map((line: string) => {
                              const match = line.match(/Image \d+: (https:\/\/[^\s]+)/);
                              return match ? match[1] : null;
                            }).filter(Boolean) : [];
                            
                            return (
                              <>
                                <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap break-words">
                                  {mainContent}
                                </p>
                                {imageUrls.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-xs text-green-600 font-medium mb-2">
                                      📷 Images ({imageUrls.length})
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                      {imageUrls.map((url: string, index: number) => (
                                        <div key={index} className="group relative">
                                          <img 
                                            src={url} 
                                            alt={`Capability Image ${index + 1}`}
                                            className="w-full h-24 object-cover rounded border border-gray-200 group-hover:border-gray-300 transition-colors"
                                            onError={(e) => {
                                              // Fallback to link if image fails to load
                                              e.currentTarget.style.display = 'none';
                                              if (e.currentTarget.nextElementSibling) {
                                                (e.currentTarget.nextElementSibling as HTMLElement).classList.remove('hidden');
                                              }
                                            }}
                                          />
                                          <div className="hidden bg-gray-100 p-2 rounded border border-gray-200">
                                            <a 
                                              href={url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 text-xs break-all"
                                            >
                                              🖼️ Image {index + 1}: {url.split('/').pop()?.substring(0, 20)}...
                                            </a>
                                          </div>
                                          {/* Image overlay with link */}
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <a 
                                              href={url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="bg-blue-500/80 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-500"
                                            >
                                              View
                                            </a>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap break-words">
                          {item}
                        </p>
                      )}
                    </div>
                    
                    {!readOnly && (
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleStartEdit(index, item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onRemoveItem(sectionKey, index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{emptyMessage}</p>
              {!readOnly && (
                <p className="text-xs">Add items below</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Add New Item Section */}
      {!readOnly && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-lg p-4 transition-all duration-200 bg-white"
        >
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-2">
                <Plus className="w-3 h-3 text-gray-400" />
              </div>
              <div className="flex-1">
                <textarea
                  ref={newItemRef}
                  value={newItem?.value || ''}
                  onChange={(e) => {
                    setNewItem({ sectionKey, value: e.target.value });
                    autoResize(e.target);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'add')}
                  placeholder="Add a new item..."
                  className="w-full p-3 text-sm leading-relaxed border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none transition-all duration-200"
                  style={{ minHeight: '80px' }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="text-xs text-gray-600 font-medium">
                  Cmd/Ctrl + Enter to add
                </div>
                {(isPainPointsSection || isCapabilitiesSection || isUSPsSection || isCompetitorsSection) && (
                  <button
                    onClick={(e) => {
                      console.log('Browse button clicked, current showDropdown:', showDropdown);
                      positionDropdown(e.currentTarget);
                      setShowDropdown(!showDropdown);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                  >
                    <ListChecks className="w-3 h-3" />
                    <span>Browse</span>
                  </button>
                )}
              </div>
              {newItem?.value.trim() && (
                <button
                  onClick={() => {
                    if (newItem?.value.trim()) {
                      onAddItem(sectionKey, newItem.value.trim());
                      setNewItem(null);
                      if (newItemRef.current) {
                        newItemRef.current.style.height = '80px';
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center space-x-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Render dropdown portal */}
      {renderDropdown()}
    </div>
  );
};

export default ListSection; 