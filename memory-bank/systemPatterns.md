# System Patterns: BOFU AI

## 1. System Architecture Overview
- **Frontend:** Single Page Application (SPA) built with React and TypeScript.
- **Backend-as-a-Service (BaaS):** Supabase is used for:
    - Authentication (user login, admin roles)
    - Database (user profiles, product information, research data, content briefs)
- **AI Integration:** (Details TBD - likely involves calls to external AI APIs/services for analysis and generation tasks, orchestrated by backend functions or directly from the frontend where appropriate and secure).
- **Component-Based Architecture:** The frontend is built on a modular, component-based architecture using React. Key application modules, like Content Brief Management, are encapsulated within dedicated components (e.g., `ContentBriefEditorNew`, `ContentBriefDisplay`).

## 2. Key Technical Decisions & Design Patterns
- **React for UI Development:** Leveraged for building interactive and reusable UI components.
- **State Management with React Hooks:**
    - `useState` for managing local component state (e.g., opened sections, edit modes in `ContentBriefEditorNew`).
    - `useEffect` for handling side effects, including:
        - Synchronizing component state with props (e.g., initial content loading in editors).
        - **Controlled Data Synchronization:** Specifically, in `ContentBriefDisplay`, `useEffect` is now used to manage updates to the parent component based on internal state changes, preventing infinite loops by separating state mutation from the synchronization callback.
        - Debouncing user input or frequent updates.
    - `useCallback` for memoizing functions to prevent unnecessary re-renders, especially for event handlers passed to child components.
- **TypeScript for Type Safety:** Ensures robust code by catching type errors during development and improving code readability.
- **Component Design Patterns (Content Brief Editor - `ContentBriefEditorNew`):**
    - **Card-Based UI:** Sections of the content brief are presented as distinct, collapsible cards for better organization and visual appeal.
    - **Inline Editing:** Direct manipulation of content within the display, rather than separate input fields or modals for most fields.
    - **Dynamic Rendering for Data Types:** Specialized UI components and logic for handling different data structures (strings, numbers, arrays, nested objects). Arrays are often managed with grid layouts allowing add/edit/delete operations per item.
    - **Conditional Rendering:** Showing or hiding UI elements based on state (e.g., edit mode, expanded sections, data type).
    - **Progressive Disclosure:** Collapsible sections help manage complexity by showing only relevant information initially.
- **Event Handling and Data Flow:**
    - Parent components pass down initial data and update callbacks (e.g., `initialContent`, `onUpdate` in `ContentBriefEditorNew`).
    - Child components manage their internal state and call parent callbacks to propagate changes upwards (e.g., invoking `onUpdate` when content is modified).
    - Careful management of prop updates and `useEffect` dependencies is crucial to prevent issues like the one fixed in `ContentBriefDisplay` (where prop changes incorrectly re-triggered state updates and an infinite loop).
- **Direct Database Integration (Supabase):** Components like `ContentBriefEditorNew` directly interact with Supabase for data persistence, typically via asynchronous functions triggered by user actions (e.g., saving changes).
- **Utility Functions/Libraries:**
    - `lodash/debounce` for rate-limiting updates to improve performance and user experience.
    - `react-hot-toast` for user notifications.
- **Styling with Tailwind CSS:** Utility-first CSS framework for rapid UI development and consistent styling.
- **Animations with Framer Motion:** Used for smooth UI transitions and interactive elements, enhancing user experience in components like `ContentBriefEditorNew`.
- **Iconography with Lucide-react:** Provides a consistent and customizable set of icons.

## 3. Component Relationships (Example: Content Briefs)
- `EditContentBrief` (Page/Container Component):
    - Fetches initial content brief data (likely using brief ID from URL params).
    - Renders `ContentBriefEditorNew`.
    - Handles the `onUpdate` callback from the editor to persist changes to Supabase.
- `ContentBriefEditorNew` (Presentational/Interactive Component):
    - Receives `initialContent` (parsed JSON) and `onUpdate` (callback to save stringified JSON) props.
    - Manages its own complex UI state derived from `initialContent` (expanded sections, field values, temporary states for inline editing of array items etc.).
    - Renders various sub-components for different fields (text inputs, array managers, object renderers).
    - Calls `onUpdate` with the stringified, modified content, often debounced.
- `ContentBriefDisplay` (Presentational Component):
    - Receives content (parsed JSON) as a prop.
    - Renders the content in a read-only or display-focused format.
    - Its `useEffect` hook for content synchronization has been refactored to prevent infinite loops.

## 4. Data Flow & State Management
- **Local Component State:** `useState` is primarily used for UI-specific state within components (e.g., toggling expansion, managing input field values before commit).
- **Prop Drilling:** For moderately complex applications, props are passed down from parent to child components. For deeper or more complex state sharing, a context or state management library might be considered in the future, but current patterns rely on direct prop passing for the content brief features.
- **Asynchronous Data:** Data fetching from Supabase (e.g., loading a brief) and updates are handled with `async/await` within component lifecycle methods or event handlers, with loading/error states managed locally.

## 5. Error Handling
- `try...catch` blocks for asynchronous operations (Supabase calls).
- User feedback via `react-hot-toast` for success and error messages.
- Component-level error boundaries (potential future addition for more graceful error handling in isolated parts of the UI).