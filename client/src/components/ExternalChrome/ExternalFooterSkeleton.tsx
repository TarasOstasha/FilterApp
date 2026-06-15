import React from 'react';

const linkLines = [5, 4, 4];

const ExternalFooterSkeleton: React.FC = () => (
  <div className="external-footer-skeleton" aria-hidden="true">
    <div className="external-footer-skeleton__top">
      <div className="container">
        <div className="external-footer-skeleton__grid">
          {linkLines.map((lineCount, columnIndex) => (
            <div key={columnIndex} className="external-footer-skeleton__column">
              <div className="skeleton-shimmer skeleton-shimmer--footer external-footer-skeleton__title" />
              {Array.from({ length: lineCount }).map((_, lineIndex) => (
                <div
                  key={lineIndex}
                  className="skeleton-shimmer skeleton-shimmer--footer external-footer-skeleton__line"
                />
              ))}
            </div>
          ))}

          <div className="external-footer-skeleton__column external-footer-skeleton__column--newsletter">
            <div className="skeleton-shimmer skeleton-shimmer--footer external-footer-skeleton__title" />
            <div className="skeleton-shimmer skeleton-shimmer--footer external-footer-skeleton__input" />
            <div className="skeleton-shimmer skeleton-shimmer--footer external-footer-skeleton__button" />
            <div className="external-footer-skeleton__social">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="skeleton-shimmer skeleton-shimmer--footer external-footer-skeleton__social-icon"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="external-footer-skeleton__bottom">
      <div className="container">
        <div className="skeleton-shimmer skeleton-shimmer--footer external-footer-skeleton__copyright" />
      </div>
    </div>
  </div>
);

export default ExternalFooterSkeleton;
