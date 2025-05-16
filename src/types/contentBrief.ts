export type ContentBriefStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface SuggestedLink {
  url: string;
  title: string;
  relevance?: number;
}

export interface SuggestedTitle {
  title: string;
  score?: number;
}

export interface ContentBrief {
  id: string;
  user_id: string;
  brief_content: string;
  brief_content_text?: string; // Added for the newer text-based storage format
  product_name?: string;
  internal_links?: string[] | string; // Support both array and text formats
  possible_article_titles?: string[] | string; // Support both array and text formats
  created_at: string;
  updated_at: string;
  title?: string; 
  framework?: string;
  suggested_content_frameworks?: string; // Added for content frameworks
  status: ContentBriefStatus;
  suggested_titles?: SuggestedTitle[]; 
  suggested_links?: SuggestedLink[]; 
  research_result_id?: string; // Added for connecting to approved_products
}
