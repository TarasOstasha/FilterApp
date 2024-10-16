import React from 'react';
import styles from './ProductList.module.scss'; // Import CSS module

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

const ProductList: React.FC<ProductListProps> = ({ products = [], filters, loading }) => {
 
  // Function to check if a product matches the selected filters
  const productMatchesFilters = (product: Product) => {
    for (const [filterField, selectedValues] of Object.entries(filters)) {
      if (filterField === 'Product Type' && !selectedValues.includes(product.product_name)) {
        return false;
      }
    }
    return true;
  };

  // Filter the products based on the selected filters
  const filteredProducts = products.filter(productMatchesFilters);
  
  if (loading) {
    return <p>Loading products...</p>;
  }

  return (
    <div className={styles.xyzProductList}>
      {/* {JSON.stringify(filteredProducts)} */}
      {products.length === 0 ? (
        <p>No products match the selected filters.</p>
      ) : (
        products.map((product) => (
          <a href={product.product_link} key={product.id} className={styles.xyzProductItem}>
            <img src={product.product_img_link} alt={product.product_name} />
            <h3 className={styles.xyzPname}>{product.product_name}</h3>
            <p className={styles.xyzPprice}>Our Price: {`$${product.product_price.toFixed(2).toLocaleString()}`}</p>
            {/* <p>{JSON.stringify(product)}</p> */}
          </a>
        ))
      )}
    </div>
  );
};

export default ProductList;
