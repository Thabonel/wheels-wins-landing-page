
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase";
import { useAuth } from "@/context/AuthContext";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  region: string;
  status: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = async () => {
    if (!user) {
      toast.error("No authenticated user");
      return;
    }
    
    // Get the session to access the access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Authentication required");
      return;
    }
    
    console.log("Fetching users with access token");
    setLoading(true);
    try {
      const res = await fetch("https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/get-admin-users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Error fetching users:", errorData);
        toast.error(`Failed to fetch users: ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("Fetched users data:", data);
      setUsers(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Network error:", error);
      toast.error("Network error while fetching users");
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (id: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ status: "Inactive" }).eq("id", id);
      if (error) {
        console.error("Deactivate error:", error);
        toast.error("Failed to deactivate user");
      } else {
        toast.success("User deactivated");
        fetchUsers();
      }
    } catch (error) {
      console.error("Deactivate error:", error);
      toast.error("Failed to deactivate user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete user");
      } else {
        toast.success("User deleted");
        fetchUsers();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete user");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage user access and view registration details</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">Change Admin Password</Button>
          <Button size="sm">Add New User</Button>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            {loading ? "Loading..." : "Refresh Users"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <p className="text-sm text-muted-foreground">View and manage all registered users</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading users...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No users found.</p>
              <Button variant="outline" className="mt-4" onClick={fetchUsers}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="font-medium">{user.email.split("@")[0]}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.region || "N/A"}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          {user.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeactivateUser(user.id)}
                          >
                            Deactivate
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!loading && users.length > 0 && (
          <CardFooter className="justify-between text-sm text-muted-foreground">
            <span>Total users: {users.length}</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
