import React, { useState } from 'react';
import styles from './Home.module.scss';
import ProductList from '../../components/ProductList/ProductList';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';


import SortDropdown from '../../components/SortDropdown/SortDropdown';
import ItemsPerPageDropdown from '../../components/ItemsPerPageDropdown/ItemsPerPageDropdown';
import PaginationControls from '../../components/PaginationControls/PaginationControls';

const Home: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('');

  const BASE_PRODUCT_IMG_URL = 'https://cdn4.volusion.store/wgjfq-aujvw/v/vspfiles/photos/';
  const BASE_PRODUCT_URL = 'https://www.xyzdisplays.com/searchresults.asp?Search=';
  //https://www.xyzdisplays.com/searchresults.asp?Search=MK5200
  //https://www.xyzdisplays.com/24in-x-60in-Waveline-Tension-Fabric-Banner-Stand-p/mk5200.htm
  const products = [
    { id: 1,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 2,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 3,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 4,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 5,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 6,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 1,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 2,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 3,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 4,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 5,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 6,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 1,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 2,productCode: 'MK5530', name: '24in x 60in Banner Stand w/ Hand Sanitizer Dispenser', productLink: `${BASE_PRODUCT_URL}MK5530`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5530-1.jpg?v-cache=1717581834`, price: 286 },
    { id: 3,productCode: 'MK5480', name: '48in x 89in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5480-1.jpg?v-cache=1717581834`, price: 347 },
    { id: 4,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 },
    { id: 5,productCode: 'MK5282', name: '24in x 116in Waveline Tension Fabric Banner Stand (Double-Sided)', productLink: `${BASE_PRODUCT_URL}MK5282`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5280-1.jpg?v-cache=1717581834`, price: 297 },
    { id: 6,productCode: 'MK5200', name: '24in x 60in Waveline Tension Fabric Banner Stand (Single-Sided)', productLink: `${BASE_PRODUCT_URL}MK5200`, productImgLink:`${BASE_PRODUCT_IMG_URL}MK5200-1.jpg?v-cache=1717581834`, price: 222 }
  ];

  const filters = ['Category 1', 'Category 2', 'Category 3'];

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    console.log(`Filter selected: ${filter}`);
  };

  return (
    <div className={`container ${styles.home}`}>
      <div className="row">
        <div className="col-md-3">
          <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
        </div>
        <div className="col-md-9">
          <div className="controls d-flex justify-content-between">
            <SortDropdown />
            <ItemsPerPageDropdown />
          </div>
          <ProductList products={products} />
          <PaginationControls  />
        </div>
      </div>
    </div>
  );
};

export default Home;
