import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

export default function FuelLog() {
  const [fuelEntries, setFuelEntries] = useState([
    { id: 1, date: '2025-04-28', gallons: 16.3, price: 3.45, total: 56.24, location: 'Shell, Portland', odometer: 45000 },
    { id: 2, date: '2025-04-15', gallons: 14.8, price: 3.52, total: 52.10, location: 'Chevron, Seattle', odometer: 44200 },
    { id: 3, date: '2025-04-02', gallons: 15.1, price: 3.48, total: 52.55, location: 'Costco, Vancouver', odometer: 43420 },
  ]);

  const [newEntry, setNewEntry] = useState({
    date: getTodayDate(),
    location: '',
    gallons: '',
    price: '',
    total: '',
    odometer: ''
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          setNewEntry((prev) => ({
            ...prev,
            location: data.display_name || ''
          }));
        } catch {
          console.log("Failed to fetch location.");
        }
      });
    }
  }, []);

  const handleAddEntry = () => {
    const id = fuelEntries.length + 1;
    const newOdometer = parseFloat(newEntry.odometer);

    const entry = {
      id,
      date: newEntry.date,
      location: newEntry.location,
      gallons: parseFloat(newEntry.gallons),
      price: parseFloat(newEntry.price),
      total: parseFloat(newEntry.total),
      odometer: newOdometer || null
    };

    // Calculate fuel consumption
    const lastEntry = fuelEntries[0];
    if (entry.odometer && lastEntry && lastEntry.odometer) {
      const distance = entry.odometer - lastEntry.odometer;
      const consumption = distance / entry.gallons;
      console.log(`Fuel consumption: ${consumption.toFixed(2)} km/L`);
    }

    setFuelEntries([entry, ...fuelEntries]);
    setNewEntry({
      date: getTodayDate(),
      location: '',
      gallons: '',
      price: '',
      total: '',
      odometer: ''
    });
  };

  const avgPrice = fuelEntries.reduce((acc, entry) => acc + entry.price, 0) / fuelEntries.length;
  const avgGallons = fuelEntries.reduce((acc, entry) => acc + entry.gallons, 0) / fuelEntries.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Average Price</p>
            <p className="text-2xl font-bold">${avgPrice.toFixed(2)}/gal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Average Fill-up</p>
            <p className="text-2xl font-bold">{avgGallons.toFixed(1)} gal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Last 30 Days</p>
            <p className="text-2xl font-bold">${(avgPrice * avgGallons * 3).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-end gap-2">
        <p className="text-sm text-gray-600 text-right">
          You can ask Pam to log fuel, or add it manually:
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Fuel Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={newEntry.location}
                  onChange={(e) => setNewEntry({ ...newEntry, location: e.target.value })}
                />
              </div>
              <div>
                <Label>Odometer (km)</Label>
                <Input
                  type="number"
                  value={newEntry.odometer}
                  onChange={(e) => setNewEntry({ ...newEntry, odometer: e.target.value })}
                />
              </div>
              <div>
                <Label>Gallons</Label>
                <Input
                  value={newEntry.gallons}
                  onChange={(e) => setNewEntry({ ...newEntry, gallons: e.target.value })}
                />
              </div>
              <div>
                <Label>Price/Gallon</Label>
                <Input
                  value={newEntry.price}
                  onChange={(e) => setNewEntry({ ...newEntry, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Total</Label>
                <Input
                  value={newEntry.total}
                  onChange={(e) => setNewEntry({ ...newEntry, total: e.target.value })}
                />
              </div>
              <Button onClick={handleAddEntry}>Save Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Gallons</TableHead>
              <TableHead>Price/Gal</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Odometer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fuelEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>{entry.location}</TableCell>
                <TableCell>{entry.gallons.toFixed(1)}</TableCell>
                <TableCell>${entry.price.toFixed(2)}</TableCell>
                <TableCell>${entry.total.toFixed(2)}</TableCell>
                <TableCell>{entry.odometer ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
