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

// Core content brief data structure
export interface ContentBriefData {
  pain_points?: string[];
  usps?: string[];
  capabilities?: string[];
  competitors?: string[];
  internal_links?: string[];
  target_audience?: string[];
  keywords?: string[];
  notes?: string[];
  content_objectives?: string[];
  ctas?: string[];
  possible_article_titles?: string[];
  [key: string]: string[] | undefined;
}

// Interface for editing items in lists
export interface EditingItem {
  sectionKey: string;
  index: number;
  value: string;
}

// Interface for adding new items to lists
export interface NewItem {
  sectionKey: string;
  value: string;
}

// Props for section display components
export interface SectionItemProps {
  title: string;
  icon?: React.ReactNode;
  colorClass?: string;
  children: React.ReactNode;
}

// Props for list editing components
export interface ListSectionProps {
  sectionKey: string;
  items: string[];
  emptyMessage?: string;
  onAddItem: (sectionKey: string, value: string) => void;
  onUpdateItem: (sectionKey: string, index: number, value: string) => void;
  onRemoveItem: (sectionKey: string, index: number) => void;
  readOnly?: boolean;
  researchResultId?: string;
  suggestedItems?: string[];
  className?: string;
}
