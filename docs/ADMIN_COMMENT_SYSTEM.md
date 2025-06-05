# Admin Comment System Documentation

## Overview

The Admin Comment System extends the existing comment functionality with administrative capabilities, providing oversight, management, and analytics tools for content moderation and team collaboration.

## Features

### 1. Admin Comment Types
- **Admin Note**: Internal notes for administrative purposes
- **Approval Comment**: Comments related to content approval workflow
- **Priority Comment**: High-priority comments requiring immediate attention
- **Escalation Comment**: Comments escalated from user support
- **Review Comment**: Comments for content review and feedback

### 2. Priority Levels
- **Low**: General administrative notes
- **Normal**: Standard priority admin tasks
- **High**: Important items requiring attention
- **Urgent**: Critical issues needing immediate response
- **Critical**: Emergency items affecting system operation

### 3. Approval Workflow
- **Pending**: Awaiting admin review
- **Approved**: Content approved by admin
- **Rejected**: Content rejected with reason
- **Requires Changes**: Content needs modifications
- **Escalated**: Issue escalated to higher authority

## Component Architecture

### Core Components

#### AdminCommentCard
Enhanced comment display with admin-specific features:
- Priority badges and visual indicators
- Admin type labels with color coding
- Approval action buttons
- Quick priority assignment
- Admin-only visibility indicators

#### EnhancedCommentDashboard
Comprehensive admin dashboard with:
- Multi-tab interface (Overview, Comments, Analytics, Notifications, Create)
- Advanced filtering and search
- Real-time data refresh
- Bulk operation controls
- Notification management

#### BulkCommentActions
Bulk management tools for:
- Multi-selection with progress tracking
- Bulk priority updates with admin notes
- Mass approval/rejection operations
- Status changes across multiple comments
- Error handling and retry mechanisms

#### AdminCommentAnalytics
Analytics dashboard featuring:
- Comment volume metrics
- Approval rate tracking
- Priority distribution charts
- User engagement statistics
- Export functionality for reports

## Database Schema

### Extended article_comments Table
```sql
-- New admin-specific columns
admin_comment_type admin_comment_type_enum,
comment_priority comment_priority_enum DEFAULT 'normal',
approval_status approval_status_enum DEFAULT 'pending',
admin_notes TEXT,
is_admin BOOLEAN DEFAULT FALSE,
assigned_admin_id UUID REFERENCES auth.users(id),
approval_date TIMESTAMP WITH TIME ZONE,
approved_by UUID REFERENCES auth.users(id),
rejection_reason TEXT
```

### admin_comment_notifications Table
```sql
CREATE TABLE admin_comment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### comment_approval_workflow Table
```sql
CREATE TABLE comment_approval_workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Reference

### Admin Comment Operations

#### Create Admin Comment
```typescript
createAdminComment(commentData: CreateAdminCommentRequest): Promise<AdminArticleComment>
```

#### Bulk Operations
```typescript
performBulkCommentOperation(operation: BulkCommentOperation): Promise<BulkOperationResult>
```

#### Approval Workflow
```typescript
approveComment(commentId: string, adminNotes?: string): Promise<AdminArticleComment>
rejectComment(commentId: string, reason: string, adminNotes?: string): Promise<AdminArticleComment>
```

#### Analytics
```typescript
getAdminCommentAnalytics(timeRange?: string): Promise<AdminCommentAnalytics>
getAdminCommentDashboardData(): Promise<AdminCommentDashboardData>
```

#### Search and Filtering
```typescript
searchComments(query: string, filters: AdminCommentFilters): Promise<AdminArticleComment[]>
getAdminArticleComments(articleId: string, filters?: AdminCommentFilters): Promise<AdminArticleComment[]>
```

## Usage Examples

### Creating an Admin Comment
```typescript
const newAdminComment = await createAdminComment({
  article_id: 'article-uuid',
  content: 'This article needs review for accuracy',
  admin_comment_type: 'review_comment',
  comment_priority: 'high',
  admin_notes: 'Technical fact-checking required'
});
```

### Bulk Priority Update
```typescript
const bulkOperation: BulkCommentOperation = {
  operation: 'updatePriority',
  commentIds: ['comment1', 'comment2', 'comment3'],
  data: {
    priority: 'urgent',
    adminNotes: 'Escalated due to customer complaint'
  }
};

const result = await performBulkCommentOperation(bulkOperation);
```

### Analytics Query
```typescript
const analytics = await getAdminCommentAnalytics('30d');
console.log(`Approval rate: ${analytics.totalApprovalRate}%`);
console.log(`High priority comments: ${analytics.priorityDistribution.high}`);
```

## Security Considerations

### Row Level Security (RLS)
- Admin comments are only visible to users with admin role
- Notification access is restricted to assigned admins
- Audit trails are immutable and admin-accessible only

### Permission Checks
```sql
-- Admin comment visibility policy
CREATE POLICY "Admin comments visible to admins" ON article_comments
FOR SELECT USING (
  NOT is_admin OR 
  auth.jwt() ->> 'user_role' = 'admin'
);
```

## Testing Strategy

### Component Testing
- Unit tests for all admin comment components
- Integration tests for dashboard functionality
- Visual regression tests for admin UI elements

### API Testing
- Endpoint functionality tests
- Permission and security tests
- Performance tests for bulk operations
- Data integrity and audit trail verification

### User Acceptance Testing
- Admin workflow validation
- Bulk operation usability testing
- Analytics accuracy verification
- Notification system testing

## Deployment Notes

### Prerequisites
- Supabase project with admin role configuration
- Email service setup for notifications
- Analytics database views created

### Migration Steps
1. Run admin comment schema migration
2. Update RLS policies for admin access
3. Deploy admin comment functions
4. Configure notification triggers
5. Set up analytics views

### Environment Variables
```bash
# Required for admin functionality
REACT_APP_ADMIN_ROLE=admin
REACT_APP_NOTIFICATION_EMAIL_FROM=admin@yourapp.com

# Optional analytics configuration
REACT_APP_ANALYTICS_RETENTION_DAYS=90
REACT_APP_BULK_OPERATION_LIMIT=100
```

## Future Enhancements

### Planned Features
- Real-time collaboration on comment resolution
- Advanced analytics with custom date ranges
- Integration with external moderation tools
- Automated workflow triggers based on keywords
- Mobile-optimized admin interface

### Performance Optimizations
- Comment pagination for large datasets
- Caching layer for analytics queries
- Background processing for bulk operations
- Real-time updates via WebSocket integration

## Support and Maintenance

### Monitoring
- Track bulk operation performance
- Monitor notification delivery rates
- Alert on high-priority comment backlogs
- Audit trail integrity checks

### Regular Maintenance
- Archive old resolved comments
- Update analytics aggregations
- Review and update admin permissions
- Performance optimization reviews 