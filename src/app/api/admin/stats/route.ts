import { NextRequest, NextResponse } from 'next/server'
import { AdminUserService, requireAdminAuth } from '@/lib/supabase-admin'

// GET /api/admin/stats - Get admin dashboard statistics
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
    const timeframe = searchParams.get('timeframe') || '30d' // 7d, 30d, 90d, 1y

    // Get comprehensive user statistics
    const stats = await AdminUserService.getUserStats(timeframe)

    // Add some computed metrics
    const computedStats = {
      ...stats,
      // Growth rates
      userGrowthRate: stats.totalUsers > 0 ? 
        ((stats.newUsersThisPeriod / Math.max(stats.totalUsers - stats.newUsersThisPeriod, 1)) * 100).toFixed(2) : '0',
      
      // Activity metrics
      activeUserPercentage: stats.totalUsers > 0 ? 
        ((stats.activeUsers / stats.totalUsers) * 100).toFixed(2) : '0',
      
      verificationRate: stats.totalUsers > 0 ? 
        ((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(2) : '0',
      
      // System health
      systemHealth: {
        userRegistrationTrend: stats.newUsersThisPeriod > stats.newUsersPreviousPeriod ? 'up' : 'down',
        activityLevel: parseFloat(((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100).toFixed(2)) > 20 ? 'healthy' : 'low',
        verificationHealth: parseFloat(((stats.verifiedUsers / Math.max(stats.totalUsers, 1)) * 100).toFixed(2)) > 50 ? 'good' : 'needs_attention'
      },
      
      // Quick insights
      insights: generateInsights(stats),
      
      // Last updated
      lastUpdated: new Date().toISOString(),
      timeframe
    }

    return NextResponse.json(computedStats)
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}

// Helper function to generate insights
function generateInsights(stats: any): string[] {
  const insights: string[] = []
  
  // User growth insights
  if (stats.newUsersThisPeriod > stats.newUsersPreviousPeriod) {
    const increase = stats.newUsersThisPeriod - stats.newUsersPreviousPeriod
    insights.push(`User registrations increased by ${increase} compared to previous period`)
  } else if (stats.newUsersThisPeriod < stats.newUsersPreviousPeriod) {
    const decrease = stats.newUsersPreviousPeriod - stats.newUsersThisPeriod
    insights.push(`User registrations decreased by ${decrease} compared to previous period`)
  }
  
  // Activity insights
  const activityRate = (stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100
  if (activityRate > 50) {
    insights.push('High user engagement - over 50% of users are active')
  } else if (activityRate < 20) {
    insights.push('Low user engagement - consider re-engagement campaigns')
  }
  
  // Verification insights
  const verificationRate = (stats.verifiedUsers / Math.max(stats.totalUsers, 1)) * 100
  if (verificationRate < 30) {
    insights.push('Low email verification rate - review verification process')
  }
  
  // Disabled users insights
  if (stats.disabledUsers > stats.totalUsers * 0.1) {
    insights.push('High number of disabled users - review moderation policies')
  }
  
  // Recent activity
  if (stats.usersCreatedToday > 0) {
    insights.push(`${stats.usersCreatedToday} new users registered today`)
  }
  
  if (insights.length === 0) {
    insights.push('All metrics are stable - no significant changes detected')
  }
  
  return insights
}