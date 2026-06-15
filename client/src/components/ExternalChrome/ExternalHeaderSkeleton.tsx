import React from 'react';

const ExternalHeaderSkeleton: React.FC = () => (
  <div className="external-header-skeleton" aria-hidden="true">
    <div className="external-header-skeleton__top">
      <div className="container">
        <div className="external-header-skeleton__top-row">
          <div className="skeleton-shimmer external-header-skeleton__contact" />
          <div className="skeleton-shimmer external-header-skeleton__search" />
          <div className="external-header-skeleton__actions">
            <div className="skeleton-shimmer external-header-skeleton__action" />
            <div className="skeleton-shimmer external-header-skeleton__action" />
          </div>
        </div>
      </div>
    </div>

    <div className="external-header-skeleton__middle">
      <div className="container">
        <div className="external-header-skeleton__middle-row">
          <div className="skeleton-shimmer external-header-skeleton__logo" />
          <div className="skeleton-shimmer external-header-skeleton__upload" />
        </div>
      </div>
    </div>

    <div className="external-header-skeleton__nav hidden-xs hidden-sm">
      <div className="container">
        <div className="external-header-skeleton__nav-row">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="skeleton-shimmer external-header-skeleton__nav-item"
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ExternalHeaderSkeleton;
