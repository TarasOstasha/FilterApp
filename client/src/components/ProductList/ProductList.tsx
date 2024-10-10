// import React from 'react';
// import styles from './ProductList.module.scss';

// interface Product {
//   id: number;
//   name: string;
//   productLink: string;
//   productImgLink: string;
//   price: number;
// }

// interface ProductListProps {
//   products: Product[];
// }

// const ProductList: React.FC<ProductListProps> = ({ products }) => {
//   return (
//     <div className="xyzProductList">
//       {products.length === 0 ? (
//         <p>No products available</p>
//       ) : (
//         products.map((product) => (
//           <div className="xyzProductItem" key={product.id}>
//             <div className="xyzProductItemInner">
//               <a
//                 href={product.productLink}
//                 title={product.name}
//                 className="xyzProductLink"
//               >
//                 <img
//                   src={product.productImgLink}
//                   alt={product.name}
//                   title={product.name}
//                   className={styles.xyzProductImg}
//                 />
//               </a>
//               <div className="xyzProductDetail">
//                 <a
//                   href={product.productLink}
//                   className="xyzProductName"
//                   title={product.name}
//                 >
//                   {product.name}
//                 </a>
//                 <div className="xyzProductPrice">
//                   <div>
//                         <b>
//                           <span className="xyzText">Our Price:</span> ${product.price}
//                         </b>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         ))
//       )}
//     </div>
//   );
// };

// export default ProductList;

import React from 'react';
import styles from './ProductList.module.scss'; // Import CSS module

interface Product {
  id: number;
  name: string;
  productLink: string;
  productImgLink: string;
  price: number;
}

interface ProductListProps {
  products: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ products }) => {
  return (
    <div className={styles.xyzProductList}>
      {products.length === 0 ? (
        <p>No products available</p>
      ) : (
        products.map((product) => (
          <a href={product.productLink} className={styles.xyzProductItem} key={product.id}>
            <div className={styles.xyzProductDetail}>
              <img src={product.productImgLink} alt={product.name} />
              <h3 className={styles.xyzPname}>{product.name}</h3>
              <p className={styles.xyzPprice}>Our Price: ${product.price}</p>
            </div>
          </a>
        ))
      )}
    </div>
  );
};

export default ProductList;
