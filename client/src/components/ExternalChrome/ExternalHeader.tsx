import React, { useRef } from 'react';
import { EXTERNAL_HEADER_HTML } from '../../external/volusionChromeHtml';
import { processVolusionHeaderHtml } from '../../external/volusionAssets';
import { useVolusionChrome } from './VolusionChromeContext';
import ExternalHeaderSkeleton from './ExternalHeaderSkeleton';
import { useChromeReveal } from './useChromeReveal';

const headerHtml = processVolusionHeaderHtml(EXTERNAL_HEADER_HTML);

const ExternalHeader: React.FC = () => {
  const { stylesReady } = useVolusionChrome();
  const headerRef = useRef<HTMLDivElement>(null);
  const { contentReady, skeletonVisible } = useChromeReveal(stylesReady, headerRef);

  return (
    <div className="external-header-shell">
      {skeletonVisible && (
        <div
          className={`external-chrome-skeleton-layer${
            contentReady ? ' external-chrome-skeleton-layer--hide' : ''
          }`}
        >
          <ExternalHeaderSkeleton />
        </div>
      )}

      <div
        ref={headerRef}
        className={`external-header-wrapper external-chrome-content${
          contentReady ? ' external-chrome-content--visible' : ''
        }`}
        dangerouslySetInnerHTML={{ __html: headerHtml }}
      />
    </div>
  );
};

export default ExternalHeader;
