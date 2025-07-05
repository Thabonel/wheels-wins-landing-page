import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, Plus, Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  status: string;
  inventory_count: number;
  created_at: string;
}

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
  // Mock products data
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Travel Backpack Pro',
      description: 'Professional travel backpack with multiple compartments',
      price: 89.99,
      category: 'Travel Gear',
      status: 'active',
      inventory_count: 25,
      created_at: '2024-06-15T10:30:00Z'
    },
    {
      id: '2', 
      name: 'Camping Tent Deluxe',
      description: 'Waterproof 4-person camping tent',
      price: 159.99,
      category: 'Camping',
      status: 'active',
      inventory_count: 12,
      created_at: '2024-06-20T14:15:00Z'
    },
    {
      id: '3',
      name: 'Hiking Boots Elite',
      description: 'Durable hiking boots for all terrains',
      price: 129.99,
      category: 'Footwear', 
      status: 'draft',
      inventory_count: 18,
      created_at: '2024-07-01T09:45:00Z'
    }
  ];

  // Mock orders data
  const mockOrders: Order[] = [
    {
      id: '1',
      user_email: 'customer1@example.com',
      total_amount: 89.99,
      status: 'pending',
      payment_status: 'completed',
      tracking_number: 'TN123456789',
      created_at: '2024-07-04T11:30:00Z'
    },
    {
      id: '2',
      user_email: 'customer2@example.com',
      total_amount: 289.98,
      status: 'shipped',
      payment_status: 'completed', 
      tracking_number: 'TN987654321',
      created_at: '2024-07-03T16:20:00Z'
    },
    {
      id: '3',
      user_email: 'customer3@example.com',
      total_amount: 159.99,
      status: 'delivered',
      payment_status: 'completed',
      tracking_number: 'TN555666777',
      created_at: '2024-07-01T08:15:00Z'
    }
  ];

  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    inventory_count: ''
  });

  const fetchProducts = async () => {
    // Mock refresh - simulate loading
    setLoading(true);
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
      toast.success("Products refreshed");
    }, 1000);
  };

  const fetchOrders = async () => {
    // Mock refresh - simulate loading  
    setLoading(true);
    setTimeout(() => {
      setOrders(mockOrders);
      setLoading(false);
      toast.success("Orders refreshed");
    }, 1000);
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error("Name and price are required");
      return;
    }

    // Mock create product - add to local state
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
  };

  const handleUpdateProductStatus = async (productId: string, status: string) => {
    // Mock update - update local state
    setProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, status }
          : product
      )
    );
    toast.success("Product updated successfully");
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    // Mock update - update local state
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { ...order, status }
          : order
      )
    );
    toast.success("Order updated successfully");
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
    // Initialize with mock data
    setProducts(mockProducts);
    setOrders(mockOrders);
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
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Inventory</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
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
                        <TableCell>{product.category}</TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>{product.inventory_count}</TableCell>
                        <TableCell>{getStatusBadge(product.status, 'product')}</TableCell>
                        <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
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
