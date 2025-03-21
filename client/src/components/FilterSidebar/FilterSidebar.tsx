import React, { useState } from 'react';
import ReactSlider from 'react-slider';
import styles from './FilterSidebar.module.scss';

interface FilterField {
  id: number;
  field_name: string;
  //field_type: string;
  field_type: 'checkbox' | 'range';
  allowed_values: any; //string[];
}

interface FilterSidebarProps {
  onFilterChange: (filter: { field: string, value: any }) => void;
  selectedFilters: { [key: string]: string[] };
}

const filterFields: FilterField[] = [
  {
    id: 1,
    field_name: 'Product Price',
    field_type: 'range',
    allowed_values: ['0', '100000'],
  },
  {
    id: 2,
    field_name: 'Product Type',
    field_type: 'checkbox',
    allowed_values: [
      'Backdrop',
      'Booth Kit',
      'Backlit',
      'Counter',
      'Tower/Arches',
      'Banner Stand',
      'Tabletop',
      'Table Cloth',
      'Hanging Sign',
      'Outdoor (Tent, Flag)',
      'Digital Kiosk',
      'Turntable',
      'Flooring',
      'Case',
      'Lights',
      'Other Accessories',
    ],
  },
  {
    id: 3,
    field_name: 'Display Width',
    field_type: 'range',
    allowed_values: {
      ft: { min: 0.5, max: 40 },
      in: { min: 6, max: 480 },
    }
  },
  {
    id: 5,
    field_name: 'Display Height',
    field_type: 'range',
    allowed_values: {
      ft: { min: 0.5, max: 20 },
      in: { min: 6, max: 120 },
    }
  },
  {
    id: 7,
    field_name: 'Print Type',
    field_type: 'checkbox',
    allowed_values: ['Single-Sided', 'Double-Sided'],
  },
  {
    id: 8,
    field_name: 'Graphic Finish',
    field_type: 'checkbox',
    allowed_values: [
      'Pillow Case (Fabric)',
      'Velcro (Fabric)',
      'SEG (Fabric)',
      'Multi Panel (Fabric)',
      'Vinyl',
      'Rollable',
      'Outdoor',
    ],
  },
  {
    id: 9,
    field_name: 'Product Details',
    field_type: 'checkbox',
    allowed_values: ['Kit', 'Graphic Only', 'Hardware Only'],
  },
  {
    id: 10,
    field_name: 'Frame Hardware',
    field_type: 'checkbox',
    allowed_values: [
      'Popup',
      'Tubes',
      'SEG',
      'Truss',
      'Retractable',
      'Inflatable',
      'Tent',
      'Flag',
    ],
  },
  {
    id: 11,
    field_name: 'Display Shape',
    field_type: 'checkbox',
    allowed_values: ['Straight', 'Curved', 'Serpentine'],
  },
  {
    id: 12,
    field_name: 'Booth Size',
    field_type: 'checkbox',
    allowed_values: [
      '8 x 8 (or smaller)',
      '10 x 10',
      '10 x 20',
      '10 x 30',
      '20 x 20',
      'Larger',
    ],
  },
  {
    id: 13,
    field_name: 'Display Accessories',
    field_type: 'checkbox',
    allowed_values: ['TV Mount','Shelves','Garment Bars','Doors'],
  },
  {
    id: 14,
    field_name: 'Hanging Sign Shapes',
    field_type: 'checkbox',
    allowed_values: ['Circle (Round Tube)','Circle (Tapered)','Designer','Disc','Ellipse','Eye','Football','Funnel & Cone','Hexagon','Panel (Curved)','Panel (S-Curve)','Panel (Straight)','Pinwheel (Four-Sided)','Pinwheel (Three-Sided)','Pyramid',
      'Rectangle',
      'Square (Cube)',
      'Square (Curved Quad)',
      'Square (Quad)',
      'Square (Rounded)',
      'Square (Tapered)',
      'Triangle (Curved Trio)',
      'Triangle (Tapered)',
      'Triangle (Trio)',
    ],
  },
  {
    id: 15,
    field_name: 'Turntable Type',
    field_type: 'checkbox',
    allowed_values: [
      'Display',
      'Hanging',
      'Wall',
      'Outdoor',
      'Heavy Duty',
    ],
  },
  {
    id: 16,
    field_name: 'Motor Capacity',
    field_type: 'checkbox',
    allowed_values: ['0-5000 lb', '>5,000 lb'],
  },
  {
    id: 17,
    field_name: 'Flooring Type',
    field_type: 'checkbox',
    allowed_values: ['Carpet', 'Vinyl', 'Printed', 'Rolls', 'Tiles'],
  },
  {
    id: 18,
    field_name: 'Print Facility',
    field_type: 'checkbox',
    allowed_values: ['OR', 'WS', 'BE', 'MK', 'NV', 'NA', 'TR', 'CB', 'ES'],
  },
  {
    id: 19,
    field_name: 'Lighting',
    field_type: 'checkbox',
    allowed_values: ['Backlit', 'Not Backlit'],
  },
  {
    id: 20,
    field_name: 'Graphic Type',
    field_type: 'checkbox',
    allowed_values: ['Fabric', 'Vinyl', 'Rollable/Magnetic', 'Outdoor'],
  },

];


function parseRangeValue(
  field: FilterField,
  selectedFilters: { [key: string]: string[] }
): [number, number] {
  const rangeString = selectedFilters[field.field_name]?.[0]; // e.g. "0,98625"
  if (rangeString) {
    const [minStr, maxStr] = rangeString.split(',');
    return [parseFloat(minStr), parseFloat(maxStr)];
  } else {
    // Fallback to the default range from allowed_values
    if (Array.isArray(field.allowed_values)) {
      // e.g. ["0", "100000"]
      const min = parseFloat(field.allowed_values[0]) || 0;
      const max =
        parseFloat(field.allowed_values[field.allowed_values.length - 1]) || 100000;
      return [min, max];
    } else {
      // If you have a more complex structure for width/height, adapt accordingly
      // For simplicity, default to [0, 100000]
      return [0, 100000];
    }
  }
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  onFilterChange,
  selectedFilters,
}) => {
  console.log(JSON.stringify(selectedFilters), 'selectedFilters');

  /**
   * handleCheckboxChange: toggles a checkbox value in the parent
   */
  function handleCheckboxChange(field: string, value: string) {
    onFilterChange({ field, value });
  }

  /**
   * handleRangeSliderChange: user moves the slider => we build "min,max" and call onFilterChange
   */
  function handleRangeSliderChange(fieldName: string, sliderValue: number | number[]) {
    if (Array.isArray(sliderValue) && sliderValue.length === 2) {
      const [min, max] = sliderValue;
      const rangeStr = `${min},${max}`; 
      onFilterChange({ field: fieldName, value: rangeStr });
    }
  }

  return (
    <div className={styles.sidebar}>
      {filterFields.map((filterField) => {
        const { field_name, field_type } = filterField;

        // Checkboxes
        if (field_type === 'checkbox') {
          return (
            <div key={filterField.id} className={styles['filter-section']}>
              <h4>{field_name}</h4>
              <ul className={styles['filter-list']}>
                {filterField.allowed_values.map((val: string, index: number) => (
                  <li key={index} className={styles['filter-item']}>
                    <label>
                      <input
                        type="checkbox"
                        value={val}
                        checked={
                          selectedFilters[field_name]?.includes(val) || false
                        }
                        onChange={() => handleCheckboxChange(field_name, val)}
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

        // Range
        if (field_type === 'range') {
          const [currentMin, currentMax] = parseRangeValue(filterField, selectedFilters);

          return (
            <div key={filterField.id} className={styles['filter-section']}>
              <h4>{field_name}</h4>
              <div className={styles['range-slider-container']}>
                <ReactSlider
                  className={styles['range-slider']}
                  thumbClassName={styles['range-slider-thumb']}
                  trackClassName={styles['range-slider-track']}
                  min={
                    Array.isArray(filterField.allowed_values)
                      ? parseFloat(filterField.allowed_values[0])
                      : 0
                  }
                  max={
                    Array.isArray(filterField.allowed_values)
                      ? parseFloat(
                          filterField.allowed_values[
                            filterField.allowed_values.length - 1
                          ]
                        )
                      : 100000
                  }
                  step={1}
                  value={[currentMin, currentMax]} // controlled by parent's selectedFilters
                  onChange={(val) => handleRangeSliderChange(field_name, val)}
                  onAfterChange={(val) => {
                    handleRangeSliderChange(field_name, val);
                  }}
                  minDistance={1}
                  pearling
                  withTracks
                />
                <div className={styles['range-values']}>
                  <span>{currentMin}</span>
                  <span>{currentMax}</span>
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
