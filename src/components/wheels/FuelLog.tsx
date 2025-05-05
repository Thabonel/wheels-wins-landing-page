
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function FuelLog() {
  const [fuelEntries, setFuelEntries] = useState([
    { id: 1, date: '2025-04-28', gallons: 16.3, price: 3.45, total: 56.24, location: 'Shell, Portland' },
    { id: 2, date: '2025-04-15', gallons: 14.8, price: 3.52, total: 52.10, location: 'Chevron, Seattle' },
    { id: 3, date: '2025-04-02', gallons: 15.1, price: 3.48, total: 52.55, location: 'Costco, Vancouver' },
  ]);
  
  const [fuelSuggestions, setFuelSuggestions] = useState([
    { id: 1, name: 'Shell', price: 3.42, distance: '0.8 miles away', link: '#' },
    { id: 2, name: 'Costco', price: 3.29, distance: '2.4 miles away', link: '#' },
    { id: 3, name: 'Chevron', price: 3.45, distance: '1.2 miles away', link: '#' },
  ]);
  
  // Calculate averages
  const avgPrice = fuelEntries.reduce((acc, entry) => acc + entry.price, 0) / fuelEntries.length;
  const avgGallons = fuelEntries.reduce((acc, entry) => acc + entry.gallons, 0) / fuelEntries.length;
  
  return (
    <div className="space-y-6">
      {/* Fuel Statistics */}
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
      
      {/* Fuel Entries Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Gallons</TableHead>
              <TableHead>Price/Gal</TableHead>
              <TableHead>Total</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pam's fuel suggestions */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Nearby fuel stations:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fuelSuggestions.map((station) => (
            <Card key={station.id} className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4">
                <h4 className="font-bold">{station.name}</h4>
                <p className="text-gray-600 text-sm mt-1">${station.price}/gal</p>
                <p className="text-gray-600 text-sm">{station.distance}</p>
                <a 
                  href={station.link} 
                  className="text-primary text-sm mt-3 block hover:underline"
                >
                  Get Directions
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
