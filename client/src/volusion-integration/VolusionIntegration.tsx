import React, { useState, useEffect, useCallback } from 'react';
import FilterSidebar from '../components/FilterSidebar/FilterSidebar';
import ProductList from '../components/ProductList/ProductList';
import PaginationControls from '../components/PaginationControls/PaginationControls';
import SortDropdown from '../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import { fetchProductsFromAPI } from '../api';
import { getCategoryIdFromPath } from '../utils/helpers';
import styles from './VolusionIntegration.module.scss';

interface Product {
  id: number;
  product_name: string;
  product_code: string;
  product_link: string;
  product_img_link: string;
  product_price: number | null;
}

interface VolusionIntegrationProps {
  apiBaseUrl?: string;
  categoryId?: string;
}

const VolusionIntegration: React.FC<VolusionIntegrationProps> = ({ 
  apiBaseUrl,
  categoryId 
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(27);
  const [sortBy, setSortBy] = useState('');
  
  // Track if any filters are active
  const hasActiveFilters = Object.keys(selectedFilters).length > 0;

  // Extract category ID from URL if not provided
  const catId = categoryId || getCategoryIdFromPath();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add filters
      Object.entries(selectedFilters).forEach(([field, values]) => {
        if (values && values.length > 0) {
          params.append(field, values.join(','));
        }
      });

      // Add pagination
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      // Add sorting
      if (sortBy) {
        params.append('sortBy', sortBy);
      }

      const response = await fetchProductsFromAPI(params, catId);
      
      if (response?.data) {
        setProducts(response.data.products || []);
        setTotalCount(response.data.totalCount || 0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedFilters, currentPage, itemsPerPage, sortBy, catId]);

  useEffect(() => {
    // Only fetch if filters are active
    if (hasActiveFilters) {
      fetchProducts();
    }
  }, [fetchProducts, hasActiveFilters]);

  const handleFilterChange = (filter: { field: string; value: any }) => {
    const { field, value } = filter;
    
    setSelectedFilters(prev => {
      const currentValues = prev[field] || [];
      
      if (typeof value === 'string' && value.includes(',')) {
        // Range filter
        return { ...prev, [field]: [value] };
      } else {
        // Checkbox filter
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
        
        if (newValues.length === 0) {
          const { [field]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [field]: newValues };
      }
    });
    
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    // Load more is handled by pagination
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className={styles.volusionIntegration}>
      {/* Sidebar Filter */}
      <div className={styles.sidebar}>
        <FilterSidebar
          onFilterChange={handleFilterChange}
          selectedFilters={selectedFilters}
        />
      </div>

      {/* Product Grid - Only show when filters are active */}
      {hasActiveFilters && (
        <div className={styles.productArea}>
          <div className={styles.controls}>
            <SortDropdown handleSortChange={handleSortChange} currentSort={sortBy} />
            <ItemsPerPageDropdown
              handleItemsPerPageChange={handleItemsPerPageChange}
              itemsPerPage={itemsPerPage}
            />
            <div className={styles.resultCount}>
              Showing {products.length} of {totalCount} results
            </div>
          </div>

          <ProductList
            products={products}
            filters={selectedFilters}
            loading={loading}
          />

          {totalPages > 1 && (
            <PaginationControls
              visibleProducts={currentPage * itemsPerPage}
              totalProducts={totalCount}
              onLoadMore={handleLoadMore}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VolusionIntegration;
