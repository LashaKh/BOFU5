import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, X, ChevronDown, ChevronUp, BarChart, Loader2, Search } from 'lucide-react';
import { ProductAnalysis, CompetitorItem, CompetitorsData } from '../../types/product/types';
import toast from 'react-hot-toast';
import { makeWebhookRequest } from '../../utils/webhookUtils';
import { parseProductData } from '../../types/product';

interface CompetitorAnalysisProps {
  product: ProductAnalysis;
  onUpdate: (url: string) => void;
  onUpdateCompetitors?: (competitors: CompetitorsData) => void;
}

type CompetitorType = 'direct_competitors' | 'niche_competitors' | 'broader_competitors';

export function CompetitorAnalysis({ product, onUpdate, onUpdateCompetitors }: CompetitorAnalysisProps) {
  const [newCompetitor, setNewCompetitor] = useState<{
    type: CompetitorType;
    company_name: string;
    product_name: string;
    category: string;
  }>({
    type: 'direct_competitors',
    company_name: '',
    product_name: '',
    category: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<CompetitorType, boolean>>({
    direct_competitors: true,
    niche_competitors: true,
    broader_competitors: true
  });
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Debug: Log the full product object
    console.log("CompetitorAnalysis full product object:", JSON.stringify(product));
    
    // Log the current state of the product and competitors
    console.log("CompetitorAnalysis rendering with product:", product);
    
    if (product.competitors) {
      console.log("Current competitors in product:", product.competitors);
      // Deep-check the structure of competitors arrays
      console.log("Direct competitors is array?", Array.isArray(product.competitors.direct_competitors));
      console.log("Direct competitors length:", product.competitors.direct_competitors?.length);
      console.log("Niche competitors is array?", Array.isArray(product.competitors.niche_competitors));
      console.log("Niche competitors length:", product.competitors.niche_competitors?.length);
      console.log("Broader competitors is array?", Array.isArray(product.competitors.broader_competitors));
      console.log("Broader competitors length:", product.competitors.broader_competitors?.length);
    } else {
      console.log("No competitors in product");
      
      // Check if competitorAnalysisUrl contains JSON with competitor data
      if (product.competitorAnalysisUrl) {
        console.log("Product has competitorAnalysisUrl:", product.competitorAnalysisUrl);
        try {
          const urlData = JSON.parse(product.competitorAnalysisUrl);
          console.log("Parsed competitorAnalysisUrl:", urlData);
          if (urlData.competitors) {
            console.log("Found competitors in URL data:", urlData.competitors);
            
            // Update competitors if needed
            if (!product.competitors && onUpdateCompetitors) {
              const competitors = {
                direct_competitors: Array.isArray(urlData.competitors.direct_competitors) 
                  ? urlData.competitors.direct_competitors : [],
                niche_competitors: Array.isArray(urlData.competitors.niche_competitors) 
                  ? urlData.competitors.niche_competitors : [],
                broader_competitors: Array.isArray(urlData.competitors.broader_competitors) 
                  ? urlData.competitors.broader_competitors : []
              };
              console.log("Updating competitors from URL data:", competitors);
              onUpdateCompetitors(competitors);
            }
          }
        } catch (e) {
          console.log("competitorAnalysisUrl is not valid JSON:", e);
        }
      }
    }
  }, [product, onUpdateCompetitors]);

  const handleAddCompetitor = () => {
    if (!newCompetitor.company_name || !newCompetitor.product_name || !newCompetitor.category) {
      return;
    }

    // Initialize competitors if it doesn't exist
    const updatedCompetitors = product.competitors ? { ...product.competitors } : {
      direct_competitors: [],
      niche_competitors: [],
      broader_competitors: []
    };
    
    // Check if the selected category already has 12 competitors
    if (updatedCompetitors[newCompetitor.type].length >= 12) {
      toast.error(`Maximum limit of 12 ${newCompetitor.type.replace('_', ' ')} reached`);
      return;
    }

    updatedCompetitors[newCompetitor.type] = [
      ...updatedCompetitors[newCompetitor.type],
      {
        company_name: newCompetitor.company_name,
        product_name: newCompetitor.product_name,
        category: newCompetitor.category
      }
    ];

    onUpdateCompetitors?.(updatedCompetitors);
    
    setNewCompetitor({
      type: 'direct_competitors',
      company_name: '',
      product_name: '',
      category: ''
    });
    setShowForm(false);
  };

  const handleRemoveCompetitor = (type: CompetitorType, index: number) => {
    if (!product.competitors) return;
    
    const updatedCompetitors = { ...product.competitors };
    updatedCompetitors[type] = updatedCompetitors[type].filter((_, i) => i !== index);

    onUpdateCompetitors?.(updatedCompetitors);
  };

  const toggleSection = (section: CompetitorType) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUpdateCompetitors = (competitors: any) => {
    console.log("CompetitorAnalysis.handleUpdateCompetitors called with:", competitors);
    
    // Ensure we have valid competitorTypes within the competitors object
    const updatedCompetitors = {
      direct_competitors: Array.isArray(competitors.direct_competitors) 
        ? competitors.direct_competitors : [],
      niche_competitors: Array.isArray(competitors.niche_competitors)
        ? competitors.niche_competitors : [],
      broader_competitors: Array.isArray(competitors.broader_competitors)
        ? competitors.broader_competitors : []
    };
    
    // Call the parent's onUpdateCompetitors function with the updated competitors
    if (onUpdateCompetitors) {
      console.log("Calling parent's onUpdateCompetitors with:", updatedCompetitors);
      onUpdateCompetitors(updatedCompetitors);
      
      // Force component to re-render by updating local state
      setNewCompetitor(prev => ({ ...prev }));
    } else {
      console.warn("onUpdateCompetitors is not defined");
    }
  };

  // Helper function to format Google Doc URL
  const formatGoogleDocUrl = (url: string): string | null => {
    try {
      // Check if it's a Google Docs URL
      if (!url.includes('docs.google.com/document')) {
        return null;
      }
      
      // Extract the document ID
      const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        return null;
      }
      
      const docId = match[1];
      
      // Format to base URL without any suffix
      const formattedUrl = `https://docs.google.com/document/d/${docId}`;
      
      console.log('Formatted Google Doc URL:', formattedUrl);
      return formattedUrl;
    } catch (e) {
      console.error('Error formatting Google Doc URL:', e);
      return null;
    }
  };

  // Helper function to process URL
  const processUrl = (url: string) => {
    const formattedUrl = formatGoogleDocUrl(url);
    if (formattedUrl) {
      console.log('Formatted Google Doc URL:', formattedUrl);
      onUpdate(formattedUrl);
    } else {
      console.error('Invalid Google Doc URL:', url);
      toast.error('Received invalid Google Doc URL from analysis');
    }
  };

  const handleAnalyzeCompetitors = async () => {
    setIsAnalyzing(true);
    const loadingToast = toast.loading('Analyzing competitors...');

    try {
      // Prepare the data to send to the webhook
      const data = {
        product: {
          companyName: product.companyName,
          productName: product.productDetails?.name,
          description: product.productDetails?.description,
          usps: product.usps,
          businessOverview: product.businessOverview,
          painPoints: product.painPoints,
          features: product.features,
          targetPersona: product.targetPersona,
          pricing: product.pricing,
          currentSolutions: product.currentSolutions,
          capabilities: product.capabilities
        },
        competitors: product.competitors,
        requestType: 'analyze_competitors',
        uniqueId: crypto.randomUUID()
      };

      console.log('Sending competitor analysis request:', data);

      const response = await makeWebhookRequest(
        'https://hook.us2.make.com/qjbyl0g1d1ailgmnn2p9pjmcu888xe43',
        data,
        {
          timeout: 300000, // 5 minutes
          maxRetries: 3,
          retryDelay: 2000
        }
      );

      console.log('Received competitor analysis response:', response);

      // First check if the response contains a URL directly
      let foundUrl = false;
      let urlToProcess = null;

      // Check for URL in different formats
      if (typeof response === 'string' && response.includes('docs.google.com')) {
        urlToProcess = response.trim();
        foundUrl = true;
      } else if (typeof response === 'object' && response) {
        const url = response.analysisUrl || response.documentUrl || response.url || response.google_doc || response.competitorAnalysisUrl;
        if (url && typeof url === 'string' && url.includes('docs.google.com')) {
          urlToProcess = url.trim();
          foundUrl = true;
        }
      }

      // If we found a URL, process it and preserve existing competitors
      if (foundUrl && urlToProcess) {
        console.log('Found analysis URL, processing and preserving existing competitors:', urlToProcess);
        processUrl(urlToProcess);
        // Don't parse through parseProductData to avoid overwriting competitors
        toast.success('Competitor analysis completed - document ready!', { id: loadingToast });
        return;
      }

      // If no direct URL found, try parsing the response
      const parsedProducts = parseProductData(response);
      
      // If we got any products back, use the first one's data
      if (parsedProducts.length > 0) {
        const firstProduct = parsedProducts[0];
        
        // If the product has a competitor analysis URL, process it
        if (firstProduct.competitorAnalysisUrl) {
          console.log('Found analysis URL in parsed product:', firstProduct.competitorAnalysisUrl);
          processUrl(firstProduct.competitorAnalysisUrl);
        }
        
        // Only update competitors if the response actually contains competitor data
        // Otherwise, preserve the existing competitors from the UI
        if (firstProduct.competitors && onUpdateCompetitors) {
          const hasCompetitorData = (firstProduct.competitors.direct_competitors?.length || 0) > 0 ||
                                   (firstProduct.competitors.niche_competitors?.length || 0) > 0 ||
                                   (firstProduct.competitors.broader_competitors?.length || 0) > 0;
          
          if (hasCompetitorData) {
            console.log('Updating competitors from analysis response:', firstProduct.competitors);
            onUpdateCompetitors(firstProduct.competitors);
          } else {
            console.log('No competitor data in response, preserving existing competitors');
          }
        } else {
          console.log('No competitors in parsed product, preserving existing data');
        }
      } else {
        // If no products were parsed, check the raw response for competitors or URL
        checkAndProcessRawResponse(response);
      }

      toast.success('Competitor analysis completed', { id: loadingToast });
    } catch (error) {
      console.error('Error in competitor analysis:', error);
      toast.error(`Failed to analyze competitors: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Helper function to extract URL and competitors from response
  const checkAndProcessRawResponse = (response: any) => {
    // If response is a string, check if it's a direct Google Docs URL
    if (typeof response === 'string') {
      // If it includes docs.google.com, it's likely a direct URL
      if (response.includes('docs.google.com')) {
        console.log("Found direct Google Docs URL in string response:", response);
        processUrl(response.trim());
        return;
      }
      
      // Try to parse the string as JSON
      try {
        const parsedResponse = JSON.parse(response);
        console.log("Successfully parsed string response as JSON:", parsedResponse);
        
        // Process the parsed object
        if (typeof parsedResponse === 'object') {
          handleParsedObject(parsedResponse);
        }
      } catch (error) {
        console.error("Failed to parse string response as JSON:", error);
        throw new Error('Invalid response format: not a Google Doc URL or parseable JSON');
      }
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
        
        if (onUpdateCompetitors) {
          console.log("Updating competitors with direct format:", JSON.stringify(validCompetitors, null, 2));
          onUpdateCompetitors(validCompetitors);
        } else {
          console.warn("onCompetitorsReceived callback is not defined");
        }
        
        // Also check for URL fields in the response
        const url = response.analysisUrl || response.documentUrl || response.url || response.google_doc || response.competitorAnalysisUrl;
        if (url && typeof url === 'string' && url.includes('docs.google.com')) {
          console.log("Found Google Docs URL in response object:", url);
          processUrl(url.trim());
        }
        
        return;
      }
      
      // If not in expected format, process with handleParsedObject
      handleParsedObject(response);
    } else {
      throw new Error('Invalid response format: neither string nor object');
    }
  };
  
  // Helper function to handle parsed object responses
  const handleParsedObject = (obj: any) => {
    // Check for Google Doc URL in common fields
    const url = obj.analysisUrl || obj.documentUrl || obj.url || obj.google_doc || obj.competitorAnalysisUrl;
    let foundUrl = false;
    
    if (url && typeof url === 'string' && url.includes('docs.google.com')) {
      console.log("Found Google Docs URL in object response:", url);
      processUrl(url.trim());
      foundUrl = true;
    }
    
    // Check for competitors data in different possible formats
    let foundCompetitors = false;
    if (obj.competitors && onUpdateCompetitors) {
      console.log("Found competitors data in response object:", obj.competitors);
      onUpdateCompetitors(obj.competitors);
      foundCompetitors = true;
    } else if (obj.result) {
      // Check if result is an object with competitors
      if (typeof obj.result === 'object' && obj.result.competitors && onUpdateCompetitors) {
        console.log("Found competitors data in result object:", obj.result.competitors);
        onUpdateCompetitors(obj.result.competitors);
        foundCompetitors = true;
      } 
      // Check if result is a string that might be JSON
      else if (typeof obj.result === 'string') {
        try {
          const resultObj = JSON.parse(obj.result);
          if (resultObj.competitors && onUpdateCompetitors) {
            console.log("Found competitors data in parsed result string:", resultObj.competitors);
            onUpdateCompetitors(resultObj.competitors);
            foundCompetitors = true;
          }
          
          // Also check for URL in the parsed result
          const resultUrl = resultObj.analysisUrl || resultObj.documentUrl || resultObj.url;
          if (resultUrl && typeof resultUrl === 'string' && resultUrl.includes('docs.google.com')) {
            console.log("Found Google Docs URL in parsed result string:", resultUrl);
            processUrl(resultUrl.trim());
            foundUrl = true;
          }
        } catch (e) {
          console.warn("Could not parse result string as JSON");
        }
      }
    }
    
    // If we found neither a URL nor competitors data, throw an error
    if (!foundUrl && !foundCompetitors) {
      throw new Error('No valid analysis URL or competitors data found in response');
    }
  };

  const handleIdentifyCompetitors = async () => {
    setIsIdentifying(true);
    const loadingToast = toast.loading('Identifying competitors...');

    try {
      // Prepare the data to send to the webhook
      const data = {
        product: {
          companyName: product.companyName,
          productName: product.productDetails?.name,
          description: product.productDetails?.description,
          usps: product.usps,
          businessOverview: product.businessOverview,
          painPoints: product.painPoints,
          features: product.features,
          targetPersona: product.targetPersona,
          pricing: product.pricing,
          currentSolutions: product.currentSolutions,
          capabilities: product.capabilities
        },
        requestType: 'identify_competitors',
        uniqueId: crypto.randomUUID()
      };

      console.log('Sending competitor identification request:', data);

      const response = await makeWebhookRequest(
        'https://hook.us2.make.com/n4kuyrqovr1ndwj9nsodio7th70wbm6i',
        data,
        {
          timeout: 300000, // 5 minutes
          maxRetries: 3,
          retryDelay: 2000
        }
      );

      // Parse the response using our new parser
      const parsedProducts = parseProductData(response);
      
      // If we got any products back, use the first one's data
      if (parsedProducts.length > 0) {
        const firstProduct = parsedProducts[0];
        
        // If the product has competitors data, update it
        if (firstProduct.competitors && onUpdateCompetitors) {
          console.log('Updating competitors from identification:', firstProduct.competitors);
          onUpdateCompetitors(firstProduct.competitors);
        } else {
          // Check raw response for competitors data if not found in parsed product
          checkAndProcessRawResponse(response);
        }
      } else {
        // If no products were parsed, check the raw response
        checkAndProcessRawResponse(response);
      }

      toast.success('Competitors identified successfully', { id: loadingToast });
    } catch (error) {
      console.error('Error in competitor identification:', error);
      toast.error(`Failed to identify competitors: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast });
    } finally {
      setIsIdentifying(false);
    }
  };

  const renderCompetitorSection = (title: string, type: CompetitorType, competitors: CompetitorItem[]) => {
    const isExpanded = expandedSections[type];
    const competitorList = Array.isArray(competitors) ? competitors : [];
    
    console.log(`Rendering ${title} with ${competitorList.length} items:`, competitorList);
    
    return (
      <div className="mb-3">
        <div
          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer border border-gray-200 hover:bg-gray-100 transition-colors"
          onClick={() => toggleSection(type)}
        >
          <h5 className="font-medium text-gray-900">{title}</h5>
          {isExpanded ? <ChevronUp size={16} className="text-gray-600" /> : <ChevronDown size={16} className="text-gray-600" />}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {competitorList.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {competitorList.map((competitor, index) => (
                    <div 
                      key={`${type}-${index}`}
                      className="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-start shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{competitor.company_name}</span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {competitor.product_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{competitor.category}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCompetitor(type, index);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic mt-2 px-3">
                  No {title.toLowerCase()} identified yet.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Two separate action buttons */}
      <div className="space-y-3">
        {/* Identify Competitors Button */}
        <button
          onClick={handleIdentifyCompetitors}
          disabled={isIdentifying}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-150 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isIdentifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Identifying Competitors...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Identify Competitors
            </>
          )}
        </button>
        
        {/* Analyze Competitors Button */}
        <button
          onClick={handleAnalyzeCompetitors}
          disabled={isAnalyzing || 
            (!product.competitors?.direct_competitors?.length && 
             !product.competitors?.niche_competitors?.length && 
             !product.competitors?.broader_competitors?.length)}
          className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-150 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Competitors...
            </>
          ) : (
            <>
              <BarChart className="w-5 h-5" />
              Analyze Competitors
            </>
          )}
        </button>
      </div>
      
      {/* Manual competitor entry */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-150"
        >
          <Plus size={16} />
          Add Competitor Manually
        </button>
      ) : (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-gray-900">Add New Competitor</h5>
            <button 
              onClick={() => setShowForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Competitor Type</label>
              <select 
                value={newCompetitor.type}
                onChange={(e) => setNewCompetitor({...newCompetitor, type: e.target.value as CompetitorType})}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="direct_competitors">Direct</option>
                <option value="niche_competitors">Niche</option>
                <option value="broader_competitors">Broader</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category/Segment</label>
              <input
                type="text"
                value={newCompetitor.category}
                onChange={(e) => setNewCompetitor({...newCompetitor, category: e.target.value})}
                placeholder="e.g. Software as a Service"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={newCompetitor.company_name}
                onChange={(e) => setNewCompetitor({...newCompetitor, company_name: e.target.value})}
                placeholder="e.g. Acme Inc."
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={newCompetitor.product_name}
                onChange={(e) => setNewCompetitor({...newCompetitor, product_name: e.target.value})}
                placeholder="e.g. Acme Pro"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleAddCompetitor}
              disabled={!newCompetitor.company_name || !newCompetitor.product_name}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      )}

      {/* Competitors Display */}
      <div className="space-y-3">
        {renderCompetitorSection('Direct Competitors', 'direct_competitors', 
          Array.isArray(product.competitors?.direct_competitors) ? product.competitors.direct_competitors : [])}
        {renderCompetitorSection('Niche Competitors', 'niche_competitors', 
          Array.isArray(product.competitors?.niche_competitors) ? product.competitors.niche_competitors : [])}
        {renderCompetitorSection('Broader Competitors', 'broader_competitors', 
          Array.isArray(product.competitors?.broader_competitors) ? product.competitors.broader_competitors : [])}
      </div>
      
      {/* Empty state message */}
      {!product.competitors && (
        <p className="text-sm text-gray-500 italic">
          No competitor analysis available yet. Click the button above to generate one.
        </p>
      )}
    </div>
  );
} 