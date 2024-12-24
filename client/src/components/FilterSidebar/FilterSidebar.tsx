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
    allowed_values: ['TV Mount', 'Shelves', 'Garment Bars', 'Doors'],
  },
  {
    id: 14,
    field_name: 'Hanging Sign Shapes',
    field_type: 'checkbox',
    allowed_values: [
      'Circle (Round Tube)',
      'Circle (Tapered)',
      'Designer',
      'Disc',
      'Ellipse',
      'Eye',
      'Football',
      'Funnel & Cone',
      'Hexagon',
      'Panel (Curved)',
      'Panel (S-Curve)',
      'Panel (Straight)',
      'Pinwheel (Four-Sided)',
      'Pinwheel (Three-Sided)',
      'Pyramid',
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

const FilterSidebar: React.FC<FilterSidebarProps> = ({ onFilterChange, selectedFilters }) => {

  //const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
  const [rangeValues, setRangeValues] = useState<{ [key: string]: [number, number] }>({});
  // const [displayWidthUnit, setDisplayWidthUnit] = useState<'ft' | 'in'>('ft');
  // const [displayHeightUnit, setDisplayHeightUnit] = useState<'ft' | 'in'>('ft');
  const [unitSelections, setUnitSelections] = useState<{ [fieldName: string]: 'ft' | 'in' }>({
    'Display Width': 'ft',
    'Display Height': 'ft',
  });


  // Handle checkbox filter changes
  // const handleCheckboxChange = (field: string, value: string) => {
  //   setSelectedFilters((prev) => {
  //     const values = prev[field] || [];
  //     const newValues = values.includes(value)
  //       ? values.filter((v) => v !== value)
  //       : [...values, value];

  //     onFilterChange({ field, value: newValues });

  //     return { ...prev, [field]: newValues };
  //   });
  // };
  function handleCheckboxChange(field: string, value: string) {
    onFilterChange({ field, value });
  }
  

  // Handle range filter changes
  const handleRangeChange = (field: string, values: [number, number]) => {
    console.log(values);
    setRangeValues((prev) => ({
      ...prev,
      [field]: values,
    }));

    const unit = unitSelections[field] || 'ft';
    onFilterChange({ field, value: { values, unit } });
  };

  // Handle unit switch
  const handleUnitSwitch = (fieldName: string) => {
    setUnitSelections((prevUnits) => {
      const currentUnit = prevUnits[fieldName];
      const newUnit = currentUnit === 'ft' ? 'in' : 'ft';
      console.log(unitSelections);
      // Reset the range values when unit changes
      const field = filterFields.find((f) => f.field_name === fieldName);
      if (field) {
        const newMin = field.allowed_values[newUnit].min;
        const newMax = field.allowed_values[newUnit].max;

        setRangeValues((prev) => ({
          ...prev,
          [fieldName]: [newMin, newMax],
        }));

        // Optionally, notify parent component of the range change
        onFilterChange({
          field: fieldName,
          value: { values: [newMin, newMax], unit: newUnit },
        });
      }

      return {
        ...prevUnits,
        [fieldName]: newUnit,
      };
    });
  };


  return (
    <div className={styles.sidebar}>
      {filterFields.map((filterField) => (
        
        <div key={filterField.id} className={styles['filter-section']}>
          <h4>{filterField.field_name}</h4>

          {filterField.field_type === 'range' && filterField.allowed_values.ft && (
            <div className={styles['unit-switcher']}>
              <button onClick={() => handleUnitSwitch(filterField.field_name)}>
                Switch to {unitSelections[filterField.field_name] === 'ft' ? 'inches' : 'feet'}
              </button>
            </div>
          )}


          {filterField.field_type === 'checkbox' ? (
            <ul className={styles['filter-list']}>
              {filterField.allowed_values.map((value: string, index: number) => (
                <li key={index} className={styles['filter-item']}>
                  <label>
                    <input
                      type="checkbox"
                      value={value}
                      checked={
                        selectedFilters[filterField.field_name]?.includes(value) || false
                      }
                      onChange={() => handleCheckboxChange(filterField.field_name, value)}
                      className={styles['sidebar-checkbox-input']}
                    />
                    {value}
                  </label>
                </li>
              ))}
            </ul>
          ) : filterField.field_type === 'range' ? (
            <div className={styles['range-slider-container']}>
              <ReactSlider
                className={styles['range-slider']}
                thumbClassName={styles['range-slider-thumb']}
                trackClassName={styles['range-slider-track']}
                min={
                  filterField.allowed_values[unitSelections[filterField.field_name]]?.min ||
                  parseFloat(filterField.allowed_values[0])
                }
                max={
                  filterField.allowed_values[unitSelections[filterField.field_name]]?.max ||
                  parseFloat(filterField.allowed_values[filterField.allowed_values.length - 1])
                }
                step={1}
                value={
                  rangeValues[filterField.field_name] ||
                  [
                    filterField.allowed_values[unitSelections[filterField.field_name]]?.min ||
                    parseFloat(filterField.allowed_values[0]),
                    filterField.allowed_values[unitSelections[filterField.field_name]]?.max ||
                    parseFloat(filterField.allowed_values[filterField.allowed_values.length - 1]),
                  ]
                }
                onChange={(value: number | number[]) => {
                  if (Array.isArray(value) && value.length === 2) {
                    handleRangeChange(filterField.field_name, [value[0], value[1]]);
                  }
                }}
                minDistance={1}
                pearling
                withTracks
              // renderThumb={(props, state) => (
              //   <div {...props}>{state.valueNow}</div>
              // )}
              />
              {/* <div className={styles['range-values']}>
                <span>
                  {rangeValues[filterField.field_name]?.[0] ||
                    filterField.allowed_values[0]}
                </span>
                <span>
                  {rangeValues[filterField.field_name]?.[1] ||
                    filterField.allowed_values[filterField.allowed_values.length - 1]}
                </span>
              </div> */}
              <div className={styles['range-values']}>
                <span>
                  {rangeValues[filterField.field_name]?.[0] ||
                    filterField.allowed_values[unitSelections[filterField.field_name]]?.min ||
                    filterField.allowed_values[0]}
                    {unitSelections[filterField.field_name]}
                </span>
                <span>
                  {rangeValues[filterField.field_name]?.[1] ||
                    filterField.allowed_values[unitSelections[filterField.field_name]]?.max ||
                    filterField.allowed_values[
                    filterField.allowed_values.length - 1
                    ]}
                    {unitSelections[filterField.field_name]}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default FilterSidebar;
