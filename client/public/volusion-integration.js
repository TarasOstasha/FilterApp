/**
 * Volusion Store Integration Script
 * This script integrates the Filter App into a Volusion store
 * - Injects the filter sidebar on the left
 * - Replaces v-product-grid with filtered results when filters are active
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiBaseUrl: window.FILTER_APP_API_URL || 'http://193.169.241.246:5000/api',
    reactAppUrl: window.FILTER_APP_REACT_URL || 'http://193.169.241.246:5000',
    sidebarContainerId: 'filter-app-sidebar',
    productGridSelector: '.search_results_section, form.search_results_section',
    productGridContainerId: 'filter-app-products',
  };

  // State management
  let isFilterActive = false;
  let originalProductGrid = null;
  let filterAppContainer = null;

  /**
   * Initialize the filter app integration
   */
  function init() {
    console.log('[Filter App] Initializing Volusion integration...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  /**
   * Setup the integration
   */
  function setup() {
    try {
      // Check if we're on a product listing page
      if (!isProductListingPage()) {
        console.log('[Filter App] Not a product listing page, skipping integration');
        return;
      }

      // Inject sidebar
      injectSidebar();

      // Setup product grid replacement
      setupProductGridReplacement();

      // Load React components
      loadReactApp();

      console.log('[Filter App] Integration complete');
    } catch (error) {
      console.error('[Filter App] Integration error:', error);
    }
  }

  /**
   * Check if current page is a product listing page
   */
  function isProductListingPage() {
    // Check for Volusion product grid
    return document.querySelector(CONFIG.productGridSelector) !== null;
  }

  /**
   * Inject the filter sidebar into the page
   */
  function injectSidebar() {
    console.log('[Filter App] Injecting sidebar...');

    // Find the sidebar wrapper (adjust selector based on your Volusion theme)
    const sidebarWrapper = document.querySelector('.sidebar-wrapper-col-md-3') || 
                          document.querySelector('.col-md-3') ||
                          document.querySelector('#sidebar');

    if (!sidebarWrapper) {
      console.warn('[Filter App] Sidebar wrapper not found, creating one');
      createSidebarWrapper();
      return;
    }

    // Create sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = CONFIG.sidebarContainerId;
    sidebarContainer.style.cssText = 'width: 100%; margin-bottom: 20px;';

    // Insert at the beginning of sidebar
    sidebarWrapper.insertBefore(sidebarContainer, sidebarWrapper.firstChild);

    console.log('[Filter App] Sidebar container created');
  }

  /**
   * Create sidebar wrapper if it doesn't exist
   */
  function createSidebarWrapper() {
    const mainContent = document.querySelector('.container') || document.querySelector('main');
    
    if (!mainContent) {
      console.error('[Filter App] Could not find main content area');
      return;
    }

    // Create sidebar column
    const sidebarCol = document.createElement('div');
    sidebarCol.className = 'col-md-3';
    sidebarCol.id = 'filter-app-sidebar-column';

    // Create sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = CONFIG.sidebarContainerId;
    sidebarCol.appendChild(sidebarContainer);

    // Insert before main content
    mainContent.insertBefore(sidebarCol, mainContent.firstChild);
  }

  /**
   * Setup product grid replacement functionality
   */
  function setupProductGridReplacement() {
    console.log('[Filter App] Setting up product grid replacement...');

    const productGrid = document.querySelector(CONFIG.productGridSelector);
    
    if (!productGrid) {
      console.warn('[Filter App] Product grid not found');
      return;
    }

    // Store reference to original grid
    originalProductGrid = productGrid;

    // Create container for filtered products (hidden by default)
    filterAppContainer = document.createElement('div');
    filterAppContainer.id = CONFIG.productGridContainerId;
    filterAppContainer.style.cssText = 'display: none; width: 100%;';

    // Insert after the original grid
    productGrid.parentNode.insertBefore(filterAppContainer, productGrid.nextSibling);

    console.log('[Filter App] Product grid replacement ready');
  }

  /**
   * Load React app scripts and styles
   */
  function loadReactApp() {
    console.log('[Filter App] Loading React app...');

    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = `${CONFIG.reactAppUrl}/static/css/main.css`;
    document.head.appendChild(cssLink);

    // Load React and ReactDOM from CDN
    loadScript('https://unpkg.com/react@18/umd/react.production.min.js', () => {
      loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', () => {
        // Load main app bundle
        loadScript(`${CONFIG.reactAppUrl}/static/js/main.js`, () => {
          console.log('[Filter App] React app loaded');
          initializeReactComponents();
        });
      });
    });
  }

  /**
   * Load external script
   */
  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = () => console.error(`[Filter App] Failed to load script: ${src}`);
    document.body.appendChild(script);
  }

  /**
   * Initialize React components
   */
  function initializeReactComponents() {
    console.log('[Filter App] Initializing React components...');

    // Set up global event listeners for filter changes
    window.addEventListener('filter-app:filters-changed', handleFiltersChanged);
    window.addEventListener('filter-app:filters-cleared', handleFiltersCleared);

    // Trigger initial render
    if (window.FilterApp && window.FilterApp.init) {
      window.FilterApp.init({
        sidebarContainerId: CONFIG.sidebarContainerId,
        productGridContainerId: CONFIG.productGridContainerId,
        apiBaseUrl: CONFIG.apiBaseUrl,
        onFilterChange: handleFilterChange,
      });
    }
  }

  /**
   * Handle filter changes
   */
  function handleFilterChange(filters) {
    console.log('[Filter App] Filters changed:', filters);
    
    const hasActiveFilters = Object.keys(filters).length > 0;
    
    if (hasActiveFilters && !isFilterActive) {
      // Show filtered products, hide original grid
      showFilteredProducts();
    } else if (!hasActiveFilters && isFilterActive) {
      // Show original grid, hide filtered products
      showOriginalProducts();
    }
  }

  /**
   * Handle filter change event
   */
  function handleFiltersChanged(event) {
    const filters = event.detail;
    handleFilterChange(filters);
  }

  /**
   * Handle filters cleared event
   */
  function handleFiltersCleared() {
    showOriginalProducts();
  }

  /**
   * Show filtered products and hide original grid
   */
  function showFilteredProducts() {
    console.log('[Filter App] Showing filtered products');
    
    if (originalProductGrid) {
      originalProductGrid.style.display = 'none';
    }
    
    if (filterAppContainer) {
      filterAppContainer.style.display = 'block';
    }
    
    isFilterActive = true;
  }

  /**
   * Show original products and hide filtered grid
   */
  function showOriginalProducts() {
    console.log('[Filter App] Showing original products');
    
    if (originalProductGrid) {
      originalProductGrid.style.display = 'block';
    }
    
    if (filterAppContainer) {
      filterAppContainer.style.display = 'none';
    }
    
    isFilterActive = false;
  }

  /**
   * Get category ID from URL
   */
  function getCategoryId() {
    try {
      const path = window.location.pathname;
      const match = path.match(/\/(\d+)\.htm/i);
      return match ? match[1] : null;
    } catch (error) {
      console.error('[Filter App] Error getting category ID:', error);
      return null;
    }
  }

  // Expose API for external access
  window.FilterAppIntegration = {
    init: init,
    getCategoryId: getCategoryId,
    showFilteredProducts: showFilteredProducts,
    showOriginalProducts: showOriginalProducts,
  };

  // Auto-initialize
  init();

})();
