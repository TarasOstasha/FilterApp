import React from 'react';
import styles from './FilterSidebar.module.scss';

interface FilterSidebarProps {
  filters: string[];
  onFilterChange: (selectedFilter: string) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFilterChange }) => {
  return (
    <div className={styles.sidebar}>
      <h2>Filters</h2>
      <ul>
        {filters.map((filter, index) => (
          <li key={index} onClick={() => onFilterChange(filter)} className={styles.filterItem}>
            {filter}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FilterSidebar;
