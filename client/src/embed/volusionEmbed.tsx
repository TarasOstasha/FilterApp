import './volusionEmbed.scss';
import React from 'react';
import ReactDOM from 'react-dom/client';
import VolusionEmbedApp from './VolusionEmbedApp';
import {
  ensureCategoryPageAtTop,
  initEmbedDomDefaults,
  isVolusionCategoryPage,
  mountProductsRoot,
  mountSidebarRoot,
} from './volusionDom';

const API_BASE = process.env.REACT_APP_API_URL || `${window.location.origin}/api`;

async function isEmbedEnabled(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/embed-settings`);
    if (!response.ok) return true;
    const data = (await response.json()) as { enabled?: boolean };
    return data.enabled !== false;
  } catch {
    return true;
  }
}

async function initVolusionEmbed(): Promise<void> {
  if (!isVolusionCategoryPage()) return;

  const enabled = await isEmbedEnabled();
  if (!enabled) return;

  ensureCategoryPageAtTop();

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
  document.addEventListener('DOMContentLoaded', () => {
    void initVolusionEmbed();
  });
} else {
  void initVolusionEmbed();
}
