# Wheels & Wins Shop - Technical Documentation

**Last Updated**: November 25, 2025
**Schema Version**: 2.0 (Affiliate Shop Migration)
**Database**: Supabase PostgreSQL

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Data Structures](#data-structures)
4. [Frontend Implementation](#frontend-implementation)
5. [Regional Pricing System](#regional-pricing-system)
6. [Analytics & Tracking](#analytics--tracking)
7. [Security & RLS Policies](#security--rls-policies)
8. [API Integration](#api-integration)
9. [Example Queries](#example-queries)

---

## System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Shop.tsx    │  │ProductsData  │  │ ProductGrid  │     │
│  │  (Main Page) │→ │   .ts        │→ │   (Display)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Supabase Client
                         │ (Auto-authenticated)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Supabase PostgreSQL                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              affiliate_products                       │  │
│  │  - 81 Amazon products                                 │  │
│  │  - Regional pricing (JSONB)                          │  │
│  │  - Regional URLs (JSONB)                             │  │
│  │  - Regional ASINs (JSONB)                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          affiliate_product_clicks                     │  │
│  │  - Click tracking                                     │  │
│  │  - User analytics                                     │  │
│  │  - Conversion data                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Redirect on click
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Amazon Associates                          │
│  - US: amazon.com (tag: unimogcommuni-22)                  │
│  - AU: amazon.com.au (tag: unimogcommuni-22)               │
│  - Region-specific affiliate links                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **81 Amazon Affiliate Products**: Curated RV/travel gear
- **Regional Pricing**: Automatic price conversion (AU, US, etc.)
- **Regional URLs**: Country-specific Amazon affiliate links
- **Click Analytics**: Track product interactions
- **Admin Panel**: Product management (coming soon)
- **PAM Integration**: AI-powered shopping assistant

---

## Database Schema

### Tables Overview

| Table | Purpose | Row Count |
|-------|---------|-----------|
| `affiliate_products` | Main product catalog | 81 |
| `affiliate_product_clicks` | Click tracking & analytics | Growing |
| `products_legacy_backup` | Old Unimog shop backup | Archived |

---

### Table: `affiliate_products`

**Primary product catalog for the shop system.**

#### Schema Definition

```sql
CREATE TABLE affiliate_products (
  -- Core Identity
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,

  -- Product Information
  title text NOT NULL,
  description text,
  short_description text,
  category product_category NOT NULL,
  tags text[],

  -- Pricing (Base/Default)
  price numeric,
  currency text DEFAULT 'USD',

  -- Media
  image_url text,
  additional_images text[],

  -- Affiliate Configuration
  affiliate_provider affiliate_provider NOT NULL,
  affiliate_url text NOT NULL,
  commission_rate numeric,

  -- Display & Sorting
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,

  -- Analytics
  click_count integer DEFAULT 0,

  -- Amazon-Specific Fields
  asin text,                   -- Primary Amazon Standard ID
  regional_asins jsonb,        -- Country-specific ASINs
  regional_prices jsonb,       -- Country-specific pricing
  regional_urls jsonb          -- Country-specific affiliate URLs
);
```

#### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | gen_random_uuid() | Primary key |
| `title` | text | NOT NULL | - | Product name (e.g., "Uharbour Tire Inflation Kit") |
| `description` | text | NULL | - | Full product description |
| `short_description` | text | NULL | - | Brief summary (optional) |
| `category` | product_category | NOT NULL | - | One of 8 enum categories |
| `price` | numeric | NULL | - | Base price (typically AUD) |
| `currency` | text | NULL | 'USD' | Base currency code |
| `image_url` | text | NULL | - | Primary product image URL |
| `additional_images` | text[] | NULL | - | Array of extra image URLs |
| `affiliate_provider` | affiliate_provider | NOT NULL | - | 'amazon', 'ebay', or 'custom' |
| `affiliate_url` | text | NOT NULL | - | Default affiliate link |
| `commission_rate` | numeric | NULL | - | Expected commission % (e.g., 4.5) |
| `is_featured` | boolean | NULL | false | Show in featured carousel |
| `is_active` | boolean | NULL | true | Show in shop (must be true) |
| `click_count` | integer | NULL | 0 | Total clicks tracked |
| `tags` | text[] | NULL | - | Array of tags (e.g., ['tire','inflation']) |
| `sort_order` | integer | NULL | 0 | Display order (0-80) |
| `created_at` | timestamptz | NULL | now() | Record creation time |
| `updated_at` | timestamptz | NULL | now() | Last update (auto-updated) |
| `created_by` | uuid | NULL | - | User ID of creator |
| `asin` | text | NULL | - | Amazon Standard ID (US/primary) |
| `regional_asins` | jsonb | NULL | - | Country → ASIN mapping |
| `regional_prices` | jsonb | NULL | - | Country → price object |
| `regional_urls` | jsonb | NULL | - | Country → affiliate URL |

#### Enum Types

```sql
-- Affiliate Provider Options
CREATE TYPE affiliate_provider AS ENUM (
  'amazon',
  'ebay',
  'custom'
);

-- Product Category Options
CREATE TYPE product_category AS ENUM (
  'recovery_gear',        -- Winches, straps, recovery boards
  'camping_expedition',   -- Tents, sleeping, outdoor gear
  'tools_maintenance',    -- Tools, maintenance equipment
  'parts_upgrades',       -- Vehicle parts, upgrades
  'books_manuals',        -- Guides, manuals, educational
  'apparel_merchandise',  -- Clothing, branded merch
  'electronics',          -- Cameras, GPS, tech
  'outdoor_gear'          -- General outdoor equipment
);
```

#### Indexes

```sql
-- Performance Indexes
CREATE INDEX idx_affiliate_products_provider ON affiliate_products(affiliate_provider);
CREATE INDEX idx_affiliate_products_category ON affiliate_products(category);
CREATE INDEX idx_affiliate_products_is_active ON affiliate_products(is_active);
CREATE INDEX idx_affiliate_products_sort_order ON affiliate_products(sort_order);
CREATE INDEX idx_affiliate_products_created_at ON affiliate_products(created_at);
```

**Query Performance**:
- `SELECT * WHERE affiliate_provider = 'amazon' AND is_active = true` → **Uses indexes** ✅
- `SELECT * ORDER BY sort_order ASC` → **Uses index** ✅

---

### Table: `affiliate_product_clicks`

**Analytics table tracking user interactions with products.**

#### Schema Definition

```sql
CREATE TABLE affiliate_product_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES affiliate_products(id) ON DELETE CASCADE,
  user_id uuid,
  clicked_at timestamp with time zone DEFAULT now(),
  user_agent text,
  ip_address inet,
  referrer text,
  metadata jsonb
);
```

#### Column Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK to affiliate_products (CASCADE delete) |
| `user_id` | uuid | User ID (NULL if anonymous) |
| `clicked_at` | timestamptz | Click timestamp |
| `user_agent` | text | Browser user agent string |
| `ip_address` | inet | User IP (for geo tracking) |
| `referrer` | text | HTTP referrer URL |
| `metadata` | jsonb | Extra data (screen size, viewport, region) |

#### Indexes

```sql
CREATE INDEX idx_affiliate_clicks_product ON affiliate_product_clicks(product_id);
CREATE INDEX idx_affiliate_clicks_clicked_at ON affiliate_product_clicks(clicked_at);
```

#### Example Metadata JSONB

```json
{
  "screen_resolution": "1920x1080",
  "viewport": "1440x900",
  "region": "Australia",
  "browser": "Chrome",
  "device": "desktop"
}
```

---

## Data Structures

### Regional JSONB Fields

All regional data uses **JSONB** format for flexible, queryable storage.

#### `regional_asins` (JSONB)

Maps country codes to Amazon Standard IDs.

**Structure**:
```json
{
  "AU": "B0DJQF9DY8",
  "US": "B0DDK8M3CV",
  "UK": "B0DJQF9DY9",
  "CA": "B0DDK8M3CW"
}
```

**Access in SQL**:
```sql
-- Get US ASIN
SELECT regional_asins->>'US' as us_asin FROM affiliate_products;

-- Check if AU version exists
SELECT * FROM affiliate_products WHERE regional_asins ? 'AU';
```

**Access in TypeScript**:
```typescript
const regionalAsins = product.regional_asins as Record<string, string>;
const auAsin = regionalAsins['AU']; // "B0DJQF9DY8"
```

---

#### `regional_prices` (JSONB)

Maps country codes to price objects with amount and currency.

**Structure**:
```json
{
  "AU": {
    "amount": 169.83,
    "currency": "AUD",
    "formatted": "AUD 169.83"
  },
  "US": {
    "amount": 79.99,
    "currency": "USD",
    "formatted": "USD 79.99"
  }
}
```

**Access in SQL**:
```sql
-- Get AU price amount
SELECT (regional_prices->'AU'->>'amount')::numeric as au_price
FROM affiliate_products;

-- Get all products under $100 USD
SELECT * FROM affiliate_products
WHERE (regional_prices->'US'->>'amount')::numeric < 100;
```

**Access in TypeScript**:
```typescript
interface PriceObject {
  amount: number;
  currency: string;
  formatted?: string;
}

const regionalPrices = product.regional_prices as Record<string, PriceObject>;
const auPrice = regionalPrices['AU'];
// { amount: 169.83, currency: "AUD", formatted: "AUD 169.83" }
```

---

#### `regional_urls` (JSONB)

Maps country codes to affiliate URLs with country-specific tracking tags.

**Structure**:
```json
{
  "AU": "https://www.amazon.com.au/dp/B0DJQF9DY8?tag=unimogcommuni-22",
  "US": "https://www.amazon.com/dp/B0DDK8M3CV?tag=unimogcommuni-22"
}
```

**Access in SQL**:
```sql
-- Get US affiliate URL
SELECT regional_urls->>'US' as us_url FROM affiliate_products;
```

**Access in TypeScript**:
```typescript
const regionalUrls = product.regional_urls as Record<string, string>;
const auUrl = regionalUrls['AU'];
// "https://www.amazon.com.au/dp/B0DJQF9DY8?tag=unimogcommuni-22"
```

---

### Example Product Record

**Complete database row example**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Uharbour Tire Inflation Deflation Kit",
  "description": "Professional tire pressure management system with equalizer. Essential for off-road terrain adjustments.",
  "short_description": null,
  "category": "tools_maintenance",
  "price": 79.99,
  "currency": "AUD",
  "image_url": "https://m.media-amazon.com/images/I/71x7yRtqbcL._AC_SX522_.jpg",
  "additional_images": null,
  "affiliate_provider": "amazon",
  "affiliate_url": "https://www.amazon.com/dp/B0DDK8M3CV?tag=unimogcommuni-22",
  "commission_rate": 4.50,
  "is_featured": false,
  "is_active": true,
  "click_count": 127,
  "tags": ["tire", "inflation", "deflation", "pressure"],
  "sort_order": 0,
  "created_at": "2025-11-22T10:30:00Z",
  "updated_at": "2025-11-25T15:45:00Z",
  "created_by": null,
  "asin": "B0DDK8M3CV",
  "regional_asins": {
    "AU": "B0DJQF9DY8",
    "US": "B0DDK8M3CV"
  },
  "regional_prices": {
    "AU": {
      "amount": 169.83,
      "currency": "AUD",
      "formatted": "AUD 169.83"
    },
    "US": {
      "amount": 79.99,
      "currency": "USD",
      "formatted": "USD 79.99"
    }
  },
  "regional_urls": {
    "AU": "https://www.amazon.com.au/dp/B0DJQF9DY8?tag=unimogcommuni-22",
    "US": "https://www.amazon.com/dp/B0DDK8M3CV?tag=unimogcommuni-22"
  }
}
```

---

## Frontend Implementation

### TypeScript Types

**File**: `src/components/shop/types.ts`

```typescript
import { Region } from "@/context/RegionContext";

export interface BaseProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  availableRegions: Region[];
  categories?: string[];
  brand?: string;
}

export interface AffiliateProduct extends BaseProduct {
  externalLink: string;        // Regional URL selected based on user region
  isPamRecommended?: boolean;   // Maps to is_featured
}

export interface DigitalProduct extends BaseProduct {
  price: number;
  currency: string;
  type: string;
}

export type ShopProduct = AffiliateProduct | DigitalProduct;
```

### Data Fetching

**File**: `src/components/shop/ProductsData.ts`

```typescript
export async function getAffiliateProductsFromDB(
  userRegion?: Region
): Promise<AffiliateProduct[]> {
  const { data, error } = await supabase
    .from('affiliate_products')
    .select('*')
    .eq('affiliate_provider', 'amazon')  // Only Amazon products
    .eq('is_active', true)               // Only active products
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data || []).map(product => {
    // Select regional URL based on user's region
    const externalLink = userRegion
      ? getRegionalUrl(product, userRegion)
      : product.affiliate_url;

    return {
      id: product.id,
      title: product.title,
      description: product.description || '',
      image: product.image_url || "/placeholder-product.jpg",
      externalLink: externalLink,
      availableRegions: getAvailableRegions(product.regional_asins),
      isPamRecommended: product.is_featured || false,
      categories: product.tags || [],
      brand: product.category
    };
  });
}
```

### Regional URL Selection

```typescript
function getRegionalUrl(product: any, userRegion: Region): string {
  const countryCode = REGION_CONFIG[userRegion]?.country;

  // Check if product has regional URLs
  if (product.regional_urls && typeof product.regional_urls === 'object') {
    const regionalUrl = product.regional_urls[countryCode];
    if (regionalUrl) {
      return regionalUrl; // Return country-specific URL
    }
  }

  // Fallback to default affiliate URL
  return product.affiliate_url || "#";
}
```

**Example Flow**:
```
User in Australia
  ↓
userRegion = "Australia"
  ↓
countryCode = "AU" (from REGION_CONFIG)
  ↓
product.regional_urls["AU"]
  ↓
"https://www.amazon.com.au/dp/B0DJQF9DY8?tag=unimogcommuni-22"
```

---

## Regional Pricing System

### How It Works

1. **Base Price**: Product has default `price` and `currency` (typically AUD)
2. **Regional Prices**: JSONB `regional_prices` contains specific prices per country
3. **Frontend Selection**: Based on user's detected region
4. **Display**: Shows price in user's local currency

### Region Configuration

**File**: `src/context/RegionContext.tsx`

```typescript
export const REGION_CONFIG = {
  "Australia": { country: "AU", currency: "AUD" },
  "United States": { country: "US", currency: "USD" },
  "United Kingdom": { country: "GB", currency: "GBP" },
  "Canada": { country: "CA", currency: "CAD" },
  "New Zealand": { country: "NZ", currency: "NZD" },
  "Rest of the World": { country: "US", currency: "USD" }
};
```

### Available Regions Detection

```typescript
function getAvailableRegions(regionalAsins: any): Region[] {
  if (!regionalAsins || typeof regionalAsins !== 'object') {
    return ['Rest of the World'];
  }

  const countryToRegion: Record<string, Region> = {
    'AU': 'Australia',
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'NZ': 'New Zealand'
  };

  const regions: Region[] = [];
  Object.keys(regionalAsins).forEach(countryCode => {
    const region = countryToRegion[countryCode];
    if (region) regions.push(region);
  });

  return regions.length > 0 ? regions : ['Rest of the World'];
}
```

**Example**:
```json
// Product has regional_asins: { "AU": "...", "US": "..." }
// Returns: ["Australia", "United States"]
```

---

## Analytics & Tracking

### Click Tracking Flow

```
1. User clicks product
   ↓
2. Frontend calls trackProductClick()
   ↓
3. Insert into affiliate_product_clicks table
   {
     product_id: "uuid",
     user_id: "uuid-or-null",
     clicked_at: "2025-11-25T10:30:00Z",
     user_agent: "Mozilla/5.0...",
     metadata: { region: "Australia", viewport: "1440x900" }
   }
   ↓
4. Call increment_product_clicks() PostgreSQL function
   UPDATE affiliate_products SET click_count = click_count + 1
   ↓
5. Redirect user to Amazon affiliate URL
```

### Frontend Tracking Code

**File**: `src/pages/Shop.tsx` (lines 81-106)

```typescript
const handleExternalLinkClick = async (url: string, productId?: string) => {
  if (productId) {
    try {
      // Track click in database
      await supabase.from('affiliate_product_clicks').insert({
        product_id: productId,
        user_id: user?.id || null,
        clicked_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        metadata: {
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          region: region
        }
      });

      // Increment click count
      await supabase.rpc('increment_product_clicks', {
        product_uuid: productId
      });
    } catch (error) {
      console.error('Error tracking click:', error);
      // Don't block redirect if tracking fails
    }
  }

  // Open affiliate link
  window.open(url, '_blank', 'noopener,noreferrer');
};
```

### PostgreSQL Function

```sql
CREATE OR REPLACE FUNCTION increment_product_clicks(product_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE affiliate_products
  SET click_count = click_count + 1
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;
```

### Analytics Queries

**Most clicked products**:
```sql
SELECT title, click_count, category
FROM affiliate_products
WHERE is_active = true
ORDER BY click_count DESC
LIMIT 10;
```

**Click rate by category**:
```sql
SELECT
  category,
  COUNT(*) as total_products,
  SUM(click_count) as total_clicks,
  ROUND(AVG(click_count), 2) as avg_clicks_per_product
FROM affiliate_products
WHERE is_active = true
GROUP BY category
ORDER BY total_clicks DESC;
```

**Recent clicks with user data**:
```sql
SELECT
  p.title,
  c.clicked_at,
  c.metadata->>'region' as user_region,
  c.user_id IS NOT NULL as logged_in
FROM affiliate_product_clicks c
JOIN affiliate_products p ON c.product_id = p.id
ORDER BY c.clicked_at DESC
LIMIT 20;
```

---

## Security & RLS Policies

### Row Level Security (RLS)

**RLS is ENABLED on both tables**:
```sql
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_product_clicks ENABLE ROW LEVEL SECURITY;
```

### Current Policies

#### affiliate_products Table

1. **Public Read Access** (Active Products)
   ```sql
   CREATE POLICY "Public can view active products"
     ON affiliate_products FOR SELECT
     USING (is_active = true);
   ```
   - **Who**: Everyone (anon, authenticated)
   - **What**: Can SELECT/read products
   - **When**: Only if `is_active = true`

2. **Admin Full Access** (Requires is_admin() function)
   ```sql
   CREATE POLICY "Admins have full access"
     ON affiliate_products FOR ALL
     USING (public.is_admin());
   ```
   - **Who**: Users where `profiles.role = 'admin'`
   - **What**: Can SELECT, INSERT, UPDATE, DELETE
   - **Function**: Uses `is_admin()` SECURITY DEFINER function

#### affiliate_product_clicks Table

1. **Public Click Tracking**
   ```sql
   CREATE POLICY "Public can insert clicks"
     ON affiliate_product_clicks FOR INSERT
     WITH CHECK (true);
   ```
   - **Who**: Everyone (anon, authenticated)
   - **What**: Can INSERT click records
   - **Privacy**: Individual users can't read others' clicks

2. **Admin Analytics Access**
   ```sql
   CREATE POLICY "Admins can view all clicks"
     ON affiliate_product_clicks FOR SELECT
     USING (public.is_admin());
   ```
   - **Who**: Admin users only
   - **What**: Can SELECT all click data
   - **Purpose**: Analytics dashboard

3. **Users View Own Clicks**
   ```sql
   CREATE POLICY "Users can view own clicks"
     ON affiliate_product_clicks FOR SELECT
     USING (user_id = auth.uid());
   ```
   - **Who**: Authenticated users
   - **What**: Can SELECT only their own click history
   - **Filter**: `user_id = auth.uid()`

### is_admin() Function

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

**Security Features**:
- ✅ `SECURITY DEFINER`: Runs with elevated privileges
- ✅ Only checks `profiles.role = 'admin'` (simple, secure)
- ✅ Uses `auth.uid()` from Supabase JWT token
- ✅ Returns boolean (safe for RLS policies)

### Testing RLS Policies

**As anonymous user**:
```sql
-- Should return active products only
SELECT * FROM affiliate_products;

-- Should be able to log clicks
INSERT INTO affiliate_product_clicks (product_id, clicked_at)
VALUES ('550e8400-e29b-41d4-a716-446655440000', now());

-- Should fail (no permission)
UPDATE affiliate_products SET price = 99.99 WHERE id = '...';
```

**As admin user**:
```sql
-- Should return ALL products (active and inactive)
SELECT * FROM affiliate_products;

-- Should work (admin has full access)
UPDATE affiliate_products SET price = 99.99 WHERE id = '...';

-- Should see all clicks
SELECT * FROM affiliate_product_clicks;
```

---

## API Integration

### Supabase Client

**File**: `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
```

**Environment Variables** (`.env`):
```bash
VITE_SUPABASE_URL=https://ydevatqwkoccxhtejdor.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### API Endpoints

The shop uses **direct Supabase client queries**, not REST endpoints.

**Advantages**:
- ✅ Automatic RLS enforcement
- ✅ Real-time updates (subscriptions possible)
- ✅ Type-safe with TypeScript
- ✅ No custom backend needed
- ✅ Automatic JWT authentication

**Example API Call**:
```typescript
// Fetch active Amazon products, sorted by sort_order
const { data, error } = await supabase
  .from('affiliate_products')
  .select('*')
  .eq('affiliate_provider', 'amazon')
  .eq('is_active', true)
  .order('sort_order', { ascending: true });
```

**Generated SQL**:
```sql
SELECT *
FROM affiliate_products
WHERE affiliate_provider = 'amazon'
  AND is_active = true
ORDER BY sort_order ASC;
```

---

## Example Queries

### Product Queries

**Get all active products**:
```sql
SELECT * FROM affiliate_products
WHERE is_active = true
ORDER BY sort_order ASC;
```

**Get products by category**:
```sql
SELECT * FROM affiliate_products
WHERE category = 'tools_maintenance'
  AND is_active = true
ORDER BY click_count DESC;
```

**Get featured products**:
```sql
SELECT * FROM affiliate_products
WHERE is_featured = true
  AND is_active = true
ORDER BY sort_order ASC
LIMIT 6;
```

**Search products by tag**:
```sql
SELECT * FROM affiliate_products
WHERE 'tire' = ANY(tags)
  AND is_active = true;
```

**Get products with AU regional pricing**:
```sql
SELECT
  title,
  regional_prices->'AU'->>'amount' as au_price,
  regional_prices->'AU'->>'currency' as au_currency
FROM affiliate_products
WHERE regional_prices ? 'AU'
  AND is_active = true;
```

**Products missing regional data**:
```sql
SELECT id, title, asin
FROM affiliate_products
WHERE regional_asins IS NULL
   OR regional_prices IS NULL
   OR regional_urls IS NULL;
```

### Analytics Queries

**Total clicks in last 7 days**:
```sql
SELECT COUNT(*) as clicks
FROM affiliate_product_clicks
WHERE clicked_at >= NOW() - INTERVAL '7 days';
```

**Top 10 products by clicks (last 30 days)**:
```sql
SELECT
  p.title,
  p.category,
  COUNT(c.id) as recent_clicks,
  p.click_count as total_clicks
FROM affiliate_products p
LEFT JOIN affiliate_product_clicks c
  ON p.id = c.product_id
  AND c.clicked_at >= NOW() - INTERVAL '30 days'
WHERE p.is_active = true
GROUP BY p.id, p.title, p.category, p.click_count
ORDER BY recent_clicks DESC
LIMIT 10;
```

**Click-through rate by region**:
```sql
SELECT
  c.metadata->>'region' as user_region,
  COUNT(*) as clicks,
  COUNT(DISTINCT c.user_id) as unique_users
FROM affiliate_product_clicks c
WHERE c.clicked_at >= NOW() - INTERVAL '30 days'
GROUP BY c.metadata->>'region'
ORDER BY clicks DESC;
```

**Products with no clicks**:
```sql
SELECT title, category, created_at
FROM affiliate_products
WHERE click_count = 0
  AND is_active = true
ORDER BY created_at DESC;
```

### Maintenance Queries

**Update all products to active**:
```sql
UPDATE affiliate_products
SET is_active = true
WHERE affiliate_provider = 'amazon';
```

**Reset click counts**:
```sql
UPDATE affiliate_products
SET click_count = 0;
```

**Delete old click data (>90 days)**:
```sql
DELETE FROM affiliate_product_clicks
WHERE clicked_at < NOW() - INTERVAL '90 days';
```

**Find duplicate ASINs**:
```sql
SELECT asin, COUNT(*) as count
FROM affiliate_products
GROUP BY asin
HAVING COUNT(*) > 1;
```

**Remove duplicates (keep first)**:
```sql
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY asin ORDER BY created_at ASC) as rn
  FROM affiliate_products
)
DELETE FROM affiliate_products
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
```

---

## Data Migration

### Migration Files

Located in: `docs/sql-fixes/`

1. **`migrate_to_affiliate_shop.sql`** (267 lines)
   - Creates schema (tables, enums, indexes)
   - Enables RLS
   - Creates policies
   - Backs up old products table

2. **`import_amazon_products.sql`** (264 lines)
   - Inserts 81 Amazon products
   - Includes regional data
   - Transaction-wrapped (BEGIN/COMMIT)

3. **`remove_duplicates_simple.sql`**
   - Removes duplicate products
   - Keeps first by created_at + asin

### Migration Order

```bash
# Step 1: Create schema
psql < docs/sql-fixes/migrate_to_affiliate_shop.sql

# Step 2: Import products
psql < docs/sql-fixes/import_amazon_products.sql

# Step 3: Verify
psql -c "SELECT COUNT(*) FROM affiliate_products;"
# Expected: 81
```

---

## Troubleshooting

### Common Issues

**Issue**: "No products found" in shop
- **Cause**: `is_active = false` or `affiliate_provider != 'amazon'`
- **Fix**: Run `UPDATE affiliate_products SET is_active = true;`

**Issue**: 403 error accessing products
- **Cause**: Missing RLS policies or `is_admin()` function
- **Fix**: Run `create_is_admin_function.sql` and verify RLS policies

**Issue**: Duplicate products (162 instead of 81)
- **Cause**: Import script run twice
- **Fix**: Run `remove_duplicates_simple.sql`

**Issue**: Wrong regional URL shown
- **Cause**: User region not detected or missing regional_urls data
- **Fix**: Check RegionContext and verify JSONB data

**Issue**: Click tracking not working
- **Cause**: RLS policy blocking inserts
- **Fix**: Verify "Public can insert clicks" policy exists

### Debug Queries

**Check RLS policies**:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('affiliate_products', 'affiliate_product_clicks')
ORDER BY tablename, policyname;
```

**Check is_admin() function**:
```sql
SELECT proname, prosecdef, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'is_admin';
```

**Check table permissions**:
```sql
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'affiliate_products';
```

**Check user's role**:
```sql
SELECT id, email, role
FROM profiles
WHERE email = 'your-email@example.com';
```

---

## Future Enhancements

### Planned Features

1. **Admin Panel** (In Progress)
   - CRUD operations for products
   - Click analytics dashboard
   - Bulk import/export
   - Image upload to Supabase Storage

2. **PAM Integration** (Planned)
   - AI-powered product recommendations
   - Conversational shopping assistant
   - Automatic deal detection

3. **Advanced Analytics** (Planned)
   - Conversion tracking
   - Revenue estimation
   - A/B testing support
   - Heatmap visualization

4. **Multi-Provider Support** (Planned)
   - eBay affiliate integration
   - Custom affiliate networks
   - Digistore24 digital products

5. **Search & Filters** (Planned)
   - Full-text search
   - Advanced filtering (price range, category, tags)
   - Saved searches

---

## Additional Resources

### Documentation Files

- `docs/sql-fixes/migrate_to_affiliate_shop.sql` - Schema migration
- `docs/sql-fixes/import_amazon_products.sql` - Product data
- `docs/sql-fixes/create_is_admin_function.sql` - Admin function
- `docs/DATABASE_SCHEMA_REFERENCE.md` - Complete database docs

### Frontend Files

- `src/pages/Shop.tsx` - Main shop page
- `src/components/shop/ProductsData.ts` - Data fetching
- `src/components/shop/ProductGrid.tsx` - Product display
- `src/components/shop/types.ts` - TypeScript types

### Backend Files

- `backend/app/services/pam/tools/shop/` - PAM shop tools (future)

---

**Last Updated**: November 25, 2025
**Maintained By**: Development Team
**Questions**: See `docs/` or contact support
