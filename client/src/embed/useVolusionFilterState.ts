import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProductsFromAPI } from '../api';
import {
  RANGE_FILTER_KEYS,
  SEARCH_COMMIT_DEBOUNCE_MS,
  appendFilterValues,
  buildProductQueryParams,
  parseFiltersFromSearch,
} from '../utils/filterParams';
import {
  FilterRangeRails,
  hasActiveFilters,
} from '../utils/hasActiveFilters';
import {
  ensureCategoryPageAtTop,
  getVolusionEmbedCategoryId,
} from './volusionDom';

const ALLOWED_SORTS = ['most_popular', 'price_asc', 'price_desc'] as const;
type SortBy = (typeof ALLOWED_SORTS)[number];
const isSortBy = (v: unknown): v is SortBy =>
  typeof v === 'string' && (ALLOWED_SORTS as readonly string[]).includes(v);

interface Product {
  id: number;
  product_name: string;
  product_code: string;
  product_link: string;
  product_img_link: string;
  product_price: number;
}

export interface UseVolusionFilterStateOptions {
  categoryId: string;
  rangeRails: FilterRangeRails;
  onActiveFiltersChange?: (active: boolean) => void;
}

export function useVolusionFilterState({
  categoryId,
  rangeRails,
  onActiveFiltersChange,
}: UseVolusionFilterStateOptions) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(27);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('most_popular');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerms, setSearchTerms] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasUsedLoadMore, setHasUsedLoadMore] = useState(false);

  const rangeRailsRef = useRef(rangeRails);
  rangeRailsRef.current = rangeRails;

  const isLoadingMoreRef = useRef(false);
  const fetchSeqRef = useRef(0);
  const lastFetchKeyRef = useRef('');
  const skipSearchDebounceRef = useRef(false);
  const searchTermsRef = useRef(searchTerms);
  searchTermsRef.current = searchTerms;
  const selectedFiltersRef = useRef(selectedFilters);
  selectedFiltersRef.current = selectedFilters;

  const offsetFrom = (page: number, limit: number) =>
    Math.max(0, (page - 1) * limit);

  const writeUrl = useCallback(
    (next: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      filters?: Record<string, string[]>;
      searchTerms?: string;
    }) => {
      const sp = new URLSearchParams();

      if (typeof next.limit === 'number') sp.set('limit', String(next.limit));
      if (typeof next.offset === 'number') sp.set('offset', String(next.offset));
      if (typeof next.sortBy === 'string') sp.set('sortBy', next.sortBy);

      sp.delete('catId');

      const term =
        next.searchTerms !== undefined
          ? next.searchTerms.trim()
          : searchTermsRef.current.trim();
      if (term) sp.set('searchTerms', term);

      const currentFilters = next.filters ?? selectedFiltersRef.current;
      Object.entries(currentFilters).forEach(([k, arr]) => {
        if (Array.isArray(arr) && arr.length > 0) {
          appendFilterValues(sp, k, arr);
        }
      });

      const qs = sp.toString();
      const newUrl = qs
        ? `${window.location.pathname}?${qs}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    },
    []
  );

  const hydrateFromUrl = useCallback(() => {
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
    setSortBy(urlSort);
    setSelectedFilters(filters);
    setSearchInput(urlSearch);
    setSearchTerms(urlSearch);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
  }, []);

  useEffect(() => {
    hydrateFromUrl();
  }, [hydrateFromUrl]);

  useEffect(() => {
    const onPopState = () => {
      setIsTransitioning(true);
      hydrateFromUrl();
      ensureCategoryPageAtTop();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hydrateFromUrl]);

  // Debounce search input → committed searchTerms
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
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
        setHasUsedLoadMore(false);
        setCurrentPage(1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const filtersActive =
    hasActiveFilters(selectedFilters, rangeRails) || searchTerms.trim().length > 0;

  useEffect(() => {
    onActiveFiltersChange?.(filtersActive);
  }, [filtersActive, onActiveFiltersChange]);

  const fetchProducts = useCallback(async () => {
    if (
      !hasActiveFilters(selectedFilters, rangeRailsRef.current) &&
      !searchTerms.trim()
    ) {
      setProducts([]);
      setTotalProducts(0);
      setLoading(false);
      lastFetchKeyRef.current = '';
      return;
    }

    if (isLoadingMoreRef.current) return;

    const qp = buildProductQueryParams({
      limit: itemsPerPage,
      offset: offsetFrom(currentPage, itemsPerPage),
      sortBy: String(sortBy),
      filters: selectedFilters,
      searchTerms,
    });

    const catId = categoryId || getVolusionEmbedCategoryId();
    const fetchKey = `${qp.toString()}|${catId}`;
    if (fetchKey === lastFetchKeyRef.current) return;
    lastFetchKeyRef.current = fetchKey;

    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const response = await fetchProductsFromAPI(qp, catId);
      if (seq !== fetchSeqRef.current) return;
      if (response?.data) {
        const newProducts: Product[] = response.data.products || [];
        setProducts(newProducts);
        setTotalProducts(response.data.totalProducts || 0);
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Error fetching products:', err);
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
        setTimeout(() => setIsTransitioning(false), 120);
      }
    }
  }, [
    selectedFilters,
    currentPage,
    itemsPerPage,
    sortBy,
    categoryId,
    searchTerms,
  ]);

  useEffect(() => {
    if (!filtersActive) return;
    const t = setTimeout(() => {
      void fetchProducts();
    }, 300);
    return () => clearTimeout(t);
  }, [
    selectedFilters,
    currentPage,
    itemsPerPage,
    sortBy,
    searchTerms,
    filtersActive,
    fetchProducts,
  ]);

  const handleFilterChange = (filter: { field: string; value: string }) => {
    setIsTransitioning(true);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    const { field, value } = filter;

    setSelectedFilters((prev) => {
      const current = prev[field] || [];
      const next = { ...prev };

      if (['Product Price', 'Display Width', 'Display Height'].includes(field)) {
        next[field] = [value];
      } else {
        next[field] = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next[field].length === 0) delete next[field];
      }

      setCurrentPage(1);
      writeUrl({
        limit: itemsPerPage,
        offset: 0,
        sortBy,
        filters: next,
        searchTerms,
      });

      return next;
    });

    ensureCategoryPageAtTop();
  };

  const handleRemoveFilter = (filter: { field: string; value: string }) => {
    if (!RANGE_FILTER_KEYS.includes(filter.field)) {
      handleFilterChange(filter);
      return;
    }

    setIsTransitioning(true);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSelectedFilters((prev) => {
      const next = { ...prev };
      delete next[filter.field];
      setCurrentPage(1);
      writeUrl({
        limit: itemsPerPage,
        offset: 0,
        sortBy,
        filters: next,
        searchTerms,
      });
      return next;
    });
    ensureCategoryPageAtTop();
  };

  const handleSortChange = (sortMethod: string) => {
    const validSort: SortBy = isSortBy(sortMethod) ? sortMethod : 'most_popular';
    setIsTransitioning(true);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSortBy(validSort);
    setCurrentPage(1);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy: validSort,
      filters: selectedFilters,
      searchTerms,
    });
    ensureCategoryPageAtTop();
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsTransitioning(true);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    const next = Number(e.target.value);
    setItemsPerPage(next);
    setCurrentPage(1);
    writeUrl({
      limit: next,
      offset: 0,
      sortBy,
      filters: selectedFilters,
      searchTerms,
    });
    ensureCategoryPageAtTop();
  };

  const handlePageChange = (page: number) => {
    setIsTransitioning(true);
    isLoadingMoreRef.current = false;
    setHasUsedLoadMore(false);
    setIsLoadingMore(false);
    ensureCategoryPageAtTop();
    setCurrentPage(page);
    writeUrl({
      limit: itemsPerPage,
      offset: offsetFrom(page, itemsPerPage),
      sortBy,
      filters: selectedFilters,
      searchTerms,
    });
  };

  const handleLoadMore = async () => {
    if (!filtersActive) return;
    isLoadingMoreRef.current = true;
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

      const catId = categoryId || getVolusionEmbedCategoryId();
      const response = await fetchProductsFromAPI(qp, catId);
      if (response?.data) {
        const newProducts: Product[] = response.data.products || [];
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const unique = newProducts.filter((p) => !existingIds.has(p.id));
          if (unique.length === 0) {
            setTotalProducts(prev.length);
          }
          return [...prev, ...unique];
        });
      }
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const handleClearSearch = () => {
    skipSearchDebounceRef.current = true;
    setIsTransitioning(true);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSearchInput('');
    setSearchTerms('');
    setCurrentPage(1);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy,
      filters: selectedFilters,
      searchTerms: '',
    });
    ensureCategoryPageAtTop();
  };

  const handleClearFilters = () => {
    setIsTransitioning(true);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSelectedFilters({});
    setCurrentPage(1);
    setItemsPerPage(27);
    setSortBy('most_popular');
    setProducts([]);
    setTotalProducts(0);
    // Preserve search when clearing sidebar filters (search has its own clear control).
    // If search is also empty, return to the native category URL.
    if (!searchTerms.trim()) {
      skipSearchDebounceRef.current = true;
      setSearchInput('');
      setSearchTerms('');
      window.history.pushState({}, '', window.location.pathname);
    } else {
      writeUrl({
        limit: 27,
        offset: 0,
        sortBy: 'most_popular',
        filters: {},
        searchTerms,
      });
    }
    ensureCategoryPageAtTop();
    setTimeout(() => setIsTransitioning(false), 120);
  };

  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  return {
    selectedFilters,
    products,
    itemsPerPage,
    currentPage,
    totalProducts,
    loading,
    sortBy,
    searchInput,
    searchTerms,
    isTransitioning,
    isLoadingMore,
    hasUsedLoadMore,
    filtersActive,
    totalPages,
    handleFilterChange,
    handleRemoveFilter,
    handleSortChange,
    handleItemsPerPageChange,
    handlePageChange,
    handleLoadMore,
    handleClearFilters,
    handleClearSearch,
    setSearchInput,
  };
}
