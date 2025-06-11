import { ProductAnalysis, defaultProduct } from '../types';
import { extractNumberedProperties, getStringOrJoinArray } from '../utils';

export function parseJsonFormat(data: any): ProductAnalysis | null {
  if (!data) return null;
  
  try {
    const product = { ...defaultProduct };
    
    // Parse company name
    // Clean up company name by removing Inc., Corp., etc. and extra whitespace
    const rawCompanyName = data.company?.name || data.companyName || '';
    product.companyName = rawCompanyName
      .replace(/,?\s*(Inc\.|Corporation|Corp\.|LLC|Ltd\.)$/i, '')
      .trim() || 'Unknown Company';
    
    // Parse product details
    if (data.product) {
      product.productDetails = {
        name: (data.product.name || '').trim(),
        description: (data.product.description || '').trim()
      };
    } else if (data.productDetails) {
      product.productDetails = {
        name: (data.productDetails.name || '').trim(),
        description: (data.productDetails.description || '').trim()
      };
    } else if (data.name && typeof data.name === 'string') {
      product.productDetails = {
        name: data.name.trim(),
        description: (data.description || '').trim()
      };
    }
    
    // Ensure product name is set before generating identifier
    if (!product.productDetails.name) {
      product.productDetails.name = product.companyName 
        ? `${product.companyName} Product`
        : 'Unnamed Product';
    }
    
    // Clean up product name - remove any [NOTE: ...] or [Based on ...] annotations
    product.productDetails.name = product.productDetails.name
      .replace(/\s*\[.*?\]\s*/g, '')
      .trim();
    
    // Clean up product description - remove any [NOTE: ...] or [Based on ...] annotations
    product.productDetails.description = product.productDetails.description
      .replace(/\s*\[.*?\]\s*/g, '')
      .trim();
    
    // Parse USPs - with safety checks
    if (data.unique_selling_proposition) {
      const usp = data.unique_selling_proposition;
      if (Array.isArray(usp)) {
        product.usps = usp
          .slice(0, 20)
          .filter((item: any) => typeof item === 'string' && item.trim())
          .map((item: string) => item.trim());
      } else if (typeof usp === 'object') {
        // Extract from numbered properties (point_1, point_2, etc.)
        const points = extractNumberedProperties(usp, 'point_')
          .filter((point: string) => 
            point !== '[Not Available in Provided Text]' && 
            point !== '[Not Available]' &&
            !point.includes('[Not Available') &&
            point.trim().length > 0
          )
          .map((point: string) => point.trim());
        product.usps = points.length > 0 ? points : [];
      }
    }
    
    // Generate a unique identifier for the product to help detect duplicates
    const productIdentifier = JSON.stringify({
      name: product.productDetails.name,
      company: product.companyName,
      // Add first USP and feature as part of identifier to ensure uniqueness
      firstUsp: data.unique_selling_proposition?.point_1 || 
                (Array.isArray(data.unique_selling_proposition) ? 
                  data.unique_selling_proposition[0] : ''),
      firstFeature: Array.isArray(data.features) ? 
                    data.features[0] : 
                    data.features?.feature_1 || ''
    });
    
    // Add the identifier as a non-enumerable property
    Object.defineProperty(product, '_identifier', {
      value: productIdentifier,
      enumerable: false,
      writable: false
    });
    
    // Parse business overview
    if (data.business_overview && typeof data.business_overview === 'object') {
      const overview = data.business_overview;
      product.businessOverview = {
        mission: typeof overview.mission === 'string' ? overview.mission : '',
        industry: typeof overview.industry === 'string' ? overview.industry : '',
        keyOperations: typeof overview.key_operations === 'string' ? overview.key_operations : ''
      };
    }
    
    // Parse pain points with safety checks
    if (Array.isArray(data.pain_points_solved)) {
      product.painPoints = data.pain_points_solved
        .slice(0, 20) // Limit array size for safety
        .filter((item: any) => typeof item === 'string' && item.trim());
    }
    
    // Parse features with safety checks
    if (data.features) {
      if (Array.isArray(data.features)) {
        product.features = data.features
          .slice(0, 30) // Limit array size for safety
          .filter((item: any) => typeof item === 'string' && item.trim());
      } else if (typeof data.features === 'object') {
        product.features = extractNumberedProperties(data.features, 'feature_');
      } else if (typeof data.features === 'string') {
        product.features = [data.features];
      }
    }
    
    // Parse target persona with safety checks and multiple field name variations
    if (data.target_persona && typeof data.target_persona === 'object') {
      const persona = data.target_persona;
      
      // Helper function to get value from multiple possible field names and convert to array format
      const getFieldValue = (obj: any, fieldNames: string[]): string[] => {
        for (const fieldName of fieldNames) {
          const value = obj[fieldName];
          if (value !== null && value !== undefined) {
            if (typeof value === 'string' && value.trim()) {
              // Convert comma-separated strings to arrays
              const trimmedValue = value.trim();
              if (trimmedValue.includes(',')) {
                return trimmedValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
              } else {
                return [trimmedValue];
              }
            } else if (Array.isArray(value) && value.length > 0) {
              return value.slice(0, 10).map(item => String(item).trim()).filter(item => item.length > 0);
            } else if (typeof value === 'object' && value !== null) {
              // Try to extract from object properties
              const objValues = Object.values(value)
                .filter(v => typeof v === 'string' && v.trim())
                .slice(0, 10)
                .map(v => String(v).trim());
              if (objValues.length > 0) {
                return objValues;
              }
            }
          }
        }
        return [];
      };
      
      product.targetPersona = {
        primaryAudience: getFieldValue(persona, [
          'primary_audience', 
          'primaryAudience', 
          'target_audience', 
          'audience'
        ]).join(', '), // Keep primaryAudience as string since UI expects it
        demographics: getFieldValue(persona, [
          'demographics', 
          'demographic', 
          'demographic_profile',
          'target_demographics'
        ]),
        industrySegments: getFieldValue(persona, [
          'industry_segments', 
          'industrySegments', 
          'industry_segment',
          'target_industries',
          'industries'
        ]),
        psychographics: getFieldValue(persona, [
          'psychographics', 
          'psychographic', 
          'psychographic_profile',
          'behavioral_traits',
          'personality_traits'
        ])
      };
      
      // Debug logging to help identify what data is coming from webhook
      console.log('Target persona parsing debug:', {
        originalPersonaData: persona,
        parsedPersona: product.targetPersona
      });
    } else {
      // Fallback: try to extract from top-level data object
      const getTopLevelValue = (fieldNames: string[]): string[] => {
        for (const fieldName of fieldNames) {
          const value = data[fieldName];
          if (value !== null && value !== undefined) {
            if (typeof value === 'string' && value.trim()) {
              // Convert comma-separated strings to arrays
              const trimmedValue = value.trim();
              if (trimmedValue.includes(',')) {
                return trimmedValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
              } else {
                return [trimmedValue];
              }
            } else if (Array.isArray(value) && value.length > 0) {
              return value.slice(0, 10).map(item => String(item).trim()).filter(item => item.length > 0);
            }
          }
        }
        return [];
      };
      
      product.targetPersona = {
        primaryAudience: getTopLevelValue([
          'primary_audience', 
          'target_audience', 
          'audience'
        ]).join(', '), // Keep primaryAudience as string since UI expects it
        demographics: getTopLevelValue([
          'demographics', 
          'demographic', 
          'target_demographics'
        ]),
        industrySegments: getTopLevelValue([
          'industry_segments', 
          'industrySegments', 
          'target_industries',
          'industries'
        ]),
        psychographics: getTopLevelValue([
          'psychographics', 
          'psychographic', 
          'behavioral_traits'
        ])
      };
      
      console.log('Top-level target persona parsing debug:', {
        availableFields: Object.keys(data),
        parsedPersona: product.targetPersona
      });
    }
    
    // Parse pricing
    product.pricing = typeof data.pricing === 'string' ? data.pricing : '';
    
    // Parse current solutions with safety checks
    if (data.current_solutions && typeof data.current_solutions === 'object') {
      const solutions = data.current_solutions;
      product.currentSolutions = {
        directCompetitors: typeof solutions.direct_competitors === 'string'
          ? [solutions.direct_competitors]
          : Array.isArray(solutions.direct_competitors)
            ? solutions.direct_competitors.slice(0, 15) // Limit array size
              .filter((item: any) => typeof item === 'string' && item.trim())
            : [],
        existingMethods: Array.isArray(solutions.existing_methods)
          ? solutions.existing_methods.slice(0, 15) // Limit array size
            .filter((item: any) => typeof item === 'string' && item.trim())
          : []
      };
    }
    
    // Parse capabilities with safety checks
    if (data.features_and_capabilities && Array.isArray(data.features_and_capabilities)) {
      // Handle new combined features_and_capabilities format
      product.capabilities = data.features_and_capabilities
        .slice(0, 20) // Limit array size for safety
        .filter((item: any) => 
          item && 
          typeof item === 'object' && 
          (item.feature || item.capability)
        )
        .map((item: any, index: number) => ({
          title: typeof item.feature === 'string' ? item.feature.trim() : `Feature #${index + 1}`,
          description: typeof item.capability === 'string' ? item.capability.trim() : '',
          content: typeof item.capability === 'string' ? item.capability.trim() : '',
          images: []
        }));
    } else if (data.capabilities) {
      if (Array.isArray(data.capabilities)) {
        product.capabilities = (data.capabilities as any[]) // Type assertion for item in filter/map
          .slice(0, 20) // Limit array size for safety
          .filter((item: any, index: number, self: any[]) => 
            typeof item === 'string' && 
            item.trim() && 
            self.findIndex((el: any) => el === item) === index // ensure unique by value after trim
          )
          .map((item: string, index: number) => ({
            title: `Capability #${index + 1}`,
            description: item.split('.')[0]?.trim() || item, // Use first sentence as description
            content: item,
            images: []
          }));
      } else if (typeof data.capabilities === 'object') {
        const capabilities = extractNumberedProperties(data.capabilities, 'capability_');
        product.capabilities = capabilities.map((cap: string, index: number) => ({
          title: `Capability #${index + 1}`,
          description: cap.split('.')[0]?.trim() || cap,
          content: cap,
          images: []
        }));
      } else if (typeof data.capabilities === 'string') {
        product.capabilities = [{
          title: 'Capability #1',
          description: data.capabilities.split('.')[0]?.trim() || data.capabilities,
          content: data.capabilities,
          images: []
        }];
      }
    }
    
    // Ensure product name is set
    if (!product.productDetails.name) {
      product.productDetails.name = product.companyName 
        ? `${product.companyName} Product`
        : 'Unnamed Product';
    }

    // Final explicit safety checks for array properties
    if (!Array.isArray(product.usps)) product.usps = [];
    if (!Array.isArray(product.features)) product.features = [];
    if (!Array.isArray(product.painPoints)) product.painPoints = [];
    if (!Array.isArray(product.capabilities)) {
      product.capabilities = [];
    } else {
      product.capabilities.forEach(cap => {
        if (cap && !Array.isArray(cap.images)) {
          cap.images = [];
        }
      });
    }

    if (product.currentSolutions) {
        if (!Array.isArray(product.currentSolutions.directCompetitors)) product.currentSolutions.directCompetitors = [];
        if (!Array.isArray(product.currentSolutions.existingMethods)) product.currentSolutions.existingMethods = [];
    } else {
        // If currentSolutions itself is null/undefined, reinitialize from defaultProduct structure
        product.currentSolutions = { directCompetitors: [], existingMethods: [] };
    }

    if (product.competitors) {
        if (!Array.isArray(product.competitors.direct_competitors)) product.competitors.direct_competitors = [];
        if (!Array.isArray(product.competitors.niche_competitors)) product.competitors.niche_competitors = [];
        if (!Array.isArray(product.competitors.broader_competitors)) product.competitors.broader_competitors = [];
    } else {
        // If competitors itself is null/undefined, reinitialize from defaultProduct structure
        product.competitors = { direct_competitors: [], niche_competitors: [], broader_competitors: [] };
    }
    
    return product;
  } catch (error) {
    console.error('Error parsing JSON format:', error);
    return null;
  }
}