'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase'

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = async () => {
    if (!user) return;
    
    // Get the session to access the access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Authentication required");
      return;
    }
    
    console.log("Access token:", session.access_token);
    setLoading(true);
    try {
      const res = await fetch("https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/get-admin-users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error fetching users:", errorData);
        toast.error("Failed to fetch users");
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("Fetched data:", data);
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Network error:", error);
      toast.error("Network error while fetching users");
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ status: "Inactive" }).eq("id", id);
    if (error) {
      toast.error("Failed to deactivate user");
    } else {
      toast.success("User deactivated");
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete user");
    } else {
      toast.success("User deleted");
      fetchUsers();
    }
  };

  useEffect(() => {
    if (user) fetchUsers();
  }, [user]);

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
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
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
                    <TableCell className="text-right space-x-2">
                      <Button variant="destructive" size="sm" onClick={() => handleDeactivateUser(user.id)}>
                        Deactivate
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!loading && users.length > 0 && (
          <CardFooter className="justify-end text-sm text-muted-foreground">
            Total users: {users.length}
          </CardFooter>
        )}
      </Card>

      {isAdmin ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-green-800">✅ Admin access confirmed! User management would load here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-800">❌ Access Denied - You need admin privileges</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}