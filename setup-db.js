const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupProfiles() {
  try {
    console.log('Creating profiles table...');

    const sql = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

      CREATE POLICY "Users can read own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id);

      CREATE POLICY "Users can insert own profile" ON profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
    `;

    const { data, error } = await supabase.rpc('query', { query: sql });

    if (error) {
      console.error('Error creating table:', error);
      return false;
    }

    console.log('✅ Profiles table created successfully');
    return true;
  } catch (err) {
    console.error('Setup failed:', err);
    return false;
  }
}

setupProfiles().then(success => {
  process.exit(success ? 0 : 1);
});
