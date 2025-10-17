# Quick Volusion Integration Setup

## ⚠️ IMPORTANT: SSL/HTTPS Required!

Your app is currently running on **HTTP** (`http://193.169.241.246:5000`). If your Volusion store uses **HTTPS** (which most do), browsers will block the integration due to "Mixed Content" security policies.

**You MUST set up SSL/HTTPS for your app to work with Volusion!**

See **SSL_CONSIDERATIONS.md** for detailed solutions including:
- Setting up free SSL with Let's Encrypt + Nginx (recommended)
- Deploying to services with automatic SSL (easiest)
- Step-by-step instructions

---

## Setup Steps (After SSL is configured)

## Setup Steps

### 1. Copy the Integration Script

The integration script `client/public/volusion-integration.js` is already configured with your URL:
- API: `http://193.169.241.246:5000/api`
- React App: `http://193.169.241.246:5000`

Copy this file to your web server so it's publicly accessible, or upload it to your Volusion store's file manager.

### 2. Add to Volusion Template

1. Log in to your Volusion admin panel
2. Navigate to **Design > File Editor**
3. Find your **template.html** file
4. Add this code just before the closing `</body>` tag:

```html
<!-- Filter App Integration -->
<script src="http://193.169.241.246:5000/volusion-integration.js"></script>
<!-- End Filter App Integration -->
```

Alternatively, if you host the integration script elsewhere:
```html
<!-- Filter App Integration -->
<script src="https://your-cdn.com/volusion-integration.js"></script>
<!-- End Filter App Integration -->
```

### 3. Verify the Integration

1. Visit a product category page on your Volusion store (e.g., `/products/Backlit-Displays/51.htm`)
2. Open browser DevTools Console (F12)
3. You should see:
```
[Filter App] Initializing Volusion integration...
[Filter App] Sidebar container created
[Filter App] Product grid replacement ready
```

4. The filter sidebar should appear on the left
5. Select a filter to see the product grid switch to filtered results

## Important Notes

### CORS Configuration

Since your app is running on `http://193.169.241.246:5000/`, make sure CORS is enabled for your Volusion store domain.

In your backend `server/app.js`, verify:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-volusion-store.com',
    'http://your-volusion-store.com',
    'http://193.169.241.246:5000' // Your app's own domain
  ],
  credentials: true
}));
```

### Volusion Theme Selectors

The integration is configured to replace the `search_results_section` element. The script looks for:
- `.search_results_section`
- `form.search_results_section`

If your Volusion theme uses a different structure, you can update it in `volusion-integration.js`:

```javascript
const CONFIG = {
  // ... other config
  productGridSelector: '.your-product-grid-class', // Update this
  // ... other config
};
```

Common selectors:
- `.search_results_section` or `form.search_results_section` (current)
- `.v-product-grid`
- `.product-list`
- `#product-grid`

## Testing Checklist

- [ ] Integration script loads without errors
- [ ] Sidebar appears on product listing pages
- [ ] Filters load from your API
- [ ] Selecting a filter shows filtered products (Volusion grid hides)
- [ ] Original Volusion grid shows when no filters are active
- [ ] No CORS errors in console

## Troubleshooting

### If sidebar doesn't appear:
1. Check console for errors
2. Verify the script URL is correct and accessible
3. Check if your theme has the expected sidebar structure

### If products don't filter:
1. Check Network tab for API calls to `http://193.169.241.246:5000/api`
2. Verify CORS is configured correctly
3. Check that category IDs in URL match your database

### If you see CORS errors:
Update your backend's CORS configuration to allow your Volusion store domain.

## Next Steps

Once integrated, you can:
- Customize the styling to match your Volusion theme
- Add custom CSS in Volusion's theme editor
- Monitor the integration using browser DevTools
- Test on different product category pages

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify API endpoints are responding
3. Test API calls directly using tools like Postman
4. Review the full installation guide in `VOLUSION_INSTALLATION_GUIDE.md`
