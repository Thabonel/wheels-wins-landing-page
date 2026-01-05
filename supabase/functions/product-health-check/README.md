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

## Authentication

This function requires authentication via **one of two methods**:

1. **Admin JWT Token** (for manual admin calls):
   ```bash
   curl -X POST \
     -H "Authorization: Bearer <your-admin-jwt-token>" \
     https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
   ```

2. **Cron Secret** (for automated cron jobs):
   ```bash
   curl -X POST \
     -H "X-Cron-Secret: <your-cron-secret>" \
     https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
   ```

Unauthenticated requests will receive `401 Unauthorized`.

## Usage

### Manual Execution (Admin Only)

**Basic health check (no auto-fix)**:
```bash
curl -X POST \
  -H "Authorization: Bearer <your-admin-jwt-token>" \
  https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
```

**With auto-fix (marks stale products as 'unknown')**:
```bash
curl -X POST \
  -H "Authorization: Bearer <your-admin-jwt-token>" \
  "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?autoFix=true"
```

**Custom stale threshold (60 days)**:
```bash
curl -X POST \
  -H "Authorization: Bearer <your-admin-jwt-token>" \
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
verify_jwt = false  # Auth handled in function code

[functions.product-health-check.cron]
schedule = "0 2 * * *"  # Daily at 2 AM UTC
method = "POST"
body = '{"autoFix": true, "staleDays": 30}'
headers = { "X-Cron-Secret" = "${CRON_SECRET}" }
```

**Important**: Set `CRON_SECRET` in Supabase project environment variables before deploying.

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

**Authentication Required**: All requests must be authenticated via one of:
1. **Admin JWT Token** - Verified against `admin_users` table (role: super_admin or admin, status: active)
2. **Cron Secret** - Shared secret (`CRON_SECRET`) for automated cron jobs

**Service Role Key**: Function uses `SUPABASE_SERVICE_ROLE_KEY` internally for database access, but all external requests are authenticated first.

**CORS**: Enabled for admin dashboard integration.

**Environment Variables Required**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `CRON_SECRET` - Shared secret for authenticating cron job requests
