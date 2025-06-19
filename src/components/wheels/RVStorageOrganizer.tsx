
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Search } from "lucide-react";
import { useAuth } from '@/context/AuthContext';

const RVStorageOrganizer = () => {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RV Storage Organizer</CardTitle>
          <CardDescription>Please sign in to manage your RV storage.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RV Storage Organizer</h1>
          <p className="text-muted-foreground">Keep track of your belongings and storage locations</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Kitchen Storage
            </CardTitle>
            <CardDescription>Pantry and cooking supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Rice (2 bags)</span>
                <Badge variant="outline">Pantry</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Spices Set</span>
                <Badge variant="outline">Upper Cabinet</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bathroom Storage
            </CardTitle>
            <CardDescription>Toiletries and cleaning supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Towels (4)</span>
                <Badge variant="outline">Cabinet</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Toiletries</span>
                <Badge variant="outline">Mirror Cabinet</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              External Storage
            </CardTitle>
            <CardDescription>Outside compartments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Tools</span>
                <Badge variant="outline">Left Bay</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Water Hose</span>
                <Badge variant="outline">Right Bay</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RVStorageOrganizer;
