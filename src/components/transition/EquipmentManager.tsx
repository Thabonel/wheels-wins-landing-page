import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Package,
  DollarSign,
  Weight,
  ShoppingCart,
  Download,
  ExternalLink,
  CheckCircle2,
  Circle,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import equipmentTemplates from '@/data/equipment-templates.json';

interface EquipmentItem {
  id: string;
  template_item_id: string;
  category: string;
  name: string;
  description?: string;
  priority: 'essential' | 'nice-to-have';
  estimated_cost?: number;
  weight_lbs?: number;
  space_requirement?: 'small' | 'medium' | 'large';
  vendor_links?: { name: string; url: string }[];
  community_tips?: string;
  is_purchased: boolean;
  purchased_date?: string;
  actual_cost?: number;
  purchase_location?: string;
  notes?: string;
}

interface EquipmentStats {
  total_items: number;
  purchased_count: number;
  essential_count: number;
  nice_to_have_count: number;
  total_estimated_cost: number;
  total_actual_cost: number;
  total_weight_lbs: number;
  purchase_percentage: number;
}

const categoryIcons: Record<string, string> = {
  recovery: '🚜',
  kitchen: '🍳',
  power: '⚡',
  climate: '🌡️',
  safety: '🛡️',
  comfort: '🛋️',
};

export const EquipmentManager: React.FC = () => {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [stats, setStats] = useState<EquipmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string>('');
  const { toast } = useToast();

  // Filters
  const [travelStyle, setTravelStyle] = useState<string>('mixed');
  const [climate, setClimate] = useState<string>('varied');
  const [budget, setBudget] = useState<string>('comfortable'); // Changed from 'moderate' to match existing template
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchEquipment();
    fetchStats();
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('transition_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      setProfileId(profile.id);

      const { data, error } = await supabase
        .from('transition_equipment')
        .select('*')
        .eq('profile_id', profile.id)
        .order('category', { ascending: true })
        .order('priority', { ascending: true });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment list',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('transition_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .rpc('get_equipment_stats', { p_user_id: profile.id });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const loadTemplate = async () => {
    if (!profileId) {
      toast({
        title: 'Profile Required',
        description: 'Please complete your transition profile first',
        variant: 'destructive',
      });
      return;
    }

    const templateKey = `${travelStyle}_${climate}_${budget}` as keyof typeof equipmentTemplates.templates;
    const template = equipmentTemplates.templates[templateKey];

    if (!template) {
      toast({
        title: 'Template Not Found',
        description: `No template matches the combination: ${travelStyle} + ${climate} + ${budget}. Try different filter settings.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Clear existing equipment
      await supabase
        .from('transition_equipment')
        .delete()
        .eq('profile_id', profileId);

      // Insert template items
      const itemsToInsert = template.items.map(item => ({
        profile_id: profileId,
        template_item_id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        priority: item.priority,
        estimated_cost: item.estimated_cost,
        weight_lbs: item.weight_lbs,
        space_requirement: item.space_requirement,
        vendor_links: item.vendor_links,
        community_tips: item.community_tips,
        is_purchased: false,
      }));

      const { error } = await supabase
        .from('transition_equipment')
        .insert(itemsToInsert);

      if (error) throw error;

      toast({
        title: 'Template Loaded',
        description: `${template.name} loaded successfully (${template.items.length} items)`,
      });

      fetchEquipment();
      fetchStats();
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      });
    }
  };

  const togglePurchased = async (itemId: string, isPurchased: boolean) => {
    try {
      const { error } = await supabase
        .from('transition_equipment')
        .update({
          is_purchased: isPurchased,
          purchased_date: isPurchased ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;

      setEquipment(prev =>
        prev.map(item =>
          item.id === itemId
            ? {
                ...item,
                is_purchased: isPurchased,
                purchased_date: isPurchased ? new Date().toISOString().split('T')[0] : undefined,
              }
            : item
        )
      );

      fetchStats();

      toast({
        title: 'Updated',
        description: isPurchased ? 'Item marked as purchased' : 'Item marked as not purchased',
      });
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    }
  };

  const exportToPDF = () => {
    // Simple CSV export (can be enhanced to actual PDF)
    const csvContent = [
      ['Category', 'Item', 'Priority', 'Cost', 'Weight', 'Purchased'].join(','),
      ...filteredEquipment.map(item =>
        [
          item.category,
          item.name,
          item.priority,
          item.estimated_cost || 0,
          item.weight_lbs || 0,
          item.is_purchased ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipment-checklist.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Equipment checklist exported as CSV',
    });
  };

  const filteredEquipment = useMemo(() => {
    if (selectedCategory === 'all') return equipment;
    return equipment.filter(item => item.category === selectedCategory);
  }, [equipment, selectedCategory]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, EquipmentItem[]> = {};
    filteredEquipment.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredEquipment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_items}</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.essential_count} essential
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.total_estimated_cost?.toFixed(2) || '0.00'}
              </div>
              {stats.total_actual_cost > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  ${stats.total_actual_cost.toFixed(2)} spent
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Weight className="h-4 w-4" />
                Total Weight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_weight_lbs?.toFixed(1) || '0.0'} lbs
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.purchase_percentage}%</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.purchased_count} of {stats.total_items} purchased
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Equipment Checklist</span>
            <div className="flex gap-2">
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>Travel Style</Label>
              <Select value={travelStyle} onValueChange={setTravelStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boondocking">Boondocking</SelectItem>
                  <SelectItem value="campgrounds">Campgrounds</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Climate</Label>
              <Select value={climate} onValueChange={setClimate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="varied">Varied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Budget</Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadTemplate} className="w-full">
                Load Template
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <Label>Filter by Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {equipmentTemplates.categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment List by Category */}
          <div className="space-y-6">
            {Object.entries(groupedByCategory).map(([category, items]) => {
              const categoryInfo = equipmentTemplates.categories.find(
                c => c.id === category
              );

              return (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span>{categoryIcons[category]}</span>
                    <span>{categoryInfo?.name || category}</span>
                    <Badge variant="secondary">{items.length}</Badge>
                  </h3>

                  <div className="space-y-3">
                    {items.map(item => (
                      <Card
                        key={item.id}
                        className={item.is_purchased ? 'bg-green-50 border-green-200' : ''}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 pt-1">
                              <Checkbox
                                checked={item.is_purchased}
                                onCheckedChange={checked =>
                                  togglePurchased(item.id, checked as boolean)
                                }
                              />
                            </div>

                            <div className="flex-grow">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold flex items-center gap-2">
                                    {item.is_purchased ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-gray-400" />
                                    )}
                                    {item.name}
                                  </h4>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Badge
                                    variant={
                                      item.priority === 'essential' ? 'default' : 'secondary'
                                    }
                                  >
                                    {item.priority}
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                {item.estimated_cost && (
                                  <div className="text-sm">
                                    <span className="text-gray-500">Cost:</span>{' '}
                                    <span className="font-medium">
                                      ${item.estimated_cost.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {item.weight_lbs && (
                                  <div className="text-sm">
                                    <span className="text-gray-500">Weight:</span>{' '}
                                    <span className="font-medium">{item.weight_lbs} lbs</span>
                                  </div>
                                )}
                                {item.space_requirement && (
                                  <div className="text-sm">
                                    <span className="text-gray-500">Space:</span>{' '}
                                    <span className="font-medium">{item.space_requirement}</span>
                                  </div>
                                )}
                              </div>

                              {item.vendor_links && item.vendor_links.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm text-gray-500 mb-2">Where to buy:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.vendor_links.map((link, idx) => (
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        asChild
                                      >
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {link.name}
                                          <ExternalLink className="h-3 w-3 ml-1" />
                                        </a>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {item.community_tips && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-md">
                                  <div className="flex items-start gap-2">
                                    <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-blue-900">{item.community_tips}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEquipment.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No equipment loaded</p>
              <p className="text-sm mb-4">
                Select your filters above and click "Load Template" to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
