-- ============================================================
-- 🛡️ ADMIN PANEL SETUP - RetroNote XP
-- ============================================================
-- Rode este script no SQL Editor do Supabase.
-- Ele cria a infraestrutura necessária para o Painel de Controle Admin.
-- ============================================================

-- 0. Garantir extensão pgcrypto (para crypt de senha)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. TABELA DE PERFIS
-- ============================================================
CREATE TABLE IF NOT EXISTS retronote_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE retronote_profiles ENABLE ROW LEVEL SECURITY;

-- Usuário lê o próprio perfil
CREATE POLICY "profile_select_own" ON retronote_profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin lê todos os perfis
CREATE POLICY "profile_select_admin" ON retronote_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM retronote_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- 2. TRIGGER: Auto-criar perfil ao cadastrar
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO retronote_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email::TEXT, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. POPULAR PERFIS PARA USUÁRIOS JÁ EXISTENTES
-- ============================================================
INSERT INTO retronote_profiles (id, display_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email::TEXT, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM retronote_profiles p WHERE p.id = u.id);

-- ============================================================
-- 4. FUNÇÕES RPC (SECURITY DEFINER)
-- ============================================================

-- 4.1 Verificar se o chamador é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM retronote_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.2 Listar todos os usuários (admin only)
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  notes_count BIGINT,
  folders_count BIGINT
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: você não é administrador.';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    COALESCE(p.display_name, split_part(u.email::TEXT, '@', 1))::TEXT,
    u.created_at,
    u.last_sign_in_at,
    (SELECT COUNT(*) FROM retronote_notes n WHERE n.user_id = u.id),
    (SELECT COUNT(*) FROM retronote_folders f WHERE f.user_id = u.id)
  FROM auth.users u
  LEFT JOIN retronote_profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Buscar notas de um usuário (admin only)
CREATE OR REPLACE FUNCTION admin_get_user_notes(target_uid UUID)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  content TEXT,
  folder_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: você não é administrador.';
  END IF;

  RETURN QUERY
  SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at
  FROM retronote_notes n
  WHERE n.user_id = target_uid
  ORDER BY n.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Buscar pastas de um usuário (admin only)
CREATE OR REPLACE FUNCTION admin_get_user_folders(target_uid UUID)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  parent_id TEXT
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: você não é administrador.';
  END IF;

  RETURN QUERY
  SELECT f.id, f.name, f.parent_id
  FROM retronote_folders f
  WHERE f.user_id = target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.5 Alterar senha de um usuário (admin only)
CREATE OR REPLACE FUNCTION admin_update_password(target_uid UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: você não é administrador.';
  END IF;

  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'Use o painel de perfil para alterar sua própria senha.';
  END IF;

  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter pelo menos 6 caracteres.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.6 Excluir conta de um usuário (admin only)
-- CASCADE em auth.users vai apagar notas, pastas, lixeira e janelas automaticamente.
CREATE OR REPLACE FUNCTION admin_delete_user(target_uid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: você não é administrador.';
  END IF;

  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta pelo painel admin.';
  END IF;

  DELETE FROM auth.users WHERE id = target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. DEFINIR ADMINISTRADOR
-- ============================================================
-- ⚠️ RODE ESTE COMANDO SEPARADAMENTE após confirmar seu UUID:
--
-- Por email:
-- UPDATE retronote_profiles SET is_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'SEU_EMAIL_AQUI');
--
-- Ou por UUID direto:
-- UPDATE retronote_profiles SET is_admin = true WHERE id = 'SEU-UUID-AQUI';
-- ============================================================
