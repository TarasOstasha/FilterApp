import React from 'react';
import styles from './PaginationControls.module.scss';


interface PaginationControlsProps {
  visibleProducts: number;
  totalProducts: number;
  onLoadMore: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoadingMore?: boolean;
  hasUsedLoadMore?: boolean;
}


// const PaginationControls: React.FC<PaginationControlsProps> = ({
//   currentPage,
//   totalPages,
//   onPageChange,
//   visibleProducts,
//   totalProducts,
//   onLoadMore,
// }) => {
//   const isNextDisabled = currentPage >= totalPages;
//   const isPrevDisabled = currentPage <= 1;

//   return (
//     <div className="pagination-controls">
//       <button
//         onClick={() => onPageChange(currentPage - 1)}
//         disabled={isPrevDisabled}
//       >
//         Previous
//       </button>
//       <span>
//         Page {currentPage} of {totalPages}
//       </span>
//       <button
//         onClick={() => onPageChange(currentPage + 1)}
//         disabled={isNextDisabled}
//       >
//         Next
//       </button>
//       {visibleProducts < totalProducts && (
//         <button onClick={onLoadMore}>Load More</button>
//       )}
//     </div>
//   );
// };

const PaginationControls: React.FC<PaginationControlsProps> = ({
  visibleProducts,
  totalProducts,
  onLoadMore,
  currentPage,
  totalPages,
  onPageChange,
  isLoadingMore = false,
  hasUsedLoadMore = false,
}) => {
  const showViewMore = hasUsedLoadMore
    ? visibleProducts < totalProducts
    : currentPage < totalPages;

  return (
    <div className="pagination-controls">
      {/* View More button */}
      {showViewMore && (
        <div className={styles['pagination-button']}>
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'View More Products'}
          </button>
        </div>
      )}

      {/* Page navigation */}
      <div className={styles['xyz-pagination-nav']}>
        {/* Hide Back button and page counter when "View More" has been used */}
        {!hasUsedLoadMore && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles['nav-button']}
            >
              Back
            </button>

            <span>{`Page ${currentPage} of ${totalPages}`}</span>
          </>
        )}

        {/* Always show Next button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || visibleProducts >= totalProducts}
          className={styles['nav-button']}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
