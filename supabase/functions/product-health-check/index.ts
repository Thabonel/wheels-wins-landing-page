import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/utils.ts';

interface ProductHealthIssue {
  product_id: string;
  title: string;
  issues: string[];
  severity: 'low' | 'medium' | 'high';
  last_updated: string;
}

interface HealthCheckResult {
  total_products: number;
  healthy_products: number;
  products_with_issues: ProductHealthIssue[];
  summary: {
    missing_images: number;
    missing_prices: number;
    missing_descriptions: number;
    stale_products: number; // Not updated in 30+ days
    unknown_availability: number;
  };
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication check - require either cron secret or admin JWT
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');

    let isAuthenticated = false;

    // Option 1: Cron job with shared secret
    if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
      console.log('✓ Authenticated via cron secret');
      isAuthenticated = true;
    }
    // Option 2: Admin user with valid JWT
    else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');

      // Verify JWT and get user
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error('Invalid JWT token:', authError?.message);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid authentication token' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Verify user has admin privileges
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('role, status')
        .eq('user_id', user.id)
        .single();

      if (adminError || !adminUser ||
          !['super_admin', 'admin'].includes(adminUser.role) ||
          adminUser.status !== 'active') {
        console.error('User lacks admin privileges:', user.email);
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin access required' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('✓ Authenticated as admin:', user.email);
      isAuthenticated = true;
    }

    // Reject unauthenticated requests
    if (!isAuthenticated) {
      console.error('No valid authentication provided');
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: Authentication required',
          hint: 'Provide either X-Cron-Secret header or valid admin JWT in Authorization header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const autoFix = url.searchParams.get('autoFix') === 'true'; // Auto-mark stale products as 'unknown'
    const staleDays = parseInt(url.searchParams.get('staleDays') || '30'); // Configurable stale threshold

    console.log(`Running product health check (autoFix: ${autoFix}, staleDays: ${staleDays})`);

    // Fetch all affiliate products (both active and inactive for comprehensive check)
    const { data: products, error: fetchError } = await supabase
      .from('affiliate_products')
      .select('*')
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch products:', fetchError);
      throw new Error(`Database query failed: ${fetchError.message}`);
    }

    console.log(`Analyzing ${products?.length || 0} products`);

    // Calculate stale date threshold
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    // Analyze each product for issues
    const productsWithIssues: ProductHealthIssue[] = [];
    const summary = {
      missing_images: 0,
      missing_prices: 0,
      missing_descriptions: 0,
      stale_products: 0,
      unknown_availability: 0,
    };

    const productsToUpdate: { id: string; updates: any }[] = [];

    for (const product of products || []) {
      const issues: string[] = [];
      let severity: 'low' | 'medium' | 'high' = 'low';

      // Check for missing image
      if (!product.image_url || product.image_url.includes('placeholder')) {
        issues.push('Missing or placeholder image');
        summary.missing_images++;
        severity = 'medium';
      }

      // Check for missing price (critical for shop display)
      if (product.price === null || product.price === undefined) {
        issues.push('Missing price');
        summary.missing_prices++;
        severity = 'high';
      }

      // Check for missing description
      if (!product.description || product.description.trim() === '') {
        issues.push('Missing description');
        summary.missing_descriptions++;
        severity = 'low';
      }

      // Check for stale products (not updated in staleDays)
      const lastUpdated = new Date(product.updated_at);
      if (lastUpdated < staleDate) {
        issues.push(`Not updated in ${staleDays}+ days (last: ${product.updated_at.split('T')[0]})`);
        summary.stale_products++;

        // Auto-fix: Mark stale products as 'unknown' availability
        if (autoFix && product.availability_status !== 'unknown') {
          productsToUpdate.push({
            id: product.id,
            updates: { availability_status: 'unknown' }
          });
          issues.push('Auto-marked as unknown availability');
        }

        if (severity === 'low') severity = 'medium';
      }

      // Check for unknown availability status
      if (product.availability_status === 'unknown' || !product.availability_status) {
        issues.push('Unknown availability status');
        summary.unknown_availability++;
      }

      // If any issues found, add to report
      if (issues.length > 0) {
        productsWithIssues.push({
          product_id: product.id,
          title: product.title,
          issues,
          severity,
          last_updated: product.updated_at,
        });
      }
    }

    // Apply auto-fixes if enabled
    if (autoFix && productsToUpdate.length > 0) {
      console.log(`Auto-fixing ${productsToUpdate.length} products`);

      for (const update of productsToUpdate) {
        const { error: updateError } = await supabase
          .from('affiliate_products')
          .update(update.updates)
          .eq('id', update.id);

        if (updateError) {
          console.error(`Failed to update product ${update.id}:`, updateError);
        }
      }
    }

    // Build health check result
    const result: HealthCheckResult = {
      total_products: products?.length || 0,
      healthy_products: (products?.length || 0) - productsWithIssues.length,
      products_with_issues: productsWithIssues.sort((a, b) => {
        // Sort by severity: high > medium > low
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      summary,
      timestamp: new Date().toISOString(),
    };

    console.log('Health check complete:', {
      total: result.total_products,
      healthy: result.healthy_products,
      issues: productsWithIssues.length,
    });

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
