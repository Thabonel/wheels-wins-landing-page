# Product Health Check Edge Function

Automated health monitoring for affiliate products in the shop. Checks for data quality issues, stale products, and availability status.

## Features

- **Data Quality Checks**:
  - Missing images
  - Missing prices (critical)
  - Missing descriptions
  - Products not updated in 30+ days (configurable)
  - Unknown availability status

- **Auto-Fix Mode**: Automatically mark stale products as 'unknown' availability
- **Severity Levels**: High (missing price) > Medium (missing image, stale) > Low (missing description)
- **Detailed Reporting**: JSON report with all issues found

## Usage

### Manual Execution

**Basic health check (no auto-fix)**:
```bash
curl -X POST \
  https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
```

**With auto-fix (marks stale products as 'unknown')**:
```bash
curl -X POST \
  "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?autoFix=true"
```

**Custom stale threshold (60 days)**:
```bash
curl -X POST \
  "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?staleDays=60&autoFix=true"
```

### Response Format

```json
{
  "total_products": 81,
  "healthy_products": 65,
  "products_with_issues": [
    {
      "product_id": "abc123",
      "title": "Product Name",
      "issues": [
        "Missing price",
        "Not updated in 30+ days (last: 2024-11-05)"
      ],
      "severity": "high",
      "last_updated": "2024-11-05T12:34:56Z"
    }
  ],
  "summary": {
    "missing_images": 3,
    "missing_prices": 1,
    "missing_descriptions": 5,
    "stale_products": 12,
    "unknown_availability": 8
  },
  "timestamp": "2025-01-05T10:00:00Z"
}
```

## Automated Cron Job

### Setup via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Select `product-health-check` function
3. Click **Settings** → **Cron Jobs**
4. Add new cron job:
   - **Schedule**: `0 2 * * *` (daily at 2 AM UTC)
   - **HTTP Method**: POST
   - **Request Body**: `{"autoFix": true, "staleDays": 30}`

### Setup via Supabase CLI (config.toml)

Add to `supabase/config.toml`:

```toml
[functions.product-health-check]
verify_jwt = false  # Public endpoint

[functions.product-health-check.cron]
schedule = "0 2 * * *"  # Daily at 2 AM UTC
method = "POST"
body = '{"autoFix": true, "staleDays": 30}'
```

Then deploy:
```bash
supabase functions deploy product-health-check
```

### Cron Schedule Examples

- `0 2 * * *` - Daily at 2 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight

## Deployment

```bash
# Deploy the function
supabase functions deploy product-health-check

# Test immediately
curl -X POST \
  https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `autoFix` | boolean | false | Auto-mark stale products as 'unknown' |
| `staleDays` | number | 30 | Days since update to consider product stale |

## Monitoring

**View function logs**:
```bash
supabase functions logs product-health-check
```

**Check last execution** (in Supabase Dashboard):
- **Edge Functions** → `product-health-check` → **Invocations**

## Integration with Admin Dashboard

The admin dashboard (`AmazonProductsManagement.tsx`) can call this function to:
1. Show health status badge
2. Display products needing attention
3. Trigger manual health checks
4. View historical health reports

## Future Enhancements

When Amazon Product Advertising API is available:
- Real-time availability checking
- Automatic price updates
- Stock level monitoring
- Product review count tracking
- Star rating updates

## Security

- Uses `SUPABASE_SERVICE_ROLE_KEY` for admin access
- No JWT verification required (internal function)
- CORS enabled for dashboard integration
