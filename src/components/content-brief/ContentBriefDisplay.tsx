import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Lightbulb, 
  Radio, 
  Link as LinkIcon, 
  Award,
  Target,
  ChevronDown
} from 'lucide-react';
import { SectionItem } from './SectionItem';
import { ListSection } from './ListSection';
import TextAreaSection from './TextAreaSection';
import { ContentBriefData } from '../../types/contentBrief';
import { parseContent, stringifyContent } from '../../utils/contentProcessing';

interface ContentBriefDisplayProps {
  content: string;
  onContentChange?: (updatedContent: string) => void;
  onInternalLinksChange?: (links: string[]) => void;
  onSuggestedTitlesChange?: (titles: string[]) => void;
  readOnly?: boolean;
  possibleTitles?: string[];
  additionalLinks?: string[];
  researchResultId?: string;
}

export const ContentBriefDisplay: React.FC<ContentBriefDisplayProps> = ({ 
  content, 
  onContentChange,
  onInternalLinksChange,
  onSuggestedTitlesChange,
  readOnly = false,
  possibleTitles,
  additionalLinks,
  researchResultId
}) => {
  const [sections, setSections] = useState<ContentBriefData>({});
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Stabilize array references to prevent infinite re-renders
  const stablePossibleTitles = useMemo(() => possibleTitles || [], [possibleTitles]);
  const stableAdditionalLinks = useMemo(() => additionalLinks || [], [additionalLinks]);
  
  // State for collapsible sections - all collapsed by default
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    notes: true,
    pain_points: true,
    usps: true,
    capabilities: true,
    competitors: true,
    target_audience: true,
    keywords: true,
    content_objectives: true,
    ctas: true,
    internal_links: true,
    possible_article_titles: true
  });

  // Toggle section collapse state
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Parse content when it changes
  useEffect(() => {
    console.log('ContentBriefDisplay: Parsing content...', {
      contentLength: content?.length || 0,
      contentPreview: content ? content.substring(0, 100) + '...' : 'No content',
      possibleTitlesLength: stablePossibleTitles?.length || 0,
      additionalLinksLength: stableAdditionalLinks?.length || 0
    });

    if (content) {
      try {
        const parsed = parseContent(content, stablePossibleTitles, stableAdditionalLinks);
        console.log('ContentBriefDisplay: Parsed content result:', {
          parsedKeys: Object.keys(parsed),
          painPointsLength: parsed.pain_points?.length || 0,
          uspsLength: parsed.usps?.length || 0,
          capabilitiesLength: parsed.capabilities?.length || 0,
          competitorsLength: parsed.competitors?.length || 0
        });
        
        setSections(parsed);
        setHasInitialized(true);
      } catch (error) {
        console.error('ContentBriefDisplay: Error parsing content:', error);
        // Set empty sections as fallback
        setSections({});
        setHasInitialized(true);
      }
    } else {
      console.log('ContentBriefDisplay: No content provided, setting empty sections');
      setSections({});
      setHasInitialized(true);
    }
  }, [content, stablePossibleTitles, stableAdditionalLinks]);

  // Handle history/navigation changes
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Re-parse content on navigation
      if (content) {
        const parsed = parseContent(content, stablePossibleTitles, stableAdditionalLinks);
        setSections(parsed);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [content, stablePossibleTitles, stableAdditionalLinks]);

  // Generate updated content and trigger callbacks
  const generateContentFromSections = useCallback((newSections: ContentBriefData) => {
    const jsonString = stringifyContent(newSections);
    
    if (onContentChange) {
      onContentChange(jsonString);
    }
    
    // Trigger specific callbacks for links and titles
    if (onInternalLinksChange && newSections.internal_links) {
      onInternalLinksChange(newSections.internal_links);
    }
    
    if (onSuggestedTitlesChange && newSections.possible_article_titles) {
      onSuggestedTitlesChange(newSections.possible_article_titles);
    }
  }, [onContentChange, onInternalLinksChange, onSuggestedTitlesChange]);

  // Handle adding items to a section
  const handleAddItem = useCallback((sectionKey: string, value: string) => {
    if (!value.trim()) return;
    
    console.log('ContentBriefDisplay: Adding item to section', sectionKey, ':', value);
    
    setSections(prev => {
      const updatedSections = {
        ...prev,
        [sectionKey]: [...(prev[sectionKey] || []), value.trim()]
      };
      generateContentFromSections(updatedSections);
      return updatedSections;
    });
  }, [generateContentFromSections]);

  // Handle updating items in a section
  const handleUpdateItem = useCallback((sectionKey: string, index: number, value: string) => {
    if (!value.trim()) return;
    
    console.log('ContentBriefDisplay: Updating item in section', sectionKey, 'at index', index, ':', value);
    
    setSections(prev => {
      const updatedItems = [...(prev[sectionKey] || [])];
      updatedItems[index] = value.trim();
      const updatedSections = {
        ...prev,
        [sectionKey]: updatedItems
      };
      generateContentFromSections(updatedSections);
      return updatedSections;
    });
  }, [generateContentFromSections]);

  // Handle removing items from a section
  const handleRemoveItem = useCallback((sectionKey: string, index: number) => {
    console.log('ContentBriefDisplay: Removing item from section', sectionKey, 'at index', index);
    
    setSections(prev => {
      const updatedItems = [...(prev[sectionKey] || [])];
      updatedItems.splice(index, 1);
      const updatedSections = {
        ...prev,
        [sectionKey]: updatedItems
      };
      generateContentFromSections(updatedSections);
      return updatedSections;
    });
  }, [generateContentFromSections]);

  if (!hasInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading content...</div>
      </div>
    );
  }

  // Debug current sections state
  console.log('ContentBriefDisplay: Current sections state:', {
    sectionsKeys: Object.keys(sections),
    painPointsCount: sections.pain_points?.length || 0,
    uspsCount: sections.usps?.length || 0,
    capabilitiesCount: sections.capabilities?.length || 0,
    competitorsCount: sections.competitors?.length || 0
  });
  
  return (
    <div className="max-w-full mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="space-y-6"
      >
        {/* Professional Header with Notes Section - Priority Position */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl opacity-60"></div>
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Notes & Overview</h3>
                  <p className="text-sm text-gray-600">Essential context and implementation notes</p>
                </div>
              </div>
              <button
                onClick={() => toggleSection('notes')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronDown 
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    collapsedSections.notes ? '' : 'rotate-180'
                  }`}
                />
              </button>
            </div>
            {!collapsedSections.notes && (
              <ListSection 
                sectionKey="notes"
                items={sections.notes || []}
                emptyMessage="Add notes and context for this content brief"
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
                readOnly={readOnly}
                className="enhanced-notes-section"
              />
            )}
          </div>
        </div>

        {/* Section Divider with Visual Enhancement */}
        <div className="flex items-center space-x-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full shadow-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Content Sections</span>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-300"></div>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* Row 1: Core Content Sections - Enhanced Professional Design */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pain Points Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-400 via-red-500 to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-500 rounded-lg shadow-lg">
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-900">Pain Points</h4>
                        <p className="text-xs text-red-700">Customer challenges to address</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('pain_points')}
                      className="p-1 hover:bg-red-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-red-700 transition-transform ${
                          collapsedSections.pain_points ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.pain_points && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="pain_points"
                      items={sections.pain_points || []}
                      emptyMessage="No pain points identified"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                      researchResultId={researchResultId}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* USPs Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-100 px-6 py-4 border-b border-yellow-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-yellow-500 rounded-lg shadow-lg">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-900">Unique Selling Propositions</h4>
                        <p className="text-xs text-yellow-700">Competitive advantages</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('usps')}
                      className="p-1 hover:bg-yellow-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-yellow-700 transition-transform ${
                          collapsedSections.usps ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.usps && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="usps"
                      items={sections.usps || []}
                      emptyMessage="No USPs defined"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                      researchResultId={researchResultId}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Capabilities Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-100 px-6 py-4 border-b border-green-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-lg shadow-lg">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-900">Capabilities</h4>
                        <p className="text-xs text-green-700">Core competencies</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('capabilities')}
                      className="p-1 hover:bg-green-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-green-700 transition-transform ${
                          collapsedSections.capabilities ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.capabilities && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="capabilities"
                      items={sections.capabilities || []} 
                      emptyMessage="No capabilities listed"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                      researchResultId={researchResultId}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Row 2: Market & Audience Sections - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-purple-500 to-violet-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-violet-100 px-6 py-4 border-b border-purple-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-lg shadow-lg">
                        <Radio className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-purple-900">Competitors</h4>
                        <p className="text-xs text-purple-700">Market landscape analysis</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('competitors')}
                      className="p-1 hover:bg-purple-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-purple-700 transition-transform ${
                          collapsedSections.competitors ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.competitors && (
                  <div className="p-6">
                    <ListSection
                      sectionKey="competitors"
                      items={sections.competitors || []}
                      emptyMessage="No competitors identified"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-100 px-6 py-4 border-b border-blue-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg shadow-lg">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900">Target Audience</h4>
                        <p className="text-xs text-blue-700">Primary customer segments</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('target_audience')}
                      className="p-1 hover:bg-blue-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-blue-700 transition-transform ${
                          collapsedSections.target_audience ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.target_audience && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="target_audience"
                      items={sections.target_audience || []}
                      emptyMessage="No target audience defined"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Row 3: Content Strategy Sections - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 via-indigo-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-100 px-6 py-4 border-b border-indigo-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-lg shadow-lg">
                        <LinkIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-indigo-900">Keywords</h4>
                        <p className="text-xs text-indigo-700">SEO & content targeting</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('keywords')}
                      className="p-1 hover:bg-indigo-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-indigo-700 transition-transform ${
                          collapsedSections.keywords ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.keywords && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="keywords"
                      items={sections.keywords || []}
                      emptyMessage="No keywords defined"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-orange-500 to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-50 to-red-100 px-6 py-4 border-b border-orange-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg shadow-lg">
                        <Lightbulb className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-900">Content Objectives</h4>
                        <p className="text-xs text-orange-700">Strategic goals</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('content_objectives')}
                      className="p-1 hover:bg-orange-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-orange-700 transition-transform ${
                          collapsedSections.content_objectives ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.content_objectives && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="content_objectives"
                      items={sections.content_objectives || []}
                      emptyMessage="No content objectives defined"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-pink-500 to-rose-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-pink-50 to-rose-100 px-6 py-4 border-b border-pink-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-pink-500 rounded-lg shadow-lg">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-pink-900">Call-to-Actions</h4>
                        <p className="text-xs text-pink-700">Conversion elements</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('ctas')}
                      className="p-1 hover:bg-pink-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-pink-700 transition-transform ${
                          collapsedSections.ctas ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.ctas && (
                  <div className="p-6">
                    <ListSection
                      sectionKey="ctas"
                      items={sections.ctas || []}
                      emptyMessage="No CTAs defined"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Row 4: Links & Titles Sections - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 via-teal-500 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-100 px-6 py-4 border-b border-teal-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-teal-500 rounded-lg shadow-lg">
                        <LinkIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-teal-900">Internal Links</h4>
                        <p className="text-xs text-teal-700">Cross-referencing strategy</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('internal_links')}
                      className="p-1 hover:bg-teal-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-teal-700 transition-transform ${
                          collapsedSections.internal_links ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.internal_links && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="internal_links"
                      items={sections.internal_links || []}
                      emptyMessage="No internal links specified"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 1.0 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-50 to-blue-100 px-6 py-4 border-b border-cyan-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-cyan-500 rounded-lg shadow-lg">
                        <Lightbulb className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-cyan-900">Possible Article Titles</h4>
                        <p className="text-xs text-cyan-700">Content title options</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSection('possible_article_titles')}
                      className="p-1 hover:bg-cyan-200 rounded transition-colors"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 text-cyan-700 transition-transform ${
                          collapsedSections.possible_article_titles ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!collapsedSections.possible_article_titles && (
                  <div className="p-6">
                    <ListSection 
                      sectionKey="possible_article_titles"
                      items={sections.possible_article_titles || []}
                      emptyMessage="No article titles suggested"
                      onAddItem={handleAddItem}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
