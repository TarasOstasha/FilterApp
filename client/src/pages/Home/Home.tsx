import React, { useState, useEffect, useRef } from 'react';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import ProductList from '../../components/ProductList/ProductList';
import SortDropdown from '../../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../../components/PaginationControls/PaginationControls';
import { fetchProductsFromAPI } from '../../api';
import MegaFilter from '../../components/MegaFilter/MegaFilter';
import styles from './Home.module.scss';
import { getCategoryIdFromPath } from '../../utils/helpers';

interface Product {
  id: number;
  product_name: string;
  product_code: string;
  product_link: string;
  product_img_link: string;
  product_price: number;
}

const Home: React.FC = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // core state
  const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(27);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleProducts, setVisibleProducts] = useState(27);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | string>('price_asc');

  // —— helpers ——
  const offsetFrom = (page: number, limit: number) => Math.max(0, (page - 1) * limit);

  const writeUrl = (next: {
    limit?: number; offset?: number; sortBy?: string; filters?: { [k: string]: string[] };
  }) => {
    const sp = new URLSearchParams();

    // Always set current values first
    if (typeof next.limit === 'number') sp.set('limit', String(next.limit));
    if (typeof next.offset === 'number') sp.set('offset', String(next.offset));
    if (typeof next.sortBy === 'string') sp.set('sortBy', next.sortBy);

    // Add filters - ensure we don't lose any existing filters unless explicitly overridden
    const currentFilters = next.filters || selectedFilters;
    Object.entries(currentFilters).forEach(([k, arr]) => {
      if (Array.isArray(arr) && arr.length > 0) {
        // Properly encode filter names with spaces
        const encodedKey = encodeURIComponent(k);
        sp.set(encodedKey, arr.join(','));
      }
    });

    const newUrl = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  // —— hydrate state from URL on first mount ——
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);

    // pagination
    const urlLimit  = Number(sp.get('limit'));
    const urlOffset = Number(sp.get('offset'));
    const limit  = Number.isFinite(urlLimit)  && urlLimit  > 0 ? urlLimit  : 27;
    const offset = Number.isFinite(urlOffset) && urlOffset >= 0 ? urlOffset : 0;

    setItemsPerPage(limit);
    setCurrentPage(Math.floor(offset / limit) + 1);
    setVisibleProducts(limit);

    // sort
    const urlSort = sp.get('sortBy') || 'price_asc';
    setSortBy(urlSort);

    // filters (skip meta keys)
    const meta = new Set(['limit', 'offset', 'sortBy']);
    const valrangeDigits = ['Product Price', 'Display Width', 'Display Height'];
    const restored: { [k: string]: string[] } = {};

    sp.forEach((val, rawKey) => {
      if (meta.has(rawKey)) return;
      // Properly decode URL-encoded filter names
      const decodedKey = decodeURIComponent(rawKey).replace(/\+/g, ' ');
      if (valrangeDigits.includes(decodedKey)) {
        restored[decodedKey] = [val];     // range fields stored as single "min,max"
      } else {
        restored[decodedKey] = val.split(','); // checkbox fields split
      }
    });

    setSelectedFilters(restored);
  }, []);

  // Helper: extract the digits right before ".htm" at the end of the path
  // const getCategoryIdFromPath = (): string => {
  //   try {
  //     const path = window.location.pathname; 
  //     const m = path.match(/\/(\d+)\.htm(?:$|\?)/i);
  //     return m ? m[1] : '51'; // for testing purposes, default to ''
  //   } catch {
  //     return ''; 
  //   }
  // };

  // —— FETCH PRODUCTS ——
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();

      qp.set('limit', String(itemsPerPage));
      qp.set('offset', String(offsetFrom(currentPage, itemsPerPage)));
      qp.set('sortBy', String(sortBy));

      const catId = getCategoryIdFromPath() 
      Object.keys(selectedFilters).forEach((key) => {
        if (key === 'sortBy') return;
        qp.append(key, selectedFilters[key].join(','));
      });

      const response = await fetchProductsFromAPI(qp, catId);
      if (response?.data) {
        console.log(response?.data, 'response products HOME page')
        setProducts(response.data.products);
        setTotalProducts(response.data.totalProducts);
      } else {
        console.error('No data received');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      // let images start loading, then fade in
      setTimeout(() => setIsTransitioning(false), 120);
    }
  };

  // debounce fetch on key deps
  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [selectedFilters, currentPage, itemsPerPage, sortBy]);

  // —— handlers ——
  const handleFilterChange = (filter: { field: string; value: string }) => {
    setIsTransitioning(true);
    const { field, value } = filter;
    setSelectedFilters(prev => {
      const current = prev[field] || [];
      const next = { ...prev };

      if (value.includes(',')) {
        next[field] = [value];           // range overrides
      } else {
        // checkbox toggle
        next[field] = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value];
        if (next[field].length === 0) delete next[field];
      }

      // reset to page 1 whenever filters change
      setCurrentPage(1);

      // sync URL
      writeUrl({
        limit: itemsPerPage,
        offset: 0,
        sortBy,
        filters: next,
      });

      return next;
    });
    // optional: instant scroll-to-top on filter change
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleSortChange = (sortMethod: string) => {
    setIsTransitioning(true);
    setSortBy(sortMethod);
    setCurrentPage(1);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy: sortMethod,
      filters: selectedFilters,
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsTransitioning(true);
    const next = Number(e.target.value);
    setItemsPerPage(next);
    setCurrentPage(1);
    setVisibleProducts(next);
    writeUrl({
      limit: next,
      offset: 0,
      sortBy,
      filters: selectedFilters,
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handlePageChange = (page: number) => {
    setIsTransitioning(true);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setCurrentPage(page);
    const nextOffset = offsetFrom(page, itemsPerPage);
    writeUrl({
      limit: itemsPerPage,
      offset: nextOffset,
      sortBy,
      filters: selectedFilters,
    });
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
    setVisibleProducts(prev => {
      const nextVisible = prev + itemsPerPage;
      return nextVisible > totalProducts ? totalProducts : nextVisible;
    });
  };

  const handleClearFilters = () => {
    setIsTransitioning(true);
    setSelectedFilters({});
    setCurrentPage(1);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy,
      filters: {},
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  return (
    <div className="container">
      <div className="row">
        <div className="col-md-3">
          <FilterSidebar
            onFilterChange={handleFilterChange}
            selectedFilters={selectedFilters}
          />
          <button className={styles.clearFiltersButton} onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
        <div className="col-md-9">
          <div className="controls d-flex justify-content-between">
            <SortDropdown
              handleSortChange={handleSortChange}
              currentSort={sortBy}
            />
            <ItemsPerPageDropdown
              itemsPerPage={itemsPerPage}
              handleItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>

          <br />

          {/* Fade this whole region during transitions */}
          <div className={`${styles.pageTransition} ${!isTransitioning ? styles.show : ''}`}>
            <MegaFilter sortBy={sortBy} filters={selectedFilters} loading={loading} />

            <ProductList products={products} filters={selectedFilters} loading={loading} />

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              visibleProducts={visibleProducts}
              totalProducts={totalProducts}
              onLoadMore={handleLoadMore}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
