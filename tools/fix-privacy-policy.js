'use strict';
require('dotenv').config();

const SUPA_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPA_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const sqls = [
  // Adiciona coluna se não existir
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_privacy_policy_at timestamptz`,

  // Cria policy de update se não existir
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles' AND policyname = 'users_update_own_profile'
    ) THEN
      CREATE POLICY "users_update_own_profile"
        ON profiles FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
  END $$`,
];

async function run() {
  for (const sql of sqls) {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (!res.ok) {
      // exec_sql pode não existir — tenta via pg direto
      console.warn(`⚠️  exec_sql falhou (${res.status}): ${text.slice(0, 100)}`);
    } else {
      console.log(`✅ OK: ${sql.slice(0, 60)}...`);
    }
  }

  // Verifica se a coluna existe consultando a tabela
  const check = await fetch(
    `${SUPA_URL}/rest/v1/profiles?select=accepted_privacy_policy_at&limit=1`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  if (check.ok) {
    console.log('\n✅ Coluna accepted_privacy_policy_at existe na tabela profiles');
    console.log('✅ Execute o update manual abaixo no Supabase SQL Editor se o RPC não funcionou:\n');
  }

  console.log(`-- Cole isso no Supabase SQL Editor:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_privacy_policy_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'users_update_own_profile'
  ) THEN
    CREATE POLICY "users_update_own_profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;`);
}

run().catch(e => console.error('❌', e.message));
