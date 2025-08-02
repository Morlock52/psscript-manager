# Deploy PSScript to psscript.morlocksmaze.com

## Quick Deploy Instructions

### Step 1: Login to Vercel
```bash
cd "/Users/morlock/fun/psscript 4"
vercel login
```
Choose your preferred login method (GitHub recommended).

### Step 2: Deploy with Custom Script
```bash
./deploy-psscript-custom-domain.sh
```

### Step 3: Manual Deployment (Alternative)
If the script has issues, deploy manually:

```bash
# Ensure you're in the project root
cd "/Users/morlock/fun/psscript 4"

# Deploy to production
vercel --prod --yes

# Add custom domain
vercel domains add psscript.morlocksmaze.com

# Set domain alias
vercel alias set psscript.morlocksmaze.com
```

## DNS Configuration Required

After deployment, configure these DNS records with your domain provider:

### Option 1: CNAME Record (Recommended)
```
Type: CNAME
Name: psscript
Value: cname.vercel-dns.com
TTL: 300
```

### Option 2: A Records (If CNAME not supported)
```
Type: A
Name: psscript
Value: 76.76.19.61
TTL: 300

Type: A
Name: psscript
Value: 76.223.126.88
TTL: 300
```

## Verification Steps

1. **Check deployment status:**
   ```bash
   vercel ls
   ```

2. **View domain configuration:**
   ```bash
   vercel domains ls
   ```

3. **Test the domain:**
   ```bash
   curl -I https://psscript.morlocksmaze.com
   ```

4. **Check SSL certificate:**
   ```bash
   curl -vI https://psscript.morlocksmaze.com 2>&1 | grep -i ssl
   ```

## Expected Results

- ✅ **Frontend**: Deployed to Vercel with optimized build
- ✅ **Domain**: psscript.morlocksmaze.com configured
- ✅ **SSL**: Automatic HTTPS certificate from Let's Encrypt
- ✅ **CDN**: Global content delivery via Vercel Edge Network
- ✅ **Performance**: Optimized static asset caching

## Troubleshooting

### Domain not resolving
- Check DNS propagation: `dig psscript.morlocksmaze.com`
- DNS propagation can take up to 24 hours
- Verify DNS records with your domain provider

### SSL certificate issues
- SSL certificates are automatically provisioned
- May take 5-10 minutes after DNS propagation
- Check certificate status in Vercel dashboard

### Build failures
- Verify frontend builds locally: `cd src/frontend && npm run build`
- Check build logs: `vercel logs`
- Ensure all dependencies are in package.json

## Post-Deployment Checklist

- [ ] DNS records configured
- [ ] Domain resolves to Vercel
- [ ] SSL certificate active
- [ ] All pages load correctly
- [ ] Navigation functions properly
- [ ] API endpoints working (if backend deployed)
- [ ] Error pages display correctly

## Performance Optimization

Vercel automatically provides:
- ✅ Brotli compression
- ✅ Image optimization
- ✅ Static asset caching
- ✅ Edge caching
- ✅ HTTP/2 support

## Monitoring

1. **Vercel Dashboard**: https://vercel.com/dashboard
2. **Analytics**: Built-in performance monitoring
3. **Logs**: `vercel logs` for deployment logs
4. **Status**: `vercel inspect <url>` for detailed info

Your PSScript application will be live at: **https://psscript.morlocksmaze.com**