// Utility functions for product parsing

// Extract numbered properties (point_1, point_2, etc)
export function extractNumberedProperties(obj: any, prefix: string): string[] {
  if (!obj || typeof obj !== 'object') return [];
  
  const result: string[] = [];
  const processedProperties = new Set<string>();
  
  // Use a safer, more controlled approach to extract properties
  // First try standard numbered format (point_1, point_2) with a reasonable limit
  for (let i = 1; i <= 20; i++) {
    const key = `${prefix}${i}`;
    if (obj[key] && typeof obj[key] === 'string' && obj[key].trim()) {
      result.push(obj[key].trim());
      processedProperties.add(key);
    }
  }
  
  // If no results, try looking for other numbered formats with a limited set of keys
  if (result.length === 0) {
    // Get all keys but limit to reasonable number to prevent excessive processing
    const keys = Object.keys(obj).slice(0, 50);
    
    for (const key of keys) {
      if (processedProperties.has(key)) continue;
      
      if (
        (key.includes(prefix.replace('_', '')) || key.includes(prefix)) && 
        typeof obj[key] === 'string' && 
        obj[key].trim()
      ) {
        result.push(obj[key].trim());
      }
    }
  }
  
  return result;
}

// Handle both string and array values, plus objects and nested structures
export function getStringOrJoinArray(value: any): string {
  if (!value) return '';
  
  if (typeof value === 'string') {
    return value.trim();
  } else if (Array.isArray(value) && value.length > 0) {
    // Filter out empty/null values and join
    const validValues = value
      .filter(v => v !== null && v !== undefined && v !== '')
      .slice(0, 10); // Limit to prevent excessive processing
    
    if (validValues.length > 0) {
      return validValues.map(v => typeof v === 'string' ? v.trim() : String(v)).join(', ');
    }
  } else if (typeof value === 'object' && value !== null) {
    // Try to extract meaningful text from object
    const objectValues = Object.values(value)
      .filter(v => v !== null && v !== undefined && v !== '')
      .slice(0, 10);
    
    if (objectValues.length > 0) {
      return objectValues
        .map(v => typeof v === 'string' ? v.trim() : String(v))
        .join(', ');
    }
  } else if (typeof value === 'number') {
    return String(value);
  }
  
  return '';
}

// Extract bullet points from markdown text
export function extractBulletPoints(text: string): string[] {
  if (!text) return [];
  
  // Limit input length to prevent excessive processing
  const limitedText = text.length > 10000 ? text.substring(0, 10000) : text;
  
  const bulletPatterns = [
    /\*\s+(.*?)(?=\n\*|\n(?!\*)|\*\*|$)/gs,  // Standard * bullet points
    /•\s+(.*?)(?=\n•|\n(?!•)|$)/gs,          // Bullet character points
    /-\s+(.*?)(?=\n-|\n(?!-)|$)/gs,          // Dash bullet points
    /\d+\.\s+(.*?)(?=\n\d+\.|\n(?!\d)|\n\n|$)/gs  // Numbered points
  ];
  
  let allPoints: string[] = [];
  
  for (const pattern of bulletPatterns) {
    try {
      const matches = Array.from(limitedText.matchAll(pattern));
      if (matches && matches.length > 0) {
        const points = matches
          .map(match => match[1].trim())
          .filter(item => item.length > 0);
        allPoints = [...allPoints, ...points];
        
        // Safety check - limit number of points
        if (allPoints.length > 50) {
          console.warn("Limiting extracted bullet points to 50");
          allPoints = allPoints.slice(0, 50);
          break;
        }
      }
    } catch (error) {
      console.warn("Error processing bullet pattern:", error);
    }
  }
  
  // Fallback: split by newlines if no bullet points found
  if (allPoints.length === 0 && limitedText.trim()) {
    allPoints = limitedText.split('\n')
      .map(line => line.trim())
      .filter(line => line && line.length > 0)
      .slice(0, 50); // Limit to 50 lines for safety
  }
  
  return allPoints;
}