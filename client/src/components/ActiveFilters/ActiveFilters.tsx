import React from 'react';
import styles from './ActiveFilters.module.scss';

interface ActiveFiltersProps {
  selectedFilters: Record<string, string[] | undefined>;
  onRemove: (filter: { field: string; value: string }) => void;
  onClearAll: () => void;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  selectedFilters,
  onRemove,
  onClearAll,
}) => {
  const chips = Object.entries(selectedFilters).flatMap(([field, values]) =>
    (values ?? []).filter(Boolean).map((value) => ({ field, value }))
  );

  if (chips.length === 0) return null;

  return (
    <div className={styles.row} aria-label="Active filters">
      <button type="button" className={styles.clearAll} onClick={onClearAll}>
        Clear All
      </button>
      {chips.map(({ field, value }) => (
        <span key={`${field}:${value}`} className={styles.chip}>
          {field}: {value}
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove ${field}: ${value}`}
            onClick={() => onRemove({ field, value })}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
};

export default ActiveFilters;
