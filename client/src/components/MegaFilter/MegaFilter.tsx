import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MegaFilter.module.scss';
import { fetchMegaFilteredProductsFromAPI } from '../../api';
import { getCategoryIdFromPath } from '../../utils/helpers';
import { debounce } from 'throttle-debounce';

// Helper: robust currency formatting
const formatPrice = (value: unknown): string => {
    const n =
        typeof value === 'number' ? value :
        typeof value === 'string' ? Number(value) :
        NaN;

    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface Product {
    id: number;
    product_name: string;
    product_code: string;
    product_link: string;
    product_img_link: string;
    product_price: number | null; // Allow null coming from API
}

interface ProductListProps {
    sortBy: string;
    filters: { [key: string]: string[] };
    loading: boolean;
    categoryId?: string;
    autoFocus?: boolean;
    onSearchResultIdsChange?: (ids: number[]) => void;
    onSearchActiveChange?: (active: boolean) => void;
}

const MegaFilter: React.FC<ProductListProps> = ({
    sortBy,
    filters,
    loading,
    categoryId = '',
    autoFocus = true,
    onSearchResultIdsChange,
    onSearchActiveChange,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [megaFilteredProducts, setMegaFilteredProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep focus while searching; skip initial mount so category pages stay at the top.
    useEffect(() => {
        if (!autoFocus || !inputRef.current || searchTerm.trim() === '') return;
        inputRef.current.focus();
    }, [autoFocus, searchTerm, megaFilteredProducts]);

    // Tell parent which product IDs are shown in search results (to dedupe the list below)
    useEffect(() => {
        const active = searchTerm.trim() !== '';
        onSearchActiveChange?.(active);

        if (!active) {
            onSearchResultIdsChange?.([]);
            return;
        }
        const ids = megaFilteredProducts.map((p) => p.id);
        onSearchResultIdsChange?.(ids);
    }, [searchTerm, megaFilteredProducts, onSearchResultIdsChange, onSearchActiveChange]);

    const resolveCategoryId = () => categoryId || getCategoryIdFromPath();

    // Immediate API call for fetching products (without delay)
    const fetchProductsImmediately = async (term: string, sortBy: string) => {
        if (term.trim() === '') {
            setMegaFilteredProducts([]);
            return;
        }

        setIsLoading(true);
        try {
            const catId = resolveCategoryId();
            const response = await fetchMegaFilteredProductsFromAPI(term, sortBy, catId || undefined);
            if (response && Array.isArray(response.data)) {
                setMegaFilteredProducts(response.data);
            } else {
                setMegaFilteredProducts([]);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            setMegaFilteredProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounced API call for search terms
    const debouncedFetchProducts = useCallback(
        debounce(1500, (term: string, sortBy: string) => {
            fetchProductsImmediately(term, sortBy);
        }),
        [sortBy]
    );

    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
        if (newSearchTerm.trim() === '') {
            setMegaFilteredProducts([]);
        }
        debouncedFetchProducts(newSearchTerm, sortBy); 
    };

    // Method to clear search and stop searching
    const clearSearch = () => {
        setSearchTerm('');
        setMegaFilteredProducts([]);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Trigger immediate product fetch when sortBy or category changes
    useEffect(() => {
        if (searchTerm.trim() !== '') {
            fetchProductsImmediately(searchTerm, sortBy);
        }
    }, [sortBy, categoryId]);

    const validSearchResults = megaFilteredProducts.filter((product) => {
        const hasValidPrice = typeof product.product_price === 'number' && !isNaN(product.product_price);
        const hasValidName = product.product_name && product.product_name.trim() !== '';
        const hasValidLink = product.product_link && product.product_link.trim() !== '';
        return hasValidPrice && hasValidName && hasValidLink;
    });

    return (
        <div>
            <div className={styles.searchContainer}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                />
                {searchTerm && (
                    <button 
                        onClick={clearSearch} 
                        className={styles.clearSearchButton}
                        aria-label="Clear search"
                        type="button"
                    >
                        ✕
                    </button>
                )}
            </div>

            {searchTerm.trim() !== '' && (
                <>
                    <div className={styles.xyzProductList}>
                        {isLoading ? (
                            <p>Searching...</p>
                        ) : validSearchResults.length === 0 ? (
                            <p>No products match your search criteria.</p>
                        ) : (
                            validSearchResults.map((product) => (
                                <a href={product.product_link} key={product.id} className={styles.xyzProductItem}>
                                    <img src={product.product_img_link} alt={product.product_name} />
                                    <h3 className={styles.xyzPname}>{product.product_name}</h3>
                                    <p className={styles.xyzPprice}>
                                        <span>Our Price: </span>{`$${formatPrice(product.product_price)}`}
                                    </p>
                                </a>
                            ))
                        )}
                    </div>
                    <hr className={styles.searchDivider} />
                </>
            )}

        </div>
    );
};

export default MegaFilter;
