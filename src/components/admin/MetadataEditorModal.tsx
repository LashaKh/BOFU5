import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  X, 
  Save, 
  Calendar, 
  Tag, 
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  Globe,
  Target
} from 'lucide-react';
import type { ArticleListItem } from '../../types/adminApi';
import { toast } from 'react-hot-toast';

interface ArticleMetadata {
  title: string;
  product_name: string;
  editing_status: 'draft' | 'editing' | 'review' | 'final' | 'published';
  tags: string[];
  category: string;
  priority: 'low' | 'medium' | 'high';
  target_audience: string;
  word_count_target: number;
  seo_keywords: string[];
  meta_description: string;
  published_date?: string;
  updated_date: string;
  admin_notes: string;
  internal_reference: string;
}

interface MetadataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ArticleListItem;
  onSaveMetadata: (metadata: ArticleMetadata) => Promise<void>;
}

export function MetadataEditorModal({
  isOpen,
  onClose,
  article,
  onSaveMetadata
}: MetadataEditorModalProps) {
  const [metadata, setMetadata] = useState<ArticleMetadata>({
    title: '',
    product_name: '',
    editing_status: 'draft',
    tags: [],
    category: '',
    priority: 'medium',
    target_audience: '',
    word_count_target: 1000,
    seo_keywords: [],
    meta_description: '',
    published_date: undefined,
    updated_date: new Date().toISOString(),
    admin_notes: '',
    internal_reference: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  // Initialize metadata from article
  useEffect(() => {
    if (isOpen && article) {
      setMetadata({
        title: article.title || '',
        product_name: article.product_name || '',
        editing_status: article.editing_status as any || 'draft',
        tags: [], // Would come from API
        category: '', // Would come from API
        priority: 'medium', // Would come from API
        target_audience: '', // Would come from API
        word_count_target: 1000, // Would come from API
        seo_keywords: [], // Would come from API
        meta_description: '', // Would come from API
        published_date: undefined, // Would come from API
        updated_date: article.last_edited_at,
        admin_notes: '', // Would come from API
        internal_reference: '' // Would come from API
      });
      setHasChanges(false);
    }
  }, [isOpen, article]);

  const handleMetadataChange = (field: keyof ArticleMetadata, value: any) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      handleMetadataChange('tags', [...metadata.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleMetadataChange('tags', metadata.tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !metadata.seo_keywords.includes(keywordInput.trim())) {
      handleMetadataChange('seo_keywords', [...metadata.seo_keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    handleMetadataChange('seo_keywords', metadata.seo_keywords.filter(keyword => keyword !== keywordToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveMetadata(metadata);
      toast.success('Metadata updated successfully');
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Failed to update metadata');
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-400' },
    { value: 'editing', label: 'Editing', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'review', label: 'Review', color: 'bg-blue-500/20 text-blue-400' },
    { value: 'final', label: 'Final', color: 'bg-green-500/20 text-green-400' },
    { value: 'published', label: 'Published', color: 'bg-purple-500/20 text-purple-400' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'high', label: 'High', color: 'text-red-400' }
  ];

  const contentTypes = [
    'Blog Post',
    'Case Study',
    'White Paper',
    'eBook',
    'Tutorial',
    'How-to Guide',
    'Comparison Guide',
    'FAQ',
    'Feature Announcement',
    'Integration Guide',
    'Best Practices',
    'Troubleshooting Guide',
    'API Documentation',
    'Getting Started Guide',
    'Security Guide',
    'Performance Guide',
    'Industry Report',
    'News Article',
    'Press Release',
    'Email Template',
    'Landing Page Copy',
    'Social Media Post',
    'Video Script',
    'Webinar Description',
    'Podcast Description',
    'Newsletter',
    'Survey',
    'Research Report',
    'Data Sheet',
    'Technical Specification',
    'User Manual',
    'Release Notes',
    'Changelog',
    'ROI Calculator',
    'Checklist',
    'Template',
    'Worksheet',
    'Infographic Script',
    'Quote Template',
    'Proposal Template',
    'Contract Template',
    'SLA Template',
    'Privacy Policy',
    'Terms of Service',
    'GDPR Compliance Guide',
    'Accessibility Statement',
    'Community Guidelines'
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-900 rounded-lg border-2 border-yellow-400/30 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-secondary-700">
            <div className="flex items-center space-x-2">
              <Edit3 className="text-orange-400" size={20} />
              <h2 className="text-xl font-semibold text-orange-400">Enhanced Metadata Editor</h2>
              {hasChanges && (
                <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded-full">
                  Unsaved Changes
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary-700 transition-colors"
            >
              <X className="text-gray-400" size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="bg-secondary-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-400 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Article Title
                  </label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => handleMetadataChange('title', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Enter article title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={metadata.product_name}
                    onChange={(e) => handleMetadataChange('product_name', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Enter product name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={metadata.editing_status}
                    onChange={(e) => handleMetadataChange('editing_status', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={metadata.priority}
                    onChange={(e) => handleMetadataChange('priority', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Content Classification */}
            <div className="bg-secondary-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-400 mb-4">Content Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={metadata.category}
                    onChange={(e) => handleMetadataChange('category', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
                  >
                    <option value="">Select category...</option>
                    {contentTypes.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={metadata.target_audience}
                    onChange={(e) => handleMetadataChange('target_audience', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="e.g., Business professionals, Developers..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Word Count Target
                  </label>
                  <input
                    type="number"
                    value={metadata.word_count_target}
                    onChange={(e) => handleMetadataChange('word_count_target', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Internal Reference
                  </label>
                  <input
                    type="text"
                    value={metadata.internal_reference}
                    onChange={(e) => handleMetadataChange('internal_reference', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Internal tracking reference..."
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-secondary-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-400 mb-4">Tags</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Add a tag..."
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-blue-200 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* SEO Information */}
            <div className="bg-secondary-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-400 mb-4">SEO Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={metadata.meta_description}
                    onChange={(e) => handleMetadataChange('meta_description', e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400 resize-none"
                    rows={3}
                    maxLength={160}
                    placeholder="Brief description for search engines (max 160 characters)..."
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    {metadata.meta_description.length}/160 characters
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SEO Keywords
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                        className="flex-1 px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Add an SEO keyword..."
                      />
                      <button
                        onClick={handleAddKeyword}
                        className="px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.seo_keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-full"
                        >
                          {keyword}
                          <button
                            onClick={() => handleRemoveKeyword(keyword)}
                            className="ml-2 text-green-200 hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-secondary-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-400 mb-4">Admin Notes</h3>
              <textarea
                value={metadata.admin_notes}
                onChange={(e) => handleMetadataChange('admin_notes', e.target.value)}
                className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400 resize-none"
                rows={4}
                placeholder="Internal admin notes and comments..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-700">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-secondary-700 text-gray-300 rounded-lg hover:bg-secondary-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex items-center space-x-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Metadata</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 