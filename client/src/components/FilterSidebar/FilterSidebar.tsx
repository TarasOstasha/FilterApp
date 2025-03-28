import React, { useState, useEffect } from 'react';
import ReactSlider from 'react-slider';
import styles from './FilterSidebar.module.scss';
import { fetchFilterSidebarData } from '../../api';

interface FilterField {
  id: number;
  field_name: string;
  field_type: 'checkbox' | 'range';
  allowed_values: any; // For "checkbox" => string[]; for "range" => object or array
  sort_order: number;
}

interface FilterSidebarProps {
  onFilterChange: (filter: { field: string; value: any }) => void;
  selectedFilters: { [key: string]: string[] };
}

/**
 * parseRangeValue:
 * 1) If the user param is a single number (e.g. "5000"), interpret as [0, 5000].
 * 2) If it's two numbers ("0,5000"), parse both.
 *    - If min > max, swap them so the slider doesn't break.
 * 3) Otherwise, fallback to field.allowed_values or [0,100000].
 */
function parseRangeValue(
  field: FilterField,
  currentUnit: 'ft' | 'in' | undefined,
  selectedFilters: { [key: string]: string[] }
): [number, number] {
  const fieldName = field.field_name;
  const rangeString = selectedFilters[fieldName]?.[0]; // e.g. "0,5000" or "5000"
  console.log('DEBUG parseRangeValue:', {
    fieldName,
    rangeString
  });
  if (rangeString) {
    if (!rangeString.includes(',')) {
      // Single value => [0, singleVal]
      const singleVal = parseFloat(rangeString);
      if (!isNaN(singleVal)) {
        return [0, singleVal];
      }
      return [0, 100000];
    } else {
      // Two values => parse them
      const parts = rangeString.split(',');
      let min = parseFloat(parts[0]);
      let max = parseFloat(parts[1]);
      if (isNaN(min)) min = 0;
      if (isNaN(max)) max = 100000;

      // Optional: if reversed, swap
      if (min > max) {
        [min, max] = [max, min];
      }
      return [min, max];
    }
  }

  // If there's no rangeString, fallback:
  // 1) If we have ft/in for this field
  if (
    typeof field.allowed_values === 'object' &&
    currentUnit &&
    field.allowed_values[currentUnit]
  ) {
    const { min, max } = field.allowed_values[currentUnit];
    return [min, max];
  }

  // 2) If it's "Product Price," do a wide default range
  if (field.field_name === 'Product Price') {
    return [0, 100000];
  }

  // 3) If it's a range with an array, use the first/last items
  if (Array.isArray(field.allowed_values)) {
    const arrMin = parseFloat(field.allowed_values[0]) || 0;
    const arrMax =
      parseFloat(field.allowed_values[field.allowed_values.length - 1]) || 100000;
    return [arrMin, arrMax];
  }

  // Final fallback
  return [0, 100000];
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  onFilterChange,
  selectedFilters,
}) => {
  const [filterFields, setFilterFields] = useState<FilterField[]>([]);
  const [unitSelections, setUnitSelections] = useState<{
    [fieldName: string]: 'ft' | 'in';
  }>({
    'Display Width': 'ft',
    'Display Height': 'ft',
  });

  /**
   * handleCheckboxChange:
   * - Toggle a value for a checkbox field
   */
  function handleCheckboxChange(field: string, value: string) {
    onFilterChange({ field, value });
  }

  /**
   * handleRangeSliderChange:
   * - Called when the user moves the slider or types in a numeric input
   * - We pass a "min,max" string to the parent
   */
  function handleRangeSliderChange(fieldName: string, sliderValue: number | number[]) {
    if (Array.isArray(sliderValue) && sliderValue.length === 2) {
      const [min, max] = sliderValue;
      const rangeStr = `${min},${max}`;
      onFilterChange({ field: fieldName, value: rangeStr });
    }
  }

  /**
   * handleUnitSwitch:
   * - Switch between ft and in for fields that have both
   * - Also reset the range to the default for the new unit
   */
  function handleUnitSwitch(fieldName: string) {
    setUnitSelections((prev) => {
      const nextUnit = prev[fieldName] === 'ft' ? 'in' : 'ft';
      const fieldDef = filterFields.find((f) => f.field_name === fieldName);
      if (fieldDef && fieldDef.allowed_values[nextUnit]) {
        const { min, max } = fieldDef.allowed_values[nextUnit];
        const rangeStr = `${min},${max}`;
        onFilterChange({ field: fieldName, value: rangeStr });
      }
      return { ...prev, [fieldName]: nextUnit };
    });
  }

  /**
   * On mount, fetch filter data and merge ft/in fields for width/height
   */
  useEffect(() => {
    const loadData = async () => {
      const response = await fetchFilterSidebarData();
      if (!response?.data) return;

      let data = response.data as FilterField[];

      // Merge "Display Width Ft" and "Display Width In"
      const widthFt = data.find((f) => f.field_name === 'Display Width Ft');
      const widthIn = data.find((f) => f.field_name === 'Display Width In');
      if (widthFt && widthIn) {
        const combinedWidth: FilterField = {
          id: 9991,
          field_name: 'Display Width',
          field_type: 'range',
          allowed_values: {
            ft: {
              min: parseFloat(widthFt.allowed_values[0]),
              max: parseFloat(
                widthFt.allowed_values[widthFt.allowed_values.length - 1]
              ),
            },
            in: {
              min: parseFloat(widthIn.allowed_values[0]),
              max: parseFloat(
                widthIn.allowed_values[widthIn.allowed_values.length - 1]
              ),
            },
          },
          sort_order: widthFt.sort_order,
        };

        data = data.filter(
          (f) => !['Display Width Ft', 'Display Width In'].includes(f.field_name)
        );
        data.push(combinedWidth);
      }

      // Merge "Display Height Ft" and "Display Height In"
      const heightFt = data.find((f) => f.field_name === 'Display Height Ft');
      const heightIn = data.find((f) => f.field_name === 'Display Height In');
      if (heightFt && heightIn) {
        const combinedHeight: FilterField = {
          id: 9992,
          field_name: 'Display Height',
          field_type: 'range',
          allowed_values: {
            ft: {
              min: parseFloat(heightFt.allowed_values[0]),
              max: parseFloat(
                heightFt.allowed_values[heightFt.allowed_values.length - 1]
              ),
            },
            in: {
              min: parseFloat(heightIn.allowed_values[0]),
              max: parseFloat(
                heightIn.allowed_values[heightIn.allowed_values.length - 1]
              ),
            },
          },
          sort_order: heightFt.sort_order,
        };

        data = data.filter(
          (f) => !['Display Height Ft', 'Display Height In'].includes(f.field_name)
        );
        data.push(combinedHeight);
      }

      // Sort by sort_order so the sidebar fields appear in the intended sequence
      data.sort((a, b) => a.sort_order - b.sort_order);

      setFilterFields(data);
    };

    loadData();
  }, []);

  return (
    <div className={styles.sidebar}>
      {filterFields.map((filterField) => {
        const fieldName = filterField.field_name;
        const { field_type } = filterField;

        // 1) Checkbox fields
        if (field_type === 'checkbox') {
          return (
            <div key={filterField.id} className={styles['filter-section']}>
              <h4>{fieldName}</h4>
              <ul className={styles['filter-list']}>
                {filterField.allowed_values.map((val: string, idx: number) => (
                  <li key={idx} className={styles['filter-item']}>
                    <label>
                      <input
                        type="checkbox"
                        value={val}
                        checked={selectedFilters[fieldName]?.includes(val) || false}
                        onChange={() => handleCheckboxChange(fieldName, val)}
                        className={styles['sidebar-checkbox-input']}
                      />
                      {val}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // 2) Range fields
        if (field_type === 'range') {
          let currentUnit: 'ft' | 'in' | undefined;
          let hasUnitSwitch = false;

          // If allowed_values has both ft & in, user can switch
          if (
            typeof filterField.allowed_values === 'object' &&
            filterField.allowed_values.ft &&
            filterField.allowed_values.in
          ) {
            hasUnitSwitch = true;
            currentUnit = unitSelections[fieldName] || 'ft';
          }

          // Parse the currently selected range from the parent's selectedFilters
          const [currentMin, currentMax] = parseRangeValue(
            filterField,
            currentUnit,
            selectedFilters
          );

          // Decide the overall slider bounds
          let sliderMin: number;
          let sliderMax: number;
          const isProductPrice = fieldName === 'Product Price';

          if (isProductPrice) {
            // Product Price => 0..100000
            sliderMin = 0;
            sliderMax = 100000;
          } else if (hasUnitSwitch) {
            sliderMin = filterField.allowed_values[currentUnit!].min;
            sliderMax = filterField.allowed_values[currentUnit!].max;
          } else if (Array.isArray(filterField.allowed_values)) {
            sliderMin = parseFloat(filterField.allowed_values[0]) || 0;
            sliderMax =
              parseFloat(
                filterField.allowed_values[filterField.allowed_values.length - 1]
              ) || 100000;
          } else {
            // fallback
            sliderMin = 0;
            sliderMax = 100000;
          }

          return (
            <div key={filterField.id} className={styles['filter-section']}>
              <h4>{fieldName}</h4>

              {hasUnitSwitch && (
                <div className={styles['unit-switcher']}>
                  <button onClick={() => handleUnitSwitch(fieldName)}>
                    Switch to {currentUnit === 'ft' ? 'inches' : 'feet'}
                  </button>
                </div>
              )}

              <div className={styles['range-slider-container']}>
                <ReactSlider
                  className={styles['range-slider']}
                  thumbClassName={styles['range-slider-thumb']}
                  trackClassName={styles['range-slider-track']}
                  min={sliderMin}
                  max={sliderMax}
                  step={1}
                  value={[currentMin, currentMax]}
                  onChange={(val) => handleRangeSliderChange(fieldName, val)}
                  onAfterChange={(val) => handleRangeSliderChange(fieldName, val)}
                  minDistance={1}
                  pearling
                  withTracks
                />

                {/* Numeric inputs for user-typed min/max */}
                <div className={styles['range-values']}>
                  <input
                    type="number"
                    value={currentMin}
                    onChange={(e) => {
                      const typedMin = parseFloat(e.target.value);
                      if (!isNaN(typedMin)) {
                        handleRangeSliderChange(fieldName, [typedMin, currentMax]);
                      }
                    }}
                    style={{ width: '80px', marginRight: '8px' }}
                  />
                  <input
                    type="number"
                    value={currentMax}
                    onChange={(e) => {
                      const typedMax = parseFloat(e.target.value);
                      if (!isNaN(typedMax)) {
                        handleRangeSliderChange(fieldName, [currentMin, typedMax]);
                      }
                    }}
                    style={{ width: '80px' }}
                  />
                  {hasUnitSwitch && (
                    <span style={{ marginLeft: '8px' }}>{currentUnit}</span>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default FilterSidebar;
