# Cloudflare CDN Setup Guide

This guide will help you set up Cloudflare CDN for your marketplace API images.

## Prerequisites

- A domain name (e.g., `yourmarketplace.com`)
- Cloudflare account (free)

## Step 1: Cloudflare Domain Setup

### 1.1 Add Domain to Cloudflare

1. Go to [cloudflare.com](https://cloudflare.com) and sign up/login
2. Click "Add a Site"
3. Enter your domain: `yourmarketplace.com`
4. Choose the **Free** plan
5. Cloudflare will scan your existing DNS records

### 1.2 Update Nameservers

1. Cloudflare will provide you with 2 nameservers:

   ```
   Nameserver 1: aida.ns.cloudflare.com
   Nameserver 2: rick.ns.cloudflare.com
   ```

2. Go to your domain registrar (where you bought your domain)
3. Update the nameservers to Cloudflare's nameservers
4. Wait 5-30 minutes for propagation

## Step 2: Configure DNS Records

In your Cloudflare dashboard, add these DNS records:

### API Server

```
Type: A
Name: api
Value: YOUR_SERVER_IP_ADDRESS
Proxy: ✅ (Orange cloud - enabled)
```

### Image CDN

```
Type: CNAME
Name: images
Value: yourmarketplace.com
Proxy: ✅ (Orange cloud - enabled)
```

## Step 3: Environment Configuration

### 3.1 Update .env file

```bash
# Add this to your .env file
CDN_BASE_URL=https://images.yourmarketplace.com
```

### 3.2 Docker Compose (if using Docker)

```yaml
environment:
  - CDN_BASE_URL=${CDN_BASE_URL:-http://localhost:9000}
```

## Step 4: Cloudflare Settings

### 4.1 Page Rules for Caching

Create these page rules in Cloudflare dashboard:

#### Rule 1: Cache Images Aggressively

```
URL: images.yourmarketplace.com/uploads/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 year
- Browser Cache TTL: 1 year
```

#### Rule 2: Don't Cache API Endpoints

```
URL: api.yourmarketplace.com/*
Settings:
- Cache Level: Bypass
```

### 4.2 Security Settings

Go to Security → Settings:

```
Security Level: Medium
Always Use HTTPS: On
HSTS: On
SSL/TLS: Full (strict)
```

### 4.3 Speed Settings

Go to Speed → Optimization:

```
Auto Minify: JavaScript, CSS, HTML
Brotli: On
Early Hints: On
```

## Step 5: Test the Setup

### 5.1 Test Image Upload

```bash
# Upload an image
curl -X POST http://localhost:4000/upload/presigned-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.jpg",
    "contentType": "image/jpeg",
    "fileSize": 1024000
  }'
```

### 5.2 Verify CDN URL

The response should include a CDN URL:

```json
{
  "uploadUrl": "https://minio:9000/marketplace-images/uploads/...",
  "fileUrl": "https://images.yourmarketplace.com/uploads/...",
  "fileName": "uploads/1234567890-abc123.jpg"
}
```

## Step 6: Monitor Performance

### 6.1 Cloudflare Analytics

- Go to Analytics → Traffic
- Monitor cache hit ratio (should be >80%)
- Check bandwidth savings

### 6.2 Test Image Loading

```bash
# Test image loading speed
curl -w "@curl-format.txt" -o /dev/null -s "https://images.yourmarketplace.com/uploads/test.jpg"
```

## Benefits You'll See

### Performance

- **Faster image loading**: 5-10x improvement
- **Reduced server load**: 80-90% of requests cached
- **Better user experience**: Especially on mobile

### Cost Savings

- **Reduced bandwidth**: 75% less bandwidth usage
- **No CDN costs**: Free tier covers unlimited bandwidth
- **Predictable costs**: No surprise bills

### Security

- **DDoS protection**: Automatic attack mitigation
- **SSL certificates**: Free, automatic renewal
- **HTTPS enforcement**: Better security

## Troubleshooting

### Images Not Loading

1. Check DNS propagation: `dig images.yourmarketplace.com`
2. Verify Cloudflare proxy is enabled (orange cloud)
3. Check SSL/TLS settings

### Cache Not Working

1. Verify page rules are active
2. Check cache headers in browser dev tools
3. Clear Cloudflare cache if needed

### SSL Issues

1. Set SSL/TLS to "Full (strict)"
2. Wait for certificate to provision (up to 24 hours)
3. Check for mixed content warnings

## Advanced Configuration

### Custom Cache Headers

```typescript
// In your upload service
const cacheHeaders = {
  'Cache-Control': 'public, max-age=31536000',
  Expires: new Date(Date.now() + 31536000 * 1000).toUTCString(),
};
```

### Cache Invalidation

```typescript
// When updating images, you may need to purge cache
// Cloudflare provides API for this
```

## Migration from Direct S3/MinIO

Your existing code will work immediately after setup:

1. **No code changes needed** for existing images
2. **New uploads** will automatically use CDN URLs
3. **Gradual migration** as users access new images

## Cost Comparison

### Before CDN

```
Monthly costs:
- S3/MinIO bandwidth: $100
- Server processing: $50
Total: $150/month
```

### After Cloudflare CDN

```
Monthly costs:
- Cloudflare CDN: $0 (free tier)
- S3/MinIO bandwidth: $25 (reduced due to caching)
- Server processing: $10 (reduced load)
Total: $35/month (77% savings!)
```

## Next Steps

1. **Monitor performance** for 1-2 weeks
2. **Consider upgrading** to Pro plan if you need more features
3. **Implement image optimization** (WebP, resizing)
4. **Add analytics** to track image performance

## Support

- Cloudflare documentation: [developers.cloudflare.com](https://developers.cloudflare.com)
- Community forum: [community.cloudflare.com](https://community.cloudflare.com)
- 24/7 support available on paid plans
