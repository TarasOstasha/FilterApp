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

function initVolusionEmbed(): void {
  if (!isVolusionCategoryPage()) return;

  const sidebarEl = mountSidebarRoot();
  const productsEl = mountProductsRoot();

  if (!sidebarEl && !productsEl) return;

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVolusionEmbed);
} else {
  initVolusionEmbed();
}
