import React, { useRef } from 'react';
import { EXTERNAL_FOOTER_HTML } from '../../external/volusionChromeHtml';
import { processVolusionFooterHtml } from '../../external/volusionAssets';
import { useVolusionChrome } from './VolusionChromeContext';
import ExternalFooterSkeleton from './ExternalFooterSkeleton';
import { useChromeReveal } from './useChromeReveal';

const footerHtml = processVolusionFooterHtml(EXTERNAL_FOOTER_HTML);

const ExternalFooter: React.FC = () => {
  const { stylesReady } = useVolusionChrome();
  const footerRef = useRef<HTMLDivElement>(null);
  const { contentReady, skeletonVisible } = useChromeReveal(stylesReady, footerRef);

  return (
    <div className="external-footer-shell">
      {skeletonVisible && (
        <div
          className={`external-chrome-skeleton-layer${
            contentReady ? ' external-chrome-skeleton-layer--hide' : ''
          }`}
        >
          <ExternalFooterSkeleton />
        </div>
      )}

      <div
        ref={footerRef}
        className={`external-footer-wrapper external-chrome-content${
          contentReady ? ' external-chrome-content--visible' : ''
        }`}
        dangerouslySetInnerHTML={{ __html: footerHtml }}
      />
    </div>
  );
};

export default ExternalFooter;
