import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import useWindowManager from './hooks/useWindowManager';
import useNotes from './hooks/useNotes';
import Taskbar from './Taskbar';
import DesktopIcon from './components/DesktopIcon';
import NotepadWindow from './components/NotepadWindow';
import RecycleBinWindow from './components/RecycleBinWindow';
import LoginWindow from './components/LoginWindow';
import XPAlertWindow from './components/XPAlertWindow';
import StartMenu from './components/StartMenu';
import AboutWindow from './components/AboutWindow';
import FolderWindow from './components/FolderWindow';

const FOLDER_ICON = '/folder-closed.png';
const NOTEPAD_ICON = '/Notepad.png';
const HELP_ICON = '/Help and Support.png';
const TRASH_EMPTY_ICON = '/lixeira-vazia.png';
const TRASH_FULL_ICON = '/lixeira-cheia.png';
const USER_ICON = '/Power.png';

function App() {
  const [loggedUser, setLoggedUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const {
    notes, folders, trash,
    addNote, addFolder, updateNoteContent, updateNoteTitle, updateFolderTitle, shareNote,
    deleteNote, deleteFolder, restoreNote, permanentDelete, emptyTrash, migrateToCloud, duplicateNote, moveNote, moveFolder
  } = useNotes(loggedUser);

  const {
    windows, openWindow, closeWindow,
    minimizeWindow, restoreWindow, toggleMaximize,
    focusWindow, updateWindow,
  } = useWindowManager(loggedUser);

  const [activeMenu, setActiveMenu] = useState(null); // { id, x, y }
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  // Fecha qualquer menu de contexto aberto ao clicar fora
  useEffect(() => {
    if (!activeMenu) return;
    const handleClose = () => setActiveMenu(null);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [activeMenu]);

  // Bloqueia o menu de contexto nativo do navegador em toda a aplicação
  useEffect(() => {
    const block = (e) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  // Inicialização simples: Verifica se há sessão
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setLoggedUser(session.user);
      } else {
        setLoggedUser('Anônimo');
      }
      setAuthChecked(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setLoggedUser(session.user);
      else setLoggedUser('Anônimo');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verifica se é o primeiro acesso para auto-abrir a nota de boas vindas
  useEffect(() => {
    if (authChecked && loggedUser === 'Anônimo') {
      const hasSeenWelcome = localStorage.getItem('retronote_seen_welcome');
      if (!hasSeenWelcome) {
        localStorage.setItem('retronote_seen_welcome', 'true');
        const welcomeTitle = 'Bem Vindo!';
        const newNote = addNote(welcomeTitle);
        if (newNote) {
          const welcomeContent = `<div><b>Bem-vindo ao RetroNote XP! 🌠</b></div>
<br>
<div>Suas anotações agora têm o visual clássico que amamos.</div>
<br>
<div><b>⚠️ Cuidado:</b> Sem login, seus dados ficam apenas no navegador. Se limpar os dados ou formatar o PC, as notas <b>SUMIRÃO</b>.</div>
<br>
<div><b>💡 Por que criar conta?</b></div>
<div>Para salvar tudo na nuvem e nunca mais perder nada! Acesse de qualquer lugar e fique seguro.</div>
<br>
<div><b>Dica:</b> Tente clicar com o botão direito nos ícones! 🖱️</div>
<br>
<div>— Equipe RetroNote XP 🚀</div>`;
          updateNoteContent(newNote.id, welcomeContent);
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          openWindow('notepad', `${welcomeTitle} - Bloco de Notas`, { noteId: newNote.id }, { x: Math.max(0, vw / 2 - 500), y: Math.max(0, vh / 2 - 300), width: 1000, height: 600 });
        }
      }
    }
  }, [authChecked, loggedUser, addNote, openWindow, updateNoteContent]);

  // Modo Visitante/Leitura removido.

  const handleShowAlert = (title, message, type = 'info') => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    openWindow('alert', title, { message, type }, {
      x: vw / 2 - 175,
      y: vh / 2 - 75,
      width: 350,
      height: 150
    });
  };

  const handleLoginSubmit = async (user) => {
    if (loggedUser === 'Anônimo' && user !== 'Anônimo') {
      await migrateToCloud(user);
    }
    setLoggedUser(user);
    const win = windows.find(w => w.type === 'login');
    if (win) closeWindow(win.id);
  };

  const handleOpenNote = (note) => {
    openWindow('notepad', `${note.title} - Bloco de Notas`, { noteId: note.id });
  };

  const handleCreateNote = (name, parentId = null) => {
    const newNote = addNote(name || 'Nova Nota', parentId);
    openWindow('notepad', `${newNote.title} - Bloco de Notas`, { noteId: newNote.id });
  };

  const handleRenameNote = (noteId, newTitle) => {
    updateNoteTitle(noteId, newTitle);
    const win = windows.find(w => w.context?.noteId === noteId);
    if (win) updateWindow(win.id, { title: `${newTitle} - Bloco de Notas` });
  };

  const handleCreateFolder = (parentId = null) => {
    addFolder('Nova Pasta', parentId);
  };

  const handleRenameFolder = (folderId, newTitle) => {
    updateFolderTitle(folderId, newTitle);
    const win = windows.find(w => w.context?.folderId === folderId);
    if (win) updateWindow(win.id, { title: newTitle });
  };

  const handleDeleteFolder = (folderId) => {
    const win = windows.find(w => w.context?.folderId === folderId);
    if (win) closeWindow(win.id);
    deleteFolder(folderId);
  };

  const handleOpenFolder = (folder) => {
    openWindow('folder', folder.name, { folderId: folder.id });
  };

  const handleDropToDesktop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.id) {
        if (data.type === 'note') moveNote(data.id, null);
        if (data.type === 'folder') moveFolder(data.id, null);
      }
    } catch { }
  };

  const handleDuplicateNote = async (note) => {
    const newNote = await duplicateNote(note);
    if (newNote) handleOpenNote(newNote);
  };

  const handleDeleteNote = (noteId) => {
    const win = windows.find(w => w.context?.noteId === noteId);
    if (win) closeWindow(win.id);
    deleteNote(noteId);
  };

  const handleWindowContextMenu = (pos, winId) => {
    setActiveMenu({ type: 'taskbar', x: pos.x, y: pos.y, winId });
  };

  const handleDesktopContextMenu = (e) => {
    // Só abre o menu do desktop se o clique foi no fundo (não em cima de um ícone/janela)
    const target = e.target;
    const isDesktop = target.id === 'desktop-bg' || target.closest('#desktop-bg') && !target.closest('[role="button"]') && !target.closest('.window');
    if (isDesktop) {
      e.preventDefault();
      e.stopPropagation();
      setActiveMenu({ type: 'desktop', x: e.clientX, y: e.clientY });
    }
  };

  const trashIcon = trash.length > 0 ? TRASH_FULL_ICON : TRASH_EMPTY_ICON;

  return (
    <div 
      className="w-screen h-screen bg-[#3a6ea5] overflow-hidden relative select-none flex flex-col"
      onClick={() => isStartMenuOpen && setIsStartMenuOpen(false)}
    >
      {loggedUser === 'Anônimo' && (
        <div className="w-full bg-[#ffffe1] border-b border-[#716f64] px-3 py-1 flex items-center gap-1 cursor-pointer hover:bg-[#fff9b3] z-50 shadow-md flex-shrink-0" onClick={() => {
          const vw = window.innerWidth;
          openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
        }}>
          <span className="text-[11px] font-bold text-black">Aviso:</span>
          <span className="text-[11px] text-gray-800">Você está navegando como Visitante. Seus dados estão apenas neste dispositivo. Clique aqui para criar uma conta ou fazer login para sincronizar em qualquer lugar.</span>
        </div>
      )}

      {/* Container Principal que ocupa o resto do espaço */}
      <div 
        id="desktop-bg"
        className="flex-1 relative w-full h-full"
        onContextMenu={handleDesktopContextMenu}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={handleDropToDesktop}
      >

        {/* Ícones da Área de Trabalho sempre visíveis */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 flex-wrap max-h-[calc(100vh-40px)] pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-2">


          <DesktopIcon
            label="Lixeira"
            iconSrc={trashIcon}
            onClick={() => {
              if (loggedUser) openWindow('recyclebin', 'Lixeira', { type: 'recyclebin' });
              else {
                const loginWin = windows.find(w => w.type === 'login');
                if (loginWin) focusWindow(loginWin.id);
              }
            }}
            onEmptyTrash={emptyTrash}
            menuPos={activeMenu?.id === 'trash' ? activeMenu : null}
            onContextMenu={(pos) => setActiveMenu({ id: 'trash', ...pos })}
          />

          {loggedUser && folders.filter(f => f.parent_id === null).map(folder => (
            <DesktopIcon
              key={folder.id}
              id={folder.id}
              type="folder"
              label={folder.name}
              iconSrc={FOLDER_ICON}
              onClick={() => handleOpenFolder(folder)}
              onRename={(newTitle) => handleRenameFolder(folder.id, newTitle)}
              onDelete={() => handleDeleteFolder(folder.id)}
              menuPos={activeMenu?.id === folder.id ? activeMenu : null}
              onContextMenu={(pos) => setActiveMenu({ id: folder.id, ...pos })}
              onCloseMenu={() => setActiveMenu(null)}
              onDropItem={(droppedId, droppedType) => {
                if (droppedType === 'note') moveNote(droppedId, folder.id);
                if (droppedType === 'folder') moveFolder(droppedId, folder.id);
              }}
            />
          ))}

          {loggedUser && notes.filter(n => n.folder_id === null || n.folder_id === undefined).map(note => (
            <DesktopIcon
              key={note.id}
              id={note.id}
              type="note"
              label={note.title}
              iconSrc={NOTEPAD_ICON}
              onClick={() => handleOpenNote(note)}
              onRename={(newTitle) => handleRenameNote(note.id, newTitle)}
              onDuplicate={() => handleDuplicateNote(note)}
              onDelete={() => handleDeleteNote(note.id)}
              menuPos={activeMenu?.id === note.id ? activeMenu : null}
              onContextMenu={(pos) => setActiveMenu({ id: note.id, ...pos })}
              onCloseMenu={() => setActiveMenu(null)}
            />
          ))}
          </div>
        </div>

        {/* Ícone de Login/Sair no topo direito com Sobre o Site ao lado */}
        <div className="absolute top-4 right-4 flex items-start gap-2">
          <DesktopIcon
            label="Sobre o Site"
            iconSrc={HELP_ICON}
            onClick={() => {
              const existingAbout = windows.find(w => w.type === 'about');
              if (existingAbout) {
                focusWindow(existingAbout.id);
                restoreWindow(existingAbout.id);
              } else {
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                openWindow('about', 'Sobre o Site', { type: 'about' }, { x: vw / 2 - 250, y: vh / 2 - 200, width: 500, height: 400 });
              }
            }}
            menuPos={activeMenu?.id === 'about' ? activeMenu : null}
            onContextMenu={(pos) => setActiveMenu({ id: 'about', ...pos })}
          />

          <DesktopIcon
            label={loggedUser ? (loggedUser === 'Anônimo' ? 'Sair (Visitante)' : 'Sair') : "Login"}
            iconSrc={USER_ICON}
            onClick={async () => {
              if (loggedUser) {
                sessionStorage.removeItem('retronote_is_anon');
                if (loggedUser !== 'Anônimo') await supabase.auth.signOut();
                setLoggedUser(null);
              } else {
                const vw = window.innerWidth;
                openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
              }
            }}
            menuPos={activeMenu?.id === 'auth' ? activeMenu : null}
            onContextMenu={(pos) => setActiveMenu({ id: 'auth', ...pos })}
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
                onCreateNote={() => handleCreateNote()}
                onShareNote={() => shareNote(note.id)}
                onShowAlert={handleShowAlert}
              />
            );
          }

          if (win.type === 'folder' && loggedUser) {
            return (
              <FolderWindow
                key={win.id}
                windowData={win}
                onClose={closeWindow}
                onMinimize={minimizeWindow}
                onToggleMaximize={toggleMaximize}
                onFocus={focusWindow}
                onUpdate={updateWindow}
                notes={notes}
                folders={folders}
                onOpenWindow={openWindow}
                onRenameNote={handleRenameNote}
                onRenameFolder={handleRenameFolder}
                onDeleteNote={handleDeleteNote}
                onDeleteFolder={handleDeleteFolder}
                onCreateFolder={(parentId) => handleCreateFolder(parentId)}
                onCreateNote={(parentId) => handleCreateNote('Nova Nota', parentId)}
                onMoveItem={(itemId, itemType, newParentId) => {
                  if (itemType === 'note') moveNote(itemId, newParentId);
                  if (itemType === 'folder') moveFolder(itemId, newParentId);
                }}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
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
                onRestore={restoreNote}
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

          if (win.type === 'alert') {
            return (
              <XPAlertWindow
                key={win.id}
                windowData={win}
                onClose={closeWindow}
              />
            );
          }
          
          if (win.type === 'about') {
            return (
              <AboutWindow key={win.id} windowData={win} onClose={closeWindow} />
            );
          }
          
          return null;
        })}

        {/* Menu de Contexto da Área de Trabalho */}
        {activeMenu?.type === 'desktop' && loggedUser && (
          <div
            className="fixed bg-[#ece9d8] border border-[#716f64] shadow-[2px_2px_4px_rgba(0,0,0,0.5)] py-[2px] z-[999999] min-w-[140px]"
            style={{ 
              top: activeMenu.y, 
              left: activeMenu.x 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default" 
              onClick={() => {
                handleCreateFolder();
                setActiveMenu(null);
              }}
            >
              Nova Pasta
            </div>
            <div 
              className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default" 
              onClick={() => {
                handleCreateNote();
                setActiveMenu(null);
              }}
            >
              Nova Nota
            </div>
          </div>
        )}

        {/* Menu de Contexto da Barra de Tarefas */}
        {activeMenu?.type === 'taskbar' && (() => {
          const win = windows.find(w => w.id === activeMenu.winId);
          if (!win) return null;
          const isNotepad = win.type === 'notepad';
          
          return (
            <div
              className="fixed bg-[#ece9d8] border border-[#716f64] shadow-[2px_2px_4px_rgba(0,0,0,0.5)] py-[2px] z-[999999] min-w-[140px]"
              style={{ 
                bottom: '31px', 
                left: Math.min(activeMenu.x, window.innerWidth - 150) 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default" 
                onClick={() => {
                  if (win.minimized) restoreWindow(win.id);
                  else focusWindow(win.id);
                  setActiveMenu(null);
                }}
              >
                {win.minimized ? 'Restaurar' : 'Focar'}
              </div>

              <div 
                className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default" 
                onClick={() => {
                  if (!win.minimized) minimizeWindow(win.id);
                  else restoreWindow(win.id);
                  setActiveMenu(null);
                }}
              >
                {win.minimized ? 'Maximizar' : 'Minimizar'}
              </div>

              {isNotepad && (
                <>
                  <div className="border-t border-[#aca899] my-[2px] mx-1" />
                  <div 
                    className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default text-red-700" 
                    onClick={() => {
                      if (win.context?.noteId) handleDeleteNote(win.context.noteId);
                      setActiveMenu(null);
                    }}
                  >
                    Deletar Nota
                  </div>
                </>
              )}

              <div className="border-t border-[#aca899] my-[2px] mx-1" />
              
              <div 
                className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default font-bold" 
                onClick={() => {
                  closeWindow(win.id);
                  setActiveMenu(null);
                }}
              >
                Fechar
              </div>
            </div>
          );
        })()}

        {isStartMenuOpen && (
          <StartMenu 
            loggedUser={loggedUser}
            onClose={() => setIsStartMenuOpen(false)}
            onCreateNote={() => {
              if (loggedUser) handleCreateNote();
              else {
                const loginWin = windows.find(w => w.type === 'login');
                if (loginWin) focusWindow(loginWin.id);
                else {
                  const vw = window.innerWidth;
                  openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
                }
              }
            }}
            onOpenRecycleBin={() => {
              if (loggedUser) openWindow('recyclebin', 'Lixeira', { type: 'recyclebin' });
              else {
                const loginWin = windows.find(w => w.type === 'login');
                if (loginWin) focusWindow(loginWin.id);
              }
            }}
            onLogout={async () => {
              if (loggedUser) {
                sessionStorage.removeItem('retronote_is_anon');
                if (loggedUser !== 'Anônimo') await supabase.auth.signOut();
                setLoggedUser(null);
              }
            }}
            onLogin={() => {
              const vw = window.innerWidth;
              openWindow('login', 'Identificação - RetroNote', { type: 'login' }, { x: vw / 2 - 170, y: 60, width: 340, height: 250 });
            }}
          />
        )}

        <Taskbar 
          windows={windows} 
          activeWindowId={windows.find(w => w.zIndex === Math.max(...windows.map(win => win.zIndex), 0))?.id}
          onToggleStartMenu={(val) => {
            if (val !== undefined) setIsStartMenuOpen(val);
            else setIsStartMenuOpen(prev => !prev);
          }}
          onWindowClick={(id) => {
            const win = windows.find(w => w.id === id);
            if (win?.minimized) restoreWindow(id);
            else minimizeWindow(id);
          }} 
          onWindowContextMenu={handleWindowContextMenu}
        />

      </div>
    </div>
  );
}

export default App;
