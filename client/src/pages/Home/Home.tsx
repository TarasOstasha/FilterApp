import React, { useState, useEffect, useCallback, useRef } from 'react';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import ProductList from '../../components/ProductList/ProductList';
import SortDropdown from '../../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../../components/PaginationControls/PaginationControls';
import { fetchProductsFromAPI } from '../../api';
import MegaFilter from '../../components/MegaFilter/MegaFilter';
import ActiveFilters, {
  DimensionUnitSelections,
} from '../../components/ActiveFilters/ActiveFilters';
import CategoryTester from '../../components/CategoryTester/CategoryTester';
import styles from './Home.module.scss';
import {
  getCategoryIdFromPath,
  getCategoryIdFromPathname,
} from '../../utils/helpers';
import {
  RANGE_FILTER_KEYS,
  SEARCH_COMMIT_DEBOUNCE_MS,
  appendFilterValues,
  parseFiltersFromSearch,
  buildProductQueryParams,
} from '../../utils/filterParams';

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
  /** Immediate input value (free typing). */
  const [searchInput, setSearchInput] = useState('');
  /** Debounced committed search used by API / URL / sidebar. */
  const [searchTerms, setSearchTerms] = useState('');
  const [dimensionUnits, setDimensionUnits] = useState<DimensionUnitSelections>({
    'Display Width': 'in',
    'Display Height': 'in',
  });

  // load-more - separate from pagination
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasUsedLoadMore, setHasUsedLoadMore] = useState(false);

  const fetchSeqRef = useRef(0);
  const lastFetchKeyRef = useRef('');
  const searchTermsRef = useRef(searchTerms);
  searchTermsRef.current = searchTerms;
  const selectedFiltersRef = useRef(selectedFilters);
  selectedFiltersRef.current = selectedFilters;
  const skipSearchDebounceRef = useRef(false);

  const offsetFrom = (page: number, limit: number) => Math.max(0, (page - 1) * limit);

  const writeUrl = (next: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    filters?: { [k: string]: string[] };
    searchTerms?: string;
    catId?: string;
  }) => {
    const sp = new URLSearchParams();

    if (typeof next.limit === 'number') sp.set('limit', String(next.limit));
    if (typeof next.offset === 'number') sp.set('offset', String(next.offset));
    if (typeof next.sortBy === 'string') sp.set('sortBy', next.sortBy);

    const pathnameCatId = getCategoryIdFromPathname();
    if (pathnameCatId) {
      sp.delete('catId');
    } else {
      const catId = next.catId !== undefined ? next.catId : getCategoryIdFromPath();
      if (catId) sp.set('catId', catId);
    }

    const term =
      next.searchTerms !== undefined
        ? next.searchTerms.trim()
        : searchTermsRef.current.trim();
    if (term) sp.set('searchTerms', term);

    const currentFilters = next.filters || selectedFiltersRef.current;
    Object.entries(currentFilters).forEach(([k, arr]) => {
      if (Array.isArray(arr) && arr.length > 0) {
        appendFilterValues(sp, k, arr);
      }
    });

    const newUrl = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const hydrateFromUrl = useCallback((options?: { syncCatIdToUrl?: boolean }) => {
    const {
      limit,
      offset,
      sortBy: urlSortRaw,
      filters,
      searchTerms: urlSearch,
    } = parseFiltersFromSearch(window.location.search);
    const urlSort: SortBy = isSortBy(urlSortRaw) ? urlSortRaw : 'most_popular';

    skipSearchDebounceRef.current = true;
    setItemsPerPage(limit);
    setCurrentPage(Math.floor(offset / limit) + 1);
    setLoadedCount(limit);
    setSortBy(urlSort);
    setSelectedFilters(filters);
    setSearchInput(urlSearch);
    setSearchTerms(urlSearch);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);

    if (options?.syncCatIdToUrl) {
      const sp = new URLSearchParams(window.location.search);
      const pathnameCatId = getCategoryIdFromPathname();
      let shouldUpdate = false;

      if (pathnameCatId) {
        if (sp.has('catId')) {
          sp.delete('catId');
          shouldUpdate = true;
        }
      } else {
        const catId = getCategoryIdFromPath();
        if (catId && !sp.get('catId')) {
          sp.set('catId', catId);
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}?${sp.toString()}`
        );
      }
    }
  }, []);

  useEffect(() => {
    hydrateFromUrl({ syncCatIdToUrl: true });
  }, [hydrateFromUrl]);

  useEffect(() => {
    const onPopState = () => {
      setIsTransitioning(true);
      hydrateFromUrl({ syncCatIdToUrl: false });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hydrateFromUrl]);

  // Debounce search input → committed searchTerms (page reset + URL)
  useEffect(() => {
    if (skipSearchDebounceRef.current) {
      skipSearchDebounceRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearchTerms((prev) => {
        if (prev === next) return prev;
        setIsTransitioning(true);
        setIsLoadingMore(false);
        setHasUsedLoadMore(false);
        setCurrentPage(1);
        setLoadedCount(itemsPerPage);
        writeUrl({
          limit: itemsPerPage,
          offset: 0,
          sortBy,
          filters: selectedFiltersRef.current,
          searchTerms: next,
        });
        return next;
      });
    }, SEARCH_COMMIT_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
    // intentionally omit itemsPerPage/sortBy — only commit when input changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const fetchProducts = useCallback(async () => {
    const qp = buildProductQueryParams({
      limit: itemsPerPage,
      offset: offsetFrom(currentPage, itemsPerPage),
      sortBy: String(sortBy),
      filters: selectedFilters,
      searchTerms,
    });
    const catId = getCategoryIdFromPath();
    const fetchKey = `${qp.toString()}|${catId}`;
    if (fetchKey === lastFetchKeyRef.current) {
      return;
    }
    lastFetchKeyRef.current = fetchKey;

    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const response = await fetchProductsFromAPI(qp, catId);
      if (seq !== fetchSeqRef.current) return;
      if (response?.data) {
        setProducts(response.data.products || []);
        setTotalProducts(response.data.totalProducts || 0);
      } else {
        console.error('No data received');
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Error fetching products:', err);
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
        setIsLoadingMore(false);
        setTimeout(() => setIsTransitioning(false), 120);
      }
    }
  }, [selectedFilters, currentPage, itemsPerPage, sortBy, searchTerms]);

  // Search is already debounced before searchTerms updates; keep a short settle for filter churn.
  useEffect(() => {
    const t = setTimeout(() => {
      void fetchProducts();
    }, 300);
    return () => clearTimeout(t);
  }, [selectedFilters, currentPage, itemsPerPage, sortBy, searchTerms, fetchProducts]);

  const handleFilterChange = (filter: { field: string; value: string }) => {
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    const { field, value } = filter;
    setSelectedFilters((prev) => {
      const current = prev[field] || [];
      const next = { ...prev };

      if (RANGE_FILTER_KEYS.includes(field)) {
        next[field] = [value];
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
        searchTerms,
      });

      return next;
    });

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleRemoveFilter = (filter: { field: string; value: string }) => {
    if (!RANGE_FILTER_KEYS.includes(filter.field)) {
      handleFilterChange(filter);
      return;
    }

    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSelectedFilters((prev) => {
      const next = { ...prev };
      delete next[filter.field];
      setCurrentPage(1);
      setLoadedCount(itemsPerPage);
      writeUrl({
        limit: itemsPerPage,
        offset: 0,
        sortBy,
        filters: next,
        searchTerms,
      });
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleSortChange = (sortMethod: string) => {
    const validSort: SortBy = isSortBy(sortMethod) ? sortMethod : 'most_popular';
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSortBy(validSort);
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy: validSort,
      filters: selectedFilters,
      searchTerms,
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    const next = Number(e.target.value);
    setItemsPerPage(next);
    setCurrentPage(1);
    setLoadedCount(next);
    writeUrl({
      limit: next,
      offset: 0,
      sortBy,
      filters: selectedFilters,
      searchTerms,
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handlePageChange = (page: number) => {
    setIsTransitioning(true);
    setHasUsedLoadMore(false);
    setIsLoadingMore(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setCurrentPage(page);
    const nextOffset = offsetFrom(page, itemsPerPage);
    writeUrl({
      limit: itemsPerPage,
      offset: nextOffset,
      sortBy,
      filters: selectedFilters,
      searchTerms,
    });
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    setHasUsedLoadMore(true);

    try {
      const baseOffset = offsetFrom(currentPage, itemsPerPage);
      const nextOffset = baseOffset + products.length;
      const qp = buildProductQueryParams({
        limit: itemsPerPage,
        offset: nextOffset,
        sortBy: String(sortBy),
        filters: selectedFilters,
        searchTerms,
      });

      const catId = getCategoryIdFromPath();
      const response = await fetchProductsFromAPI(qp, catId);
      if (response?.data) {
        const newProducts: Product[] = response.data.products || [];
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNewProducts = newProducts.filter((p) => !existingIds.has(p.id));
          if (uniqueNewProducts.length === 0) {
            setTotalProducts(prev.length);
          }
          return [...prev, ...uniqueNewProducts];
        });
        setLoadedCount((prev) => prev + itemsPerPage);
      }
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleClearSearch = () => {
    skipSearchDebounceRef.current = true;
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSearchInput('');
    setSearchTerms('');
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy,
      filters: selectedFilters,
      searchTerms: '',
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleClearFilters = () => {
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSelectedFilters({});
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
    setSortBy('most_popular');
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy: 'most_popular',
      filters: {},
      searchTerms,
    });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleCategoryChange = () => {
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy,
      filters: selectedFilters,
      searchTerms,
      catId: getCategoryIdFromPath(),
    });
    lastFetchKeyRef.current = '';
    void fetchProducts();
  };

  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  return (
    <>
      <CategoryTester onCategoryChange={handleCategoryChange} OnFilterSideBarReload={handleClearFilters} />
      <div className="container">
        <div className="row">
          <div className="col-md-3">
            <button className={styles.clearFiltersButton} onClick={handleClearFilters}>
              Clear Filters
            </button>
            <FilterSidebar
              onFilterChange={handleFilterChange}
              selectedFilters={selectedFilters}
              loading={loading}
              searchTerms={searchTerms}
              onDimensionUnitsChange={setDimensionUnits}
            />
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

            <MegaFilter
              value={searchInput}
              onChange={setSearchInput}
              onClear={handleClearSearch}
            />

            <ActiveFilters
              selectedFilters={selectedFilters}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearFilters}
              dimensionUnits={dimensionUnits}
            />

            <div className={`${styles.pageTransition} ${!isTransitioning ? styles.show : ''}`}>
              <ProductList
                products={products}
                filters={selectedFilters}
                loading={loading}
              />

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
    </>
  );
};

export default Home;
