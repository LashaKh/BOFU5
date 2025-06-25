import { supabase } from './supabase';
import { ProductAnalysis } from '../types/product';

export interface ResearchResult {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  data: ProductAnalysis[];
  is_draft: boolean;
}

export async function saveResearchResults(results: ProductAnalysis[], title: string, isDraft = false): Promise<string> {
  try {
    // If results is an array with one item, use it directly, otherwise wrap single result in array
    const dataToSave = Array.isArray(results) ? results : [results];
    
    // Generate a unique fingerprint of this data for logging and duplicate detection
    const firstProduct = dataToSave[0] || {};
    const dataFingerprint = `${firstProduct.companyName || ''}-${dataToSave.length}-${Date.now().toString().slice(0, -3)}`;
    
    console.log('[research] Saving research results with fingerprint:', dataFingerprint);
    
    // Check for recent similar research to avoid duplicates (within last 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const { data: existingEntries, error: fetchError } = await supabase
      .from('research_results')
      .select('id, title, data, created_at')
      .gt('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('[research] Error checking for recent entries:', fetchError);
    } else if (existingEntries && existingEntries.length > 0) {
      console.log(`[research] Found ${existingEntries.length} recent entries, checking for duplicates`);
      
      // Check if any recent entry matches our data (same company and product count)
      for (const entry of existingEntries) {
        const entryData = entry.data;
        
        if (Array.isArray(entryData) && 
            entryData.length === dataToSave.length && 
            entryData[0]?.companyName === firstProduct.companyName) {
          
          console.log(`[research] Found potential duplicate: ${entry.id}, returning this ID instead of creating new entry`);
          return entry.id;
        }
      }
    }
    
    // No duplicates found, proceed with saving
    const { data, error } = await supabase
      .from('research_results')
      .insert({
        title,
        data: dataToSave,
        is_draft: isDraft,
        user_id: undefined  // Let the database set this automatically
      })
      .select('id')
      .single();

    if (error) throw error;
    console.log(`[research] Successfully saved research results with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error saving research results:', error);
    throw error;
  }
}

export async function updateResearchResults(id: string, results: ProductAnalysis[], title: string, isDraft = false): Promise<void> {
  try {
    const { error } = await supabase
      .from('research_results')
      .update({
        title,
        data: results,
        is_draft: isDraft
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating research results:', error);
    throw error;
  }
}

// Add a function to save an approved product to the approved_products table
export async function saveApprovedProduct(
  researchResultId: string,
  product: ProductAnalysis,
  productIndex: number,
  approvedBy: string
): Promise<string> {
  try {
    console.log('[research] Saving product to approved_products:', { 
      researchResultId, 
      productName: product.productDetails?.name,
      approvedBy
    });

    // Insert the approved product into the approved_products table
    const { data, error } = await supabase
      .from('approved_products')
      .insert({
        research_result_id: researchResultId,
        product_index: productIndex,
        product_name: product.productDetails?.name || 'Unnamed Product',
        product_description: product.productDetails?.description || '',
        company_name: product.companyName || '',
        approved_by: approvedBy,
        product_data: product,
        reviewed_status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('[research] Error saving approved product:', error);
      throw error;
    }
    
    console.log('[research] Successfully saved to approved_products with id:', data.id);
    return data.id;
  } catch (error) {
    console.error('[research] Error saving approved product:', error);
    throw error;
  }
}

// Function to get all approved products for the admin dashboard
export async function getApprovedProducts(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('approved_products')
      .select('*')
      .order('approved_at', { ascending: false });

    if (error) throw error;
    
    // Add source ID (either research_result_id or product_id) to each product's data
    return (data || []).map(item => ({
      ...item,
      product_data: {
        ...item.product_data,
        research_result_id: item.research_result_id,
        product_id: item.product_id
      }
    }));
  } catch (error) {
    console.error('[research] Error fetching approved products:', error);
    throw error;
  }
}

// Function to update an approved product's data
export async function updateApprovedProduct(
  id: string,
  updatedProductData: any
): Promise<void> {
  try {
    console.log('[research] Updating approved product:', { id, updatedProductData });
    
    const { error } = await supabase
      .from('approved_products')
      .update({
        product_data: updatedProductData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('[research] Error updating approved product:', error);
      throw error;
    }
    
    console.log('[research] Successfully updated approved product:', id);
  } catch (error) {
    console.error('[research] Error updating approved product:', error);
    throw error;
  }
}

// Function to update an approved product's review status
export async function updateApprovedProductStatus(
  id: string,
  status: 'pending' | 'reviewed' | 'rejected',
  reviewerId: string,
  comments?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('approved_products')
      .update({
        reviewed_status: status,
        reviewer_id: reviewerId,
        reviewer_comments: comments || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[research] Error updating approved product status:', error);
    throw error;
  }
}

export async function getResearchResults(): Promise<ResearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('research_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching research results:', error);
    throw error;
  }
}

export async function getResearchResultById(id: string): Promise<ResearchResult | null> {
  try {
    const { data, error } = await supabase
      .from('research_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching research result:', error);
    throw error;
  }
}

export async function deleteResearchResult(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('research_results')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting research result:', error);
    throw error;
  }
}

// Function to delete an approved product
export async function deleteApprovedProduct(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('approved_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[research] Error deleting approved product:', error);
    throw error;
  }
}