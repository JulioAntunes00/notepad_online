import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function useFileSystem(loggedUser) {
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [trash, setTrash] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadedForRef = useRef(null);

  useEffect(() => {
    // 1. Limpa tudo imediatamente ao trocar de usuário
    setNotes([]);
    setFolders([]);
    setTrash([]);
    setIsLoaded(false);
    loadedForRef.current = null;

    if (!loggedUser) return;

    let isMounted = true;
    const currentUser = loggedUser === 'Anônimo' ? 'Anônimo' : (loggedUser.id || null);

    const loadDb = async () => {
      if (currentUser === 'Anônimo') {
        try {
          const savedN = localStorage.getItem('retronote_notes');
          const savedF = localStorage.getItem('retronote_folders');
          const savedT = localStorage.getItem('retronote_trash');
          if (isMounted) {
            setNotes(savedN ? JSON.parse(savedN) : []);
            setFolders(savedF ? JSON.parse(savedF) : []);
            setTrash(savedT ? JSON.parse(savedT) : []);
            setIsLoaded(true);
            loadedForRef.current = 'Anônimo';
          }
        } catch { }
      } else if (currentUser) {
        const { data: nData, error: nErr } = await supabase.from('retronote_notes').select('*').eq('user_id', currentUser);
        const { data: fData, error: fErr } = await supabase.from('retronote_folders').select('*').eq('user_id', currentUser);
        const { data: tData, error: tErr } = await supabase.from('retronote_trash').select('*').eq('user_id', currentUser);
        if (nErr) console.error('[RetroNote] Erro ao carregar notas:', nErr.message);
        if (fErr) console.error('[RetroNote] Erro ao carregar pastas:', fErr.message);
        if (tErr) console.error('[RetroNote] Erro ao carregar lixeira:', tErr.message);

        if (isMounted) {
            setNotes(nData);
            if (fData) setFolders(fData);
            if (tData) {
              const now = Date.now();
              const toKeep = tData.filter(item => {
                if (!item.deleted_at) return true; // Se não tem data, mantém por segurança
                const deleteTime = new Date(item.deleted_at).getTime();
                if (isNaN(deleteTime)) return true; // Se data for inválida, mantém
                return (now - deleteTime) <= THREE_DAYS_MS;
              });
              setTrash(toKeep);
            }
            setIsLoaded(true);
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
      localStorage.setItem('retronote_folders', JSON.stringify(folders));
      localStorage.setItem('retronote_trash', JSON.stringify(trash));
    }
  }, [notes, folders, trash, loggedUser]);

  const addNote = useCallback((title, parentId = null) => {
    let finalTitle = title;
    if (!finalTitle || finalTitle.trim() === '') {
      const baseName = 'Novo bloco de notas';
      let counter = 1;
      finalTitle = baseName;

      while (notes.some(n => n.title === finalTitle && n.folder_id === parentId)) {
        counter++;
        finalTitle = `${baseName} ${counter}`;
      }
    }

    // Validação: limitar tamanho do título
    finalTitle = finalTitle.substring(0, 100);

    const id = crypto.randomUUID();
    const newNote = { id, title: finalTitle, content: '', folder_id: parentId };
    setNotes(prev => [...prev, newNote]);

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').insert([{ id, user_id: loggedUser.id, title: finalTitle, content: '', folder_id: parentId }])
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao criar nota:', error.message); });
    }
    return newNote;
  }, [loggedUser, notes]);

  const addFolder = useCallback((name, parentId = null) => {
    let finalTitle = name;
    if (!finalTitle || finalTitle.trim() === '') {
      const baseName = 'Nova Pasta';
      let counter = 1;
      finalTitle = baseName;

      while (folders.some(f => f.name === finalTitle && f.parent_id === parentId)) {
        counter++;
        finalTitle = `${baseName} ${counter}`;
      }
    }

    // Validação: limitar tamanho do nome
    finalTitle = finalTitle.substring(0, 100);

    const id = crypto.randomUUID();
    const newFolder = { id, name: finalTitle, parent_id: parentId };
    setFolders(prev => [...prev, newFolder]);

    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_folders').insert([{ id, user_id: loggedUser.id, name: finalTitle, parent_id: parentId }])
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao criar pasta:', error.message); });
    }
    return newFolder;
  }, [loggedUser, folders]);

  const updateFolderTitle = useCallback((id, name) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_folders').update({ name }).eq('id', id)
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao renomear pasta:', error.message); });
    }
  }, [loggedUser]);

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
    setTrash(prevTrash => [...prevTrash, { ...noteToDelete, item_type: 'note', folder_id: noteToDelete.folder_id, deleted_at: delAt }]);
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
            item_type: 'note',
            folder_id: noteToDelete.folder_id,
            deleted_at: delAt
          }]).then(({ error: trashErr }) => {
            if (trashErr) console.error('[RetroNote] Erro ao mover nota para lixeira:', trashErr.message);
          });
        });
    }
  }, [notes, loggedUser]);

  const deleteFolder = useCallback(async (id) => {
    const folderToDelete = folders.find(f => f.id === id);
    if (!folderToDelete) return;

    const delAt = new Date().toISOString();

    // Coleta recursiva de TUDO dentro da pasta
    const collectChildren = (parentId) => {
      const result = { notes: [], folders: [] };
      const childNotes = notes.filter(n => n.folder_id === parentId);
      const childFolders = folders.filter(f => f.parent_id === parentId);
      result.notes.push(...childNotes);
      result.folders.push(...childFolders);
      childFolders.forEach(cf => {
        const deeper = collectChildren(cf.id);
        result.notes.push(...deeper.notes);
        result.folders.push(...deeper.folders);
      });
      return result;
    };

    const children = collectChildren(id);
    const allFolderIds = [id, ...children.folders.map(f => f.id)];
    const allNoteIds = children.notes.map(n => n.id);

    // Monta itens da lixeira
    const trashItems = [
      { id: folderToDelete.id, title: folderToDelete.name, content: '', item_type: 'folder', folder_id: folderToDelete.parent_id, deleted_at: delAt }
    ];
    children.folders.forEach(f => {
      trashItems.push({ id: f.id, title: f.name, content: '', item_type: 'folder', folder_id: f.parent_id, deleted_at: delAt });
    });
    children.notes.forEach(n => {
      trashItems.push({ id: n.id, title: n.title, content: n.content || '', item_type: 'note', folder_id: n.folder_id, deleted_at: delAt });
    });

    // Atualiza estado local
    setTrash(prev => [...prev, ...trashItems]);
    setFolders(prev => prev.filter(f => !allFolderIds.includes(f.id)));
    setNotes(prev => prev.filter(n => !allNoteIds.includes(n.id)));

    if (loggedUser && loggedUser !== 'Anônimo') {
      try {
        // PRIMEIRO salva na lixeira, DEPOIS deleta do banco
        const { error: trashErr } = await supabase.from('retronote_trash').insert(
          trashItems.map(item => ({ ...item, user_id: loggedUser.id }))
        );
        if (trashErr) console.error('[RetroNote] Erro ao mover para lixeira:', trashErr.message);

        // Agora deleta a pasta pai (CASCADE cuida do resto no banco)
        const { error: delErr } = await supabase.from('retronote_folders').delete().eq('id', id);
        if (delErr) console.error('[RetroNote] Erro ao deletar pasta:', delErr.message);
      } catch (err) {
        console.error('[RetroNote] Falha crítica ao deletar pasta:', err.message);
      }
    }
  }, [folders, notes, loggedUser]);

  const moveNote = useCallback((noteId, newFolderId) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folder_id: newFolderId } : n));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_notes').update({ folder_id: newFolderId }).eq('id', noteId)
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao mover nota:', error.message); });
    }
  }, [loggedUser]);

  const moveFolder = useCallback((folderId, newParentId) => {
    if (folderId === newParentId) return;
    const isDescendant = (parentId, targetId) => {
      let current = parentId;
      const visited = new Set();
      while (current) {
        if (visited.has(current)) break;
        visited.add(current);
        if (current === targetId) return true;
        const folder = folders.find(f => f.id === current);
        current = folder?.parent_id;
      }
      return false;
    };
    if (newParentId && isDescendant(newParentId, folderId)) return;

    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, parent_id: newParentId } : f));
    if (loggedUser && loggedUser !== 'Anônimo') {
      supabase.from('retronote_folders').update({ parent_id: newParentId }).eq('id', folderId)
        .then(({ error }) => { if (error) console.error('[RetroNote] Erro ao mover pasta:', error.message); });
    }
  }, [loggedUser, folders]);

  const restoreItem = useCallback(async (id) => {
    const itemToRestore = trash.find(n => n.id === id);
    if (!itemToRestore) return;

    try {
      if (itemToRestore.item_type === 'folder') {
        // Coleta TODOS os descendentes recursivamente (filhos, netos, etc.)
        const collectAllChildren = (parentId, trashList) => {
          const direct = trashList.filter(t => t.folder_id === parentId && t.id !== parentId);
          const all = [...direct];
          direct.filter(d => d.item_type === 'folder').forEach(subfolder => {
            all.push(...collectAllChildren(subfolder.id, trashList));
          });
          return all;
        };

        const childItems = collectAllChildren(itemToRestore.id, trash);
        const allItemIds = new Set([id, ...childItems.map(c => c.id)]);

        // Re-insere a pasta pai primeiro
        const restoredFolder = { id: itemToRestore.id, name: itemToRestore.title, parent_id: itemToRestore.folder_id };

        if (loggedUser && loggedUser !== 'Anônimo') {
          // 1. Remove TUDO da lixeira no banco de uma vez
          for (const itemId of allItemIds) {
            await supabase.from('retronote_trash').delete().eq('id', itemId);
          }

          // 2. Insere pasta raiz primeiro
          const { error: insErr } = await supabase.from('retronote_folders').insert([{
            id: restoredFolder.id, user_id: loggedUser.id, name: restoredFolder.name, parent_id: restoredFolder.parent_id
          }]);
          if (insErr) throw new Error('Erro ao reinserir pasta: ' + insErr.message);

          // 3. Restaura subpastas primeiro (ordem importa por causa das foreign keys)
          const childFolders = childItems.filter(c => c.item_type === 'folder');
          for (const child of childFolders) {
            await supabase.from('retronote_folders').insert([{
              id: child.id, user_id: loggedUser.id, name: child.title, parent_id: child.folder_id
            }]);
          }

          // 4. Restaura notas por último
          const childNotes = childItems.filter(c => c.item_type === 'note');
          for (const child of childNotes) {
            await supabase.from('retronote_notes').insert([{
              id: child.id, user_id: loggedUser.id, title: child.title, content: child.content || '', folder_id: child.folder_id
            }]);
          }
        }

        // Atualiza UI local
        const restoredFolders = [restoredFolder, ...childItems.filter(c => c.item_type === 'folder').map(c => ({ id: c.id, name: c.title, parent_id: c.folder_id }))];
        const restoredNotes = childItems.filter(c => c.item_type === 'note').map(c => ({ id: c.id, title: c.title, content: c.content, folder_id: c.folder_id }));
        setFolders(prev => [...prev, ...restoredFolders]);
        setNotes(prev => [...prev, ...restoredNotes]);
        setTrash(prev => prev.filter(t => !allItemIds.has(t.id)));

      } else {
        const restoredNote = { id: itemToRestore.id, title: itemToRestore.title, content: itemToRestore.content, folder_id: itemToRestore.folder_id };

        if (loggedUser && loggedUser !== 'Anônimo') {
          await supabase.from('retronote_trash').delete().eq('id', id);
          const { error: insErr } = await supabase.from('retronote_notes').insert([{
            id: restoredNote.id, user_id: loggedUser.id, title: restoredNote.title, content: restoredNote.content, folder_id: restoredNote.folder_id
          }]);
          if (insErr) throw new Error('Erro ao reinserir nota: ' + insErr.message);
        }

        setNotes(prev => [...prev, restoredNote]);
        setTrash(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('[RetroNote] Falha crítica na restauração:', err.message);
      // Opcional: Reverter estado local se falhar? Mas vamos ver o erro primeiro.
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
      const localFoldersStr = localStorage.getItem('retronote_folders');
      if (localFoldersStr) {
        const localF = JSON.parse(localFoldersStr);
        if (localF.length > 0) {
          const insertPayload = localF.map(folder => ({
            id: folder.id,
            user_id: newUser.id,
            name: folder.name,
            parent_id: folder.parent_id
          }));
          await supabase.from('retronote_folders').upsert(insertPayload);
          localStorage.removeItem('retronote_folders');
        }
      }

      const localNotesStr = localStorage.getItem('retronote_notes');
      if (localNotesStr) {
        const localN = JSON.parse(localNotesStr);
        if (localN.length > 0) {
          const insertPayload = localN.map(note => ({
            id: note.id,
            user_id: newUser.id,
            title: note.title,
            content: note.content,
            folder_id: note.folder_id
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

  return {
    notes,
    folders,
    trash,
    isLoaded,
    addNote,
    addFolder,
    updateNoteContent,
    updateNoteTitle,
    updateFolderTitle,
    shareNote,
    deleteNote,
    deleteFolder,
    restoreNote: restoreItem,
    permanentDelete,
    emptyTrash,
    migrateToCloud,
    duplicateNote,
    moveNote,
    moveFolder
  };
}
