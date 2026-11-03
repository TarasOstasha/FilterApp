import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import FilterSidebar from '../components/FilterSidebar/FilterSidebar';
import MegaFilter from '../components/MegaFilter/MegaFilter';
import ActiveFilters, {
  DimensionUnitSelections,
} from '../components/ActiveFilters/ActiveFilters';
import ProductList from '../components/ProductList/ProductList';
import SortDropdown from '../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../components/PaginationControls/PaginationControls';
import { FilterRangeRails } from '../utils/hasActiveFilters';
import {
  getVolusionEmbedCategoryId,
  ensureCategoryPageAtTop,
  repositionProductsRoot,
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
  const [dimensionUnits, setDimensionUnits] = useState<DimensionUnitSelections>({
    'Display Width': 'in',
    'Display Height': 'in',
  });

  const state = useVolusionFilterState({
    categoryId,
    rangeRails,
  });

  const showEmbedProducts = state.filtersActive;

  useEffect(() => {
    ensureCategoryPageAtTop();
  }, [categoryId]);

  useEffect(() => {
    setVolusionFormVisible(!showEmbedProducts);
    setProductsRootVisible(showEmbedProducts);
    repositionProductsRoot(showEmbedProducts);
    if (showEmbedProducts) {
      ensureCategoryPageAtTop();
    }
  }, [showEmbedProducts]);

  const handleRangeRailsChange = useCallback((rails: FilterRangeRails) => {
    setRangeRails(rails);
  }, []);

  const sidebarContent = sidebarEl ? (
    <>
      <MegaFilter
        value={state.searchInput}
        onChange={state.setSearchInput}
        onClear={state.handleClearSearch}
        autoFocus={false}
      />
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
        searchTerms={state.searchTerms}
        onRangeRailsChange={handleRangeRailsChange}
        onDimensionUnitsChange={setDimensionUnits}
      />
    </>
  ) : null;

  const productsContent =
    productsEl && state.filtersActive ? (
      <div className="xyz-embed-products-panel">
        <div className="xyz-embed-controls">
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
        <ActiveFilters
          selectedFilters={state.selectedFilters}
          onRemove={state.handleRemoveFilter}
          onClearAll={state.handleClearFilters}
          dimensionUnits={dimensionUnits}
        />
        <div className="xyz-embed-page-transition xyz-embed-show">
          <ProductList
            products={state.products}
            filters={state.selectedFilters}
            loading={state.loading}
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
