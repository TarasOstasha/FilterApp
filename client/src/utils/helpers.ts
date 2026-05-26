export const getCategoryIdFromPath = (): string => {
    try {
      const testCategoryId = localStorage.getItem('testCategoryId');
      if (testCategoryId?.trim()) {
        return testCategoryId.trim();
      }

      const path = window.location.pathname;
      const pathMatch = path.match(/\/(\d+)\.htm(?:$|\?)/i);
      if (pathMatch) {
        return pathMatch[1];
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
