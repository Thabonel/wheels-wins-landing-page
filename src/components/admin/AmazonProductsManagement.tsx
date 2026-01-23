import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/common/AnimatedDialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Package,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Product categories enum
const CATEGORIES = [
  { value: 'recovery_gear', label: 'Recovery Gear' },
  { value: 'camping_expedition', label: 'Camping & Expedition' },
  { value: 'tools_maintenance', label: 'Tools & Maintenance' },
  { value: 'parts_upgrades', label: 'Parts & Upgrades' },
  { value: 'books_manuals', label: 'Books & Manuals' },
  { value: 'apparel_merchandise', label: 'Apparel & Merchandise' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'outdoor_gear', label: 'Outdoor Gear' },
] as const;

const CURRENCIES = ['USD', 'AUD', 'EUR', 'GBP'] as const;

const AVAILABILITY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'unknown', label: 'Unknown' },
] as const;

interface AmazonProduct {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  currency: string;
  image_url: string | null;
  asin: string | null;
  affiliate_url: string;
  is_active: boolean;
  availability_status?: string;
  sort_order: number;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

// Extract ASIN from Amazon URL or return as-is if already ASIN
function extractASINFromUrl(urlOrAsin: string): string {
  if (!urlOrAsin) return '';

  // Already an ASIN (10 chars, starts with B)
  if (/^B[0-9A-Z]{9}$/i.test(urlOrAsin.trim())) {
    return urlOrAsin.trim().toUpperCase();
  }

  // Extract from URL patterns
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
  ];

  for (const pattern of patterns) {
    const match = urlOrAsin.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return urlOrAsin.trim();
}

// Detect currency from Amazon URL
function detectCurrencyFromUrl(urlOrAsin: string): string {
  if (!urlOrAsin) return 'USD';

  const urlLower = urlOrAsin.toLowerCase();

  if (urlLower.includes('amazon.com.au')) return 'AUD';
  if (urlLower.includes('amazon.de')) return 'EUR';
  if (urlLower.includes('amazon.fr')) return 'EUR';
  if (urlLower.includes('amazon.it')) return 'EUR';
  if (urlLower.includes('amazon.es')) return 'EUR';
  if (urlLower.includes('amazon.co.uk')) return 'GBP';

  return 'USD'; // Default for amazon.com
}

// Build Amazon affiliate link (Australian affiliate account)
function buildAmazonAffiliateLink(asin: string): string {
  return `https://www.amazon.com.au/dp/${asin}?tag=unimogcommuni-22`;
}

// Sortable row component
function SortableProductRow({
  product,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  product: AmazonProduct;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const categoryLabel =
    CATEGORIES.find((c) => c.value === product.category)?.label ||
    product.category;

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>
      <TableCell>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.title}
              className="h-12 w-12 object-cover rounded"
            />
          )}
          <span className="font-medium truncate max-w-xs">
            {product.title}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {product.asin || 'N/A'}
        </code>
      </TableCell>
      <TableCell>{categoryLabel}</TableCell>
      <TableCell>
        {product.currency} {product.price?.toFixed(2) || '0.00'}
      </TableCell>
      <TableCell>
        <Badge variant={product.is_active ? 'default' : 'secondary'}>
          {product.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          {product.asin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(buildAmazonAffiliateLink(product.asin!), '_blank')
              }
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AmazonProductsManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AmazonProduct | null>(
    null
  );
  const [asinInput, setAsinInput] = useState('');
  const [detectedCurrency, setDetectedCurrency] = useState('USD');
  const [limitedAccess, setLimitedAccess] = useState(false);

  // Bulk selection
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to activate drag
      },
    })
  );

  // Fetch products
  const { data: products = [], isLoading, error: queryError } = useQuery({
    queryKey: ['amazon-products-admin'],
    queryFn: async () => {
      // Prefer Edge Function (admin) first
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      try {
        const res = await fetch(`${baseUrl}?provider=amazon&includeInactive=true`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          setLimitedAccess(false);
          const rows = (await res.json()) as AmazonProduct[];
          console.log('Fetched products (edge function):', rows.length);
          return rows;
        }
        if (res.status === 401 || res.status === 403) {
          console.warn('Edge function denied; falling back to public products');
          setLimitedAccess(true);
        } else {
          const errText = await res.text();
          throw new Error(`Admin function error (${res.status}): ${errText}`);
        }
      } catch (e) {
        console.warn('Admin function request failed:', e);
        setLimitedAccess(true);
      }

      // Fallback to public-visible products so UI remains usable
      const fallback = await supabase
        .from('affiliate_products')
        .select('*')
        .eq('affiliate_provider', 'amazon')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (fallback.error) {
        console.error('Fallback query also failed:', fallback.error);
        throw fallback.error;
      }
      console.log('Fetched products (public fallback):', fallback.data?.length || 0);
      return (fallback.data || []) as AmazonProduct[];
    },
  });

  // Map common Supabase errors to clearer admin guidance
  const humanReadableError = (() => {
    const e = queryError as any;
    if (!e) return null;
    if (e.code === '42501') {
      return 'Permission denied (missing table GRANTs or failing RLS). Please apply the Supabase migration to fix admin access.';
    }
    return e.message || 'Unknown error';
  })();

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const asinOrUrl = formData.get('asin') as string;
      const asin = extractASINFromUrl(asinOrUrl);
      const affiliateUrl = buildAmazonAffiliateLink(asin);
      const tagsString = formData.get('tags') as string;
      const tags = tagsString
        ? tagsString.split(',').map((t) => t.trim())
        : null;

      const priceStr = formData.get('price') as string;
      const priceVal = priceStr ? parseFloat(priceStr) : null;
      const sortStr = formData.get('sort_order') as string;
      const sortVal = sortStr ? parseInt(sortStr) : 0;

      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const payload = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        price: priceVal,
        currency: formData.get('currency') as string,
        image_url: formData.get('image_url') as string,
        asin,
        affiliate_url: affiliateUrl,
        affiliate_provider: 'amazon',
        is_active: formData.get('is_active') === 'true',
        sort_order: Number.isFinite(sortVal) ? sortVal : 0,
        tags,
      };
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as AmazonProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-products'] });
      toast.success('Product created successfully');
      setDialogOpen(false);
    },
    onError: (error: any) => {
      const msg = error?.message || 'Unknown error';
      if (msg.includes('permission denied') || error?.code === '42501') {
        toast.error('You do not have permission to create products. Admin database access required.');
      } else {
        toast.error(`Failed to create product: ${msg}`);
      }
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: string;
      formData: FormData;
    }) => {
      const asinOrUrl = formData.get('asin') as string;
      const asin = extractASINFromUrl(asinOrUrl);
      const affiliateUrl = buildAmazonAffiliateLink(asin);
      const tagsString = formData.get('tags') as string;
      const tags = tagsString
        ? tagsString.split(',').map((t) => t.trim())
        : null;

      const priceStr2 = formData.get('price') as string;
      const priceVal2 = priceStr2 ? parseFloat(priceStr2) : null;
      const sortStr2 = formData.get('sort_order') as string;
      const sortVal2 = sortStr2 ? parseInt(sortStr2) : 0;

      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products/${id}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const updates = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        price: priceVal2,
        currency: formData.get('currency') as string,
        image_url: formData.get('image_url') as string,
        asin,
        affiliate_url: affiliateUrl,
        is_active: formData.get('is_active') === 'true',
        sort_order: Number.isFinite(sortVal2) ? sortVal2 : 0,
        tags,
      };
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as AmazonProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-products'] });
      toast.success('Product updated successfully');
      setDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (error: any) => {
      const msg = error?.message || 'Unknown error';
      if (msg.includes('permission denied') || error?.code === '42501') {
        toast.error('You do not have permission to update products. Admin database access required.');
      } else {
        toast.error(`Failed to update product: ${msg}`);
      }
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products/${id}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(baseUrl, {
        method: 'DELETE',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      const msg = error?.message || 'Unknown error';
      if (msg.includes('permission denied') || error?.code === '42501') {
        toast.error('You do not have permission to delete products. Admin database access required.');
      } else {
        toast.error(`Failed to delete product: ${msg}`);
      }
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: any }) => {
      await Promise.all(
        ids.map(id =>
          supabase
            .from('affiliate_products')
            .update(updates)
            .eq('id', id)
        )
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-products'] });
      toast.success(`Updated ${variables.ids.length} products`);
      setSelectedProducts(new Set());
    },
    onError: (error: any) => {
      toast.error(`Failed to update products: ${error.message}`);
    },
  });

  // Reorder products mutation
  const reorderMutation = useMutation({
    mutationFn: async (reorderedProducts: AmazonProduct[]) => {
      const updates = reorderedProducts.map((product, index) =>
        supabase
          .from('affiliate_products')
          .update({ sort_order: index })
          .eq('id', product.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success('Products reordered successfully');
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
      toast.error(`Failed to reorder products: ${error.message}`);
    },
  });

  // Drag end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);

    const reordered = arrayMove(products, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['amazon-products-admin'], reordered);

    // Sync to database
    reorderMutation.mutate(reordered);
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Delete handler
  const handleDelete = (id: string, title: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${title}"? This cannot be undone.`
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  // Bulk operation handlers
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkUpdateAvailability = (status: string) => {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }
    bulkUpdateMutation.mutate({
      ids: Array.from(selectedProducts),
      updates: { availability_status: status }
    });
  };

  const handleBulkActivate = () => {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }
    bulkUpdateMutation.mutate({
      ids: Array.from(selectedProducts),
      updates: { is_active: true }
    });
  };

  const handleBulkDeactivate = () => {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }
    bulkUpdateMutation.mutate({
      ids: Array.from(selectedProducts),
      updates: { is_active: false }
    });
  };

  // ASIN input change handler (for currency detection)
  const handleAsinChange = (value: string) => {
    setAsinInput(value);
    const currency = detectCurrencyFromUrl(value);
    setDetectedCurrency(currency);
  };

  // Open dialog for editing
  const handleEdit = (product: AmazonProduct) => {
    setEditingProduct(product);
    setAsinInput(product.asin || '');
    setDetectedCurrency(product.currency);
    setDialogOpen(true);
  };

  // Open dialog for creating
  const handleCreate = () => {
    setEditingProduct(null);
    setAsinInput('');
    setDetectedCurrency('USD');
    setDialogOpen(true);
  };

  const activeProducts = products.filter((p) => p.is_active).length;
  const inactiveProducts = products.length - activeProducts;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Amazon Products Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage Amazon affiliate products with drag & drop ordering
          </p>
        </div>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: ['amazon-products-admin'],
            })
          }
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {queryError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-destructive">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">
                  Failed to fetch products
                </h3>
                <p className="text-sm text-muted-foreground">
                  {humanReadableError}
                </p>
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    Show details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(queryError, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-gray-600">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeProducts}</p>
                <p className="text-sm text-gray-600">Active Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{inactiveProducts}</p>
                <p className="text-sm text-gray-600">Inactive Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium text-blue-900">
                {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
              </span>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleBulkUpdateAvailability('available')}
                  disabled={bulkUpdateMutation.isPending || limitedAccess}
                >
                  Mark Available
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkUpdateAvailability('out_of_stock')}
                  disabled={bulkUpdateMutation.isPending || limitedAccess}
                >
                  Mark Out of Stock
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkUpdateAvailability('discontinued')}
                  disabled={bulkUpdateMutation.isPending || limitedAccess}
                >
                  Mark Discontinued
                </Button>

                <div className="h-8 w-px bg-gray-300 mx-2" />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkActivate}
                  disabled={bulkUpdateMutation.isPending || limitedAccess}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDeactivate}
                  disabled={bulkUpdateMutation.isPending || limitedAccess}
                >
                  Deactivate
                </Button>

                <div className="h-8 w-px bg-gray-300 mx-2" />

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProducts(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Products</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleCreate} disabled={limitedAccess} title={limitedAccess ? 'Read-only mode: database permissions required' : undefined}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-w-2xl"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="asin">ASIN or Amazon URL *</Label>
                    <Input
                      id="asin"
                      name="asin"
                      required
                      value={asinInput}
                      onChange={(e) => handleAsinChange(e.target.value)}
                      defaultValue={editingProduct?.asin || ''}
                      placeholder="B0DDK8M3CV or full Amazon URL"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter ASIN or paste full Amazon product URL
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      required
                      defaultValue={editingProduct?.title || ''}
                      placeholder="Product title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingProduct?.description || ''}
                      placeholder="Product description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        name="category"
                        required
                        defaultValue={editingProduct?.category || ''}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={editingProduct?.price || ''}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency *</Label>
                    <Select
                      name="currency"
                      required
                      value={detectedCurrency}
                      onValueChange={setDetectedCurrency}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-detected from Amazon URL
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      name="image_url"
                      type="url"
                      defaultValue={editingProduct?.image_url || ''}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Amazon product image URL
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      name="tags"
                      defaultValue={editingProduct?.tags?.join(', ') || ''}
                      placeholder="tire, inflation, tools"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated tags
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sort_order">Sort Order</Label>
                      <Input
                        id="sort_order"
                        name="sort_order"
                        type="number"
                        defaultValue={editingProduct?.sort_order || 0}
                        placeholder="0"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Switch
                        id="is_active"
                        name="is_active"
                        defaultChecked={editingProduct?.is_active ?? true}
                        value="true"
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || updateMutation.isPending || limitedAccess
                      }
                      title={limitedAccess ? 'Read-only mode: database permissions required' : undefined}
                    >
                      {editingProduct ? 'Update' : 'Create'} Product
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {limitedAccess && (
            <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
              Admin is in read-only mode due to database permissions. You can view active products, but cannot create, edit, delete, or reorder. Please update database grants/RLS to enable full admin access.
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No products found. Create your first Amazon product!
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                if (limitedAccess) {
                  toast.error('Read-only mode: cannot reorder without admin DB permissions');
                  return;
                }
                const { active, over } = event;
                if (!over || active.id === over.id) return;

                const oldIndex = products.findIndex((p) => p.id === active.id);
                const newIndex = products.findIndex((p) => p.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return;

                const reordered = arrayMove(products, oldIndex, newIndex);
                queryClient.setQueryData(['amazon-products-admin'], reordered);

                const persistOrder = async () => {
                  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products/reorder`;
                  const { data: sessionData } = await supabase.auth.getSession();
                  const token = sessionData?.session?.access_token;
                  const order = reordered.map((p, idx) => ({ id: p.id, sort_order: idx }));
                  const res = await fetch(baseUrl, {
                    method: 'PATCH',
                    headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order })
                  });
                  if (!res.ok) throw new Error(await res.text());
                };
                persistOrder().catch((err) => {
                  console.error('Failed to persist order:', err);
                  toast.error('Failed to save order');
                  queryClient.invalidateQueries({ queryKey: ['amazon-products-admin'] });
                });
              }}
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProducts.size === products.length && products.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>ASIN</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={products.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {products.map((product) => (
                        <SortableProductRow
                          key={product.id}
                          product={product}
                          isSelected={selectedProducts.has(product.id)}
                          onToggleSelect={() => toggleProductSelection(product.id)}
                          onEdit={() => handleEdit(product)}
                          onDelete={() =>
                            handleDelete(product.id, product.title)
                          }
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </div>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
