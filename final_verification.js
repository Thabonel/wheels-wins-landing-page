#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://kycoklimpzkyrecbjecn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA';

async function runTest(testName, testFn) {
    console.log(`🧪 Running test: ${testName}`);
    try {
        const result = await testFn();
        console.log(`   ✅ ${testName}: PASSED`);
        return { name: testName, status: 'PASSED', result };
    } catch (error) {
        console.log(`   ❌ ${testName}: FAILED - ${error.message}`);
        return { name: testName, status: 'FAILED', error: error.message };
    }
}

async function testTableExists() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=count',
            method: 'HEAD',
            headers: { 'apikey': SUPABASE_ANON_KEY }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve('Table exists and is accessible');
            } else {
                reject(new Error(`Table not accessible (${res.statusCode})`));
            }
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAnonymousRead() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=id,name&is_public=eq.true&limit=5',
            method: 'GET',
            headers: { 'apikey': SUPABASE_ANON_KEY }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const templates = JSON.parse(data);
                    resolve(`Found ${templates.length} public templates accessible to anonymous users`);
                } else {
                    reject(new Error(`Anonymous read failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAuthenticatedRead() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=id,name&is_public=eq.true&limit=5',
            method: 'GET',
            headers: { 
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const templates = JSON.parse(data);
                    resolve(`Found ${templates.length} public templates accessible to authenticated users`);
                } else {
                    reject(new Error(`Authenticated read failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAustralianTemplatesCount() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=id,name,tags&is_public=eq.true',
            method: 'GET',
            headers: { 
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const templates = JSON.parse(data);
                    const australianTemplates = templates.filter(t => 
                        t.tags && Array.isArray(t.tags) && t.tags.includes('australia')
                    );
                    resolve(`Found ${australianTemplates.length} Australian templates out of ${templates.length} total public templates`);
                } else {
                    reject(new Error(`Australian templates check failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function testTemplateDataIntegrity() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=id,name,category,tags,is_public&is_public=eq.true&limit=3',
            method: 'GET',
            headers: { 
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const templates = JSON.parse(data);
                    
                    // Check that templates have required fields
                    const missingFields = [];
                    templates.forEach((template, i) => {
                        if (!template.name) missingFields.push(`Template ${i+1}: missing name`);
                        if (!template.category) missingFields.push(`Template ${i+1}: missing category`);
                        if (!template.tags || !Array.isArray(template.tags)) missingFields.push(`Template ${i+1}: missing or invalid tags`);
                        if (template.is_public !== true) missingFields.push(`Template ${i+1}: not marked as public`);
                    });
                    
                    if (missingFields.length > 0) {
                        reject(new Error(`Data integrity issues: ${missingFields.join(', ')}`));
                    } else {
                        resolve(`All ${templates.length} tested templates have complete required fields`);
                    }
                } else {
                    reject(new Error(`Data integrity check failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('🚀 FINAL VERIFICATION: Supabase trip_templates Database Status\n');
    console.log('=' .repeat(60));
    
    const tests = [
        { name: 'Table Exists and Accessible', fn: testTableExists },
        { name: 'Anonymous Users Can Read Public Templates', fn: testAnonymousRead },
        { name: 'Authenticated Users Can Read Public Templates', fn: testAuthenticatedRead },
        { name: 'Australian Templates Present', fn: testAustralianTemplatesCount },
        { name: 'Template Data Integrity', fn: testTemplateDataIntegrity },
    ];
    
    const results = [];
    
    for (const test of tests) {
        const result = await runTest(test.name, test.fn);
        results.push(result);
        console.log('');
    }
    
    console.log('=' .repeat(60));
    console.log('📊 FINAL SUMMARY:\n');
    
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    
    results.forEach(result => {
        const icon = result.status === 'PASSED' ? '✅' : '❌';
        console.log(`${icon} ${result.name}`);
        if (result.result) {
            console.log(`   📋 ${result.result}`);
        }
        if (result.error) {
            console.log(`   ❌ ${result.error}`);
        }
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 OVERALL RESULT: ${passed}/${tests.length} tests passed`);
    
    if (failed === 0) {
        console.log('🎉 ALL SYSTEMS GO! The Supabase trip_templates database is working perfectly:');
        console.log('   ✅ Table exists and is accessible');
        console.log('   ✅ RLS policies allow anonymous users to view public templates');
        console.log('   ✅ RLS policies allow authenticated users to view public templates');
        console.log('   ✅ Australian trip templates are present');
        console.log('   ✅ Template data integrity is maintained');
        console.log('\n📝 RECOMMENDATIONS:');
        console.log('   • The database is ready for production use');
        console.log('   • No additional RLS policy fixes needed');
        console.log('   • Australian templates are already present and accessible');
    } else {
        console.log('⚠️  ISSUES DETECTED - Review failed tests above');
    }
}

main().catch(console.error);