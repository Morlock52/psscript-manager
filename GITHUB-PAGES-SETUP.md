# GitHub Pages Deployment Setup

## Step 1: Update GitHub Token with Workflow Permissions

### 1.1 Generate New Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. **Important**: Check these scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
   - ✅ `admin:repo_hook` (Admin repo hooks)
4. Set expiration (recommend "No expiration" for ease)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### 1.2 Update Local Git Configuration
```bash
# Navigate to your project
cd "/Users/morlock/fun/psscript 4"

# Update git remote with new token
git remote set-url origin https://YOUR_TOKEN@github.com/Morlock52/psscript-manager.git

# Replace YOUR_TOKEN with the token you just copied
```

## Step 2: Enable GitHub Pages

### 2.1 Repository Settings
1. Go to https://github.com/Morlock52/psscript-manager/settings/pages
2. Under "Source", select "GitHub Actions"
3. This allows the workflow to deploy automatically

### 2.2 Push the Deployment
```bash
cd "/Users/morlock/fun/psscript 4"

# Push with new permissions
git push origin main
```

## Step 3: Monitor Deployment

### 3.1 Check Actions
1. Go to https://github.com/Morlock52/psscript-manager/actions
2. You should see "Deploy to GitHub Pages" workflow running
3. Wait for it to complete (usually 2-3 minutes)

### 3.2 Get Your Live URL
After deployment completes, your app will be live at:
**https://morlock52.github.io/psscript-manager/**

## Step 4: Configure Custom Domain (Optional)

### 4.1 DNS Setup
Add these DNS records to `morlocksmaze.com`:
```
Type: CNAME
Name: psscript
Value: morlock52.github.io
```

### 4.2 GitHub Settings
1. Go to repository settings → Pages
2. Add custom domain: `psscript.morlocksmaze.com`
3. Enable "Enforce HTTPS"

## Troubleshooting

### If Push Still Fails:
```bash
# Try with personal access token in URL
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/Morlock52/psscript-manager.git
git push origin main
```

### If Workflow Fails:
1. Check the Actions tab for error details
2. Ensure all files are committed
3. Verify the workflow file exists: `.github/workflows/deploy-pages.yml`

## Expected Timeline
- Token setup: 2 minutes
- Push to GitHub: 30 seconds  
- GitHub Actions build: 2-3 minutes
- **Total**: 5 minutes to live site

## Final Result
✅ **Live URL**: https://morlock52.github.io/psscript-manager/
✅ **Custom domain**: https://psscript.morlocksmaze.com (after DNS setup)
✅ **Auto-deployment**: Updates on every push to main branch
✅ **HTTPS**: Automatic SSL certificate
✅ **Global CDN**: Fast loading worldwide