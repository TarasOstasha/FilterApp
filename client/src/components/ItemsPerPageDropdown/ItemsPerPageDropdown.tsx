import React, { useState } from 'react';
import styles from './ItemsPerPageDropdown.module.scss';

const ItemsPerPageDropdown: React.FC = () => {
  const [itemsPerPage, setItemsPerPage] = useState(27);

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(event.target.value));
    // Logic to change items per page
  };

  return (
    <div className={styles['items-per-page-dropdown']}>
      <select
        id="itemsPerPageSelect"
        value={itemsPerPage}
        onChange={handleItemsPerPageChange}
        // className="form-select"
        className={`${styles['xyz-form-select'] || ''} form-select`} 
      >
        <option value={27}>27 per page</option>
        <option value={54}>54 per page</option>
        <option value={108}>108 per page</option>
        <option value={162}>162 per page</option>
        <option value={270}>270 per page</option>
      </select>
    </div>

  );
};

export default ItemsPerPageDropdown;
