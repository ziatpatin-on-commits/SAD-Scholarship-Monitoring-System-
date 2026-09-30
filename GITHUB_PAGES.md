# GitHub Pages Deployment Guide

## 1. Configure Supabase

Open:

`js/supabase.js`

Set:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Use the Supabase browser-safe anon/publishable key.

## 2. Test locally

Open the folder in VS Code and use Live Server.

Open:

`index.html`

The login page should appear.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initialize GitHub Pages scholarship monitoring system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SAD-Scholarship-Monitoring-System.git
git push -u origin main
```

## 4. Enable Pages

GitHub repository:

**Settings → Pages → Deploy from a branch → main → /(root) → Save**

## 5. Verify

Visit the generated GitHub Pages URL.

Expected flow:

```text
GitHub Pages URL
       ↓
   index.html
       ↓
     Login
       ↓
Successful Supabase authentication
       ↓
 dashboard.html
       ↓
ScholarTrack dashboard
```

## 6. Important

GitHub Pages hosts the frontend only. Supabase remains responsible for:

- Authentication
- PostgreSQL database
- Row Level Security
- Compliance verification function

Never place a Supabase `service_role` secret in the JavaScript files.
