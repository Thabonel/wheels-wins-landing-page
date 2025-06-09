
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  region?: string;
  status?: string;
  role?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();

  const fetchUsers = async () => {
    if (!user) return;
    
    // Get the session to access the access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Fetching users for admin dashboard");
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
        toast({
          title: "Error",
          description: `Failed to fetch users: ${errorData.error || 'Unknown error'}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("Fetched user data:", data);
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "Error",
        description: "Network error while fetching users",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("user_id", userId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to update user status: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `User status updated to ${newStatus}`,
        });
        fetchUsers(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from profiles table - the auth user will be handled by cascade
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to delete user: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "User deleted successfully",
        });
        fetchUsers(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome, {user?.email}</p>
        </div>
        <div className="flex gap-2">
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.role === 'admin' ? 'bg-red-100 text-red-700' :
                        user.role === 'moderator' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {user.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.region || 'Not specified'}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.status === 'active' ? 'bg-green-100 text-green-700' :
                        user.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {user.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {user.status !== 'suspended' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUpdateUserStatus(user.id, 'suspended')}
                        >
                          Suspend
                        </Button>
                      )}
                      {user.status === 'suspended' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUpdateUserStatus(user.id, 'active')}
                        >
                          Activate
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteUser(user.id)}
                      >
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
        <Card className="border-green-200 bg-green-50 mt-4">
          <CardContent className="pt-4">
            <p className="text-green-800">✅ Admin access confirmed! User management loaded successfully.</p>
            <p className="text-sm text-green-600 mt-2">
              Your user ID: {user?.id}<br />
              Your email: {user?.email}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-200 bg-red-50 mt-4">
          <CardContent className="pt-4">
            <p className="text-red-800">❌ Access Denied - You need admin privileges</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
