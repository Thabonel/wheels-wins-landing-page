import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface Product {
  id: string;
  name: string;
  region: string;
  link: string;
}

const ShopManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Order Management</h2>
          <p>Track orders, update status, and manage shipping.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Discounts & Promotions</h2>
          <p>Create and manage discount codes and special offers.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopManagement;