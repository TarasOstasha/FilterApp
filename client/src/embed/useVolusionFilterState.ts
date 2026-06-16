import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProductsFromAPI } from '../api';
import {
  appendFilterValues,
  buildProductQueryParams,
  parseFiltersFromSearch,
} from '../utils/filterParams';
import {
  FilterRangeRails,
  hasActiveFilters,
} from '../utils/hasActiveFilters';
import { getVolusionEmbedCategoryId } from './volusionDom';

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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasUsedLoadMore, setHasUsedLoadMore] = useState(false);

  const rangeRailsRef = useRef(rangeRails);
  rangeRailsRef.current = rangeRails;

  const offsetFrom = (page: number, limit: number) =>
    Math.max(0, (page - 1) * limit);

  const writeUrl = useCallback(
    (next: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      filters?: Record<string, string[]>;
    }) => {
      const sp = new URLSearchParams();

      if (typeof next.limit === 'number') sp.set('limit', String(next.limit));
      if (typeof next.offset === 'number') sp.set('offset', String(next.offset));
      if (typeof next.sortBy === 'string') sp.set('sortBy', next.sortBy);

      sp.delete('catId');

      const currentFilters = next.filters ?? selectedFilters;
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
    [selectedFilters]
  );

  const hydrateFromUrl = useCallback(() => {
    const { limit, offset, sortBy: urlSortRaw, filters } = parseFiltersFromSearch(
      window.location.search
    );
    const urlSort: SortBy = isSortBy(urlSortRaw) ? urlSortRaw : 'most_popular';

    setItemsPerPage(limit);
    setCurrentPage(Math.floor(offset / limit) + 1);
    setSortBy(urlSort);
    setSelectedFilters(filters);
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
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hydrateFromUrl]);

  const filtersActive = hasActiveFilters(selectedFilters, rangeRails);

  useEffect(() => {
    onActiveFiltersChange?.(filtersActive);
  }, [filtersActive, onActiveFiltersChange]);

  const fetchProducts = useCallback(async () => {
    if (!hasActiveFilters(selectedFilters, rangeRailsRef.current)) {
      setProducts([]);
      setTotalProducts(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const qp = buildProductQueryParams({
        limit: itemsPerPage,
        offset: offsetFrom(currentPage, itemsPerPage),
        sortBy: String(sortBy),
        filters: selectedFilters,
      });

      const catId = categoryId || getVolusionEmbedCategoryId();
      const response = await fetchProductsFromAPI(qp, catId);
      if (response?.data) {
        const newProducts: Product[] = response.data.products || [];
        if (isLoadingMore) {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const unique = newProducts.filter((p) => !existingIds.has(p.id));
            return [...prev, ...unique];
          });
        } else {
          setProducts(newProducts);
        }
        setTotalProducts(response.data.totalProducts || 0);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setTimeout(() => setIsTransitioning(false), 120);
    }
  }, [
    selectedFilters,
    currentPage,
    itemsPerPage,
    sortBy,
    isLoadingMore,
    categoryId,
  ]);

  useEffect(() => {
    if (!filtersActive) return;
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [selectedFilters, currentPage, itemsPerPage, sortBy, filtersActive, fetchProducts]);

  const handleFilterChange = (filter: { field: string; value: string }) => {
    setIsTransitioning(true);
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
      });

      return next;
    });
  };

  const handleSortChange = (sortMethod: string) => {
    const validSort: SortBy = isSortBy(sortMethod) ? sortMethod : 'most_popular';
    setIsTransitioning(true);
    setIsLoadingMore(false);
    setHasUsedLoadMore(false);
    setSortBy(validSort);
    setCurrentPage(1);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy: validSort,
      filters: selectedFilters,
    });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsTransitioning(true);
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
    });
  };

  const handlePageChange = (page: number) => {
    setIsTransitioning(true);
    setHasUsedLoadMore(false);
    setIsLoadingMore(false);
    setCurrentPage(page);
    writeUrl({
      limit: itemsPerPage,
      offset: offsetFrom(page, itemsPerPage),
      sortBy,
      filters: selectedFilters,
    });
  };

  const handleLoadMore = async () => {
    if (!filtersActive) return;
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
      });

      const catId = categoryId || getVolusionEmbedCategoryId();
      const response = await fetchProductsFromAPI(qp, catId);
      if (response?.data) {
        const newProducts: Product[] = response.data.products || [];
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const unique = newProducts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...unique];
        });
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
    setHasUsedLoadMore(false);
    setSelectedFilters({});
    setCurrentPage(1);
    setSortBy('most_popular');
    setProducts([]);
    setTotalProducts(0);
    writeUrl({
      limit: itemsPerPage,
      offset: 0,
      sortBy: 'most_popular',
      filters: {},
    });
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
    isTransitioning,
    isLoadingMore,
    hasUsedLoadMore,
    filtersActive,
    totalPages,
    handleFilterChange,
    handleSortChange,
    handleItemsPerPageChange,
    handlePageChange,
    handleLoadMore,
    handleClearFilters,
  };
}
