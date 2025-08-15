import React, { useState } from 'react';
import styles from './PaginationControls.module.scss';


interface PaginationControlsProps {
  visibleProducts: number;
  totalProducts: number;
  onLoadMore: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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
}) => {
  return (
    <div className="pagination-controls">
      {/* <div className={styles['pagination-button']}>
        <button>Viev More Products</button>
      </div> */}
      {visibleProducts < totalProducts && (
        <div className={styles['pagination-button']}>
          {/* <button onClick={onLoadMore}>View More Products</button> */}
          {currentPage !== totalPages && (
            <button onClick={() => onPageChange(currentPage + 1)}>
              View More Products
            </button>
          )}
          <>{console.log(currentPage, totalPages)}</>
        </div>
      )}
      {/* <div>
        <span>visibleProducts {visibleProducts} and totalProducts {totalProducts}</span>
      </div> */}
      {/* <div className="pagination-info">
        <span>Page {currentPage} of {totalPages}</span>
      </div> */}
      <div className={styles['xyz-pagination-nav']}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn"
        >
          Previous
        </button>
        <span>{`Page ${currentPage} of ${totalPages}`}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || visibleProducts >= totalProducts}
          className="btn btn-default btn-xs btn_prevpage"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
