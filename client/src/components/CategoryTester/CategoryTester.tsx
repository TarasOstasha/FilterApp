import React, { useState, useEffect } from 'react';
import styles from './CategoryTester.module.scss';

interface CategoryTesterProps {
  onCategoryChange: () => void;
  OnFilterSideBarReload: () => void;
}

const CategoryTester: React.FC<CategoryTesterProps> = ({ onCategoryChange, OnFilterSideBarReload }) => {
  const [categoryId, setCategoryId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Load saved test category ID from localStorage
    const savedCategoryId = localStorage.getItem('testCategoryId');
    if (savedCategoryId) {
      setCategoryId(savedCategoryId);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoryId(e.target.value);
  };

  const handleApply = () => {
    if (categoryId.trim()) {
      localStorage.setItem('testCategoryId', categoryId.trim());
    } else {
      localStorage.removeItem('testCategoryId');
    }
    onCategoryChange();
    // add clear filter
    OnFilterSideBarReload();
  };

  const handleClear = () => {
    setCategoryId('');
    localStorage.removeItem('testCategoryId');
    onCategoryChange();
    // add clear filter
    OnFilterSideBarReload();
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const hostname = window.location.hostname;
  const isLocal =
    process.env.NODE_ENV === 'development' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (!isLocal) {
    return null;
  }

  return (
    <div className={styles.categoryTester}>
      <button 
        className={styles.toggleButton} 
        onClick={toggleVisibility}
        title="Toggle Category Tester"
      >
        🧪 Test Category
      </button>
      
      {isVisible && (
        <div className={styles.testerPanel}>
          <h4>Category ID Tester</h4>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={categoryId}
              onChange={handleInputChange}
              placeholder="Enter category ID (e.g., 177)"
              className={styles.input}
            />
            <button onClick={handleApply} className={styles.applyButton}>
              Apply
            </button>
            <button onClick={handleClear} className={styles.clearButton}>
              Clear
            </button>
          </div>
          <p className={styles.hint}>
            Current: {localStorage.getItem('testCategoryId') || 'From URL or default '}
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryTester;
