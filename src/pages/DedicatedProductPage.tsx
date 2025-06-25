import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { supabase } from '../lib/supabase'; 
import { Product, ProductDocument, ProductAnalysis, defaultProduct } from '../types/product/types'; 
import { toast } from 'react-hot-toast';
import { makeWebhookRequest } from '../utils/webhookUtils';
import { parseProductData } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { DocumentUploader, ProcessedDocument } from '../components/DocumentUploader'; 
import AssociatedDocumentCard from '../components/product/AssociatedDocumentCard';
import DocumentPreviewModal from '../components/product/DocumentPreviewModal';
import type { ScrapedBlog } from '../utils/blogScraper';
import { ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react'; 
import { MainHeader } from '../components/MainHeader'; 
import ChatWindow from '../components/ChatWindow'; 

// Define a local composite type for the product state on this page
interface PageProductData extends Product { 
  associatedDocuments: ProductDocument[];
  generated_analysis_data?: ProductAnalysis | string | null;
}

export type ValidSupabaseDocumentType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'pptx'
  | 'blog_link'
  | 'txt'
  | 'google_doc';

type SupabaseProductDocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'; // Updated to match memory

const mapProcessedDocStatusToSupabaseStatus = (processedDocStatus?: ProcessedDocument['status']): SupabaseProductDocumentStatus => {
  switch (processedDocStatus) {
    case 'processed':
      return 'completed'; // Mapped to 'completed'
    case 'error':
      return 'failed'; // Mapped to 'failed'
    case 'processing':
      return 'processing';
    // 'pending_upload' was default, now maps to 'pending' or handled by DB default
    default:
      return 'pending'; // Added 'pending'
  }
};

const callUploadProductDocumentEdgeFunction = async (
  file: File,
  vectorStoreId: string | undefined,
  productId: string | undefined, // For logging/toast messages
  documentName: string // For logging/toast messages
): Promise<string | undefined> => { 
  if (!vectorStoreId) {
    const errorMsg = `OpenAI Vector Store ID is missing for product ${productId}. Cannot upload document: ${documentName}.`;
    console.error(errorMsg);
    toast.error(errorMsg, { duration: 7000 });
    return undefined; 
  }
  if (!file) {
    const errorMsg = `File object is missing for document: ${documentName}. Cannot upload to OpenAI.`;
    console.error(errorMsg);
    toast.error(errorMsg);
    return undefined; 
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('vectorStoreId', vectorStoreId);

  const toastId = toast.loading(`Uploading ${documentName} to OpenAI Vector Store...`);

  try {
    const { data: result, error: funcError } = await supabase.functions.invoke(
      'uploadProductDocument', 
      { body: formData }
    );

    if (funcError) {
      throw funcError;
    }

    console.log('OpenAI Upload Result for', documentName, ':', result);
    toast.success(`${documentName} uploaded to OpenAI successfully!`, { id: toastId });
    return result?.uploadedFileId;

  } catch (error: any) {
    console.error(`Error uploading ${documentName} to OpenAI:`, error);
    toast.error(`Failed to upload ${documentName} to OpenAI: ${error.message || 'Unknown error'}`, { id: toastId, duration: 7000 });
    return undefined; 
  }
};

const DedicatedProductPage: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate(); 
  
  // Add debugging logs to track productId
  console.log('DedicatedProductPage: productId from useParams:', productId);
  console.log('DedicatedProductPage: current location:', window.location.pathname);
  
  const [product, setProduct] = useState<PageProductData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null); 
  const [analysisParsingError, setAnalysisParsingError] = useState<string | null>(null); 
  const [parsedAnalysisData, setParsedAnalysisData] = useState<ProductAnalysis | null>(null);
  const [isCardActionLoading, setIsCardActionLoading] = useState(false); // Used by ProductSection
  const [isDeletingAnalysis, setIsDeletingAnalysis] = useState<boolean>(false); // Added this line back
  const [isSavingSection, setIsSavingSection] = useState<boolean>(false); // Page-level saving indicator

  // State for blog URL processing
  const [blogUrlInput, setBlogUrlInput] = useState<string>('');
  const [isProcessingBlogUrl, setIsProcessingBlogUrl] = useState<boolean>(false);

  // State for sorting and filtering documents
  type SortableField = keyof ProductDocument | 'default';
  const [sortConfig, setSortConfig] = useState<{ field: SortableField; direction: 'asc' | 'desc' }>({ field: 'created_at', direction: 'desc' });
  const [filterTerm, setFilterTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [user, setUser] = useState<any>(null); // Add user state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false); // Changed default to false
  
  // Add editing state for product header
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [isSavingHeader, setIsSavingHeader] = useState<boolean>(false);

  // Document preview modal state
  const [previewDocument, setPreviewDocument] = useState<ProductDocument | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      setUser(supabaseUser);
    };
    getUser();
  }, []);

  const saveAnalysisToSupabase = async (currentProductId: string, analysisData: ProductAnalysis | null) => {
    if (!currentProductId) {
      toast.error("Product ID is missing, cannot save analysis.");
      return false;
    }
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ generated_analysis_data: analysisData })
        .eq('id', currentProductId);
      if (updateError) throw updateError;
      toast.success(analysisData ? 'Analysis saved successfully!' : 'Analysis deleted successfully!');
      return true;
    } catch (err: any) {
      console.error('Error saving/deleting analysis to Supabase:', err);
      toast.error(`Failed to ${analysisData ? 'save' : 'delete'} analysis: ${err.message}`);
      return false;
    }
  };

  const fetchProductDetailsAndDocs = useCallback(async () => {
    console.log('fetchProductDetailsAndDocs: Starting with productId:', productId);
    if (!productId) {
      setError('Product ID is missing.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setProduct(null);

    try {
      console.log('fetchProductDetailsAndDocs: Fetching product with ID:', productId);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, generated_analysis_data') 
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      if (!productData) throw new Error('Product not found.');
      
      const { data: docsData, error: docsError } = await supabase
        .from('product_documents')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      console.log('fetchProductDetailsAndDocs: Fetched documents from Supabase:', docsData);
      console.log('fetchProductDetailsAndDocs: productData from Supabase:', productData);
      setProduct({ 
        ...productData, // Spreading Product from DB (includes generated_analysis_data)
        associatedDocuments: docsData || [] 
      } as PageProductData); // Asserting to our local composite type

      if (productData.generated_analysis_data) {
        try {
          console.log('fetchProductDetailsAndDocs: Raw generated_analysis_data from database:', productData.generated_analysis_data);
          console.log('fetchProductDetailsAndDocs: Type of generated_analysis_data:', typeof productData.generated_analysis_data);
          
          const savedAnalysis = typeof productData.generated_analysis_data === 'string'
            ? JSON.parse(productData.generated_analysis_data)
            : productData.generated_analysis_data;
          
          console.log('fetchProductDetailsAndDocs: Parsed analysis data:', savedAnalysis);
          console.log('fetchProductDetailsAndDocs: Analysis data type after parsing:', typeof savedAnalysis);
          
          // Check if we have valid analysis data - don't require companyName for competitors to load
          if (savedAnalysis && typeof savedAnalysis === 'object') {
            console.log('fetchProductDetailsAndDocs: Analysis data is valid object');
            console.log('fetchProductDetailsAndDocs: Analysis data keys:', Object.keys(savedAnalysis));
            
            // Check specifically for competitors data
            if (savedAnalysis.competitors) {
              console.log('fetchProductDetailsAndDocs: Found competitors in analysis data:', savedAnalysis.competitors);
              console.log('fetchProductDetailsAndDocs: Competitors data type:', typeof savedAnalysis.competitors);
              console.log('fetchProductDetailsAndDocs: Competitors data keys:', Object.keys(savedAnalysis.competitors || {}));
            } else {
              console.log('fetchProductDetailsAndDocs: NO competitors found in analysis data');
            }
            
            // Always set the parsed data if it's a valid object
            setParsedAnalysisData(savedAnalysis as ProductAnalysis);
            
            // Check if there's a companyName for the success message
            if (savedAnalysis.companyName) {
              toast.success('Previously generated analysis loaded.');
            } else {
              console.log('fetchProductDetailsAndDocs: Analysis loaded but no companyName found');
            }
          } else {
            console.log('fetchProductDetailsAndDocs: Analysis data is not a valid object:', savedAnalysis);
          }
        } catch (error) {
          console.error('fetchProductDetailsAndDocs: Error parsing generated_analysis_data:', error);
          console.error('fetchProductDetailsAndDocs: Raw data that failed to parse:', productData.generated_analysis_data);
        }
      } else {
        console.log('fetchProductDetailsAndDocs: No generated_analysis_data found in product data');
      }
    } catch (err: any) {
      console.error('Error fetching product details or documents:', err);
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductDetailsAndDocs();
  }, [fetchProductDetailsAndDocs]);

  const determineSupabaseDocumentType = (
    processedType: string, 
    isGoogleDoc?: boolean,
    originalFileMimeType?: string 
  ): ValidSupabaseDocumentType => {
    const typeLower = processedType?.toLowerCase() || '';
    const originalMimeLower = originalFileMimeType?.toLowerCase() || '';

    if (isGoogleDoc) return 'google_doc';

    // Handle blog_post type specifically - map to 'blog_link'
    if (typeLower === 'blog_post' || typeLower === 'link' || typeLower === 'blog_url') return 'blog_link';

    // Determine the most relevant type string to check
    const effectiveType = originalMimeLower || typeLower;

    // Map based on common MIME parts or specific processed type strings to DB enum values
    if (effectiveType.includes('pdf')) return 'pdf';
    if (effectiveType.includes('vnd.openxmlformats-officedocument.wordprocessingml') || effectiveType.includes('docx')) return 'docx';
    if (effectiveType.includes('msword') || effectiveType.includes('doc')) return 'doc'; 
    if (effectiveType.includes('vnd.openxmlformats-officedocument.presentationml') || effectiveType.includes('pptx')) return 'pptx';
    if (effectiveType.includes('plain') || effectiveType.includes('txt')) return 'txt';
    
    // If it's a google doc type but wasn't caught by isGoogleDoc flag for some reason (less likely now with explicit check above)
    if (effectiveType.includes('google-apps.document')) return 'google_doc'; 
    if (effectiveType.includes('google-apps.spreadsheet')) return 'google_doc'; // Or a different type if you have one for sheets
    if (effectiveType.includes('google-apps.presentation')) return 'google_doc'; // Or a different type if you have one for slides

    // Fallback for other website URLs if not 'blog_link' and if 'website_url' was a valid enum (it's not in the list)
    // For now, other link-like types or unrecognized types will default to 'txt' or a more generic valid type.
    if (typeLower === 'website_url') {
        console.warn(`[DedicatedProductPage] 'website_url' is not a direct Supabase enum. Mapping to 'txt' as fallback.`);
        return 'txt'; // Or 'blog_link' if that's more appropriate for generic URLs
    }

    console.warn(`[DedicatedProductPage] Unknown document type mapping for processedType: '${processedType}', originalMime: '${originalFileMimeType}'. Defaulting to 'txt'.`);
    return 'txt'; // Safest fallback based on provided enum values
  };

  const handleDocumentsProcessed = async (processedDocs: ProcessedDocument[]) => {
    if (!productId || !product) {
      toast.error('Product details not loaded yet. Cannot save documents.');
      return;
    }

    if (!user) {
      toast.error('User not authenticated. Cannot save documents.');
      return;
    }

    const savingToastId = toast.loading('Saving documents and uploading files...', { id: 'saving-documents' });

    try {
      // First, upload files to Supabase Storage and prepare document data
      const newDocumentData = await Promise.all(
        processedDocs.map(async (doc) => {
          let storage_path = null;
          let file_url = null;

          // Upload original file to Supabase Storage if available
          if (doc.originalFile) {
            try {
              console.log(`📁 Uploading file to Supabase Storage: ${doc.name}`);
              toast.loading(`Uploading ${doc.name} to storage...`, { id: `upload-${doc.name}` });

              // Create a unique filename with timestamp to avoid conflicts
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const fileExtension = doc.originalFile.name.split('.').pop() || 'bin';
              const uniqueFilename = `${timestamp}-${doc.originalFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
              const filePath = `${user.id}/${productId}/${uniqueFilename}`;

              console.log(`📤 Uploading to path: ${filePath}`);

              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('productdocuments')
                .upload(filePath, doc.originalFile, {
                  cacheControl: '3600',
                  upsert: false // Don't overwrite existing files
                });

              if (uploadError) {
                console.error(`❌ Error uploading file ${doc.name}:`, uploadError);
                toast.error(`Failed to upload ${doc.name}: ${uploadError.message}`, { id: `upload-${doc.name}` });
              } else if (uploadData) {
                console.log(`✅ File uploaded successfully: ${uploadData.path}`);
                storage_path = uploadData.path;

                // Get the public URL for the uploaded file
                const { data: urlData } = supabase.storage
                  .from('productdocuments')
                  .getPublicUrl(uploadData.path);

                if (urlData?.publicUrl) {
                  file_url = urlData.publicUrl;
                  console.log(`🔗 Public URL generated: ${file_url}`);
                  toast.success(`${doc.name} uploaded successfully!`, { id: `upload-${doc.name}`, duration: 2000 });
                } else {
                  console.warn(`⚠️ Could not generate public URL for ${doc.name}`);
                  toast.error(`${doc.name} uploaded but URL generation failed`, { id: `upload-${doc.name}` });
                }
              }
            } catch (storageError) {
              console.error(`❌ Storage upload failed for ${doc.name}:`, storageError);
              toast.error(`Storage upload failed for ${doc.name}`, { id: `upload-${doc.name}` });
            }
          } else {
            console.log(`ℹ️ No original file for ${doc.name}, skipping storage upload`);
          }

          return {
            product_id: productId!,
            user_id: user.id, 
            file_name: doc.name,
            document_type: determineSupabaseDocumentType(doc.type, doc.isGoogleDoc, doc.originalFile?.type),
            extracted_text: doc.content,
            raw_url: doc.rawUrl, 
            file_url: file_url,
            storage_path: storage_path,
            status: mapProcessedDocStatusToSupabaseStatus(doc.status) as SupabaseProductDocumentStatus, 
            is_google_doc: doc.isGoogleDoc,
            used_ai_extraction: doc.usedAI,
            error_message: doc.status === 'error' ? doc.error : undefined,
          };
        })
      );

      // Save document records to database
      if (newDocumentData.length > 0) {
        console.log(`💾 Saving ${newDocumentData.length} documents to database...`);
        
        const { data: insertedSupabaseDocs, error: dbError } = await supabase
          .from('product_documents')
          .insert(newDocumentData)
          .select();

        if (dbError) {
          console.error('Error inserting documents to Supabase:', dbError);
          toast.error(`Failed to save documents to Supabase: ${dbError.message}`, { id: savingToastId });
        } else if (insertedSupabaseDocs) {
          console.log(`✅ ${insertedSupabaseDocs.length} documents saved to database successfully!`);
          toast.success('Documents saved with file storage successfully!', { id: savingToastId, duration: 3000 });
          
          // --- BEGIN OPENAI UPLOAD ---
          if (product && product.openai_vector_store_id) {
            console.log(`🤖 Starting OpenAI uploads for ${processedDocs.length} documents...`);
            
            for (const processedDoc of processedDocs) {
              const matchingSupabaseDoc = insertedSupabaseDocs.find(sd => sd.file_name === processedDoc.name && sd.extracted_text === processedDoc.content);

              if (matchingSupabaseDoc) { 
                let fileToUpload: File | undefined;
                if (processedDoc.originalFile) {
                  fileToUpload = processedDoc.originalFile;
                } else if (processedDoc.content) {
                  fileToUpload = new File([processedDoc.content], processedDoc.name || "document.txt", { type: "text/plain" });
                }

                if (fileToUpload) {
                  console.log(`🚀 Uploading ${processedDoc.name} to OpenAI...`);
                  const openaiFileId = await callUploadProductDocumentEdgeFunction(
                    fileToUpload,
                    product.openai_vector_store_id,
                    productId,
                    processedDoc.name || "document"
                  );

                  if (openaiFileId && matchingSupabaseDoc) {
                    const { error: updateError } = await supabase
                      .from('product_documents')
                      .update({ openai_vsf_id: openaiFileId, status: 'completed' as SupabaseProductDocumentStatus })
                      .eq('id', matchingSupabaseDoc.id);

                    if (updateError) {
                      console.error(`Failed to update document ${matchingSupabaseDoc.id} with openai_vsf_id:`, updateError);
                      toast.error(`Failed to link OpenAI file ID for ${matchingSupabaseDoc.file_name}.`);
                    } else {
                      console.log(`Document ${matchingSupabaseDoc.id} updated with openai_vsf_id: ${openaiFileId}`);
                    }
                  } else if (!openaiFileId) {
                    console.warn(`OpenAI file ID not received for ${matchingSupabaseDoc?.file_name}. Document status might remain as is or be marked as error if upload was critical.`);
                  }
                }
              } else {
                 console.error(`Could not find matching Supabase document for processed doc: ${processedDoc.name}. Skipping OpenAI upload.`);
              }
            }
          } else {
            const errorMsg = `OpenAI Vector Store ID not found for product ${productId}. Skipping OpenAI document uploads.`;
            console.error(errorMsg);
            toast.error(errorMsg, { duration: 7000 });
          }
          // --- END OPENAI UPLOAD ---

          await fetchProductDetailsAndDocs(); 
        } else {
          toast.error('Failed to save documents to Supabase (no data returned).', { id: savingToastId });
        }
      } else {
        toast.dismiss(savingToastId); 
      }
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message}`, { id: savingToastId });
      console.error('Error in handleDocumentsProcessed:', err);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!product || !product.associatedDocuments.length) {
      toast.error('Product details or associated documents are missing for analysis.');
      return;
    }
    const textsForAnalysis = product.associatedDocuments.filter(doc => doc.extracted_text).map(doc => doc.extracted_text || '');
    if (textsForAnalysis.length === 0) {
      toast.error('No documents with extracted text available for analysis.');
      return;
    }

    const payload = {
      product_name: product.name, 
      product_description: product.description, 
      sources_texts: textsForAnalysis,
    };

    setIsGeneratingAnalysis(true);
    setAnalysisResults(null);
    setParsedAnalysisData(null);
    setAnalysisParsingError(null); // Clear previous parsing errors
    toast.loading('Generating analysis...', { id: 'generating-analysis' });

    try {
      const results = await makeWebhookRequest(
        'https://hook.us2.make.com/dmgxx97dencaquxi9vr9khxrr71kotpm',
        payload,
        {}
      );
      if (results) {
        const parsedArray: ProductAnalysis[] = parseProductData(results);
        if (parsedArray && parsedArray.length > 0) {
          const analysisWithId = { 
            ...parsedArray[0],
            research_result_id: product?.id || parsedArray[0].research_result_id 
          };
          setParsedAnalysisData(analysisWithId);
          setAnalysisParsingError(null); // Clear any previous error
          if (productId) await saveAnalysisToSupabase(productId, analysisWithId);
          setAnalysisResults(null); // Clear raw results as parsing was successful
        } else {
          const errorMsg = 'Failed to parse analysis data. The structure might be incorrect.';
          toast.error(errorMsg);
          setParsedAnalysisData(null);
          setAnalysisParsingError(errorMsg + " Raw response logged to console. Original response available if needed for debugging.");
          setAnalysisResults(results); // Keep raw results for potential debug display or logging
          console.error("Raw analysis response that failed parsing:", results);
        }
      } else {
        toast.error('No results received from analysis service.');
      }
    } catch (err: any) {
      console.error('Error generating analysis:', err);
      toast.error(`Error generating analysis: ${err.message}`);
    } finally {
      setIsGeneratingAnalysis(false);
      toast.dismiss('generating-analysis');
    }
  };

  const handleSaveProduct = async (prod: ProductAnalysis) => {
    if (!productId) {
      toast.error("Product ID is missing for saving.");
      return;
    }
    setIsCardActionLoading(true);
    const success = await saveAnalysisToSupabase(productId, prod);
    if (success) setParsedAnalysisData(prod);
    setIsCardActionLoading(false);
  };

  const handleApproveProduct = async (prod: ProductAnalysis, productIndex: number) => {
    // productId is from useParams()
    // 'product' is the state variable holding the fetched data from 'research_results' table.
    const currentProductIdFromUrl = productId; 
    
    // Ensure productIndex has a valid value (default to 0 for single product page)
    const safeProductIndex = productIndex ?? 0;

    if (!product || !product.id) {
      toast.error('Cannot approve: Product data is not fully loaded or the main research record is missing.');
      console.error('[DedicatedProductPage] handleApproveProduct: Aborting because product state or product.id is null/undefined.', { product });
      setIsCardActionLoading(false); // Ensure loading state is reset
      return;
    }
    console.log(
      '[DedicatedProductPage] handleApproveProduct called with:',
      {
        'prod.research_result_id': prod.research_result_id,
        'productIndex': productIndex,
        'safeProductIndex': safeProductIndex,
        'currentProductIdFromUrl (expected parent ID)': currentProductIdFromUrl,
        'prod.productDetails.name': prod.productDetails?.name,
        'prod.companyName': prod.companyName,
        'isApproved (state before this action)': prod.isApproved
      }
    );
    setIsCardActionLoading(true);
    const newApprovedState = !prod.isApproved;

    try {
      // Optimistically update UI
      setParsedAnalysisData((prev) => prev ? { ...prev, isApproved: newApprovedState } : null);
      // Update product in the main state as well, if it exists
      if (product && parsedAnalysisData && product.id === parsedAnalysisData.research_result_id) {
        setProduct((prevProd) => prevProd ? { ...prevProd, generated_analysis_data: { ...(prevProd.generated_analysis_data as ProductAnalysis), isApproved: newApprovedState } } : null);
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast.error('You must be logged in to approve products.');
        // Revert optimistic update
        setParsedAnalysisData((prev) => prev ? { ...prev, isApproved: prod.isApproved } : null);
        if (product && parsedAnalysisData && product.id === parsedAnalysisData.research_result_id) {
          setProduct((prevProd) => prevProd ? { ...prevProd, generated_analysis_data: { ...(prevProd.generated_analysis_data as ProductAnalysis), isApproved: prod.isApproved } } : null);
        }
        return;
      }

      if (newApprovedState) { // Product is being approved or re-approved
        const dataToUpsert = {
          research_result_id: product.id, // Use product.id since we already validated it exists above
          approved_by: session.user.id,
          product_index: safeProductIndex, // Use the safe product index
          product_name: prod.productDetails.name,
          product_description: prod.productDetails.description,
          company_name: prod.companyName, // Product's own company name
          product_data: { ...prod, isApproved: true, userUUID: session.user.id }, // Store enriched product with approval state
          // approved_at, created_at, updated_at have db defaults or are set on update by Supabase/triggers
        };

        const { data: existingApproval, error: fetchError } = await supabase
          .from('approved_products')
          .select('id')
          .eq('research_result_id', product.id)
          .eq('approved_by', session.user.id!)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: row not found, which is fine for insert
          console.error('Error checking existing approval:', fetchError);
          toast.error(`Error checking approval: ${fetchError.message}`);
           setParsedAnalysisData((prev) => prev ? { ...prev, isApproved: prod.isApproved } : null);
           if (product && parsedAnalysisData && product.id === parsedAnalysisData.research_result_id) {
             setProduct((prevProd) => prevProd ? { ...prevProd, generated_analysis_data: { ...(prevProd.generated_analysis_data as ProductAnalysis), isApproved: prod.isApproved } } : null);
           }
          return;
        }

        if (existingApproval) {
          // Update existing approval
          const { error: updateError } = await supabase
            .from('approved_products')
            .update({
              product_index: safeProductIndex, // Use the safe product index
              product_name: prod.productDetails.name,
              product_description: prod.productDetails.description,
              company_name: prod.companyName,
              product_data: { ...prod, isApproved: true, userUUID: session.user.id },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingApproval.id);

          if (updateError) {
            console.error('Error updating product approval:', updateError);
            toast.error(updateError.message || 'Failed to update product approval.');
            setParsedAnalysisData((prev) => prev ? { ...prev, isApproved: prod.isApproved } : null);
            if (product && parsedAnalysisData && product.id === parsedAnalysisData.research_result_id) {
              setProduct((prevProd) => prevProd ? { ...prevProd, generated_analysis_data: { ...(prevProd.generated_analysis_data as ProductAnalysis), isApproved: prod.isApproved } } : null);
            }
            return;
          }
          toast.success('Product approval updated!');
        } else {
          // Insert new approval record
          const { error: insertError } = await supabase
            .from('approved_products')
            .insert([dataToUpsert]);

          if (insertError) {
            console.error('Error approving product:', insertError);
            toast.error(insertError.message || 'Failed to approve product.');
            setParsedAnalysisData((prev) => prev ? { ...prev, isApproved: prod.isApproved } : null);
            if (product && parsedAnalysisData && product.id === parsedAnalysisData.research_result_id) {
              setProduct((prevProd) => prevProd ? { ...prevProd, generated_analysis_data: { ...(prevProd.generated_analysis_data as ProductAnalysis), isApproved: prod.isApproved } } : null);
            }
            return;
          }
          toast.success('Product approved successfully!');
        }
      } else { // Product is being un-approved
        const { error: deleteError } = await supabase
          .from('approved_products')
          .delete()
          .eq('research_result_id', product.id)
          .eq('approved_by', session.user.id!);

        if (deleteError) {
          console.error('Error unapproving product:', deleteError);
          toast.error(deleteError.message || 'Failed to unapprove product.');
          setParsedAnalysisData((prev) => prev ? { ...prev, isApproved: prod.isApproved } : null);
          if (product && parsedAnalysisData && product.id === parsedAnalysisData.research_result_id) {
            setProduct((prevProd) => prevProd ? { ...prevProd, generated_analysis_data: { ...(prevProd.generated_analysis_data as ProductAnalysis), isApproved: prod.isApproved } } : null);
          }
          return;
        }
        toast.success('Product unapproved.');
      }
    } catch (error: any) {
      console.error('Error in handleApproveProduct:', error);
      toast.error('An unexpected error occurred: ' + error.message);
    } finally {
      setIsCardActionLoading(false);
    }
  };

  // const handleUpdateEntireProduct = (updatedProd: ProductAnalysis) => {
  //   setParsedAnalysisData(updatedProd);
  //   toast('Entire product update triggered (local stub).');
  // };

  const handleDeleteAnalysis = async () => {
    if (!productId || !parsedAnalysisData) {
      toast.error(!productId ? "Product ID missing." : "No analysis to delete.");
      return;
    }
    setIsDeletingAnalysis(true);
    toast.loading('Deleting analysis...', { id: 'deleting-analysis' });
    const success = await saveAnalysisToSupabase(productId, null);
    if (success) {
      setParsedAnalysisData(null);
      setAnalysisResults(null);
      setAnalysisParsingError(null); // Clear parsing error when analysis is deleted
    }
    setIsDeletingAnalysis(false);
    toast.dismiss('deleting-analysis');
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    const documentToDelete = product?.associatedDocuments.find(doc => doc.id === documentId);
    if (!documentToDelete) {
      toast.error('Document not found in the current list.');
      return;
    }

    let toastId = toast.loading('Preparing to delete document...');

    try {
      // Step 1: Attempt to remove from OpenAI Vector Store if applicable
      if (product && product.openai_vector_store_id && documentToDelete.openai_vsf_id) {
        toast.loading('Removing document from OpenAI Vector Store...', { id: toastId });
        const { data: removalData, error: removalError } = await supabase.functions.invoke(
          'removeDocumentFromVectorStore',
          {
            body: {
              vector_store_id: product.openai_vector_store_id,
              openai_vsf_id: documentToDelete.openai_vsf_id,
            },
          }
        );

        if (removalError) {
          // Log the error but proceed to delete from Supabase as the primary concern is app data consistency
          console.error('Supabase function invocation error for removeDocumentFromVectorStore:', removalError);
          toast.error(`Error calling OpenAI removal: ${removalError.message}. Proceeding with local deletion.`, { id: toastId });
        } else if (removalData && removalData.deletionDetails && removalData.deletionDetails.deleted) {
          toast.success('Successfully removed from OpenAI Vector Store.', { id: toastId });
          // Optionally, update a flag on the document in Supabase like 'is_removed_from_vector_store = true'
          // For now, we just proceed to delete the record.
        } else {
          console.error('OpenAI did not confirm deletion or response was unexpected:', removalData);
          toast.error('OpenAI Vector Store: File not found or an issue occurred during removal. Proceeding with local deletion.', { id: toastId });
        }
      } else {
        toast.dismiss(toastId); // Dismiss initial toast if not calling the edge function
        toastId = toast.loading('Deleting document from application...'); 
        console.log('Skipping OpenAI Vector Store removal: IDs not found or product not loaded.');
        // No OpenAI IDs, or product not loaded, proceed to delete from Supabase only
      }

      // Step 2: Delete from Supabase product_documents table
      toast.loading('Deleting document from application database...', { id: toastId });
      const { error: deleteError } = await supabase.from('product_documents').delete().eq('id', documentId);

      if (deleteError) throw deleteError;

      toast.success('Document deleted successfully from application!', { id: toastId });
      setProduct(prev => ({ ...prev!, associatedDocuments: prev!.associatedDocuments.filter(doc => doc.id !== documentId) }));

    } catch (err: any) {
      toast.error(`Failed to delete document: ${err.message}`, { id: toastId });
      console.error('Error in handleDeleteDocument:', err);
    }
  };

  const handleViewDocument = (document: ProductDocument) => {
    setPreviewDocument(document);
    setIsPreviewModalOpen(true);
  };

  const handleProcessBlogUrl = async () => {
    if (!productId) {
      toast.error("Product ID is missing for blog processing.");
      return;
    }

    if (!user) {
      toast.error('User not authenticated. Cannot save blog content.');
      return;
    }

    if (!blogUrlInput.trim()) {
      toast.error("Please enter a blog URL.");
      return;
    }

    let scrapedData: ScrapedBlog;
    const processingToastId = toast.loading('Processing blog URL...');
    try {
      setIsProcessingBlogUrl(true);
      const { scrapeBlogContent } = await import('../utils/blogScraper');
      scrapedData = await scrapeBlogContent(blogUrlInput);
      toast.dismiss(processingToastId); // Dismiss after scraping succeeds
    } catch (err: any) {
      console.error('Error scraping blog content:', err);
      toast.error(`Error scraping blog: ${err.message}`, {id: processingToastId});
      setIsProcessingBlogUrl(false);
      return;
    }

    if (!scrapedData) {
      toast.error('Failed to retrieve scraped data.', {id: processingToastId});
      setIsProcessingBlogUrl(false);
      return;
    }
    
    const savingToastId = toast.loading('Saving blog content to Supabase...');
    try {
      const newDocumentToInsert = {
        product_id: productId!,
        user_id: user.id,
        file_name: scrapedData.title || blogUrlInput.substring(blogUrlInput.lastIndexOf('/') + 1) || 'Untitled Blog Post',
        document_type: determineSupabaseDocumentType('blog_post'), 
        extracted_text: scrapedData.content,
        source_url: scrapedData.url, 
        file_url: null, 
        status: 'completed' as SupabaseProductDocumentStatus, // Directly set to 'completed' for scraped blogs
        is_google_doc: false, 
        used_ai_extraction: true, 
      };

      const { data: savedSupabaseDocument, error: saveError } = await supabase
        .from('product_documents')
        .insert(newDocumentToInsert) // Cast here
        .select()
        .single();

      if (saveError) throw saveError;

      if (savedSupabaseDocument) {
        toast.success(`Blog content saved to Supabase for: ${scrapedData.url}`, { id: savingToastId, duration: 3000 });
        
        // --- BEGIN OPENAI UPLOAD ---
        if (product && product.openai_vector_store_id && scrapedData.content) {
            const fileToUpload = new File(
                [scrapedData.content], 
                savedSupabaseDocument.file_name || "scraped_blog_content.txt", 
                { type: "text/plain" }
            );
            const openaiFileId = await callUploadProductDocumentEdgeFunction(
                fileToUpload, 
                product.openai_vector_store_id,
                productId,
                savedSupabaseDocument.file_name || "scraped blog"
            );

            if (openaiFileId) {
              const { error: updateError } = await supabase
                .from('product_documents')
                .update({ openai_vsf_id: openaiFileId, status: 'completed' as SupabaseProductDocumentStatus }) // Also mark as completed
                .eq('id', savedSupabaseDocument.id);

              if (updateError) {
                console.error(`Failed to update document ${savedSupabaseDocument.id} with openai_vsf_id:`, updateError);
                toast.error(`Failed to link OpenAI file ID for ${savedSupabaseDocument.file_name}.`);
              } else {
                console.log(`Document ${savedSupabaseDocument.id} updated with openai_vsf_id: ${openaiFileId}`);
              }
            } else {
              console.warn(`OpenAI file ID not received for ${savedSupabaseDocument?.file_name}. Document status might remain as is or be marked as error if upload was critical.`);
            }
        } else {
            const errorMsg = `OpenAI Vector Store ID or blog content missing for product ${productId}. Skipping OpenAI upload for blog.`;
            console.error(errorMsg);
            if (product && !product.openai_vector_store_id) toast.error(errorMsg, {duration: 7000});
        }
        // --- END OPENAI UPLOAD ---

        setProduct(prev => ({ ...prev!, associatedDocuments: [...prev!.associatedDocuments, savedSupabaseDocument] }));
      } else {
        toast.error('Failed to save the processed blog content to Supabase.', { id: savingToastId });
      }
    } catch (err: any) {
      console.error('Error saving blog content:', err);
      toast.error(`Failed to save blog content: ${err.message}`, { id: savingToastId });
    } finally {
      setIsProcessingBlogUrl(false);
      setBlogUrlInput(''); 
    }
  };

  // >> Filter and sort logic
  const uniqueDocumentTypes = useMemo(() => 
    Array.from(new Set(product?.associatedDocuments?.map(doc => doc.document_type).filter(Boolean) || [])) as string[], 
    [product?.associatedDocuments]
  );
  const uniqueDocumentStatuses = useMemo(() => 
    Array.from(new Set(product?.associatedDocuments?.map(doc => doc.status).filter(Boolean) || [])) as string[], 
    [product?.associatedDocuments]
  );

  const displayedDocuments = useMemo(() => {
    console.log('[DedicatedProductPage] useMemo for displayedDocuments. Input product.associatedDocuments:', product?.associatedDocuments);
    
    const currentAssociatedDocs = product?.associatedDocuments;
    let docs: typeof currentAssociatedDocs = []; // Initialize as empty array

    if (Array.isArray(currentAssociatedDocs)) {
      docs = [...currentAssociatedDocs];
    } else if (currentAssociatedDocs) {
      // If it exists but is not an array (e.g., an empty object {}), log a warning and keep docs as [].
      console.warn(
        '[DedicatedProductPage] product.associatedDocuments was not an array. Value:', 
        currentAssociatedDocs, 
        'Type:', typeof currentAssociatedDocs
      );
      // docs remains [] which is safer than trying to spread an object.
    }
    // If currentAssociatedDocs is null or undefined, docs also remains []

    console.log('[DedicatedProductPage] Docs after initial processing (length):', docs.length);

    // Filtering
    if (filterTerm) { 
      console.log('[DedicatedProductPage] Filtering by term:', filterTerm);
      docs = docs.filter(doc => doc && doc.file_name && typeof doc.file_name === 'string' && doc.file_name.toLowerCase().includes(filterTerm.toLowerCase()));
      console.log('[DedicatedProductPage] after term filter: docs.length =', docs.length);
    }
    if (filterType !== 'all') {
      console.log('[DedicatedProductPage] Filtering by type:', filterType);
      docs = docs.filter(doc => doc && doc.document_type === filterType);
      console.log('[DedicatedProductPage] after type filter: docs.length =', docs.length);
    }
    if (filterStatus !== 'all') {
      console.log('[DedicatedProductPage] Filtering by status:', filterStatus);
      docs = docs.filter(doc => doc && doc.status === filterStatus);
      console.log('[DedicatedProductPage] after status filter: docs.length =', docs.length);
    }
    console.log('[DedicatedProductPage] after ALL filters: docs.length =', docs.length);

    // Sorting logic
    const currentSortField = sortConfig.field === 'default' ? 'created_at' : sortConfig.field;
    console.log('[DedicatedProductPage] before sort block: currentSortField =', currentSortField, ', docs.length =', docs.length);

    if (docs.length > 0 && docs[0] && typeof docs[0] === 'object' && currentSortField in docs[0]) {
      console.log(`[DedicatedProductPage] Entering sort for field: ${currentSortField}. First doc to check field from:`, JSON.stringify(docs[0]));
      docs.sort((a, b) => {
        // Ensure a and b are objects before trying to access properties
        const valA = (a && typeof a === 'object') ? a[currentSortField as keyof ProductDocument] : undefined;
        const valB = (b && typeof b === 'object') ? b[currentSortField as keyof ProductDocument] : undefined;

        console.log(`[DedicatedProductPage] Sorting by ${currentSortField}: valA =`, valA, `(${typeof valA}), valB =`, valB, `(${typeof valB})`);

        let comparison = 0;
        if (valA === null || valA === undefined) {
          comparison = (valB === null || valB === undefined) ? 0 : 1;
        } else if (valB === null || valB === undefined) {
          comparison = -1;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          try {
            comparison = String(valA).localeCompare(String(valB));
          } catch (e) {
            console.error("[DedicatedProductPage] Error during sort comparison fallback:", e);
            comparison = 0;
          }
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
      console.log('[DedicatedProductPage] after sort execution: docs.length =', docs.length);
    } else if (docs.length > 0) {
      const firstDocString = docs[0] && typeof docs[0] === 'object' ? JSON.stringify(docs[0]) : String(docs[0]);
      console.warn(`[DedicatedProductPage] Sort field '${currentSortField}' not found in document OR docs[0] is not a valid object for key checking. Skipping sort. docs[0]:`, firstDocString, `Field exists check: ${docs[0] && typeof docs[0] === 'object' ? (currentSortField in docs[0]) : 'N/A'}`);
    } else {
      console.log('[DedicatedProductPage] Skipping sort because docs.length is 0 before sort block.');
    }

    console.log('[DedicatedProductPage] useMemo END. docs before return: docs.length =', docs.length);
    return docs;
  }, [product?.associatedDocuments, sortConfig, filterTerm, filterType, filterStatus]);

  console.log('[DedicatedProductPage] displayedDocuments after useMemo:', displayedDocuments);

  const handleSortChange = (field: SortableField) => {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, direction });
  };
  // << End Filter and sort logic

  const handleProductSectionUpdate = async (
    productIndex: number,
    sectionType: keyof ProductAnalysis,
    newItems: string[] | Record<string, any> // This should be the edited items from ProductSection
  ) => {
    // Safe logging that handles undefined values properly
    const safeLogValue = newItems !== undefined ? JSON.parse(JSON.stringify(newItems)) : 'undefined';
    console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Initiating update. ProductIndex: ${productIndex}, SectionType: '${sectionType}'. Received newItems:`, safeLogValue);
    
    // Special handling for competitors section
    if (sectionType === 'competitors' && newItems && typeof newItems === 'object' && !Array.isArray(newItems)) {
      console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Processing competitors update:`, newItems);
      console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Competitors data type:`, typeof newItems);
      console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Competitors data keys:`, Object.keys(newItems));
      
      // Check each competitor array - use type assertion after checking
      const competitorsData = newItems as Record<string, any>;
      if (competitorsData.direct_competitors) {
        console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Direct competitors:`, competitorsData.direct_competitors);
        console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Direct competitors is array:`, Array.isArray(competitorsData.direct_competitors));
        console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Direct competitors length:`, competitorsData.direct_competitors?.length);
      }
      if (competitorsData.niche_competitors) {
        console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Niche competitors:`, competitorsData.niche_competitors);
      }
      if (competitorsData.broader_competitors) {
        console.log(`[DedicatedPage.handleProductSectionUpdate.COMPETITORS] Broader competitors:`, competitorsData.broader_competitors);
      }
    }

    if (!product?.id) {
      console.error(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Error: Product or product.id is not available.`);
      toast.error('Product ID is missing. Cannot update section.');
      return;
    }

    try {
      // Fetch fresh product data first
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('generated_analysis_data')
        .eq('id', product.id)
        .single();

      if (fetchError) {
        console.error(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Error fetching current product:`, fetchError);
        throw fetchError;
      }

      console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Current product from DB:`, currentProduct);
      console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Current generated_analysis_data:`, currentProduct.generated_analysis_data);

      // Parse the current analysis data
      const baseAnalysisData: ProductAnalysis = (() => {
        if (!currentProduct.generated_analysis_data) {
          console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] No existing analysis data, creating new base object`);
          return {} as ProductAnalysis;
        }

        try {
          const parsed = typeof currentProduct.generated_analysis_data === 'string'
            ? JSON.parse(currentProduct.generated_analysis_data)
            : currentProduct.generated_analysis_data;
          console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Parsed existing analysis data:`, parsed);
          return parsed;
        } catch (e) {
          console.error(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Error parsing existing analysis data:`, e);
          return {} as ProductAnalysis;
        }
      })();

      // Create the updated analysis data
      const updatedAnalysisData: ProductAnalysis = {
        ...baseAnalysisData,
        [sectionType]: newItems,
      };

      console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Final updated analysis data to save:`, updatedAnalysisData);
      console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Updated analysis data as JSON string:`, JSON.stringify(updatedAnalysisData));

      // Save to Supabase
      const { error: updateError } = await supabase
        .from('products')
        .update({ generated_analysis_data: JSON.stringify(updatedAnalysisData) })
        .eq('id', product.id);

      if (updateError) {
        console.error(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Supabase update error:`, updateError);
        throw updateError;
      }

      console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Supabase update successful.`);

      // Update local state
      setParsedAnalysisData(updatedAnalysisData);
      console.log(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Local state updated.`);

    } catch (error) {
      console.error(`[DedicatedPage.handleProductSectionUpdate.NEW_LOGIC] Error during update:`, error);
      toast.error(`Failed to update ${sectionType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    console.log("[DedicatedProductPage] Product data useEffect triggered with product:", product);
    console.log("[DedicatedProductPage] Product generated_analysis_data:", product?.generated_analysis_data);
    
    if (product?.generated_analysis_data) {
      try {
        const data = typeof product.generated_analysis_data === 'string' 
          ? JSON.parse(product.generated_analysis_data) 
          : product.generated_analysis_data;
        
        console.log("[DedicatedProductPage] Parsed analysis data:", data);
        console.log("[DedicatedProductPage] Parsed analysis data competitors:", data.competitors);
        
        setParsedAnalysisData(data as ProductAnalysis); // Directly set parsed data
        setAnalysisParsingError(null); // Clear any parsing error
      } catch (e) {
        console.error('Failed to parse generated_analysis_data from database:', e);
        setParsedAnalysisData(null); // Set to null on error
        setAnalysisParsingError('Error: Could not load previously saved analysis data. It might be corrupted.');
        setAnalysisResults(product.generated_analysis_data); // Keep raw potentially problematic data for inspection if needed
      }
    } else if (product && !product.generated_analysis_data) { // Product loaded, but no analysis data
      console.log("[DedicatedProductPage] Product loaded but no generated_analysis_data");
      setParsedAnalysisData(null); // No data to parse
      setAnalysisParsingError(null);
    } else if (!product) { // Product not loaded yet
      console.log("[DedicatedProductPage] Product not loaded yet");
      setParsedAnalysisData(null); 
      setAnalysisParsingError(null);
    }
  }, [product]);

  // Set page background
  useEffect(() => {
    // Set the body background
    document.body.style.background = 'linear-gradient(to bottom right, #111827, #1f2937)';
    document.body.style.minHeight = '100vh';
    
    // Cleanup on unmount
    return () => {
      document.body.style.background = '';
      document.body.style.minHeight = '';
    };
  }, []);

  useEffect(() => {
    // This useEffect is no longer needed as the one above directly sets parsedAnalysisData
    // and handles the fallback/error states for product.generated_analysis_data.
    // If analysisResults is set by handleGenerateAnalysis due to a parsing error of the webhook response,
    // that will be handled by the rendering logic checking analysisParsingError first.
  }, [analysisResults]);

  // Add function to handle header editing
  const handleSaveHeader = async () => {
    if (!productId || !user) {
      toast.error('Product ID or user authentication missing.');
      return;
    }

    setIsSavingHeader(true);
    
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editName.trim(),
          description: editDescription.trim()
        })
        .eq('id', productId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setProduct(prev => prev ? {
        ...prev,
        name: editName.trim(),
        description: editDescription.trim()
      } : null);

      setIsEditingHeader(false);
      toast.success('Product updated successfully!');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product: ' + error.message);
    } finally {
      setIsSavingHeader(false);
    }
  };

  const handleStartEdit = () => {
    if (product) {
      setEditName(product.name);
      setEditDescription(product.description || '');
      setIsEditingHeader(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingHeader(false);
    setEditName('');
    setEditDescription('');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="loader">Loading product details...</div></div>;
  if (error && !product) {
    return (
      <div className="container mx-auto p-4 text-center text-red-500">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600">
          Go Back
        </button>
      </div>
    );
  }
  if (!product) return <div className="container mx-auto p-4">Product not found or still loading.</div>;

  return (
    <>
      <MainHeader />
      <div 
        className="p-4 md:p-8 min-h-screen text-gray-100" 
        style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto">
            {/* Clean Header Section with Edit Functionality */}
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-600/30 shadow-lg mb-12">
              {/* Content */}
              <div className="p-8 md:p-12">
                <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                  {/* Logo Section */}
                  {product.logo_url && (
                    <div className="flex-shrink-0">
                      <img 
                        src={product.logo_url} 
                        alt={`${product.name} logo`} 
                        className="h-20 w-20 lg:h-24 lg:w-24 rounded-xl object-contain bg-white/10 border border-gray-500/20 shadow-md" 
                      />
                    </div>
                  )}
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    {/* Edit Controls */}
                    <div className="flex justify-end mb-4">
                      {!isEditingHeader ? (
                        <button
                          onClick={handleStartEdit}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveHeader}
                            disabled={isSavingHeader}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {isSavingHeader ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isSavingHeader}
                            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="mb-6">
                      {isEditingHeader ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gray-700/50 text-white border border-gray-500 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-blue-500"
                          placeholder="Product name"
                        />
                      ) : (
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                          {product.name}
                        </h1>
                      )}
                      <div className="mt-3 h-1 w-24 bg-blue-500 rounded-full"></div>
                    </div>
                    
                    {/* Metadata Pills */}
                    <div className="mt-6 flex flex-wrap gap-3">
                      <div className="inline-flex items-center px-4 py-2 bg-gray-700/60 rounded-full border border-gray-600/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-300">Active Product</span>
                      </div>
                      
                      {product.created_at && (
                        <div className="inline-flex items-center px-4 py-2 bg-gray-700/60 rounded-full border border-gray-600/30">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 110 2H7a1 1 0 00-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-300">
                            Created {new Date(product.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      )}
                      
                      {product.associatedDocuments?.length > 0 && (
                        <div className="inline-flex items-center px-4 py-2 bg-gray-700/60 rounded-full border border-gray-600/30">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-300">
                            {product.associatedDocuments.length} Document{product.associatedDocuments.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/40 backdrop-blur-sm shadow-xl rounded-lg p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-100 mb-6 border-b border-gray-700/50 pb-3">Upload & Associate Documents</h2>
              <DocumentUploader onDocumentsProcessed={handleDocumentsProcessed} />
            </div>

            <div className="bg-gray-800/40 backdrop-blur-sm shadow-xl rounded-lg p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-100 mb-6 border-b border-gray-700/50 pb-3">Process Blog URL</h2>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-grow">
                  <label htmlFor="blogUrl" className="block text-sm font-medium text-gray-300 mb-1">Blog Post URL</label>
                  <input 
                    type="url" 
                    id="blogUrl" 
                    value={blogUrlInput} 
                    onChange={(e) => setBlogUrlInput(e.target.value)} 
                    placeholder="https://example.com/blog-post" 
                    className="w-full px-4 py-2.5 bg-white border border-secondary-600 rounded-lg text-black placeholder:text-gray-500 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <button 
                  onClick={handleProcessBlogUrl} 
                  disabled={isProcessingBlogUrl || !blogUrlInput.trim()} 
                  className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:w-auto w-full"
                >
                  {isProcessingBlogUrl ? (
                  <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"/></svg>Processing...</>
                  ) : 'Process URL'}
                </button>
              </div>
            </div>

            <div className="mt-6 p-6 bg-gray-800/40 backdrop-blur-sm rounded-lg shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-primary-400">Product Analysis</h2>
                <div className="flex flex-row gap-4 items-center">
                  <button
                    onClick={handleGenerateAnalysis}
                    disabled={isGeneratingAnalysis || product?.associatedDocuments.filter(doc => doc.extracted_text).length === 0}
                    className="px-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isGeneratingAnalysis ? (
                      <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"/></svg>Generating...</>
                    ) : 'Generate Analysis'}
                  </button>
                  { (parsedAnalysisData || analysisParsingError) && !isGeneratingAnalysis && (
                    <button
                      onClick={handleDeleteAnalysis}
                      disabled={isDeletingAnalysis || isCardActionLoading}
                      className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isDeletingAnalysis ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"/></svg>Deleting...</>
                      ) : 'Delete Analysis'}
                    </button>
                  )}
                </div>
              </div>

              {isGeneratingAnalysis && (
                <div className="mt-4 text-center"><p className="text-lg"><svg className="animate-spin inline -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"/></svg>Loading analysis...</p></div>
              )}

              {!isGeneratingAnalysis && analysisParsingError && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <h3 className="text-xl font-medium mb-2 text-red-300">Analysis Error</h3>
                  <p className="text-red-200 mb-3">{analysisParsingError}</p>
                  {analysisResults && (
                    <div>
                      <h4 className="text-md font-semibold text-yellow-300 mb-1">Raw Response (for debugging):</h4>
                      <pre className="whitespace-pre-wrap break-all text-sm p-2 bg-gray-900/50 rounded max-h-60 overflow-auto">{JSON.stringify(analysisResults, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {!isGeneratingAnalysis && !analysisParsingError && parsedAnalysisData && (
                <ProductCard
                  product={parsedAnalysisData} // Pass the parsed analysis data
                  index={0} // Since it's a single product view
                  isActionLoading={isGeneratingAnalysis || isSavingSection || isCardActionLoading} // Combine loading states
                  onSave={(updatedProduct: ProductAnalysis) => handleSaveProduct(updatedProduct)} // Type assertion
                  onApprove={(approvedProduct: ProductAnalysis, idx: number) => handleApproveProduct(approvedProduct, idx)} // Type assertion
                  onUpdateSection={handleProductSectionUpdate}
                  updateProduct={(updatedData: ProductAnalysis) => {
                    // When ProductCard internally updates, reflect it in parsedAnalysisData and product state
                    setParsedAnalysisData(updatedData); 
                    if (product) {
                      setProduct({...product, generated_analysis_data: updatedData });
                    }
                  }}
                  isMultipleProducts={false} // It's a single product page
                  isAdmin={false} // Pass isAdmin status
                  enableEditing={true} // Enable editing for capabilities and other product fields
                  onClose={() => navigate('/dashboard/products')} // Example: navigate back on close
                  research_result_id={product?.id} // Pass the research_result_id (product.id)
                />
              )}

              {!isGeneratingAnalysis && !analysisParsingError && !parsedAnalysisData && (
                <div className="mt-6 text-center text-gray-400">
                  <p>No analysis data available. Click "Generate Analysis" to create one.</p>
                </div>
              )}
            </div>

            <div className="bg-gray-800/40 backdrop-blur-sm shadow-xl rounded-lg p-6 md:p-8 mt-8">
                <h2 className="text-2xl font-semibold text-gray-100 mb-6 border-b border-gray-700/50 pb-3">Associated Documents</h2>
                
                {/* Filtering and Sorting Controls */}
                {product?.associatedDocuments.length > 0 && (
                  <div className="mb-6 p-4 bg-secondary-700/50 rounded-lg flex flex-wrap gap-4 items-center">
                    <div className='flex-1 min-w-[150px]'>
                      <label htmlFor="filterTerm" className="block text-xs font-medium text-gray-400 mb-1">Filter by Term</label>
                      <input 
                        type="text" 
                        id="filterTerm" 
                        value={filterTerm} 
                        onChange={(e) => setFilterTerm(e.target.value)} 
                        placeholder="Search documents" 
                        className="w-full px-3 py-2 bg-white border border-secondary-500 rounded-md text-sm text-black placeholder:text-gray-500 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className='flex-1 min-w-[150px]'>
                      <label htmlFor="filterType" className="block text-xs font-medium text-gray-400 mb-1">Filter by Type</label>
                      <select 
                        id="filterType" 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-secondary-500 rounded-md text-sm text-black focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="all">All Types</option>
                        {uniqueDocumentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div className='flex-1 min-w-[150px]'>
                      <label htmlFor="filterStatus" className="block text-xs font-medium text-gray-400 mb-1">Filter by Status</label>
                      <select 
                        id="filterStatus" 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-secondary-500 rounded-md text-sm text-black focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="all">All Statuses</option>
                        {uniqueDocumentStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div className='flex-1 min-w-[150px]'>
                      <label htmlFor="sortBy" className="block text-xs font-medium text-gray-400 mb-1">Sort by</label>
                      <div className="flex">
                        <select 
                          id="sortBy" 
                          value={sortConfig.field} 
                          onChange={(e) => handleSortChange(e.target.value as SortableField)} 
                          className="flex-grow px-3 py-2 bg-white border border-secondary-500 rounded-l-md text-sm text-black focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="created_at">Date Added</option>
                          <option value="file_name">Name</option>
                          <option value="document_type">Type</option>
                          <option value="status">Status</option>
                        </select>
                        <button 
                          onClick={() => handleSortChange(sortConfig.field)} 
                          className="px-3 py-2 bg-secondary-600 border border-l-0 border-secondary-500 rounded-r-md text-gray-300 hover:bg-secondary-500"
                          title={`Sort ${sortConfig.direction === 'asc' ? 'Descending' : 'Ascending'}`}
                        >
                          {sortConfig.direction === 'asc' ? <ChevronUp size={18} className="text-gray-700 dark:text-gray-400" /> : <ChevronDown size={18} className="text-gray-700 dark:text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isGeneratingAnalysis && <p>Loading documents...</p>}
                {!isGeneratingAnalysis && displayedDocuments.length === 0 && product?.associatedDocuments.length > 0 && (
                    <p className="text-gray-400">No documents match the current filter criteria.</p>
                )}
                {!isGeneratingAnalysis && product?.associatedDocuments.length === 0 && (
                    <p className="text-gray-400">No documents are currently associated with this product.</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedDocuments.map((doc) => (
                    <AssociatedDocumentCard 
                        key={doc.id} 
                        document={doc} 
                        onDelete={handleDeleteDocument} 
                        onView={handleViewDocument} 
                    />
                    ))}
                </div>
            </div>

          </div>
        </div>
      </div>
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-full shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105 z-50 flex items-center space-x-2"
          aria-label="Open AI Chat"
        >
          <MessageSquareText size={24} />
        </button>
      )}
      {isChatOpen && <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
      <DocumentPreviewModal 
        document={previewDocument} 
        isOpen={isPreviewModalOpen} 
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewDocument(null);
        }} 
      />
    </>
  );
};

export default DedicatedProductPage;
