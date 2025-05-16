# Tech Context: BOFU AI

## 1. Core Technologies
- **Frontend Framework:** React (v18+) with TypeScript.
    - Extensive use of React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useContext` as needed) for state management and component lifecycle logic.
    - JSX for component templating.
- **Styling:** Tailwind CSS for utility-first CSS, enabling rapid and consistent UI development.
- **Animation:** Framer Motion for sophisticated UI animations and transitions, particularly in components like `ContentBriefEditorNew` for enhancing user experience (e.g., collapsible sections, item add/remove animations).
- **Iconography:** Lucide-react for a comprehensive library of clean and customizable SVG icons.
- **Backend-as-a-Service (BaaS):** Supabase for:
    - User Authentication (including JWT management).
    - PostgreSQL Database for storing application data (user profiles, product information, content briefs, etc.).
    - Realtime capabilities (if utilized).
    - Storage (for user-uploaded files, if applicable to content briefs).
- **Language:** TypeScript for end-to-end static typing, improving code quality, maintainability, and developer experience.

## 2. Key Libraries & Dependencies (Frontend - highlighted by recent work)
- `react` / `react-dom`: Core React libraries.
- `typescript`: For static typing.
- `tailwindcss`: Utility-first CSS framework.
- `framer-motion`: Animation library.
- `lucide-react`: Icon library.
- `@supabase/supabase-js`: Official Supabase client library for JavaScript/TypeScript.
- `lodash`: Utility library; specifically `debounce` is used (e.g., in `ContentBriefEditorNew`) to manage the frequency of updates, improving performance and reducing Supabase calls.
- `react-hot-toast`: For displaying non-intrusive user notifications (e.g., save confirmations, error messages).
- `react-router-dom`: For client-side routing (likely used for navigating to different pages like `EditContentBrief`).

## 3. Development Setup & Tooling
- **Package Manager:** npm or yarn.
- **Build Tool:** Vite (common for modern React projects, or Create React App scripts if older setup).
- **Version Control:** Git (repository likely hosted on GitHub, GitLab, or similar).
- **IDE:** VS Code is common, with extensions for TypeScript, ESLint, Prettier.
- **Linting & Formatting:** ESLint and Prettier to enforce code style and catch common errors.
- **TypeScript Compiler (`tsc`):** For type checking as part of the development and build process.

## 4. Technical Constraints & Considerations
- **React Hook Rules & Best Practices:** Strict adherence is necessary to avoid bugs (e.g., stale closures, incorrect dependency arrays in `useEffect`).
- **State Management Complexity:** The `ContentBriefEditorNew` component manages a complex, nested JSON structure. This requires careful state management to ensure:
    - Deep updates to nested fields are handled correctly.
    - Inline editing of array items (add, update, delete) is smooth.
    - Performance is maintained, avoiding unnecessary re-renders of the entire form.
- **Performance Optimization:**
    - Debouncing expensive operations (like saving to Supabase via `onUpdate` in `ContentBriefEditorNew`).
    - Memoization (`React.memo`, `useMemo`, `useCallback`) to prevent unnecessary re-renders of components or re-computation of values.
    - The `ContentBriefDisplay` fix addressed a critical performance issue (infinite loop) caused by improper `useEffect` usage, emphasizing the importance of correct effect dependencies and state synchronization logic.
- **Type Safety & Interfaces:** Robust TypeScript interfaces are crucial for managing the structure of the content brief JSON, component props (e.g., `ContentBriefEditorProps`), and state. This helps prevent runtime errors and makes the codebase easier to understand and refactor.
- **Asynchronous Operations:** Effectively managing Promises and `async/await` for all Supabase interactions (fetching briefs, saving updates) and other asynchronous tasks. This includes handling loading states and potential errors gracefully.
- **Security:** Ensuring that Supabase Row Level Security (RLS) policies are correctly configured if data is sensitive. Input sanitization if user-generated content is rendered directly as HTML (though React generally mitigates XSS).

## 5. Build & Deployment
- (Details TBD - commonly Vercel, Netlify, AWS Amplify for React/Supabase projects).
- Environment variables for Supabase URL and anon key management.