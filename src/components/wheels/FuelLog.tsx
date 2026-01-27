import { useState, useEffect } from "react";
import { useRegion } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/common/AnimatedDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMapboxPublicToken } from "@/utils/mapboxConfig";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { getTodayDateLocal } from "@/utils/format";

export default function FuelLog() {
  const { region } = useRegion();
  const { user } = useAuth();
  const { regionConfig } = useRegion();
  const isImperial = regionConfig.units === "imperial";
  const volumeLabel = isImperial ? "gal" : "L";
  const priceLabel = isImperial ? "Price/Gal" : "Price/L";
  const consumptionLabel = isImperial ? "MPG" : "L/100km";

  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState({
    date: getTodayDateLocal(),
    location: '',
    odometer: '',
    volume: '',
    price: '',
    total: '',
    filled_to_top: true
  });
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    location: '',
    odometer: '',
    volume: '',
    price: '',
    total: '',
    filled_to_top: true
  });
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch entries from Supabase
  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('fuel_log')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) console.error('Error loading fuel entries:', error);
      else setFuelEntries(data || []);
      setLoading(false);
    };
    fetchEntries();
  }, [user]);

  // Auto-fill location using Mapbox Geocoding API instead of OpenStreetMap
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use Mapbox Geocoding API which properly handles CORS
          const token = getMapboxPublicToken();

          if (token && token.startsWith('pk.')) {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}`
            );
            const data = await res.json();
            const placeName = data.features?.[0]?.place_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setNewEntry(prev => ({ ...prev, location: placeName }));
          } else {
            // Fallback to coordinates if no Mapbox token
            setNewEntry(prev => ({ 
              ...prev, 
              location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` 
            }));
          }
        } catch (error) {
          console.log("Failed to fetch location, using coordinates:", error);
          // Fallback to just coordinates
          setNewEntry(prev => ({ 
            ...prev, 
            location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` 
          }));
        }
      }, (error) => {
        console.log("Geolocation error:", error.message);
      });
    }
  }, []);

  // Auto-calculate missing values for new entry
  useEffect(() => {
    const volume = parseFloat(newEntry.volume);
    const price = parseFloat(newEntry.price);
    const total = parseFloat(newEntry.total);

    // If we have volume and total, calculate price
    if (volume && total && !newEntry.price) {
      const calculatedPrice = total / volume;
      setNewEntry(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
    }
    // If we have price and total, calculate volume
    else if (price && total && !newEntry.volume) {
      const calculatedVolume = total / price;
      setNewEntry(prev => ({ ...prev, volume: calculatedVolume.toFixed(2) }));
    }
    // If we have volume and price, calculate total
    else if (volume && price && !newEntry.total) {
      const calculatedTotal = volume * price;
      setNewEntry(prev => ({ ...prev, total: calculatedTotal.toFixed(2) }));
    }
  }, [newEntry.volume, newEntry.price, newEntry.total]);

  // Auto-calculate missing values for edit form
  useEffect(() => {
    if (!editingEntry) return;

    const volume = parseFloat(editFormData.volume);
    const price = parseFloat(editFormData.price);
    const total = parseFloat(editFormData.total);

    // If we have volume and total, calculate price
    if (volume && total && !editFormData.price) {
      const calculatedPrice = total / volume;
      setEditFormData(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
    }
    // If we have price and total, calculate volume
    else if (price && total && !editFormData.volume) {
      const calculatedVolume = total / price;
      setEditFormData(prev => ({ ...prev, volume: calculatedVolume.toFixed(2) }));
    }
    // If we have volume and price, calculate total
    else if (volume && price && !editFormData.total) {
      const calculatedTotal = volume * price;
      setEditFormData(prev => ({ ...prev, total: calculatedTotal.toFixed(2) }));
    }
  }, [editFormData.volume, editFormData.price, editFormData.total, editingEntry]);

  const handleAddEntry = async () => {
    if (!user) return;
    const odometer = parseFloat(newEntry.odometer);
    const volume = parseFloat(newEntry.volume);
    const price = parseFloat(newEntry.price);
    const total = parseFloat(newEntry.total);

    // Calculate consumption only if tank was filled to top
    let consumption: number | null = null;
    const last = fuelEntries[0];
    if (newEntry.filled_to_top && odometer && last?.odometer && volume && last?.filled_to_top) {
      const distance = odometer - last.odometer;
      if (isImperial) {
        const miles = distance * 0.621371;
        consumption = miles / volume;
      } else {
        consumption = (volume / distance) * 100;
      }
    }

    const entry = {
      user_id: user.id,
      date: newEntry.date,
      location: newEntry.location,
      odometer,
      volume,
      price,
      total,
      consumption,
      filled_to_top: newEntry.filled_to_top,
      region
    };

    const { data, error } = await (supabase as any)
      .from('fuel_log')
      .insert(entry)
      .select();
    if (error) {
      console.error('Error saving fuel entry:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
    else if (data && data[0]) {
      setFuelEntries(prev => [data[0], ...prev]);
      setNewEntry({ date: getTodayDateLocal(), location: '', odometer: '', volume: '', price: '', total: '', filled_to_top: true });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditClick = (entry: any) => {
    setEditingEntry(entry);
    setEditFormData({
      date: entry.date,
      location: entry.location || '',
      odometer: entry.odometer?.toString() || '',
      volume: entry.volume?.toString() || '',
      price: entry.price?.toString() || '',
      total: entry.total?.toString() || '',
      filled_to_top: entry.filled_to_top ?? true
    });
  };

  const handleUpdateEntry = async () => {
    if (!user || !editingEntry) return;
    const odometer = parseFloat(editFormData.odometer);
    const volume = parseFloat(editFormData.volume);
    const price = parseFloat(editFormData.price);
    const total = parseFloat(editFormData.total);

    // Calculate consumption only if tank was filled to top
    let consumption: number | null = null;
    const sortedEntries = [...fuelEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const entryIndex = sortedEntries.findIndex(e => e.id === editingEntry.id);
    const previousEntry = sortedEntries[entryIndex + 1];

    if (editFormData.filled_to_top && odometer && previousEntry?.odometer && volume && previousEntry?.filled_to_top) {
      const distance = odometer - previousEntry.odometer;
      if (isImperial) {
        const miles = distance * 0.621371;
        consumption = miles / volume;
      } else {
        consumption = (volume / distance) * 100;
      }
    }

    const updatedEntry = {
      date: editFormData.date,
      location: editFormData.location,
      odometer,
      volume,
      price,
      total,
      consumption,
      filled_to_top: editFormData.filled_to_top
    };

    const { data, error } = await (supabase as any)
      .from('fuel_log')
      .update(updatedEntry)
      .eq('id', editingEntry.id)
      .select();

    if (error) {
      console.error('Error updating fuel entry:', error);
    } else if (data && data[0]) {
      setFuelEntries(prev => prev.map(e => e.id === editingEntry.id ? data[0] : e));
      setEditingEntry(null);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntryId) return;

    const { error } = await (supabase as any)
      .from('fuel_log')
      .delete()
      .eq('id', deleteEntryId);

    if (error) {
      console.error('Error deleting fuel entry:', error);
    } else {
      setFuelEntries(prev => prev.filter(e => e.id !== deleteEntryId));
      setDeleteEntryId(null);
    }
  };

  // Summaries
  const avgPrice =
    fuelEntries.reduce((sum, e) => sum + (e.price || 0), 0) / (fuelEntries.length || 1);
  const avgVolume =
    fuelEntries.reduce((sum, e) => sum + (e.volume || 0), 0) / (fuelEntries.length || 1);
  const last30 = fuelEntries
    .filter(e => new Date(e.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, e) => sum + (e.total || 0), 0);
  const lastConsumption = fuelEntries[0]?.consumption;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-gray-500 text-sm">Average Price</p>
          <p className="text-2xl font-bold">{regionConfig.currencySymbol}{avgPrice.toFixed(2)}/{volumeLabel}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-gray-500 text-sm">Average Fill-up</p>
          <p className="text-2xl font-bold">{avgVolume.toFixed(1)} {volumeLabel}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-gray-500 text-sm">Last 30 Days</p>
          <p className="text-2xl font-bold">{regionConfig.currencySymbol}{last30.toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-gray-500 text-sm">Fuel Efficiency</p>
          <p className="text-2xl font-bold">
            {lastConsumption != null ? lastConsumption.toFixed(2) : '-'} {consumptionLabel}
          </p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col items-end gap-2">
        <p className="text-sm text-gray-600 text-right">You can ask Pam to log fuel, or add it manually:</p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild><Button>Add Fuel Entry</Button></DialogTrigger>
          <DialogContent><div className="space-y-4">
            <div><Label>Date</Label><Input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={newEntry.location} onChange={e => setNewEntry({ ...newEntry, location: e.target.value })} /></div>
            <div><Label>Odometer (km)</Label><Input type="number" value={newEntry.odometer} onChange={e => setNewEntry({ ...newEntry, odometer: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Volume ({volumeLabel})</Label><Input type="number" step="0.01" value={newEntry.volume} onChange={e => setNewEntry({ ...newEntry, volume: e.target.value, price: '' })} placeholder="Auto-calc if price+total" /></div>
              <div><Label>{priceLabel} (optional)</Label><Input type="number" step="0.01" value={newEntry.price} onChange={e => setNewEntry({ ...newEntry, price: e.target.value, volume: '' })} placeholder="Auto-calc if volume+total" /></div>
            </div>
            <div><Label>Total Cost</Label><Input type="number" step="0.01" value={newEntry.total} onChange={e => setNewEntry({ ...newEntry, total: e.target.value })} /></div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="filled_to_top"
                checked={newEntry.filled_to_top}
                onChange={e => setNewEntry({ ...newEntry, filled_to_top: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="filled_to_top" className="text-sm font-normal cursor-pointer">
                Filled to top (needed for accurate consumption calculation)
              </Label>
            </div>
            <Button onClick={handleAddEntry} disabled={(!newEntry.volume && !newEntry.price) || !newEntry.total}>Save Entry</Button>
          </div></DialogContent>
        </Dialog>
      </div>

      {loading ? <p>Loading...</p> : <div className="rounded-md border overflow-hidden"><Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>{volumeLabel}</TableHead>
          <TableHead>{priceLabel}</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>{consumptionLabel}</TableHead>
          <TableHead>Odometer</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>{fuelEntries.map(entry => (
          <TableRow key={entry.id}>
            <TableCell>{entry.date}</TableCell>
            <TableCell>{entry.location}</TableCell>
            <TableCell>{entry.volume?.toFixed(1) || '-'}</TableCell>
            <TableCell>{entry.price ? `${regionConfig.currencySymbol}${entry.price.toFixed(2)}` : '-'}</TableCell>
            <TableCell>{regionConfig.currencySymbol}{entry.total.toFixed(2)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {entry.consumption != null ? `${entry.consumption.toFixed(2)} ${consumptionLabel}` : '-'}
                {entry.filled_to_top && (
                  <span className="inline-block" title="Filled to top">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>{entry.odometer ?? '-'}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClick(entry)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteEntryId(entry.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></div>}

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Edit Fuel Entry</h2>
            <div><Label>Date</Label><Input type="date" value={editFormData.date} onChange={e => setEditFormData({ ...editFormData, date: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={editFormData.location} onChange={e => setEditFormData({ ...editFormData, location: e.target.value })} /></div>
            <div><Label>Odometer (km)</Label><Input type="number" value={editFormData.odometer} onChange={e => setEditFormData({ ...editFormData, odometer: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Volume ({volumeLabel})</Label><Input type="number" step="0.01" value={editFormData.volume} onChange={e => setEditFormData({ ...editFormData, volume: e.target.value, price: '' })} placeholder="Auto-calc if price+total" /></div>
              <div><Label>{priceLabel} (optional)</Label><Input type="number" step="0.01" value={editFormData.price} onChange={e => setEditFormData({ ...editFormData, price: e.target.value, volume: '' })} placeholder="Auto-calc if volume+total" /></div>
            </div>
            <div><Label>Total Cost</Label><Input type="number" step="0.01" value={editFormData.total} onChange={e => setEditFormData({ ...editFormData, total: e.target.value })} /></div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_filled_to_top"
                checked={editFormData.filled_to_top}
                onChange={e => setEditFormData({ ...editFormData, filled_to_top: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit_filled_to_top" className="text-sm font-normal cursor-pointer">
                Filled to top (needed for accurate consumption calculation)
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
              <Button onClick={handleUpdateEntry} disabled={(!editFormData.volume && !editFormData.price) || !editFormData.total}>Update Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteEntryId} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <DialogContent>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Delete Fuel Entry</h2>
            <p className="text-gray-600">Are you sure you want to delete this fuel entry? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteEntryId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteEntry}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
