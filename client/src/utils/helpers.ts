/** Category ID from Volusion-style pathname only (e.g. …/752.htm → "752"). */
export const getCategoryIdFromPathname = (): string => {
  try {
    const pathMatch = window.location.pathname.match(/\/(\d+)\.htm(?:$|\?)/i);
    return pathMatch ? pathMatch[1] : '';
  } catch {
    return '';
  }
};

/** Resolved category ID for API calls and filter logic. */
export const getCategoryIdFromPath = (): string => {
  try {
    if (process.env.NODE_ENV === 'development') {
      const testCategoryId = localStorage.getItem('testCategoryId');
      if (testCategoryId?.trim()) {
        return testCategoryId.trim();
      }
    }

    const fromPathname = getCategoryIdFromPathname();
    if (fromPathname) {
      return fromPathname;
    }

    const fromQuery = new URLSearchParams(window.location.search).get('catId');
    if (fromQuery?.trim()) {
      return fromQuery.trim();
    }

    return '';
  } catch {
    return '';
  }
};
