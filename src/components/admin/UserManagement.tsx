import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  Search,
  Download,
  Mail,
  Ban,
  CheckCircle,
  XCircle,
  Calendar,
  Shield,
  Activity,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

interface User {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  nickname?: string;
  role: 'user' | 'admin' | 'moderator' | 'premium';
  status: 'active' | 'suspended' | 'pending';
  region?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  posts_count?: number;
  profile_exists: boolean;
}

const UserManagement: React.FC = () => {
  const { toast } = useToast();
  const { supabase } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as User['role'],
    status: 'active' as User['status'],
    region: 'Australia'
  });

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    moderator: 'bg-blue-100 text-blue-800',
    premium: 'bg-yellow-100 text-yellow-800',
    user: 'bg-gray-100 text-gray-800'
  };

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get auth users with profiles data
      const { data: usersData, error } = await supabase
        .from('auth.users')
        .select(`
          id,
          email,
          created_at,
          last_sign_in_at,
          email_confirmed_at,
          profiles!inner(role, status, region),
          user_profiles(full_name, nickname)
        `);

      if (error) {
        // Fallback: Get users from profiles table instead
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            user_id,
            email,
            role,
            status,
            region,
            created_at,
            user_profiles(full_name, nickname)
          `);

        if (profilesError) {
          console.error('Error fetching users:', profilesError);
          toast({
            title: "Error Loading Users",
            description: "Failed to load user data from database.",
            variant: "destructive"
          });
          return;
        }

        // Transform profiles data to user format
        const transformedUsers: User[] = profilesData?.map(profile => ({
          id: profile.user_id || '',
          email: profile.email || '',
          created_at: profile.created_at || '',
          full_name: profile.user_profiles?.full_name || '',
          nickname: profile.user_profiles?.nickname || '',
          role: (profile.role as User['role']) || 'user',
          status: (profile.status as User['status']) || 'active',
          region: profile.region || '',
          profile_exists: true,
          posts_count: 0
        })) || [];

        setUsers(transformedUsers);
      } else {
        // Transform auth.users data
        const transformedUsers: User[] = usersData?.map(user => ({
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          full_name: user.user_profiles?.full_name || '',
          nickname: user.user_profiles?.nickname || '',
          role: (user.profiles?.role as User['role']) || 'user',
          status: (user.profiles?.status as User['status']) || 'active',
          region: user.profiles?.region || '',
          profile_exists: true,
          posts_count: 0
        })) || [];

        setUsers(transformedUsers);
      }

      // Get posts count for each user
      const { data: postsCount } = await supabase
        .from('social_posts')
        .select('user_id, id');

      if (postsCount) {
        const postsCounts = postsCount.reduce((acc, post) => {
          acc[post.user_id] = (acc[post.user_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setUsers(prev => prev.map(user => ({
          ...user,
          posts_count: postsCounts[user.id] || 0
        })));
      }

    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: "Database Error",
        description: "Unable to connect to user database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.nickname?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleAddUser = async () => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          region: newUser.region
        });

      if (profileError) throw profileError;

      // Create user profile record
      if (newUser.full_name) {
        await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            full_name: newUser.full_name,
            email: newUser.email,
            region: newUser.region
          });
      }

      setNewUser({ email: '', password: '', full_name: '', role: 'user', status: 'active', region: 'Australia' });
      setIsAddUserOpen(false);
      fetchUsers(); // Refresh the list
      
      toast({
        title: "User Added",
        description: `${newUser.full_name || newUser.email} has been added successfully.`,
      });
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error Adding User",
        description: error.message || "Failed to create user account.",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: editingUser.role,
          status: editingUser.status,
          region: editingUser.region
        })
        .eq('user_id', editingUser.id);

      if (profileError) throw profileError;

      // Update user profile data
      const { error: userProfileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: editingUser.id,
          full_name: editingUser.full_name,
          nickname: editingUser.nickname,
          region: editingUser.region,
          email: editingUser.email
        });

      if (userProfileError) {
        console.warn('Error updating user profile:', userProfileError);
        // Don't throw - profile might not exist yet
      }

      setIsEditUserOpen(false);
      setEditingUser(null);
      fetchUsers(); // Refresh the list
      
      toast({
        title: "User Updated",
        description: `${editingUser.full_name || editingUser.email}'s details have been updated.`,
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error Updating User",
        description: error.message || "Failed to update user details.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      
      // Delete profile records first
      await supabase.from('profiles').delete().eq('user_id', userId);
      await supabase.from('user_profiles').delete().eq('user_id', userId);
      
      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      fetchUsers(); // Refresh the list
      
      toast({
        title: "User Deleted",
        description: `${user?.full_name || user?.email} has been removed from the system.`,
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error Deleting User",
        description: error.message || "Failed to delete user.",
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to perform bulk actions.",
        variant: "destructive"
      });
      return;
    }

    try {
      switch (action) {
        case 'activate':
          await supabase
            .from('profiles')
            .update({ status: 'active' })
            .in('user_id', selectedUsers);
          break;
        case 'suspend':
          await supabase
            .from('profiles')
            .update({ status: 'suspended' })
            .in('user_id', selectedUsers);
          break;
        case 'delete':
          // Delete profiles first
          await supabase.from('profiles').delete().in('user_id', selectedUsers);
          await supabase.from('user_profiles').delete().in('user_id', selectedUsers);
          // Delete auth users
          for (const userId of selectedUsers) {
            await supabase.auth.admin.deleteUser(userId);
          }
          break;
      }

      fetchUsers(); // Refresh the list
      setSelectedUsers([]);
      
      toast({ 
        title: `Bulk ${action} completed`, 
        description: `${selectedUsers.length} users processed.` 
      });
    } catch (error: any) {
      console.error(`Error in bulk ${action}:`, error);
      toast({
        title: `Bulk ${action} failed`,
        description: error.message || "Some operations may have failed.",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Status', 'Region', 'Created', 'Posts'],
      ...filteredUsers.map(user => [
        user.full_name || user.nickname || '',
        user.email,
        user.role,
        user.status,
        user.region || '',
        new Date(user.created_at).toLocaleDateString(),
        user.posts_count?.toString() || '0'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    
    toast({
      title: "Export Complete",
      description: "User data has been exported to CSV.",
    });
  };

  const getUserStats = () => {
    const stats = {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      pending: users.filter(u => u.status === 'pending').length,
      admins: users.filter(u => u.role === 'admin').length,
      premium: users.filter(u => u.role === 'premium').length
    };
    return stats;
  };

  const stats = getUserStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => fetchUsers()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newUser.role} onValueChange={(value: User['role']) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newUser.status} onValueChange={(value: User['status']) => setNewUser({ ...newUser, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={newUser.region} onValueChange={(value) => setNewUser({ ...newUser, region: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="New Zealand">New Zealand</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={!newUser.email || !newUser.password}>
                  Add User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suspended</p>
                <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Premium</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.premium}</p>
              </div>
              <Activity className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                  Activate
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')}>
                  Suspend
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers(currentUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.full_name ? 
                            user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) :
                            user.email.slice(0, 2).toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.full_name || user.nickname || user.email}</p>
                          {user.email_confirmed_at && <CheckCircle className="h-4 w-4 text-blue-600" />}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.region && <p className="text-xs text-gray-400">{user.region}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[user.status]}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{user.posts_count || 0} posts</p>
                      {user.last_sign_in_at && (
                        <p className="text-gray-500">
                          Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'active' ? (
                          <DropdownMenuItem className="text-red-600">
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-green-600">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editFullName">Full Name</Label>
                  <Input
                    id="editFullName"
                    value={editingUser.full_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNickname">Nickname</Label>
                  <Input
                    id="editNickname"
                    value={editingUser.nickname || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, nickname: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed from admin panel</p>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select 
                    value={editingUser.region || ''} 
                    onValueChange={(value) => setEditingUser({ ...editingUser, region: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="New Zealand">New Zealand</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select 
                    value={editingUser.role} 
                    onValueChange={(value: User['role']) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={editingUser.status} 
                    onValueChange={(value: User['status']) => setEditingUser({ ...editingUser, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Account Created:</strong> {new Date(editingUser.created_at).toLocaleString()}
                  </p>
                  {editingUser.last_sign_in_at && (
                    <p className="text-sm text-blue-800">
                      <strong>Last Login:</strong> {new Date(editingUser.last_sign_in_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;