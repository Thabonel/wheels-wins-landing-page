# Digistore24 Integration Guide

## Overview

Wheels & Wins integrates with Digistore24 to provide automated affiliate product synchronization, commission tracking, and e-commerce capabilities for RV travelers. This integration enables users to discover and purchase curated products while generating affiliate income.

## Architecture

### Backend Components

#### 1. IPN Webhook Handler
**File**: `backend/app/api/v1/digistore24.py`
**Purpose**: Handles Instant Payment Notifications for real-time transaction processing

```python
@router.post("/ipn")
async def handle_ipn(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Processes payment notifications with SHA-512 signature validation
    Supported events: payment, refund, chargeback, affiliation
    """
```

**Security Features**:
- SHA-512 signature validation
- Request parameter verification
- Webhook logging for audit trail
- Idempotent transaction processing

#### 2. Marketplace Service
**File**: `backend/app/services/digistore24_marketplace.py`
**Purpose**: Interfaces with Digistore24 Marketplace API for product discovery

```python
class Digistore24MarketplaceService:
    async def search_products(self, categories: List[str], keywords: List[str] = None)
    async def sync_products_to_database(self, db: Client = None)
    async def map_product_to_db(self, product: dict)
    async def get_product_details(self, product_id: str)
```

**Key Features**:
- Multi-category product search
- Keyword-based filtering
- Automatic product mapping
- Commission percentage extraction
- Vendor rating integration

#### 3. Sync Worker
**File**: `backend/app/workers/digistore24_sync.py`
**Purpose**: Automated daily product synchronization

```python
class Digistore24SyncWorker:
    async def run_sync(self):
        """
        Executes daily at 3 AM UTC
        Syncs products from configured categories
        Updates existing products and adds new ones
        """
```

**Sync Process**:
1. Fetches products from all configured categories
2. Filters by relevance and quality metrics
3. Updates existing products in database
4. Adds new products with proper categorization
5. Logs sync results for monitoring

### Frontend Components

#### 1. Digistore24 Service
**File**: `src/services/digistore24Service.ts`
**Purpose**: Frontend API for checkout and tracking

```typescript
export const digistore24Service = {
  generateCheckoutUrl(params: Digistore24CheckoutParams): string {
    // Generates tracked affiliate URL with:
    // - User tracking parameters
    // - Custom tracking ID
    // - Return URL configuration
  },
  
  trackConversion(orderId: string, amount: number): Promise<void> {
    // Records successful conversions
    // Updates user's affiliate earnings
  }
}
```

#### 2. Thank You Page
**File**: `src/pages/ThankYouDigistore24.tsx`
**Purpose**: Validates purchases and tracks conversions

**Validation Process**:
1. Verifies return parameters (order_id, product_id, email)
2. Validates signature if configured
3. Records conversion in database
4. Updates user's commission balance
5. Displays success message

### Database Schema

#### Extended Tables

```sql
-- shop_products table additions
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS 
  digistore24_id VARCHAR(255) UNIQUE,
  commission_percentage DECIMAL(5,2),
  vendor_name VARCHAR(255),
  vendor_rating DECIMAL(3,2),
  auto_approve BOOLEAN DEFAULT false,
  marketplace_category VARCHAR(100),
  last_synced_at TIMESTAMP WITH TIME ZONE;

-- New sync tracking table
CREATE TABLE digistore24_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  products_added INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_removed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logging for security
CREATE TABLE digistore24_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  order_id VARCHAR(255),
  request_data JSONB,
  signature_valid BOOLEAN,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced affiliate_sales table
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS
  platform VARCHAR(50) DEFAULT 'digistore24',
  vendor_id VARCHAR(255),
  customer_email VARCHAR(255),
  refunded_at TIMESTAMP WITH TIME ZONE,
  chargeback_at TIMESTAMP WITH TIME ZONE;
```

## Configuration

### Environment Variables

```bash
# Required for Digistore24 integration
DIGISTORE24_VENDOR_ID=your_vendor_id
DIGISTORE24_API_KEY=your_api_key
DIGISTORE24_IPN_PASSPHRASE=your_secure_passphrase
DIGISTORE24_THANK_YOU_PAGE_KEY=your_thank_you_key

# Product sync configuration
DIGISTORE24_AUTO_IMPORT_CATEGORIES=travel_tourism,personal_development,health_wellness,spirituality_religion,business_investing,computers_internet,dating_relationships,ebusiness_emarketing,education,employment_jobs,fiction,food_wine,games,green_products,home_garden,languages,mobile,parenting_families,politics_society,reference,self_help,software_services,sports,arts_entertainment,betting_systems,music,photography,outdoor_activities,camping_caravanning,remote_work,digital_nomad
```

### Category Mapping

The integration supports 30+ Digistore24 categories targeting diverse demographics:

**Primary Categories for RV Travelers**:
- `travel_tourism` - Travel guides and resources
- `outdoor_activities` - Outdoor gear and guides
- `camping_caravanning` - RV-specific products
- `health_wellness` - Health and fitness products
- `personal_development` - Self-improvement resources

**Women Travelers (45+)**:
- `spirituality_religion` - Meditation and spiritual guides
- `arts_entertainment` - Creative pursuits
- `photography` - Travel photography resources
- `self_help` - Personal growth materials
- `home_garden` - Mobile living solutions

**Digital Nomads**:
- `remote_work` - Remote work tools
- `digital_nomad` - Location-independent resources
- `business_investing` - Online business guides
- `ebusiness_emarketing` - Digital marketing tools
- `computers_internet` - Tech solutions

## API Integration

### Marketplace API Endpoints

```python
# Search products by category
GET https://www.digistore24.com/api/call/getMarketplaceProducts/
params:
  - category: string (required)
  - search: string (optional)
  - language: string (default: 'en')
  
# Get product details
GET https://www.digistore24.com/api/call/getProductInfo/
params:
  - product_id: string (required)
```

### IPN Webhook Processing

```python
# Webhook endpoint
POST /api/v1/digistore24/ipn

# Expected parameters
{
  "event": "payment|refund|chargeback|affiliation",
  "order_id": "DS24-123456",
  "product_id": "123456",
  "amount": "49.99",
  "currency": "USD",
  "customer_email": "customer@example.com",
  "sha_signature": "computed_signature"
}
```

### Signature Validation

```python
def calculate_signature(passphrase: str, parameters: Dict[str, Any]) -> str:
    """
    Calculates SHA-512 signature for request validation
    """
    # Sort parameters alphabetically
    sorted_params = sorted(parameters.items())
    
    # Build parameter string
    param_string = ''.join([f"{k}{v}" for k, v in sorted_params])
    
    # Add passphrase and calculate SHA-512
    signature_string = f"{passphrase}{param_string}{passphrase}"
    return hashlib.sha512(signature_string.encode()).hexdigest()
```

## Frontend Integration

### Product Display Enhancement

```typescript
// Enhanced ProductCard component
interface Digistore24Product {
  digistore24_id: string;
  commission_percentage: number;
  vendor_name: string;
  vendor_rating: number;
  auto_approve: boolean;
  marketplace_category: string;
}

// Display commission badge
{product.commission_percentage && (
  <Badge variant="success">
    {product.commission_percentage}% Commission
  </Badge>
)}

// Show vendor rating
{product.vendor_rating && (
  <div className="flex items-center">
    <Star className="w-4 h-4 fill-yellow-400" />
    <span>{product.vendor_rating}/5</span>
  </div>
)}
```

### Checkout Flow

```typescript
// Generate affiliate checkout URL
const checkoutUrl = digistore24Service.generateCheckoutUrl({
  productId: product.digistore24_id,
  userId: currentUser.id,
  returnUrl: `${window.location.origin}/thank-you/digistore24`,
  customTracking: `WW_${currentUser.id}_${Date.now()}`
});

// Redirect to Digistore24
window.location.href = checkoutUrl;
```

## Monitoring & Analytics

### Sync Monitoring
- Daily sync logs in `digistore24_sync_logs` table
- Email alerts for sync failures
- Metrics: products added/updated/removed
- Performance tracking for API calls

### Conversion Tracking
- Real-time IPN webhook processing
- Commission calculation and attribution
- Refund and chargeback handling
- Monthly earnings reports

### Performance Metrics
- API response time monitoring
- Sync duration tracking
- Conversion rate analysis
- Product performance metrics

## Security Considerations

### API Security
- API keys stored in environment variables
- HTTPS-only communication
- Rate limiting on API calls
- Request signature validation

### Data Protection
- Customer email hashing
- Secure webhook processing
- Audit trail for all transactions
- GDPR-compliant data handling

### Error Handling
- Graceful API failure handling
- Retry logic with exponential backoff
- Comprehensive error logging
- User-friendly error messages

## Troubleshooting

### Common Issues

#### 1. Products Not Syncing
- Verify API key configuration
- Check category configuration
- Review sync logs for errors
- Ensure cron job is running

#### 2. IPN Webhooks Failing
- Validate passphrase configuration
- Check webhook URL accessibility
- Review webhook logs
- Verify signature calculation

#### 3. Conversions Not Tracking
- Ensure thank you page URL is correct
- Verify return parameters
- Check user session persistence
- Review conversion logs

### Debug Commands

```bash
# Manual product sync
python -m app.workers.digistore24_sync

# Test IPN webhook
curl -X POST http://localhost:8000/api/v1/digistore24/ipn \
  -H "Content-Type: application/json" \
  -d '{"event":"payment","order_id":"TEST-123",...}'

# Check sync status
SELECT * FROM digistore24_sync_logs ORDER BY created_at DESC LIMIT 10;

# View recent webhooks
SELECT * FROM digistore24_webhook_logs ORDER BY created_at DESC LIMIT 20;
```

## Best Practices

### Product Curation
1. Regular review of synced products
2. Quality threshold enforcement
3. Category-specific filtering
4. User preference matching
5. Commission optimization

### Performance Optimization
1. Batch API requests
2. Implement caching layer
3. Optimize database queries
4. Use connection pooling
5. Monitor API quotas

### User Experience
1. Clear commission disclosure
2. Transparent pricing
3. Easy checkout process
4. Mobile-optimized flow
5. Multi-language support

## Future Enhancements

### Planned Features
- Advanced product recommendations using AI
- Automated email marketing integration
- A/B testing for product placement
- Enhanced analytics dashboard
- Multi-marketplace support

### API Enhancements
- GraphQL endpoint support
- Webhook retry mechanism
- Real-time product updates
- Bulk operations support
- Advanced search filters

---

This integration enables Wheels & Wins to offer a comprehensive e-commerce experience while generating affiliate revenue, perfectly aligned with the platform's mission to help RV travelers save money and discover useful products for their journey.