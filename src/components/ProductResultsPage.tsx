import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { 
  saveResearchResults, 
  updateResearchResults, 
  saveApprovedProduct 
} from '../lib/research';
import { ProductCard } from './product/ProductCard';
import { ProductAnalysis } from '../types/product';
import { Plus, Loader2, Home, Save, ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainHeader } from './MainHeader';
import ChatWindow from './ChatWindow';

export interface ProductResultsPageProps {
  products: ProductAnalysis[];
  onStartNew: () => void;
  existingId?: string;
  showHistory?: boolean;
  setShowHistory?: (show: boolean) => void;
  forceHistoryView?: () => void;
  onHistorySave?: () => Promise<void>;
  onSaveComplete?: (newId: string) => void;
}

function ProductResultsPage({ 
  products, 
  onStartNew, 
  existingId,
  showHistory,
  setShowHistory,
  forceHistoryView,
  onHistorySave,
  onSaveComplete
}: ProductResultsPageProps) {
  const [editedProducts, setEditedProducts] = useState(products);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingIndex, setActionLoadingIndex] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasSavedToHistory, setHasSavedToHistory] = useState(!!existingId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const params = useParams();
  
  // Get the current product ID from the URL params
  const currentProductId = params.id === 'new' ? undefined : params.id;
  
  // Replace the state with a ref to better track across renders
  const initialSaveRef = useRef({
    inProgress: false,
    completed: false,
    attemptCount: 0,
    savedId: null as string | null,
    productsHash: ""
  });

  // Create a function to generate a hash of products for comparing
  const getProductsHash = (prods: ProductAnalysis[]) => {
    if (!prods || prods.length === 0) return "";
    // Use first product company + length as a simple hash
    return `${prods[0]?.companyName || "unknown"}-${prods.length}`;
  };

  // Get the current user from Supabase
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getCurrentUser();
  }, []);

  // Add logging for component mounting and prop changes
  React.useEffect(() => {
    console.log("ProductResultsPage mounted or updated with props:", { 
      productsCount: products.length,
      showHistory,
      setShowHistoryType: typeof setShowHistory,
      productId: currentProductId || 'new'
    });
    
    // Try to restore products from session storage
    const savedProducts = sessionStorage.getItem('bofu_edited_products');
    if (savedProducts) {
      try {
        const parsedProducts = JSON.parse(savedProducts);
        if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
          setEditedProducts(parsedProducts);
          console.log("Restored products from session storage:", parsedProducts.length);
        }
      } catch (error) {
        console.error("Error parsing saved products:", error);
      }
    }
    
    return () => {
      console.log("ProductResultsPage unmounting");
    };
  }, [products, showHistory, setShowHistory, currentProductId]);

  // Update the products state when props change
  React.useEffect(() => {
    console.log("Products prop changed:", { 
      productCount: products?.length || 0, 
      hasProducts: Array.isArray(products) && products.length > 0
    });
    
    if (Array.isArray(products) && products.length > 0) {
      setEditedProducts(products);
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(products));
      
      // If there's an existingId, we have already saved the results
      if (existingId || currentProductId) {
        setHasSavedToHistory(true);
      } else {
        setHasSavedToHistory(false);
        setHasUnsavedChanges(true);
      }
      
      // Important: force a re-render to ensure products are displayed
      console.log("Setting products to state:", products.length);
      
      // Log first product for debugging
      if (products[0]) {
        console.log("First product sample:", {
          companyName: products[0].companyName,
          productName: products[0].productDetails?.name,
          hasCompetitors: !!products[0].competitors
        });
      }
    } else {
      console.warn("Received empty or invalid products array", products);
      
      // Try to restore products from session storage
      const savedProducts = sessionStorage.getItem('bofu_edited_products');
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts);
          if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
            console.log("Restored products from session storage:", parsedProducts.length);
            setEditedProducts(parsedProducts);
          }
        } catch (error) {
          console.error("Error parsing saved products:", error);
        }
      }
    }
  }, [products, existingId, currentProductId]);

  // Reset the initialSaveRef when existingId changes or component unmounts
  React.useEffect(() => {
    const effectiveId = existingId || currentProductId;
    
    if (effectiveId) {
      // We already have an ID, so no need for initial save
      initialSaveRef.current = {
        inProgress: false,
        completed: true,
        attemptCount: 0,
        savedId: effectiveId,
        productsHash: getProductsHash(products)
      };
    }
    
    return () => {
      // Reset on unmount
      initialSaveRef.current = {
        inProgress: false,
        completed: false,
        attemptCount: 0,
        savedId: null,
        productsHash: ""
      };
    };
  }, [existingId, currentProductId, products]);

  // Sync products to session storage and notify parent
  React.useEffect(() => {
    if (editedProducts.length > 0) {
      // Only sync to session storage and notify parent
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
      console.log("Synced products to session storage:", editedProducts.length);
      
      // Notify parent component of the changes
      if (editedProducts !== products) {
        window.dispatchEvent(new CustomEvent('productsUpdated', { 
          detail: { products: editedProducts } 
        }));
      }
    }
  }, [editedProducts, products]);

  // Handle save all products to history
  const handleSaveAllToHistory = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Create title from the first product
      const title = editedProducts.length === 1 
        ? `${editedProducts[0]?.companyName || 'Unknown'} - ${editedProducts[0]?.productDetails?.name || 'Product'}`
        : `${editedProducts[0]?.companyName || 'Unknown'} - ${editedProducts.length} Products`;
      
      const effectiveId = existingId || currentProductId;
      
      if (effectiveId) {
        // Update existing history entry
        await updateResearchResults(effectiveId, editedProducts, title, false);
        toast.success('Analysis updated in history');
      } else {
        // Create new history entry
        const newId = await saveResearchResults(editedProducts, title, false);
        
        // Update URL to reflect the saved ID
        navigate(`/product/${newId}`, { replace: true });
        
        // Update the app state with the new ID
        if (onSaveComplete) {
          onSaveComplete(newId);
        }
        
        setHasSavedToHistory(true);
        toast.success('Analysis saved to history');
      }
      
      // Refresh the history list
      if (onHistorySave) {
        await onHistorySave();
      }
      
      // Reset the unsaved changes flag
      setHasUnsavedChanges(false);
      
    } catch (error: any) {
      console.error('Error saving to history:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle individual product save function required by ProductCard
  const handleProductSave = async (product: ProductAnalysis, index: number): Promise<void> => {
    if (actionLoadingIndex !== null || isSaving) {
      return;
    }
    
    setActionLoadingIndex(index);
    
    try {
      // Create a deep copy
      const productDeepCopy = JSON.parse(JSON.stringify(product));
      const currentProducts = [...editedProducts];
      currentProducts[index] = productDeepCopy;
      
      const effectiveId = existingId || currentProductId;
      
      if (effectiveId) {
        // If we have an ID, update the existing entry with this product change
        await updateResearchResults(
          effectiveId,
          currentProducts,
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
        
        toast.success(`Updated "${product.productDetails?.name || 'Product'}" analysis`);
        
        // Refresh history
        if (onHistorySave) {
          await onHistorySave();
        }
        
        // Reset unsaved changes flag
        setHasUnsavedChanges(false);
      } else {
        // Just update local state and indicate unsaved changes
        toast.success(`Changes saved locally. Click "Save to History" to permanently save.`);
        setHasUnsavedChanges(true);
      }
      
      // Always update the local state
      setEditedProducts(currentProducts);
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(currentProducts));
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  };

  // Handle updating a section of a product
  const handleUpdateSection = async (productIndex: number, section: keyof ProductAnalysis, value: any): Promise<void> => {
    console.log(`ProductResultsPage.handleUpdateSection called for product index ${productIndex}, section ${String(section)}`, value);

    const productToUpdate = editedProducts[productIndex];
    const updatedProductData = {
      ...productToUpdate,
      [section]: value
    };

    // Optimistically update local state
    setEditedProducts(prevProducts => {
      const newProducts = [...prevProducts];
      newProducts[productIndex] = updatedProductData;
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(newProducts)); // Also update session storage
      return newProducts;
    });

    // If this is an existing historical record (i.e., we have an ID for the research result from the URL or props)
    const currentRecordId = existingId || currentProductId; // Use existingId from props first, then from URL params

    if (currentRecordId) {
      setHasUnsavedChanges(false); // Assume we'll try to save, reset general unsaved flag for this section edit
      setIsSaving(true); 
      setActionLoadingIndex(productIndex);
      try {
        // Fetch the current full historical record from 'research_results' table
        const { data: currentResearchResult, error: fetchError } = await supabase
          .from('research_results')
          .select('data')
          .eq('id', currentRecordId)
          .single();

        if (fetchError) {
          toast.error(`Failed to fetch history: ${fetchError.message}`);
          setHasUnsavedChanges(true); // Save failed, so there are still unsaved changes
          setIsSaving(false);
          setActionLoadingIndex(null);
          return;
        }

        if (!currentResearchResult || !Array.isArray(currentResearchResult.data)) {
          toast.error('Invalid historical data format found.');
          setHasUnsavedChanges(true);
          setIsSaving(false);
          setActionLoadingIndex(null);
          return;
        }
        
        // The 'data' field in research_results is an array of ProductAnalysis objects
        const historicalProducts: ProductAnalysis[] = [...currentResearchResult.data]; // Create a mutable copy

        // Ensure the productIndex is valid for the fetched historical data
        if (productIndex < 0 || productIndex >= historicalProducts.length) {
          toast.error('Product index out of bounds for historical data.');
          setHasUnsavedChanges(true);
          setIsSaving(false);
          setActionLoadingIndex(null);
          return;
        }
        
        // Update the specific product's section within the historical data array
        historicalProducts[productIndex] = {
          ...historicalProducts[productIndex], // Preserve other fields of the historical product
          [section]: value // Apply the new section value
        };

        // Save the entire modified 'data' array back to Supabase
        const { error: updateError } = await supabase
          .from('research_results')
          .update({ data: historicalProducts, updated_at: new Date().toISOString() })
          .eq('id', currentRecordId);

        if (updateError) {
          toast.error(`Failed to save section: ${updateError.message}`);
          setHasUnsavedChanges(true); // Save failed
        } else {
          toast.success(`${String(section)} saved to history!`);
          // setHasUnsavedChanges(false); // Already set optimistically, confirm here if needed or remove if main save button is still primary
          // If onHistorySave is provided (from App.tsx), call it to refresh the history list
          if (onHistorySave) {
            await onHistorySave();
          }
        }
      } catch (error: any) {
        console.error('Error saving section update to history:', error);
        toast.error(`Save error: ${error.message || 'Unexpected error'}`);
        setHasUnsavedChanges(true); // Save failed
      } finally {
        setIsSaving(false);
        setActionLoadingIndex(null);
      }
    } else {
      // If not an existing historical record, the changes are just local until "Save to History" is clicked.
      setHasUnsavedChanges(true); // Mark general unsaved changes for the main save button
      console.log("Change is local as no existingRecordId. User needs to use 'Save to History'.");
    }
  };

  // Update an entire product
  const handleUpdateProduct = (updatedProductData: ProductAnalysis): void => {
    setEditedProducts(prevProducts =>
      prevProducts.map(p =>
        p.research_result_id === updatedProductData.research_result_id ? updatedProductData : p
      )
    );
    setHasUnsavedChanges(true);
  };

  // Handle approve function required by ProductCard
  const handleProductApprove = async (product: ProductAnalysis, index: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to approve products');
      return;
    }
    
    if (actionLoadingIndex !== null) {
      return;
    }
    
    setActionLoadingIndex(index);
    
    try {
      const effectiveId = existingId || currentProductId;
      
      if (!effectiveId && !hasSavedToHistory) {
        toast.error('You must save to history first before approving products');
        return;
      }
      
      const researchId = effectiveId as string;
      
      // Save the product to the approved_products table
      await saveApprovedProduct(
        researchId,
        product,
        index,
        user.id
      );
      
      toast.success(`Added "${product.productDetails?.name || 'Product'}" to review queue`);
      
      // Mark the product as approved in the local state
      const updatedProducts = [...editedProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        isApproved: true,
        approvedBy: user.id
      };
      
      setEditedProducts(updatedProducts);
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(updatedProducts));
      
      // Update the history entry with the approved flag
      if (effectiveId) {
        await updateResearchResults(
          effectiveId,
          updatedProducts,
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
      }
      
    } catch (error: any) {
      console.error('Error approving product:', error);
      toast.error(`Failed to approve: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  };

  // Add effect to handle page unload
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Save current state before unload
      if (editedProducts.length > 0) {
        sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
        console.log("Saved products before unload:", editedProducts.length);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editedProducts]);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-900 to-secondary-900 text-white"
      style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937)' }}
    >
      <MainHeader 
        user={user} 
        showHistory={showHistory} 
        setShowHistory={setShowHistory} 
      /> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-0"
          >
            <h2 
              className="text-3xl font-bold text-white cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity"
              onClick={onStartNew} 
            >
              <Home size={20} className="text-primary-400"/>
              {editedProducts && editedProducts.length > 0 && editedProducts[0]?.companyName ? `${editedProducts[0].companyName}` : 'Product Analysis'}
            </h2>
            <p className="text-sm text-gray-400">
              {editedProducts ? `${editedProducts.length} product${editedProducts.length === 1 ? '' : 's'} analyzed` : 'No products analyzed'}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            {showHistory && setShowHistory && (
              <button
                onClick={() => setShowHistory(false)} 
                className="px-4 py-2 rounded-lg transition-all flex items-center gap-2
                           text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
              >
                <ArrowLeft size={18} />
                Back to Analysis
              </button>
            )}
            
            {!showHistory && (
              <button 
                onClick={onStartNew} 
                className="px-4 py-2 rounded-lg transition-all flex items-center gap-2
                           text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
              >
                <Plus size={18} className="text-primary-400"/>
                New Analysis
              </button>
            )}
            
            {editedProducts && editedProducts.length > 0 && (
              <button 
                onClick={handleSaveAllToHistory} 
                disabled={isSaving || (!hasUnsavedChanges && hasSavedToHistory)}
                className={`px-4 py-2.5 rounded-lg hover:bg-primary-400 transition-all 
                            shadow-glow hover:shadow-glow-strong flex items-center gap-2 font-medium 
                            ${isSaving || (!hasUnsavedChanges && hasSavedToHistory) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-primary-500 text-secondary-900'}`}
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin"/>
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? 'Saving...' : (currentProductId || existingId ? 'Update in History' : 'Save to History')}
              </button>
            )}
          </motion.div>
        </div>

        <div className="mt-0 pb-12">
          {/* Warning for unsaved changes */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm dark:bg-yellow-900/20 dark:border-yellow-600">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    You have unsaved changes. Click <strong>"{currentProductId ? 'Update in History' : 'Save to History'}"</strong> to permanently save your analysis.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Help text for new users */}
          {!hasSavedToHistory && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded shadow-sm dark:bg-blue-900/20 dark:border-blue-600">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    This analysis has not been saved yet. Edit individual products if needed, then click <strong>"Save to History"</strong> to save this analysis to your history.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Products grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {editedProducts && editedProducts.length > 0 ? (
              editedProducts.map((product, index) => (
              <motion.div
                key={`${product.companyName}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {(() => {
                  console.log('🔍 ProductResultsPage: Rendering ProductCard with IDs:', {
                    researchResultId: existingId,
                    approvedProductId: existingId,
                    productName: product?.productDetails?.name,
                    index
                  });
                  return (
                    <ProductCard 
                      product={product}
                      index={index}
                      onSave={handleProductSave}
                      onApprove={handleProductApprove}
                      onUpdateSection={handleUpdateSection}
                      updateProduct={handleUpdateProduct}
                      isActionLoading={actionLoadingIndex === index}
                      isMultipleProducts={editedProducts.length > 0}
                      isAdmin={false}
                      researchResultId={existingId}
                      approvedProductId={existingId}
                    />
                  );
                })()}
              </motion.div>
              ))
            ) : (
              <div className="col-span-1 lg:col-span-2 p-8 text-center">
                <div className="mb-4">
                  <svg className="w-12 h-12 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m0 16v1m-8-8h1m16 0h1M5.6 5.6l.8.8m12 12l-.8-.8m-12 0l.8-.8m12-12l-.8.8" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-primary-400 mb-2">No Analysis Results Found</h3>
                <p className="text-gray-400 mb-4">We couldn't find any product analysis results to display.</p>
                <button 
                  onClick={onStartNew} 
                  className="px-4 py-2 bg-primary-500 text-secondary-900 rounded-lg font-medium hover:bg-primary-400 transition-colors"
                >
                  Start New Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-full shadow-lg z-50 transition-transform duration-300 ease-in-out transform hover:scale-110"
        aria-label={isChatOpen ? 'Close Chat' : 'Open Chat'}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-20 right-6 z-40 w-full max-w-md h-3/4 max-h-[700px] bg-secondary-800 rounded-lg shadow-xl border border-secondary-700 flex flex-col"
        >
          <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </motion.div>
      )}
    </div>
  );
}

export default ProductResultsPage;