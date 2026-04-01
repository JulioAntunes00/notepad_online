import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import useWindowManager from './hooks/useWindowManager';
import useNotes from './hooks/useNotes';
import Taskbar from './Taskbar';
import DesktopIcon from './components/DesktopIcon';
import NotepadWindow from './components/NotepadWindow';
import NewNoteDialog from './components/NewNoteDialog';
import RecycleBinWindow from './components/RecycleBinWindow';
import LoginWindow from './components/LoginWindow';

const NOTEPAD_ICON = '/notepad-icon.webp';
const NEW_DOCUMENT_ICON = 'https://cdn-icons-png.flaticon.com/512/1004/1004733.png';
const TRASH_EMPTY_ICON = '/lixeira-vazia.png';
const TRASH_FULL_ICON = '/lixeira-cheia.png';
const USER_ICON = 'https://cdn-icons-png.flaticon.com/512/1077/1077063.png';

function App() {
  const [loggedUser, setLoggedUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const {
    notes, trash,
    addNote, updateNoteContent, updateNoteTitle,
    deleteNote, restoreNote, permanentDelete, emptyTrash,
  } = useNotes(loggedUser);

  const {
    windows, openWindow, closeWindow,
    minimizeWindow, restoreWindow, toggleMaximize,
    focusWindow, updateWindow,
  } = useWindowManager(loggedUser);

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      await supabase.auth.signOut();
      setAuthChecked(true);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setLoggedUser(session.user);
      else if (loggedUser !== 'Anônimo') setLoggedUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authChecked || loggedUser) return;
    const existing = windows.find(w => w.type === 'login');
    if (!existing) {
       const vw = window.innerWidth;
       openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
    }
  }, [loggedUser, authChecked]);

  const handleLoginSubmit = (user) => {
    setLoggedUser(user);
    const win = windows.find(w => w.type === 'login');
    if (win) closeWindow(win.id);
  };

  const handleOpenNote = (note) => {
    openWindow('notepad', `${note.title} - Bloco de Notas`, { noteId: note.id });
  };

  const handleCreateNote = (name) => {
    const newNote = addNote(name);
    openWindow('notepad', `${newNote.title} - Bloco de Notas`, { noteId: newNote.id });
  };

  const handleRenameNote = (noteId, newTitle) => {
    updateNoteTitle(noteId, newTitle);
    const win = windows.find(w => w.context?.noteId === noteId);
    if (win) updateWindow(win.id, { title: `${newTitle} - Bloco de Notas` });
  };

  const handleDeleteNote = (noteId) => {
    const win = windows.find(w => w.context?.noteId === noteId);
    if (win) closeWindow(win.id);
    deleteNote(noteId);
  };

  const handleRestoreNote = (noteId) => {
    restoreNote(noteId);
  };

  const handleOpenRecycleBin = () => {
    openWindow('recyclebin', 'Lixeira', { type: 'recyclebin' });
  };

  const handleTaskbarClick = (id) => {
    const win = windows.find((w) => w.id === id);
    if (win?.minimized) restoreWindow(id);
    else minimizeWindow(id);
  };

  const trashIcon = trash.length > 0 ? TRASH_FULL_ICON : TRASH_EMPTY_ICON;

  return (
    <div className="w-screen h-screen bg-[#3a6ea5] overflow-hidden relative select-none">

      {/* Ícones da Esquerda: Nova Nota, Lixeira e Notas */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 flex-wrap max-h-[calc(100vh-40px)]">
        <DesktopIcon
          label="+ Nova Nota"
          iconSrc={NEW_DOCUMENT_ICON}
          onDoubleClick={() => {
            if (loggedUser) setIsNewDialogOpen(true);
            else {
              const loginWin = windows.find(w => w.type === 'login');
              if (loginWin) focusWindow(loginWin.id);
            }
          }}
        />
        
        <DesktopIcon
          label="Lixeira"
          iconSrc={trashIcon}
          onDoubleClick={() => {
            if (loggedUser) handleOpenRecycleBin();
            else {
              const loginWin = windows.find(w => w.type === 'login');
              if (loginWin) focusWindow(loginWin.id);
            }
          }}
        />

        {loggedUser && notes.map(note => (
          <DesktopIcon
            key={note.id}
            label={note.title}
            iconSrc={NOTEPAD_ICON}
            onDoubleClick={() => handleOpenNote(note)}
            onRename={(newTitle) => handleRenameNote(note.id, newTitle)}
            isLarge={true}
          />
        ))}
      </div>

      {/* Ícone da Conta: Canto Superior Direito */}
      <div className="absolute top-4 right-4">
        <DesktopIcon
          label={loggedUser ? (loggedUser === 'Anônimo' ? 'Sair (Visitante)' : 'Sair') : "Login"}
          iconSrc={USER_ICON}
          onDoubleClick={async () => {
            if (loggedUser) {
              if (loggedUser !== 'Anônimo') await supabase.auth.signOut();
              setLoggedUser(null);
            } else {
              const vw = window.innerWidth;
              openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
            }
          }}
        />
      </div>

      {/* Camada de Janelas */}
      {windows.map((win) => {
        if (win.type === 'notepad' && loggedUser) {
          const noteId = win.context?.noteId;
          const note = notes.find(n => n.id === noteId);
          if (!note) return null;
          return (
            <NotepadWindow
              key={win.id}
              windowData={win}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onToggleMaximize={toggleMaximize}
              onFocus={focusWindow}
              onUpdate={updateWindow}
              noteTitle={note.title}
              initialContent={note.content}
              onContentChange={(text) => updateNoteContent(note.id, text)}
              onDeleteNote={() => handleDeleteNote(note.id)}
              onRenameNote={(newTitle) => handleRenameNote(note.id, newTitle)}
            />
          );
        }

        if (win.type === 'recyclebin' && loggedUser) {
          return (
            <RecycleBinWindow
              key={win.id}
              windowData={win}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onToggleMaximize={toggleMaximize}
              onFocus={focusWindow}
              onUpdate={updateWindow}
              trashItems={trash}
              onRestore={handleRestoreNote}
              onEmptyTrash={emptyTrash}
            />
          );
        }

        if (win.type === 'login' && !loggedUser) {
          return (
            <LoginWindow
              key={win.id}
              windowData={win}
              onClose={closeWindow}
              onFocus={focusWindow}
              onUpdate={updateWindow}
              onLogin={handleLoginSubmit}
            />
          );
        }
        return null;
      })}

      <Taskbar windows={windows} onWindowClick={handleTaskbarClick} />

      <NewNoteDialog
        isOpen={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
        onCreate={handleCreateNote}
      />
    </div>
  );
}

export default App;
