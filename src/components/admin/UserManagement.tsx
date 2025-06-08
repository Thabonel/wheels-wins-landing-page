'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Search, Plus, Trash2, UserCheck, UserX, Edit, MoreHorizontal, RefreshCw } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { supabase } from '@/integrations/supabase'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  phone: string | null
  user_metadata: Record<string, any>
  app_metadata: Record<string, any>
  banned_until: string | null
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  verifiedUsers: number
  newUsersThisPeriod: number
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Create user form
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    metadata: '{}'
  })

  // Check if current user is admin
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if user has admin role in app_metadata
        const isUserAdmin = user.app_metadata?.role === 'admin' || user.app_metadata?.is_admin === true
        setIsAdmin(isUserAdmin)
        
        if (isUserAdmin) {
          fetchUsers()
        } else {
          toast.error('You do not have admin privileges')
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      toast.error('Failed to verify admin status')
    }
  }

  // Fetch users using Supabase Edge Function
  const fetchUsers = async (page = 1, search = '') => {
    if (!isAdmin) return

    try {
      setLoading(true)
      
      // Call the existing Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('get-admin-users', {
        body: {
          page,
          limit: 20,
          search
        }
      })

      if (error) {
        console.error('Supabase function error:', error)
        throw error
      }

      if (data) {
        setUsers(data.users || [])
        setStats({
          totalUsers: data.total || 0,
          activeUsers: data.users?.filter((u: any) => u.last_sign_in_at).length || 0,
          verifiedUsers: data.users?.filter((u: any) => u.email_confirmed_at).length || 0,
          newUsersThisPeriod: 0
        })
        setTotalPages(Math.ceil((data.total || 0) / 20))
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users. Make sure the get-admin-users function is deployed.')
      
      // Fallback: try to fetch from auth.users table if function fails
      await fetchUsersFromAuthTable(page, search)
    } finally {
      setLoading(false)
    }
  }

  // Fallback method using direct table access
  const fetchUsersFromAuthTable = async (page = 1, search = '') => {
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' })
      
      if (search) {
        query = query.ilike('email', `%${search}%`)
      }
      
      const { data: profiles, error: profilesError, count } = await query
        .range((page - 1) * 20, page * 20 - 1)
        .order('created_at', { ascending: false })

      if (profilesError) {
        throw profilesError
      }

      // Convert profiles to user format
      const formattedUsers = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        created_at: profile.created_at,
        last_sign_in_at: null,
        email_confirmed_at: profile.created_at, // Assume confirmed if in profiles
        phone: null,
        user_metadata: {},
        app_metadata: {},
        banned_until: null
      })) || []

      setUsers(formattedUsers)
      setStats({
        totalUsers: count || 0,
        activeUsers: formattedUsers.length,
        verifiedUsers: formattedUsers.length,
        newUsersThisPeriod: 0
      })
      setTotalPages(Math.ceil((count || 0) / 20))
      setCurrentPage(page)

      toast.info('Showing user profiles (limited admin functionality)')
    } catch (error) {
      console.error('Error fetching from profiles:', error)
      toast.error('Unable to fetch user data')
    }
  }

  // Create new user (simplified for Vite)
  const handleCreateUser = async () => {
    try {
      if (!isAdmin) {
        toast.error('Admin privileges required')
        return
      }

      // This would need a backend endpoint or Edge Function
      toast.info('User creation requires backend implementation')
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Failed to create user')
    }
  }

  // Update user (simplified)
  const handleUpdateUser = async () => {
    if (!editingUser || !isAdmin) return

    try {
      // Update in profiles table if available
      const { error } = await supabase
        .from('profiles')
        .update({
          email: editingUser.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)

      if (error) throw error

      toast.success('User profile updated successfully')
      setIsEditDialogOpen(false)
      setEditingUser(null)
      fetchUsers(currentPage, searchQuery)
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  // Delete user (simplified)
  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) {
      toast.error('Admin privileges required')
      return
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      // Delete from profiles table
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      toast.success('User deleted successfully')
      fetchUsers(currentPage, searchQuery)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  // Bulk operations (simplified)
  const handleBulkAction = async (action: string) => {
    if (!isAdmin) {
      toast.error('Admin privileges required')
      return
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    toast.info(`Bulk ${action} requires backend implementation`)
    setSelectedUsers([])
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    if (isAdmin) {
      fetchUsers(1, query)
    }
  }

  // Handle user selection
  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getUserStatus = (user: User) => {
    if (user.banned_until) return 'banned'
    if (!user.email_confirmed_at) return 'unverified'
    if (user.last_sign_in_at) return 'active'
    return 'inactive'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'unverified':
        return <Badge variant="outline">Unverified</Badge>
      case 'banned':
        return <Badge variant="destructive">Banned</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-red-600">Access Denied</p>
              <p className="text-muted-foreground">You need admin privileges to access user management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, permissions, and access
          </p>
        </div>
        
        {stats && (
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{stats.totalUsers}</div>
              <div className="text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{stats.activeUsers}</div>
              <div className="text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{stats.verifiedUsers}</div>
              <div className="text-muted-foreground">Verified</div>
            </div>
          </div>
        )}
      </div>

      {/* Search and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search users by email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => fetchUsers(currentPage, searchQuery)}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="flex gap-2">
              {/* Bulk Actions */}
              {selectedUsers.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('disable')}
                    disabled={bulkActionLoading}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Disable ({selectedUsers.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('enable')}
                    disabled={bulkActionLoading}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Enable ({selectedUsers.length})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkActionLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete ({selectedUsers.length})
                  </Button>
                </div>
              )}

              {/* Create User */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-1" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account (requires backend implementation)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>Create User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {stats && `Showing ${users.length} of ${stats.totalUsers} users`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleUserSelect(user.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(getUserStatus(user))}
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingUser(user)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => fetchUsers(currentPage - 1, searchQuery)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => fetchUsers(currentPage + 1, searchQuery)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}