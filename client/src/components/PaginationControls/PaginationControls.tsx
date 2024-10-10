import React, { useState } from 'react';
import styles from './PaginationControls.module.scss';

const PaginationControls: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10; // Replace with actual total pages

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="pagination-controls">
      <div className={styles['pagination-button']}>
        <button>Viev More Products</button>
      </div>
      {/* <div className="pagination-info">
        <span>Page {currentPage} of {totalPages}</span>
      </div> */}
      <div className={styles['xyz-pagination-nav']}>
        <button className="btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </button>
        <button className="btn btn-default btn-xs btn_prevpage" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
