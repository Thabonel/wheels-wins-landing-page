'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/components/ui/use-toast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase'

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const { session } = useAuth()

  const fetchUsers = async () => {
    if (!session) {
      toast({ title: 'Authentication required', variant: 'destructive' })
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase.functions.invoke('get-admin-users')

    if (error) {
      console.error('Error fetching users:', error)
      toast({ title: 'Failed to fetch users', variant: 'destructive' })
      setLoading(false)
      return
    }

    setUsers(data as AdminUser[])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [session])(() => {
    fetchUsers()
  }, [session])

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
          <Button variant="outline" onClick={fetchUsers}>
            Refresh Users
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage user access and view registration details
          </p>
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
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email.split('@')[0]}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.region}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        {u.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="destructive" size="sm" onClick={() => handleDeactivateUser(u.id)}>
                        Deactivate
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u.id)}>
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
)
}
