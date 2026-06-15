import React, { useEffect } from 'react';
import { useVolusionChrome } from './VolusionChromeContext';

const VOLUSION_BASE = 'https://hxyrr-gdtbo.volusion.store';

const VOLUSION_STYLESHEETS = [
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  `${VOLUSION_BASE}/a/c/default.css`,
  `${VOLUSION_BASE}/v/vspfiles/templates/charmed2test/css/template.css`,
  `${VOLUSION_BASE}/v/vspfiles/templates/charmed2test/css/style-editor.css`,
  `${VOLUSION_BASE}/a/c/vnav.css`,
] as const;

const LINK_ATTR = 'data-volusion-external';

const loadStylesheet = (href: string): Promise<void> =>
  new Promise((resolve) => {
    const existing = document.querySelector(
      `link[rel="stylesheet"][href="${href}"]`
    ) as HTMLLinkElement | null;

    if (existing) {
      if (existing.sheet) {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => resolve(), { once: true });
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(LINK_ATTR, 'true');
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.appendChild(link);
  });

const VolusionStylesLoader: React.FC = () => {
  const { setStylesReady } = useVolusionChrome();

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      await Promise.all(VOLUSION_STYLESHEETS.map(loadStylesheet));

      if (!cancelled) {
        setStylesReady(true);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
      setStylesReady(false);
      document
        .querySelectorAll(`link[${LINK_ATTR}="true"]`)
        .forEach((link) => link.remove());
    };
  }, [setStylesReady]);

  return null;
};

export default VolusionStylesLoader;
