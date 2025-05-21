import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  region: string;
  status: string;
}

export default function UserManagement() {
  // Assuming your custom useAuth hook provides a session object with an access_token
  // const supabase = useSupabaseClient(); // Removed useSupabaseClient import
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    console.log("Access token:", session?.access_token);
    setLoading(true);
    try {
      const res = await fetch("https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/get-admin-users", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
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

  // Temporarily comment out the useEffect to prevent fetching on component mount
  // useEffect(() => {
  //   // Assuming 'session' is available from your custom auth context
  //   if (session) fetchUsers();
  //   // If session is not available from auth context, you might need to adjust this logic
  // }, [session]);

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
    </div>
  );
}
