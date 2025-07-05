
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Search, UserPlus } from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  region?: string;
  last_login?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const { isAdmin, loading: adminLoading, user } = useAdminAuth();
  
  const fetchUsers = async () => {
    if (!isAdmin || adminLoading) return;
    
    console.log("Fetching admin users");
    setLoading(true);
    try {
      // Use admin function with service role access
      const { data, error } = await supabase
        .rpc('admin_get_users');

      if (error) {
        console.error("Error fetching users:", error);
        toast.error(`Failed to fetch users: ${error.message}`);
        return;
      }

      console.log("Fetched user data:", data);
      setUsers((data as AdminUser[]) || []);
    } catch (error) {
      console.error("Network error:", error);
      toast.error("Network error while fetching users");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) {
        toast.error(`Failed to update user role: ${error.message}`);
      } else {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers();
      }
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) {
        toast.error(`Failed to update user status: ${error.message}`);
      } else {
        toast.success(`User status updated to ${newStatus}`);
        fetchUsers();
      }
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("user_id", userId);

      if (error) {
        toast.error(`Failed to delete user: ${error.message}`);
      } else {
        toast.success("User deleted successfully");
        fetchUsers();
      }
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchUsers();
    }
  }, [isAdmin, adminLoading]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage user access and permissions</p>
        </div>
        <Button onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Users ({filteredUsers.length})
            <Button size="sm" variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((adminUser) => (
                    <TableRow key={adminUser.id}>
                      <TableCell className="font-medium">{adminUser.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          adminUser.role === 'admin' ? 'bg-red-100 text-red-700' :
                          adminUser.role === 'moderator' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {adminUser.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          adminUser.status === 'active' ? 'bg-green-100 text-green-700' :
                          adminUser.status === 'suspended' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {adminUser.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{adminUser.region || 'Not set'}</TableCell>
                      <TableCell>{new Date(adminUser.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{adminUser.last_login ? new Date(adminUser.last_login).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Select
                            value={adminUser.role}
                            onValueChange={(value) => handleUpdateUserRole(adminUser.user_id, value)}
                          >
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={adminUser.status}
                            onValueChange={(value) => handleUpdateUserStatus(adminUser.user_id, value)}
                          >
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteUser(adminUser.user_id)}
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
        {!loading && filteredUsers.length > 0 && (
          <CardFooter className="justify-between text-sm text-muted-foreground">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
