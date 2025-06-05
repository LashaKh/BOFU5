# Tech Context: BOFU AI

## 1. Core Technologies
- **Frontend Framework:** React (v18.3.1) with TypeScript (v5.8.3).
    - Extensive use of React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useContext`) for state management and component lifecycle logic.
    - JSX for component templating with comprehensive TypeScript type safety.
- **Build System:** Vite (v5.4.2) for fast development and optimized production builds.
    - Custom build configuration with increased memory allocation (Node max-old-space-size=4096) for large bundle handling.
- **Routing:** React Router DOM (v7.4.1) for comprehensive client-side routing including protected routes and admin areas.
- **Styling:** Tailwind CSS (v3.4.1) for utility-first CSS, enabling rapid and consistent UI development.
    - Additional utility packages: `clsx` (v2.1.1), `tailwind-merge` (v3.2.0), `tailwindcss-animate` (v1.0.7).
- **Animation:** Framer Motion (v11.18.2) for sophisticated UI animations and transitions, particularly in content editor components and version history interfaces.
- **Iconography:** Lucide-react (v0.344.0) for a comprehensive library of clean and customizable SVG icons.
- **Backend-as-a-Service (BaaS):** Supabase (v2.39.7) for:
    - User Authentication (including JWT management, password reset).
    - PostgreSQL Database for storing application data (user profiles, product information, content briefs, research results, version history).
    - Real-time capabilities for collaborative features and version change notifications.
    - Row Level Security (RLS) for data protection and version access control.
- **Language:** TypeScript (v5.8.3) for end-to-end static typing, improving code quality, maintainability, and developer experience.

## 2. Rich Text Editing Ecosystem
- **TipTap Editor:** (@tiptap/react v2.11.7) - Primary rich text editor implementation
    - Extensions: @tiptap/starter-kit, @tiptap/extension-highlight, @tiptap/extension-image, @tiptap/extension-link, @tiptap/extension-typography
    - Used in EditContentBrief.tsx for main content editing
    - Enhanced with version history integration and auto-save with version capture
- **CKEditor5:** (@ckeditor/ckeditor5-react v9.5.0, @ckeditor/ckeditor5-build-classic v44.3.0) - Alternative rich text editor
- **React Quill:** (v2.0.0) - Additional rich text editing option
- **BlockNote:** (@blocknote/react v0.29.1, @blocknote/core v0.29.1) - Modern block-based editor
- **React Markdown:** (v10.1.0) with remark-gfm (v4.0.1) for Markdown rendering

## 3. Document Processing Capabilities
- **PDF Processing:** pdfjs-dist (v4.2.0) for client-side PDF text extraction and parsing
- **DOCX Processing:** mammoth (v1.7.0) for Word document parsing and conversion
- **File Handling:** 
    - react-dropzone (v14.2.3) for drag-and-drop file uploads
    - jszip (v3.10.1) for archive handling
    - base64-arraybuffer (v1.0.2) for file encoding
- **Document Analysis:** Integration with AI services for content extraction and analysis

## 4. Key Libraries & Dependencies (Frontend)
- **UI Components & Utilities:**
    - @radix-ui/react-* components (avatar, scroll-area, select, slot) for accessible UI primitives
    - @headlessui/react (v2.2.0) for accessible UI components
    - @heroicons/react (v2.2.0) for icon library
    - class-variance-authority (v0.7.1) for component variant management
- **State Management & Data:**
    - lodash (v4.17.21): Utility library; `debounce` is extensively used for performance optimization
    - date-fns (v3.3.1) for date manipulation and version timestamp formatting
    - axios (v1.6.7) for HTTP requests
- **User Experience:**
    - react-hot-toast (v2.4.1) for user notifications
    - react-textarea-autosize (v8.5.9) for responsive text areas
- **AI Integration:**
    - openai (v4.28.0) for AI service integration
- **Version Control & Diff:** diff (v7.0.0) for professional diff generation and comparison (NEW)
- **Development Tools:**
    - @types/* packages for TypeScript definitions
    - ESLint and TypeScript ESLint for code quality
    - nodemon for development server

## 5. Development Setup & Tooling
- **Package Manager:** npm (package-lock.json present)
- **Build Tool:** Vite with React plugin (@vitejs/plugin-react v4.3.1)
- **Development Server:** Concurrent development with `npm run dev` (Vite) and `npm run dev:server` (Node.js server with ts-node)
- **Linting & Formatting:** ESLint (v9.9.1) with React-specific plugins and TypeScript support
- **TypeScript Configuration:** Comprehensive setup with separate configs for app and Node.js components
- **PostCSS:** (v8.4.35) for CSS processing with Autoprefixer (v10.4.18)

## 6. Technical Constraints & Architecture Considerations
- **Bundle Size Management:** Large application requiring increased Node.js memory allocation for builds
- **Multiple Editor Pattern:** Several rich text editing solutions suggesting either flexibility needs or potential consolidation opportunities
- **Complex State Management:** Sophisticated data flow patterns, especially in content brief editing with array/string format handling and version state management
- **Performance Optimization:**
    - Debouncing expensive operations (Supabase saves, user input, version operations)
    - React.memo, useMemo, useCallback for preventing unnecessary re-renders
    - Code splitting and lazy loading considerations for large component tree
    - Efficient diff generation and version comparison without UI blocking
- **Type Safety & Interfaces:** Comprehensive TypeScript usage for all data structures, API responses, component props, and version management
- **Asynchronous Operations:** Extensive Promise and async/await usage for Supabase interactions, file processing, and version operations
- **Security Considerations:** 
    - Supabase Row Level Security (RLS) implementation including version access control
    - Input sanitization for user-generated content
    - Secure file upload and processing patterns
    - Version data security and user-scoped access

## 7. Component Architecture Patterns
- **Large Component Concern:** Several components exceed 500+ lines (EditContentBrief: 629 lines, ContentBriefDisplay: 1559 lines, ArticleEditor: 1332 lines with version integration)
- **State Management Patterns:** Mix of local component state and prop drilling for data flow, enhanced with version state coordination
- **Editor Implementation Variety:** Multiple content editor implementations suggesting architectural decisions in progress
- **Reusable Component Library:** Custom UI components built on Radix UI and Tailwind CSS foundation
- **Version Management Components:** Modular version history components designed for seamless integration

## 8. Build & Deployment Configuration
- **Production Build:** Optimized Vite build with Terser (v5.27.2) minification
- **Environment Configuration:** Environment variables for Supabase URL, API keys, and feature flags
- **Development Workflow:** Hot module replacement via Vite for rapid development
- **Asset Optimization:** PostCSS processing, automatic code splitting, and tree shaking

## 9. Server Components (Backend Integration)
- **Express Server:** Server component with TypeScript support via ts-node
- **API Integration:** RESTful API patterns for external service integration
- **Webhook Support:** Webhook utilities for external service communication
- **CORS Configuration:** Cross-origin resource sharing setup for API access

## 10. ProductCard Editing System Dependencies & Architecture

### New Custom Components (January 2025)
- **useAutoSave Hook:** (`src/hooks/useAutoSave.ts`)
  - Debounced auto-save functionality with 2-second delay
  - Comprehensive state management: `isSaving`, `hasUnsavedChanges`, `lastSaved`, `saveStatus`
  - Error handling and recovery patterns
  - Performance optimization with minimal re-renders

- **EditableField Component:** (`src/components/product/EditableField.tsx`)
  - Universal editing component supporting text, textarea, and array inputs
  - Inline editing with save/cancel functionality  
  - Keyboard navigation (Enter to save, Escape to cancel)
  - Auto-focus management and cursor positioning
  - Integration with react-textarea-autosize for dynamic text areas

- **SaveStatusIndicator Component:** (`src/components/product/SaveStatusIndicator.tsx`)
  - Subtle status badges replacing intrusive toast notifications
  - Color-coded states with professional visual feedback
  - Timestamp formatting with relative time display ("just now", "2m ago")
  - Auto-dismissal with Framer Motion animations
  - Accessibility features for screen readers

### Enhanced Component Dependencies
- **react-textarea-autosize:** (v8.5.9) - Added for dynamic textarea resizing in EditableField
- **ProductCardContent.tsx:** Enhanced for comprehensive editing of 15+ field types
  - Always-visible editing without edit/view mode toggles
  - Nested field update handlers for complex object structures
  - Integration with auto-save system
  - Comprehensive field support: text, arrays, nested objects

### Data Flow Architecture
- **Auto-Save Integration:** Seamless integration with existing Supabase persistence layer
- **State Management:** Enhanced local state management with editableProduct tracking
- **Error Handling:** Comprehensive error boundaries and user-friendly feedback
- **Type Safety:** Full TypeScript coverage for all new components and data flows

### Performance Optimization Patterns
- **Debounced Operations:** 2-second debounce for auto-save preventing excessive API calls
- **Efficient Re-renders:** Optimized state updates with React.memo and useCallback patterns
- **Memory Management:** Proper cleanup of timeouts and event listeners
- **Bundle Impact:** Minimal bundle size increase due to focused, efficient component design

### Production Quality Standards
- **TypeScript Excellence:** Full type coverage with comprehensive interfaces
- **Error Prevention:** Robust validation and safety checks throughout
- **User Experience:** Professional UI/UX with enterprise-grade quality
- **Maintainability:** Clear separation of concerns and modular architecture
- **Testing Ready:** Components designed for easy unit and integration testing

### Integration Patterns
- **Supabase Integration:** Enhanced integration with existing database layer
- **Component Composition:** Modular design allowing reuse across application
- **Hook Pattern:** Custom hooks following React best practices
- **Error Recovery:** Graceful degradation and error recovery patterns

## 11. Homepage Visual Enhancement System (January 2025)

### Advanced Animation Framework
- **Framer Motion Enhancements:** Extended animation capabilities with:
  - **Floating Orb Animations:** Infinite CSS transform animations with customizable paths
  - **Staggered Component Entry:** Progressive delays (0.1s intervals) for smooth visual hierarchy
  - **Micro-interactions:** Hover states, scaling effects, and sophisticated visual feedback
  - **GPU-Accelerated Performance:** Hardware-accelerated transforms ensuring 60fps performance

### Glassmorphism Design Implementation
- **Backdrop Blur Effects:** CSS `backdrop-filter: blur()` with fallback support
- **Floating Particle Systems:** Animated background elements with CSS transforms
- **Shimmer Effects:** Gradient animations creating premium visual experience
- **Multi-layer Visual Depth:** Layered elements creating immersive 3D-like experience

### Enhanced CSS Architecture
- **Gradient System Extensions:** New gradient combinations for step-based theming:
  ```css
  .gradient-primary: bg-gradient-to-r from-emerald-500 to-teal-600
  .gradient-blue: bg-gradient-to-r from-blue-500 to-cyan-600
  .gradient-purple: bg-gradient-to-r from-purple-500 to-indigo-600
  .gradient-green: bg-gradient-to-r from-green-500 to-emerald-600
  ```
- **Typography Scale Enhancements:** Extended Tailwind typography with massive scale (6xl/7xl)
- **Custom Animation Classes:** Specialized animations for floating elements, shimmer effects

### Component Enhancement Patterns
- **DocumentUploader Transformation:** 
  - 3x larger interactive area with enhanced drag-and-drop zones
  - Immersive visual feedback with particle effects during file processing
  - Enhanced status indicators with gradient styling and animations
- **Form Input Enhancements:**
  - Step-specific gradient themes for intuitive navigation
  - Enhanced validation states with professional error handling
  - Interactive example suggestions with hover effects

### Performance Optimization for Visual Effects
- **CSS Transform Optimization:** Hardware-accelerated animations preventing layout thrashing
- **Animation Efficiency:** Selective animation activation preventing unnecessary processing
- **Bundle Size Management:** CSS-only effects minimizing JavaScript dependency overhead

## 12. Admin UI/UX Enhancement System (January 2025 - NEW)

### Professional Modal Dialog Enhancement Framework
- **Background Overlay Enhancement Strategy:**
  - Opacity optimization: `bg-opacity-50` → `bg-opacity-75` for better content separation
  - Focus improvement: Enhanced modal focus and better user attention management
  - Visual hierarchy: Improved content layering for professional appearance
- **Modal Background Upgrade System:**
  - Color enhancement: `bg-secondary-800` → `bg-gray-900` for improved contrast and readability
  - Consistency improvement: Unified modal background colors across admin interface
  - Professional appearance: Enterprise-grade modal styling standards
- **Border and Shadow Enhancement Framework:**
  - Border definition: `border-primary-500/20` → `border-yellow-400/30` for better visual definition
  - Shadow system upgrade: `shadow-glow` → `shadow-2xl` for professional depth and visual hierarchy
  - Visual depth: Enhanced 3D appearance with professional shadow effects
- **Button Visual Enhancement System:**
  - Consistent border addition across all modal buttons for better interaction feedback
  - Professional styling with enhanced hover states and visual feedback
  - Improved accessibility with better visual definition and contrast

### Stagewise Development Tool Integration Architecture
- **Package Management System:**
  - Clean npm integration with `@stagewise/toolbar-react` for AI-powered editing capabilities
  - Proper dependency isolation and version management
  - Professional package installation and configuration management
- **Conditional Loading Framework:**
  - Development-only activation using `import.meta.env.DEV` checks preventing production interference
  - Environment-specific feature activation with proper error handling
  - Build-time optimization excluding development tools from production builds
- **Separate React Root Architecture:**
  - Independent React root for dev tools avoiding main app interference and conflicts
  - Clean separation of concerns between main application and development tools
  - Professional architecture preventing development tool conflicts
- **Error Handling and Fallback System:**
  - Comprehensive error handling with graceful fallbacks and user-friendly degradation
  - Professional error boundaries and recovery mechanisms
  - Robust fallback strategies for development tool failures

### Text Visibility Optimization Framework
- **Header Text Enhancement Strategy:**
  - Strategic color choices (`text-white`, `text-gray-300`) for optimal contrast and readability
  - Professional typography hierarchy with enhanced visibility standards
  - Accessibility compliance with proper contrast ratios throughout interface
- **Form Input Optimization System:**
  - `text-black` for all form inputs ensuring maximum readability and accessibility
  - Consistent form styling with professional appearance standards
  - Enhanced user experience with optimal text visibility in form elements
- **Button and Icon Visibility Enhancement:**
  - Enhanced button text visibility with proper contrast ratios throughout interface
  - Strategic icon color updates (`text-white`) for better visual clarity and recognition
  - Professional icon styling with enhanced accessibility and visibility
- **Placeholder and Input Text Optimization:**
  - Strategic placeholder color adjustments for better form usability and readability
  - Professional input styling with enterprise-grade text visibility standards
  - Enhanced form user experience with optimal text contrast

### Bulk Operations Panel Redesign Framework
- **Professional Animation System:**
  - Spring-based animations with micro-interactions for enhanced user experience
  - Modern animation patterns with smooth transitions and professional feedback
  - Performance-optimized animations with GPU acceleration and efficient rendering
- **Layout Enhancement Architecture:**
  - 600px minimum width with proper padding and spacing for professional appearance
  - Visual consistency with sidebar theming (`bg-gray-800/90`) for visual harmony
  - Section organization with clear visual separation between functional areas
- **Interactive Feedback System:**
  - Hover effects and visual feedback throughout interface elements
  - Professional grid layout with modern rounded corners and shadows
  - Enhanced user interaction with immediate visual feedback and smooth transitions

### Visual Consistency Enhancement Patterns
- **Background Consistency Framework:**
  - Main content background: `bg-gray-800/90 min-h-screen` for consistent visual experience
  - Sidebar color harmony: Perfect color scheme matching between content and navigation
  - Transparency elimination: Removed transparent backgrounds for professional solid appearance
- **Visual Hierarchy Enhancement:**
  - Enhanced visual structure through consistent background and spacing patterns
  - Professional color scheme coordination across all admin interface elements
  - Unified theming strategy with enterprise-grade appearance standards

### Technical Implementation Excellence
- **TypeScript Integration:**
  - Complete type safety across all UI/UX enhancement components
  - Professional error prevention with comprehensive type checking
  - Enhanced development experience with full TypeScript coverage
- **Component Architecture:**
  - Modular component design for enhanced maintainability and reusability
  - Professional separation of concerns with clean component interfaces
  - Enterprise-grade component organization and structure
- **Performance Optimization:**
  - Efficient rendering with minimal performance impact from UI enhancements
  - Professional animation performance with 60fps standards
  - Optimized component lifecycle management and memory usage

### Production Deployment Readiness
- **Enterprise Standards Compliance:**
  - Professional appearance suitable for customer-facing deployment
  - Accessibility compliance with WCAG standards and proper contrast ratios
  - Cross-browser compatibility with modern browser support
- **Development Workflow Enhancement:**
  - AI-powered development tools integration for enhanced productivity
  - Professional development environment with modern tooling support
  - Enhanced debugging and development capabilities with stagewise integration

## 13. Competitor Analysis Technical Enhancement (January 2025 - ENHANCED)

### State Management Improvements
- **Race Condition Prevention:** Enhanced async operation handling with proper cleanup
- **Parameter Synchronization:** Corrected function signatures ensuring reliable data flow
- **Error Recovery Enhancement:** Comprehensive logging and recovery mechanisms
- **Performance Optimization:** Improved state synchronization patterns

### UI/UX Enhancement Patterns
- **Loading State Management:** Enhanced user feedback during analysis operations
- **Error Handling Interface:** User-friendly error display with actionable recovery options
- **Responsive Design:** Optimized interface for various screen sizes
- **Animation Integration:** Smooth transitions for competitor data display

## 14. Version History System Architecture (January 2025 - NEW)

### Database Integration Dependencies
- **Supabase Schema Extensions:** 
  - version_tag_enum type for categorizing version saves
  - version_history table with comprehensive metadata tracking
  - Database triggers for automatic version capture
  - Row-level security policies for user-scoped access
  - Performance-optimized indexes (B-tree, GIN) for version queries

### Advanced Diff & Comparison System
- **diff Library Integration:** (v7.0.0) - Professional diff generation library
  - Multiple diff algorithms: lines, words, characters comparison
  - Standard patch format generation for export capabilities
  - High-performance diff calculation with minimal blocking
  - Memory-efficient diff rendering for large documents

### Version Management API Architecture
- **versionHistoryApi:** Complete version management backend
  - Full CRUD operations for version tracking
  - Advanced search and filtering capabilities
  - Version restoration with backup creation
  - Comprehensive error handling and type safety

- **Enhanced articleApi:** Backward-compatible version integration
  - Automatic version capture on article saves
  - Version metadata injection without breaking existing workflows
  - Configurable version tagging based on save context

### Professional UI Components
- **VersionHistoryPanel:** (`src/components/ui/VersionHistoryPanel.tsx`)
  - Advanced version browsing with search and filtering
  - Responsive design with professional styling
  - Accessibility compliance with keyboard navigation
  - Performance-optimized rendering for large version lists

- **VersionComparisonView:** (`src/components/ui/VersionComparisonView.tsx`)
  - Side-by-side and unified diff visualization
  - Color-coded change highlighting with intuitive navigation
  - Professional typography and spacing for diff readability
  - Export functionality for diff patches and comparisons

- **VersionHistoryButton:** (`src/components/ui/VersionHistoryButton.tsx`)
  - Floating access button for seamless editor integration
  - Context-aware positioning with responsive behavior
  - Professional styling matching editor theme
  - Dropdown panel management with click-outside handling

### Version History Styling System
- **version-history.css:** (`src/styles/version-history.css`)
  - Professional diff visualization styles
  - Color-coded change indicators (additions, deletions, modifications)
  - Responsive design patterns for various screen sizes
  - Animation effects for smooth version transitions
  - Accessibility features for screen reader compatibility

### ArticleEditor Integration Patterns
- **Type Safety Enhancements:** 
  - Fixed AdminPanel prop compatibility issues
  - Enhanced UserProfile type mapping for admin mode
  - Comprehensive TypeScript coverage for version operations

- **Seamless Workflow Integration:**
  - Non-intrusive version history access via floating button
  - Context preservation during version operations
  - Automatic editor refresh after version restoration
  - Maintained editor state during version browsing

### Performance Optimization for Version Operations
- **Efficient Database Queries:** Optimized version retrieval with proper indexing
- **Lazy Loading:** Version content loaded on-demand to reduce initial load times
- **Debounced Operations:** Version saves debounced to prevent excessive database writes
- **Memory Management:** Proper cleanup of version comparison components
- **Bundle Size Impact:** Minimal impact on bundle size through efficient component design

### Security & Access Control for Versions
- **Row-Level Security:** User-scoped version access with Supabase RLS policies
- **Version Data Protection:** Secure version metadata storage with encryption
- **Audit Trail Integration:** Complete version change tracking with user attribution
- **Access Control:** Version restoration permissions with proper authorization

### Integration with Existing Systems
- **Backward Compatibility:** No breaking changes to existing article management
- **Admin System Integration:** Version oversight capabilities for admin users
- **Comment System Coordination:** Version history works alongside comment resolution
- **Navigation Integration:** Consistent routing and state management patterns

**TECHNICAL STATUS:** Complete system with stunning visual design, robust functionality, comprehensive error handling, advanced animation framework, and production-ready quality suitable for customer deployment and competitive positioning.