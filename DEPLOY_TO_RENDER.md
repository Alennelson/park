# Deploy Report System to Render

## Issue
Your Render deployment is failing because the `SupportTicket` model is missing.

Error: `Cannot find module '../models/SupportTicket'`

## Solution: Commit and Push Missing Files

### Step 1: Add the missing file
```bash
git add backend/models/SupportTicket.js
```

### Step 2: Commit the changes
```bash
git commit -m "Add SupportTicket model for help desk system"
```

### Step 3: Push to GitHub (triggers Render deployment)
```bash
git push origin main
```

### Step 4: Wait for Render to Deploy
- Go to your Render dashboard: https://dashboard.render.com
- Watch the deployment logs
- Wait for "Build successful" and "Deploy live"
- This usually takes 2-5 minutes

## What Files Were Added?

### Already Committed (✅):
- `backend/models/Report.js` - Report model
- `backend/routes/reports.js` - Report API routes
- `backend/routes/support.js` - Support ticket routes
- `REPORT_SYSTEM_IMPLEMENTATION.md` - Documentation

### Need to Commit (❌):
- `backend/models/SupportTicket.js` - Support ticket model (MISSING!)

## Quick Deploy Commands

Run these commands in order:

```bash
# 1. Add the missing file
git add backend/models/SupportTicket.js

# 2. Commit
git commit -m "Add SupportTicket model for help desk system"

# 3. Push to trigger deployment
git push origin main
```

## Verify Deployment

After deployment completes:

1. **Check Render Logs**
   - Go to Render dashboard
   - Click on your service
   - Check "Logs" tab
   - Look for "Server running on port 5000"

2. **Test the API**
   - Open: https://parkify-backend-hahp.onrender.com/api/reports/submit
   - You should see a response (not 404)

3. **Test the Report Feature**
   - Go to your app
   - Complete a parking session
   - Give 1 or 2 stars
   - Submit a report
   - Should work without errors!

## If Still Getting Errors

### Error: "404 Not Found"
- Render deployment hasn't finished yet
- Wait 2-5 minutes and try again
- Check Render dashboard for deployment status

### Error: "Module not found"
- File wasn't committed properly
- Run: `git status` to check
- Make sure you see "nothing to commit, working tree clean"

### Error: "Build failed"
- Check Render logs for specific error
- Usually means a syntax error in code
- Fix the error and push again

## Current Deployment Status

Your backend is deployed at:
```
https://parkify-backend-hahp.onrender.com
```

After pushing the SupportTicket model, Render will automatically:
1. Pull the latest code from GitHub
2. Install dependencies
3. Restart the server
4. Make the new routes available

## Testing After Deployment

1. **Test Support Ticket Creation**
   ```
   POST https://parkify-backend-hahp.onrender.com/api/support/create
   ```

2. **Test Report Submission**
   ```
   POST https://parkify-backend-hahp.onrender.com/api/reports/submit
   ```

Both should return JSON responses (not 404 or HTML errors).
