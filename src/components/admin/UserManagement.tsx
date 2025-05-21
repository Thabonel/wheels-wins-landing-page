import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@supabase/auth-helpers-react";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  region: string;
  status: string;
}

export default function AdminUserManagement() {
  const session = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/get-admin-users", {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchUsers();
  }, [session]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome, Admin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Change Admin Password</Button>
          <Button>Add New User</Button>
          <Button variant="outline" onClick={fetchUsers}>Refresh Users</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <p className="text-sm text-muted-foreground">Manage user access and view registration details</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email.split("@")[0]}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.region}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        {user.status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-x-2">
                        <Button variant="destructive" size="sm">Deactivate</Button>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!loading && (
          <CardFooter className="justify-end text-sm text-muted-foreground">
            Total users: {users.length}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
