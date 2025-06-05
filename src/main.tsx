import React, { StrictMode, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Comprehensive React global availability fix for production bundling issues
// This ensures all React APIs are available for third-party libraries
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ReactCreateContext = React.createContext;
  
  // Make all React hooks globally available for libraries like use-isomorphic-layout-effect
  (window as any).ReactUseState = React.useState;
  (window as any).ReactUseEffect = React.useEffect;
  (window as any).ReactUseLayoutEffect = React.useLayoutEffect;
  (window as any).ReactUseContext = React.useContext;
  (window as any).ReactUseReducer = React.useReducer;
  (window as any).ReactUseMemo = React.useMemo;
  (window as any).ReactUseCallback = React.useCallback;
  (window as any).ReactUseRef = React.useRef;
  (window as any).ReactUseImperativeHandle = React.useImperativeHandle;
  (window as any).ReactUseDeferredValue = React.useDeferredValue;
  (window as any).ReactUseTransition = React.useTransition;
  (window as any).ReactUseId = React.useId;
  
  // Specific fix for use-isomorphic-layout-effect library
  // This library specifically looks for these patterns
  const reactModule = Object.assign({}, React, {
    useLayoutEffect: React.useLayoutEffect,
    useEffect: React.useEffect
  });
  
  (window as any)['react'] = reactModule;
  (window as any).require = (name: string) => {
    if (name === 'react') {
      return reactModule;
    }
    return undefined;
  };
  
  // For libraries that expect React to be available under a specific namespace
  if (!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
  }
}

// Additional defensive check for module systems
if (typeof global !== 'undefined') {
  (global as any).React = React;
  (global as any).ReactCreateContext = React.createContext;
  (global as any).ReactUseLayoutEffect = React.useLayoutEffect;
}

// Verify React is properly available before proceeding
if (typeof React === 'undefined' || typeof React.createContext === 'undefined' || typeof React.useLayoutEffect === 'undefined') {
  console.error('React availability check failed:');
  console.error('- React:', typeof React);
  console.error('- createContext:', typeof React?.createContext);
  console.error('- useLayoutEffect:', typeof React?.useLayoutEffect);
  console.error('- window.React:', typeof (window as any)?.React);
  throw new Error('React is not properly loaded. This indicates a critical bundling issue.');
}

// Main app root
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Stagewise toolbar integration (development only)
if (import.meta.env.DEV) {
  import('@stagewise/toolbar-react').then(({ StagewiseToolbar }) => {
    // Create stagewise toolbar configuration
    const stagewiseConfig = {
      plugins: []
    };

    // Create a separate container for the toolbar
    const toolbarContainer = document.createElement('div');
    toolbarContainer.id = 'stagewise-toolbar-root';
    document.body.appendChild(toolbarContainer);

    // Mount the toolbar
    const toolbarRoot = createRoot(toolbarContainer);
    toolbarRoot.render(<StagewiseToolbar config={stagewiseConfig} />);
  }).catch((error) => {
    console.log('Stagewise toolbar not available in development:', error);
  });
}
