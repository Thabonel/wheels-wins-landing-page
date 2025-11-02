import React, { useState } from 'react';
import { Wallet, DollarSign, Plane, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  TransitionFinancial as TransitionFinancialItem,
  FinancialBucketType,
} from '@/types/transition.types';

interface FinancialBucketsProps {
  financialItems: TransitionFinancialItem[];
  onAddItem: (item: Omit<TransitionFinancialItem, 'id' | 'profile_id' | 'user_id' | 'created_at' | 'updated_at' | 'is_funded' | 'funding_percentage'>) => void;
  onUpdateItem: (itemId: string, updates: Partial<TransitionFinancialItem>) => void;
  onDeleteItem: (itemId: string) => void;
}

interface BucketConfig {
  type: FinancialBucketType;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  defaultCategories: string[];
}

const BUCKET_CONFIGS: BucketConfig[] = [
  {
    type: 'transition',
    title: 'Transition Costs',
    icon: <Wallet className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'One-time costs to start your journey',
    defaultCategories: [
      'RV Purchase/Downpayment',
      'Moving Expenses',
      'Initial RV Modifications',
      'Storage Unit',
      'Legal/Documentation',
      'Home Sale Costs',
      'Other',
    ],
  },
  {
    type: 'emergency',
    title: 'Emergency Fund',
    icon: <DollarSign className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: '6 months of expenses for peace of mind',
    defaultCategories: [
      'Living Expenses (6 months)',
      'Vehicle Major Repairs',
      'Medical Emergency',
      'Unexpected Breakdown',
      'Insurance Deductibles',
      'Other',
    ],
  },
  {
    type: 'travel',
    title: 'Travel Budget',
    icon: <Plane className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'First 6 months on the road',
    defaultCategories: [
      'Fuel (6 months)',
      'Camping Fees',
      'Food & Groceries',
      'Entertainment',
      'Maintenance & Repairs',
      'Insurance',
      'Phone/Internet',
      'Other',
    ],
  },
];

export function FinancialBuckets({
  financialItems,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: FinancialBucketsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransitionFinancialItem | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<FinancialBucketType>('transition');
  const [formData, setFormData] = useState({
    category: '',
    customCategory: '',
    subcategory: '',
    estimated_amount: '',
    current_amount: '',
  });

  // Group items by bucket type
  const itemsByBucket = financialItems.reduce((acc, item) => {
    if (!acc[item.bucket_type]) {
      acc[item.bucket_type] = [];
    }
    acc[item.bucket_type].push(item);
    return acc;
  }, {} as Record<FinancialBucketType, TransitionFinancialItem[]>);

  // Calculate bucket totals
  const getBucketStats = (bucketType: FinancialBucketType) => {
    const items = itemsByBucket[bucketType] || [];
    const totalEstimated = items.reduce((sum, item) => sum + Number(item.estimated_amount), 0);
    const totalCurrent = items.reduce((sum, item) => sum + Number(item.current_amount), 0);
    const percentage = totalEstimated > 0 ? Math.floor((totalCurrent / totalEstimated) * 100) : 0;

    return {
      totalEstimated,
      totalCurrent,
      percentage: Math.min(100, percentage),
      items,
    };
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Open dialog for adding new item
  const handleAddClick = (bucketType: FinancialBucketType) => {
    setSelectedBucket(bucketType);
    setEditingItem(null);
    setFormData({
      category: '',
      customCategory: '',
      subcategory: '',
      estimated_amount: '',
      current_amount: '0',
    });
    setIsDialogOpen(true);
  };

  // Open dialog for editing existing item
  const handleEditClick = (item: TransitionFinancialItem) => {
    setSelectedBucket(item.bucket_type);
    setEditingItem(item);

    // Check if category is in default categories
    const bucketConfig = BUCKET_CONFIGS.find(c => c.type === item.bucket_type);
    const isDefaultCategory = bucketConfig?.defaultCategories.includes(item.category);

    setFormData({
      category: isDefaultCategory ? item.category : 'Other',
      customCategory: isDefaultCategory ? '' : item.category,
      subcategory: item.subcategory || '',
      estimated_amount: item.estimated_amount.toString(),
      current_amount: item.current_amount.toString(),
    });
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = () => {
    const category = formData.category === 'Other' && formData.customCategory
      ? formData.customCategory
      : formData.category;

    if (!category || !formData.estimated_amount || !formData.subcategory.trim()) {
      return; // Basic validation - category, amount, and item description required
    }

    const itemData = {
      bucket_type: selectedBucket,
      category,
      subcategory: formData.subcategory.trim() || null,
      estimated_amount: parseFloat(formData.estimated_amount),
      current_amount: parseFloat(formData.current_amount || '0'),
      priority: 'medium' as const,
      notes: null,
      due_date: null,
    };

    if (editingItem) {
      onUpdateItem(editingItem.id, itemData);
    } else {
      onAddItem(itemData);
    }

    setIsDialogOpen(false);
  };

  // Get current bucket config
  const currentBucketConfig = BUCKET_CONFIGS.find(c => c.type === selectedBucket);

  return (
    <div className="space-y-6">
      {/* Bucket Cards */}
      {BUCKET_CONFIGS.map((config) => {
        const stats = getBucketStats(config.type);

        return (
          <Card key={config.type}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${config.bgColor} ${config.color} p-2 rounded-lg`}>
                    {config.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{config.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleAddClick(config.type)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Overall Progress */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Progress</span>
                  <span className={`font-bold ${config.color}`}>
                    {formatCurrency(stats.totalCurrent)} / {formatCurrency(stats.totalEstimated)}
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress value={stats.percentage} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{stats.percentage}% funded</span>
                    <span>
                      {formatCurrency(stats.totalEstimated - stats.totalCurrent)} remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              {stats.items.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Category Breakdown
                  </h4>
                  <div className="space-y-3">
                    {stats.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {item.subcategory || item.category}
                              </span>
                              {item.subcategory && (
                                <span className="text-xs text-gray-500">{item.category}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {formatCurrency(Number(item.current_amount))} /{' '}
                                {formatCurrency(Number(item.estimated_amount))}
                              </span>
                              <Button
                                onClick={() => handleEditClick(item)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => onDeleteItem(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={item.funding_percentage}
                              className="h-1.5 flex-1"
                            />
                            <span
                              className={`text-xs font-medium ${
                                item.is_funded ? 'text-green-600' : 'text-gray-600'
                              }`}
                            >
                              {item.funding_percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No items added yet</p>
                  <Button
                    onClick={() => handleAddClick(config.type)}
                    size="sm"
                    variant="outline"
                    className="mt-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {currentBucketConfig?.title} Item
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the financial item details below.'
                : 'Add a new item to track your financial progress.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {currentBucketConfig?.defaultCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Category Input */}
            {formData.category === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="customCategory">Custom Category Name</Label>
                <Input
                  id="customCategory"
                  value={formData.customCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, customCategory: e.target.value })
                  }
                  placeholder="Enter category name"
                />
              </div>
            )}

            {/* Item Description - appears for ALL categories */}
            <div className="space-y-2">
              <Label htmlFor="subcategory">
                Item Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) =>
                  setFormData({ ...formData, subcategory: e.target.value })
                }
                placeholder="e.g., Solar panels, New tires, Awning installation"
              />
              <p className="text-xs text-gray-500">
                Describe exactly what this cost item is for
              </p>
            </div>

            {/* Estimated Amount */}
            <div className="space-y-2">
              <Label htmlFor="estimated">Estimated Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="estimated"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_amount: e.target.value })
                  }
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Current Amount */}
            <div className="space-y-2">
              <Label htmlFor="current">Current Amount Saved</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="current"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.current_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, current_amount: e.target.value })
                  }
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? 'Update' : 'Add'} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
