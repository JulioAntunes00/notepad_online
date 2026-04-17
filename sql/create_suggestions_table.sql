-- Tabela de Sugestões dos Usuários
CREATE TABLE IF NOT EXISTS retronote_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT 'Anônimo',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Qualquer usuário autenticado pode inserir sugestões
ALTER TABLE retronote_suggestions ENABLE ROW LEVEL SECURITY;

-- Permite que qualquer pessoa (inclusive anônimos via anon key) insira sugestões
CREATE POLICY "Qualquer um pode enviar sugestões"
  ON retronote_suggestions
  FOR INSERT
  WITH CHECK (true);

-- Apenas admins podem ler as sugestões (via service_role ou policies futuras no painel admin)
CREATE POLICY "Apenas service_role lê sugestões"
  ON retronote_suggestions
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Função RPC para admins listarem sugestões
CREATE OR REPLACE FUNCTION admin_list_suggestions()
RETURNS TABLE (
  id UUID,
  user_name TEXT,
  subject TEXT,
  body TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se quem chama é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar esta função.';
  END IF;

  RETURN QUERY
  SELECT s.id, s.user_name, s.subject, s.body, s.created_at
  FROM retronote_suggestions s
  ORDER BY s.created_at DESC;
END;
$$;

-- Função RPC para admins deletarem sugestões
CREATE OR REPLACE FUNCTION admin_delete_suggestion(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar esta função.';
  END IF;

  DELETE FROM retronote_suggestions WHERE id = target_id;
END;
$$;
