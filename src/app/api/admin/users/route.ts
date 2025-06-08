import { NextRequest, NextResponse } from 'next/server'
import { AdminUserService, requireAdminAuth } from '@/lib/supabase-admin'

// GET /api/admin/users - List all users with pagination
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''

    let users
    if (search) {
      users = await AdminUserService.searchUsers(search, page, limit)
    } else {
      users = await AdminUserService.getAllUsers(page, limit)
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('GET /api/admin/users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { email, password, userData } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await AdminUserService.createUser(email, password, userData)
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/users error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users - Bulk update users
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { userIds, action, data } = body

    if (!userIds || !Array.isArray(userIds) || !action) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    let result
    switch (action) {
      case 'disable':
        result = await AdminUserService.bulkDisableUsers(userIds)
        break
      case 'enable':
        result = await AdminUserService.bulkEnableUsers(userIds)
        break
      case 'delete':
        result = await AdminUserService.bulkDeleteUsers(userIds)
        break
      case 'update':
        if (!data) {
          return NextResponse.json(
            { error: 'Update data is required' },
            { status: 400 }
          )
        }
        result = await AdminUserService.bulkUpdateUsers(userIds, data)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('PATCH /api/admin/users error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}