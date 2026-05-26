/** Base path for the product listing / filter page */
export const PRODUCTS_PATH = '/products';

export const buildProductsUrl = (queryString: string): string =>
  queryString ? `${PRODUCTS_PATH}?${queryString}` : PRODUCTS_PATH;
