import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MegaFilter.module.scss';
import { fetchMegaFilteredProductsFromAPI } from '../../api';
import { debounce } from 'throttle-debounce';



interface Product {
    id: number;
    product_name: string;
    product_code: string;
    product_link: string;
    product_img_link: string;
    product_price: number;
}

interface ProductListProps {
    // products: Product[];
    filters: { [key: string]: string[] };
    loading: boolean;
}


const MegaFilter: React.FC<ProductListProps> = ({ filters, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');  
    const [megaFilteredProducts, setMegaFilteredProducts] = useState<Product[]>([]);  
    const [isLoading, setIsLoading] = useState(false);  
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();  
        }
    }, [searchTerm, megaFilteredProducts]);

    const debouncedFetchProducts = useCallback(
        debounce(1500, async (term: string) => {
            if (term.trim() === '') {
                setMegaFilteredProducts([]);  
                return;
            }
            setIsLoading(true);  
            try {
                const response = await fetchMegaFilteredProductsFromAPI(term);
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
        }),
        []  
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
        debouncedFetchProducts(newSearchTerm); 
    };

    if (loading || isLoading) {
        return <p>Loading products...</p>;  
    }



    return (
        <div>
            {/* Search Input */}
            <input
                ref={inputRef}
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
            />

            {/* Product List */}
            <div className={styles.xyzProductList}>
                {searchTerm && megaFilteredProducts.length === 0 ? (
                    <p>No products match your search criteria.</p>
                ) : (
                    megaFilteredProducts.map((product) => (
                        <a href={product.product_link} key={product.id} className={styles.xyzProductItem}>
                            <img src={product.product_img_link} alt={product.product_name} />
                            <h3 className={styles.xyzPname}>{product.product_name}</h3>
                            <p className={styles.xyzPprice}>Our Price: {`$${product.product_price.toFixed(2).toLocaleString()}`}</p>
                        </a>
                    ))
                )}
            </div>

            {megaFilteredProducts.length > 0 && <hr />} 
        </div>
    );
};

export default MegaFilter;













// { OLD VERSION }
// const defaultProducts: Product[] = [
//     {
//         id: 1,
//         product_code: "ab013",
//         product_name: "47in x 24in x 12in Top Loading Molded Panel Case",
//         product_link: "https://www.xyzdisplays.com/5PCC-02-Top-Loading-Molded-Panel-Case-p/ab013.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/ab013-1.jpg",
//         product_price: 536,
//     },
//     {
//         id: 2,
//         product_code: "AB10102",
//         product_name: "39in x 20in x 17in Molded Hard Shipping Case (4200 Part B)",
//         product_link: "https://www.xyzdisplays.com/Molded-Hard-Shipping-Case-4200-Part-B-p/AB10102.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10102-1.jpg",
//         product_price: 389,
//     },
//     {
//         id: 3,
//         product_code: "AB10103",
//         product_name: "36in x 26in x 14in Molded Shipping Case for Pop-Up Displays w/ Lock (4300 Vault)",
//         product_link: "https://www.xyzdisplays.com/Molded-Shipping-Case-for-Pop-Up-Displays-with-Lo-p/AB10103.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10103-1.jpg",
//         product_price: 670,
//     },
//     {
//         id: 4,
//         product_code: "AB10104",
//         product_name: "38.5in x 26in x 15in All-In-One Molded Oval Shipping Case (4400)",
//         product_link: "https://www.xyzdisplays.com/All-In-One-Molded-Oval-Shipping-Case-4400-p/AB10104.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10104-1.jpg",
//         product_price: 389,
//     },
//     {
//         id: 5,
//         product_code: "AB10105",
//         product_name: "36in x 16in x 12in Molded Shipping Case for Pop-Up Express (4100)",
//         product_link: "https://www.xyzdisplays.com/36-x-16-x-12-Molded-Shipping-Case-for-Pop-Up-E-p/AB10105.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10105-1.jpg",
//         product_price: 389,
//     },
//     {
//         id: 6,
//         product_code: "AB10106",
//         product_name: "37.5in x 25in x 16in All-In-One Molded Shipping Case (4600)",
//         product_link: "https://www.xyzdisplays.com/37.5-x-25-x-16-All-In-One-Molded-Shipping-Case-p/AB10106.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10106-1.jpg",
//         product_price: 455,
//     },
//     {
//         id: 7,
//         product_code: "AB10200",
//         product_name: "34in x 14in Hard Case for Abex Banner Stands (850)",
//         product_link: "https://www.xyzdisplays.com/14in-x-34-Hard-Case-for-Abex-850-Bannerstands-p/AB10200.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10200-1.jpg",
//         product_price: 151,
//     },
//     {
//         id: 8,
//         product_code: "AB10201",
//         product_name: "37in x 14in x 7.5in Wheeled Nylon Case for Curve Display System",
//         product_link: "https://www.xyzdisplays.com/Wheeled-Nylon-Case-for-Curve-Display-System-p/AB10201.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10201-1.jpg",
//         product_price: 329,
//     },
//     {
//         id: 9,
//         product_code: "AB10300",
//         product_name: "33in x 14in Cylindrical Molded Shipping Case (4106)",
//         product_link: "https://www.xyzdisplays.com/14-x-33-Cylindrical-Molded-Shipping-Case-p/AB10300.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10300-1.jpg",
//         product_price: 281,
//     },
//     {
//         id: 10,
//         product_code: "AB10301",
//         product_name: "26in x 12in Molded Hard Shipping Case for Graphics",
//         product_link: "https://www.xyzdisplays.com/12-x-26-Molded-Hard-Shipping-Case-for-Graphics-p/AB10301.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10301-1.jpg",
//         product_price: 168,
//     },
//     {
//         id: 11,
//         product_code: "AB10302",
//         product_name: "38in x 12in Molded Hard Shipping Case (4151)",
//         product_link: "https://www.xyzdisplays.com/12-x-38-Molded-Hard-Shipping-Case-for-Graphics-p/AB10302.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10302-1.jpg",
//         product_price: 194,
//     },
//     {
//         id: 12,
//         product_code: "AB10303",
//         product_name: "50in x 12in Molded Hard Shipping Case (4152)",
//         product_link: "https://www.xyzdisplays.com/12-x-50-Molded-Hard-Shipping-Case-for-Graphics-p/AB10303.htm",
//         product_img_link: "https://www.xyzDisplays.com/v/vspfiles/photos/AB10303-1.jpg",
//         product_price: 221,
//     },
// ];
// Input component
// interface SearchInputProps {
//     searchTerm: string;
//     handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
// }
// const MegaFilter: React.FC<ProductListProps> = ({ filters, loading }) => {
//     const [searchTerm, setSearchTerm] = useState('');
//     const [megaFilteredProducts, setMegaFilteredProducts] = useState<Product[]>([]);
//     const [isLoading, setIsLoading] = useState(false);
//     const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

//     // useEffect(() => {
//     //     const fetchProducts = async () => {
//     //         setIsLoading(true);
//     //         const response = await fetchMegaFilteredProductsFromAPI(searchTerm);
//     //         if (response && response.data) {
//     //             setMegaFilteredProducts(response.data);
//     //         }
//     //         setIsLoading(false);
//     //     };
//     //     console.log(megaFilteredProducts);
//     //     fetchProducts();
//     // }, [searchTerm]);
//     ///////// ------------
//     // useEffect(() => {
//     //     const fetchProducts = async () => {
//     //         setIsLoading(true);
//     //         console.log(debouncedSearchTerm);
//     //         const response = await fetchMegaFilteredProductsFromAPI(debouncedSearchTerm);

//     //         if (response && Array.isArray(response.data)) {
//     //             setMegaFilteredProducts(response.data);
//     //         } else {
//     //             setMegaFilteredProducts([]); // Handle cases where data is not an array
//     //         }

//     //         setIsLoading(false);
//     //     };

//     //     fetchProducts();
//     // }, [debouncedSearchTerm]); 

//     // Debounce the search term to avoid filtering on every keystroke
//     // useEffect(() => {
//     //     const handler = setTimeout(() => {
//     //         setDebouncedSearchTerm(searchTerm);
//     //     }, 500); // 500ms delay

//     //     return () => {
//     //         clearTimeout(handler); // Clear timeout if searchTerm changes before the delay
//     //     };
//     // }, [searchTerm]);

//     // // Filter products locally from defaultProducts based on debouncedSearchTerm
//     // useEffect(() => {
//     //     if (debouncedSearchTerm) {
//     //         const filteredProducts = defaultProducts.filter((product) =>
//     //             product.product_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
//     //         );
//     //         setMegaFilteredProducts(filteredProducts);
//     //     } else {
//     //         setMegaFilteredProducts([]); // Empty the list if no search term is entered
//     //     }
//     // }, [debouncedSearchTerm]);

    
//     // Debounce the searchTerm to avoid fetching on every keystroke
    
//     useEffect(() => {
//         const handler = setTimeout(() => {
//             setDebouncedSearchTerm(searchTerm); // Update the debounced term after 1000ms delay
//         }, 1000); // 100ms delay

//         // Cleanup the timeout if searchTerm changes before the delay ends
//         return () => {
//             clearTimeout(handler);
//         };
//     }, [searchTerm]); // Effect runs whenever searchTerm changes

//     // Effect to fetch products based on the debouncedSearchTerm
//     useEffect(() => {
//         if (debouncedSearchTerm.trim() === '') {
//             setMegaFilteredProducts([]); 
//             return;
//         }

//         const fetchProducts = async () => {
//             setIsLoading(true);

//             try {
//                 console.log(debouncedSearchTerm); 
//                 const response = await fetchMegaFilteredProductsFromAPI(debouncedSearchTerm);

//                 if (response && Array.isArray(response.data)) {
//                     setMegaFilteredProducts(response.data);
//                 } else {
//                     setMegaFilteredProducts([]); 
//                 }
//             } catch (error) {
//                 console.error('Error fetching products:', error);
//                 setMegaFilteredProducts([]); 
//             } finally {
//                 setIsLoading(false); 
//             }
//         };

//         fetchProducts();
//     }, [debouncedSearchTerm]); // Fetch products only when debouncedSearchTerm changes
    
    
//     const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setSearchTerm(e.target.value); // Update the search term on input change
//     };

//     if (loading || isLoading) {
//         return <p>Loading products...</p>;
//     }

//     return (
//         <div>
//             <SearchInput searchTerm={searchTerm} handleSearchChange={handleSearchChange} />
//             <div className={styles.xyzProductList}>
//                 {debouncedSearchTerm && megaFilteredProducts.length === 0 ? (
//                     <p>No products match your search criteria.</p>
//                 ) : (
//                     megaFilteredProducts.map((product) => (
//                         <a href={product.product_link} key={product.id} className={styles.xyzProductItem}>
//                             <img src={product.product_img_link} alt={product.product_name} />
//                             <h3 className={styles.xyzPname}>{product.product_name}</h3>
//                             <p className={styles.xyzPprice}>Our Price: {`$${product.product_price.toFixed(2).toLocaleString()}`}</p>
//                         </a>
//                     ))
//                 )}
//             </div>
//             {megaFilteredProducts.length > 0 && <hr />}
//         </div>
//     );
// };