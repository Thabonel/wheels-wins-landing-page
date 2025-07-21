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

const getTodayDate = () => new Date().toISOString().split("T")[0];

export default function FuelLog() {
  const { region } = useRegion();
  const { user } = useAuth();
  const isImperial = (region as string) === "US";
  const volumeLabel = isImperial ? "gal" : "L";
  const priceLabel = isImperial ? "Price/Gal" : "Price/L";
  const consumptionLabel = isImperial ? "MPG" : "L/100km";

  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState({
    date: getTodayDate(),
    location: '',
    odometer: '',
    volume: '',
    price: '',
    total: ''
  });
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

  // Auto-fill location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          setNewEntry(prev => ({ ...prev, location: data.display_name || '' }));
        } catch {
          console.log("Failed to fetch location.");
        }
      });
    }
  }, []);

  const handleAddEntry = async () => {
    if (!user) return;
    const odometer = parseFloat(newEntry.odometer);
    const volume = parseFloat(newEntry.volume);
    const price = parseFloat(newEntry.price);
    const total = parseFloat(newEntry.total);

    // Calculate consumption
    let consumption: number | null = null;
    const last = fuelEntries[0];
    if (odometer && last?.odometer && volume) {
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
      region
    };

    const { data, error } = await (supabase as any)
      .from('fuel_log')
      .insert(entry)
      .select();
    if (error) console.error('Error saving fuel entry:', error);
    else if (data && data[0]) {
      setFuelEntries(prev => [data[0], ...prev]);
      setNewEntry({ date: getTodayDate(), location: '', odometer: '', volume: '', price: '', total: '' });
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
          <p className="text-2xl font-bold">${avgPrice.toFixed(2)}/{volumeLabel}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-gray-500 text-sm">Average Fill-up</p>
          <p className="text-2xl font-bold">{avgVolume.toFixed(1)} {volumeLabel}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-gray-500 text-sm">Last 30 Days</p>
          <p className="text-2xl font-bold">${last30.toFixed(2)}</p>
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
        <Dialog><DialogTrigger asChild><Button>Add Fuel Entry</Button></DialogTrigger>
          <DialogContent><div className="space-y-4">
            <div><Label>Date</Label><Input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={newEntry.location} onChange={e => setNewEntry({ ...newEntry, location: e.target.value })} /></div>
            <div><Label>Odometer (km)</Label><Input type="number" value={newEntry.odometer} onChange={e => setNewEntry({ ...newEntry, odometer: e.target.value })} /></div>
            <div><Label>Volume ({volumeLabel})</Label><Input type="number" value={newEntry.volume} onChange={e => setNewEntry({ ...newEntry, volume: e.target.value })} /></div>
            <div><Label>{priceLabel}</Label><Input type="number" value={newEntry.price} onChange={e => setNewEntry({ ...newEntry, price: e.target.value })} /></div>
            <div><Label>Total</Label><Input type="number" value={newEntry.total} onChange={e => setNewEntry({ ...newEntry, total: e.target.value })} /></div>
            <Button onClick={handleAddEntry} disabled={!newEntry.volume || !newEntry.price || !newEntry.total}>Save Entry</Button>
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
        </TableRow></TableHeader>
        <TableBody>{fuelEntries.map(entry => (
          <TableRow key={entry.id}>
            <TableCell>{entry.date}</TableCell>
            <TableCell>{entry.location}</TableCell>
            <TableCell>{entry.volume.toFixed(1)}</TableCell>
            <TableCell>${entry.price.toFixed(2)}</TableCell>
            <TableCell>${entry.total.toFixed(2)}</TableCell>
            <TableCell>{entry.consumption != null ? entry.consumption.toFixed(2) : '-'} {consumptionLabel}</TableCell>
            <TableCell>{entry.odometer ?? '-'}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></div>}
    </div>
  );
}
