#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://kycoklimpzkyrecbjecn.supabase.co';
const SUPABASE_ANON_KEY = <SUPABASE_ANON_KEY>

async function runQuery(sql) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ query: sql });
        
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// First, let's check if the table exists and count templates
async function checkTripTemplates() {
    try {
        console.log('1. Checking if trip_templates table exists and counting records...');
        
        // Use REST API to query the table directly
        const options = {
            hostname: 'kycoklimpzkyrecbjecn.supabase.co',
            port: 443,
            path: '/rest/v1/trip_templates?select=*',
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const templates = JSON.parse(data);
                    console.log(`✅ trip_templates table exists`);
                    console.log(`📊 Total templates found: ${templates.length}`);
                    
                    const publicTemplates = templates.filter(t => t.is_public === true);
                    console.log(`🌍 Public templates: ${publicTemplates.length}`);
                    
                    const australianTemplates = templates.filter(t => 
                        t.is_public === true && 
                        t.tags && 
                        Array.isArray(t.tags) && 
                        t.tags.includes('australia')
                    );
                    console.log(`🇦🇺 Australian public templates: ${australianTemplates.length}`);
                    
                    if (australianTemplates.length > 0) {
                        console.log('\nSample Australian templates:');
                        australianTemplates.slice(0, 3).forEach((template, i) => {
                            console.log(`  ${i + 1}. ${template.name} (${template.category})`);
                        });
                    }
                    
                } catch (e) {
                    console.error('❌ Error parsing response:', e.message);
                    console.log('Raw response:', data);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
        });

        req.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkTripTemplates();