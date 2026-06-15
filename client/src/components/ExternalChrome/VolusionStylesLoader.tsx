import React, { useEffect } from 'react';

const VOLUSION_BASE = 'https://hxyrr-gdtbo.volusion.store';

const VOLUSION_STYLESHEETS = [
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  `${VOLUSION_BASE}/a/c/default.css`,
  `${VOLUSION_BASE}/v/vspfiles/templates/charmed2test/css/template.css`,
  `${VOLUSION_BASE}/v/vspfiles/templates/charmed2test/css/style-editor.css`,
  `${VOLUSION_BASE}/a/c/vnav.css`,
] as const;

const LINK_ATTR = 'data-volusion-external';

const VolusionStylesLoader: React.FC = () => {
  useEffect(() => {
    const injectedLinks: HTMLLinkElement[] = [];

    VOLUSION_STYLESHEETS.forEach((href) => {
      const existing = document.querySelector(
        `link[rel="stylesheet"][href="${href}"]`
      );
      if (existing) {
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute(LINK_ATTR, 'true');
      document.head.appendChild(link);
      injectedLinks.push(link);
    });

    return () => {
      injectedLinks.forEach((link) => {
        link.remove();
      });
    };
  }, []);

  return null;
};

export default VolusionStylesLoader;
