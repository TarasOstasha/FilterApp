import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import FilterSidebar from '../components/FilterSidebar/FilterSidebar';
import ProductList from '../components/ProductList/ProductList';
import SortDropdown from '../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../components/PaginationControls/PaginationControls';
import { FilterRangeRails } from '../utils/hasActiveFilters';
import {
  getVolusionEmbedCategoryId,
  setProductsRootVisible,
  setVolusionFormVisible,
} from './volusionDom';
import { useVolusionFilterState } from './useVolusionFilterState';

interface VolusionEmbedAppProps {
  sidebarEl: HTMLElement | null;
  productsEl: HTMLElement | null;
}

const VolusionEmbedApp: React.FC<VolusionEmbedAppProps> = ({
  sidebarEl,
  productsEl,
}) => {
  const categoryId = getVolusionEmbedCategoryId();
  const [rangeRails, setRangeRails] = useState<FilterRangeRails>({});

  const handleActiveFiltersChange = useCallback((active: boolean) => {
    setVolusionFormVisible(!active);
    setProductsRootVisible(active);
  }, []);

  const state = useVolusionFilterState({
    categoryId,
    rangeRails,
    onActiveFiltersChange: handleActiveFiltersChange,
  });

  const handleRangeRailsChange = useCallback((rails: FilterRangeRails) => {
    setRangeRails(rails);
  }, []);

  const sidebarContent = sidebarEl ? (
    <>
      <button
        type="button"
        className="xyz-embed-clear-filters"
        onClick={state.handleClearFilters}
      >
        Clear Filters
      </button>
      <FilterSidebar
        categoryId={categoryId}
        onFilterChange={state.handleFilterChange}
        selectedFilters={state.selectedFilters}
        loading={state.loading}
        onRangeRailsChange={handleRangeRailsChange}
      />
    </>
  ) : null;

  const productsContent = productsEl ? (
    <div
      className={`xyz-embed-page-transition ${
        !state.isTransitioning ? 'xyz-embed-show' : ''
      }`}
    >
      <div className="controls d-flex justify-content-between">
        <SortDropdown
          handleSortChange={state.handleSortChange}
          currentSort={state.sortBy}
        />
        <ItemsPerPageDropdown
          itemsPerPage={state.itemsPerPage}
          handleItemsPerPageChange={state.handleItemsPerPageChange}
        />
      </div>
      <br />
      <ProductList
        products={state.products}
        filters={state.selectedFilters}
        loading={state.loading}
        excludeProductIds={[]}
      />
      <PaginationControls
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        onPageChange={state.handlePageChange}
        visibleProducts={state.products.length}
        totalProducts={state.totalProducts}
        onLoadMore={state.handleLoadMore}
        isLoadingMore={state.isLoadingMore}
        hasUsedLoadMore={state.hasUsedLoadMore}
      />
    </div>
  ) : null;

  return (
    <>
      {sidebarEl && sidebarContent
        ? createPortal(sidebarContent, sidebarEl)
        : null}
      {productsEl && productsContent
        ? createPortal(productsContent, productsEl)
        : null}
    </>
  );
};

export default VolusionEmbedApp;
