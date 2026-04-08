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

const NOTEPAD_ICON = '/notepad-icon.png';
const NEW_DOCUMENT_ICON = 'https://cdn-icons-png.flaticon.com/512/1004/1004733.png';
const TRASH_EMPTY_ICON = '/lixeira-vazia.png';
const TRASH_FULL_ICON = '/lixeira-cheia.png';
const USER_ICON = '/poweroff.png';

function App() {
  const [loggedUser, setLoggedUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const {
    notes, trash,
    addNote, updateNoteContent, updateNoteTitle, shareNote,
    deleteNote, restoreNote, permanentDelete, emptyTrash, migrateToCloud, duplicateNote
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

  const handleCreateNote = (name) => {
    const newNote = addNote(name);
    openWindow('notepad', `${newNote.title} - Bloco de Notas`, { noteId: newNote.id });
  };

  const handleRenameNote = (noteId, newTitle) => {
    updateNoteTitle(noteId, newTitle);
    const win = windows.find(w => w.context?.noteId === noteId);
    if (win) updateWindow(win.id, { title: `${newTitle} - Bloco de Notas` });
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
      <div className="flex-1 relative w-full h-full">

        {/* Ícones da Área de Trabalho sempre visíveis */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 flex-wrap max-h-[calc(100vh-40px)]">

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

          {loggedUser && notes.map(note => (
            <DesktopIcon
              key={note.id}
              label={note.title}
              iconSrc={NOTEPAD_ICON}
              onClick={() => handleOpenNote(note)}
              onRename={(newTitle) => handleRenameNote(note.id, newTitle)}
              onDuplicate={() => handleDuplicateNote(note)}
              onDelete={() => handleDeleteNote(note.id)}
              menuPos={activeMenu?.id === note.id ? activeMenu : null}
              onContextMenu={(pos) => setActiveMenu({ id: note.id, ...pos })}
            />
          ))}
        </div>

        <div className="absolute top-4 right-4">
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
          return null;
        })}

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
