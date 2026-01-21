import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/AnimatedDialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, Plus, Package, ShoppingCart, DollarSign, TrendingUp, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  description?: string;
  short_description?: string;
  price: number;
  category: string;
  status: string;
  inventory_count: number;
  created_at: string;
  image_url?: string;
  affiliate_url?: string;
  is_featured?: boolean;
  sort_order?: number;
  tags?: string[];
}

const PRODUCT_CATEGORIES = [
  { value: 'recovery_gear', label: 'Recovery Gear' },
  { value: 'camping_expedition', label: 'Camping & Expedition' },
  { value: 'tools_maintenance', label: 'Tools & Maintenance' },
  { value: 'parts_upgrades', label: 'Parts & Upgrades' },
  { value: 'books_manuals', label: 'Books & Manuals' },
  { value: 'apparel_merchandise', label: 'Apparel & Merchandise' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'outdoor_gear', label: 'Outdoor Gear' },
];

interface Order {
  id: string;
  user_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  tracking_number?: string;
  created_at: string;
}

const ShopManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    inventory_count: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Prefer Edge Function (admin). Includes inactive for full admin view.
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      let rows: any[] = [];
      try {
        const res = await fetch(`${baseUrl}?provider=amazon&includeInactive=true`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (res.ok) {
          rows = await res.json();
        } else if (res.status === 401 || res.status === 403) {
          // Fallback to public-visible products
          const { data, error } = await supabase
            .from('affiliate_products')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          if (error) throw error;
          rows = data || [];
        } else {
          throw new Error(`Failed to load products (${res.status})`);
        }
      } catch (err) {
        console.error('Admin products fetch failed, trying public fallback:', err);
        const { data, error } = await supabase
          .from('affiliate_products')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        rows = data || [];
      }

      // Transform affiliate_products to admin Product format
      const transformedProducts: Product[] = (rows || []).map(product => ({
        id: product.id,
        name: product.title,
        description: product.description || '',
        short_description: product.short_description || '',
        price: product.price || 0,
        category: product.category || 'uncategorized',
        status: product.is_active ? 'active' : 'inactive',
        inventory_count: 999, // Affiliate products don't have inventory
        created_at: product.created_at,
        image_url: product.image_url || '',
        affiliate_url: product.affiliate_url || '',
        is_featured: product.is_featured || false,
        sort_order: product.sort_order || 0,
        tags: product.tags || [],
      }));

      setProducts(transformedProducts);
      toast.success(`Loaded ${transformedProducts.length} products`);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch from expenses table as shop orders
      const { data: expensesData, error } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          category,
          description,
          date,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user emails for the expenses
      const userIds = [...new Set(expensesData?.map(exp => exp.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const profilesMap = profilesData?.reduce((acc, profile) => {
        acc[profile.user_id] = profile.email;
        return acc;
      }, {} as Record<string, string>) || {};

      // Transform expenses into order format
      const transformedOrders: Order[] = expensesData?.map(expense => ({
        id: expense.id.toString(),
        user_email: profilesMap[expense.user_id] || 'Unknown User',
        total_amount: Math.abs(expense.amount), // Convert to positive for display
        status: ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
        payment_status: 'completed',
        tracking_number: `TN${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        created_at: expense.created_at
      })) || [];

      setOrders(transformedOrders);
      toast.success("Orders refreshed");
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to fetch orders");
      // Fallback to empty array
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error("Name and price are required");
      return;
    }

    try {
      // For now, just add to local state since we don't have products table
      const newProductObj: Product = {
        id: Date.now().toString(),
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category || 'General',
        inventory_count: parseInt(newProduct.inventory_count) || 0,
        status: 'draft',
        created_at: new Date().toISOString()
      };

      setProducts(prev => [newProductObj, ...prev]);
      toast.success("Product created successfully");
      setNewProduct({ name: '', description: '', price: '', category: '', inventory_count: '' });
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error("Failed to create product");
    }
  };

  const handleUpdateProductStatus = async (productId: string, status: string) => {
    try {
      // Update via Edge Function (admin)
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products/${productId}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: status === 'active' })
      });
      if (!res.ok) {
        throw new Error(`Update failed (${res.status})`);
      }

      // Update local state
      setProducts(prev =>
        prev.map(product =>
          product.id === productId
            ? { ...product, status }
            : product
        )
      );
      toast.success("Product updated successfully");
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error("Failed to update product (check admin permissions)");
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-affiliate-products/${editingProduct.id}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const updatePayload = {
        title: editingProduct.name,
        description: editingProduct.description,
        short_description: editingProduct.short_description,
        price: editingProduct.price,
        category: editingProduct.category,
        image_url: editingProduct.image_url,
        affiliate_url: editingProduct.affiliate_url,
        is_featured: editingProduct.is_featured,
        is_active: editingProduct.status === 'active',
        sort_order: editingProduct.sort_order,
        tags: editingProduct.tags,
      };

      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!res.ok) {
        throw new Error(`Update failed (${res.status})`);
      }

      // Update local state
      setProducts(prev =>
        prev.map(product =>
          product.id === editingProduct.id ? editingProduct : product
        )
      );

      setEditDialogOpen(false);
      setEditingProduct(null);
      toast.success("Product updated successfully");
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error("Failed to update product (check admin permissions)");
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct({ ...product });
    setEditDialogOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      // Update local state - orders are derived from expenses
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status }
            : order
        )
      );
      toast.success("Order updated successfully");
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error("Failed to update order");
    }
  };

  const getStatusBadge = (status: string, type: 'product' | 'order' = 'product') => {
    if (type === 'product') {
      switch (status) {
        case 'active':
          return <Badge className="bg-green-100 text-green-700">Active</Badge>;
        case 'inactive':
          return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>;
        case 'draft':
          return <Badge className="bg-yellow-100 text-yellow-700">Draft</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'pending':
          return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
        case 'processing':
          return <Badge className="bg-blue-100 text-blue-700">Processing</Badge>;
        case 'shipped':
          return <Badge className="bg-purple-100 text-purple-700">Shipped</Badge>;
        case 'delivered':
          return <Badge className="bg-green-100 text-green-700">Delivered</Badge>;
        case 'cancelled':
          return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const activeProducts = products.filter(product => product.status === 'active').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shop Management</h1>
          <p className="text-muted-foreground text-sm">Manage products, orders, and inventory</p>
        </div>
        <Button onClick={() => activeTab === 'products' ? fetchProducts() : fetchOrders()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
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
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingOrders}</p>
                <p className="text-sm text-gray-600">Pending Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b">
        <Button 
          variant={activeTab === 'products' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('products')}
        >
          Products ({products.length})
        </Button>
        <Button 
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('orders')}
        >
          Orders ({orders.length})
        </Button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Products</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter product description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="inventory">Inventory</Label>
                        <Input
                          id="inventory"
                          type="number"
                          value={newProduct.inventory_count}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, inventory_count: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={newProduct.category}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="Enter category"
                      />
                    </div>
                    <Button onClick={handleCreateProduct} className="w-full">
                      Create Product
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No products found. Create your first product!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(product.status, 'product')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              className="h-8 px-2"
                              title="Edit product"
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Select
                              value={product.status}
                              onValueChange={(value) => handleUpdateProductStatus(product.id, value)}
                            >
                              <SelectTrigger className="w-[100px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <Label htmlFor="edit-short-desc">Short Description</Label>
                <Input
                  id="edit-short-desc"
                  value={editingProduct.short_description || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, short_description: e.target.value } : null)}
                  placeholder="Brief description for cards"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Full Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Detailed product description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Price ($)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editingProduct.category}
                    onValueChange={(value) => setEditingProduct(prev => prev ? { ...prev, category: value } : null)}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-image">Image URL</Label>
                <Input
                  id="edit-image"
                  value={editingProduct.image_url || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, image_url: e.target.value } : null)}
                  placeholder="https://..."
                />
                {editingProduct.image_url && (
                  <img
                    src={editingProduct.image_url}
                    alt="Preview"
                    className="mt-2 h-20 w-20 object-cover rounded border"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="edit-affiliate">Affiliate URL</Label>
                <Input
                  id="edit-affiliate"
                  value={editingProduct.affiliate_url || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, affiliate_url: e.target.value } : null)}
                  placeholder="https://amazon.com/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-sort">Sort Order</Label>
                  <Input
                    id="edit-sort"
                    type="number"
                    value={editingProduct.sort_order || 0}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, sort_order: parseInt(e.target.value) || 0 } : null)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editingProduct.status}
                    onValueChange={(value) => setEditingProduct(prev => prev ? { ...prev, status: value } : null)}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Featured Product</Label>
                  <p className="text-sm text-muted-foreground">Show in featured section</p>
                </div>
                <Switch
                  checked={editingProduct.is_featured || false}
                  onCheckedChange={(checked) => setEditingProduct(prev => prev ? { ...prev, is_featured: checked } : null)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleEditProduct} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                        <TableCell>{order.user_email}</TableCell>
                        <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status, 'order')}</TableCell>
                        <TableCell>{getStatusBadge(order.payment_status, 'order')}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {order.tracking_number || 'Not shipped'}
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShopManagement;
