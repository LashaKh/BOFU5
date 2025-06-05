# Component Directory - BOFU AI

**Last Updated**: January 12, 2025

## Admin Components (`src/components/admin/`)

### Core Admin Infrastructure

#### `AdminDashboard.tsx` 
**Purpose**: Main admin interface with multi-view navigation  
**Features**: Product review, user management, article management, audit logs, settings  
**Status**: ✅ Production ready  
**Key Props**: `onLogout`

#### `AdminAuthModal.tsx`
**Purpose**: Admin authentication modal  
**Features**: Admin login form with validation  
**Status**: ✅ Working  

### Article Management System

#### `AdminArticleList.tsx`
**Purpose**: Article listing with advanced management features  
**Features**: Filtering, search, pagination, sorting, action buttons  
**Status**: ✅ Production ready  
**Key Props**: `selectedUser`, `onArticleSelect`, `onOpenOwnershipTransfer`, `onOpenVersionHistory`, `onOpenMetadataEditor`

#### `AdminArticleManagementPage.tsx` (Page Component)
**Purpose**: Complete article management interface  
**Features**: Overview stats, article list integration, bulk operations, audit logging  
**Status**: ✅ Production ready  

#### `ArticleEditor.tsx` (Enhanced)
**Purpose**: Article editor with admin extension capabilities  
**Features**: Admin mode indicators, status management, internal notes  
**Status**: ✅ Production ready with admin features  
**Key Props**: `adminMode`, `adminUser`, `originalAuthor`

#### `AdminPanel.tsx`
**Purpose**: Admin control panel for article editor  
**Features**: Status management, version history, ownership transfer, notes  
**Status**: ✅ Production ready  

### Advanced Management Modals

#### `OwnershipTransferModal.tsx`
**Purpose**: Transfer article ownership between users  
**Features**: User search, selection confirmation, audit logging  
**Status**: ✅ Production ready  
**Key Props**: `isOpen`, `onClose`, `article`, `currentUser`, `onTransferComplete`

#### `VersionHistoryModal.tsx`
**Purpose**: View and restore article versions  
**Features**: Version list, content preview, restore functionality  
**Status**: ✅ Production ready  
**Key Props**: `isOpen`, `onClose`, `article`, `onRestoreVersion`

#### `MetadataEditorModal.tsx`
**Purpose**: Edit comprehensive article metadata  
**Features**: Title, product, status, priority, tags, SEO keywords  
**Status**: ✅ Production ready  
**Key Props**: `isOpen`, `onClose`, `article`, `onSaveMetadata`

#### `BulkOperationsPanel.tsx`
**Purpose**: Perform operations on multiple articles  
**Features**: Status updates, deletion, export, ownership transfer  
**Status**: ✅ Production ready  
**Key Props**: `selectedArticles`, `onClearSelection`, various operation handlers

### User Management

#### `UserSelector.tsx`
**Purpose**: Search and select users for admin operations  
**Features**: Debounced search, user profiles, company info  
**Status**: ✅ Production ready  
**Key Props**: `onUserSelect`, `selectedUser`

### Audit & Monitoring

#### `AuditLogViewer.tsx` ⭐ **NEW**
**Purpose**: Comprehensive audit trail interface  
**Features**: Filtering, search, pagination, export, expandable details  
**Status**: ✅ Production ready  
**Key Props**: `className`

#### `AuditLogViewerTest.tsx` ⭐ **NEW**
**Purpose**: Interactive testing for audit logging system  
**Features**: 7 test scenarios, real-time feedback, instructions  
**Status**: ✅ Testing component  

### Testing Components

#### `UserSelectorTest.tsx`
**Purpose**: Test interface for user selection  
**Status**: ✅ Development testing  

#### `AdminArticleListTest.tsx`
**Purpose**: Test interface for article list  
**Status**: ✅ Development testing  

#### `ArticleEditorAdminTest.tsx`
**Purpose**: Test interface for admin article editor  
**Status**: ✅ Development testing  

## Core Services (`src/lib/`)

#### `auditLogger.ts` ⭐ **NEW**
**Purpose**: Centralized audit logging service  
**Features**: Singleton pattern, 10 action types, metadata capture, export  
**Status**: ✅ Production ready  
**Key Methods**: `logAction()`, `logArticleView()`, `logStatusChange()`, `logOwnershipTransfer()`

#### `adminApi.ts`
**Purpose**: Admin API client for backend communication  
**Features**: Article management, user lookup, audit log retrieval  
**Status**: ✅ Production ready  

## Page Components (`src/pages/`)

#### `AdminArticleManagementPage.tsx`
**Purpose**: Main page for article management  
**Features**: Stats overview, article list, bulk operations, modals  
**Status**: ✅ Production ready  
**Route**: Used in `/admin` dashboard

## Type Definitions (`src/types/`)

#### `adminApi.ts`
**Purpose**: TypeScript interfaces for admin system  
**Features**: `ArticleListItem`, `UserProfile`, `AuditLogEntry`  
**Status**: ✅ Complete type coverage  

## Component Relationships

```
AdminDashboard (Main Hub)
├── Product Review (existing)
├── User Management
│   └── UserSelector
├── Article Management ⭐ NEW
│   ├── AdminArticleManagementPage
│   │   ├── AdminArticleList
│   │   ├── BulkOperationsPanel
│   │   ├── OwnershipTransferModal
│   │   ├── VersionHistoryModal
│   │   └── MetadataEditorModal
│   └── ArticleEditor (with AdminPanel)
├── Audit Logs ⭐ NEW
│   └── AuditLogViewer
└── Settings (placeholder)
```

## Integration Points

### Audit Logging Integration
- All admin actions automatically logged via `auditLogger.ts`
- Real-time feedback through toast notifications
- Export capabilities for compliance

### Modal System
- Centralized modal state management
- Consistent design patterns
- Proper cleanup and error handling

### API Integration
- RESTful endpoints for all operations
- Proper error handling and retry logic
- Type-safe responses with TypeScript

## Testing Routes

### Development Routes
- `/audit-log-viewer-test` - Audit system testing
- `/user-selector-test` - User selection testing  
- `/admin-article-list-test` - Article management testing
- `/article-editor-admin-test` - Admin editor testing

### Production Routes
- `/admin` - Main admin dashboard
- `/admin/articles/:articleId` - Article-specific admin view

## Status Legend
- ✅ Production ready - Fully tested and integrated
- 🔄 In development - Work in progress
- 🧪 Testing component - For development/testing only
- ⭐ NEW - Recently added in Task 16

**Total Components**: 20+ admin components with comprehensive functionality  
**Coverage**: Complete admin article access system with enterprise features 