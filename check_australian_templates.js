#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://kycoklimpzkyrecbjecn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA';

async function getAustralianTemplates() {
    return new Promise((resolve, reject) => {
        console.log('🇦🇺 Fetching all Australian trip templates...\n');
        
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=*&is_public=eq.true',
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
                if (res.statusCode === 200) {
                    try {
                        const templates = JSON.parse(data);
                        
                        // Filter for Australian templates (check tags array)
                        const australianTemplates = templates.filter(template => 
                            template.tags && 
                            Array.isArray(template.tags) && 
                            template.tags.includes('australia')
                        );
                        
                        console.log(`📊 Total public templates: ${templates.length}`);
                        console.log(`🇦🇺 Australian templates: ${australianTemplates.length}\n`);
                        
                        console.log('📋 DETAILED AUSTRALIAN TEMPLATES:\n');
                        
                        australianTemplates.forEach((template, index) => {
                            console.log(`${index + 1}. "${template.name}"`);
                            console.log(`   📁 Category: ${template.category}`);
                            console.log(`   🏷️  Tags: ${template.tags.join(', ')}`);
                            console.log(`   📖 Description: ${template.description ? template.description.substring(0, 100) + '...' : 'No description'}`);
                            console.log(`   ⏱️  Duration: ${template.estimated_duration_days} days`);
                            console.log(`   👤 Created by: ${template.user_id || 'System'}`);
                            console.log(`   📈 Usage count: ${template.usage_count || 0}`);
                            console.log(`   📅 Created: ${new Date(template.created_at).toLocaleDateString()}`);
                            console.log('');
                        });
                        
                        // Group by category
                        const byCategory = australianTemplates.reduce((acc, template) => {
                            const category = template.category || 'uncategorized';
                            if (!acc[category]) acc[category] = [];
                            acc[category].push(template.name);
                            return acc;
                        }, {});
                        
                        console.log('📊 TEMPLATES BY CATEGORY:\n');
                        Object.entries(byCategory).forEach(([category, templates]) => {
                            console.log(`${category.toUpperCase()}:`);
                            templates.forEach(name => console.log(`  • ${name}`));
                            console.log('');
                        });
                        
                        resolve(australianTemplates);
                    } catch (e) {
                        console.error('❌ Error parsing response:', e.message);
                        console.log('Raw response:', data);
                        reject(e);
                    }
                } else {
                    console.error(`❌ Request failed with status ${res.statusCode}`);
                    console.log('Error response:', data);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
}

// Expected Australian templates that should exist
const expectedTemplates = [
    'Great Ocean Road Classic',
    'The Big Lap - Around Australia',
    'Red Centre Explorer',
    'East Coast Adventure',
    'Tasmania Complete Circuit',
    'Western Australia Wildflower Route',
    'Tropical North Queensland',
    'Adelaide Hills & Barossa Valley',
    'Blue Mountains & Hunter Valley',
    'Outback Queensland Explorer'
];

async function main() {
    try {
        const australianTemplates = await getAustralianTemplates();
        
        console.log('\n🔍 VERIFICATION AGAINST EXPECTED TEMPLATES:\n');
        
        const foundNames = australianTemplates.map(t => t.name);
        
        expectedTemplates.forEach(expectedName => {
            const found = foundNames.includes(expectedName);
            console.log(`${found ? '✅' : '❌'} ${expectedName}`);
        });
        
        const missingTemplates = expectedTemplates.filter(name => !foundNames.includes(name));
        const extraTemplates = foundNames.filter(name => !expectedTemplates.includes(name));
        
        console.log('\n📊 SUMMARY:');
        console.log(`✅ Found templates: ${foundNames.length}`);
        console.log(`❌ Missing templates: ${missingTemplates.length}`);
        console.log(`➕ Extra templates: ${extraTemplates.length}`);
        
        if (missingTemplates.length > 0) {
            console.log('\n❌ MISSING TEMPLATES:');
            missingTemplates.forEach(name => console.log(`  • ${name}`));
        }
        
        if (extraTemplates.length > 0) {
            console.log('\n➕ EXTRA TEMPLATES (not in expected list):');
            extraTemplates.forEach(name => console.log(`  • ${name}`));
        }
        
        if (missingTemplates.length === 0) {
            console.log('\n🎉 All expected Australian templates are present!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();