import { supabase } from './supabase';
import { ContentBrief } from '../types/contentBrief';

export async function getContentBriefs(page = 1, limit = 10) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data: briefs, error, count } = await supabase
    .from('content_briefs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) {
    throw error;
  }

  return {
    briefs: briefs as ContentBrief[],
    total: count || 0,
  };
}

export async function updateBriefStatus(briefId: string, status: ContentBrief['status']) {
  const { error } = await supabase
    .from('content_briefs')
    .update({ status })
    .eq('id', briefId);

  if (error) {
    throw error;
  }
}

export async function getBriefById(briefId: string) {
  // Get the current user's ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  console.log('Fetching brief:', briefId, 'for user:', user.id);

  const { data, error } = await supabase
    .from('content_briefs')
    .select(`
      id,
      user_id,
      brief_content,
      internal_links,
      possible_article_titles,
      suggested_content_frameworks,
      product_name,
      created_at,
      updated_at,
      research_result_id
    `)
    .eq('id', briefId)
    .single();

  if (error) {
    console.error('Error fetching brief:', error);
    throw error;
  }

  console.log('Fetched brief:', data);
  if (!data) throw new Error('Brief not found');

  // Fetch keywords from approved product data if research_result_id exists
  let keywords: string[] = [];
  if (data.research_result_id) {
    try {
      const { data: approvedProduct, error: productError } = await supabase
        .from('approved_products')
        .select('product_data')
        .eq('research_result_id', data.research_result_id)
        .single();

      if (!productError && approvedProduct?.product_data) {
        // Extract keywords from product_data
        const productData = typeof approvedProduct.product_data === 'string' 
          ? JSON.parse(approvedProduct.product_data) 
          : approvedProduct.product_data;
        
        if (productData.keywords && Array.isArray(productData.keywords)) {
          keywords = productData.keywords;
          console.log('Found keywords for content brief:', keywords);
        }
      }
    } catch (productError) {
      console.warn('Could not fetch keywords from approved product:', productError);
    }
  }

  // Helper function to parse string or array fields into arrays
  const parseFieldToArray = (field: any): string[] => {
    if (Array.isArray(field)) {
      return field;
    } else if (typeof field === 'string' && field.trim()) {
      try {
        // Try to parse as JSON array first
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            if (typeof item === 'string') {
              try {
                const parsedItem = JSON.parse(item);
                if (Array.isArray(parsedItem)) {
                  return parsedItem;
                }
                return item;
              } catch {
                return item;
              }
            }
            return item;
          }).flat();
        } else {
          return [field];
        }
      } catch {
        // Not JSON, treat as newline-separated string
        return field.split('\n').filter((item: string) => item.trim().length > 0);
      }
    }
    return [];
  };

  const parsedInternalLinks = parseFieldToArray(data.internal_links);
  const parsedArticleTitles = parseFieldToArray(data.possible_article_titles);

  console.log('[getBriefById] Parsed internal links:', parsedInternalLinks);
  console.log('[getBriefById] Parsed article titles:', parsedArticleTitles);

  // Generate title using keywords instead of product_name
  const generateTitle = () => {
    if (keywords && keywords.length > 0) {
      // Use the first keyword for the title
      return `${keywords[0]} - Content Brief`;
    }
    // Fallback to product_name if no keywords available
    return data.product_name || 'Untitled Brief';
  };

  const transformedData: ContentBrief = {
    ...data,
    status: 'draft',
    title: generateTitle(),
    framework: Array.isArray(data.suggested_content_frameworks) ? data.suggested_content_frameworks.join('\n') : '',
    suggested_links: parsedInternalLinks.map((url: string) => ({
      url,
      title: url.split('/').pop() || new URL(url).hostname,
      relevance: 1
    })),
    suggested_titles: parsedArticleTitles.map((title: string) => ({ title })),
    research_result_id: data.research_result_id || undefined // Include research_result_id in the returned data
  };
  return transformedData;
}

export async function updateBrief(id: string, updates: { brief_content?: string; product_name?: string; status?: ContentBrief['status']; internal_links?: string[] | string; possible_article_titles?: string[] | string; suggested_content_frameworks?: string; }) {
  // DEBUG: Log incoming updates
  console.log('[updateBrief] Incoming updates:', JSON.stringify(updates, null, 2));
  if (updates.internal_links) {
    console.log('[updateBrief] Incoming updates.internal_links:', updates.internal_links);
  }
  if (updates.possible_article_titles) {
    console.log('[updateBrief] Incoming updates.possible_article_titles:', updates.possible_article_titles);
  }

  // CRITICAL: First get the current brief data to ensure we don't lose existing values
  const { data: currentBrief, error: fetchError } = await supabase
    .from('content_briefs')
    .select('internal_links, possible_article_titles, brief_content')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.error('Error fetching current brief for preservation:', fetchError);
    // DEBUG: Log fetch error for current brief
    console.error('[updateBrief] Error fetching current brief:', fetchError);
    
    // If the brief doesn't exist (PGRST116), don't throw error for status-only updates
    if (fetchError.code === 'PGRST116' && Object.keys(updates).length === 1 && updates.status) {
      console.log('[updateBrief] Brief not found, but this is a status-only update. Skipping update.');
      throw new Error(`Content brief with ID ${id} not found. It may have been deleted.`);
    }
    
    throw fetchError;
  }
  
  // DEBUG: Log current brief data fetched
  console.log('[updateBrief] Current brief data fetched:', JSON.stringify(currentBrief, null, 2));
  if (currentBrief) {
    console.log('[updateBrief] Current brief currentBrief.internal_links:', currentBrief.internal_links);
    console.log('[updateBrief] Current brief currentBrief.possible_article_titles:', currentBrief.possible_article_titles);
  }

  // Helper function to always ensure text format (never arrays) for storage in Supabase
  const ensureTextFormat = (value: string[] | string | undefined): string => {
    if (!value) return '';
    // If it's already a string, return it directly (preserve original format)
    if (typeof value === 'string') return value;
    // If it's an array, join with newlines
    if (Array.isArray(value)) return value.join('\n');
    // Fallback
    return String(value);
  };
  
  // Prepare updates, ensuring text format for array-like fields
  const processedUpdates = {
    ...updates,
    // Always convert to text format if present in updates
    ...(updates.internal_links !== undefined && {
      internal_links: ensureTextFormat(updates.internal_links)
    }),
    ...(updates.possible_article_titles !== undefined && {
      possible_article_titles: ensureTextFormat(updates.possible_article_titles)
    })
  };

  // If brief_content is not in updates, preserve the existing one.
  if (!updates.brief_content && currentBrief && currentBrief.brief_content) {
    processedUpdates.brief_content = currentBrief.brief_content;
    console.log('[updateBrief] Preserving existing brief_content');
  } else if (updates.brief_content) {
    console.log('[updateBrief] Using new brief_content from updates');
  }

  // DEBUG: Log processed updates
  console.log('[updateBrief] Processed updates (after ensureTextFormat):', JSON.stringify(processedUpdates, null, 2));
  if (processedUpdates.internal_links) {
    console.log('[updateBrief] Processed updates.internal_links:', processedUpdates.internal_links);
  }
  if (processedUpdates.possible_article_titles) {
    console.log('[updateBrief] Processed updates.possible_article_titles:', processedUpdates.possible_article_titles);
  }
  
  // Prepare final updates with preservation logic
  const preservedUpdates = {
    ...processedUpdates
  };
  
  // Process internal_links updates - allow explicit emptying
  if ('internal_links' in processedUpdates) {
    const newValue = processedUpdates.internal_links;
    // CRITICAL: Always respect the provided value, even if empty string
    // This lets users explicitly clear the field by deleting all text
    if (newValue === '') {
      console.log('EXPLICITLY ALLOWING EMPTY VALUE for internal_links - user deleted all items');
      preservedUpdates.internal_links = '';
    } else if (newValue === undefined || newValue === null) {
      // Only preserve if completely undefined/null (not explicit empty)
      console.log('PRESERVING internal_links in update:', currentBrief.internal_links);
      preservedUpdates.internal_links = String(currentBrief.internal_links || '');
    } else {
      // Allow the update to proceed with text format
      console.log('ALLOWING update to internal_links:', newValue);
    }
  } else if (currentBrief.internal_links) {
    // If not included in updates at all, preserve existing
    preservedUpdates.internal_links = String(currentBrief.internal_links);
  }
  
  if ('possible_article_titles' in processedUpdates) {
    const newValue = processedUpdates.possible_article_titles;
    // CRITICAL: Always respect the provided value, even if empty string
    // This lets users explicitly clear the field by deleting all text
    if (newValue === '') {
      console.log('EXPLICITLY ALLOWING EMPTY VALUE for possible_article_titles - user deleted all items');
      preservedUpdates.possible_article_titles = '';
    } else if (newValue === undefined || newValue === null) {
      // Only preserve if completely undefined/null (not explicit empty)
      console.log('PRESERVING possible_article_titles in update:', currentBrief.possible_article_titles);
      preservedUpdates.possible_article_titles = String(currentBrief.possible_article_titles || '');
    } else {
      // Allow the update to proceed with text format
      console.log('ALLOWING update to possible_article_titles:', newValue);
    }
  } else if (currentBrief.possible_article_titles) {
    // If not included in updates at all, preserve existing
    preservedUpdates.possible_article_titles = String(currentBrief.possible_article_titles);
  }
  
  console.log('FINAL UPDATE PAYLOAD to Supabase:', preservedUpdates);
  
  // Now perform the update with the preserved data
  const { data, error } = await supabase
    .from('content_briefs')
    .update({
      ...preservedUpdates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // DEBUG: Log Supabase update error
    console.error('[updateBrief] Supabase update error:', error);
    throw error;
  }
  // DEBUG: Log Supabase update success
  console.log('[updateBrief] Supabase update successful. Returned data:', JSON.stringify(data, null, 2));
  return data as Omit<ContentBrief, 'brief_content_text'>;
}

/**
 * Fetches pain points from the approved_products table
 * This function can be used without a specific research_result_id to get all available pain points
 */
export async function fetchPainPoints(researchResultId?: string) {
  try {
    let query = supabase
      .from('approved_products')
      .select('product_data, research_result_id');
    
    // If a research_result_id is provided, try both id and research_result_id fields
    if (researchResultId) {
      query = query.or(`id.eq.${researchResultId},research_result_id.eq.${researchResultId}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching pain points:', error);
      return [];
    }
    
    // Process all product data to extract pain points
    let allPainPoints: string[] = [];
    
    if (data && data.length > 0) {
      data.forEach(item => {
        if (item.product_data) {
          // Parse product_data JSON and extract pain points
          try {
            const productData = typeof item.product_data === 'string'
              ? JSON.parse(item.product_data)
              : item.product_data;
            
            // Extract pain points array
            const painPoints = productData.painPoints || [];
            if (painPoints.length > 0) {
              allPainPoints = [...allPainPoints, ...painPoints];
            }
          } catch (parseError) {
            console.error('Error parsing product data:', parseError);
          }
        }
      });
    }
    
    // Return unique pain points
    return Array.from(new Set(allPainPoints));
  } catch (err) {
    console.error('Unexpected error fetching pain points:', err);
    return [];
  }
}

/**
 * Interface for capability objects
 */
export interface Capability {
  title?: string;
  name?: string;
  description?: string;
  content?: string;
  text?: string;
  displayText: string; // This will always be populated for rendering
  fullText: string;   // Complete information for adding to the content brief
}

/**
 * Fetches capabilities from the approved_products table
 * This function can be used without a specific research_result_id to get all available capabilities
 */
export async function fetchCapabilities(researchResultId?: string): Promise<Capability[]> {
  try {
    let query = supabase
      .from('approved_products')
      .select('product_data, research_result_id');
    
    // If a research_result_id is provided, filter by it
    if (researchResultId) {
      query = query.eq('research_result_id', researchResultId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching capabilities:', error);
      return [];
    }
    
    // Process all product data to extract capabilities
    let allCapabilities: Capability[] = [];
    
    if (data && data.length > 0) {
      data.forEach(item => {
        if (item.product_data) {
          // Parse product_data JSON and extract capabilities
          try {
            const productData = typeof item.product_data === 'string'
              ? JSON.parse(item.product_data)
              : item.product_data;
            
            // Extract capabilities array (could be stored in different fields)
            const capabilities = productData.capabilities || 
                               productData.features || 
                               productData.keyFeatures || 
                               [];
            
            if (capabilities && capabilities.length > 0) {
              // Process each capability - could be string or object
              const processedCapabilities: Capability[] = capabilities.map((capability: any) => {
                // If capability is an object, extract all relevant properties
                if (capability && typeof capability === 'object') {
                  const title = capability.title || capability.name || '';
                  const description = capability.description || capability.content || capability.text || '';
                  
                  // Create a structured capability object
                  return {
                    title,
                    description,
                    // Set displayText for dropdown (title + preview of description)
                    displayText: title + (description ? ': ' + description.substring(0, 50) + (description.length > 50 ? '...' : '') : ''),
                    // Set fullText to store the complete capability text
                    fullText: title + (description ? '\n' + description : '')
                  };
                }
                
                // If it's a string, create a simple capability object
                const stringValue = String(capability).trim();
                return {
                  title: stringValue,
                  displayText: stringValue,
                  fullText: stringValue
                };
              });
              
              // Filter out any empty items
              const filteredCapabilities = processedCapabilities.filter((cap: Capability) => 
                cap && cap.displayText && cap.displayText.trim() !== '');
                
              allCapabilities = [...allCapabilities, ...filteredCapabilities];
            }
          } catch (parseError) {
            console.error('Error parsing product data:', parseError);
          }
        }
      });
    }
    
    console.log('Processed capabilities:', allCapabilities);
    
    // Return unique capabilities (based on displayText)
    const uniqueSet = new Set<string>();
    return allCapabilities.filter(cap => {
      if (uniqueSet.has(cap.displayText)) {
        return false;
      }
      uniqueSet.add(cap.displayText);
      return true;
    });
  } catch (err) {
    console.error('Unexpected error fetching capabilities:', err);
    return [];
  }
}

/**
 * Fetches USPs (Unique Selling Propositions) from the approved_products table
 * This function can be used without a specific research_result_id to get all available USPs
 */
export async function fetchUSPs(researchResultId?: string) {
  try {
    let query = supabase
      .from('approved_products')
      .select('product_data, research_result_id');
    
    // If a research_result_id is provided, try both id and research_result_id fields
    if (researchResultId) {
      query = query.or(`id.eq.${researchResultId},research_result_id.eq.${researchResultId}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching USPs:', error);
      return [];
    }
    
    // Process all product data to extract USPs
    let allUSPs: string[] = [];
    
    if (data && data.length > 0) {
      data.forEach(item => {
        if (item.product_data) {
          // Parse product_data JSON and extract USPs
          try {
            const productData = typeof item.product_data === 'string'
              ? JSON.parse(item.product_data)
              : item.product_data;
            
            // Extract USPs array (could be stored in different fields)
            const usps = productData.usps || 
                        productData.unique_selling_propositions ||
                        productData.uniqueSellingPropositions ||
                        productData.selling_points ||
                        productData.value_propositions ||
                        [];
            
            if (usps.length > 0) {
              allUSPs = [...allUSPs, ...usps];
            }
          } catch (parseError) {
            console.error('Error parsing product data for USPs:', parseError);
          }
        }
      });
    }
    
    // Return unique USPs
    return Array.from(new Set(allUSPs));
  } catch (err) {
    console.error('Unexpected error fetching USPs:', err);
    return [];
  }
}

/**
 * Fetches competitors from the approved_products table
 * This function can be used without a specific research_result_id to get all available competitors
 */
export async function fetchCompetitors(researchResultId?: string) {
  try {
    console.log('=== FETCHCOMPETITORS DEBUG START ===');
    console.log('fetchCompetitors called with researchResultId:', researchResultId);
    
    let query = supabase
      .from('approved_products')
      .select('product_data, research_result_id, id');
    
    // If a research_result_id is provided, try both id and research_result_id fields
    if (researchResultId) {
      console.log('Adding query filter for researchResultId:', researchResultId);
      // First try by id field, then by research_result_id field
      query = query.or(`id.eq.${researchResultId},research_result_id.eq.${researchResultId}`);
    }
    
    const { data, error } = await query;
    
    console.log('Database query result:', { data, error, dataLength: data?.length });
    
    if (error) {
      console.error('Error fetching competitors:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No data found in approved_products table');
      return [];
    }
    
    // Process all product data to extract competitors
    let allCompetitors: string[] = [];
    
    data.forEach((item, index) => {
      console.log(`=== Processing item ${index} ===`);
      console.log('Item ID:', item.id);
      console.log('Item research_result_id:', item.research_result_id);
      console.log('Item product_data type:', typeof item.product_data);
      
      if (item.product_data) {
        try {
          const productData = typeof item.product_data === 'string'
            ? JSON.parse(item.product_data)
            : item.product_data;
          
          console.log('Product data keys:', Object.keys(productData));
          console.log('Competitors field exists:', 'competitors' in productData);
          console.log('Competitors field value:', productData.competitors);
          console.log('Competitors field type:', typeof productData.competitors);
          
          // Look for competitors in different possible structures
          let competitors: string[] = [];
          
          // Method 1: Simple array structure
          if (productData.competitors && Array.isArray(productData.competitors)) {
            console.log('Found competitors as array:', productData.competitors);
            competitors = [...competitors, ...productData.competitors];
          }
          
          // Method 2: Structured object with categories (Direct, Niche, Broader)
          else if (productData.competitors && typeof productData.competitors === 'object') {
            console.log('Found competitors as object, processing categories...');
            const competitorObj = productData.competitors;
            console.log('Competitor object keys:', Object.keys(competitorObj));
            
            // Extract from different categories - include underscore versions
            ['direct', 'niche', 'broader', 'primary', 'secondary', 'indirect', 'Direct', 'Niche', 'Broader', 'direct_competitors', 'niche_competitors', 'broader_competitors'].forEach(category => {
              const categoryData = competitorObj[category];
              console.log(`Category '${category}':`, categoryData);
              
              if (Array.isArray(categoryData)) {
                console.log(`Processing ${categoryData.length} competitors in category '${category}'`);
                // Each competitor might be an object with name and description
                categoryData.forEach((comp: any, compIndex: number) => {
                  console.log(`  Competitor ${compIndex}:`, comp, typeof comp);
                  
                  if (typeof comp === 'string') {
                    competitors.push(comp);
                    console.log(`    Added string competitor: ${comp}`);
                  } else if (comp && typeof comp === 'object') {
                    // Extract name from object structure like {company_name: "Company", product_name: "Platform", category: "Type"}
                    const companyName = comp.company_name || comp.name || comp.company || comp.competitor || comp.title;
                    const productName = comp.product_name || comp.product || comp.platform;
                    const category = comp.category || comp.description;
                    
                    console.log(`    Extracted company_name: ${companyName}`);
                    console.log(`    Extracted product_name: ${productName}`);
                    console.log(`    Extracted category: ${category}`);
                    
                    if (companyName) {
                      // Build the competitor string based on available data
                      let competitorString = companyName;
                      
                      if (productName) {
                        competitorString += ` (${productName})`;
                      }
                      
                      if (category && !productName) {
                        competitorString += ` (${category})`;
                      }
                      
                      competitors.push(competitorString);
                      console.log(`    Added competitor: ${competitorString}`);
                    }
                  }
                });
              }
            });
          }
          
          // Method 3: Look in alternative field names
          ['competition', 'competitive_landscape', 'rivals', 'competitive_analysis'].forEach(field => {
            if (productData[field]) {
              console.log(`Found alternative field '${field}':`, productData[field]);
              if (Array.isArray(productData[field])) {
                competitors = [...competitors, ...productData[field]];
              } else if (typeof productData[field] === 'object') {
                // Handle nested object structure
                Object.values(productData[field]).forEach((value: any) => {
                  if (Array.isArray(value)) {
                    competitors = [...competitors, ...value];
                  }
                });
              }
            }
          });
          
          console.log(`Extracted ${competitors.length} competitors from item ${index}:`, competitors);
          
          if (competitors.length > 0) {
            allCompetitors = [...allCompetitors, ...competitors];
          }
        } catch (parseError) {
          console.error('Error parsing product data for competitors:', parseError);
        }
      }
    });
    
    console.log('=== FINAL RESULT ===');
    console.log('All competitors before deduplication:', allCompetitors);
    const uniqueCompetitors = Array.from(new Set(allCompetitors));
    console.log('Final unique competitors list:', uniqueCompetitors);
    console.log('=== FETCHCOMPETITORS DEBUG END ===');
    
    // Return unique competitors
    return uniqueCompetitors;
  } catch (err) {
    console.error('Unexpected error fetching competitors:', err);
    return [];
  }
}
