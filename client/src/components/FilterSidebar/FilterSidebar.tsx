import React, { useState } from 'react';
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
    field_name: 'Product Type',
    field_type: 'checkbox',
    allowed_values: ['Display', 'Exhibit', 'Modular', 'Backlit', 'Digital Kiosk', 'Counter', 'Tabletop', 'Hanging Sign', 'Light', 'Case'],
  },
  {
    id: 2,
    field_name: 'Graphic Finish',
    field_type: 'checkbox',
    allowed_values: ['Fabric - Pillow Case', 'Fabric - Velcro', 'Rollable', 'SEG'],
  },
  {
    id: 3,
    field_name: 'Frame Type',
    field_type: 'checkbox',
    allowed_values: ['Popup', 'Truss', 'Tubular'],
  },
  {
    id: 4,
    field_name: 'Display Shape',
    field_type: 'checkbox',
    allowed_values: ['Straight', 'Curved', 'Rectangular', 'Square', 'Tiered', 'Triangle', 'Ring'],
  },
  {
    id: 5,
    field_name: 'Display Height',
    field_type: 'checkbox',
    allowed_values: ['3ft Tall', '5ft Tall', '8ft Tall', '10ft Tall'],
  },
  {
    id: 6,
    field_name: 'Display Width',
    field_type: 'checkbox',
    allowed_values: ['3ft Wide', '5ft Wide', '8ft Wide', '8-20ft Wide', '10ft Wide', '12ft Wide', '14ft Wide', '15ft Wide'],
  }
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
