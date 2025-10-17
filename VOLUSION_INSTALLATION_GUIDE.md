# Volusion Store Integration Guide

This guide explains how to integrate the Filter App into your Volusion store.

## Overview

The integration adds:
- **Filter Sidebar**: Displays on the left side of product listing pages
- **Filtered Product Grid**: Replaces the Volusion product grid when filters are active
- **Seamless Experience**: Original Volusion grid shows when no filters are selected

## Prerequisites

1. Access to your Volusion store admin panel
2. Ability to edit theme templates
3. Your Filter App API deployed and accessible
4. Your Filter App React build deployed to a hosting service (e.g., Netlify, Vercel, AWS S3)

## Installation Steps

### Step 1: Build the React App for Volusion

1. Navigate to the client directory:
```bash
cd client
```

2. Create a production build:
```bash
npm run build
```

3. Deploy the `build` folder to your hosting service (Netlify, Vercel, AWS S3, etc.)
   - Make sure the build is publicly accessible
   - Note the URL (e.g., `https://your-app.netlify.app`)

### Step 2: Configure API Endpoint

1. Make sure your backend API is deployed and accessible
2. Note your API URL (e.g., `https://your-api.herokuapp.com/api`)

### Step 3: Add Integration Script to Volusion

1. Log in to your Volusion admin panel

2. Navigate to **Design > File Editor**

3. Find and edit your **template.html** file (or the main layout file for your theme)

4. Add the following code just before the closing `</body>` tag:

```html
<!-- Filter App Integration -->
<script>
  // Configure your API and React app URLs
  window.FILTER_APP_API_URL = 'https://your-api.herokuapp.com/api';
  window.FILTER_APP_REACT_URL = 'https://your-app.netlify.app';
</script>
<script src="https://your-app.netlify.app/volusion-integration.js"></script>
<!-- End Filter App Integration -->
```

5. **Important**: Replace the URLs with your actual deployment URLs:
   - `FILTER_APP_API_URL`: Your backend API URL
   - `FILTER_APP_REACT_URL`: Your React app URL

6. Save the changes

### Step 4: Verify Integration

1. Navigate to a product category page on your Volusion store (e.g., `/products/Backlit-Displays/51.htm`)

2. Open browser DevTools Console (F12)

3. Look for integration messages:
```
[Filter App] Initializing Volusion integration...
[Filter App] Sidebar container created
[Filter App] Product grid replacement ready
[Filter App] React app loaded
```

4. You should see the filter sidebar appear on the left side

5. Try selecting a filter - the product grid should switch to show filtered results

## Configuration Options

### Customizing Selectors

If your Volusion theme uses different CSS classes, you can customize the selectors in `volusion-integration.js`:

```javascript
const CONFIG = {
  apiBaseUrl: window.FILTER_APP_API_URL || 'https://your-api-domain.com/api',
  reactAppUrl: window.FILTER_APP_REACT_URL || 'https://your-react-app-domain.com',
  sidebarContainerId: 'filter-app-sidebar',
  productGridSelector: '.v-product-grid', // Change this to match your theme
  productGridContainerId: 'filter-app-products',
};
```

Common Volusion product grid selectors:
- `.v-product-grid`
- `.product-list`
- `#product-grid`
- `.products-container`

### Styling Adjustments

The filter sidebar and product grid use the existing app styles, but you may need to add custom CSS to match your Volusion theme:

1. In Volusion admin, go to **Design > File Editor**
2. Edit your theme's CSS file
3. Add custom styles:

```css
/* Filter App Custom Styles */
#filter-app-sidebar {
  margin-bottom: 20px;
}

#filter-app-products {
  width: 100%;
}

/* Adjust sidebar width if needed */
.sidebar-wrapper-col-md-3 {
  flex: 0 0 250px;
  min-width: 250px;
}
```

## Troubleshooting

### Sidebar Not Appearing

1. Check browser console for errors
2. Verify the integration script is loading
3. Check if the sidebar wrapper exists in your theme
4. Try adding a more specific selector in the CONFIG

### Product Grid Not Switching

1. Verify the `productGridSelector` matches your theme's HTML
2. Check console for error messages
3. Ensure the API is responding correctly
4. Check network tab for failed API requests

### Filters Not Working

1. Verify API URL is correct and accessible
2. Check that category IDs are being extracted correctly from URLs
3. Ensure your backend database has filter fields configured
4. Check browser console for JavaScript errors

### CORS Errors

If you see CORS errors in the console:

1. Ensure your backend API has CORS enabled for your Volusion store domain
2. In your backend `app.js` or equivalent, verify CORS configuration:

```javascript
app.use(cors({
  origin: ['https://your-volusion-store.com', 'http://your-volusion-store.com'],
  credentials: true
}));
```

## Category ID Extraction

The integration automatically extracts category IDs from Volusion URLs. Typical URL format:
```
https://your-store.com/category-name/51.htm
```

The number before `.htm` is the category ID (51 in this example).

If your URLs have a different format, modify the `getCategoryId()` function in `volusion-integration.js`.

## Advanced Configuration

### Custom Event Handling

You can listen to filter events in your own scripts:

```javascript
// Listen for filter changes
window.addEventListener('filter-app:filters-changed', function(event) {
  console.log('Filters changed:', event.detail);
  // Your custom logic here
});

// Listen for filters cleared
window.addEventListener('filter-app:filters-cleared', function() {
  console.log('Filters cleared');
  // Your custom logic here
});
```

### Programmatic Control

You can control the integration programmatically:

```javascript
// Show filtered products
window.FilterAppIntegration.showFilteredProducts();

// Show original products
window.FilterAppIntegration.showOriginalProducts();

// Get current category ID
var categoryId = window.FilterAppIntegration.getCategoryId();
```

## Testing Checklist

- [ ] Sidebar appears on product listing pages
- [ ] Filters load correctly
- [ ] Selecting a filter shows filtered products
- [ ] Original grid is hidden when filters are active
- [ ] Clearing filters shows original grid
- [ ] Pagination works with filtered results
- [ ] Sorting works with filtered results
- [ ] Mobile responsive design works
- [ ] No console errors

## Support

If you encounter issues:

1. Check browser console for error messages
2. Verify all URLs are correct and accessible
3. Test API endpoints directly
4. Check that category IDs are properly configured in the database
5. Review the troubleshooting section above

## Files Reference

- `client/public/volusion-integration.js` - Main integration script
- `client/src/volusion-integration/VolusionIntegration.tsx` - React component
- `client/src/volusion-integration/index.tsx` - Entry point
- `client/src/volusion-integration/VolusionIntegration.module.scss` - Styles

## Deployment Checklist

Before deploying to production:

- [ ] Backend API is deployed and accessible
- [ ] React app is built and deployed
- [ ] Environment variables are configured
- [ ] CORS is properly configured
- [ ] Database has filter fields and products
- [ ] Category IDs match Volusion categories
- [ ] Integration script URLs are updated
- [ ] Testing completed on staging environment
