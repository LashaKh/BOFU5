// Admin API Types - Shared between frontend and backend

export interface ArticleListItem {
  id: string;
  title: string;
  user_id: string;
  user_email: string;
  user_company: string;
  product_name?: string;
  editing_status: 'draft' | 'editing' | 'review' | 'final' | 'published';
  last_edited_at: string;
  last_edited_by: string;
  article_version: number;
  created_at: string;
  updated_at: string;
}

export interface AdminArticlesResponse {
  articles: ArticleListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ArticleDetail {
  id: string;
  title: string;
  content: string;
  user_id: string;
  user_email: string;
  user_company: string;
  product_name?: string;
  editing_status: 'draft' | 'editing' | 'review' | 'final' | 'published';
  last_edited_at: string;
  last_edited_by: string;
  article_version: number;
  article_content: string;
  created_at: string;
  updated_at: string;
  link?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  created_at: string;
  updated_at: string;
  article_count: number;
}

export interface AdminUsersResponse {
  users: UserProfile[];
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  article_id: string | null;
  article_title: string | null;
  access_time: string;
  action_type: AdminActionType;
  notes: string | null;
  metadata: Record<string, any>;
}

export interface AdminAuditLogsResponse {
  logs: AuditLogEntry[];
}

export type AdminActionType = 
  | 'view'
  | 'edit'
  | 'status_change'
  | 'ownership_transfer'
  | 'delete'
  | 'restore'
  | 'export'
  | 'comment_add'
  | 'comment_resolve'
  | 'bulk_operation';

export interface ErrorResponse {
  error: string;
  errorCode: string;
  details?: string;
}

// Request types
export interface ArticleUpdateRequest {
  title?: string;
  product_name?: string;
  article_content?: string;
  editing_status?: ArticleListItem['editing_status'];
  user_id?: string;
  notes?: string;
}

export interface ArticleListParams {
  page?: number;
  limit?: number;
  user_id?: string;
  status?: 'draft' | 'editing' | 'review' | 'final' | 'published';
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'last_edited_at' | 'created_at' | 'title' | 'editing_status';
  sort_order?: 'asc' | 'desc';
}

export interface UserSearchParams {
  search?: string;
  limit?: number;
}

export interface AuditLogParams {
  article_id?: string;
  admin_id?: string;
  action_type?: AdminActionType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}