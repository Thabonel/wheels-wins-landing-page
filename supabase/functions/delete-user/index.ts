
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting deletion process for user: ${userId}`);

    // Delete related data in the correct order to avoid foreign key violations
    const deleteOperations = [
      // Delete user-related data first
      { table: 'fuel_log', column: 'user_id' },
      { table: 'maintenance_records', column: 'user_id' },
      { table: 'expenses', column: 'user_id' },
      { table: 'budgets', column: 'user_id' },
      { table: 'calendar_events', column: 'user_id' },
      { table: 'social_posts', column: 'user_id' },
      { table: 'post_votes', column: 'user_id' },
      { table: 'social_group_members', column: 'user_id' },
      { table: 'drawers', column: 'user_id' },
      { table: 'food_items', column: 'user_id' },
      { table: 'food_categories', column: 'user_id' },
      { table: 'items', column: 'user_id' },
      { table: 'meal_plans', column: 'user_id' },
      { table: 'shopping_lists', column: 'user_id' },
      { table: 'income_sources', column: 'user_id' },
      { table: 'onboarding_responses', column: 'user_id' },
      { table: 'pam_memory', column: 'user_id' },
      { table: 'pam_life_memory', column: 'user_id' },
      { table: 'pam_feedback', column: 'user_id' },
      { table: 'support_tickets', column: 'user_id' },
      { table: 'user_feedback', column: 'user_id' },
      { table: 'user_achievements', column: 'user_id' },
      { table: 'profiles', column: 'user_id' }, // Delete profile last
    ];

    // Execute deletions
    for (const operation of deleteOperations) {
      try {
        const { error } = await supabaseAdmin
          .from(operation.table)
          .delete()
          .eq(operation.column, userId);
        
        if (error) {
          console.log(`Warning: Could not delete from ${operation.table}: ${error.message}`);
        } else {
          console.log(`Successfully deleted from ${operation.table}`);
        }
      } catch (err) {
        console.log(`Warning: Error deleting from ${operation.table}: ${err}`);
      }
    }

    // Finally delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${userId} and all related data have been successfully deleted` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
