// Core product interfaces
export interface CompetitorItem {
  company_name: string;
  product_name: string;
  category: string;
}

export interface CompetitorsData {
  direct_competitors: CompetitorItem[];
  niche_competitors: CompetitorItem[];
  broader_competitors: CompetitorItem[];
}

export interface ProductAnalysis {
  companyName: string;
  competitorAnalysisUrl?: string;
  google_doc?: string; // URL of the Google Doc published to web
  userUUID?: string; // User's UUID who created the product
  userEmail?: string; // User's email who created the product
  userCompanyName?: string; // User's company name
  research_result_id?: string; // ID of the research result this product is associated with
  openai_vector_store_id?: string; // OpenAI Vector Store ID for this product
  productDetails: {
    name: string;
    description: string;
  };
  usps: string[];
  businessOverview: {
    mission: string;
    industry: string;
    keyOperations: string;
  };
  painPoints: string[];
  features: string[];
  targetPersona: {
    primaryAudience: string;
    demographics: string;
    industrySegments: string;
    psychographics: string;
  };
  pricing: string;
  currentSolutions: {
    directCompetitors: string[];
    existingMethods: string[];
  };
  capabilities: Array<{
    title: string;
    description: string;
    content: string;
    images?: string[];
  }>;
  competitors?: CompetitorsData;
  isApproved?: boolean;
  approvedBy?: string;
}

// Interface for product details fetched from Supabase
export interface Product {
  id: string;
  created_at: string;
  name: string;
  description: string;
  logo_url?: string;
  user_id: string;
  openai_vector_store_id?: string; // Added this line
  // Add any other fields that your 'products' table has
}

// Interface for documents associated with a product
export interface ProductDocument {
  id: string; // UUID from Supabase
  product_id: string;
  user_id: string;
  file_name: string;
  document_type: string; // Consider using an enum for consistency (e.g., 'pdf', 'docx', 'link', 'gdoc')
  source_url?: string | null; // For GDocs or other web links
  file_url?: string | null; // Added for direct links or blog URLs
  storage_path?: string | null; // Path in Supabase storage if it's an uploaded file
  extracted_text?: string | null;
  content_hash?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed'; // Corrected to match SupabaseProductDocumentStatus
  error_message?: string | null;
  created_at: string; // Timestamp
  updated_at?: string | null;
  is_google_doc?: boolean;
  used_ai_extraction?: boolean;
  openai_vsf_id?: string | null; // OpenAI Vector Store File ID
  // Any other relevant metadata
}

// Default product template
export const defaultProduct: ProductAnalysis = {
  companyName: '',
  competitorAnalysisUrl: undefined,
  google_doc: undefined,
  research_result_id: undefined,
  openai_vector_store_id: undefined,
  productDetails: {
    name: '',
    description: ''
  },
  usps: [],
  businessOverview: {
    mission: '',
    industry: '',
    keyOperations: ''
  },
  painPoints: [],
  features: [],
  targetPersona: {
    primaryAudience: '',
    demographics: '',
    industrySegments: '',
    psychographics: ''
  },
  pricing: '',
  currentSolutions: {
    directCompetitors: [],
    existingMethods: []
  },
  capabilities: [],
  competitors: {
    direct_competitors: [],
    niche_competitors: [],
    broader_competitors: []
  },
  isApproved: false,
  approvedBy: undefined
};