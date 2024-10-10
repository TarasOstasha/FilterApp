import React, { useState } from 'react';
import styles from './SortDropdown.module.scss';

const SortDropdown: React.FC = () => {
  const [sortOption, setSortOption] = useState('Price: Low to High');

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(event.target.value);
    // Logic to handle sorting
  };

  return (
    <div className={styles['sort-dropdown']}>
      <label htmlFor="sortSelect" className={styles.sortBy}>Sort By:</label>
      <select id="sortSelect" value={sortOption} onChange={handleSortChange} className={`${styles['xyz-form-select'] || ''} form-select`} >
        <option value="Price: Low to High">Price: Low to High</option>
        <option value="Price: High to Low">Price: High to Low</option>
        <option value="Most Popular">Most Popular</option>
        <option value="Title">Title</option>
        <option value="Manufacturer">Manufacturer</option>
        <option value="Newest">Newest</option>
        <option value="Oldest">Oldest</option>
      </select>
    </div>
  );
};

export default SortDropdown;
