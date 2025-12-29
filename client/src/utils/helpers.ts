export const getCategoryIdFromPath = (): string => {
    try {
      // First, check if there's a test category ID in localStorage
      const testCategoryId = localStorage.getItem('testCategoryId');
      if (testCategoryId && testCategoryId.trim()) {
        return testCategoryId.trim();
      }
      
      // If no test ID, extract from URL path
      const path = window.location.pathname; 
      const m = path.match(/\/(\d+)\.htm(?:$|\?)/i);
      return m ? m[1] : ''; // Default to '63' if no match
    } catch {
      return ''; 
    }
  };
