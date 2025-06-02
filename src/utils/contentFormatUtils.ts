/**
 * Content Format Utilities
 * Handles conversion between string and array formats for content brief data
 */

/**
 * Ensures links are in string format (text) for storage
 * Converts arrays to newline-separated strings, preserves existing strings
 */
export const ensureLinksAsText = (links: string[] | string | undefined): string => {
  if (!links) return '';
  if (typeof links === 'string') return links;
  return links.join('\n');
};

/**
 * Ensures links are in array format for UI components
 * Handles JSON parsing, newline splitting, and array preservation
 */
export const ensureLinksAsArray = (links: string[] | string | undefined): string[] => {
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

/**
 * Ensures titles are in string format (text) for storage
 * Alias for ensureLinksAsText for semantic clarity
 */
export const ensureTitlesAsText = ensureLinksAsText;

/**
 * Ensures titles are in array format for UI components
 * Alias for ensureLinksAsArray for semantic clarity
 */
export const ensureTitlesAsArray = ensureLinksAsArray;

/**
 * Type definitions for content format utilities
 */
export type StringOrArray = string[] | string | undefined;
export type FormatConverter<T> = (input: StringOrArray) => T; 