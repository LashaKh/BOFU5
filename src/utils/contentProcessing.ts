import { ContentBriefData } from '../types/contentBrief';

/**
 * Sanitizes JSON content by removing markdown code blocks and extra whitespace
 */
export const sanitizeJsonContent = (content: string): string => {
  if (!content) return '';
  
  // Remove markdown code blocks (```json, ```javascript, ``` etc.)
  let sanitized = content.replace(/```(?:json|javascript|js)?\s*/g, '').replace(/```\s*/g, '');
  
  // Remove leading/trailing whitespace from each line
  sanitized = sanitized
    .split('\n')
    .map(line => line.trim())
    .join('\n');
  
  // Remove excessive blank lines
  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return sanitized.trim();
};

/**
 * Ensures a value is returned as an array, handling various input types
 */
export const ensureArray = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(item => item && item.trim().length > 0);
  if (typeof value === 'string') {
    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && typeof item === 'string' && item.trim().length > 0);
      }
    } catch (e) {
      // Not JSON, treat as newline-separated string
    }
    return value.split('\n').filter(item => item && item.trim().length > 0);
  }
  return [];
};

/**
 * Parses content string into structured ContentBriefData
 */
export const parseContent = (
  content: string, 
  possibleTitles: string[] = [], 
  additionalLinks: string[] = []
): ContentBriefData => {
  console.log('parseContent: Starting parse...', {
    contentLength: content?.length || 0,
    contentPreview: content ? content.substring(0, 200) + '...' : 'No content',
    possibleTitlesCount: possibleTitles?.length || 0,
    additionalLinksCount: additionalLinks?.length || 0
  });

  if (!content) {
    console.log('parseContent: No content provided, returning empty object');
    return {};
  }
  
  try {
    const sanitized = sanitizeJsonContent(content);
    console.log('parseContent: Content sanitized', {
      originalLength: content.length,
      sanitizedLength: sanitized.length,
      sanitizedPreview: sanitized.substring(0, 200) + '...'
    });

    const parsed = JSON.parse(sanitized);
    console.log('parseContent: JSON parsed successfully', {
      parsedType: typeof parsed,
      isArray: Array.isArray(parsed),
      keys: typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed) : 'N/A'
    });
    
    // Instead of looking for a specific "Content Brief" section, 
    // search across ALL sections for the actual data
    const allSections = parsed;
    console.log('parseContent: Available top-level keys:', Object.keys(allSections));
    
    // Ensure all fields are arrays using the ensureArray helper
    const result: ContentBriefData = {};
    
    // Standard fields to look for
    const standardFields = [
      'pain_points',
      'usps', 
      'capabilities',
      'competitors',
      'target_audience',
      'keywords',
      'notes',
      'content_objectives',
      'ctas'
    ];
    
    // Search through all sections for data
    console.log('parseContent: Searching all sections for content data...');
    Object.keys(allSections).forEach(sectionKey => {
      const section = allSections[sectionKey];
      console.log(`parseContent: Examining section "${sectionKey}":`, {
        type: typeof section,
        isArray: Array.isArray(section),
        keys: typeof section === 'object' && !Array.isArray(section) ? Object.keys(section) : 'N/A'
      });
      
      // Check if this section contains any of our target fields
      if (typeof section === 'object' && section && !Array.isArray(section)) {
        // First check for direct field matches in the object
        standardFields.forEach(field => {
          if (section[field]) {
            if (!result[field]) result[field] = [];
            const newItems = ensureArray(section[field]);
            result[field] = [...result[field], ...newItems];
            console.log(`parseContent: Found '${field}' in section "${sectionKey}":`, newItems.length, 'items');
          }
        });
        
        // Then examine the object's contents for extractable data
        const objectKeys = Object.keys(section);
        console.log(`parseContent: Object section "${sectionKey}" contents:`, objectKeys);
        
        // Extract data from object values that might be arrays or strings
        objectKeys.forEach(objectKey => {
          const objectValue = section[objectKey];
          if (objectValue) {
            const items = ensureArray(objectValue);
            if (items.length > 0) {
              console.log(`parseContent: Found data in "${sectionKey}" -> "${objectKey}":`, items.length, 'items');
              
              // Map specific object keys to fields based on section context
              if (sectionKey.toLowerCase().includes('target audience') || sectionKey.toLowerCase().includes('audience')) {
                if (!result.target_audience) result.target_audience = [];
                result.target_audience = [...result.target_audience, ...items];
                console.log(`parseContent: Mapped "${sectionKey}" -> "${objectKey}" to target_audience`);
              } else if (sectionKey.toLowerCase().includes('call-to-action') || sectionKey.toLowerCase().includes('cta')) {
                if (!result.ctas) result.ctas = [];
                result.ctas = [...result.ctas, ...items];
                console.log(`parseContent: Mapped "${sectionKey}" -> "${objectKey}" to ctas`);
              } else if (sectionKey.toLowerCase().includes('seo') || sectionKey.toLowerCase().includes('keyword')) {
                if (!result.keywords) result.keywords = [];
                result.keywords = [...result.keywords, ...items];
                console.log(`parseContent: Mapped "${sectionKey}" -> "${objectKey}" to keywords`);
              } else if (sectionKey.toLowerCase().includes('note')) {
                if (!result.notes) result.notes = [];
                result.notes = [...result.notes, ...items];
                console.log(`parseContent: Mapped "${sectionKey}" -> "${objectKey}" to notes`);
              } else if (sectionKey.toLowerCase().includes('overview') || 
                         sectionKey.toLowerCase().includes('content brief') ||
                         objectKey.toLowerCase().includes('project goal') ||
                         objectKey.toLowerCase().includes('content format') ||
                         objectKey.toLowerCase().includes('date') ||
                         objectKey.toLowerCase().includes('prepared') ||
                         objectKey.toLowerCase().includes('version')) {
                // Map overview and metadata content to notes
                if (!result.notes) result.notes = [];
                const noteItem = `${objectKey}: ${items.join(', ')}`;
                result.notes = [...result.notes, noteItem];
                console.log(`parseContent: Mapped overview/metadata "${sectionKey}" -> "${objectKey}" to notes`);
              } else {
                // Log unmapped content that might be notes
                console.log(`parseContent: UNMAPPED CONTENT in "${sectionKey}" -> "${objectKey}":`, items.slice(0, 2), '(showing first 2 items)');
              }
            }
          }
        });
      } else if (Array.isArray(section)) {
        // Check if this array itself matches a content field
        const fieldName = standardFields.find(field => 
          sectionKey.toLowerCase() === field ||  // Exact match with underscores
          sectionKey.toLowerCase().includes(field.replace('_', ' ')) ||
          sectionKey.toLowerCase().includes(field.replace('_', ''))
        );
        if (fieldName) {
          const newItems = ensureArray(section);
          // Only overwrite if we don't have data yet, or if new data has more items
          if (!result[fieldName] || result[fieldName].length === 0 || newItems.length > result[fieldName].length) {
            result[fieldName] = newItems;
            console.log(`parseContent: Mapped array section "${sectionKey}" to field '${fieldName}':`, newItems.length, 'items');
          } else {
            console.log(`parseContent: Skipped mapping empty/smaller array section "${sectionKey}" to field '${fieldName}' (existing has ${result[fieldName].length} items)`);
          }
        } else {
          console.log(`parseContent: NO FIELD MATCH found for array section "${sectionKey}". Checked against:`, standardFields);
        }
      }
    });
    
    // Special handling for variations in field names
    const fieldMappings = {
      'content_objectives': ['content objectives', 'objectives', 'goals'],
      'pain_points': ['pain points', 'painpoints', 'problems', 'challenges', 'key pain points'],
      'usps': ['unique selling propositions', 'usp', 'selling points', 'value propositions', 'benefits', 'unique selling'],
      'capabilities': ['capabilities', 'features', 'functionality'],
      'competitors': ['competitors', 'competition', 'competitive analysis'],
      'target_audience': ['target audience', 'audience', 'demographics'],
      'keywords': ['keywords', 'seo keywords', 'search terms'],
      'ctas': ['call to actions', 'cta', 'calls to action', 'call-to-actions'],
      'notes': ['notes', 'additional notes', 'comments']
    };
    
    // Search for variations in section names
    Object.keys(allSections).forEach(sectionKey => {
      const section = allSections[sectionKey];
      const lowerSectionKey = sectionKey.toLowerCase();
      
      Object.entries(fieldMappings).forEach(([field, variations]) => {
        if (!result[field] || result[field].length === 0) {
          // Check for exact field name match first
          if (lowerSectionKey === field) {
            const items = ensureArray(section);
            if (items.length > 0) {
              result[field] = items;
              console.log(`parseContent: Mapped section "${sectionKey}" to field '${field}' via exact match:`, items.length, 'items');
              return; // Found exact match, no need to check variations
            }
          }
          
          // Then check variations
          variations.forEach(variation => {
            if (lowerSectionKey.includes(variation)) {
              const items = ensureArray(section);
              if (items.length > 0) {
                result[field] = items;
                console.log(`parseContent: Mapped section "${sectionKey}" to field '${field}' via variation "${variation}":`, items.length, 'items');
              }
            }
          });
        }
      });
    });
    
    // Handle special fields with additional data
    result.possible_article_titles = [
      ...ensureArray(parsed.possible_article_titles),
      ...possibleTitles
    ].filter((title, index, arr) => arr.indexOf(title) === index); // Remove duplicates
    
    result.internal_links = [
      ...ensureArray(parsed.internal_links),
      ...additionalLinks
    ].filter((link, index, arr) => arr.indexOf(link) === index); // Remove duplicates
    
    console.log('parseContent: Final result:', {
      resultKeys: Object.keys(result),
      painPointsCount: result.pain_points?.length || 0,
      uspsCount: result.usps?.length || 0,
      capabilitiesCount: result.capabilities?.length || 0,
      competitorsCount: result.competitors?.length || 0,
      keywordsCount: result.keywords?.length || 0,
      notesCount: result.notes?.length || 0,
      targetAudienceCount: result.target_audience?.length || 0,
      ctasCount: result.ctas?.length || 0,
      contentObjectivesCount: result.content_objectives?.length || 0,
      totalFields: Object.keys(result).length
    });
    
    // Log the actual content of potentially missing fields
    if (result.keywords?.length) {
      console.log('parseContent: Keywords found:', result.keywords);
    }
    if (result.notes?.length) {
      console.log('parseContent: Notes found:', result.notes);
    }
    if (result.target_audience?.length) {
      console.log('parseContent: Target audience found:', result.target_audience);
    }
    if (result.ctas?.length) {
      console.log('parseContent: CTAs found:', result.ctas);
    }
    
    return result;
  } catch (error) {
    console.error('parseContent: Failed to parse content as JSON:', error);
    console.log('parseContent: Content that failed to parse:', content.substring(0, 500));
    return {};
  }
};

/**
 * Converts ContentBriefData back to JSON string
 */
export const stringifyContent = (data: ContentBriefData): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Failed to stringify content data:', error);
    return '{}';
  }
};

/**
 * Merges multiple ContentBriefData objects, combining arrays and removing duplicates
 */
export const mergeContentData = (...dataSources: ContentBriefData[]): ContentBriefData => {
  const result: ContentBriefData = {};
  
  dataSources.forEach(data => {
    if (!data) return;
    
    Object.keys(data).forEach(key => {
      if (data[key]) {
        const existingArray = ensureArray(result[key]);
        const newArray = ensureArray(data[key]);
        result[key] = [...existingArray, ...newArray]
          .filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates
      }
    });
  });
  
  return result;
}; 