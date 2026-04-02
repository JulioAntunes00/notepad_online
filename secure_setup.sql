  -- 🚨 ATENÇÃO: Isso vai deletar as tabelas antigas de teste e recriar com a MÁXIMA SEGURANÇA.
  -- Rode isso no SQL Editor do Supabase.

  -- 1. Limpar banco de dados antigo inseguro
  DROP TABLE IF EXISTS retronote_windows;
  DROP TABLE IF EXISTS retronote_trash;
  DROP TABLE IF EXISTS retronote_notes;
  DROP TABLE IF EXISTS retronote_users;

  -- 2. Recriar tabelas atreladas à Autenticação Oficial (auth.users)
  CREATE TABLE retronote_notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE retronote_trash (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    deleted_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE retronote_windows (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    windows_json JSONB DEFAULT '[]'::jsonb
  );

  -- 3. Habilitar o Escudo RLS
  ALTER TABLE retronote_notes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE retronote_trash ENABLE ROW LEVEL SECURITY;
  ALTER TABLE retronote_windows ENABLE ROW LEVEL SECURITY;

  -- 4. Criar as Políticas Inquebráveis
  -- "Você só enxerga a linha se o seu token Criptografado de sessão bater com a coluna user_id"
  CREATE POLICY "Trancar Notas" ON retronote_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Trancar Lixeira" ON retronote_trash FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Trancar Janelas" ON retronote_windows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
