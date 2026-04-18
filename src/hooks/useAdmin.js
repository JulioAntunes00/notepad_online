import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook para operações administrativas do RetroNote XP.
 * Gerencia: verificação de admin, listagem de usuários,
 * visualização de dados, alteração de senha e exclusão de conta.
 */
export default function useAdmin(loggedUser) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userNotes, setUserNotes] = useState([]);
  const [userFolders, setUserFolders] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-check admin status quando o usuário muda
  useEffect(() => {
    if (!loggedUser || loggedUser === 'Anônimo') {
      setIsAdmin(false);
      setUsers([]);
      setSelectedUser(null);
      setUserNotes([]);
      setUserFolders([]);
      setSuggestions([]);
      return;
    }

    let mounted = true;
    supabase.rpc('is_admin')
      .then(({ data, error }) => {
        if (mounted) {
          if (error) {
            // RPC não existe ainda = DB não foi configurado
            console.warn('[Admin] is_admin RPC não disponível:', error.message);
            setIsAdmin(false);
          } else {
            setIsAdmin(!!data);
          }
        }
      });

    return () => { mounted = false; };
  }, [loggedUser]);

  // Listar todos os usuários
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_list_users');
      if (rpcErr) throw rpcErr;
      setUsers(data || []);
    } catch (err) {
      setError('Erro ao carregar usuários: ' + err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listar todas as sugestões
  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_list_suggestions');
      if (rpcErr) throw rpcErr;
      setSuggestions(data || []);
    } catch (err) {
      setError('Erro ao carregar sugestões: ' + err.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar arquivos de um usuário específico
  const fetchUserData = useCallback(async (userId) => {
    setLoading(true);
    setError('');
    try {
      const [notesRes, foldersRes] = await Promise.all([
        supabase.rpc('admin_get_user_notes', { target_uid: userId }),
        supabase.rpc('admin_get_user_folders', { target_uid: userId }),
      ]);
      if (notesRes.error) throw notesRes.error;
      if (foldersRes.error) throw foldersRes.error;

      setUserNotes(notesRes.data || []);
      setUserFolders(foldersRes.data || []);
    } catch (err) {
      setError('Erro ao carregar dados do usuário: ' + err.message);
      setUserNotes([]);
      setUserFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Selecionar usuário e carregar seus dados
  const selectUser = useCallback(async (user) => {
    setSelectedUser(user);
    setUserNotes([]);
    setUserFolders([]);
    if (user) {
      await fetchUserData(user.id);
    }
  }, [fetchUserData]);

  // Alterar senha de um usuário
  const changeUserPassword = useCallback(async (userId, newPassword) => {
    try {
      const { error: rpcErr } = await supabase.rpc('admin_update_password', {
        target_uid: userId,
        new_password: newPassword,
      });
      if (rpcErr) throw rpcErr;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Excluir conta de um usuário
  const deleteUser = useCallback(async (userId) => {
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_user', {
        target_uid: userId,
      });
      if (rpcErr) throw rpcErr;

      // Atualiza lista local
      setUsers(prev => prev.filter(u => u.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setUserNotes([]);
        setUserFolders([]);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [selectedUser]);

  // Excluir sugestão
  const deleteSuggestion = useCallback(async (suggestionId) => {
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_suggestion', {
        target_id: suggestionId,
      });
      if (rpcErr) throw rpcErr;

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  return {
    isAdmin,
    users,
    selectedUser,
    userNotes,
    userFolders,
    suggestions,
    loading,
    error,
    fetchUsers,
    fetchSuggestions,
    selectUser,
    changeUserPassword,
    deleteUser,
    deleteSuggestion,
  };
}
