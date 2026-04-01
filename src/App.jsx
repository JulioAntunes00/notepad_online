import React, { useState, useEffect } from 'react';
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

  // Auto-chama a janela de Login como uma janela do sistema quando a página carrega pela primeira vez
  useEffect(() => {
    if (loggedUser) return;
    const vw = window.innerWidth;
    const existing = windows.find(w => w.type === 'login');
    if (!existing) {
       openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedUser]);

  const handleLoginSubmit = (username) => {
    setLoggedUser(username);
    const win = windows.find(w => w.type === 'login');
    if (win) closeWindow(win.id);
  };

  // ── Handlers de Notas ──
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
    if (win) {
      updateWindow(win.id, { title: `${newTitle} - Bloco de Notas` });
    }
  };

  const handleDeleteNote = (noteId) => {
    // Fecha a janela associada antes de excluir
    const win = windows.find(w => w.context?.noteId === noteId);
    if (win) closeWindow(win.id);
    deleteNote(noteId);
  };

  const handleRestoreNote = (noteId) => {
    restoreNote(noteId);
  };

  // ── Handler da Lixeira ──
  const handleOpenRecycleBin = () => {
    openWindow('recyclebin', 'Lixeira', { type: 'recyclebin' });
  };

  // ── Taskbar toggle ──
  const handleTaskbarClick = (id) => {
    const win = windows.find((w) => w.id === id);
    if (win?.minimized) {
      restoreWindow(id);
    } else {
      minimizeWindow(id);
    }
  };

  const trashIcon = trash.length > 0 ? TRASH_FULL_ICON : TRASH_EMPTY_ICON;

  return (
    <div className="w-screen h-screen bg-[#3a6ea5] overflow-hidden relative select-none">
      
      {/* Ícones da Área de Trabalho */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 flex-wrap max-h-[calc(100vh-40px)]">
        
        {/* + Nova Nota */}
        <DesktopIcon
          label="+ Nova Nota"
          iconSrc={NEW_DOCUMENT_ICON}
          onDoubleClick={() => setIsNewDialogOpen(true)}
        />
        
        {/* Lixeira */}
        <DesktopIcon
          label="Lixeira"
          iconSrc={trashIcon}
          onDoubleClick={handleOpenRecycleBin}
        />

        {/* Notas salvas */}
        {notes.map(note => (
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

      {/* Ícone isolado Configurações/Perfil Canto Superior Direito */}
      <div className="absolute top-4 right-4 flex flex-col items-end">
        <DesktopIcon
          label={loggedUser ? `Conta: ${loggedUser}` : "Login"}
          iconSrc={USER_ICON}
          onDoubleClick={() => {
            const vw = window.innerWidth;
            openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
          }}
        />
      </div>

      {/* Camada de Janelas */}
      {windows.map((win) => {
        if (win.type === 'notepad') {
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

        if (win.type === 'recyclebin') {
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

        if (win.type === 'login') {
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
