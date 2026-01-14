# Admin Product Management Guide

Complete guide for managing affiliate products, handling user reports, and monitoring product health.

---

## Table of Contents

1. [Bulk Product Operations](#bulk-product-operations)
2. [Product Health Monitoring](#product-health-monitoring)
3. [User Issue Reports](#user-issue-reports)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

---

## Bulk Product Operations

### Accessing the Admin Dashboard

1. Navigate to `/admin/shop-management` (admin access required)
2. Click on **Amazon Products** tab
3. You'll see the full product list with checkboxes

### Selecting Products

**Individual Selection**:
- Click checkbox next to any product to select it
- Selected count appears in the bulk actions bar

**Select All**:
- Click checkbox in table header to select all visible products
- Useful for batch operations on filtered results

**Clear Selection**:
- Click "Clear Selection" button in bulk actions bar
- Or click "Select All" checkbox again to deselect all

### Bulk Actions

Once products are selected, the bulk actions bar appears at the top:

#### Mark Availability Status

**Mark Available**:
```
Use when: Products are confirmed in stock and ready for purchase
Effect: Sets availability_status = 'available'
Visible: Products appear in shop for users
```

**Mark Out of Stock**:
```
Use when: Products temporarily unavailable but will return
Effect: Sets availability_status = 'out_of_stock'
Visible: Products hidden from shop but not deleted
```

**Mark Discontinued**:
```
Use when: Products permanently discontinued by manufacturer
Effect: Sets availability_status = 'discontinued'
Visible: Products hidden from shop, can be archived later
```

#### Activate/Deactivate

**Bulk Activate**:
```
Use when: Re-enabling previously deactivated products
Effect: Sets is_active = true
Visible: Products appear in shop (if availability = 'available')
```

**Bulk Deactivate**:
```
Use when: Temporarily removing products without deleting
Effect: Sets is_active = false
Visible: Products completely hidden from shop
```

### Example Workflows

**Scenario 1: Seasonal Product Rotation**
1. Select all winter products (use search/filter)
2. Click "Mark Out of Stock" (end of season)
3. Select all summer products
4. Click "Mark Available" (start of season)

**Scenario 2: Discontinued Product Cleanup**
1. Review products marked 'unknown' (from health checks)
2. Research each product on Amazon
3. Select discontinued products
4. Click "Mark Discontinued"
5. Optional: Bulk Deactivate to fully hide

**Scenario 3: New Product Launch**
1. Add new products via "Add Product" button
2. Initially set to 'unknown' availability
3. Verify products on Amazon
4. Select verified products
5. Click "Mark Available"

---

## Product Health Monitoring

### Automated Daily Health Checks

The system runs automated health checks **daily at 2 AM UTC**.

**What it checks**:
- Missing images (product has no image or placeholder)
- Missing prices (critical - prevents display in shop)
- Missing descriptions (affects SEO and user experience)
- Stale products (not updated in 30+ days)
- Unknown availability status

**Auto-fix behavior**:
- Products not updated in 30+ days → automatically marked as 'unknown'
- Forces manual review of potentially outdated products

### Manual Health Check

Run a health check anytime:

```bash
# Basic health check (no changes)
curl -X POST \
  https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check

# With auto-fix (marks stale products as 'unknown')
curl -X POST \
  "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?autoFix=true"

# Custom stale threshold (60 days)
curl -X POST \
  "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?staleDays=60&autoFix=true"
```

### Reading Health Reports

**Example Health Report**:
```json
{
  "total_products": 81,
  "healthy_products": 65,
  "products_with_issues": [
    {
      "product_id": "abc-123-def-456",
      "title": "Adventure Kings Recovery Tracks",
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

**Severity Levels**:
- **High**: Missing price (blocks shop display)
- **Medium**: Missing image, stale product (affects user experience)
- **Low**: Missing description (minor impact)

### Responding to Health Issues

**Priority 1 - High Severity** (missing prices):
1. Search product ASIN on Amazon
2. Update price in admin dashboard
3. Click "Save" to update product

**Priority 2 - Medium Severity** (stale products):
1. Review products marked 'unknown' by auto-fix
2. Check Amazon for current availability
3. Bulk update status: Available, Out of Stock, or Discontinued

**Priority 3 - Low Severity** (missing descriptions):
1. Copy description from Amazon product page
2. Update in admin dashboard
3. Improves SEO and conversion rates

### Monitoring Dashboard (Future Enhancement)

**Coming soon**:
- Health status badge in admin dashboard
- Visual chart of product health over time
- Email alerts for critical issues (missing prices)
- One-click "Fix All" for common issues

---

## User Issue Reports

### Accessing Reports

**Via Admin Dashboard** (coming soon):
- Navigate to `/admin/shop-management`
- Click "User Reports" tab
- View all submitted reports

**Via Database Query** (current method):
```sql
SELECT
  pir.id,
  pir.issue_type,
  pir.notes,
  pir.status,
  pir.created_at,
  pir.product_snapshot,
  ap.title AS product_title,
  u.email AS reporter_email
FROM product_issue_reports pir
LEFT JOIN affiliate_products ap ON pir.product_id = ap.id
LEFT JOIN auth.users u ON pir.user_id = u.id
WHERE pir.status = 'pending'
ORDER BY pir.created_at DESC;
```

### Report Types

| Issue Type | Description | Action Required |
|------------|-------------|-----------------|
| `incorrect_price` | User reports price doesn't match Amazon | Verify on Amazon, update price |
| `out_of_stock` | User reports product unavailable | Check Amazon, update availability_status |
| `discontinued` | User reports product no longer sold | Verify, mark as discontinued |
| `broken_link` | Affiliate link doesn't work | Test link, update or regenerate |
| `wrong_image` | Image doesn't match product | Find correct image, update |
| `wrong_description` | Description inaccurate | Copy correct description from Amazon |
| `other` | Miscellaneous issue | Review notes, take appropriate action |

### Report Workflow

**1. Review Report**:
```sql
SELECT * FROM product_issue_reports
WHERE id = 'report-uuid-here';
```

**2. Investigate Issue**:
- Check `product_snapshot` for what user saw
- Visit Amazon using product ASIN
- Compare reported vs actual status

**3. Take Action**:
- Update product in admin dashboard
- Or mark product as discontinued/out of stock

**4. Update Report Status**:
```sql
UPDATE product_issue_reports
SET
  status = 'resolved',  -- or 'reviewed', 'dismissed'
  admin_notes = 'Updated price from $79.99 to $89.99',
  reviewed_at = NOW(),
  reviewed_by = 'your-user-id-here'
WHERE id = 'report-uuid-here';
```

### Report Statuses

- **pending**: Newly submitted, needs review
- **reviewed**: Admin has seen it, investigating
- **resolved**: Issue fixed, product updated
- **dismissed**: Not an issue or duplicate report

### Bulk Report Actions (Future Enhancement)

**Coming soon**:
- Mark multiple reports as resolved
- Auto-resolve reports when product updated
- Email notification to user when resolved
- Analytics: most common issues, response time

---

## Best Practices

### Weekly Maintenance Routine

**Monday** (15 minutes):
1. Review health check report from weekend
2. Fix any high-severity issues (missing prices)
3. Bulk update stale products marked 'unknown'

**Wednesday** (10 minutes):
1. Review user-submitted reports
2. Resolve simple issues (broken links, wrong images)
3. Flag complex issues for deeper investigation

**Friday** (20 minutes):
1. Run manual health check with auto-fix
2. Clean up discontinued products
3. Update prices for products with price change reports
4. Archive old reports (30+ days, resolved status)

### Product Update Guidelines

**When updating products**:
- Always set `availability_status` (don't leave as 'unknown')
- Verify price on Amazon before updating
- Update `updated_at` timestamp (automatic via trigger)
- Add admin notes for significant changes

**When adding new products**:
- Set `availability_status = 'available'` immediately
- Add high-quality image (not placeholder)
- Write descriptive product description
- Set correct category and tags
- Set `is_active = true` to make visible

### Data Quality Standards

**Required fields** (prevents shop display issues):
- `title`: Clear, descriptive product name
- `price`: Current Amazon price in correct currency
- `currency`: USD, AUD, EUR, GBP (must match price)
- `image_url`: High-quality product image (not placeholder)
- `affiliate_url`: Valid Amazon affiliate link
- `availability_status`: available, out_of_stock, discontinued, or unknown

**Recommended fields** (improves conversions):
- `description`: 2-3 sentences about product benefits
- `category`: Accurate categorization for filtering
- `tags`: Keywords for search and recommendations
- `regional_asins`: Multi-region support (AU, US, UK, etc.)

---

## Troubleshooting

### Products Not Showing in Shop

**Checklist**:
1. ✅ `is_active = true`
2. ✅ `availability_status = 'available'`
3. ✅ `price` is not null
4. ✅ `affiliate_url` is valid
5. ✅ Product not filtered by user's region

**SQL to find hidden products**:
```sql
SELECT id, title, is_active, availability_status, price
FROM affiliate_products
WHERE is_active = false
   OR availability_status != 'available'
   OR price IS NULL;
```

### Bulk Actions Not Working

**Common issues**:
- **No products selected**: Click checkboxes to select products
- **Permission denied**: Ensure you're logged in as admin
- **Database error**: Check browser console for error details
- **RLS blocking**: Admin role must be in JWT token

**Fix**:
1. Log out and log back in (refreshes JWT token)
2. Verify admin status in `admin_users` table
3. Check browser console for specific error
4. Try updating individual product first

### Health Check Not Running

**Check cron configuration**:
```bash
# View current config
cat supabase/config.toml | grep -A 5 "product-health-check"

# Expected output:
# [functions.product-health-check]
# verify_jwt = false
# [functions.product-health-check.cron]
# schedule = "0 2 * * *"
```

**Manual trigger to test**:
```bash
curl -X POST \
  https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
```

**View function logs**:
```bash
supabase functions logs product-health-check
```

### User Reports Not Saving

**Check RLS policies**:
```sql
SELECT * FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'product_issue_reports';
```

**Test insert manually**:
```sql
INSERT INTO product_issue_reports (
  product_id,
  issue_type,
  notes
) VALUES (
  'existing-product-id-here',
  'incorrect_price',
  'Test report'
);
```

**Common fixes**:
- Ensure `allow_insert_reports` policy exists
- Verify `product_id` references valid product
- Check browser console for JavaScript errors

---

## Quick Reference

### SQL Queries

**Find products needing attention**:
```sql
SELECT id, title, availability_status, price, updated_at
FROM affiliate_products
WHERE availability_status = 'unknown'
   OR price IS NULL
   OR image_url LIKE '%placeholder%'
ORDER BY updated_at ASC
LIMIT 20;
```

**Count products by status**:
```sql
SELECT
  availability_status,
  COUNT(*) as count
FROM affiliate_products
GROUP BY availability_status
ORDER BY count DESC;
```

**Recent user reports**:
```sql
SELECT
  issue_type,
  COUNT(*) as count
FROM product_issue_reports
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY issue_type
ORDER BY count DESC;
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/functions/v1/product-health-check` | POST | Run health check |
| `/api/v1/admin/affiliate-products` | GET | List all products (admin) |
| `/api/v1/admin/affiliate-products` | POST | Create product |
| `/api/v1/admin/affiliate-products/:id` | PUT | Update product |
| `/api/v1/admin/affiliate-products/:id` | DELETE | Delete product |

### Keyboard Shortcuts (Admin Dashboard)

- **Ctrl/Cmd + Click**: Multi-select products
- **Shift + Click**: Range select
- **Escape**: Close dialogs
- **Enter**: Submit forms

---

## Support

**Questions?**
- Check the [Shop Technical Documentation](./SHOP_TECHNICAL_DOCUMENTATION.md)
- Review [Database Schema Reference](./DATABASE_SCHEMA_REFERENCE.md)
- Contact technical team for database access issues

**Feature Requests?**
- Submit GitHub issue with label `enhancement`
- Tag as `admin-dashboard` for UI improvements
- Tag as `product-management` for workflow enhancements

---

**Last Updated**: January 5, 2025
**Version**: 1.0
**Maintainer**: Wheels & Wins Engineering Team
