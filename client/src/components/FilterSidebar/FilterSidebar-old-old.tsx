import React, { useState } from 'react';
import ReactSlider from 'react-slider';
import styles from './FilterSidebar.module.scss';

interface FilterField {
  id: number;
  field_name: string;
  field_type: string;
  allowed_values: string[];
}

interface FilterSidebarProps {
  onFilterChange: (filter: { field: string, value: string }) => void;
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
    field_name: 'Display Width Ft',
    field_type: 'range',
    allowed_values: [
      '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5',
      '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10',
      '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14', '14.5', '15',
      '15.5', '16', '16.5', '17', '17.5', '18', '18.5', '19', '19.5', '20',
      '20.5', '21', '21.5', '22', '22.5', '23', '23.5', '24', '24.5', '25',
      '25.5', '26', '26.5', '27', '27.5', '28', '28.5', '29', '29.5', '30',
      '30.5', '31', '31.5', '32', '32.5', '33', '33.5', '34', '34.5', '35',
      '35.5', '36', '36.5', '37', '37.5', '38', '38.5', '39', '39.5', '40']
  },
  {
    id: 4,
    field_name: 'Display Width In',
    field_type: 'range',
    allowed_values: Array.from({ length: 240 }, (_, i) => (i + 1).toString()),
  },
  {
    id: 5,
    field_name: 'Display Height Ft',
    field_type: 'range',
    allowed_values: [
      '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5',
      '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10',
      '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14', '14.5', '15',
      '15.5', '16', '16.5', '17', '17.5', '18', '18.5', '19', '19.5', '20'
    ],
  },
  {
    id: 6,
    field_name: 'Display Height In',
    field_type: 'range',
    allowed_values: Array.from({ length: 240 }, (_, i) => (i + 1).toString()),
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

const FilterSidebar: React.FC<FilterSidebarProps> = ({ onFilterChange }) => {
  const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});

  // Toggle filter selections
  const handleFilterChange = (field: string, value: string) => {
    setSelectedFilters((prev) => {
      const values = prev[field] || [];
      const newValues = values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value];
      onFilterChange({ field, value });
      return { ...prev, [field]: newValues };
    });
  };

  return (
    <div className={styles.sidebar}>
      {/* <h3>Filters</h3> */}
      {filterFields.map((filterField) => (
        <div key={filterField.id} className={styles['filter-section']}>
          <h4>{filterField.field_name}</h4>
          <ul className={styles['filter-list']}>
            {filterField.allowed_values.map((value, index) => (
              <li key={index} className={styles['filter-item']}>
                <label>
                  <input
                    type={filterField.field_type}
                    value={value}
                    checked={selectedFilters[filterField.field_name]?.includes(value) || false}
                    onChange={() => handleFilterChange(filterField.field_name, value)}
                    className={styles['sidebar-checkbox-input']}
                  />
                  {value}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default FilterSidebar;
