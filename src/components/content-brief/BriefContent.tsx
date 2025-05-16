import { EditorContent } from '@tiptap/react';
import { motion } from 'framer-motion';
import type { Editor } from '@tiptap/react';
import { useState, useEffect } from 'react';
import { BriefSection } from './BriefSection';
import { LoadingState } from '../common/LoadingState';
import { validateBriefContent, validateBriefMetadata } from '../../utils/briefValidation';
import { useBriefContent } from '../../hooks/useBriefContent';
import type { SuggestedTitle, SuggestedLink } from '../../types/contentBrief';
import '../../App.css';

interface BriefContentProps {
  editor: Editor | null;
  onValidationChange?: (isValid: boolean) => void;
  briefId: string;
  articleTitle?: string;
  onArticleTitleChange?: (title: string) => void;
  onSuggestedTitlesChange?: (titles: string[]) => void;
  onInternalLinksChange?: (links: string[]) => void;
  suggestedTitles?: SuggestedTitle[];
  suggestedLinks?: SuggestedLink[];
}

export function BriefContent({ 
  editor, 
  onValidationChange, 
  briefId, 
  articleTitle = 'Untitled Content Brief', 
  onArticleTitleChange,
  onSuggestedTitlesChange,
  onInternalLinksChange,
  suggestedTitles = [],
  suggestedLinks = []
}: BriefContentProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { state, isSaving, updateContent } = useBriefContent({ editor, briefId });
  
  // Handle title selection - update the title field but only send after approval
  const handleTitleSelect = (title: string) => {
    if (onArticleTitleChange) {
      onArticleTitleChange(title);
    }
    
    // Also update possible_article_titles if callback is provided
    if (onSuggestedTitlesChange) {
      // Extract all titles and ensure the selected one is first in the list
      const titles = suggestedTitles.map(t => t.title).filter(t => t !== title);
      titles.unshift(title);
      console.log('UPDATING TITLES on select:', titles);
      onSuggestedTitlesChange(titles);
    }
  };
  
  // Handle link selection
  const handleLinkSelect = (link: SuggestedLink) => {
    // In a real implementation, this would insert the link into the editor
    console.log('Selected link:', link);
  };

  if (!editor) return null;

  // Update content in Supabase when editor content changes
  useEffect(() => {
    const handler = () => {
      const content = editor.getHTML();
      if (content !== state.content) {
        updateContent(content);
      }
    };

    const debounceTimeout = setTimeout(handler, 1000);
    return () => clearTimeout(debounceTimeout);
  }, [editor, state.content, updateContent]);

  // Set up validation on component mount
  useEffect(() => {
    const updateHandler = () => {
      const contentValidation = validateBriefContent(editor);
      const metadataValidation = validateBriefMetadata(state.version, state.updatedAt);

      const allErrors = [...contentValidation.errors, ...metadataValidation.errors];
      setValidationErrors(allErrors);

      if (onValidationChange) {
        onValidationChange(allErrors.length === 0);
      }
    };

    // Add validation handler
    editor.on('update', updateHandler);
    
    // Initial validation
    updateHandler();
    
    // Cleanup
    return () => {
      editor.off('update', updateHandler);
    };
  }, [editor, state.version, state.updatedAt, onValidationChange]);

  return (
    <LoadingState isLoading={isSaving} className="space-y-6">
      {isSaving && (
        <div className="brief-header">
          <span className="text-xs text-gray-500 italic">Saving...</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="dashboard-card p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Article Title</h4>
          <input
            type="text"
            value={articleTitle}
            onChange={(e) => onArticleTitleChange?.(e.target.value)}
            className="text-lg font-semibold text-gray-900 w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            placeholder="Enter article title"
          />
        </div>

        <div className="editor-container p-4 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors duration-200">
          <EditorContent editor={editor} />
        </div>

        <div className="mt-8 space-y-6">
          <BriefSection 
            title="Suggested Titles" 
            collapsible 
            defaultOpen={true}
            actionButton={
              <button 
                onClick={() => {
                  // Add a new empty title for the user to fill in
                  const newTitle: SuggestedTitle = { title: 'New title idea...', score: 0 };
                  suggestedTitles.push(newTitle);
                  
                  // Update possible_article_titles if callback is provided
                  if (onSuggestedTitlesChange) {
                    const titles = suggestedTitles.map(t => t.title);
                    onSuggestedTitlesChange(titles);
                  }
                  
                  console.log('Added new title:', newTitle);
                }}
                className="secondary-button text-xs flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Title
              </button>
            }
          >
            {suggestedTitles.length > 0 ? (
              <ul className="space-y-3">
                {suggestedTitles.map((title, index) => (
                  <motion.li
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <div className={`suggested-item group w-full ${articleTitle === title.title ? 'border-primary-500 bg-primary-50' : ''}`}>
                      <div className="flex items-start justify-between p-2">
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            defaultValue={title.title}
                            className="w-full text-base font-medium text-gray-900 bg-transparent border-0 focus:ring-0 focus:border-0 p-0"
                            onBlur={(e) => {
                              // Update the title when user finishes editing
                              const newTitle = e.target.value;
                              title.title = newTitle;
                              
                              // Update possible_article_titles if callback is provided
                              if (onSuggestedTitlesChange) {
                                const titles = suggestedTitles.map(t => t.title);
                                onSuggestedTitlesChange(titles);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleTitleSelect(e.currentTarget.value);
                              }
                            }}
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTitleSelect(title.title)}
                            className="p-1 text-primary-600 hover:text-primary-800 transition-colors"
                            title="Select this title"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">No suggested titles available</p>
              </div>
            )}
          </BriefSection>

          <BriefSection 
            title="Suggested Internal Links" 
            collapsible 
            defaultOpen={true}
            actionButton={
              <button 
                onClick={() => {
                  // Add a new empty link for the user to fill in
                  const newLink: SuggestedLink = { title: 'New link...', url: 'https://', relevance: 0 };
                  suggestedLinks.push(newLink);
                  
                  // Update internal_links if callback is provided
                  if (onInternalLinksChange) {
                    const links = suggestedLinks.map(l => l.url);
                    onInternalLinksChange(links);
                  }
                  
                  console.log('Added new link:', newLink);
                }}
                className="secondary-button text-xs flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Link
              </button>
            }
          >
            {suggestedLinks.length > 0 ? (
              <ul className="space-y-3">
                {suggestedLinks.map((link, index) => (
                  <motion.li
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <div className="suggested-item group w-full" >
                      <div className="flex items-start justify-between p-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            defaultValue={link.title}
                            className="w-full text-base font-medium text-gray-900 bg-transparent border-0 focus:ring-0 focus:border-0 p-0"
                            onBlur={(e) => {
                              link.title = e.target.value;
                              
                              // Update internal_links if callback is provided
                              if (onInternalLinksChange) {
                                const links = suggestedLinks.map(l => l.url);
                                onInternalLinksChange(links);
                              }
                            }}
                          />
                          <input
                            type="text"
                            defaultValue={link.url}
                            className="w-full text-xs text-gray-500 mt-1 bg-transparent border-0 focus:ring-0 focus:border-0 p-0"
                            onBlur={(e) => {
                              link.url = e.target.value;
                              
                              // Update internal_links if callback is provided
                              if (onInternalLinksChange) {
                                const links = suggestedLinks.map(l => l.url);
                                onInternalLinksChange(links);
                              }
                            }}
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleLinkSelect(link)}
                            className="p-1 text-primary-600 hover:text-primary-800 transition-colors"
                            title="Insert this link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              // Remove the link from the list
                              const linkIndex = suggestedLinks.indexOf(link);
                              if (linkIndex > -1) {
                                suggestedLinks.splice(linkIndex, 1);
                                
                                // Update internal_links if callback is provided
                                if (onInternalLinksChange) {
                                  const links = suggestedLinks.map(l => l.url);
                                  onInternalLinksChange(links);
                                }
                              }
                              console.log('Removed link:', link);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Remove this link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">No suggested links available</p>
              </div>
            )}
          </BriefSection>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-lg shadow-sm slide-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following issues:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </LoadingState>
  );
}
