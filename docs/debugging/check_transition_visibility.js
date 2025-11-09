// Browser Console Debug Script for Transition Module Visibility
// Copy and paste this entire script into your browser console (F12) while logged in

console.log('🔍 Debugging Transition Module Visibility...\n');

// Check if running in browser
if (typeof window === 'undefined') {
  console.error('❌ Run this in browser console, not Node.js');
} else {
  // Get Supabase client from window (if available)
  const checkTransitionModule = async () => {
    try {
      // Try to get Supabase instance
      const supabase = window.supabase ||
                       window.__SUPABASE_CLIENT__ ||
                       (await import('/src/integrations/supabase/client.ts')).supabase;

      if (!supabase) {
        console.error('❌ Supabase client not found in window');
        console.log('💡 Tip: Check Network tab for API calls to transition_profiles');
        return;
      }

      console.log('✅ Found Supabase client');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('❌ Error getting user:', userError);
        return;
      }

      if (!user) {
        console.error('❌ Not logged in');
        return;
      }

      console.log('✅ Logged in as:', user.email);
      console.log('   User ID:', user.id);

      // Check transition profile
      console.log('\n📋 Checking transition_profiles table...');
      const { data: profile, error: profileError } = await supabase
        .from('transition_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        console.log('💡 Error details:', JSON.stringify(profileError, null, 2));
        return;
      }

      if (!profile) {
        console.warn('⚠️  NO TRANSITION PROFILE FOUND');
        console.log('💡 This is why the Transition link is hidden');
        console.log('💡 Navigate to /transition directly to see onboarding');
        console.log('💡 Or create profile in Settings → Transition Settings');
        return;
      }

      console.log('✅ Found transition profile:');
      console.log('   ID:', profile.id);
      console.log('   Departure Date:', profile.departure_date);
      console.log('   Is Enabled:', profile.is_enabled);
      console.log('   Auto-hide After Departure:', profile.auto_hide_after_departure);
      console.log('   Hide Days After Departure:', profile.hide_days_after_departure);
      console.log('   Archived At:', profile.archived_at);

      // Calculate visibility
      console.log('\n🔍 Visibility Logic:');

      if (!profile.is_enabled) {
        console.error('❌ HIDDEN: is_enabled = false');
        console.log('💡 Enable in Settings → Transition Settings');
        return;
      }
      console.log('✅ is_enabled = true');

      if (profile.auto_hide_after_departure && profile.departure_date) {
        const departureDate = new Date(profile.departure_date);
        const hideAfterDays = profile.hide_days_after_departure || 30;
        const hideDate = new Date(departureDate);
        hideDate.setDate(hideDate.getDate() + hideAfterDays);
        const now = new Date();

        console.log('   Departure Date:', departureDate.toLocaleDateString());
        console.log('   Hide Date:', hideDate.toLocaleDateString());
        console.log('   Today:', now.toLocaleDateString());

        if (now > hideDate) {
          console.error('❌ HIDDEN: Past hide date');
          console.log('💡 You departed', Math.floor((now - departureDate) / (1000*60*60*24)), 'days ago');
          console.log('💡 Module auto-hides', hideAfterDays, 'days after departure');
          return;
        }
        console.log('✅ Not past hide date yet');
      }

      // Calculate days until departure
      if (profile.departure_date) {
        const departureDate = new Date(profile.departure_date);
        const now = new Date();
        departureDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = departureDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log('   Days Until Departure:', diffDays, 'days');
      }

      console.log('\n✅ VISIBLE: Transition link SHOULD appear in navigation');
      console.log('💡 If you still don\'t see it, try:');
      console.log('   1. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)');
      console.log('   2. Clear browser cache');
      console.log('   3. Check browser console for React errors');

    } catch (error) {
      console.error('❌ Unexpected error:', error);
    }
  };

  // Run the check
  checkTransitionModule();
}
