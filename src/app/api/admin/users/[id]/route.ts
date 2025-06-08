import { NextRequest, NextResponse } from 'next/server'
import { AdminUserService, requireAdminAuth } from '@/lib/supabase-admin'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/users/[id] - Get single user by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await AdminUserService.getUserById(id)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error(`GET /api/admin/users/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users/[id] - Update single user
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate that user exists first
    const existingUser = await AdminUserService.getUserById(id)
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Extract valid update fields
    const updateData: any = {}
    
    if (body.email && typeof body.email === 'string') {
      updateData.email = body.email
    }
    
    if (body.password && typeof body.password === 'string') {
      updateData.password = body.password
    }
    
    if (typeof body.email_confirm === 'boolean') {
      updateData.email_confirm = body.email_confirm
    }
    
    if (typeof body.phone_confirm === 'boolean') {
      updateData.phone_confirm = body.phone_confirm
    }
    
    if (body.user_metadata && typeof body.user_metadata === 'object') {
      updateData.user_metadata = body.user_metadata
    }
    
    if (body.app_metadata && typeof body.app_metadata === 'object') {
      updateData.app_metadata = body.app_metadata
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const updatedUser = await AdminUserService.updateUser(id, updateData)
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error(`PATCH /api/admin/users/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Delete single user
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate that user exists first
    const existingUser = await AdminUserService.getUserById(id)
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admin from deleting themselves
    if (authResult.user && authResult.user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      )
    }

    await AdminUserService.deleteUser(id)
    
    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error(`DELETE /api/admin/users/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}