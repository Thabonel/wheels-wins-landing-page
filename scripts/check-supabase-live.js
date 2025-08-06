// Quick diagnostic script to run in browser console
// Go to https://wheels-wins-staging.netlify.app and paste this in DevTools console:

console.log('%c🔍 CHECKING SUPABASE CONFIG', 'color: #00ff00; font-size: 16px; font-weight: bold');

// Check if environment variables are loaded
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('URL exists:', !!url);
console.log('Key exists:', !!key);

if (url && key) {
    // Extract project ID from URL
    const urlMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    const urlProjectId = urlMatch ? urlMatch[1] : null;
    
    // Decode JWT to get ref
    try {
        const payload = JSON.parse(atob(key.split('.')[1]));
        const jwtRef = payload.ref;
        
        console.log('URL Project ID:', urlProjectId);
        console.log('JWT ref:', jwtRef);
        
        if (urlProjectId === jwtRef) {
            console.log('%c✅ URL and Key MATCH!', 'color: #00ff00');
            console.log('The issue might be:');
            console.log('1. The project is paused in Supabase');
            console.log('2. The anon key has incorrect permissions');
        } else {
            console.log('%c❌ URL and Key DO NOT MATCH!', 'color: #ff0000; font-weight: bold');
            console.log('They are from different Supabase projects!');
            console.log('');
            console.log('%cTO FIX:', 'color: #ffff00; font-weight: bold');
            console.log('1. Go to https://app.supabase.com/projects');
            console.log('2. Click on YOUR project');
            console.log('3. Go to Settings → API');
            console.log('4. Copy BOTH values:');
            console.log('   - Project URL');
            console.log('   - anon public key');
            console.log('5. Update in Netlify staging site environment variables');
        }
    } catch (e) {
        console.error('Could not decode JWT:', e);
    }
} else {
    console.log('%c❌ Missing environment variables!', 'color: #ff0000');
}