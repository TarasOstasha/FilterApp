import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/App.scss';
import './volusionEmbed.scss';
import React from 'react';
import ReactDOM from 'react-dom/client';
import VolusionEmbedApp from './VolusionEmbedApp';
import {
  initEmbedDomDefaults,
  isVolusionCategoryPage,
  mountProductsRoot,
  mountSidebarRoot,
} from './volusionDom';

if (isVolusionCategoryPage()) {
  const sidebarEl = mountSidebarRoot();
  const productsEl = mountProductsRoot();

  if (sidebarEl || productsEl) {
    initEmbedDomDefaults();

    const bridge = document.createElement('div');
    bridge.id = 'xyz-filter-embed-bridge';
    bridge.style.display = 'none';
    document.body.appendChild(bridge);

    const root = ReactDOM.createRoot(bridge);
    root.render(
      <React.StrictMode>
        <VolusionEmbedApp sidebarEl={sidebarEl} productsEl={productsEl} />
      </React.StrictMode>
    );
  }
}
