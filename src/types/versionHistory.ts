// Version History Types for BOFU AI Article Editing System

export type VersionTag = 
  | 'auto_save'
  | 'manual_save' 
  | 'published'
  | 'review'
  | 'milestone'
  | 'restored'
  | 'workflow_change';

export interface VersionMetadata {
  title?: string;
  editing_status?: string;
  previous_status?: string;
  content_length?: number;
  backup_before_restore?: boolean;
  [key: string]: any;
}

export interface VersionHistory {
  id: string;
  article_id: string;
  version_number: number;
  content: string;
  metadata: VersionMetadata;
  created_at: string;
  created_by: string;
  change_summary?: string;
  version_tag: VersionTag;
  user_email?: string;
}

export interface VersionComparison {
  version1: VersionHistory;
  version2: VersionHistory;
  diff: string;
  patchData?: string;
}

export interface VersionStats {
  wordCount: number;
  characterCount: number;
  lineCount: number;
  paragraphCount: number;
}

export interface VersionHistoryResult {
  success: boolean;
  data?: VersionHistory[];
  error?: string;
}

export interface VersionCreateResult {
  success: boolean;
  data?: VersionHistory;
  error?: string;
}

export interface VersionRestoreResult {
  success: boolean;
  data?: {
    restored_version: number;
    new_version: number;
  };
  error?: string;
}

export interface VersionComparisonResult {
  success: boolean;
  data?: VersionComparison;
  error?: string;
}

export interface VersionStatsResult {
  success: boolean;
  data?: VersionStats;
  error?: string;
}

export interface BulkVersionOperation {
  articleId: string;
  content: string;
  metadata?: VersionMetadata;
  changeSummary?: string;
  versionTag?: VersionTag;
}

export interface BulkVersionResult {
  success: boolean;
  data?: Array<{ success: boolean; versionId?: string; error?: string }>;
  error?: string;
}

export type DiffType = 'lines' | 'words' | 'characters';

export interface VersionSearchOptions {
  searchTerm: string;
  searchIn: 'content' | 'summary' | 'both';
}

// UI Component Props
export interface VersionHistoryPanelProps {
  articleId: string;
  currentVersion?: number;
  onVersionSelect?: (version: VersionHistory) => void;
  onVersionCompare?: (version1: number, version2: number) => void;
  onVersionRestore?: (versionNumber: number) => void;
}

export interface VersionComparisonViewProps {
  articleId: string;
  version1Number: number;
  version2Number: number;
  onClose: () => void;
  onRestore?: (versionNumber: number) => void;
}

export interface VersionBrowserProps {
  articleId: string;
  versions: VersionHistory[];
  selectedVersion?: number;
  onVersionSelect: (version: VersionHistory) => void;
  onVersionAnnotate?: (versionId: string, annotation: string) => void;
}

// Database function parameters
export interface CreateVersionHistoryParams {
  p_article_id: string;
  p_content: string;
  p_metadata?: VersionMetadata;
  p_change_summary?: string;
  p_version_tag?: VersionTag;
}

export interface GetVersionHistoryParams {
  p_article_id: string;
}

// Enhanced restore with backup
export interface RestoreWithBackupResult extends VersionRestoreResult {
  backupVersionNumber?: number;
}

// Version annotations
export interface VersionAnnotation {
  versionId: string;
  annotation: string;
  userId: string;
  createdAt: string;
}

export interface VersionAnnotationResult {
  success: boolean;
  error?: string;
} 