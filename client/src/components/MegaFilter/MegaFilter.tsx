import React, { useEffect, useRef } from 'react';
import styles from './MegaFilter.module.scss';

interface MegaFilterProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  autoFocus?: boolean;
}

/**
 * Search input only — product results come from the shared /products pipeline (ProductList).
 */
const MegaFilter: React.FC<MegaFilterProps> = ({
  value,
  onChange,
  onClear,
  autoFocus = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus || !inputRef.current || value.trim() === '') return;
    inputRef.current.focus();
  }, [autoFocus, value]);

  return (
    <div>
      <div className={styles.searchContainer}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.searchInput}
        />
        {value ? (
          <button
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            className={styles.clearSearchButton}
            aria-label="Clear search"
            type="button"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default MegaFilter;
