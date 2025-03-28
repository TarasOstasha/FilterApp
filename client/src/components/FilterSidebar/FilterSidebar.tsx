import React, { useState, useEffect } from 'react';
import ReactSlider from 'react-slider';
import styles from './FilterSidebar.module.scss';
import { fetchFilterSidebarData } from '../../api';

interface FilterField {
  id: number;
  field_name: string;
  field_type: 'checkbox' | 'range';
  allowed_values: any;
  sort_order: number;
}

interface FilterSidebarProps {
  onFilterChange: (filter: { field: string; value: any }) => void;
  selectedFilters: { [key: string]: string[] };
}

/**
 * parseRangeValue:
 * - If we have "0,100" => [0, 100]
 * - If we have "100" => [0, 100]
 * - If none, fallback to field.allowed_values or [0, 100000]
 */
const parseRangeValue = (
  field: FilterField,
  currentUnit: 'ft' | 'in' | undefined,
  selectedFilters: { [key: string]: string[] }
): [number, number] => {
  const fieldName = field.field_name;
  const rangeString = selectedFilters[fieldName]?.[0];

  if (rangeString) {
    const parts = rangeString.split(',');
    // Single number => treat as [0, singleVal]
    if (parts.length === 1) {
      const singleVal = parseFloat(parts[0]);
      if (isNaN(singleVal)) return [0, 100000];
      return [0, singleVal];
    }
    // Two or more => parse the first two
    const [minStr, maxStr] = parts;
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    return [isNaN(min) ? 0 : min, isNaN(max) ? 100000 : max];
  }

  // If no rangeString, fallback to field defaults
  if (
    typeof field.allowed_values === 'object' &&
    currentUnit &&
    field.allowed_values[currentUnit]
  ) {
    const { min, max } = field.allowed_values[currentUnit];
    return [min, max];
  } else if (Array.isArray(field.allowed_values)) {
    const min = parseFloat(field.allowed_values[0]) || 0;
    const max =
      parseFloat(field.allowed_values[field.allowed_values.length - 1]) || 100000;
    return [min, max];
  }

  return [0, 100000];
};

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

  // Checkbox changes
  function handleCheckboxChange(field: string, value: string) {
    onFilterChange({ field, value });
  }

  // When user changes the slider or typed inputs
  function handleRangeSliderChange(fieldName: string, sliderValue: number | number[]) {
    if (Array.isArray(sliderValue) && sliderValue.length === 2) {
      const [min, max] = sliderValue;
      const rangeStr = `${min},${max}`;
      onFilterChange({ field: fieldName, value: rangeStr });
    }
  }

  // Switch ft/in for fields that support it
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

  // Example: fetch & merge data
  useEffect(() => {
    const loadData = async () => {
      const response = await fetchFilterSidebarData();
      if (!response?.data) return;

      let data = response.data as FilterField[];

      // Merge "Display Width Ft" + "Display Width In"
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

      // Merge "Display Height Ft" + "Display Height In"
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

      // Sort
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

        // Render checkboxes
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
                        checked={
                          selectedFilters[fieldName]?.includes(val) || false
                        }
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

        // Render range slider
        if (field_type === 'range') {
          let currentUnit: 'ft' | 'in' | undefined;
          let hasUnitSwitch = false;

          if (
            typeof filterField.allowed_values === 'object' &&
            filterField.allowed_values.ft &&
            filterField.allowed_values.in
          ) {
            hasUnitSwitch = true;
            currentUnit = unitSelections[fieldName] || 'ft';
          }

          const [currentMin, currentMax] = parseRangeValue(
            filterField,
            currentUnit,
            selectedFilters
          );

          const sliderMin = hasUnitSwitch
            ? filterField.allowed_values[currentUnit!].min
            : parseFloat(filterField.allowed_values[0]);
          const sliderMax = hasUnitSwitch
            ? filterField.allowed_values[currentUnit!].max
            : parseFloat(
                filterField.allowed_values[filterField.allowed_values.length - 1]
              );

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
                    <span style={{ marginLeft: '8px' }}>
                      {currentUnit}
                    </span>
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
