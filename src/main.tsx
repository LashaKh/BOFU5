import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Ensure React is globally available for all contexts and libraries
// This fixes production bundling issues where createContext becomes undefined
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ReactCreateContext = React.createContext;
}

// Additional defensive check for module systems
if (typeof global !== 'undefined') {
  (global as any).React = React;
}

// Verify React is properly available before proceeding
if (typeof React === 'undefined' || typeof React.createContext === 'undefined') {
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
