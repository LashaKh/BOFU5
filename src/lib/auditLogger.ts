import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

// Audit action types
export type AuditActionType = 
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

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  admin_id: string;
  article_id: string;
  action_type: AuditActionType;
  notes?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// Extended audit log with user and article info
export interface ExtendedAuditLogEntry extends AuditLogEntry {
  id: string;
  admin_email: string;
  admin_name: string;
  article_title: string;
  user_email: string;
  user_company: string;
  access_time: string;
  created_at: string;
}

// Audit filters for querying
export interface AuditFilters {
  admin_id?: string;
  article_id?: string;
  action_type?: AuditActionType;
  start_date?: string;
  end_date?: string;
  search_term?: string;
  limit?: number;
  offset?: number;
}

class AuditLogger {
  private static instance: AuditLogger;
  private currentAdminId: string | null = null;
  private isEnabled: boolean = true;

  private constructor() {
    // Initialize with current admin user
    this.initializeAdmin();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private async initializeAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentAdminId = user.id;
      }
    } catch (error) {
      console.error('Failed to initialize audit logger admin:', error);
    }
  }

  // Enable/disable logging
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Get client IP address (simplified for demo)
  private getClientIP(): string {
    // In a real implementation, this would get the actual client IP
    // For now, we'll use a placeholder or detect from request headers
    return '192.168.1.100'; // Placeholder
  }

  // Get user agent
  private getUserAgent(): string {
    return navigator.userAgent;
  }

  // Log an admin action
  public async logAction(
    articleId: string,
    actionType: AuditActionType,
    notes?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('Audit logging is disabled');
      return true;
    }

    if (!this.currentAdminId) {
      console.warn('No admin user available for audit logging');
      return false;
    }

    try {
      const auditEntry: AuditLogEntry = {
        admin_id: this.currentAdminId,
        article_id: articleId,
        action_type: actionType,
        notes,
        metadata,
        ip_address: this.getClientIP(),
        user_agent: this.getUserAgent()
      };

      console.log('Logging audit action:', auditEntry);

      // In a real implementation, this would call the audit logging API
      // For now, we'll simulate the API call
      const response = await this.simulateAuditAPICall(auditEntry);

      if (response.success) {
        console.log('Audit action logged successfully:', response.logId);
        return true;
      } else {
        console.error('Failed to log audit action:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error logging audit action:', error);
      return false;
    }
  }

  // Simulate API call for audit logging
  private async simulateAuditAPICall(entry: AuditLogEntry): Promise<{ success: boolean; logId?: string; error?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate success/failure (95% success rate)
    if (Math.random() > 0.05) {
      return {
        success: true,
        logId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        error: 'Simulated API failure'
      };
    }
  }

  // Get audit logs with filters
  public async getAuditLogs(filters?: AuditFilters): Promise<ExtendedAuditLogEntry[]> {
    try {
      console.log('Fetching audit logs with filters:', filters);

      // In a real implementation, this would call the audit API
      // For now, we'll return mock data
      const mockLogs = await this.getMockAuditLogs(filters);
      
      return mockLogs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  // Mock audit logs for demonstration
  private async getMockAuditLogs(filters?: AuditFilters): Promise<ExtendedAuditLogEntry[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const actionTypes: AuditActionType[] = ['view', 'edit', 'status_change', 'ownership_transfer', 'delete', 'export', 'bulk_operation'];
    
    const mockLogs: ExtendedAuditLogEntry[] = Array.from({ length: 50 }, (_, i) => {
      const action = actionTypes[i % actionTypes.length];
      const date = new Date(Date.now() - (i * 2 * 60 * 60 * 1000));
      
      return {
        id: `audit-${i + 1}`,
        admin_id: `admin-${(i % 3) + 1}`,
        admin_email: `admin${(i % 3) + 1}@bofu.ai`,
        admin_name: `Admin User ${(i % 3) + 1}`,
        article_id: `article-${(i % 10) + 1}`,
        article_title: `Sample Article ${(i % 10) + 1}: Advanced Analysis`,
        user_email: `user${(i % 5) + 1}@example.com`,
        user_company: `Client Company ${(i % 5) + 1}`,
        access_time: date.toISOString(),
        action_type: action,
        notes: action === 'status_change' ? `Changed status from draft to final` : 
               action === 'ownership_transfer' ? `Transferred to user${((i + 1) % 5) + 1}@example.com` :
               action === 'bulk_operation' ? `Applied bulk status change to 5 articles` :
               `Performed ${action} action`,
        metadata: {
          previous_value: action === 'status_change' ? 'draft' : undefined,
          new_value: action === 'status_change' ? 'final' : undefined,
          bulk_count: action === 'bulk_operation' ? Math.floor(Math.random() * 10) + 1 : undefined
        },
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        created_at: date.toISOString()
      };
    });

    // Apply filters
    let filteredLogs = mockLogs;

    if (filters) {
      if (filters.admin_id) {
        filteredLogs = filteredLogs.filter(log => log.admin_id === filters.admin_id);
      }
      
      if (filters.article_id) {
        filteredLogs = filteredLogs.filter(log => log.article_id === filters.article_id);
      }
      
      if (filters.action_type) {
        filteredLogs = filteredLogs.filter(log => log.action_type === filters.action_type);
      }
      
      if (filters.start_date) {
        filteredLogs = filteredLogs.filter(log => new Date(log.access_time) >= new Date(filters.start_date!));
      }
      
      if (filters.end_date) {
        filteredLogs = filteredLogs.filter(log => new Date(log.access_time) <= new Date(filters.end_date!));
      }
      
      if (filters.search_term) {
        const searchLower = filters.search_term.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
          log.article_title.toLowerCase().includes(searchLower) ||
          log.admin_email.toLowerCase().includes(searchLower) ||
          log.user_email.toLowerCase().includes(searchLower) ||
          log.user_company.toLowerCase().includes(searchLower) ||
          log.notes?.toLowerCase().includes(searchLower) ||
          log.action_type.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply pagination
      if (filters.offset) {
        filteredLogs = filteredLogs.slice(filters.offset);
      }
      
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(0, filters.limit);
      }
    }

    return filteredLogs;
  }

  // Export audit logs
  public async exportAuditLogs(
    filters?: AuditFilters, 
    format: 'json' | 'csv' = 'json'
  ): Promise<void> {
    try {
      const logs = await this.getAuditLogs(filters);
      
      const exportData = {
        export_metadata: {
          generated_at: new Date().toISOString(),
          total_entries: logs.length,
          filters_applied: filters || null,
          format
        },
        audit_logs: logs
      };

      let blob: Blob;
      let filename: string;

      if (format === 'csv') {
        const csvContent = this.convertToCSV(logs);
        blob = new Blob([csvContent], { type: 'text/csv' });
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${logs.length} audit log entries`);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Failed to export audit logs');
      throw error;
    }
  }

  // Convert logs to CSV format
  private convertToCSV(logs: ExtendedAuditLogEntry[]): string {
    const headers = [
      'ID', 'Admin Email', 'Admin Name', 'Article Title', 'User Email', 
      'User Company', 'Action Type', 'Access Time', 'Notes', 'IP Address'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.admin_email,
        log.admin_name,
        `"${log.article_title}"`,
        log.user_email,
        log.user_company,
        log.action_type,
        log.access_time,
        log.notes ? `"${log.notes.replace(/"/g, '""')}"` : '',
        log.ip_address || ''
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  // Convenience methods for common actions
  public async logArticleView(articleId: string, notes?: string): Promise<boolean> {
    return this.logAction(articleId, 'view', notes);
  }

  public async logArticleEdit(articleId: string, changes?: Record<string, any>): Promise<boolean> {
    return this.logAction(articleId, 'edit', 'Article content modified', { changes });
  }

  public async logStatusChange(
    articleId: string, 
    fromStatus: string, 
    toStatus: string, 
    reason?: string
  ): Promise<boolean> {
    return this.logAction(
      articleId, 
      'status_change', 
      reason || `Status changed from ${fromStatus} to ${toStatus}`,
      { previous_value: fromStatus, new_value: toStatus }
    );
  }

  public async logOwnershipTransfer(
    articleId: string, 
    fromUserId: string, 
    toUserId: string, 
    reason?: string
  ): Promise<boolean> {
    return this.logAction(
      articleId, 
      'ownership_transfer', 
      reason || `Ownership transferred`,
      { from_user_id: fromUserId, to_user_id: toUserId }
    );
  }

  public async logBulkOperation(
    articleIds: string[], 
    operation: string, 
    details?: Record<string, any>
  ): Promise<boolean> {
    // For bulk operations, we'll log each article individually
    const results = await Promise.all(
      articleIds.map(articleId => 
        this.logAction(
          articleId, 
          'bulk_operation', 
          `Bulk ${operation} applied`,
          { bulk_operation: operation, total_articles: articleIds.length, ...details }
        )
      )
    );

    return results.every(result => result);
  }

  public async logArticleDelete(articleId: string, reason?: string): Promise<boolean> {
    return this.logAction(articleId, 'delete', reason || 'Article deleted');
  }

  public async logArticleExport(articleIds: string[], format?: string): Promise<boolean> {
    if (articleIds.length === 1) {
      return this.logAction(
        articleIds[0], 
        'export', 
        `Article exported${format ? ` as ${format}` : ''}`,
        { export_format: format }
      );
    } else {
      return this.logBulkOperation(articleIds, 'export', { export_format: format });
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Export convenience functions
export const logArticleView = (articleId: string, notes?: string) => 
  auditLogger.logArticleView(articleId, notes);

export const logArticleEdit = (articleId: string, changes?: Record<string, any>) => 
  auditLogger.logArticleEdit(articleId, changes);

export const logStatusChange = (articleId: string, fromStatus: string, toStatus: string, reason?: string) => 
  auditLogger.logStatusChange(articleId, fromStatus, toStatus, reason);

export const logOwnershipTransfer = (articleId: string, fromUserId: string, toUserId: string, reason?: string) => 
  auditLogger.logOwnershipTransfer(articleId, fromUserId, toUserId, reason);

export const logBulkOperation = (articleIds: string[], operation: string, details?: Record<string, any>) => 
  auditLogger.logBulkOperation(articleIds, operation, details);

export const logArticleDelete = (articleId: string, reason?: string) => 
  auditLogger.logArticleDelete(articleId, reason);

export const logArticleExport = (articleIds: string[], format?: string) => 
  auditLogger.logArticleExport(articleIds, format);

export default auditLogger; 