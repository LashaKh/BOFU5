/**
 * Content Processing Utilities
 * Handles content cleaning, validation, and format detection
 */

/**
 * Cleans content with code block markers
 * Removes markdown code block wrappers and extracts inner content
 */
export const cleanBriefContent = (content: string): string => {
  if (!content) return '';
  
  // Check if content has markdown code block markers
  const codeBlockRegex = /^\s*```(?:json|javascript|js)?([\s\S]*?)```\s*$/;
  const match = content.match(codeBlockRegex);
  
  if (match && match[1]) {
    console.log('ContentProcessor: Detected content in code blocks, cleaning');
    return match[1].trim();
  }
  
  return content;
};

/**
 * Detects if content is in JSON format
 * Attempts to parse content as JSON and returns boolean result
 */
export const isJsonContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
};

/**
 * Determines if content should use JSON editor
 * Checks content format and type to decide editor mode
 */
export const shouldUseJsonEditor = (content: string | object | undefined): boolean => {
  if (!content) return false;
  
  if (typeof content === 'object') {
    return true; // Already an object, use JSON editor
  }
  
  if (typeof content === 'string') {
    return isJsonContent(content);
  }
  
  return false;
};

/**
 * Sanitizes and validates content for editor
 * Ensures content is in proper format for the selected editor
 */
export const prepareContentForEditor = (content: string | object | undefined): string => {
  if (!content) return '';
  
  if (typeof content === 'object') {
    return JSON.stringify(content, null, 2);
  }
  
  if (typeof content === 'string') {
    return cleanBriefContent(content);
  }
  
  return '';
};

/**
 * Type definitions for content processing
 */
export type ContentFormat = 'json' | 'html' | 'text';
export type ContentInput = string | object | undefined; 