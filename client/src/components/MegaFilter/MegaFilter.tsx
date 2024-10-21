import React, { useState } from 'react';
import styles from './MegaFilter.module.scss'; 



interface Product {
    id: number;
    product_name: string;
    product_code: string;
    product_link: string;
    product_img_link: string;
    product_price: number;
  }
  
  interface ProductListProps {
    products: Product[];
    filters: { [key: string]: string[] };
    loading: boolean;
  }




  const MegaFilter: React.FC<ProductListProps> = ({ products = [], filters, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };
    const filteredProducts = products.filter((product) =>
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <p>Loading products...</p>;
      }

      return (
        <div>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={handleSearchChange}
          className={styles.searchInput}
        />

        {/* Product List */}
        <div className={styles.xyzProductList}>
                {/* Search Input */}

          {filteredProducts.length === 0 ? (
            <p>No products match your search criteria.</p>
          ) : (
            filteredProducts.map((product) => (
              <a href={product.product_link} key={product.id} className={styles.xyzProductItem}>
                <img src={product.product_img_link} alt={product.product_name} />
                <h3 className={styles.xyzPname}>{product.product_name}</h3>
                <p className={styles.xyzPprice}>Our Price: {`$${product.product_price.toFixed(2).toLocaleString()}`}</p>
              </a>
            ))
          )}
        </div>
      </div>
      )

}



export default MegaFilter;