import React, { useState, useEffect } from 'react';
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

export const allowedSorts = ['most_popular', 'price_asc', 'price_desc'] as const;
export type SortBy = typeof allowedSorts[number];
export const isSortBy = (v: unknown): v is SortBy =>
  typeof v === 'string' && (allowedSorts as readonly string[]).includes(v);

const Home: React.FC = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // core state
  const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(27);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('most_popular');

  // load-more - separate from pagination
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0); // Track how many products loaded via "View More"
  const [hasUsedLoadMore, setHasUsedLoadMore] = useState(false); // Track if "View More" has been used

  // —— helpers ——
  const offsetFrom = (page: number, limit: number) => Math.max(0, (page - 1) * limit);

  const writeUrl = (next: {
    limit?: number; offset?: number; sortBy?: string; filters?: { [k: string]: string[] };
  }) => {
    const sp = new URLSearchParams();

    if (typeof next.limit === 'number') sp.set('limit', String(next.limit));
    if (typeof next.offset === 'number') sp.set('offset', String(next.offset));
    if (typeof next.sortBy === 'string') sp.set('sortBy', next.sortBy);

    const currentFilters = next.filters || selectedFilters;
    Object.entries(currentFilters).forEach(([k, arr]) => {
      if (Array.isArray(arr) && arr.length > 0) {
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

    const urlLimit = Number(sp.get('limit'));
    const urlOffset = Number(sp.get('offset'));
    const limit = Number.isFinite(urlLimit) && urlLimit > 0 ? urlLimit : 27;
    const offset = Number.isFinite(urlOffset) && urlOffset >= 0 ? urlOffset : 0;

    setItemsPerPage(limit);
    setCurrentPage(Math.floor(offset / limit) + 1);
    setLoadedCount(limit);

    const q = sp.get('sortBy');
    const urlSort: SortBy = isSortBy(q) ? q : 'most_popular';
    setSortBy(urlSort);

    const meta = new Set(['limit', 'offset', 'sortBy']);
    const valrangeDigits = ['Product Price', 'Display Width', 'Display Height'];
    const restored: { [k: string]: string[] } = {};

    sp.forEach((val, rawKey) => {
      if (meta.has(rawKey)) return;
      const decodedKey = decodeURIComponent(rawKey).replace(/\+/g, ' ');
      if (valrangeDigits.includes(decodedKey)) {
        restored[decodedKey] = [val];     // "min,max"
      } else {
        restored[decodedKey] = val.split(',');
      }
    });

    setSelectedFilters(restored);
  }, []);

  // —— FETCH PRODUCTS ——
  const fetchProducts = async () => {
    setLoading(true);

    try {
      const qp = new URLSearchParams();
      qp.set('limit', String(itemsPerPage));
      qp.set('offset', String(offsetFrom(currentPage, itemsPerPage)));
      qp.set('sortBy', String(sortBy));

      const catId = getCategoryIdFromPath();
      Object.keys(selectedFilters).forEach((key) => {
        if (key === 'sortBy') return;
        qp.append(key, selectedFilters[key].join(','));
      });

      const response = await fetchProductsFromAPI(qp, catId);
      if (response?.data) {
        const newProducts: Product[] = response.data.products || [];
        if (isLoadingMore) {
          // Filter out duplicates based on product ID before appending
          setProducts((prev) => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id));
            return [...prev, ...uniqueNewProducts];
          });
        } else {
          setProducts(newProducts);
        }
        setTotalProducts(response.data.totalProducts || 0);
      } else {
        console.error('No data received');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
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
    setIsLoadingMore(false);
    setHasUsedLoadMore(false); // Reset when filter changes
    const { field, value } = filter;

    setSelectedFilters((prev) => {
      const current = prev[field] || [];
      const next = { ...prev };

      if (value.includes(',')) {
        next[field] = [value];           // range overrides
      } else {
        next[field] = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next[field].length === 0) delete next[field];
      }

      setCurrentPage(1);
      setLoadedCount(itemsPerPage);

      writeUrl({
        limit: itemsPerPage,
        offset: 0,
        sortBy,
        filters: next,
      });

      return next;
    });

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleSortChange = (sortMethod: string) => {
    const validSort: SortBy = isSortBy(sortMethod) ? sortMethod : 'most_popular';
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false); // Reset when sort changes
    setSortBy(validSort);
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy: validSort,
      filters: selectedFilters,
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false); // Reset when items per page changes
    const next = Number(e.target.value);
    setItemsPerPage(next);
    setCurrentPage(1);
    setLoadedCount(next);
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
    setHasUsedLoadMore(false); // Reset when navigating to new page
    setIsLoadingMore(false);
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

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    setHasUsedLoadMore(true); // Mark that "View More" has been used

    try {
      const qp = new URLSearchParams();
      qp.set('limit', String(itemsPerPage));
      // Calculate offset: base offset of current page + products already loaded
      const baseOffset = offsetFrom(currentPage, itemsPerPage);
      const nextOffset = baseOffset + products.length;
      qp.set('offset', String(nextOffset));
      qp.set('sortBy', String(sortBy));

      const catId = getCategoryIdFromPath();
      Object.keys(selectedFilters).forEach((key) => {
        if (key === 'sortBy') return;
        qp.append(key, selectedFilters[key].join(','));
      });

      const response = await fetchProductsFromAPI(qp, catId);
      if (response?.data) {
        const newProducts: Product[] = response.data.products || [];
        // Filter out duplicates and append
        setProducts((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewProducts];
        });
        setLoadedCount(prev => prev + itemsPerPage);
      }
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleClearFilters = () => {
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false); // Reset when clearing filters
    setSelectedFilters({});
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
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
            loading={loading}
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
              visibleProducts={products.length}
              totalProducts={totalProducts}
              onLoadMore={handleLoadMore}
              isLoadingMore={isLoadingMore}
              hasUsedLoadMore={hasUsedLoadMore}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
