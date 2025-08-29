#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://kycoklimpzkyrecbjecn.supabase.co';
const SUPABASE_ANON_KEY = <SUPABASE_ANON_KEY>

async function testAnonymousAccess() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Testing anonymous access to public templates...');
        
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=id,name,category,is_public&is_public=eq.true',
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                // Don't include Authorization header to test anonymous access
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📡 Response status: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    try {
                        const templates = JSON.parse(data);
                        console.log(`✅ Anonymous access works! Found ${templates.length} public templates`);
                        console.log('📋 Sample templates:');
                        templates.slice(0, 3).forEach((template, i) => {
                            console.log(`  ${i + 1}. ${template.name} (${template.category})`);
                        });
                        resolve(true);
                    } catch (e) {
                        console.error('❌ Error parsing response:', e.message);
                        console.log('Raw response:', data);
                        resolve(false);
                    }
                } else {
                    console.error(`❌ Anonymous access failed with status ${res.statusCode}`);
                    console.log('Error response:', data);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            resolve(false);
        });

        req.end();
    });
}

async function testAuthenticatedAccess() {
    return new Promise((resolve, reject) => {
        console.log('\n🔐 Testing authenticated access to public templates...');
        
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=id,name,category,is_public&is_public=eq.true',
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📡 Response status: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    try {
                        const templates = JSON.parse(data);
                        console.log(`✅ Authenticated access works! Found ${templates.length} public templates`);
                        resolve(true);
                    } catch (e) {
                        console.error('❌ Error parsing response:', e.message);
                        console.log('Raw response:', data);
                        resolve(false);
                    }
                } else {
                    console.error(`❌ Authenticated access failed with status ${res.statusCode}`);
                    console.log('Error response:', data);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            resolve(false);
        });

        req.end();
    });
}

async function checkTablePermissions() {
    return new Promise((resolve, reject) => {
        console.log('\n🔍 Checking table information and permissions...');
        
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=*&limit=1',
            method: 'HEAD',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
            }
        };

        const req = https.request(options, (res) => {
            console.log(`📡 HEAD request status: ${res.statusCode}`);
            console.log(`📊 Response headers:`, res.headers);
            
            if (res.statusCode === 200) {
                console.log('✅ Table is accessible');
                resolve(true);
            } else {
                console.log('❌ Table access issues detected');
                resolve(false);
            }
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            resolve(false);
        });

        req.end();
    });
}

// Main execution
async function main() {
    console.log('🚀 Starting RLS Policy Testing for trip_templates\n');
    
    try {
        await checkTablePermissions();
        
        const anonymousWorking = await testAnonymousAccess();
        const authenticatedWorking = await testAuthenticatedAccess();
        
        console.log('\n📊 SUMMARY:');
        console.log(`Anonymous access: ${anonymousWorking ? '✅ Working' : '❌ Failed'}`);
        console.log(`Authenticated access: ${authenticatedWorking ? '✅ Working' : '❌ Failed'}`);
        
        if (anonymousWorking && authenticatedWorking) {
            console.log('\n🎉 RLS policies are working correctly! Both anonymous and authenticated users can access public templates.');
        } else if (!anonymousWorking && authenticatedWorking) {
            console.log('\n⚠️  RLS policies need fixing - anonymous users cannot access public templates.');
            console.log('This means the "anyone_can_view_public_templates" policy may not be working properly.');
        } else if (!anonymousWorking && !authenticatedWorking) {
            console.log('\n❌ Major issues detected - neither anonymous nor authenticated users can access public templates.');
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
    }
}

main();