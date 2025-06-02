import { useCallback, useState } from 'react';
import debounce from 'lodash/debounce';
import { toast } from 'react-hot-toast';
import { updateBrief } from '../lib/contentBriefs';
import { ContentBrief } from '../types/contentBrief';
import { ensureLinksAsText } from '../utils/contentFormatUtils';

/**
 * Auto-save hook for content brief updates
 * Handles debounced saving with format conversion and error handling
 */
export const useBriefAutoSave = (id: string | undefined, brief: ContentBrief | null) => {
  const [saving, setSaving] = useState(false);

  // Direct save function without debounce - more reliable for array values
  const saveToSupabase = useCallback(async (updates: {
    brief_content?: string;
    brief_content_text?: string;
    product_name?: string;
    status?: ContentBrief['status'];
    internal_links?: string[] | string; // Accept either string[] or string (for text format)
    possible_article_titles?: string[] | string; // Accept either string[] or string (for text format)
    suggested_content_frameworks?: string;
    title?: string;
    // Include all other potential fields to prevent data loss
    [key: string]: any;
  }) => {
    if (!id || !brief) return;
    
    // Log the updates we're saving to help with debugging
    console.log('SAVING TO SUPABASE - RECEIVED UPDATES:', updates);
    
    try {
      setSaving(true);
      console.log('Saving to Supabase:', updates);
      
      // CRITICAL FIX: Preserve ALL existing brief data and only override specific fields
      // This prevents data loss when doing partial updates
      const completeUpdates = {
        // Start with ALL existing brief data
        ...brief,
        // Then apply only the specific updates
        ...updates,
        // Special handling for array/string fields that need format conversion
        internal_links: updates.internal_links !== undefined 
          ? ensureLinksAsText(updates.internal_links) 
          : brief.internal_links !== undefined 
            ? ensureLinksAsText(brief.internal_links) 
            : '',
        possible_article_titles: updates.possible_article_titles !== undefined 
          ? ensureLinksAsText(updates.possible_article_titles) 
          : brief.possible_article_titles !== undefined 
            ? ensureLinksAsText(brief.possible_article_titles) 
            : '',
        // Ensure critical fields have defaults if missing
        product_name: updates.product_name !== undefined ? updates.product_name : (brief.product_name || ''),
        status: updates.status !== undefined ? updates.status : (brief.status || 'pending'),
      };
      
      // CRITICAL: Filter out client-side only fields that don't exist in Supabase
      const validDatabaseFields = [
        'id', 'user_id', 'brief_content', 'brief_content_text', 'product_name',
        'internal_links', 'possible_article_titles', 'created_at', 'updated_at',
        'suggested_content_frameworks', 'status', 'research_result_id',
        // Parsed content fields (if they exist in DB)
        'pain_points', 'usps', 'capabilities', 'competitors', 'target_audience',
        'keywords', 'notes', 'content_objectives', 'ctas'
      ];
      
      // Create filtered update object with only valid database fields
      const filteredUpdates: Record<string, any> = {};
      validDatabaseFields.forEach(field => {
        if ((completeUpdates as any)[field] !== undefined) {
          filteredUpdates[field] = (completeUpdates as any)[field];
        }
      });
      
      // Remove undefined values to avoid overwriting with null
      Object.keys(filteredUpdates).forEach(key => {
        if ((filteredUpdates as any)[key] === undefined) {
          delete (filteredUpdates as any)[key];
        }
      });
      
      console.log('Complete update to Supabase (with ALL data preserved and filtered):', filteredUpdates);
      
      const result = await updateBrief(id, filteredUpdates);
      console.log('Update result:', result);
      
      return completeUpdates; // Return the updates for state synchronization
      
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
      throw error; // Re-throw for handling in component
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
      title?: string;
      [key: string]: any;
    }) => {
      return saveToSupabase(updates);
    }, 1000),
    [saveToSupabase]
  );

  return {
    saving,
    saveToSupabase,
    handleAutoSave
  };
};

/**
 * Type definitions for auto-save hook
 */
export type AutoSaveUpdates = {
  brief_content?: string;
  brief_content_text?: string;
  product_name?: string;
  status?: ContentBrief['status'];
  internal_links?: string[] | string;
  possible_article_titles?: string[] | string;
  suggested_content_frameworks?: string;
  title?: string;
  [key: string]: any; // Allow additional fields
}; 