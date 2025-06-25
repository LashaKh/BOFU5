import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { ArrowLeft, Loader2, Eye, Search, Filter, BookOpen, FileText, Edit, X, MessageSquare, Package, Building2, Users, Crown, UserCog, ChevronDown, ChevronRight, Badge, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProductAnalysis } from '../../types/product/types';
import { ContentBriefDisplay } from '../content-brief/ContentBriefDisplay';
import { ProductCard } from '../product/ProductCard';
import { ResponsiveApprovalButton } from '../common/ResponsiveApprovalButton';
import { ContentBrief } from '../../types/contentBrief';
import { getApprovedProducts, updateApprovedProduct } from '../../lib/research';

// Interface for research results from database
interface ResearchResult {
  id: string;
  user_id: string;
  title: string;
  data: any[]; // This contains the product analysis data
  is_draft: boolean;
  is_approved: boolean;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

// Interface for user profile with enhanced structure
interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_type?: 'main' | 'sub';
  profile_role?: 'admin' | 'manager' | 'editor' | 'viewer';
  parent_user_id?: string;
  profile_name?: string;
  briefCount?: number; // Add brief count for aggregation
  researchResultsCount?: number; // Add research results count
}

// Interface for grouped user data
interface CompanyGroup {
  company_name: string;
  main_account: UserProfile;
  sub_accounts: UserProfile[];
  total_users: number;
  created_at: string;
}

interface ContentBriefManagementProps {
  onBack?: () => void;
}

export function ContentBriefManagement({ onBack }: ContentBriefManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userResearchResults, setUserResearchResults] = useState<ResearchResult[]>([]);
  const [userContentBriefs, setUserContentBriefs] = useState<ContentBrief[]>([]);
  const [selectedUserForBriefs, setSelectedUserForBriefs] = useState<{ user: UserProfile; companyGroup: CompanyGroup } | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'company' | 'email' | 'date'>('company');
  const [expandedProductIndex, setExpandedProductIndex] = useState<string | null>(null);
  const [isLoadingResearch, setIsLoadingResearch] = useState(true);
  const [isLoadingBriefs, setIsLoadingBriefs] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [approvedProducts, setApprovedProducts] = useState<any[]>([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(true);

  // Fetch all users with enhanced company and profile data using admin permissions
  const fetchUsers = async () => {
      setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 ContentBriefManagement: Starting to fetch users...');
      
      if (!supabaseAdmin) {
        console.error('Admin client not available');
        setError('Admin permissions not configured');
        return;
      }
      
      // Step 1: Fetch main user profiles
      const { data: mainUsersData, error: mainUsersError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .not('company_name', 'is', null)
        .neq('company_name', '');

      if (mainUsersError) {
        console.error('Error fetching main users:', mainUsersError);
        throw mainUsersError;
      }

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Main users fetched:', mainUsersData?.length || 0);

      // Step 2: Fetch company profiles to understand user hierarchy
      const { data: companyProfiles, error: companyError } = await supabaseAdmin
        .from('company_profiles')
        .select('*');

      if (companyError) {
        console.error('Error fetching company profiles:', companyError);
        throw companyError;
      }

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Company profiles fetched:', companyProfiles?.length || 0);

      // Step 3: Process users and determine types
      const mainUsersProcessed: UserProfile[] = (mainUsersData || []).map(user => ({
        id: user.id,
        email: user.email,
        company_name: user.company_name || 'Unknown Company',
        created_at: user.created_at,
        updated_at: user.updated_at,
        avatar_url: user.avatar_url || undefined,
        user_type: 'main', // All user_profiles entries are considered main accounts
        briefCount: 0,
        researchResultsCount: 0 // Add research results count
      }));

      // Step 4: Process sub-users (company_profiles that have different user_ids)
      const subUsersProcessed: UserProfile[] = (companyProfiles || [])
        .filter(profile => profile.company_id)
        .map(profile => {
          // Find the matching main user
          const mainUser = mainUsersProcessed.find(u => u.id === profile.user_id);
          return {
            id: profile.user_id,
            email: mainUser?.email || `user-${profile.user_id}`,
            company_name: profile.company_id || 'Unknown Company',
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            avatar_url: mainUser?.avatar_url || undefined,
            user_type: 'sub' as const,
            briefCount: 0,
            researchResultsCount: 0 // Add research results count
          };
        });

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Processed users:', {
        mainUsers: mainUsersProcessed.length,
        subUsers: subUsersProcessed.length
      });

      // Step 5: Get all unique user IDs for content brief and research results counting
      const allUsers = [...mainUsersProcessed, ...subUsersProcessed];
      const uniqueUserIds = [...new Set(allUsers.map(user => user.id))];

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Unique user IDs for queries:', {
        totalUniqueUsers: uniqueUserIds.length,
        userIds: uniqueUserIds.slice(0, 5) // Show first 5
      });

      // Step 6: Fetch content briefs for all users
      const { data: contentBriefs, error: briefsError } = await supabaseAdmin
        .from('content_briefs')
        .select('user_id, product_name, id, brief_content, research_result_id, status, created_at, updated_at')
        .in('user_id', uniqueUserIds)
        .order('created_at', { ascending: false });

      if (briefsError) {
        console.error('Error fetching content briefs:', briefsError);
      } else {
        console.log('🔍 [CONTENT_BRIEF_DEBUG] Raw content briefs fetched:', {
          totalBriefs: contentBriefs?.length || 0,
          briefSample: contentBriefs?.slice(0, 3)
        });
      }

      // Step 7: Fetch research results for all users  
      const { data: researchResults, error: researchError } = await supabaseAdmin
        .from('research_results')
        .select('user_id, id, title, data, is_draft, is_approved, created_at, updated_at')
        .in('user_id', uniqueUserIds)
        .order('created_at', { ascending: false });

      if (researchError) {
        console.error('Error fetching research results:', researchError);
      } else {
        console.log('🔍 [CONTENT_BRIEF_DEBUG] Raw research results fetched:', {
          totalResults: researchResults?.length || 0,
          resultSample: researchResults?.slice(0, 3)
        });
      }

      // Step 8: Count unique content briefs per user (avoid double counting)
      const briefCountMap: { [key: string]: number } = {};
      const uniqueBriefs = new Set();

      (contentBriefs || []).forEach(brief => {
        const normalizedProductName = (brief.product_name || 'untitled')
          .toLowerCase().trim().replace(/\s+/g, ' ');
        const uniqueKey = `${brief.user_id}-${normalizedProductName}`;
        
        if (!uniqueBriefs.has(uniqueKey)) {
          uniqueBriefs.add(uniqueKey);
          briefCountMap[brief.user_id] = (briefCountMap[brief.user_id] || 0) + 1;
        }
      });

      // Step 9: Count research results per user
      const researchCountMap: { [key: string]: number } = {};
      (researchResults || []).forEach(result => {
        researchCountMap[result.user_id] = (researchCountMap[result.user_id] || 0) + 1;
      });

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Count maps:', {
        briefCountMap,
        researchCountMap,
        totalUniqueBriefs: uniqueBriefs.size,
        totalResearchResults: (researchResults || []).length
      });

      // Step 10: Apply counts to users
      const usersWithCounts = allUsers.map(user => ({
        ...user,
        briefCount: briefCountMap[user.id] || 0,
        researchResultsCount: researchCountMap[user.id] || 0
      }));

      // Step 11: Group by company and create company representatives 
      // Show ALL companies, not just those with content briefs
      const companyRepresentatives = new Map();
      
      usersWithCounts.forEach(user => {
        const companyName = user.company_name;
        if (!companyRepresentatives.has(companyName)) {
          companyRepresentatives.set(companyName, {
            ...user,
            user_type: 'main' // Treat the first user found for each company as the main representative
          });
        } else {
          // Add counts to the existing company representative
          const existing = companyRepresentatives.get(companyName);
          existing.briefCount += user.briefCount;
          existing.researchResultsCount += user.researchResultsCount;
        }
      });

      const finalUsers = Array.from(companyRepresentatives.values());

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Final company representatives (ALL COMPANIES):', {
        totalCompanies: finalUsers.length,
        companies: finalUsers.map(u => ({ 
          email: u.email, 
          company: u.company_name, 
          briefs: u.briefCount,
          researchResults: u.researchResultsCount,
          type: u.user_type 
        }))
      });

      // Step 9: Display ALL users with their respective counts (don't filter out companies with 0 briefs)
      const finalUsersWithBriefs = finalUsers.map(user => ({
        ...user,
        briefCount: briefCountMap[user.id] || 0,
        researchResultsCount: researchCountMap[user.id] || 0
      }));

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Final user distribution:', {
        totalUsers: finalUsersWithBriefs.length,
        usersWithBriefs: finalUsersWithBriefs.filter(u => (u.briefCount || 0) > 0).length,
        usersWithResearch: finalUsersWithBriefs.filter(u => (u.researchResultsCount || 0) > 0).length,
        usersWithEither: finalUsersWithBriefs.filter(u => (u.briefCount || 0) > 0 || (u.researchResultsCount || 0) > 0).length
      });

      setUsers(finalUsersWithBriefs);

    } catch (err) {
      console.error('ContentBriefManagement: Error in fetchUsers:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user's research results (contains product data)
  const fetchUserResearchResults = async (userId: string) => {
    try {
      setIsLoadingResearch(true);
      const { data, error } = await supabase
        .from('research_results')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      console.log('📊 ContentBriefManagement: Raw research results loaded:', data);
      
      const processedResults = data.map(result => ({
        ...result,
        data: result.data || []
      }));

      // Log keywords found in the data
      processedResults.forEach((result, resultIndex) => {
        if (result.data && Array.isArray(result.data)) {
          result.data.forEach((product: any, productIndex: number) => {
            if (product.keywords && product.keywords.length > 0) {
              console.log(`🏷️ ContentBriefManagement: Found keywords in result ${resultIndex}, product ${productIndex}:`, product.keywords);
              console.log(`📝 Product name: ${product.productDetails?.name || product.companyName}`);
            }
          });
        }
      });

      setUserResearchResults(processedResults);
    } catch (error) {
      console.error('❌ ContentBriefManagement: Error fetching research results:', error);
    } finally {
      setIsLoadingResearch(false);
    }
  };

  // Fetch user's content briefs
  const fetchUserContentBriefs = async (userId: string) => {
    try {
      setIsLoadingBriefs(true);
      const { data, error } = await supabase
        .from('content_briefs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching content briefs:', error);
        setUserContentBriefs([]);
        return;
      }

      console.log('Content briefs fetched:', data);
      setUserContentBriefs(data || []);
    } catch (error) {
      console.error('Error in fetchUserContentBriefs:', error);
      setUserContentBriefs([]);
    } finally {
      setIsLoadingBriefs(false);
    }
  };

  // Handle user selection
  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    await Promise.all([
      fetchUserResearchResults(user.id),
      fetchUserContentBriefs(user.id)
    ]);
  };

  // Handle back to users list
  const handleBackToUsers = () => {
    setSelectedUser(null);
    setUserResearchResults([]);
    setUserContentBriefs([]);
  };

  const handleProductClick = (product: any, resultId: string, productIndex: number) => {
    console.log('ProductCard clicked:', product);
    const expandKey = `${resultId}-${productIndex}`;
    setExpandedProductIndex(expandedProductIndex === expandKey ? null : expandKey);
  };

  const handleCloseProductModal = () => {
    setExpandedProductIndex(null);
  };

  const handleGenerateArticleSuccess = () => {
    toast.success('Article generation initiated successfully!');
    // Optionally refresh the content briefs to show updated status
    if (selectedUser) {
      fetchUserContentBriefs(selectedUser.id);
    }
  };

  // Handle content brief updates
  const handleContentBriefUpdate = async (briefId: string, updatedContent: string | object) => {
    try {
      const { error } = await supabase
        .from('content_briefs')
        .update({ 
          brief_content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', briefId);

      if (error) {
        toast.error('Failed to update content brief');
        return;
      }

      toast.success('Content brief updated successfully');
      
      // Refresh the content briefs to show updated data
      if (selectedUserForBriefs) {
        fetchCompanyContentBriefs(selectedUserForBriefs.companyGroup);
      } else if (selectedUser) {
        fetchUserContentBriefs(selectedUser.id);
      }
    } catch (error) {
      console.error('Error updating content brief:', error);
      toast.error('Failed to update content brief');
    }
  };

  // 🛠️ BULK DATA REPAIR FUNCTION - Fix corrupted array data across all research results
  const repairAllCorruptedData = async () => {
    if (!selectedUser) {
      console.error('❌ No user selected for data repair');
      return;
    }

    console.log('🔧 Starting bulk data repair for user:', selectedUser.email);
    
    try {
      const { data: allResults, error: fetchError } = await supabase
        .from('research_results')
        .select('*')
        .eq('user_id', selectedUser.id);

      if (fetchError) {
        console.error('❌ Error fetching research results for repair:', fetchError);
        return;
      }

      console.log(`🔍 Found ${allResults?.length || 0} research results to check`);

      let repairedCount = 0;
      const arrayFields = ['keywords', 'features', 'usps', 'painPoints', 'capabilities'];

      for (const result of allResults || []) {
        if (!result.data || !Array.isArray(result.data)) continue;

        let needsRepair = false;
        const repairedData = result.data.map((product: any) => {
          const sanitized = { ...product };
          
          // Check for corruption pattern: {"0": "fieldName", ...}
          const corruptedFields = Object.keys(sanitized).filter(key => /^\d+$/.test(key));
          
          if (corruptedFields.length > 0) {
            console.log(`🚨 Found corrupted product in result ${result.id}:`, {
              productName: sanitized?.productDetails?.name || sanitized?.companyName,
              corruptedFields
            });
            needsRepair = true;
            
            // Repair corrupted fields
            corruptedFields.forEach(numKey => {
              const fieldName = sanitized[numKey];
              if (typeof fieldName === 'string' && arrayFields.includes(fieldName)) {
                console.log(`🔄 Repairing: ${fieldName} from corrupted key ${numKey}`);
                
                // Initialize the field as an empty array if it doesn't exist
                if (!sanitized[fieldName] || !Array.isArray(sanitized[fieldName])) {
                  sanitized[fieldName] = [];
                }
                
                // Remove the corrupted key
                delete sanitized[numKey];
              }
            });
          }
          
          // Ensure all array fields are properly formatted
          arrayFields.forEach(field => {
            if (sanitized[field] !== undefined && !Array.isArray(sanitized[field])) {
              console.log(`🔧 Converting ${field} to array in result ${result.id}`);
              needsRepair = true;
              
              if (typeof sanitized[field] === 'string') {
                sanitized[field] = [sanitized[field]];
              } else if (sanitized[field] === null || sanitized[field] === undefined) {
                sanitized[field] = [];
              } else {
                // Try to convert object back to array
                try {
                  const values = Object.values(sanitized[field]);
                  if (values.every(v => typeof v === 'string')) {
                    sanitized[field] = values;
                  } else {
                    sanitized[field] = [];
                  }
                } catch (error) {
                  sanitized[field] = [];
                }
              }
            }
          });
          
          return sanitized;
        });

        // Update the database if repairs were needed
        if (needsRepair) {
          console.log(`💾 Updating repaired data for result ${result.id}`);
          const { error: updateError } = await supabase
            .from('research_results')
            .update({ 
              data: repairedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', result.id);

          if (updateError) {
            console.error(`❌ Error updating result ${result.id}:`, updateError);
          } else {
            repairedCount++;
            console.log(`✅ Successfully repaired result ${result.id}`);
          }
        }
      }

      console.log(`🎉 Bulk repair completed! ${repairedCount} results repaired.`);
      
      // Refresh the data after repair
      await fetchUserResearchResults(selectedUser.id);
      
      return repairedCount;
    } catch (error) {
      console.error('💥 Error during bulk data repair:', error);
      throw error;
    }
  };

  // New function to handle product updates in research results
  // Handler for updating approved products (Company Brief view)
  const handleUpdateApprovedProduct = async (approvedProductId: string, sectionType: string, newValue: any) => {
    try {
      console.log('🚀 handleUpdateApprovedProduct called:', { approvedProductId, sectionType, newValue });
      
      // Find the approved product to update
      const approvedProduct = approvedProducts.find(p => p.id === approvedProductId);
      if (!approvedProduct) {
        console.error('❌ Approved product not found:', approvedProductId);
        return;
      }

      // Update the product data
      const updatedProductData = {
        ...approvedProduct.product_data,
        [sectionType]: newValue
      };

      console.log('📝 Updating approved product data:', {
        productName: updatedProductData?.productDetails?.name || updatedProductData?.companyName,
        sectionType,
        newValue
      });

      // Update local state first (prevents race condition)
      setApprovedProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === approvedProductId 
            ? { ...product, product_data: updatedProductData }
            : product
        )
      );
      console.log('✅ Local approved products state updated immediately');

      // Update the database
      await updateApprovedProduct(approvedProductId, updatedProductData);
      console.log('✅ Database update successful for approved product:', approvedProductId);
      
    } catch (error) {
      console.error('💥 Error updating approved product:', error);
      // Revert local state on error
      await fetchApprovedProductsData();
      throw error;
    }
  };

  const handleUpdateSection = async (productIndex: number, sectionType: string, newValue: any) => {
    try {
      console.log('🚀 handleUpdateSection called:', { productIndex, sectionType, newValue });
      
      // Check for both selectedUser and selectedUserForBriefs contexts
      const currentUser = selectedUser || selectedUserForBriefs?.user;
      if (!currentUser || !userResearchResults.length) {
        console.error('❌ No user selected or no research results', { 
          selectedUser: !!selectedUser, 
          selectedUserForBriefs: !!selectedUserForBriefs, 
          userResearchResults: userResearchResults.length 
        });
        return;
      }

      console.log('📊 Available research results:', userResearchResults.length);

      // Find the research result that contains the product
      let targetResearchResult: ResearchResult | null = null;
      let targetProductIndex = -1;
      let globalProductIndex = 0;

      for (const result of userResearchResults) {
        console.log(`🔍 Checking result ${result.id}, data length:`, result.data?.length || 0);
        if (result.data && Array.isArray(result.data)) {
          for (let i = 0; i < result.data.length; i++) {
            console.log(`  📦 Product ${globalProductIndex} (result ${result.id}, index ${i}):`, {
              productName: result.data[i]?.productDetails?.name || result.data[i]?.companyName,
              hasKeywords: !!result.data[i]?.keywords,
              keywords: result.data[i]?.keywords
            });
            
            if (globalProductIndex === productIndex) {
              targetResearchResult = result;
              targetProductIndex = i;
              console.log('🎯 Target found!', { resultId: result.id, localIndex: i, globalIndex: globalProductIndex });
              break;
            }
            globalProductIndex++;
          }
        }
        if (targetResearchResult) break;
      }

      if (!targetResearchResult || targetProductIndex === -1) {
        console.error('❌ Could not find target product for update. ProductIndex:', productIndex, 'Total products:', globalProductIndex);
        return;
      }

      // 🔧 Data sanitization utility - Fix corrupted array-to-object conversions
      const sanitizeProductData = (productData: any): any => {
        console.log('🧹 Sanitizing product data...');
        const sanitized = { ...productData };
        
        // List of fields that should be arrays
        const arrayFields = ['keywords', 'features', 'usps', 'painPoints', 'capabilities'];
        
        // Check for corruption pattern: {"0": "fieldName", ...} instead of {fieldName: [...], ...}
        const corruptedFields = Object.keys(sanitized).filter(key => /^\d+$/.test(key));
        
        if (corruptedFields.length > 0) {
          console.log('🚨 Found corrupted fields:', corruptedFields);
          
          // Try to recover corrupted data
          corruptedFields.forEach(numKey => {
            const fieldName = sanitized[numKey];
            if (typeof fieldName === 'string' && arrayFields.includes(fieldName)) {
              console.log(`🔄 Recovering corrupted field: ${fieldName} from key ${numKey}`);
              
              // Look for existing correct data for this field
              if (sanitized[fieldName] && Array.isArray(sanitized[fieldName])) {
                console.log(`✅ Field ${fieldName} already has correct array data`);
              } else {
                console.log(`⚠️ Field ${fieldName} missing or not an array, initializing empty array`);
                sanitized[fieldName] = [];
              }
              
              // Remove the corrupted key
              delete sanitized[numKey];
            }
          });
        }
        
        // Ensure array fields are properly formatted
        arrayFields.forEach(field => {
          if (sanitized[field] !== undefined && !Array.isArray(sanitized[field])) {
            console.log(`🔧 Converting ${field} to array:`, sanitized[field]);
            if (typeof sanitized[field] === 'string') {
              sanitized[field] = [sanitized[field]];
            } else if (sanitized[field] === null || sanitized[field] === undefined) {
              sanitized[field] = [];
            } else {
              // Try to convert object back to array
              try {
                const values = Object.values(sanitized[field]);
                if (values.every(v => typeof v === 'string')) {
                  sanitized[field] = values;
                  console.log(`🔄 Converted object to array for ${field}:`, values);
                }
              } catch (error) {
                console.warn(`⚠️ Could not convert ${field} to array, using empty array`);
                sanitized[field] = [];
              }
            }
          }
        });
        
        return sanitized;
      };

      // Create updated data array with sanitization
      const updatedData = [...targetResearchResult.data];
      const currentProduct = updatedData[targetProductIndex];
      
      // Sanitize the current product data to fix any existing corruption
      const sanitizedCurrentProduct = sanitizeProductData(currentProduct);
      
      console.log('📝 Current product before update:', {
        productName: sanitizedCurrentProduct?.productDetails?.name || sanitizedCurrentProduct?.companyName,
        currentKeywords: sanitizedCurrentProduct?.keywords,
        sectionType,
        newValue,
        isNewValueArray: Array.isArray(newValue)
      });
      
      // 🚀 Safe array handling for newValue
      let safeNewValue = newValue;
      if (Array.isArray(newValue)) {
        // Ensure arrays remain arrays and don't get corrupted
        safeNewValue = [...newValue]; // Create a clean copy
        console.log('🔒 Protected array value:', safeNewValue);
      }
      
      const updatedProduct = {
        ...sanitizedCurrentProduct,
        [sectionType]: safeNewValue
      };
      
      // Final sanitization pass on the complete updated product
      const finalSanitizedProduct = sanitizeProductData(updatedProduct);
      updatedData[targetProductIndex] = finalSanitizedProduct;

      console.log('📝 Updated product after sanitization:', {
        productName: finalSanitizedProduct?.productDetails?.name || finalSanitizedProduct?.companyName,
        updatedKeywords: finalSanitizedProduct?.keywords,
        sectionType,
        newValue: safeNewValue,
        hasCorruptedKeys: Object.keys(finalSanitizedProduct).some(key => /^\d+$/.test(key))
      });

      // 🚀 UPDATE LOCAL STATE FIRST (prevents race condition)
      setUserResearchResults(prevResults => 
        prevResults.map(result => 
          result.id === targetResearchResult!.id 
            ? { ...result, data: updatedData }
            : result
        )
      );
      console.log('✅ Local state updated immediately');

      // 🔒 Additional protection: ensure the data going to database is clean
      const cleanDataForDatabase = updatedData.map(product => sanitizeProductData(product));
      
      console.log('💾 Saving clean data to database for result:', targetResearchResult.id);
      console.log('🔍 Clean data sample:', {
        firstProduct: cleanDataForDatabase[0] ? {
          hasKeywords: !!cleanDataForDatabase[0].keywords,
          keywordsType: typeof cleanDataForDatabase[0].keywords,
          keywordsLength: Array.isArray(cleanDataForDatabase[0].keywords) ? cleanDataForDatabase[0].keywords.length : 'not array',
          hasCorruptedKeys: Object.keys(cleanDataForDatabase[0]).some(key => /^\d+$/.test(key))
        } : 'no products'
      });

      // Update the research result in the database
      const { error } = await supabase
        .from('research_results')
        .update({ 
          data: cleanDataForDatabase,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetResearchResult.id);

      if (error) {
        console.error('❌ Database update error:', error);
        // 🔄 Revert local state on database error
        await fetchUserResearchResults(currentUser.id);
        throw error;
      }

      console.log('✅ Database update successful for result:', targetResearchResult.id);
      console.log(`📡 Successfully updated ${sectionType} for product ${productIndex}`);
      
    } catch (error) {
      console.error('💥 Error updating product section:', error);
      throw error;
    }
  };

  // Group users by company with proper hierarchy - show all companies
  const groupUsersByCompany = (users: UserProfile[]): CompanyGroup[] => {
    console.log('🔍 Grouping users by company. Total users:', users.length);
    
    const companies = new Map<string, CompanyGroup>();
    
    // Process all main users (regardless of brief count)
    const mainUsers = users.filter(user => 
      user.user_type === 'main'
    );
    
    console.log('🔍 All main users:', mainUsers.length);
    
    mainUsers.forEach(user => {
      const companyName = user.company_name || 'Unknown Company';
      
      if (!companies.has(companyName)) {
        // Find all users for this company (main + sub)
        const companyUsers = users.filter(u => u.company_name === companyName);
        const subAccounts = companyUsers.filter(u => u.user_type === 'sub');
        
          companies.set(companyName, {
            company_name: companyName,
          main_account: user,
          sub_accounts: subAccounts,
          total_users: companyUsers.length,
          created_at: user.created_at
        });
      }
    });
    
    const result = Array.from(companies.values());
    console.log('🏢 Final company groups (all companies):', result.map(c => ({ 
      company: c.company_name, 
      briefCount: c.main_account.briefCount || 0,
      total: c.total_users, 
      subAccounts: c.sub_accounts.length
    })));
    
    return result;
  };

  // Handle company brief selection - show all company content
  const handleCompanyBriefSelection = (user: UserProfile) => {
    const companyGroup = sortedCompanyGroups.find(group => 
      group.main_account.id === user.id
    );
    
    if (companyGroup) {
      setSelectedUserForBriefs({ user, companyGroup });
    }
  };

  // Fetch content briefs and research results for all users in a company
  const fetchCompanyContentBriefs = async (companyGroup: CompanyGroup) => {
    try {
      setIsLoadingBriefs(true);
      setIsLoadingResearch(true);
      
      // Get all user IDs in the company
      const allCompanyUserIds = [
        companyGroup.main_account.id,
        ...companyGroup.sub_accounts.map(sub => sub.id)
      ];
      
      // Fetch content briefs
      const { data: contentBriefs, error: briefsError } = await supabase
        .from('content_briefs')
        .select('*')
        .in('user_id', allCompanyUserIds)
        .order('created_at', { ascending: false });

      if (briefsError) throw briefsError;

      // Fetch research results (product cards)
      const { data: researchResults, error: researchError } = await supabase
        .from('research_results')
        .select('*')
        .in('user_id', allCompanyUserIds)
        .order('created_at', { ascending: false });

      if (researchError) throw researchError;

      console.log('📋 Company content loaded:', {
        contentBriefs: contentBriefs?.length || 0,
        researchResults: researchResults?.length || 0
      });
      
      setUserContentBriefs(contentBriefs || []);
      setUserResearchResults(researchResults || []);
    } catch (error) {
      console.error('❌ Error fetching company content:', error);
      setUserContentBriefs([]);
      setUserResearchResults([]);
    } finally {
      setIsLoadingBriefs(false);
      setIsLoadingResearch(false);
    }
  };

  // Filter and group users
  const filteredUsers = users.filter(user => 
    user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedUsers = groupUsersByCompany(filteredUsers);
  
  // Sort company groups
  const sortedCompanyGroups = [...groupedUsers].sort((a, b) => {
    switch (sortBy) {
      case 'company':
        return a.company_name.localeCompare(b.company_name);
      case 'email':
        return a.main_account.email.localeCompare(b.main_account.email);
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  // Fetch approved products
  const fetchApprovedProductsData = async () => {
    try {
      setIsLoadingApproved(true);
      console.log('🔍 Fetching approved products...');
      const products = await getApprovedProducts();
      console.log('✅ Approved products fetched:', products.length);
      setApprovedProducts(products);
    } catch (error) {
      console.error('❌ Error fetching approved products:', error);
      toast.error('Failed to load approved products');
    } finally {
      setIsLoadingApproved(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchApprovedProductsData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      console.log('📋 ContentBriefManagement: Loading research results for user:', selectedUser.email);
      fetchUserResearchResults(selectedUser.id);
      fetchUserContentBriefs(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUserForBriefs) {
      console.log('📋 ContentBriefManagement: Loading company briefs for:', selectedUserForBriefs.companyGroup.company_name);
      fetchCompanyContentBriefs(selectedUserForBriefs.companyGroup);
    }
  }, [selectedUserForBriefs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  // Company Content Briefs View
  if (selectedUserForBriefs) {
    const { user, companyGroup } = selectedUserForBriefs;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedUserForBriefs(null)}
            className="p-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
          >
            <ArrowLeft size={18} className="text-gray-300" />
          </motion.button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {companyGroup.company_name}
              </h2>
              <p className="text-gray-400">Company Content Briefs</p>
              <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                <span>{companyGroup.total_users} total users</span>
                <span>•</span>
                <span>Owner: {user.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Product Cards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <h3 className="text-xl font-semibold text-white">Approved Product Cards</h3>
            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-500/30">
              {approvedProducts.filter(p => p.company_name === companyGroup.company_name).length} approved
            </span>
          </div>

          {isLoadingApproved || isLoadingResearch ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-300">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading approved products...</span>
              </div>
            </div>
          ) : approvedProducts.filter(p => p.company_name === companyGroup.company_name).length > 0 ? (
            <div className="space-y-4">
              {approvedProducts
                .filter(p => p.company_name === companyGroup.company_name)
                .map((approvedProduct) => {
                  const product = approvedProduct.product_data;
                  const expandKey = `approved-${approvedProduct.id}`;
                  const isExpanded = expandedProductIndex === expandKey;
                  
                  return (
                    <div key={approvedProduct.id}>
                      <div 
                        onClick={() => {
                          const expandKey = `approved-${approvedProduct.id}`;
                          setExpandedProductIndex(expandedProductIndex === expandKey ? null : expandKey);
                        }}
                        className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-semibold">
                                {product?.productDetails?.name || product?.companyName || approvedProduct.product_name || 'Unnamed Product'}
                              </h4>
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Approved</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                              <span>Approved: {new Date(approvedProduct.approved_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Status: {approvedProduct.reviewed_status}</span>
                              <span>•</span>
                              <span>Source: {approvedProduct.research_result_id ? `Research ${approvedProduct.research_result_id.slice(0, 8)}...` : `Product Page`}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-green-400">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {isExpanded ? 'Hide Details' : 'View Full Card'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Product Stats */}
                        {product && (
                          <div className="mt-3 bg-gray-600/30 rounded p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {product.usps?.length > 0 && (
                                <div>
                                  <span className="text-gray-400">USPs:</span>
                                  <span className="text-white ml-2">{product.usps.length}</span>
                                </div>
                              )}
                              {product.features?.length > 0 && (
                                <div>
                                  <span className="text-gray-400">Features:</span>
                                  <span className="text-white ml-2">{product.features.length}</span>
                                </div>
                              )}
                              {product.painPoints?.length > 0 && (
                                <div>
                                  <span className="text-gray-400">Pain Points:</span>
                                  <span className="text-white ml-2">{product.painPoints.length}</span>
                                </div>
                              )}
                              {product.capabilities?.length > 0 && (
                                <div>
                                  <span className="text-gray-400">Capabilities:</span>
                                  <span className="text-white ml-2">{product.capabilities.length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      
                      {/* Expanded ProductCard */}
                      {isExpanded && product && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 bg-gray-700/40 rounded-lg p-4 border border-gray-600/30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h6 className="text-white font-medium">Full Product Analysis</h6>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedProductIndex(null);
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {(() => {
                            // Ensure product data is properly formatted
                            const cleanProduct = product || {};
                            console.log('🎯 Rendering ProductCard for approved product:', {
                              id: approvedProduct.id,
                              productName: cleanProduct.productDetails?.name || cleanProduct.companyName,
                              hasData: !!cleanProduct,
                              keys: Object.keys(cleanProduct)
                            });
                            
                            return (
                                                            <ProductCard
                                product={cleanProduct}
                                isExpanded={true}
                                showExpandButton={false}
                                className="bg-transparent"
                                context="admin"
                                enableEditing={true}
                                onUpdateSection={(productIndex: number, sectionType: keyof ProductAnalysis, newValue: any) => {
                                  console.log('🎯 Product update in approved products section:', {
                                    approvedProductId: approvedProduct.id,
                                    sectionType,
                                    newValue
                                  });
                                  // Handle the update for approved products using the new handler
                                  handleUpdateApprovedProduct(approvedProduct.id, sectionType, newValue);
                                }}
                                onGenerateArticle={handleGenerateArticleSuccess}
                              />
                            );
                          })()}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No approved products found for this company</p>
              <p className="text-gray-500 text-sm mt-2">
                Research results and product cards will appear here once company users upload documents
              </p>
            </div>
          )}
        </motion.div>

        {/* Content Briefs Section for entire company */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-6 w-6 text-green-400" />
            <h3 className="text-xl font-semibold text-white">All Company Content Briefs</h3>
            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-500/30">
              {userContentBriefs.length} briefs
            </span>
          </div>

          {isLoadingBriefs ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-300">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading company content briefs...</span>
              </div>
            </div>
          ) : userContentBriefs.length > 0 ? (
            <div className="space-y-6">
              {userContentBriefs.map((brief) => {
                // Find which user created this brief
                const briefCreator = companyGroup.main_account.id === brief.user_id 
                  ? companyGroup.main_account 
                  : companyGroup.sub_accounts.find(sub => sub.id === brief.user_id);
                
                return (
                  <div key={brief.id} className="bg-gray-700/40 rounded-lg border border-gray-600/30">
                    <div className="p-4 border-b border-gray-600/30 bg-gray-700/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold">
                            {brief.title || brief.product_name || `Content Brief - ${new Date(brief.created_at).toLocaleDateString()}`}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                            <span>Brief ID: {brief.id}</span>
                            <span>•</span>
                            <span>Created: {new Date(brief.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>
                              By: {briefCreator ? (briefCreator.profile_name || briefCreator.email) : 'Unknown User'}
                              {briefCreator?.user_type === 'main' && <Crown className="w-3 h-3 text-yellow-400 inline ml-1" />}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-green-400 font-medium">Content Brief</span>
                          <ResponsiveApprovalButton 
                            brief={brief}
                            briefId={brief.id}
                            onSuccess={() => {
                              // Refresh company briefs after action
                              fetchCompanyContentBriefs(companyGroup);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      {brief.brief_content && Object.keys(brief.brief_content).length > 0 ? (
                        <div className="space-y-6">
                          <div className="bg-gray-600/20 rounded-lg p-4 border border-gray-600/30">
                            <h5 className="text-white font-medium mb-3">📝 Content Brief Structure</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {Object.entries(brief.brief_content).map(([section, content]) => (
                                <div key={section} className="bg-gray-700/30 rounded p-3">
                                  <h6 className="text-blue-300 font-medium mb-2">{section}</h6>
                                  <div className="text-gray-300 text-xs">
                                    {typeof content === 'object' && content !== null ? (
                                      <div className="space-y-1">
                                        {Object.entries(content).map(([key, value]) => (
                                          <div key={key}>
                                            <span className="text-yellow-300">{key}:</span>{' '}
                                            <span className="text-gray-300">
                                              {Array.isArray(value) ? `${value.length} items` : 
                                               typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') :
                                               typeof value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-300">
                                        {typeof content === 'string' ? content.substring(0, 150) + (content.length > 150 ? '...' : '') : String(content)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Editable Content Brief Display */}
                          <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
                            <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                              <Edit className="w-4 h-4" />
                              Edit Content Brief
                            </h5>
                            <ContentBriefDisplay 
                              content={JSON.stringify(brief.brief_content)}
                              readOnly={false}
                              onContentChange={(updatedContent: string) => {
                                try {
                                  const parsedContent = JSON.parse(updatedContent);
                                  handleContentBriefUpdate(brief.id, parsedContent);
                                } catch (error) {
                                  console.error('Error parsing updated content:', error);
                                  toast.error('Invalid content format');
                                }
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 bg-gray-600/20 rounded-lg border border-gray-600/30">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <h5 className="font-medium text-gray-300 mb-2">Empty Content Brief</h5>
                          <p className="text-sm text-gray-400 mb-4">
                            This content brief doesn't contain any structured content yet.
                          </p>
                          <div className="text-xs text-gray-500 space-y-1 bg-gray-700/30 rounded p-3 max-w-sm mx-auto">
                            <p><span className="font-medium">Brief Content:</span> {brief.brief_content ? 'Present but empty' : 'null'}</p>
                            <p><span className="font-medium">Product Name:</span> {brief.product_name || 'Not specified'}</p>
                            <p className="text-yellow-400 mt-2">💡 Content briefs are generated when users send products to AirOps</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No content briefs found for this company</p>
              <p className="text-gray-500 text-sm mt-2">
                Content briefs will appear here once company users send products to AirOps
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // User Detail View
  if (selectedUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToUsers}
            className="p-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
          >
            <ArrowLeft size={18} className="text-gray-300" />
          </motion.button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {selectedUser.company_name || selectedUser.email}
            </h2>
            <p className="text-gray-400">{selectedUser.email}</p>
          </div>
        </div>

        {/* User Research Results Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Research Results & Product Cards</h3>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium border border-blue-500/30">
              {userResearchResults.length} results
            </span>
          </div>

          {userResearchResults.length > 0 ? (
            <div className="space-y-4">
              {userResearchResults.map((result) => (
                <div key={result.id} className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">Research Result #{result.id}</h4>
                      <span className="text-sm text-gray-400">
                        Status: {result.is_approved ? 'Approved' : (result.is_draft ? 'Draft' : 'Pending')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(result.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Display products in this research result */}
                  {result.data && result.data.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-gray-400 text-sm mb-3">
                        Contains {result.data.length} product{result.data.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-3">
                        {result.data.map((product, index) => {
                          const expandKey = `${result.id}-${index}`;
                          const isExpanded = expandedProductIndex === expandKey;
                          
                          return (
                            <div key={index}>
                              {/* Product Summary Card */}
                              <div 
                                onClick={() => {
                                  console.log(`Product ${index + 1} clicked in research result ${result.id}`);
                                  console.log('Full product data:', JSON.stringify(product, null, 2));
                                  console.log('Product structure keys:', Object.keys(product));
                                  handleProductClick(product, result.id, index);
                                }}
                                className="bg-gray-600/30 rounded p-3 cursor-pointer hover:bg-gray-600/50 transition-colors border border-gray-600/20 hover:border-gray-500/40"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="text-white text-sm font-medium">
                                      {product.productDetails?.name || product.companyName || `Product ${index + 1}`}
                                    </h5>
                                    <p className="text-gray-400 text-xs mt-1">
                                      {product.companyName || 'No company name'}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                                      {product.usps?.length > 0 && (
                                        <span>USPs: {product.usps.length}</span>
                                      )}
                                      {product.features?.length > 0 && (
                                        <span>Features: {product.features.length}</span>
                                      )}
                                      {product.painPoints?.length > 0 && (
                                        <span>Pain Points: {product.painPoints.length}</span>
                                      )}
                                      {product.capabilities?.length > 0 && (
                                        <span>Capabilities: {product.capabilities.length}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 text-blue-400">
                                    <Eye className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                      {isExpanded ? 'Hide Details' : 'View Full Card'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded ProductCard */}
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 bg-gray-700/40 rounded-lg p-4 border border-gray-600/30"
                                >
                                  <div className="flex justify-between items-center mb-4">
                                    <h6 className="text-white font-medium">Full Product Analysis</h6>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedProductIndex(null);
                                      }}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  {(() => {
                                    // Debug: log what we're about to pass to ProductCard
                                    console.log('🎯 ContentBriefManagement: Passing to ProductCard:', {
                                      productName: product.productDetails?.name || product.companyName,
                                      hasKeywords: !!product.keywords,
                                      keywords: product.keywords,
                                      fullProduct: product
                                    });
                                    
                                    // Extract keywords properly, handling corrupted format
                                    const extractKeywords = (productData: any): string[] => {
                                      // First check if we have proper keywords array
                                      if (Array.isArray(productData.keywords)) {
                                        console.log("🔧 ContentBriefManagement: Found proper keywords array:", productData.keywords);
                                        return productData.keywords;
                                      }
                                      
                                      // Check if we have corrupted format with "0": "keywords" 
                                      if (productData["0"] === "keywords") {
                                        console.log("🔧 ContentBriefManagement: Found corrupted keywords format - extracting...");
                                        // Look for any actual keyword data in other numeric keys
                                        const extractedKeywords: string[] = [];
                                        Object.keys(productData).forEach(key => {
                                          // Skip the "0": "keywords" key and look for other numeric keys that might contain keyword data
                                          if (key !== "0" && !isNaN(Number(key)) && typeof productData[key] === 'string') {
                                            extractedKeywords.push(productData[key]);
                                          }
                                        });
                                        console.log("🔧 ContentBriefManagement: Extracted keywords from corrupted format:", extractedKeywords);
                                        return extractedKeywords;
                                      }
                                      
                                      console.log("🔧 ContentBriefManagement: No keywords found, returning empty array");
                                      return [];
                                    };
                                    
                                    const productWithKeywords = {
                                      ...product,
                                      // Use proper keywords extraction instead of simple fallback
                                      keywords: extractKeywords(product)
                                    };
                                    
                                    console.log('🔧 ContentBriefManagement: Product after keywords extraction:', {
                                      hasKeywords: productWithKeywords.keywords.length > 0,
                                      keywords: productWithKeywords.keywords,
                                      originalProduct0Key: product["0"]
                                    });
                                    
                                    return (
                                      <ProductCard 
                                        product={productWithKeywords}
                                        isExpanded={true}
                                        showExpandButton={false}
                                        className="bg-transparent"
                                        context="admin"
                                        enableEditing={true}
                                        onUpdateSection={(localProductIndex: number, sectionType: keyof ProductAnalysis, newValue: any) => {
                                          // Calculate the global product index across all research results
                                          // We need to find where this specific product sits globally
                                          let globalIndex = 0;
                                          let found = false;
                                          const currentResultId = result.id;
                                          const currentLocalIndex = index; // This is the actual index within this result
                                          
                                          console.log('🎯 Calculating global index for product update:', {
                                            currentResultId,
                                            currentLocalIndex,
                                            localProductIndex,
                                            sectionType,
                                            totalResults: userResearchResults.length
                                          });
                                          
                                          // Loop through all research results to find the global position
                                          for (const searchResult of userResearchResults) {
                                            if (searchResult.data && Array.isArray(searchResult.data)) {
                                              for (let i = 0; i < searchResult.data.length; i++) {
                                                // Check if this is our target product
                                                if (searchResult.id === currentResultId && i === currentLocalIndex) {
                                                  found = true;
                                                  console.log('🎯 Found target product at global index:', globalIndex);
                                                  break;
                                                }
                                                globalIndex++;
                                              }
                                            }
                                            if (found) break;
                                          }
                                          
                                          if (found) {
                                            console.log('📡 Calling handleUpdateSection with:', {
                                              globalIndex,
                                              sectionType,
                                              newValue
                                            });
                                            handleUpdateSection(globalIndex, sectionType, newValue);
                                          } else {
                                            console.error('❌ Could not find target product for update');
                                          }
                                        }}
                                      />
                                    );
                                  })()}
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No product analysis available</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No research results found</p>
            </div>
          )}
        </motion.div>

        {/* Content Briefs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-6 w-6 text-green-400" />
            <h3 className="text-xl font-semibold text-white">Generated Content Briefs</h3>
            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-500/30">
              {userContentBriefs.length} briefs
            </span>
          </div>

          {userContentBriefs.length > 0 ? (
            <div className="space-y-6">
              {userContentBriefs.map((brief) => (
                <div key={brief.id} className="bg-gray-700/40 rounded-lg border border-gray-600/30">
                  <div className="p-4 border-b border-gray-600/30 bg-gray-700/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">
                          {brief.title || `Content Brief - ${new Date(brief.created_at).toLocaleDateString()}`}
                        </h4>
                        <span className="text-sm text-gray-400">
                          Brief ID: {brief.id} • Created: {new Date(brief.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Content Brief</span>
                        <ResponsiveApprovalButton 
                          brief={brief}
                          briefId={brief.id}
                          onSuccess={handleGenerateArticleSuccess}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {brief.brief_content && Object.keys(brief.brief_content).length > 0 ? (
                      <div className="space-y-6">
                        <div className="bg-gray-600/20 rounded-lg p-4 border border-gray-600/30">
                          <h5 className="text-white font-medium mb-3">📝 Content Brief Structure</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {Object.entries(brief.brief_content).map(([section, content]) => (
                              <div key={section} className="bg-gray-700/30 rounded p-3">
                                <h6 className="text-blue-300 font-medium mb-2">{section}</h6>
                                <div className="text-gray-300 text-xs">
                                  {typeof content === 'object' && content !== null ? (
                                    <div className="space-y-1">
                                      {Object.entries(content).map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-yellow-300">{key}:</span>{' '}
                                          <span className="text-gray-300">
                                            {Array.isArray(value) ? `${value.length} items` : 
                                             typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') :
                                             typeof value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300">
                                      {typeof content === 'string' ? content.substring(0, 150) + (content.length > 150 ? '...' : '') : String(content)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Editable Content Brief Display */}
                        <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
                          <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            Edit Content Brief
                          </h5>
                          <ContentBriefDisplay 
                            content={JSON.stringify(brief.brief_content)}
                            readOnly={false}
                            onContentChange={(updatedContent: string) => {
                              try {
                                const parsedContent = JSON.parse(updatedContent);
                                handleContentBriefUpdate(brief.id, parsedContent);
                              } catch (error) {
                                console.error('Error parsing updated content:', error);
                                toast.error('Invalid content format');
                              }
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 bg-gray-600/20 rounded-lg border border-gray-600/30">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <h5 className="font-medium text-gray-300 mb-2">Empty Content Brief</h5>
                        <p className="text-sm text-gray-400 mb-4">
                          This content brief doesn't contain any structured content yet.
                        </p>
                        <div className="text-xs text-gray-500 space-y-1 bg-gray-700/30 rounded p-3 max-w-sm mx-auto">
                          <p><span className="font-medium">Brief Content:</span> {brief.brief_content ? 'Present but empty' : 'null'}</p>
                          <p><span className="font-medium">Product Name:</span> {brief.product_name || 'Not specified'}</p>
                          <p className="text-yellow-400 mt-2">💡 Content briefs are generated when users send products to AirOps</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No content briefs generated yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Content briefs will appear here once the user sends products to AirOps
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // Users List View
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Search and Filter Controls */}
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company name, email, or profile name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'company' | 'email' | 'date')}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="company">Sort by Company</option>
              <option value="email">Sort by Email</option>
              <option value="date">Sort by Join Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Company Groups Display */}
      <div className="space-y-6">
        {sortedCompanyGroups.map((company) => {
          const totalCompanyBriefs = company.main_account.briefCount || 0;
          const companyApprovedProducts = approvedProducts.filter(p => p.company_name === company.company_name);
          const hasAnyContent = totalCompanyBriefs > 0 || companyApprovedProducts.length > 0;
          
          return (
            <motion.div
              key={company.company_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleCompanyBriefSelection(company.main_account)}
              className={`bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden cursor-pointer hover:bg-gray-800/50 transition-colors duration-200 ${
                !hasAnyContent ? 'opacity-75' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Building2 className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{company.company_name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-400">
                          {company.total_users} user{company.total_users !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-300 font-medium">
                            {totalCompanyBriefs} Content Brief{totalCompanyBriefs !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-300 font-medium">
                            {companyApprovedProducts.length} Approved Product{companyApprovedProducts.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasAnyContent ? (
                      <div className="flex items-center space-x-2 text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-sm font-medium">Has Content</span>
                          </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span className="text-sm font-medium">No Content</span>
                                    </div>
                    )}
                                      </div>
                                    </div>
                                  </div>
            </motion.div>
          );
        })}
      </div>

      {sortedCompanyGroups.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchTerm ? 'No companies found matching your search' : 'No registered companies found'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            All registered companies will appear here regardless of content
          </p>
        </div>
      )}
    </motion.div>
  );
} 