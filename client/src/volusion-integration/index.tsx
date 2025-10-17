import React from 'react';
import ReactDOM from 'react-dom/client';
import VolusionIntegration from './VolusionIntegration';
import '../styles/App.scss';

interface InitConfig {
  sidebarContainerId: string;
  productGridContainerId: string;
  apiBaseUrl: string;
  onFilterChange?: (filters: any) => void;
}

/**
 * Initialize the Filter App for Volusion integration
 */
function init(config: InitConfig) {
  console.log('[Filter App] Initializing with config:', config);

  // Render sidebar
  const sidebarContainer = document.getElementById(config.sidebarContainerId);
  if (sidebarContainer) {
    const sidebarRoot = ReactDOM.createRoot(sidebarContainer);
    sidebarRoot.render(
      <React.StrictMode>
        <VolusionIntegration apiBaseUrl={config.apiBaseUrl} />
      </React.StrictMode>
    );
    console.log('[Filter App] Sidebar rendered');
  } else {
    console.error('[Filter App] Sidebar container not found:', config.sidebarContainerId);
  }

  // The product grid container will be populated by the VolusionIntegration component
  // when filters are active
}

/**
 * Cleanup and unmount the app
 */
function destroy() {
  // Cleanup logic if needed
  console.log('[Filter App] Cleanup');
}

// Expose to window for integration script
declare global {
  interface Window {
    FilterApp: {
      init: typeof init;
      destroy: typeof destroy;
    };
  }
}

window.FilterApp = {
  init,
  destroy,
};

export { init, destroy };
