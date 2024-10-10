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
          <button onClick={onLoadMore}>View More Products</button>
        </div>
      )}
      {/* <div className="pagination-info">
        <span>Page {currentPage} of {totalPages}</span>
      </div> */}
      <div className={styles['xyz-pagination-nav']}>
        
        {/* <button className="btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </button>
        <button className="btn btn-default btn-xs btn_prevpage" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </button> */}
        {/* <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn" 
        >
          Previous
        </button>
        <span>{`Page ${currentPage} of ${totalPages}`}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-default btn-xs btn_prevpage"
        >
          Next
        </button> */}
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
