# How to Restart Backend Server

## The Issue
You're getting this error: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

This means the backend server needs to be restarted to load the new `/api/reports` route.

## Solution: Restart Your Backend Server

### Step 1: Stop the current server
If your backend is running, stop it by pressing:
- `Ctrl + C` (Windows/Linux)
- `Cmd + C` (Mac)

### Step 2: Start the server again
```bash
cd backend
node server.js
```

Or if you're using nodemon:
```bash
cd backend
nodemon server.js
```

### Step 3: Verify it's working
You should see in the console:
```
✅ MongoDB connected
🚀 Server running on port 5000
```

## What Changed?
We added these new files:
- `backend/models/Report.js` - Database model for reports
- `backend/routes/reports.js` - API endpoints for reports
- Updated `backend/server.js` - Registered the new routes

## Testing the Report Feature

1. **Create a booking** as a driver
2. **Complete the parking** and make payment
3. **Rate with 1 or 2 stars** - The report section will appear
4. **Select issues** from the checkboxes
5. **Scroll down** to see the red "Submit Rating & Report" button
6. **Click submit** - Both rating and report will be saved

## UI Improvements Made

✅ Made the rating card scrollable (max-height: 80vh)
✅ Made the report section scrollable (max-height: 35vh)
✅ Reduced padding to fit more content
✅ Added flex-shrink to prevent button cutoff
✅ Added bottom padding to ensure buttons are visible
✅ Added better error messages with console logs

## If Still Not Working

1. **Check backend is running**: Open http://localhost:5000 in browser
2. **Check console logs**: Look for errors in backend terminal
3. **Clear browser cache**: Hard refresh with Ctrl+Shift+R
4. **Check network tab**: See what URL is being called and what response you get

## Backend URL
Make sure your `frontend/config.js` has the correct backend URL:
```javascript
function getApiUrl(path) {
  return 'https://parkify-backend-hahp.onrender.com' + path;
}
```

If testing locally, change to:
```javascript
function getApiUrl(path) {
  return 'http://localhost:5000' + path;
}
```
