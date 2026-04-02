import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function useNotes(loggedUser) {
  const [notes, setNotes] = useState([]);
  const [trash, setTrash] = useState([]);
  // Esta referência guarda para QUEM estamos exibindo notas no momento
  const loadedForRef = useRef(null);

  useEffect(() => {
    // 1. Limpa tudo imediatamente ao trocar de usuário
    setNotes([]);
    setTrash([]);
    loadedForRef.current = null;

    if (!loggedUser) return;

    let isMounted = true;
    const currentUser = loggedUser === 'Anônimo' ? 'Anônimo' : (loggedUser.id || null);

    const loadDb = async () => {
      if (currentUser === 'Anônimo') {
        try {
          const savedN = localStorage.getItem('retronote_notes');
          const savedT = localStorage.getItem('retronote_trash');
          if (isMounted) {
            setNotes(savedN ? JSON.parse(savedN) : []);
            setTrash(savedT ? JSON.parse(savedT) : []);
            loadedForRef.current = 'Anônimo';
          }
        } catch { }
      } else if (currentUser) {
        const { data: nData, error: nErr } = await supabase.from('retronote_notes').select('*').eq('user_id', currentUser);
        const { data: tData, error: tErr } = await supabase.from('retronote_trash').select('*').eq('user_id', currentUser);
        if (nErr) console.error('[RetroNote] Erro ao carregar notas:', nErr.message);
        if (tErr) console.error('[RetroNote] Erro ao carregar lixeira:', tErr.message);

        if (isMounted) {
          if (nData) setNotes(nData);
          if (tData) {
            const now = Date.now();
            const toKeep = tData.filter(item => (now - new Date(item.deleted_at).getTime()) <= THREE_DAYS_MS);
            setTrash(toKeep);
          }
          loadedForRef.current = currentUser;
        }
      }
    };

    loadDb();
    return () => { isMounted = false; };
  }, [loggedUser]);

  // SINCRO: Salva no localStorage APENAS se tivermos CERTEZA que os dados são do Anônimo
  useEffect(() => {
    if (loggedUser === 'Anônimo' && loadedForRef.current === 'Anônimo') {
      localStorage.setItem('retronote_notes', JSON.stringify(notes));
      localStorage.setItem('retronote_trash', JSON.stringify(trash));
    }
  }, [notes, trash, loggedUser]);

  const addNote = useCallback((title) => {
    let finalTitle = title;
    if (!finalTitle || finalTitle.trim() === '') {
      const baseName = 'Novo bloco de notas';
      let counter = 1;
      finalTitle = baseName;

      while (notes.some(n => n.title === finalTitle)) {
        counter++;
        finalTitle = `${baseName} ${counter}`;
      }
    }

    const id = crypto.randomUUID();
    const newNote = { id, title: finalTitle, content: '' };
    setNotes(prev => [...prev, newNote]);

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').insert([{ id, user_id: loggedUser.id, title: finalTitle, content: '' }])
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao criar nota:', error.message); });
    }
    return newNote;
  }, [loggedUser, notes]);

  const updateNoteContent = useCallback((id, content) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').update({ content, updated_at: new Date().toISOString() }).eq('id', id)
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao salvar conteúdo:', error.message); });
    }
  }, [loggedUser]);

  const updateNoteTitle = useCallback((id, title) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').update({ title, updated_at: new Date().toISOString() }).eq('id', id)
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao renomear nota:', error.message); });
    }
  }, [loggedUser]);

  const shareNote = useCallback(async (id) => {
    // Funcionalidade desativada.
    return null;
  }, [loggedUser]);

  const deleteNote = useCallback((id) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    const delAt = new Date().toISOString();
    setTrash(prevTrash => [...prevTrash, { ...noteToDelete, deleted_at: delAt }]);
    setNotes(prevNotes => prevNotes.filter(n => n.id !== id));

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').delete().eq('id', id)
        .then(({ error }) => {
          if (error) return console.error('[RetroNote] Erro ao deletar nota:', error.message);
          supabase.from('retronote_trash').insert([{
            id: noteToDelete.id,
            user_id: loggedUser.id,
            title: noteToDelete.title,
            content: noteToDelete.content,
            deleted_at: delAt
          }]).then(({ error: trashErr }) => {
            if (trashErr) console.error('[RetroNote] Erro ao mover para lixeira:', trashErr.message);
          });
        });
    }
  }, [notes, loggedUser]);

  const restoreNote = useCallback((id) => {
    const itemToRestore = trash.find(n => n.id === id);
    if (!itemToRestore) return;

    setNotes(prevNotes => [...prevNotes, { id: itemToRestore.id, title: itemToRestore.title, content: itemToRestore.content }]);
    setTrash(prevTrash => prevTrash.filter(n => n.id !== id));

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_trash').delete().eq('id', id)
        .then(({ error }) => {
          if (error) return console.error('[RetroNote] Erro ao remover da lixeira:', error.message);
          supabase.from('retronote_notes').insert([{
            id: itemToRestore.id,
            user_id: loggedUser.id,
            title: itemToRestore.title,
            content: itemToRestore.content
          }]).then(({ error: restoreErr }) => {
            if (restoreErr) console.error('[RetroNote] Erro ao restaurar nota:', restoreErr.message);
          });
        });
    }
  }, [trash, loggedUser]);

  const permanentDelete = useCallback((id) => {
    setTrash(prev => prev.filter(n => n.id !== id));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_trash').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao excluir permanente:', error.message); });
    }
  }, [loggedUser]);

  const emptyTrash = useCallback(() => {
    setTrash([]);
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_trash').delete().eq('user_id', loggedUser.id)
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao esvaziar lixeira:', error.message); });
    }
  }, [loggedUser]);

  const duplicateNote = useCallback(async (oldNote) => {
    const id = crypto.randomUUID();
    const newTitle = `${oldNote.title} - Cópia`;
    const newNote = {
      id,
      user_id: loggedUser === 'Anônimo' ? null : loggedUser.id,
      title: newTitle,
      content: oldNote.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setNotes(prev => [...prev, newNote]);
    if (loggedUser && loggedUser !== 'Anônimo') {
      const { error } = await supabase.from('retronote_notes').insert([{
        id,
        user_id: loggedUser.id,
        title: newTitle,
        content: oldNote.content
      }]);
      if (error) console.error('[RetroNote] Erro ao duplicar nota:', error.message);
    }
    return newNote;
  }, [loggedUser]);

  const migrateToCloud = useCallback(async (newUser) => {
    try {
      const localNotesStr = localStorage.getItem('retronote_notes');
      if (localNotesStr) {
        const localN = JSON.parse(localNotesStr);
        if (localN.length > 0) {
          const insertPayload = localN.map(note => ({
            id: note.id,
            user_id: newUser.id,
            title: note.title,
            content: note.content
          }));
          await supabase.from('retronote_notes').upsert(insertPayload);
          localStorage.removeItem('retronote_notes');
          // Força também remover a flag de 'seen_welcome' para não aborrecer mais tarde
          localStorage.removeItem('retronote_seen_welcome');
        }
      }
    } catch (err) {
      console.error('Falha na migração:', err);
    }
  }, []);

  return { notes, trash, addNote, updateNoteContent, updateNoteTitle, shareNote, deleteNote, restoreNote, permanentDelete, emptyTrash, migrateToCloud, duplicateNote };
}
