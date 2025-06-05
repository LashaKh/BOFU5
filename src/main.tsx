import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

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

    // Create separate React root for toolbar
    const toolbarRoot = createRoot(toolbarContainer);
    toolbarRoot.render(<StagewiseToolbar config={stagewiseConfig} />);
  }).catch((error) => {
    // Gracefully handle if stagewise package is not available
    console.warn('Stagewise toolbar could not be loaded:', error);
  });
}
