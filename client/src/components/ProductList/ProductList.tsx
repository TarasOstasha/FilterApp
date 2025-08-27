// import React from 'react';
// import styles from './ProductList.module.scss'; // Import CSS module

// interface Product {
//   id: number;
//   product_name: string;
//   product_code: string;
//   product_link: string;
//   product_img_link: string;
//   product_price: number;
// }

// interface ProductListProps {
//   products: Product[];
//   filters: { [key: string]: string[] };
//   loading: boolean;
// }

// const ProductList: React.FC<ProductListProps> = ({ products = [], filters, loading }) => {

//   // Function to check if a product matches the selected filters
//   // const productMatchesFilters = (product: Product) => {
//   //   for (const [filterField, selectedValues] of Object.entries(filters)) {
//   //     if (filterField === 'Product Type' && !selectedValues.includes(product.product_name)) {
//   //       return false;
//   //     }
//   //   }
//   //   return true;
//   // };

//   // // Filter the products based on the selected filters
//   // const filteredProducts = products.filter(productMatchesFilters);

//   if (loading) {
//     return <p>Loading products...</p>;
//   }

//   return (
//     <div className={styles.xyzProductList}>
//       {/* {JSON.stringify(filteredProducts)} */}
//       {products.length === 0 ? (
//         <p>No products match the selected filters.</p>
//       ) : (
//         products.map((product) => (
//           <a href={product.product_link} key={product.id} className={styles.xyzProductItem}>
//             <img src={product.product_img_link} alt={product.product_name} />
//             <h3 className={styles.xyzPname}>{product.product_name}</h3>
//             <p className={styles.xyzPprice}>
//               Our Price: $
//               {product.product_price.toLocaleString('en-US', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2,
//               })}
//             </p>
//             {/* <p>{JSON.stringify(product)}</p> */}
//           </a>
//         ))
//       )}
//     </div>
//   );
// };

// export default ProductList;


// import React, { useEffect, useRef, useState } from 'react';
// import styles from './ProductList.module.scss';
// import noPhoto from './nophoto.gif';

// interface Product {
//   id: number;
//   product_name: string;
//   product_code: string;
//   product_link: string;
//   product_img_link: string;
//   product_price: number;
// }

// interface ProductListProps {
//   products: Product[];
//   filters: { [key: string]: string[] };
//   loading: boolean;
// }

// /** Image component: lazy-load + preload + retry + skeleton + fade-in */
// const ImageWithRetry: React.FC<{
//   src: string;
//   alt: string;
//   className?: string;
//   fallbackSrc?: string;
//   maxRetries?: number;
//   rootMargin?: string;
// }> = ({
//   src,
//   alt,
//   className,
//   fallbackSrc = noPhoto,
//   maxRetries = 3,
//   rootMargin = '200px',
// }) => {
//   const hostRef = useRef<HTMLDivElement | null>(null);
//   const [inView, setInView] = useState(false);

//   // what we actually render to <img src=...>
//   const [displaySrc, setDisplaySrc] = useState<string | undefined>(undefined);
//   const [loaded, setLoaded] = useState(false);
//   const [attempt, setAttempt] = useState(0);

//   // reset if src prop changes (same component instance reused)
//   useEffect(() => {
//     setDisplaySrc(undefined);
//     setLoaded(false);
//     setAttempt(0);
//   }, [src]);

//   // Observe viewport entry
//   useEffect(() => {
//     const el = hostRef.current;
//     if (!el) return;

//     if (!('IntersectionObserver' in window)) {
//       setInView(true);
//       return;
//     }
//     const io = new IntersectionObserver(
//       (entries) => {
//         if (entries.some((e) => e.isIntersecting)) {
//           setInView(true);
//           io.disconnect();
//         }
//       },
//       { rootMargin }
//     );
//     io.observe(el);
//     return () => io.disconnect();
//   }, [rootMargin]);

//   // Preload logic: only assign to <img> after load succeeds (or fallback after retries)
//   useEffect(() => {
//     if (!inView) return;
//     let cancelled = false;

//     const tryLoad = (n: number) => {
//       const img = new Image();
//       img.decoding = 'async';
//       img.loading = 'eager';
//       img.onload = () => {
//         if (cancelled) return;
//         setDisplaySrc(src);
//         setLoaded(true);
//       };
//       img.onerror = () => {
//         if (cancelled) return;
//         if (n < maxRetries) {
//           const delay = 150 * Math.pow(2, n); // 150, 300, 600...
//           setTimeout(() => {
//             setAttempt((a) => a + 1);
//             tryLoad(n + 1);
//           }, delay);
//         } else {
//           // Give up → fallback
//           setDisplaySrc(fallbackSrc);
//           setLoaded(true);
//         }
//       };
//       // add tiny cache-buster on retries
//       img.src = n === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}r=${n}`;
//     };

//     tryLoad(attempt);

//     return () => { cancelled = true; };
//     // keep src out of deps to avoid restarting midflight
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [inView, maxRetries, fallbackSrc]);

//   return (
//     <div ref={hostRef} className={styles.imageHost}>
//       {/* Skeleton while we don't have a displayable src yet */}
//       {!displaySrc && <div className={styles.skeleton} aria-hidden="true" />}

//       {/* Fade-in image once loaded (or fallback decided) */}
//       {displaySrc && (
//         <img
//           src={displaySrc}
//           alt={alt}
//           className={`${className ?? ''} ${loaded ? styles.imgLoaded : styles.imgLoading}`}
//           loading="lazy"
//           decoding="async"
//           onLoad={() => setLoaded(true)} // ensures class flips even if cached
//         />
//       )}
//     </div>
//   );
// };

// const ProductList: React.FC<ProductListProps> = ({ products = [], filters, loading }) => {
//   if (loading) return <p>Loading products...</p>;

//   return (
//     <div className={styles.xyzProductList} role="list">
//       {products.length === 0 ? (
//         <p>No products match the selected filters.</p>
//       ) : (
//         products.map((product) => (
//           <a
//             href={product.product_link}
//             key={product.id}
//             className={styles.xyzProductItem}
//             role="listitem"
//           >
//             <ImageWithRetry
//               src={product.product_img_link}
//               alt={product.product_name}
//               className={styles.productImage}
//               fallbackSrc={noPhoto}
//               maxRetries={3}
//             />
//             <h3 className={styles.xyzPname}>{product.product_name}</h3>
//             <p className={styles.xyzPprice}>
//               Our Price: $
//               {product.product_price.toLocaleString('en-US', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2,
//               })}
//             </p>
//           </a>
//         ))
//       )}
//     </div>
//   );
// };

// export default ProductList;


import React, { useEffect, useRef, useState } from 'react';
import styles from './ProductList.module.scss';
import noPhoto from './nophoto.gif';

interface Product {
  id: number;
  product_name: string;
  product_code: string;
  product_link: string;
  product_img_link: string;
  product_price: number | null; // ← allow null coming from API
}

interface ProductListProps {
  products: Product[] | null | undefined; // ← be defensive
  filters: { [key: string]: string[] };
  loading: boolean;
}

/** Image component: lazy-load + preload + retry + skeleton + fade-in */
const ImageWithRetry: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  maxRetries?: number;
  rootMargin?: string;
}> = ({
  src,
  alt,
  className,
  fallbackSrc = noPhoto,
  maxRetries = 3,
  rootMargin = '200px',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  const [displaySrc, setDisplaySrc] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) { setInView(true); io.disconnect(); }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;

    const tryLoad = (n: number) => {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.onload = () => { if (!cancelled) { setDisplaySrc(src); setLoaded(true); } };
      img.onerror = () => {
        if (cancelled) return;
        if (n < maxRetries) {
          const delay = 150 * Math.pow(2, n);
          setTimeout(() => { setAttempt(a => a + 1); tryLoad(n + 1); }, delay);
        } else {
          setDisplaySrc(fallbackSrc);
          setLoaded(true);
        }
      };
      img.src = n === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}r=${n}`;
    };

    tryLoad(attempt);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, maxRetries, fallbackSrc]);

  return (
    <div ref={hostRef} className={styles.imageHost}>
      {!displaySrc && <div className={styles.skeleton} aria-hidden="true" />}
      {displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          className={`${className ?? ''} ${loaded ? styles.imgLoaded : styles.imgLoading}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
};

// helper: robust currency formatting
const formatPrice = (value: unknown): string => {
  const n =
    typeof value === 'number' ? value :
    typeof value === 'string' ? Number(value) :
    NaN;

  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ProductList: React.FC<ProductListProps> = ({ products = [], filters, loading }) => {
  if (loading) return <p>Loading products...</p>;

  const list = Array.isArray(products) ? products : [];

  return (
    <div className={styles.xyzProductList} role="list">
      {list.length === 0 ? (
        <p>No products match the selected filters.</p>
      ) : (
        list.map((product) => (
          <a
            href={product.product_link}
            key={product.id}
            className={styles.xyzProductItem}
            role="listitem"
          >
            <ImageWithRetry
              src={product.product_img_link}
              alt={product.product_name}
              className={styles.productImage}
              fallbackSrc={noPhoto}
              maxRetries={3}
            />
            <h3 className={styles.xyzPname}>{product.product_name}</h3>
            <p className={styles.xyzPprice}>Our Price: ${formatPrice(product.product_price)}</p>
          </a>
        ))
      )}
    </div>
  );
};

export default ProductList;
