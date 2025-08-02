# Manual Deployment Steps for psscript.morlocksmaze.com

## Step 1: Authenticate with Vercel

Open Terminal and run:
```bash
cd "/Users/morlock/fun/psscript 4"
vercel login
```

Choose "Continue with GitHub" (recommended) and complete the authentication in your browser.

## Step 2: Deploy to Production

Once authenticated, run:
```bash
./deploy-now.sh
```

Or manually:
```bash
vercel --prod --yes
```

## Step 3: Configure Custom Domain

Add your domain:
```bash
vercel domains add psscript.morlocksmaze.com
```

Set domain alias:
```bash
vercel alias set psscript.morlocksmaze.com
```

## Step 4: Configure DNS

Add this CNAME record to your DNS provider:
- **Type**: CNAME
- **Name**: psscript
- **Value**: cname.vercel-dns.com
- **TTL**: 300

## Step 5: Test Deployment

Run the test script:
```bash
./test-deployment.sh
```

## Expected Output

After successful deployment:
- ✅ Site live at: https://psscript.morlocksmaze.com
- ✅ SSL certificate automatically provisioned
- ✅ Global CDN enabled
- ✅ Optimized for performance

## Verification Commands

```bash
# Check Vercel projects
vercel ls

# Check domains
vercel domains ls

# View deployment logs
vercel logs

# Get deployment info
vercel inspect psscript.morlocksmaze.com
```

## Troubleshooting

**If domain doesn't resolve:**
1. Check DNS propagation: `dig psscript.morlocksmaze.com`
2. Wait up to 24 hours for DNS propagation
3. Verify CNAME record with your DNS provider

**If SSL certificate isn't working:**
1. Wait 5-10 minutes after DNS propagation
2. Certificates are automatically provisioned
3. Check certificate status in Vercel dashboard

## One-Line Deploy Command

After initial authentication:
```bash
cd "/Users/morlock/fun/psscript 4" && ./deploy-now.sh
```

Your PSScript will be live at: **https://psscript.morlocksmaze.com**