// Complete Transition Feature Debug Script
// Run this in your browser console on the You page

console.log('🔍 Running Complete Transition Debug...\n');

async function debugTransition() {
  const results = {
    auth: null,
    jwt: null,
    profile: null,
    grants: null,
    rls: null,
    buttons: null
  };

  // 1. Check Authentication
  console.log('1️⃣ Checking Authentication...');
  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session) {
      results.auth = {
        status: 'authenticated',
        userId: session.user.id,
        email: session.user.email,
        hasToken: !!session.access_token
      };
      console.log('✅ Authenticated:', results.auth);

      // Decode JWT
      if (session.access_token) {
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          results.jwt = {
            role: payload.role,
            sub: payload.sub,
            exp: new Date(payload.exp * 1000).toISOString(),
            aud: payload.aud
          };
          console.log('✅ JWT Payload:', results.jwt);

          if (payload.role !== 'authenticated') {
            console.error('❌ JWT role is not "authenticated":', payload.role);
          }
        } catch (e) {
          console.error('❌ Failed to decode JWT:', e);
        }
      }
    } else {
      results.auth = { status: 'not authenticated' };
      console.error('❌ Not authenticated - please log in');
      return results;
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    results.auth = { error: error.message };
  }

  // 2. Check User Profile
  console.log('\n2️⃣ Checking User Profile...');
  try {
    const { data: profile, error } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', results.auth.userId)
      .single();

    if (error) {
      console.error('❌ Profile fetch error:', error);
      results.profile = { error: error.message };
    } else if (profile) {
      results.profile = {
        status: 'found',
        hasVehicleInfo: !!profile.vehicle_type,
        hasName: !!profile.full_name,
        data: profile
      };
      console.log('✅ Profile found:', {
        name: profile.full_name,
        vehicle: profile.vehicle_type,
        email: profile.email
      });
    } else {
      results.profile = { status: 'not found' };
      console.error('❌ Profile not found');
    }
  } catch (error) {
    console.error('❌ Profile check failed:', error);
    results.profile = { error: error.message };
  }

  // 3. Test Transition Profile Access
  console.log('\n3️⃣ Testing Transition Profile Access...');
  try {
    const { data, error } = await window.supabase
      .from('transition_profiles')
      .select('*')
      .eq('user_id', results.auth.userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Transition profile access error:', error);
      results.grants = {
        canAccess: false,
        error: error.message,
        code: error.code
      };

      if (error.code === '42501') {
        console.error('⚠️  PERMISSION DENIED - Table grants not applied!');
        console.log('\n📋 Run this SQL in Supabase:\n');
        console.log('GRANT ALL ON transition_profiles TO authenticated;');
        console.log('GRANT ALL ON transition_profiles TO anon;');
      }
    } else {
      results.grants = {
        canAccess: true,
        hasProfile: !!data,
        profile: data
      };
      console.log('✅ Can access transition_profiles table');
      if (data) {
        console.log('✅ Transition profile exists:', data.id);
      } else {
        console.log('ℹ️  No transition profile yet (this is OK)');
      }
    }
  } catch (error) {
    console.error('❌ Transition profile test failed:', error);
    results.grants = { error: error.message };
  }

  // 4. Check Buttons Exist
  console.log('\n4️⃣ Checking Buttons...');
  const startPlanningBtn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes('Start Planning My Transition'));
  const getStartedBtn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent === 'Get Started');

  results.buttons = {
    startPlanning: !!startPlanningBtn,
    getStarted: !!getStartedBtn
  };

  if (startPlanningBtn) {
    console.log('✅ "Start Planning My Transition" button found');
  } else {
    console.log('ℹ️  "Start Planning My Transition" button not visible');
  }

  if (getStartedBtn) {
    console.log('✅ "Get Started" button found');
  } else {
    console.log('ℹ️  "Get Started" button not visible');
  }

  // 5. Summary
  console.log('\n📊 DIAGNOSIS SUMMARY\n');
  console.log('Authentication:', results.auth?.status || 'UNKNOWN');
  console.log('JWT Role:', results.jwt?.role || 'UNKNOWN');
  console.log('User Profile:', results.profile?.status || 'UNKNOWN');
  console.log('Table Access:', results.grants?.canAccess ? 'YES' : 'NO');
  console.log('Buttons:', results.buttons);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS\n');
  if (results.auth?.status !== 'authenticated') {
    console.log('❌ You are not logged in. Please log in first.');
  } else if (results.jwt?.role !== 'authenticated') {
    console.log('❌ JWT role is wrong. Try logging out and back in.');
  } else if (!results.grants?.canAccess) {
    console.log('❌ Table permissions not granted. Run the GRANT SQL in Supabase.');
  } else if (!results.profile?.status === 'found') {
    console.log('⚠️  User profile not found. Check profiles table.');
  } else {
    console.log('✅ Everything looks good! Try clicking the button now.');
  }

  return results;
}

// Run the debug
debugTransition().then(results => {
  console.log('\n✅ Debug complete. Results:', results);
}).catch(error => {
  console.error('❌ Debug script failed:', error);
});
