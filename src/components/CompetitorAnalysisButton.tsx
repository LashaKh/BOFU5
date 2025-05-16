import React from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CompetitorsData } from '../types/product/types';
import { makeWebhookRequest } from '../utils/webhookUtils';
import { parseProductData } from '../types/product';

interface CompetitorAnalysisButtonProps {
  onAnalysisComplete: (documentUrl: string) => void;
  onCompetitorsReceived?: (competitors: CompetitorsData) => void;
  product: {
    companyName: string;
    productDetails: {
      name: string;
      description: string;
    };
    usps: string[];
    features: string[];
    capabilities: Array<{
      title: string;
      description: string;
      content: string;
    }>;
  };
}

export function CompetitorAnalysisButton({ product, onAnalysisComplete, onCompetitorsReceived }: CompetitorAnalysisButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCompetitorAnalysis = async () => {
    if (!product.productDetails?.name || !product.productDetails?.description) {
      toast.error('Product name and description are required');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Requesting competitor analysis...');

    try {
      console.log("Preparing request data for competitor analysis:", {
        companyName: product.companyName,
        productName: product.productDetails.name,
        description: product.productDetails.description
      });
      
      const response = await makeWebhookRequest(
        'https://hook.us2.make.com/n4kuyrqovr1ndwj9nsodio7th70wbm6i',
        {
          product: {
            companyName: product.companyName,
            productName: product.productDetails.name,
            description: product.productDetails.description,
            usps: product.usps || [],
            features: product.features || [],
            capabilities: (product.capabilities || []).map(cap => ({
              title: cap.title,
              description: cap.description,
              content: cap.content
            }))
          },
          requestType: 'competitor_analysis'
        },
        {
          timeout: 300000, // 5 minutes
          maxRetries: 3,
          retryDelay: 2000
        }
      );

      console.log("Received response from webhook:", JSON.stringify(response, null, 2));
      
      // Special case for the exact format: {company, product, competitors} that we expect
      if (typeof response === 'object' && 
          response.company && 
          response.product && 
          response.competitors && 
          response.competitors.direct_competitors && 
          response.competitors.niche_competitors && 
          response.competitors.broader_competitors) {
        
        console.log("Found exact expected format from webhook");
        
        if (onCompetitorsReceived) {
          // Create a validated version of the competitors data
          const validatedCompetitors = {
            direct_competitors: Array.isArray(response.competitors.direct_competitors) 
              ? response.competitors.direct_competitors : [],
            niche_competitors: Array.isArray(response.competitors.niche_competitors)
              ? response.competitors.niche_competitors : [],
            broader_competitors: Array.isArray(response.competitors.broader_competitors)
              ? response.competitors.broader_competitors : []
          };
          
          console.log("Updating competitors with validated format:", JSON.stringify(validatedCompetitors, null, 2));
          onCompetitorsReceived(validatedCompetitors);
          toast.success('Competitors identified successfully', { id: loadingToast });
          setIsLoading(false);
          return;
        }
      }

      // Debug response structure
      if (typeof response === 'object') {
        console.log("Response is an object with keys:", Object.keys(response));
        
        // Check for the exact expected response structure from the webhook
        if (response.company && response.product && response.competitors) {
          console.log("Found the expected structure with company, product, and competitors");
          
          // Specifically check for direct_competitors, niche_competitors, broader_competitors
          const hasCorrectStructure = 
            ('direct_competitors' in response.competitors) &&
            ('niche_competitors' in response.competitors) &&
            ('broader_competitors' in response.competitors);
            
          if (hasCorrectStructure && onCompetitorsReceived) {
            console.log("Response has the correct competitors structure, updating data");
            
            // Create a validated version of the competitors data
            const validatedCompetitors = {
              direct_competitors: Array.isArray(response.competitors.direct_competitors) 
                ? response.competitors.direct_competitors : [],
              niche_competitors: Array.isArray(response.competitors.niche_competitors)
                ? response.competitors.niche_competitors : [],
              broader_competitors: Array.isArray(response.competitors.broader_competitors)
                ? response.competitors.broader_competitors : []
            };
            
            console.log("Passing validated competitors to parent:", JSON.stringify(validatedCompetitors, null, 2));
            onCompetitorsReceived(validatedCompetitors);
            
            // Return true to indicate we successfully processed the response
            return;
          } else {
            console.warn("Response has company/product but wrong competitors format:", response.competitors);
          }
        }
        
        if (response.company) {
          console.log("Found company field:", response.company);
        }
        
        if (response.product) {
          console.log("Found product field:", response.product);
        }
        
        if (response.competitors) {
          console.log("Found competitors field with structure:", JSON.stringify(response.competitors, null, 2));
          console.log("Direct competitors:", Array.isArray(response.competitors.direct_competitors) ? 
            response.competitors.direct_competitors.length : "not an array");
          console.log("Niche competitors:", Array.isArray(response.competitors.niche_competitors) ? 
            response.competitors.niche_competitors.length : "not an array");
          console.log("Broader competitors:", Array.isArray(response.competitors.broader_competitors) ? 
            response.competitors.broader_competitors.length : "not an array");
        }
      } else if (typeof response === 'string') {
        console.log("Response is a string, length:", response.length);
        // Try to parse if it looks like JSON
        if (response.trim().startsWith('{') || response.trim().startsWith('[')) {
          try {
            const parsedResponse = JSON.parse(response);
            console.log("Successfully parsed string response as JSON:", parsedResponse);
          } catch (e) {
            console.log("Failed to parse string as JSON, first 200 chars:", response.substring(0, 200));
          }
        }
      }

      // Parse the response using our new parser
      const parsedProducts = parseProductData(response);
      console.log("Parsed products:", parsedProducts);
      
      // If we got any products back, use the first one's data
      if (parsedProducts.length > 0) {
        const firstProduct = parsedProducts[0];
        
        // If the product has competitors data, send it to the parent
        if (firstProduct.competitors && onCompetitorsReceived) {
          console.log("Updating competitors data from parsed product:", firstProduct.competitors);
          onCompetitorsReceived(firstProduct.competitors);
        }
        
        // If the product has a competitor analysis URL, send it to the parent
        if (firstProduct.competitorAnalysisUrl) {
          console.log("Updating competitor analysis URL:", firstProduct.competitorAnalysisUrl);
          onAnalysisComplete(firstProduct.competitorAnalysisUrl);
        } else {
          // If no URL was found in the parsed product, check the raw response
          console.log("No competitorAnalysisUrl found in parsed product, checking raw response");
          checkAndProcessRawResponse(response);
        }
      } else {
        // If no products were parsed, check the raw response for a URL and competitors
        console.log("No products were parsed from response, checking raw response directly");
        checkAndProcessRawResponse(response);
      }

      toast.success('Competitor analysis completed', { id: loadingToast });
    } catch (error) {
      console.error('Error in competitor analysis:', error);
      toast.error(`Failed to analyze competitors: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract URL and competitors from response
  const checkAndProcessRawResponse = (response: any) => {
    console.log("checkAndProcessRawResponse called with response type:", typeof response);
    
    // First check for a URL
    let url = null;
    
    if (typeof response === 'string' && response.includes('docs.google.com')) {
      console.log("Found direct Google Docs URL in response");
      url = response.trim();
    } else if (typeof response === 'object') {
      // Check for the expected structure: {company, product, competitors}
      if (response.company && response.product && response.competitors) {
        console.log("Found expected competitor data structure:", JSON.stringify(response, null, 2));
        
        // Ensure competitors has the right structure
        const validCompetitors = {
          direct_competitors: Array.isArray(response.competitors.direct_competitors) 
            ? response.competitors.direct_competitors : [],
          niche_competitors: Array.isArray(response.competitors.niche_competitors) 
            ? response.competitors.niche_competitors : [],
          broader_competitors: Array.isArray(response.competitors.broader_competitors) 
            ? response.competitors.broader_competitors : []
        };
        
        if (onCompetitorsReceived) {
          console.log("Updating competitors with direct format:", JSON.stringify(validCompetitors, null, 2));
          onCompetitorsReceived(validCompetitors);
          
          // We successfully processed the competitors data
          toast.success('Competitors identified successfully');
          return;
        } else {
          console.warn("onCompetitorsReceived callback is not defined");
        }
      }
      
      // If not in expected format, check other common response formats
      url = response.analysisUrl || response.documentUrl || response.url || null;
      
      // Check for competitors data in the response
      if (response.competitors && onCompetitorsReceived) {
        console.log("Found competitors data in raw response:", JSON.stringify(response.competitors, null, 2));
        
        // Ensure competitors has the right structure
        const validCompetitors = {
          direct_competitors: Array.isArray(response.competitors.direct_competitors) 
            ? response.competitors.direct_competitors : [],
          niche_competitors: Array.isArray(response.competitors.niche_competitors) 
            ? response.competitors.niche_competitors : [],
          broader_competitors: Array.isArray(response.competitors.broader_competitors) 
            ? response.competitors.broader_competitors : []
        };
        
        onCompetitorsReceived(validCompetitors);
      } else if (response.result && typeof response.result === 'object') {
        // Check for competitors in result object
        if (response.result.competitors && onCompetitorsReceived) {
          console.log("Found competitors data in result object:", JSON.stringify(response.result.competitors, null, 2));
          
          // Ensure competitors has the right structure
          const validCompetitors = {
            direct_competitors: Array.isArray(response.result.competitors.direct_competitors) 
              ? response.result.competitors.direct_competitors : [],
            niche_competitors: Array.isArray(response.result.competitors.niche_competitors) 
              ? response.result.competitors.niche_competitors : [],
            broader_competitors: Array.isArray(response.result.competitors.broader_competitors) 
              ? response.result.competitors.broader_competitors : []
          };
          
          onCompetitorsReceived(validCompetitors);
        }
      } else if (response.result && typeof response.result === 'string') {
        // Try to parse the result string
        try {
          const resultObj = JSON.parse(response.result);
          if (resultObj.competitors && onCompetitorsReceived) {
            console.log("Found competitors data in parsed result string:", resultObj.competitors);
            
            // Ensure competitors has the right structure
            const validCompetitors = {
              direct_competitors: Array.isArray(resultObj.competitors.direct_competitors) 
                ? resultObj.competitors.direct_competitors : [],
              niche_competitors: Array.isArray(resultObj.competitors.niche_competitors) 
                ? resultObj.competitors.niche_competitors : [],
              broader_competitors: Array.isArray(resultObj.competitors.broader_competitors) 
                ? resultObj.competitors.broader_competitors : []
            };
            
            onCompetitorsReceived(validCompetitors);
          }
        } catch (e) {
          console.warn("Could not parse result string as JSON:", e);
        }
      }
    }
    
    // If a URL was found, pass it to the parent
    if (url && typeof url === 'string' && url.includes('docs.google.com')) {
      console.log("Found URL in response object:", url);
      onAnalysisComplete(url.trim());
    } else {
      // If we processed competitors but didn't find a URL, we consider it a success
      if (response && response.competitors && onCompetitorsReceived) {
        console.log("Successfully processed competitors data without URL");
        return;
      }
      
      // Try to parse the company and product fields manually if they exist
      try {
        if (response && typeof response === 'object') {
          const company = response.company || '';
          const product = response.product || '';
          
          if (company && product) {
            console.log(`Successfully processed company (${company}) and product (${product}) data`);
            toast.success('Competitors identified successfully');
            return;
          }
        }
      } catch (e) {
        console.warn("Error while trying to process company/product fields:", e);
      }
      
      throw new Error('No valid competitors data or analysis URL found in response');
    }
  };

  return (
    <motion.button
      onClick={handleCompetitorAnalysis}
      disabled={isLoading}
      className={`w-full bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition-colors duration-150 ease-in-out flex items-center justify-center
        ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-gray-600'}`}
      whileHover={{ scale: isLoading ? 1 : 1.03 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin h-5 w-5 mr-2" /> 
          Analyzing...
        </>
      ) : (
        <>
          <Target className="h-5 w-5 mr-2" /> 
          Analyze Competitors
        </>
      )}
    </motion.button>
  );
}