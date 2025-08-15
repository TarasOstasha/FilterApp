// import React, { useState, useEffect, useRef } from 'react';
// import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
// import ProductList from '../../components/ProductList/ProductList';
// import SortDropdown from '../../components/SortDropdown/SortDropdown';
// import ItemsPerPageDropdown from '../../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
// import PaginationControls from '../../components/PaginationControls/PaginationControls';
// import { fetchProductsFromAPI } from '../../api';
// import MegaFilter from '../../components/MegaFilter/MegaFilter';
// import styles from './Home.module.scss';


// interface Product {
//   id: number;
//   product_name: string;
//   product_code: string;
//   product_link: string;
//   product_img_link: string;
//   product_price: number;
// }

// const Home: React.FC = () => {
//   const firstRender = useRef(true);
//   const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
//   const [products, setProducts] = useState<Product[]>([]);
//   const [itemsPerPage, setItemsPerPage] = useState(27); // Set default items per page
//   const [currentPage, setCurrentPage] = useState(1); // Set current page
//   const [visibleProducts, setVisibleProducts] = useState(itemsPerPage);
//   const [totalProducts, setTotalProducts] = useState(0); // Track total products
//   const [loading, setLoading] = useState(false);
//   //const [sortBy, setSortBy] = useState('price_asc');
//   const [sortBy, setSortBy] = useState(() => {
//     const params = new URLSearchParams(window.location.search);
//     return params.get('sortBy') || 'price_asc'; // Default to 'price_asc'
//   });

//   const handleFilterChange = (filter: { field: string; value: string }) => {
//     const { field, value } = filter;
//     setSelectedFilters((prevFilters) => {
//       const currentValues = prevFilters[field] || [];
//       const newFilters = { ...prevFilters };

//       if (value.includes(',')) {
//         // Range => override
//         newFilters[field] = [value];
//       } else {
//         // Checkbox => toggle
//         if (currentValues.includes(value)) {
//           newFilters[field] = currentValues.filter((v) => v !== value);
//         } else {
//           newFilters[field] = [...currentValues, value];
//         }
//       }

//       if (newFilters[field].length === 0) {
//         delete newFilters[field];
//       }

//       // Update URL
//       const params = new URLSearchParams();
//       Object.keys(newFilters).forEach((key) => {
//         if (newFilters[key]?.length) {
//           params.set(key, newFilters[key].join(','));
//         }
//       });
//       window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
//       return newFilters;
//     });
//   };

  
//   const handleSortChange = (sortMethod: string) => {
//     console.log(sortMethod, 'sortMethod');
//     setSortBy(sortMethod); // Set sort method when user changes the dropdown

//     const params = new URLSearchParams(window.location.search);
//     params.set('sortBy', sortMethod);
//     window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

//      // Fetch sorted products
//     //fetchProducts();
//   };


//   const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const newItemsPerPage = Number(e.target.value);
//     setItemsPerPage(newItemsPerPage);
//     setCurrentPage(1);
//     setVisibleProducts(newItemsPerPage);

//     // Update the query parameters in the URL
//     const params = new URLSearchParams(window.location.search);
//     params.set('limit', newItemsPerPage.toString()); // Set new limit
//     params.set('offset', '0'); // Reset offset when items per page changes
//     window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
//     fetchProducts();
//   };

//   const handleClearFilters = () => {
//     console.log('clearing filters', selectedFilters);
//     setSelectedFilters({});
//     const newUrl = window.location.pathname;
//     window.history.replaceState({}, '', newUrl);
//   };
//   // const handlePageChange = (page: number) => {
//   //   setCurrentPage(page);
//   // };
//   const handlePageChange = (page: number) => {
//     setCurrentPage(page);
//     const newOffset = (page - 1) * itemsPerPage;

//     // Update the query parameters in the URL
//     const params = new URLSearchParams(window.location.search);
//     params.set('limit', itemsPerPage.toString());
//     params.set('offset', newOffset.toString());

//     window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
//     fetchProducts();
//   };


//   // const handleLoadMore = () => {
//   //   setVisibleProducts((prev) => prev + itemsPerPage);
//   // };

//   const handleLoadMore = () => {
//     setCurrentPage((prevPage) => prevPage + 1); // Move to the next page
//     setVisibleProducts((prevVisible) => {
//       const newVisible = prevVisible + itemsPerPage;

//       // Update the query parameters in the URL
//       //const params = new URLSearchParams(window.location.search);
//       //params.set('limit', itemsPerPage.toString()); // Set new limit
//       //params.set('offset', (currentPage*itemsPerPage).toString()); // Reset offset when items per page changes
//      // window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

//       return newVisible > totalProducts ? totalProducts : newVisible; // Cap visibleProducts at totalProducts
//     });
//     if (visibleProducts < totalProducts) {
//       fetchProducts(); // Fetch more products from the backend only if there are more to fetch
//     }

//     // setVisibleProducts((prevVisible) => prevVisible + itemsPerPage); // Load more items
//     // setCurrentPage(currentPage + 1); // Move to next page
//     // fetchProducts(); // Fetch more products from backend
//   };

//   const fetchProducts = async () => {
//     setLoading(true);
//     //console.log(sortBy, 'sortBy fetchProducts');
//     try {
//       const queryParams = new URLSearchParams();
//       queryParams.set('limit', itemsPerPage.toString());
//       queryParams.set('offset', ((currentPage - 1) * itemsPerPage).toString());
//       queryParams.set('sortBy', sortBy); // Use set instead of append
//       //queryParams.set('itemsPerPage', itemsPerPage.toString());
//       //queryParams.append('itemsPerPage', itemsPerPage.toString())
//       // Append selected filters to the query
      
//       // Object.keys(selectedFilters).forEach((key) => {
//       //   queryParams.append(key, selectedFilters[key].join(','));
//       // });
//       Object.keys(selectedFilters).forEach((key) => {
//         if (key === 'sortBy') return; // skip if for some reason it appears
//         queryParams.append(key, selectedFilters[key].join(','));
//       });

//       //const response = await axios.get(`http://localhost:5000/api/products?${queryParams.toString()}`);
//       const response = await fetchProductsFromAPI(queryParams);
//       //console.log(response?.data, 'response products');
//       if (response && response.data) {
//         setProducts(response.data.products);
//         setTotalProducts(response.data.totalProducts);
//       } else {
//         console.error('No data received');
//       }
//       //setProducts(response.data.products); 
//       //setTotalProducts(response.data.totalProducts); 
//     } catch (error) {
//       console.error('Error fetching products:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Debounce the fetch call
//     const timer = setTimeout(() => {
//       fetchProducts();
//     }, 300); 
  
//     return () => clearTimeout(timer); // clear if effect re-runs quickly
//   }, [selectedFilters, currentPage, itemsPerPage, sortBy]);

//   // useEffect(() => {
//   //   fetchFilterSidebarData();
//   // }, []);

//   useEffect(() => {
//     const valrangeDigits = ['Product Price', 'Display Width', 'Display Height'];
//     const params = new URLSearchParams(window.location.search);
//     const restoredFilters: { [key: string]: string[] } = {};

//     // params.forEach((value, key) => {
//     //   const decodedKey = key.replace(/\+/g, ' ');
//     //   restoredFilters[decodedKey] = value.split(',');
//     // });
//     params.forEach((val, key) => {
//       const decodedKey = key.replace(/\+/g, ' ');
//       if (valrangeDigits.includes(decodedKey)) {
//         // For range fields, store as a single string
//         restoredFilters[decodedKey] = [val];
//       } else {
//         // For checkbox fields, split them
//         restoredFilters[decodedKey] = val.split(',');
//       }
//     });
    
//     setSelectedFilters(restoredFilters);

//   }, []);
  
//   useEffect(() => {
//     if (firstRender.current) { firstRender.current = false; return; }
//     // jump or smooth — your choice
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   }, [currentPage]);

  
//   const totalPages = Math.ceil(totalProducts / itemsPerPage);



//   return (
//     <div className="container">
//       <div className="row">
//         <div className="col-md-3">
//           <FilterSidebar onFilterChange={handleFilterChange} selectedFilters={selectedFilters} />
//           <button className={styles.clearFiltersButton} onClick={handleClearFilters}>
//               Clear Filters
//           </button>
//         </div>
//         <div className="col-md-9">
//           <div className="controls d-flex justify-content-between">
//             <SortDropdown handleSortChange={handleSortChange} currentSort={sortBy} />
//             <ItemsPerPageDropdown itemsPerPage={itemsPerPage} handleItemsPerPageChange={handleItemsPerPageChange} />
//           </div>
//           {/* <MegaFilter products={products} filters={selectedFilters} loading={loading} /> */}
//           <br />
//           <MegaFilter sortBy={sortBy} filters={selectedFilters} loading={loading} />
//           <ProductList products={products} filters={selectedFilters} loading={loading} />
//           <PaginationControls
//             currentPage={currentPage}
//             totalPages={totalPages}
//             onPageChange={handlePageChange}
//             visibleProducts={visibleProducts}
//             totalProducts={totalProducts}
//             onLoadMore={handleLoadMore}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };




// export default Home;


import React, { useState, useEffect, useRef } from 'react';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import ProductList from '../../components/ProductList/ProductList';
import SortDropdown from '../../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../../components/PaginationControls/PaginationControls';
import { fetchProductsFromAPI } from '../../api';
import MegaFilter from '../../components/MegaFilter/MegaFilter';
import styles from './Home.module.scss';

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
    const sp = new URLSearchParams(window.location.search);

    if (typeof next.limit === 'number') sp.set('limit', String(next.limit));
    if (typeof next.offset === 'number') sp.set('offset', String(next.offset));
    if (typeof next.sortBy === 'string') sp.set('sortBy', next.sortBy);

    if (next.filters) {
      // remove all existing filter keys first (except meta keys)
      const meta = new Set(['limit', 'offset', 'sortBy']);
      Array.from(sp.keys()).forEach(k => { if (!meta.has(k)) sp.delete(k); });

      // then write current filters
      Object.entries(next.filters).forEach(([k, arr]) => {
        if (arr?.length) sp.set(k, arr.join(','));
      });
    }

    window.history.replaceState({}, '', `${window.location.pathname}?${sp.toString()}`);
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
      const decodedKey = rawKey.replace(/\+/g, ' ');
      if (valrangeDigits.includes(decodedKey)) {
        restored[decodedKey] = [val];     // range fields stored as single "min,max"
      } else {
        restored[decodedKey] = val.split(','); // checkbox fields split
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

      Object.keys(selectedFilters).forEach((key) => {
        if (key === 'sortBy') return;
        qp.append(key, selectedFilters[key].join(','));
      });

      const response = await fetchProductsFromAPI(qp);
      if (response?.data) {
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



