require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Connecting to remote Supabase...');
  const { data, error } = await supabase.from('profiles').update({ role: 'admin' }).neq('role', 'admin');
  
  if (error) {
    console.error('Error updating roles:', error);
  } else {
    console.log('Successfully upgraded all existing users to "admin" role.');
  }
}

main();
