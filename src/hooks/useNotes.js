import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function useNotes(loggedUser) {
  const [notes, setNotes] = useState([]);
  const [trash, setTrash] = useState([]);

  // Load initial data based on loggedUser
  useEffect(() => {
    if (!loggedUser) {
      setNotes([]);
      setTrash([]);
      return;
    }
    
    const loadDb = async () => {
      if (loggedUser === 'Anônimo') {
        try {
          const savedN = localStorage.getItem('retronote_notes');
          if (savedN) setNotes(JSON.parse(savedN));
          const savedT = localStorage.getItem('retronote_trash');
          if (savedT) setTrash(JSON.parse(savedT));
        } catch {}
      } else {
        const { data: nData } = await supabase.from('retronote_notes').select('*').eq('username', loggedUser);
        if (nData) setNotes(nData);
        
        const { data: tData } = await supabase.from('retronote_trash').select('*').eq('username', loggedUser);
        if (tData) {
          const now = Date.now();
          const toKeep = [];
          const toDelete = [];
          
          tData.forEach(item => {
            const delTime = new Date(item.deleted_at || item.deletedAt).getTime();
            if (now - delTime > THREE_DAYS_MS) {
              toDelete.push(item.id);
            } else {
              toKeep.push(item);
            }
          });
          
          if (toDelete.length > 0) {
            supabase.from('retronote_trash').delete().in('id', toDelete).then();
          }
          setTrash(toKeep);
        }
      }
    };
    loadDb();
  }, [loggedUser]);

  // Sync to localStorage only for Anonymous
  useEffect(() => {
    if (loggedUser === 'Anônimo') {
      localStorage.setItem('retronote_notes', JSON.stringify(notes));
      localStorage.setItem('retronote_trash', JSON.stringify(trash));
    }
  }, [notes, trash, loggedUser]);

  const addNote = useCallback((title) => {
    const id = `note-${Date.now()}`;
    const newNote = { id, title, content: '', username: loggedUser !== 'Anônimo' ? loggedUser : undefined };
    setNotes(prev => [...prev, newNote]);
    
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').insert([{ id, username: loggedUser, title, content: '' }]).then();
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
    setTrash(prevTrash => {
      if (prevTrash.some(t => t.id === id)) return prevTrash;
      return [...prevTrash, { ...noteToDelete, deleted_at: delAt }];
    });
    setNotes(prevNotes => prevNotes.filter(n => n.id !== id));

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').delete().eq('id', id).then(() => {
        supabase.from('retronote_trash').insert([{ 
          id: noteToDelete.id, 
          username: loggedUser, 
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
    
    setNotes(prevNotes => {
      if (prevNotes.some(n => n.id === id)) return prevNotes;
      const { deleted_at, deletedAt, ...note } = itemToRestore;
      return [...prevNotes, note];
    });
    setTrash(prevTrash => prevTrash.filter(n => n.id !== id));

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_trash').delete().eq('id', id).then(() => {
         // Create it back in notes
         supabase.from('retronote_notes').insert([{ 
           id: itemToRestore.id, 
           username: loggedUser, 
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
      supabase.from('retronote_trash').delete().eq('username', loggedUser).then();
    }
  }, [loggedUser]);

  return { notes, trash, addNote, updateNoteContent, updateNoteTitle, deleteNote, restoreNote, permanentDelete, emptyTrash };
}
