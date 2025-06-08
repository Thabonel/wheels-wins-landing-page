'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase'

export default function UserManagement() {
  const [debugInfo, setDebugInfo] = useState<string>('Starting admin check...')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      setDebugInfo('Step 1: Getting current user...')
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        setDebugInfo(`Step 1 Error: ${userError.message}`)
        return
      }

      if (!user) {
        setDebugInfo('Step 1: No user logged in')
        return
      }

      setDebugInfo(`Step 2: User found - ID: ${user.id}, Email: ${user.email || 'No email'}`)

      // Check profile
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('user_id', user.id)  // Fixed: use user_id not id

      if (profileError) {
        setDebugInfo(`Step 3 Error: Profile fetch failed - ${profileError.message}`)
        return
      }

      if (!profiles || profiles.length === 0) {
        setDebugInfo('Step 3: No profile found in profiles table')
        return
      }

      const profile = profiles[0]  // Get first (should be only) result
      const adminStatus = profile.role === 'admin'
      setIsAdmin(adminStatus)
      setDebugInfo(`Step 3: Profile found - Role: ${profile.role}, Email: ${profile.email}, Is Admin: ${adminStatus}`)

    } catch (error) {
      setDebugInfo(`Unexpected error: ${error}`)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Management Debug</h1>
      
      {/* Debug Info - Always visible */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <p className="text-blue-800 font-mono text-sm">{debugInfo}</p>
        </CardContent>
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