import React, { useState, useEffect } from 'react';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import ProductList from '../../components/ProductList/ProductList';
import SortDropdown from '../../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../../components/PaginationControls/PaginationControls';
import { fetchProductsFromAPI } from '../../api';
import MegaFilter from '../../components/MegaFilter/MegaFilter';


interface Product {
  id: number;
  product_name: string;
  product_code: string;
  product_link: string;
  product_img_link: string;
  product_price: number;
}

const Home: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(27); // Set default items per page
  const [currentPage, setCurrentPage] = useState(1); // Set current page
  const [visibleProducts, setVisibleProducts] = useState(itemsPerPage);
  const [totalProducts, setTotalProducts] = useState(0); // Track total products
  const [loading, setLoading] = useState(false);
  //const [sortBy, setSortBy] = useState('price_asc');
  const [sortBy, setSortBy] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sortBy') || 'price_asc'; // Default to 'price_asc'
  });

  const handleFilterChange = (filter: { field: string; value: string }) => {
    const { field, value } = filter;
    setSelectedFilters((prevFilters) => {
      const currentValues = prevFilters[field] || [];
      const newFilters = { ...prevFilters };

      if (value.includes(',')) {
        // Range => override
        newFilters[field] = [value];
      } else {
        // Checkbox => toggle
        if (currentValues.includes(value)) {
          newFilters[field] = currentValues.filter((v) => v !== value);
        } else {
          newFilters[field] = [...currentValues, value];
        }
      }

      if (newFilters[field].length === 0) {
        delete newFilters[field];
      }

      // Update URL
      const params = new URLSearchParams();
      Object.keys(newFilters).forEach((key) => {
        if (newFilters[key]?.length) {
          params.set(key, newFilters[key].join(','));
        }
      });
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      return newFilters;
    });
  };

  
  const handleSortChange = (sortMethod: string) => {
    console.log(sortMethod, 'sortMethod');
    setSortBy(sortMethod); // Set sort method when user changes the dropdown

    const params = new URLSearchParams(window.location.search);
    params.set('sortBy', sortMethod);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

     // Fetch sorted products
    //fetchProducts();
  };


  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = Number(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setVisibleProducts(newItemsPerPage);

    // Update the query parameters in the URL
    const params = new URLSearchParams(window.location.search);
    params.set('limit', newItemsPerPage.toString()); // Set new limit
    params.set('offset', '0'); // Reset offset when items per page changes
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    fetchProducts();
  };


  // const handlePageChange = (page: number) => {
  //   setCurrentPage(page);
  // };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const newOffset = (page - 1) * itemsPerPage;

    // Update the query parameters in the URL
    const params = new URLSearchParams(window.location.search);
    params.set('limit', itemsPerPage.toString());
    params.set('offset', newOffset.toString());

    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    fetchProducts();
  };


  // const handleLoadMore = () => {
  //   setVisibleProducts((prev) => prev + itemsPerPage);
  // };

  const handleLoadMore = () => {
    setCurrentPage((prevPage) => prevPage + 1); // Move to the next page
    setVisibleProducts((prevVisible) => {
      const newVisible = prevVisible + itemsPerPage;

      // Update the query parameters in the URL
      //const params = new URLSearchParams(window.location.search);
      //params.set('limit', itemsPerPage.toString()); // Set new limit
      //params.set('offset', (currentPage*itemsPerPage).toString()); // Reset offset when items per page changes
     // window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

      return newVisible > totalProducts ? totalProducts : newVisible; // Cap visibleProducts at totalProducts
    });
    if (visibleProducts < totalProducts) {
      fetchProducts(); // Fetch more products from the backend only if there are more to fetch
    }

    // setVisibleProducts((prevVisible) => prevVisible + itemsPerPage); // Load more items
    // setCurrentPage(currentPage + 1); // Move to next page
    // fetchProducts(); // Fetch more products from backend
  };

  const fetchProducts = async () => {
    setLoading(true);
    console.log(sortBy, 'sortBy fetchProducts');
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('limit', itemsPerPage.toString());
      queryParams.set('offset', ((currentPage - 1) * itemsPerPage).toString());
      queryParams.set('sortBy', sortBy); // Use set instead of append
      //queryParams.set('itemsPerPage', itemsPerPage.toString());
      //queryParams.append('itemsPerPage', itemsPerPage.toString())
      // Append selected filters to the query
      
      // Object.keys(selectedFilters).forEach((key) => {
      //   queryParams.append(key, selectedFilters[key].join(','));
      // });
      Object.keys(selectedFilters).forEach((key) => {
        if (key === 'sortBy') return; // skip if for some reason it appears
        queryParams.append(key, selectedFilters[key].join(','));
      });

      //const response = await axios.get(`http://localhost:5000/api/products?${queryParams.toString()}`);
      const response = await fetchProductsFromAPI(queryParams);
      //console.log(response?.data, 'response products');
      if (response && response.data) {
        setProducts(response.data.products);
        setTotalProducts(response.data.totalProducts);
      } else {
        console.error('No data received');
      }
      //setProducts(response.data.products); 
      //setTotalProducts(response.data.totalProducts); 
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce the fetch call
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300); 
  
    return () => clearTimeout(timer); // clear if effect re-runs quickly
  }, [selectedFilters, currentPage, itemsPerPage, sortBy]);

  // useEffect(() => {
  //   fetchFilterSidebarData();
  // }, []);

  useEffect(() => {
    const valrangeDigits = ['Product Price', 'Display Width', 'Display Height'];
    const params = new URLSearchParams(window.location.search);
    const restoredFilters: { [key: string]: string[] } = {};

    // params.forEach((value, key) => {
    //   const decodedKey = key.replace(/\+/g, ' ');
    //   restoredFilters[decodedKey] = value.split(',');
    // });
    params.forEach((val, key) => {
      const decodedKey = key.replace(/\+/g, ' ');
      if (valrangeDigits.includes(decodedKey)) {
        // For range fields, store as a single string
        restoredFilters[decodedKey] = [val];
      } else {
        // For checkbox fields, split them
        restoredFilters[decodedKey] = val.split(',');
      }
    });
    
    setSelectedFilters(restoredFilters);

  }, []);
  

  const totalPages = Math.ceil(totalProducts / itemsPerPage);



  return (
    <div className="container">
      <div className="row">
        <div className="col-md-3">
          <FilterSidebar onFilterChange={handleFilterChange} selectedFilters={selectedFilters} />
        </div>
        <div className="col-md-9">
          <div className="controls d-flex justify-content-between">
            <SortDropdown handleSortChange={handleSortChange} currentSort={sortBy} />
            <ItemsPerPageDropdown itemsPerPage={itemsPerPage} handleItemsPerPageChange={handleItemsPerPageChange} />
          </div>
          {/* <MegaFilter products={products} filters={selectedFilters} loading={loading} /> */}
          <br />
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
  );
};




export default Home;