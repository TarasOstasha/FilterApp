import React from 'react';
import styles from './ActiveFilters.module.scss';
import {
  DimensionUnit,
  formatDimensionRangeChipLabel,
} from '../../utils/dimensionUnits';

const DIMENSION_CHIP_FIELDS = new Set(['Display Width', 'Display Height']);

export type DimensionUnitSelections = {
  'Display Width'?: DimensionUnit;
  'Display Height'?: DimensionUnit;
};

interface ActiveFiltersProps {
  selectedFilters: Record<string, string[] | undefined>;
  onRemove: (filter: { field: string; value: string }) => void;
  onClearAll: () => void;
  /** Current sidebar unit per dimension field (display only). */
  dimensionUnits?: DimensionUnitSelections;
}

function chipLabel(
  field: string,
  value: string,
  dimensionUnits?: DimensionUnitSelections
): string {
  if (DIMENSION_CHIP_FIELDS.has(field)) {
    const unit = dimensionUnits?.[field as keyof DimensionUnitSelections] || 'in';
    return formatDimensionRangeChipLabel(field, value, unit);
  }
  return `${field}: ${value}`;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  selectedFilters,
  onRemove,
  onClearAll,
  dimensionUnits,
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
      {chips.map(({ field, value }) => {
        const label = chipLabel(field, value, dimensionUnits);
        return (
          <span key={`${field}:${value}`} className={styles.chip}>
            {label}
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${label}`}
              onClick={() => onRemove({ field, value })}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
};

export default ActiveFilters;
