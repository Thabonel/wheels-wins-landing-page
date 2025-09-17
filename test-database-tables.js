// Quick database table verification test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_anon_key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTables() {
  console.log('🧪 Testing database tables...');

  const tablesToTest = [
    'user_settings',
    'pam_savings_events',
    'pam_recommendations',
    'monthly_savings_summary',
    'anonymized_transactions',
    'transaction_categories',
    'user_knowledge_documents',
    'user_knowledge_chunks',
    'user_two_factor_auth'
  ];

  for (const table of tablesToTest) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Table accessible`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
}

testTables().catch(console.error);