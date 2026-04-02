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
        } catch {}
      } else if (currentUser) {
        const { data: nData } = await supabase.from('retronote_notes').select('*').eq('user_id', currentUser);
        const { data: tData } = await supabase.from('retronote_trash').select('*').eq('user_id', currentUser);
        
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
    const id = `note-${Date.now()}`;
    const newNote = { id, title, content: '' };
    setNotes(prev => [...prev, newNote]);

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').insert([{ id, user_id: loggedUser.id, title, content: '' }]).then();
    }
    return newNote;
  }, [loggedUser]);

  const updateNoteContent = useCallback((id, content) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').update({ content, updated_at: new Date().toISOString() }).eq('id', id).then();
    }
  }, [loggedUser]);

  const updateNoteTitle = useCallback((id, title) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').update({ title, updated_at: new Date().toISOString() }).eq('id', id).then();
    }
  }, [loggedUser]);

  const deleteNote = useCallback((id) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    const delAt = new Date().toISOString();
    setTrash(prevTrash => [...prevTrash, { ...noteToDelete, deleted_at: delAt }]);
    setNotes(prevNotes => prevNotes.filter(n => n.id !== id));

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').delete().eq('id', id).then(() => {
        supabase.from('retronote_trash').insert([{
          id: noteToDelete.id,
          user_id: loggedUser.id,
          title: noteToDelete.title,
          content: noteToDelete.content,
          deleted_at: delAt
        }]).then();
      });
    }
  }, [notes, loggedUser]);

  const restoreNote = useCallback((id) => {
    const itemToRestore = trash.find(n => n.id === id);
    if (!itemToRestore) return;

    setNotes(prevNotes => [...prevNotes, { id: itemToRestore.id, title: itemToRestore.title, content: itemToRestore.content }]);
    setTrash(prevTrash => prevTrash.filter(n => n.id !== id));

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_trash').delete().eq('id', id).then(() => {
         supabase.from('retronote_notes').insert([{
           id: itemToRestore.id,
           user_id: loggedUser.id,
           title: itemToRestore.title,
           content: itemToRestore.content
         }]).then();
      });
    }
  }, [trash, loggedUser]);

  const permanentDelete = useCallback((id) => {
    setTrash(prev => prev.filter(n => n.id !== id));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_trash').delete().eq('id', id).then();
    }
  }, [loggedUser]);

  const emptyTrash = useCallback(() => {
    setTrash([]);
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_trash').delete().eq('user_id', loggedUser.id).then();
    }
  }, [loggedUser]);

  const duplicateNote = useCallback(async (oldNote) => {
    const id = Math.random().toString(36).substr(2, 9);
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
      await supabase.from('retronote_notes').insert([{
        id,
        user_id: loggedUser.id,
        title: newTitle,
        content: oldNote.content
      }]);
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

  return { notes, trash, addNote, updateNoteContent, updateNoteTitle, deleteNote, restoreNote, permanentDelete, emptyTrash, migrateToCloud, duplicateNote };
}
