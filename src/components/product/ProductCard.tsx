import React from 'react';
import { motion } from 'framer-motion';
import { ProductAnalysis } from '../../types/product/types';
import { supabase } from '../../lib/supabase';
import { ProductHeader } from './ProductHeader';
import { ProductSection } from './ProductSection';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { ProductDescription } from './ProductDescription';
import { TargetPersona } from './TargetPersona';
import { Capabilities } from './Capabilities';
import { Loader2, Save, CheckSquare, Send, FileText, ExternalLink } from 'lucide-react';
import { sendToAirOps } from '../../lib/airops';
import { toast } from 'react-hot-toast';

interface ProductCardProps {
  product: ProductAnalysis;
  index: number;
  isActionLoading: boolean;
  onSave: (product: ProductAnalysis, index: number) => Promise<void>;
  onApprove: (product: ProductAnalysis, index: number) => Promise<void>;
  onUpdateSection: (productIndex: number, section: keyof ProductAnalysis, value: any) => void;
  updateProduct: (product: ProductAnalysis) => void;
  isMultipleProducts: boolean;
  isAdmin?: boolean;
  onClose?: () => void;
  research_result_id?: string; // Added this field
}

function ProductCard({
  product,
  index,
  isActionLoading,
  onSave,
  onApprove,
  onUpdateSection,
  updateProduct,
  isMultipleProducts = false,
  isAdmin = false,
  onClose,
  research_result_id,
}: ProductCardProps) {
  // Cascade: Log product prop on re-render
  console.log('[ProductCard] Rendering with product:', 
    {
      companyName: product.companyName,
      productName: product.productDetails?.name, // Corrected path
      usps: product.usps,
      features: product.features,
      painPoints: product.painPoints,
      // Add other key parts of 'product' if needed for debugging
      // Be mindful of logging very large objects to the console
      competitorAnalysisUrl: product.competitorAnalysisUrl,
      isApproved: product.isApproved
    }
  );

  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [originalApprovedProduct, setOriginalApprovedProduct] = React.useState<ProductAnalysis | null>(null);
  const [isSendingToAirOps, setIsSendingToAirOps] = React.useState(false);
  // Store the competitorAnalysisUrl in local state to ensure persistence
  const [docUrl, setDocUrl] = React.useState<string | undefined>(product.competitorAnalysisUrl);
  
  // Update the local URL state when the product's URL changes
  React.useEffect(() => {
    if (product.competitorAnalysisUrl && product.competitorAnalysisUrl !== docUrl) {
      console.log("Updating docUrl state with new URL:", product.competitorAnalysisUrl);
      setDocUrl(product.competitorAnalysisUrl);
      
      // Store in localStorage too
      storeCompetitorAnalysisUrl(
        product.competitorAnalysisUrl, 
        product.productDetails?.name || `product-${index}`
      );
    }
  }, [product.competitorAnalysisUrl, index, docUrl]);

  // Load the URL from localStorage when component mounts
  React.useEffect(() => {
    try {
      // Get the product ID to use as the key
      const productId = product.productDetails?.name || `product-${index}`;
      
      // Get existing URLs from localStorage
      const existingUrls = localStorage.getItem('competitorAnalysisUrls');
      const urlsObject = existingUrls ? JSON.parse(existingUrls) : {};
      
      // If we have a URL for this product in localStorage
      if (urlsObject[productId]) {
        const storedUrl = urlsObject[productId];
        console.log(`Loading stored URL for ${productId} from localStorage:`, storedUrl);
        
        // Only update if we don't already have a URL in the product
        if (!product.competitorAnalysisUrl) {
          console.log("No URL in product, setting from localStorage");
          setDocUrl(storedUrl);
          
          // Update the product object with the URL from localStorage
          const updatedProduct = {
            ...product,
            competitorAnalysisUrl: storedUrl,
            google_doc: storedUrl
          };
          
          // Update the product in the parent component
          updateProduct(updatedProduct);
        }
      }
    } catch (e) {
      console.error("Error loading URL from localStorage:", e);
    }
  }, [product.productDetails?.name, index]);

  // Track the original approved state
  React.useEffect(() => {
    // If product becomes approved, save the original state
    if ((product.isApproved === true || !!product.approvedBy) && !originalApprovedProduct) {
      console.log('[ProductCard] Saving original approved product state:', product.productDetails?.name);
      setOriginalApprovedProduct(JSON.parse(JSON.stringify(product)));
    }
    
    // If product was previously approved, check for changes
    if (originalApprovedProduct) {
      const currentProductStr = JSON.stringify(product);
      const originalProductStr = JSON.stringify(originalApprovedProduct);
      
      // If content changed (excluding approval metadata), mark as having unsaved changes
      const hasChanged = currentProductStr !== originalProductStr;
      setHasUnsavedChanges(hasChanged);
      
      console.log(`[ProductCard] Product ${product.productDetails?.name} changes detected:`, 
        hasChanged ? 'Product has been modified since approval' : 'No changes since approval');
    }
  }, [product, originalApprovedProduct]);

  // Reset original state if explicitly requested
  const resetOriginalState = () => {
    setOriginalApprovedProduct(null);
    setHasUnsavedChanges(false);
  };
  
  // Each section is collapsed by default
  React.useEffect(() => {
    if (product.productDetails?.name && Object.keys(expandedSections).length === 0) {
      const initialExpanded: Record<string, boolean> = {
        [`${product.productDetails.name}-description`]: true, // Only description expanded by default
        [`${product.productDetails.name}-usps`]: false,
        [`${product.productDetails.name}-painPoints`]: false,
        [`${product.productDetails.name}-features`]: false,
        [`${product.productDetails.name}-persona`]: false,
        [`${product.productDetails.name}-capabilities`]: false,
      };
      setExpandedSections(initialExpanded);
    }
  }, [product.productDetails?.name, expandedSections]);

  const toggleSection = (section: string) => {
    const productName = product.productDetails?.name || `Product-${index}`;
    const sectionKey = `${productName}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const isSectionExpanded = (section: string) => {
    const productName = product.productDetails?.name || `Product-${index}`;
    const sectionKey = `${productName}-${section}`;
    return expandedSections[sectionKey] || false;
  };

  // Helper for updating nested properties
  const updateNestedProperty = (obj: any, path: string[], value: any) => {
    const newObj = { ...obj };
    let current = newObj;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    return newObj;
  };

  // Custom approve handler that handles re-approvals
  const handleApprove = async () => {
    if (isActionLoading) return;

    try {
      // Get current user details from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);

      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_name')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        toast.error('Error fetching user profile');
        return;
      }

      console.log('User profile:', userProfile);

      // Update product with user details
      const productWithUser = {
        ...product,
        userUUID: user?.id,
        userEmail: user?.email,
        userCompanyName: userProfile?.company_name
      };

      console.log('Product with user details:', productWithUser);
      await onApprove(productWithUser, index);
    } catch (error) {
      console.error('Error in handleApprove:', error);
      toast.error('Error approving product');
    }
  };

  const handleSendToAirOps = async () => {
    // Show initial loading toast
    const loadingToast = toast.loading(
      <div className="flex items-center gap-3">
        <div className="animate-pulse">🚀</div>
        <div>
          <p className="font-medium">Initiating AirOps Automation</p>
          <p className="text-sm text-white dark:text-gray-100">Preparing your content brief...</p>
        </div>
      </div>
    );
    
    setIsSendingToAirOps(true);
    
    try {
      // Check if there's a competitorAnalysisUrl we can use
      let googleDocUrl = product.competitorAnalysisUrl;
      
      // If not, use the default public URL from the example
      if (!googleDocUrl || !googleDocUrl.includes('docs.google.com/document')) {
        googleDocUrl = "https://docs.google.com/document/d/1qxocRF9_MXzQXnWxTJgteIZGzYbY6vppKlQ4OfqFZ9s";
        console.log('Using default Google Doc URL:', googleDocUrl);
      }
      
      // Create a product with the required google_doc field
      const productForAirOps = {
        ...product,
        google_doc: googleDocUrl,
        businessOverview: product.businessOverview || {
          mission: '',
          industry: '',
          keyOperations: ''
        },
        pricing: product.pricing || '',
        currentSolutions: product.currentSolutions || {
          directCompetitors: [],
          existingMethods: []
        }
      } as ProductAnalysis & { google_doc: string };
      
      // Log what we're sending
      console.log('Sending to AirOps with Google Doc URL:', googleDocUrl);
      
      // Structure the data in the format expected by AirOps
      // Get research_result_id from URL if available
      let resultId = research_result_id;
      
      // Try to get from URL if not passed as prop
      if (!resultId) {
        // Try to extract from URL if available 
        try {
          const url = new URL(window.location.href);
          const urlParams = new URLSearchParams(url.search);
          const researchId = urlParams.get('research_id') || urlParams.get('research_result_id');
          if (researchId) {
            console.log('Found research_result_id in URL:', researchId);
            resultId = researchId;
          }
        } catch (e) {
          console.log('Could not extract research_result_id from URL');
        }
      }

      console.log('Using research_result_id:', resultId);

      const preparedProduct = {
        product_card_information: productForAirOps,
        research_result_Id: resultId // Note: Capital 'I' to match Airops input field
      };
      
      console.log('Sending to AirOps:', preparedProduct);
      await sendToAirOps(preparedProduct);

      // Dismiss loading toast and show success message
      toast.dismiss(loadingToast);
      toast.custom((t) => (
        <div className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-green-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-green-900">
                  AirOps Automation Started
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Your content brief will be ready in AirOps in a few minutes. We'll notify you when it's complete.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-600 hover:text-green-500 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      ), {
        duration: 6000,
      });

    } catch (error: any) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      console.error('Full error details:', error);
      
      // Show appropriate error message with custom styling
      const errorConfig = {
        duration: 6000,
        className: 'bg-red-50 text-red-900 rounded-lg shadow-lg border border-red-200',
      };

      if (error.message && error.message.includes('ACCOUNT_LIMITATION')) {
        toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-red-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-red-900">
                    Account Limitation
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    Your AirOps account needs to be upgraded. Please contact AirOps support for assistance.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
        ), errorConfig);
      } else if (error.message && error.message.includes('NetworkError')) {
        toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-red-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-2xl">🌐</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-red-900">
                    Network Error
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    Please check your internet connection and try again.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
              >
                Retry
              </button>
            </div>
          </div>
        ), errorConfig);
      } else if (error.message && error.message.includes('Failed to fetch')) {
        toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-red-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-red-900">
                    Connection Failed
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    Unable to connect to AirOps. This might be due to CORS restrictions or server issues.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), errorConfig);
      } else {
        toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-red-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-2xl">❌</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-red-900">
                    Error
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), errorConfig);
      }
    } finally {
      setIsSendingToAirOps(false);
    }
  };

  // Use the single loading prop for button states
  const isThisProductSaving = isActionLoading;
  const isThisProductApproving = isActionLoading;

  const onChange = ({ target: { name, value } }: { target: { name: string; value: string } }) => {
    // Handle form changes
    setDocUrl(value);
  };

  // Utility function to store the competitor analysis URL in localStorage
  const storeCompetitorAnalysisUrl = (url: string, productKey: string): void => {
    try {
      // Get existing URLs from localStorage
      const existingUrls = localStorage.getItem('competitorAnalysisUrls');
      const urlsObject = existingUrls ? JSON.parse(existingUrls) : {};
      
      // Update with new URL
      urlsObject[productKey] = url;
      
      // Save back to localStorage
      localStorage.setItem('competitorAnalysisUrls', JSON.stringify(urlsObject));
      console.log(`Stored URL for ${productKey} in localStorage:`, url);
    } catch (e) {
      console.error("Error storing URL in localStorage:", e);
    }
  };

  const handleSaveDocUrl = () => {
    if (docUrl && docUrl.trim()) {
      // Store URL in localStorage
      storeCompetitorAnalysisUrl(docUrl, product.productDetails?.name || `product-${index}`);
      
      // Update the product with the URL
      const updatedProduct = {
        ...product,
        competitorAnalysisUrl: docUrl,
        google_doc: docUrl
      };
      
      // Update product in parent component
      updateProduct(updatedProduct);
      
      // Execute save product function if provided
      onSave(updatedProduct, index);
      
      // Provide user feedback
      toast.success('Document URL saved successfully');
    } else {
      toast.error('Please enter a valid document URL');
    }
  };

  return (
    <motion.article
      key={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`bg-secondary-900/90 backdrop-blur-sm rounded-2xl shadow-glow overflow-hidden border border-primary-500/20 hover:shadow-glow-strong transition-all duration-500 ${
        !isMultipleProducts ? 'mx-auto w-full' : ''
      }`}
    >
      <ProductHeader 
        product={product}
        index={index}
        updateProduct={(updatedProduct) => updateProduct(updatedProduct)}
      />

      {/* Product Analysis Results Title */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/30 to-primary-500/10 backdrop-blur-sm"></div>
        <div className="relative px-6 py-4">
          <h1 className="text-2xl font-bold text-white dark:text-gray-100">Competitor Analysis Results</h1>
          <p className="text-sm text-white dark:text-gray-100 mt-1">Comprehensive analysis of your product's market position</p>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-6 space-y-6 relative">
        <ProductDescription
          description={product.productDetails?.description || 'No description available'}
          onUpdate={(description) => {
            const updatedProduct = updateNestedProperty(
              product, 
              ['productDetails', 'description'], 
              description
            );
            updateProduct(updatedProduct);
            onSave(updatedProduct, index);
          }}
          isExpanded={isSectionExpanded('description')}
          toggleExpanded={() => toggleSection('description')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          <ProductSection
            title="Unique Selling Points"
            items={product.usps || []}
            onUpdate={(updatedSectionItems) => {
              console.log(`[ProductCard] onUpdate (for USPs) called with updatedSectionItems:`, JSON.parse(JSON.stringify(updatedSectionItems)));
              onUpdateSection(index, 'usps', updatedSectionItems);
            }}
            isExpanded={isSectionExpanded('usps')}
            toggleExpanded={() => toggleSection('usps')}
            sectionType="usps"
            isSaving={isActionLoading}
          />

          <ProductSection
            title="Pain Points Solved"
            items={product.painPoints || []}
            onUpdate={(updatedSectionItems) => {
              console.log(`[ProductCard] onUpdate (for PainPoints) called with updatedSectionItems:`, JSON.parse(JSON.stringify(updatedSectionItems)));
              onUpdateSection(index, 'painPoints', updatedSectionItems);
            }}
            isExpanded={isSectionExpanded('painPoints')}
            toggleExpanded={() => toggleSection('painPoints')}
            sectionType="painPoints"
            isSaving={isActionLoading}
          />
        </div>

        <ProductSection
          title="Features"
          items={product.features || []}
          onUpdate={(updatedSectionItems) => {
            console.log(`[ProductCard] onUpdate (for Features) called with updatedSectionItems:`, JSON.parse(JSON.stringify(updatedSectionItems)));
            onUpdateSection(index, 'features', updatedSectionItems);
          }}
          isExpanded={isSectionExpanded('features')}
          toggleExpanded={() => toggleSection('features')}
          sectionType="features"
          isSaving={isActionLoading}
        />

        <TargetPersona
          persona={product.targetPersona}
          onUpdate={(persona) => onUpdateSection(index, 'targetPersona', persona)}
          isExpanded={isSectionExpanded('persona')}
          toggleExpanded={() => toggleSection('persona')}
        />

        <Capabilities
          capabilities={product.capabilities || []}
          onUpdate={(capabilities) => onUpdateSection(index, 'capabilities', capabilities)}
          isExpanded={isSectionExpanded('capabilities')}
          toggleExpanded={() => toggleSection('capabilities')}
        />

        <CompetitorAnalysis 
          product={product}
          onUpdate={(url) => {
            console.log("Received competitorAnalysisUrl update:", url);
            
            if (!url) {
              console.log("Received empty URL, skipping update");
              return;
            }
            
            let formattedUrl;
            
            // Check if the URL is a valid web URL
            try {
              // Try to format it as a proper URL
              const urlObj = new URL(url);
              
              // Check if it's a Google Docs URL and format it correctly
              if (url.includes('docs.google.com/document')) {
                // Extract the document ID
                const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
                if (!match) {
                  toast.error('Invalid Google Docs URL format');
                  return;
                }
                
                const docId = match[1];
                
                // Format the URL in the required format - without suffix
                formattedUrl = `https://docs.google.com/document/d/${docId}`;
                console.log("Formatted Google Doc URL:", formattedUrl);
              } else {
                // Use the URL as is if it's valid but not a Google Docs URL
                formattedUrl = urlObj.toString();
                console.log('URL is not a Google Docs document URL:', formattedUrl);
              }

              // If we got a valid formatted URL, update the product while preserving competitors
              if (formattedUrl) {
                const updatedProduct = { 
                  ...product, 
                  competitorAnalysisUrl: formattedUrl,
                  google_doc: formattedUrl,
                  // Preserve existing competitors data
                  competitors: {
                    direct_competitors: product.competitors?.direct_competitors || [],
                    niche_competitors: product.competitors?.niche_competitors || [],
                    broader_competitors: product.competitors?.broader_competitors || []
                  }
                };
                
                // Update our local URL state
                setDocUrl(formattedUrl);
                
                // Store in localStorage for the floating button
                storeCompetitorAnalysisUrl(formattedUrl, product.productDetails?.name || `product-${index}`);
                
                console.log("Updating product with formatted URL while preserving competitors:", updatedProduct);
                updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
                onSave(updatedProduct, index);
                
                // Provide user feedback
                toast.success('Competitor analysis report is ready!');
              }
            } catch (e) {
              // If not a valid URL, try parsing as JSON
              try {
                const jsonData = JSON.parse(url);
                console.log("Successfully parsed response as JSON:", jsonData);
                
                // Try to extract a URL from the JSON
                const extractedUrl = jsonData.documentUrl || jsonData.analysisUrl || jsonData.url || jsonData.google_doc;
                
                if (extractedUrl && typeof extractedUrl === 'string') {
                  try {
                    // Validate the extracted URL
                    new URL(extractedUrl);
                    
                    // Format if it's a Google Docs URL
                    if (extractedUrl.includes('docs.google.com/document')) {
                      const match = extractedUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
                      if (!match) {
                        toast.error('Invalid Google Docs URL format in response');
                        return;
                      }
                      
                      const docId = match[1];
                      formattedUrl = `https://docs.google.com/document/d/${docId}`;
                      console.log("Formatted Google Doc URL from JSON:", formattedUrl);
                    } else {
                      formattedUrl = extractedUrl;
                    }

                    // Update product with URL while preserving existing competitors
                    const updatedProduct = { 
                      ...product, 
                      competitorAnalysisUrl: formattedUrl,
                      google_doc: formattedUrl,
                      // Preserve existing competitors data
                      competitors: {
                        direct_competitors: product.competitors?.direct_competitors || [],
                        niche_competitors: product.competitors?.niche_competitors || [],
                        broader_competitors: product.competitors?.broader_competitors || []
                      }
                    };
                    
                    // Update our local URL state
                    setDocUrl(formattedUrl);
                    
                    // Store in localStorage for the floating button
                    storeCompetitorAnalysisUrl(formattedUrl, product.productDetails?.name || `product-${index}`);
                    
                    console.log("Updating product with formatted URL while preserving competitors:", updatedProduct);
                    updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
                    onSave(updatedProduct, index);
                    
                    // Provide user feedback
                    toast.success('Competitor analysis report is ready!');
                  } catch (urlError) {
                    console.error("Invalid URL extracted from JSON:", urlError);
                    toast.error('Invalid URL in response data');
                    return;
                  }
                } else if (jsonData.competitors) {
                  // Handle competitor data but no URL
                  console.log("Found competitors in the JSON but no URL");
                  
                  const competitors = {
                    direct_competitors: Array.isArray(jsonData.competitors.direct_competitors) 
                      ? [...jsonData.competitors.direct_competitors] : product.competitors?.direct_competitors || [],
                    niche_competitors: Array.isArray(jsonData.competitors.niche_competitors)
                      ? [...jsonData.competitors.niche_competitors] : product.competitors?.niche_competitors || [],
                    broader_competitors: Array.isArray(jsonData.competitors.broader_competitors)
                      ? [...jsonData.competitors.broader_competitors] : product.competitors?.broader_competitors || []
                  };
                  
                  // Keep existing URL if available
                  formattedUrl = product.competitorAnalysisUrl;
                  
                  // Update the product with competitors data while preserving existing data
                  const updatedProduct = { 
                    ...product, 
                    competitors: competitors,
                    competitorAnalysisUrl: formattedUrl
                  };
                  
                  console.log("Updating product with competitors:", updatedProduct);
                  updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
                  onSave(updatedProduct, index);
                  return;
                }
              } catch (jsonError) {
                console.error("Response is not a valid JSON string:", jsonError);
                toast.error('Invalid data received');
                return;
              }
            }
          }}
          onUpdateCompetitors={(competitors) => {
            console.log("ProductCard.onUpdateCompetitors called with:", JSON.stringify(competitors, null, 2));
            
            // Get the existing URL if available
            const existingUrl = product.competitorAnalysisUrl;
            console.log("Existing competitorAnalysisUrl:", existingUrl);
            
            // Create a copy of the product with the updated competitors
            const updatedProduct = { 
              ...product, 
              competitors: {
                direct_competitors: Array.isArray(competitors.direct_competitors) 
                  ? [...competitors.direct_competitors] : [],
                niche_competitors: Array.isArray(competitors.niche_competitors)
                  ? [...competitors.niche_competitors] : [],
                broader_competitors: Array.isArray(competitors.broader_competitors)
                  ? [...competitors.broader_competitors] : []
              }
            };
            
            // Make sure we never lose the URL
            if (existingUrl) {
              updatedProduct.competitorAnalysisUrl = existingUrl;
              console.log("Preserving existing competitorAnalysisUrl:", updatedProduct.competitorAnalysisUrl);
              
              // Make sure our local state also keeps the URL
              setDocUrl(existingUrl);
            }
            
            console.log("Updating product with competitors:", updatedProduct.competitors);
            
            // Update the product in the local state with deep copy to avoid reference issues
            updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
            
            // Automatically save the product after updating
            console.log("Automatically saving product after competitor update");
            onSave(updatedProduct, index);
          }}
        />

        {/* Buttons Section */}
        <div className="flex flex-wrap gap-3 justify-end mt-6">
          {/* Competitor Analysis Doc Button - if available */}
          {docUrl && (
            <CompetitorAnalysisDocButton url={docUrl} />
          )}
        
          {/* Only render the Send to AirOps button if user is admin */}
          {isAdmin && (
            <button
              onClick={handleSendToAirOps}
              disabled={isSendingToAirOps}
              className="flex items-center gap-2 px-4 py-2 bg-purple-700/80 rounded-md text-white hover:bg-purple-600 transition-colors"
            >
              {isSendingToAirOps ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to AirOps
            </button>
          )}
          
          <button
            onClick={() => onSave(product, index)}
            disabled={isThisProductSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-md text-white hover:bg-gray-700 transition-colors"
          >
            {isThisProductSaving ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
          
          {/* Only show approve button if not in admin mode */}
          {!isAdmin && (
            <button
              onClick={handleApprove}
              disabled={isThisProductApproving || (!!product.isApproved && !hasUnsavedChanges)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-white transition-colors ${
                product.isApproved && !hasUnsavedChanges
                  ? 'bg-green-500/30 cursor-not-allowed'
                  : 'bg-green-600/80 hover:bg-green-500'
              }`}
            >
              {isThisProductApproving ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <CheckSquare className="h-4 w-4" />
              )}
              {product.isApproved && !hasUnsavedChanges
                ? 'Approved'
                : product.isApproved && hasUnsavedChanges
                ? 'Re-approve'
                : 'Approve'}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export { ProductCard };

// Add this component to render a global floating button for all doc URLs
function FloatingDocButton() {
  // Get all the doc URLs from localStorage
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  
  // Add a URL to the registry
  React.useEffect(() => {
    // Load any saved URLs from localStorage
    try {
      const savedUrls = localStorage.getItem('competitorAnalysisUrls');
      if (savedUrls) {
        setUrls(JSON.parse(savedUrls));
      }
    } catch (e) {
      console.error("Error loading URLs from localStorage:", e);
    }
    
    // Set up listener for storing URLs
    const handleStorageUrl = (event: StorageEvent) => {
      if (event.key === 'competitorAnalysisUrls') {
        try {
          const newUrls = event.newValue ? JSON.parse(event.newValue) : {};
          setUrls(newUrls);
        } catch (e) {
          console.error("Error parsing URLs from storage event:", e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageUrl);
    return () => window.removeEventListener('storage', handleStorageUrl);
  }, []);
  
  // Extract the most recent URL
  const mostRecentUrl = Object.values(urls).length > 0 
    ? Object.values(urls)[Object.values(urls).length - 1] 
    : null;
  
  if (!mostRecentUrl) return null;
  
  return (
    <a
      href={mostRecentUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        try {
          window.open(mostRecentUrl, '_blank');
        } catch (err) {
          console.error('Error opening URL:', err);
          toast.error('Could not open document URL');
        }
      }}
      className="fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-secondary-900 font-bold rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all shadow-xl hover:shadow-2xl group"
    >
      <div className="w-10 h-10 rounded-full bg-secondary-900/40 border border-secondary-900/10 flex items-center justify-center">
        <FileText size={20} className="text-secondary-900" />
      </div>
      <span className="text-lg">View Competitor Analysis</span>
      <ExternalLink size={20} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}

// Helper function to store a URL in localStorage
export function storeCompetitorAnalysisUrl(url: string, productId: string) {
  try {
    // Get existing URLs
    const existingUrls = localStorage.getItem('competitorAnalysisUrls');
    const urlsObject = existingUrls ? JSON.parse(existingUrls) : {};
    
    // Add this URL
    urlsObject[productId || 'latest'] = url;
    
    // Save back to localStorage
    localStorage.setItem('competitorAnalysisUrls', JSON.stringify(urlsObject));
    
    // Trigger the storage event manually (for the same window)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'competitorAnalysisUrls',
      newValue: JSON.stringify(urlsObject)
    }));
    
    console.log(`Stored URL ${url} for product ${productId}`);
  } catch (e) {
    console.error("Error storing URL in localStorage:", e);
  }
}

// Add this new component above the ProductCard export
function CompetitorAnalysisDocButton({ url }: { url: string }) {
  if (!url) return null;
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        try {
          // Validate the URL
          const validUrl = new URL(url);
          window.open(validUrl.toString(), '_blank');
        } catch (err) {
          console.error('Invalid URL:', err);
          toast.error('Invalid document URL.');
        }
      }}
      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-secondary-900 font-medium rounded-md hover:bg-yellow-400 transition-colors shadow-md"
    >
      <FileText size={16} className="text-secondary-900" />
      <span>View Analysis</span>
      <ExternalLink size={14} className="ml-1" />
    </a>
  );
}