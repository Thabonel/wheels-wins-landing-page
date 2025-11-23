# Amazon Shop Admin Controls - Technical Documentation

**Component**: `/src/components/admin/AmazonProductsManagement.tsx`
**Last Updated**: November 23, 2025
**Purpose**: Admin interface for managing Amazon affiliate products with regional support

---

## Overview

The Amazon Products Management component provides a comprehensive admin interface for managing affiliate products with support for:
- Multi-region Amazon product listings (AU, US, UK, EU)
- Drag & drop product reordering
- Currency auto-detection from Amazon URLs
- Click tracking and analytics
- CRUD operations with optimistic updates
- Regional pricing and ASIN management

---

## Architecture

### Data Layer (React Query)

**Query Key**: `['amazon-products-admin']`

**Data Fetching**:
```typescript
const { data: products, isLoading, error } = useQuery({
  queryKey: ['amazon-products-admin'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('*')
      .eq('affiliate_provider', 'amazon')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }
});
```

**Cache Invalidation**: Automatically invalidates on successful mutations (create, update, delete, reorder)

---

## CRUD Operations

### Create Product

**Mutation**:
```typescript
const createMutation = useMutation({
  mutationFn: async (newProduct: Partial<AffiliateProduct>) => {
    const { data, error } = await supabase
      .from('affiliate_products')
      .insert([{
        ...newProduct,
        affiliate_provider: 'amazon',
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
    toast.success('Product created successfully');
  }
});
```

**Form Fields**:
- `title` (required)
- `description`
- `short_description`
- `category` (enum: recovery_gear, camping_expedition, tools_maintenance, etc.)
- `price` (numeric)
- `currency` (auto-detected from URL, default: USD)
- `image_url` (Amazon product image)
- `affiliate_url` (Amazon affiliate link with tag)
- `asin` (Amazon Standard Identification Number)
- `tags` (array of strings)
- `is_featured` (boolean)
- `commission_rate` (numeric, default: 4.5%)

**Regional Fields** (JSONB):
- `regional_asins`: `{"AU":"B0XXX", "US":"B0YYY"}`
- `regional_prices`: `{"AU":{"amount":169.83,"currency":"AUD"}}`
- `regional_urls`: `{"AU":"https://amazon.com.au/dp/B0XXX?tag=..."}`

---

### Update Product

**Mutation**:
```typescript
const updateMutation = useMutation({
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<AffiliateProduct> }) => {
    const { data, error } = await supabase
      .from('affiliate_products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
    toast.success('Product updated successfully');
  }
});
```

---

### Delete Product

**Mutation**:
```typescript
const deleteMutation = useMutation({
  mutationFn: async (productId: string) => {
    const { error } = await supabase
      .from('affiliate_products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
    toast.success('Product deleted successfully');
  }
});
```

**Cascade Behavior**: Deleting a product also deletes all associated click tracking records (defined in schema: `ON DELETE CASCADE`)

---

## Drag & Drop Reordering

**Library**: `@dnd-kit/core` + `@dnd-kit/sortable`

**Implementation**:
```typescript
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement required to activate drag
    },
  })
);

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const oldIndex = products.findIndex(p => p.id === active.id);
  const newIndex = products.findIndex(p => p.id === over.id);

  // Optimistic update
  const reordered = arrayMove(products, oldIndex, newIndex);
  queryClient.setQueryData(['amazon-products-admin'], reordered);

  // Persist to database
  await Promise.all(
    reordered.map((product, index) =>
      supabase
        .from('affiliate_products')
        .update({ sort_order: index })
        .eq('id', product.id)
    )
  );
};
```

**Sortable Item**:
```typescript
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging
} = useSortable({ id: product.id });

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1
};
```

---

## Currency Auto-Detection

**Function**:
```typescript
function detectCurrencyFromUrl(urlOrAsin: string): string {
  if (!urlOrAsin) return 'USD';

  const urlLower = urlOrAsin.toLowerCase();

  // Regional detection
  if (urlLower.includes('amazon.com.au')) return 'AUD';
  if (urlLower.includes('amazon.de')) return 'EUR';
  if (urlLower.includes('amazon.fr')) return 'EUR';
  if (urlLower.includes('amazon.it')) return 'EUR';
  if (urlLower.includes('amazon.es')) return 'EUR';
  if (urlLower.includes('amazon.co.uk')) return 'GBP';
  if (urlLower.includes('amazon.ca')) return 'CAD';
  if (urlLower.includes('amazon.co.jp')) return 'JPY';

  return 'USD'; // Default to USD for amazon.com
}
```

**Auto-Fill Behavior**: When user pastes Amazon URL in `affiliate_url` field, currency is automatically set

---

## Form Validation

**Schema** (using Zod or similar):
```typescript
const productSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  short_description: z.string().max(500).optional(),
  category: z.enum([
    'recovery_gear',
    'camping_expedition',
    'tools_maintenance',
    'parts_upgrades',
    'books_manuals',
    'apparel_merchandise',
    'electronics',
    'outdoor_gear'
  ]),
  price: z.number().positive().optional(),
  currency: z.string().length(3),
  image_url: z.string().url().optional(),
  affiliate_url: z.string().url('Must be valid Amazon URL'),
  asin: z.string().regex(/^B[0-9A-Z]{9}$/, 'Invalid ASIN format').optional(),
  tags: z.array(z.string()).optional(),
  is_featured: z.boolean().default(false),
  commission_rate: z.number().min(0).max(100).default(4.5),
  regional_asins: z.record(z.string()).optional(),
  regional_prices: z.record(z.object({
    amount: z.number(),
    currency: z.string()
  })).optional(),
  regional_urls: z.record(z.string().url()).optional()
});
```

**Error Handling**:
- Required field validation
- URL format validation (Amazon URLs only)
- ASIN format validation (B followed by 9 alphanumeric characters)
- Currency code validation (3-letter ISO codes)
- Price range validation (must be positive)
- Commission rate validation (0-100%)

---

## UI Components

### Product Card
```tsx
<Card className={isDragging ? 'opacity-50' : ''}>
  <CardHeader className="flex flex-row items-center justify-between">
    <div className="flex items-center gap-4">
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <CardTitle>{product.title}</CardTitle>
        <CardDescription>
          {product.category} • {product.currency} {product.price}
        </CardDescription>
      </div>
    </div>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <img src={product.image_url} alt={product.title} className="w-full h-48 object-cover rounded" />
    <div className="mt-2 flex gap-2 flex-wrap">
      {product.tags?.map(tag => (
        <Badge key={tag} variant="secondary">{tag}</Badge>
      ))}
    </div>
  </CardContent>
  <CardFooter className="text-sm text-muted-foreground">
    Clicks: {product.click_count} • ASIN: {product.asin}
  </CardFooter>
</Card>
```

### Product Form (Create/Edit Dialog)
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
    </DialogHeader>
    <Form {...form}>
      <FormField name="title" />
      <FormField name="description" />
      <FormField name="category" />
      <FormField name="price" />
      <FormField name="currency" />
      <FormField name="affiliate_url" />
      <FormField name="asin" />
      <FormField name="image_url" />
      <FormField name="tags" />
      <FormField name="is_featured" />
      <FormField name="commission_rate" />
    </Form>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>
        {editingProduct ? 'Update' : 'Create'} Product
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Regional Pricing Support

### Data Structure
```typescript
interface RegionalData {
  regional_asins: {
    [countryCode: string]: string; // e.g., {"AU": "B0DJQF9DY8", "US": "B0DDK8M3CV"}
  };
  regional_prices: {
    [countryCode: string]: {
      amount: number;
      currency: string;
      formatted?: string;
    };
  };
  regional_urls: {
    [countryCode: string]: string; // Localized Amazon URLs with affiliate tag
  };
}
```

### Country Detection (Frontend)
```typescript
function detectUserRegion(): string {
  // 1. Try browser language
  const browserLang = navigator.language; // e.g., "en-AU"
  const countryFromLang = browserLang.split('-')[1]; // "AU"

  // 2. Fallback to timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // "Australia/Sydney" → "AU"

  // 3. Default to US
  return countryFromLang || timezoneToCountry(timezone) || 'US';
}
```

### Serving Regional URLs
```typescript
function getAffiliateUrl(product: AffiliateProduct, userRegion: string): string {
  // Check if product has regional URLs
  if (product.regional_urls && product.regional_urls[userRegion]) {
    return product.regional_urls[userRegion];
  }

  // Fallback to default affiliate_url
  return product.affiliate_url;
}
```

---

## Click Tracking

### Implementation
```typescript
async function trackProductClick(productId: string, userId?: string) {
  await supabase.from('affiliate_product_clicks').insert({
    product_id: productId,
    user_id: userId,
    clicked_at: new Date().toISOString(),
    user_agent: navigator.userAgent,
    referrer: document.referrer,
    metadata: {
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    }
  });

  // Increment click count (uses PostgreSQL function)
  await supabase.rpc('increment_product_clicks', { product_uuid: productId });
}
```

### Click Handler
```tsx
const handleProductClick = async (product: AffiliateProduct) => {
  // Track click
  await trackProductClick(product.id, user?.id);

  // Get regional URL
  const userRegion = detectUserRegion();
  const affiliateUrl = getAffiliateUrl(product, userRegion);

  // Open in new tab
  window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
};
```

---

## State Management

### Query Client Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1
    },
    mutations: {
      retry: 0
    }
  }
});
```

### Optimistic Updates Pattern
```typescript
const updateMutation = useMutation({
  mutationFn: updateProduct,
  onMutate: async (newProduct) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['amazon-products-admin'] });

    // Snapshot previous value
    const previousProducts = queryClient.getQueryData(['amazon-products-admin']);

    // Optimistically update
    queryClient.setQueryData(['amazon-products-admin'], (old: any[]) =>
      old.map(p => p.id === newProduct.id ? { ...p, ...newProduct } : p)
    );

    return { previousProducts };
  },
  onError: (err, newProduct, context) => {
    // Rollback on error
    queryClient.setQueryData(['amazon-products-admin'], context.previousProducts);
    toast.error('Failed to update product');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
  }
});
```

---

## Error Handling

### Network Errors
```typescript
const { data, error, isError } = useQuery({
  queryKey: ['amazon-products-admin'],
  queryFn: fetchProducts,
  retry: (failureCount, error) => {
    // Don't retry on 4xx errors (client errors)
    if (error.status >= 400 && error.status < 500) return false;

    // Retry up to 3 times for 5xx errors
    return failureCount < 3;
  }
});

if (isError) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading products</AlertTitle>
      <AlertDescription>
        {error.message || 'Failed to fetch products. Please try again.'}
      </AlertDescription>
    </Alert>
  );
}
```

### Mutation Errors
```typescript
const createMutation = useMutation({
  mutationFn: createProduct,
  onError: (error: any) => {
    if (error.code === '23505') {
      // Unique constraint violation
      toast.error('Product with this ASIN already exists');
    } else if (error.code === '23503') {
      // Foreign key violation
      toast.error('Invalid category selected');
    } else {
      toast.error('Failed to create product: ' + error.message);
    }
  }
});
```

---

## Performance Optimizations

### Virtualization (for large product lists)
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: products.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // Estimated row height
  overscan: 5 // Render 5 extra items above/below viewport
});

return (
  <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
      {rowVirtualizer.getVirtualItems().map(virtualRow => (
        <ProductCard
          key={products[virtualRow.index].id}
          product={products[virtualRow.index]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`
          }}
        />
      ))}
    </div>
  </div>
);
```

### Image Lazy Loading
```tsx
<img
  src={product.image_url}
  alt={product.title}
  loading="lazy"
  className="w-full h-48 object-cover rounded"
/>
```

### Debounced Search
```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebouncedValue(searchQuery, 300);

const filteredProducts = useMemo(() => {
  if (!debouncedSearch) return products;

  return products.filter(p =>
    p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.tags?.some(tag => tag.toLowerCase().includes(debouncedSearch.toLowerCase()))
  );
}, [products, debouncedSearch]);
```

---

## Security Considerations

### Admin-Only Access
```typescript
// RLS policy (database level)
CREATE POLICY "Only admins can manage products"
  ON affiliate_products FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

// Frontend guard
const { user } = useAuth();

if (user?.role !== 'admin') {
  return <Navigate to="/unauthorized" />;
}
```

### CSRF Protection
```typescript
// Supabase handles CSRF tokens automatically via Authorization header
const { data, error } = await supabase
  .from('affiliate_products')
  .insert(newProduct);
// Authorization: Bearer <jwt_token> prevents CSRF
```

### Input Sanitization
```typescript
import DOMPurify from 'dompurify';

const sanitizedDescription = DOMPurify.sanitize(product.description, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: []
});
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('AmazonProductsManagement', () => {
  it('should render product list', async () => {
    render(<AmazonProductsManagement />);
    await waitFor(() => {
      expect(screen.getByText('Tire Inflation Kit')).toBeInTheDocument();
    });
  });

  it('should detect currency from URL', () => {
    expect(detectCurrencyFromUrl('https://amazon.com.au/dp/B0XXX')).toBe('AUD');
    expect(detectCurrencyFromUrl('https://amazon.com/dp/B0YYY')).toBe('USD');
  });

  it('should handle drag and drop reordering', async () => {
    const { reorder } = renderHook(() => useDragAndDrop());
    await act(async () => {
      await reorder(0, 2);
    });
    expect(mockUpdateSortOrder).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
describe('Product CRUD operations', () => {
  it('should create a new product', async () => {
    render(<AmazonProductsManagement />);

    fireEvent.click(screen.getByText('Add Product'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Product' } });
    fireEvent.change(screen.getByLabelText('ASIN'), { target: { value: 'B0TEST123' } });
    fireEvent.click(screen.getByText('Create Product'));

    await waitFor(() => {
      expect(screen.getByText('Product created successfully')).toBeInTheDocument();
    });
  });
});
```

---

## Related Documentation

- **Database Schema**: `docs/sql-fixes/migrate_to_affiliate_shop.sql`
- **Product Import**: `docs/sql-fixes/import_amazon_products.sql`
- **PAM Shop Tools**: `backend/app/services/pam/tools/shop/` (archived, future activation)
- **Frontend Shop Page**: `src/pages/Shop.tsx`
- **Supabase RLS Policies**: See migration SQL for policy definitions

---

## Support and Maintenance

### Common Issues

**Issue**: "Currency not auto-detecting"
**Solution**: Ensure `affiliate_url` field contains full Amazon URL (not just ASIN)

**Issue**: "Drag and drop not working"
**Solution**: Check that `sort_order` column exists and has default values

**Issue**: "Regional URLs not showing"
**Solution**: Verify `regional_urls` JSONB field is properly formatted with country codes as keys

**Issue**: "Click tracking not incrementing"
**Solution**: Ensure PostgreSQL function `increment_product_clicks()` exists and RLS allows INSERT on `affiliate_product_clicks`

### Feature Requests

Future enhancements to consider:
- Bulk import from Amazon Product Advertising API
- Automatic price updates via API
- A/B testing for product descriptions
- Advanced analytics dashboard (conversion tracking, revenue per product)
- Multi-language support for product descriptions
- Inventory sync with Amazon (in-stock vs out-of-stock)

---

**Last Updated**: November 23, 2025
**Component Version**: 1.0.0
**Maintainer**: Development Team
