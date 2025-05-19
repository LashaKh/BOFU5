import { ProductAnalysis, defaultProduct } from './types';
import { parseJsonFormat } from './parsers/jsonParser';
import { parseWebhookResponse } from './parsers/webhookParser';

// Create a default product with sample data
function createDefaultProduct(name: string): ProductAnalysis {
  return {
    ...defaultProduct,
    companyName: "Sample Company",
    productDetails: {
      name: name || "Sample Product",
      description: "This is a sample product description. The webhook response couldn't be properly parsed."
    },
    usps: ["Sample USP 1", "Sample USP 2"],
    features: ["Sample Feature 1", "Sample Feature 2", "Sample Feature 3"],
    painPoints: ["Sample Pain Point 1", "Sample Pain Point 2"],
    targetPersona: {
      primaryAudience: "Sample Primary Audience",
      demographics: "Sample Demographics",
      industrySegments: "Sample Industry Segments",
      psychographics: "Sample Psychographics"
    },
    capabilities: [
      {
        title: "Sample Capability 1",
        description: "Description of sample capability 1",
        content: "Detailed content about sample capability 1",
        images: []
      },
      {
        title: "Sample Capability 2",
        description: "Description of sample capability 2",
        content: "Detailed content about sample capability 2",
        images: []
      }
    ]
  };
}

// Main parser function - handles any input format
export function parseProductData(input: any): ProductAnalysis[] {
  try {
    console.log("Parsing product data, input type:", typeof input);
    console.log("Input value:", input);
    
    // Handle null/undefined input
    if (!input) {
      console.warn("Received null/undefined input");
      return [];
    }
    
    // First try parsing as a webhook response
    if (typeof input === 'object' && (input.result || input.status === 'completed')) {
      console.log("Attempting to parse as webhook response");
      const products = parseWebhookResponse(input);
      if (products.length > 0) {
        console.log("Successfully parsed webhook response:", products);
        return products;
      }
      console.log("No products found in webhook response");
    }

    // Check if input contains competitors or competitorAnalysisUrl
    if (typeof input === 'object' && (input.competitors || input.competitorAnalysisUrl)) {
      console.log("Input contains competitors or competitorAnalysisUrl, processing directly");
      // Create a product with the input data
      const product = createDefaultProduct(input.productName || "Competitor Analysis");
      
      // Add competitors data if present
      if (input.competitors) {
        product.competitors = input.competitors;
      }
      
      // Add competitor analysis URL if present
      if (input.competitorAnalysisUrl) {
        product.competitorAnalysisUrl = input.competitorAnalysisUrl;
      } else if (input.url && typeof input.url === 'string' && input.url.includes('docs.google.com')) {
        product.competitorAnalysisUrl = input.url;
      } else if (input.analysisUrl && typeof input.analysisUrl === 'string' && input.analysisUrl.includes('docs.google.com')) {
        product.competitorAnalysisUrl = input.analysisUrl;
      } else if (input.documentUrl && typeof input.documentUrl === 'string' && input.documentUrl.includes('docs.google.com')) {
        product.competitorAnalysisUrl = input.documentUrl;
      }

      // If we have a valid URL or competitors data, return the product
      if (product.competitorAnalysisUrl || (product.competitors && 
         (product.competitors.direct_competitors?.length > 0 || 
          product.competitors.niche_competitors?.length > 0 || 
          product.competitors.broader_competitors?.length > 0))) {
        console.log("Created product from competitors data:", product);
        return [product];
      }
    }
    
    // If not a webhook response or no products found, try parsing as regular JSON
    if (typeof input === 'object') {
      console.log("Attempting to parse as regular JSON object");
      // Create a safe copy to avoid circular references
      let safeCopy;
      try {
        if (Array.isArray(input)) {
          console.log("Input is an array, processing first 5 items");
          safeCopy = input.slice(0, 5).map(item => {
            try {
              return typeof item === 'object' ? {...item} : item;
            } catch (err) {
              console.warn("Failed to process array item:", err);
              return null;
            }
          }).filter(Boolean);
        } else {
          console.log("Input is an object, creating safe copy");
          safeCopy = {...input};
        }
      } catch (error) {
        console.warn("Failed to create safe copy of input", error);
        return [];
      }
      
      // Try parsing the safe copy
      if (Array.isArray(safeCopy)) {
        console.log("Parsing array of items");
        const results = safeCopy
          .map(item => parseJsonFormat(item))
          .filter((product): product is ProductAnalysis => product !== null);
        
        if (results.length > 0) {
          console.log("Successfully parsed array items:", results);
          return results;
        }
      } else {
        console.log("Parsing single object");
        const result = parseJsonFormat(safeCopy);
        if (result) {
          console.log("Successfully parsed object:", result);
          return [result];
        }
      }
    }
    
    // Handle string input
    if (typeof input === 'string') {
      console.log("Attempting to parse string input");
      // Try parsing as webhook response first
      const products = parseWebhookResponse(input);
      if (products.length > 0) {
        console.log("Successfully parsed string as webhook response:", products);
        return products;
      }
      
      // Check if the string contains a Google Docs URL
      if (input.includes('docs.google.com')) {
        console.log("Found Google Docs URL in string input");
        const product = createDefaultProduct("Competitor Analysis");
        product.competitorAnalysisUrl = input.trim();
        return [product];
      }
      
      // If not a webhook response, try parsing as regular JSON
      const maxLength = 500000;
      let processedInput = input.length > maxLength ? input.slice(0, maxLength) : input;
      processedInput = processedInput.trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
      
      try {
        console.log("Attempting to parse processed string as JSON");
        let parsedData = JSON.parse(processedInput);
        
        if (Array.isArray(parsedData)) {
          console.log("Parsed string is an array, processing items");
          const results = parsedData
            .slice(0, 5)
            .map(item => parseJsonFormat(item))
            .filter((product): product is ProductAnalysis => product !== null);
          
          if (results.length > 0) {
            console.log("Successfully parsed array items from string:", results);
            return results;
          }
        } else if (typeof parsedData === 'object' && parsedData !== null) {
          console.log("Parsed string is an object, attempting to parse");
          const result = parseJsonFormat(parsedData);
          if (result) {
            console.log("Successfully parsed object from string:", result);
            return [result];
          }
        }
      } catch (error) {
        console.warn("Failed to parse string as JSON:", error);
      }
    }
    
    // If all parsing attempts failed, return a default product
    console.warn("All parsing attempts failed, returning an empty array.");
    return [];
  } catch (error) {
    console.error("Error in parseProductData:", error);
    return [];
  }
}

export type { ProductAnalysis };