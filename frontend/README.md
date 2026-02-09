# ASP Parking - Frontend Deployment Guide

## Vercel Deployment Instructions

### Prerequisites
1. A Vercel account (sign up at https://vercel.com)
2. Your backend deployed and accessible via HTTPS

### Step 1: Update Backend URL
Before deploying, open `config.js` and replace the placeholder URL with your actual backend URL:

```javascript
BASE_URL: window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://your-backend-url.herokuapp.com', // ⚠️ REPLACE THIS
```

Example:
```javascript
BASE_URL: window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://asp-parking-api.herokuapp.com',
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts and confirm deployment

#### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your Git repository (or drag & drop the frontend folder)
3. Set the root directory to `frontend`
4. Click "Deploy"

### Step 3: Configure CORS on Backend
Make sure your backend allows requests from your Vercel domain:

```javascript
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app', 'http://localhost:3000']
}));
```

### Important Notes

- **Google Maps API**: Your Google Maps API key is exposed in the HTML files. Consider restricting it to your domain in Google Cloud Console.
- **Razorpay**: Update the Razorpay key in `find-parking.html` with your production key.
- **Environment Detection**: The app automatically uses localhost for local development and your production URL when deployed.

### Testing Locally
To test with the production backend URL locally:
```javascript
// Temporarily change in config.js
BASE_URL: 'https://your-backend-url.herokuapp.com'
```

### Troubleshooting

**Issue**: API calls failing after deployment
- Check browser console for CORS errors
- Verify backend URL is correct in `config.js`
- Ensure backend is running and accessible

**Issue**: Images not loading
- Check that image URLs use `API_CONFIG.BASE_URL`
- Verify backend serves static files from `/uploads`

**Issue**: Maps not working
- Verify Google Maps API key is valid
- Check API key restrictions in Google Cloud Console

### File Structure
```
frontend/
├── config.js           # API configuration (UPDATE THIS!)
├── vercel.json         # Vercel deployment config
├── *.html              # Application pages
└── README.md           # This file
```

### Support
For issues, check:
1. Browser console for errors
2. Network tab for failed requests
3. Backend logs for API errors
