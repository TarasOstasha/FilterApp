import React from 'react';
import { EXTERNAL_FOOTER_HTML } from '../../external/volusionChromeHtml';
import { processVolusionFooterHtml } from '../../external/volusionAssets';

const footerHtml = processVolusionFooterHtml(EXTERNAL_FOOTER_HTML);

const ExternalFooter: React.FC = () => (
  <div
    className="external-footer-wrapper"
    dangerouslySetInnerHTML={{ __html: footerHtml }}
  />
);

export default ExternalFooter;
