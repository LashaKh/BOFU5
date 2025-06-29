import { ProductAnalysis } from '../types/product/types';

// AirOps API credentials
const AIROPS_API_KEY = 'RupciXDLDcCZN3lemLVvxS3TYqtL-KJ5YVr_qubvTX0t9fiPlonZ54yxNYns';
const WORKFLOW_UUID = 'a02357db-32c6-40f5-845a-615cee68bc56';
const CONTENT_BRIEF_WORKFLOW_UUID = 'da46d3a1-af19-42d2-9b1d-67e430bcc1e0';

// Define the structures expected by AirOps API

interface ContentBriefInput {
  contentBrief: string;
  internalLinks: string;
  articleTitle: string;
  contentFramework: string;
  research_result_id: string | null;
}

// Define the structure expected by AirOps API
interface AirOpsProductInput {
  product_card_information: ProductAnalysis & { 
    google_doc: string;
    userUUID?: string;
    userEmail?: string;
    userCompanyName?: string;
  };
  research_result_Id?: string; // Note: Capital 'I' to match Airops input field
}

/**
 * Safely logs objects by handling circular references
 */
function safeLog(prefix: string, obj: any) {
  try {
    // Use a replacer function to handle circular references
    const seen = new WeakSet();
    const safeObj = JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
    
    console.log(`${prefix}:`, safeObj);
  } catch (err) {
    console.log(`${prefix} (error stringifying):`, obj);
  }
}

/**
 * Validates and processes capability images to ensure they are proper Supabase URLs
 */
function processCapabilityImages(capabilities: any[]): any[] {
  if (!capabilities || !Array.isArray(capabilities)) {
    console.warn('Invalid capabilities array provided');
    return [];
  }

  return capabilities.map((capability, index) => {
    const processedCapability = { ...capability };
    
    if (capability.images && Array.isArray(capability.images)) {
      // Filter and validate image URLs
      const validImages = capability.images.filter((imageUrl: string) => {
        if (!imageUrl || typeof imageUrl !== 'string') {
          console.warn(`Invalid image URL at capability ${index}:`, imageUrl);
          return false;
        }
        
        // Check if it's a base64 data URL (should be converted to Supabase URL)
        if (imageUrl.startsWith('data:')) {
          console.warn(`Base64 image found at capability ${index}, should be Supabase URL:`, imageUrl.substring(0, 50));
          return false;
        }
        
        // Check if it's a valid Supabase Storage URL
        if (imageUrl.includes('.supabase.co/storage/v1/object/public/capability-images/')) {
          console.log(`Valid Supabase image URL at capability ${index}:`, imageUrl);
          return true;
        }
        
        // Check if it's any other valid HTTP/HTTPS URL
        try {
          const url = new URL(imageUrl);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            console.log(`Valid external image URL at capability ${index}:`, imageUrl);
            return true;
          }
        } catch (error) {
          console.warn(`Invalid URL format at capability ${index}:`, imageUrl, error);
          return false;
        }
        
        return false;
      });
      
      processedCapability.images = validImages;
      console.log(`Capability ${index}: ${capability.images.length} total images, ${validImages.length} valid images`);
    } else {
      // Ensure images is always an array
      processedCapability.images = [];
    }
    
    return processedCapability;
  });
}

/**
 * Formats a Google Doc URL to the required format
 */
function formatGoogleDocUrl(url: string): string {
  try {
    // Check if it's a Google Docs URL
    if (!url.includes('docs.google.com/document')) {
      throw new Error('Not a Google Docs URL');
    }

    // Extract the document ID
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Could not extract document ID');
    }

    const docId = match[1];
    
    // Format to base URL without any suffix (no /edit, no /pub)
    const formattedUrl = `https://docs.google.com/document/d/${docId}`;
    
    console.log('Formatted Google Doc URL:', formattedUrl);
    return formattedUrl;
  } catch (error) {
    console.error('Error formatting Google Doc URL:', error);
    throw new Error('Invalid Google Doc URL provided');
  }
}

/**
 * Sends product data to AirOps via direct API call
 */
export async function approveContentBrief(briefData: ContentBriefInput) {
  try {
    console.log('Sending content brief to AirOps...');
    
    const response = await fetch(`https://api.airops.com/public_api/airops_apps/${CONTENT_BRIEF_WORKFLOW_UUID}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AIROPS_API_KEY}`
      },
      body: JSON.stringify({
        inputs: {
          content_brief: briefData.contentBrief,
          internal_links: briefData.internalLinks,
          article_title: briefData.articleTitle,
          content_framework: briefData.contentFramework,
          research_result_id: briefData.research_result_id
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Check for the specific free tier limitation error
      if (errorText.includes("free tier") || errorText.includes("Contact AirOps support")) {
        throw new Error('ACCOUNT_LIMITATION: Your AirOps account requires an upgrade. Please contact AirOps support for access to this feature.');
      }
      
      throw new Error(`AirOps API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('AirOps content brief response:', data);
    return data;
  } catch (error) {
    console.error('Error in AirOps content brief integration:', error);
    throw error;
  }
}

export async function sendToAirOps(productData: AirOpsProductInput) {
  try {
    console.log('Sending data to AirOps...');
    
    // Process capabilities images to ensure they are valid URLs
    let formattedProductData = { ...productData };
    
    // Process capabilities images first
    if (formattedProductData.product_card_information.capabilities) {
      console.log('Processing capabilities images before sending to AirOps...');
      formattedProductData.product_card_information.capabilities = processCapabilityImages(
        formattedProductData.product_card_information.capabilities
      );
    }
    
    // Format the URL if it exists
    if (productData.product_card_information.google_doc) {
      try {
        const formattedUrl = formatGoogleDocUrl(productData.product_card_information.google_doc);
        formattedProductData = {
          ...productData,
          product_card_information: {
            ...productData.product_card_information,
            google_doc: formattedUrl
          }
        };
      } catch (error) {
        console.warn('Error formatting Google Doc URL:', error);
      }
    } else if (productData.product_card_information.competitorAnalysisUrl) {
      // If google_doc field is not provided but competitorAnalysisUrl is, use that instead
      try {
        const formattedUrl = formatGoogleDocUrl(productData.product_card_information.competitorAnalysisUrl);
        formattedProductData = {
          ...productData,
          product_card_information: {
            ...productData.product_card_information,
            google_doc: formattedUrl
          }
        };
      } catch (error) {
        console.warn('Error formatting competitor analysis URL:', error);
      }
    } else {
      // If neither exists, add a default Google Doc URL that is publicly accessible
      // Use the URL from the user example
      const defaultUrl = "https://docs.google.com/document/d/1qxocRF9_MXzQXnWxTJgteIZGzYbY6vppKlQ4OfqFZ9s";
      formattedProductData = {
        ...productData,
        product_card_information: {
          ...productData.product_card_information,
          google_doc: defaultUrl
        }
      };
      console.log('Added default Google Doc URL:', defaultUrl);
    }
    
    // Log what we're sending
    console.log('================================');
    console.log('Research Result ID to be sent:', formattedProductData.research_result_Id);
    console.log('Full request payload:', {
      inputs: {
        product_card_information: formattedProductData.product_card_information,
        research_result_Id: formattedProductData.research_result_Id || ''
      }
    });
    console.log('================================');
    safeLog('Product data being sent to AirOps', formattedProductData);
    
    // Direct API call
    const response = await fetch(
      `https://api.airops.com/public_api/airops_apps/${WORKFLOW_UUID}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AIROPS_API_KEY}`,
          'Accept': 'application/json'
        },
        // Important: do not include credentials for cross-origin calls to third-party APIs
        credentials: 'omit',
        body: JSON.stringify({
          inputs: {
            product_card_information: formattedProductData.product_card_information,
            research_result_Id: formattedProductData.research_result_Id || ''  // Send to the dedicated text input field
          }
        })
      }
    );
    
    // Special handling for response errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AirOps API error:', response.status, response.statusText, errorText);
      
      // Check for the specific free tier limitation error
      if (errorText.includes("free tier") || errorText.includes("Contact AirOps support")) {
        throw new Error('ACCOUNT_LIMITATION: Your AirOps account requires an upgrade. Please contact AirOps support for access to this feature.');
      }
      
      throw new Error(`AirOps API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('AirOps response:', data);
    return data;
  } catch (error) {
    console.error('Error in AirOps integration:', error);
    throw error;
  }
}