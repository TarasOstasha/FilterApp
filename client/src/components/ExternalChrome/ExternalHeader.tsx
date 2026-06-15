import React from 'react';
import { EXTERNAL_HEADER_HTML } from '../../external/volusionChromeHtml';
import { processVolusionHeaderHtml } from '../../external/volusionAssets';

const headerHtml = processVolusionHeaderHtml(EXTERNAL_HEADER_HTML);

const ExternalHeader: React.FC = () => (
  <div
    className="external-header-wrapper"
    dangerouslySetInnerHTML={{ __html: headerHtml }}
  />
);

export default ExternalHeader;
