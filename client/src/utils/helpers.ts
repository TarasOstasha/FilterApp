export const getCategoryIdFromPath = (): string => {
    try {
      const path = window.location.pathname; 
      const m = path.match(/\/(\d+)\.htm(?:$|\?)/i);
      return m ? m[1] : '10709'; // Empty string = show all categories/products
    } catch {
      return ''; 
    }
  };
