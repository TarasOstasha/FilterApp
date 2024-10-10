import React, { useState } from 'react';
import styles from './Home.module.scss';
import ProductList from '../../components/ProductList/ProductList';

import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';


import SortDropdown from '../../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../../components/PaginationControls/PaginationControls';

const Home: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
  const [itemsPerPage, setItemsPerPage] = useState(27); // Set default items per page
  const [currentPage, setCurrentPage] = useState(1); // Set current page
  const [visibleProducts, setVisibleProducts] = useState(itemsPerPage);

  //https://apgexhibits.com/ProductDetails.asp?ProductCode=WLM-ACH2420-TDK
  const BASE_PRODUCT_IMG_URL = 'https://cdn4.volusion.store/wgjfq-aujvw/v/vspfiles/photos/';
  const BASE_PRODUCT_URL = 'https://www.xyzdisplays.com/ProductDetails.asp?ProductCode=';
  const products = [
    { id: 1,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 2,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 3,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 4,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 5,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 6,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 7,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 8,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 9,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 10,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 11,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 12,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 13,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 14,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 15,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 16,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 17,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 18,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 19,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 20,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 21,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 22,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 23,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 24,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 25,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 26,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 27,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 28,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 29,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 30,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 31,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 32,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 33,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 34,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 35,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 36,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 37,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 38,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 39,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 40,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 41,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 42,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 43,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 44,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 45,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 46,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 47,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 48,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 49,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 50,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 51,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 52,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 53,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 54,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 55,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 56,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 57,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 58,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 59,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 60,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 61,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 62,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 63,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 64,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 65,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 66,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 67,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 68,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 69,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 70,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 71,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 72,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 }
  ];

  // const filters = ['Category 1', 'Category 2', 'Category 3'];

  const handleFilterChange = (filter: { field: string; value: string }) => {
    setSelectedFilters((prevFilters) => {
      const { field, value } = filter;
      const newFilters = { ...prevFilters };
      if (!newFilters[field]) {
        newFilters[field] = [];
      }
      if (newFilters[field].includes(value)) {
        newFilters[field] = newFilters[field].filter((v) => v !== value);
      } else {
        newFilters[field].push(value);
      }
      return newFilters;
    });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); 
    setVisibleProducts(Number(e.target.value));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const newVisibleProducts = page * itemsPerPage;
    setVisibleProducts(newVisibleProducts); // Update visible products according to the page
  };

  const handleLoadMore = () => {
    setVisibleProducts((prev) => prev + itemsPerPage); 
  };

  // const paginatedProducts = products.slice(
  //   (currentPage - 1) * itemsPerPage,
  //   currentPage * itemsPerPage
  // );

  const paginatedProducts = products.slice(0, visibleProducts);
  const totalPages = Math.ceil(products.length / itemsPerPage);

  return (
    <div className="container">
      <div className="row">
        <div className="col-md-3">
          <FilterSidebar onFilterChange={handleFilterChange} />
        </div>
        <div className="col-md-9">
          {/* <h2>Product List</h2> */}
          {/* <ProductList filters={selectedFilters} /> */}
          <div className="controls d-flex justify-content-between">
            <SortDropdown />
            <ItemsPerPageDropdown itemsPerPage={itemsPerPage} handleItemsPerPageChange={handleItemsPerPageChange} />
          </div>
          <ProductList products={paginatedProducts} filters={selectedFilters} />
          <PaginationControls
              visibleProducts={visibleProducts}
              totalProducts={products.length}
              onLoadMore={handleLoadMore}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;



