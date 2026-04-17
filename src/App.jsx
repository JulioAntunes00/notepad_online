import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './lib/supabase';
import useWindowManager from './hooks/useWindowManager';
import useNotes from './hooks/useNotes';
import useAdmin from './hooks/useAdmin';
import Taskbar from './Taskbar';
import DesktopIcon from './components/DesktopIcon';
import NotepadWindow from './components/NotepadWindow';
import RecycleBinWindow from './components/RecycleBinWindow';
import LoginWindow from './components/LoginWindow';
import XPAlertWindow from './components/XPAlertWindow';
import StartMenu from './components/StartMenu';
import AboutWindow from './components/AboutWindow';
import FolderWindow from './components/FolderWindow';
import ProfileWindow from './components/ProfileWindow';
import AdminPanelWindow from './components/AdminPanelWindow';

const FOLDER_ICON = '/folder-closed.png';
const NOTEPAD_ICON = '/Notepad.png';
const HELP_ICON = '/Help and Support.png';
const TRASH_EMPTY_ICON = '/lixeira-vazia.png';
const TRASH_FULL_ICON = '/lixeira-cheia.png';
const USER_ICON = '/Power.png';
const PROFILE_ICON = '/Help and Support.png';
const ADMIN_ICON = '/admin-panel.png';

function App() {
  const { t } = useTranslation();
  const [loggedUser, setLoggedUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const {
    notes, folders, trash, isLoaded,
    addNote, addFolder, updateNoteContent, updateNoteTitle, updateFolderTitle, shareNote,
    deleteNote, deleteFolder, restoreNote, permanentDelete, emptyTrash, migrateToCloud, duplicateNote, moveNote, moveFolder
  } = useNotes(loggedUser);

  const {
    windows, openWindow, closeWindow,
    minimizeWindow, restoreWindow, toggleMaximize,
    focusWindow, updateWindow,
  } = useWindowManager(loggedUser);

  const { isAdmin } = useAdmin(loggedUser);

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
        setLoggedUser(null);
        handleOpenLogin();
      }
      setAuthChecked(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setLoggedUser(session.user);
      else {
        setLoggedUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verifica se é o primeiro acesso para criar estrutura padrão e auto-abrir nota
  useEffect(() => {
    if (!authChecked || !isLoaded || !loggedUser) return;

    const userKey = loggedUser === 'Anônimo' ? 'visitor' : loggedUser.id;
    const storageKey = `retronote_onboarding_${userKey}`;
    const hasSeenOnboarding = localStorage.getItem(storageKey);

    // Se o usuário não tiver nada e nunca viu o onboarding, cria a estrutura inicial
    if (!hasSeenOnboarding && notes.length === 0 && folders.length === 0) {
      localStorage.setItem(storageKey, 'true');

      // 1. Cria a pasta padrão
      const defaultFolder = addFolder(t('onboarding.defaultFolder'));

      // 2. Cria a nota de boas-vindas
      const welcomeTitle = t('onboarding.welcomeTitle');
      const newNote = addNote(welcomeTitle, null);

      if (newNote) {
        const isAnon = loggedUser === 'Anônimo';
        const welcomeContent = `<div><span style="font-size: 18px;"><b>${t('onboarding.welcomeHeading')}</b></span></div>
<br>
<div>${t('onboarding.welcomeIntro')}</div>
<br>
${isAnon ?
            `<div><b>💡 ${t('onboarding.anonTip')}</b></div>` :
            `<div><b>✅ ${t('onboarding.syncActive')}</b></div>`}
<br>
<div>${t('onboarding.enjoy')}</div>`;

        updateNoteContent(newNote.id, welcomeContent);

        // 3. Abre a janela da nota com uma posição centralizada
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Pequeno delay para garantir que o estado local dos ícones foi atualizado
        setTimeout(() => {
          openWindow('notepad', `${welcomeTitle} - ${t('onboarding.notepadSuffix')}`, { noteId: newNote.id }, {
            x: Math.max(0, vw / 2 - 360),
            y: Math.max(0, vh / 2 - 270),
            width: 720,
            height: 540
          });
        }, 100);
      }
    }
  }, [authChecked, isLoaded, loggedUser, notes.length, folders.length, addNote, addFolder, updateNoteContent, openWindow]);

  // Modo Visitante/Leitura removido.

  const handleOpenLogin = () => {
    const existing = windows.find(w => w.type === 'login');
    if (existing) {
      focusWindow(existing.id);
      restoreWindow(existing.id);
    } else {
      const vw = window.innerWidth;
      openWindow('login', t('loginWindow.title'), { type: 'login' }, { x: vw / 2 - 240, y: 60, width: 480, height: 384 });
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('retronote_is_anon');
    sessionStorage.removeItem('retronote_seen_visitor_balloon');
    if (loggedUser && loggedUser !== 'Anônimo') await supabase.auth.signOut();
    setLoggedUser(null);
    handleOpenLogin();
  };

  const handleShowAlert = (title, message, type = 'info') => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    openWindow('alert', title, { message, type }, {
      x: vw / 2 - 210,
      y: vh / 2 - 90,
      width: 420,
      height: 180
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
    openWindow('notepad', `${note.title} - ${t('notepadWindow.suffix')}`, { noteId: note.id });
  };

  const handleCreateNote = (name, parentId = null) => {
    const newNote = addNote(name || t('contextMenu.newNote'), parentId);
    openWindow('notepad', `${newNote.title} - ${t('notepadWindow.suffix')}`, { noteId: newNote.id });
  };

  const handleRenameNote = (noteId, newTitle) => {
    updateNoteTitle(noteId, newTitle);
    const win = windows.find(w => w.context?.noteId === noteId);
    if (win) updateWindow(win.id, { title: `${newTitle} - ${t('notepadWindow.suffix')}` });
  };

  const handleCreateFolder = (parentId = null) => {
    addFolder(t('contextMenu.newFolder'), parentId);
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


      {/* Container Principal que ocupa o resto do espaço */}
      <div
        id="desktop-bg"
        className="flex-1 relative w-full h-full"
        onContextMenu={handleDesktopContextMenu}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={handleDropToDesktop}
      >

        {/* Marca d'Água de Modo Visitante */}
        {loggedUser === 'Anônimo' && (
          <div
            className="absolute bottom-12 right-6 flex flex-col items-end text-white text-right pointer-events-none opacity-80 z-50"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          >
            <span className="text-xl font-bold font-sans">{t('visitor.title')}</span>
            <span className="text-sm">{t('visitor.warning')}</span>
            <span
              className="text-xs mt-1 text-[#ffffcc] underline cursor-pointer pointer-events-auto hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
            >
              {t('visitor.createAccount')}
            </span>
          </div>
        )}

        {/* Ícones da Área de Trabalho sempre visíveis */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 flex-wrap max-h-[calc(100vh-40px)] pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-2">


            <DesktopIcon
              label={t('desktop.recycleBin')}
              iconSrc={trashIcon}
              onClick={() => {
                if (loggedUser) openWindow('recyclebin', t('desktop.recycleBin'), { type: 'recyclebin' });
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
            label={t('desktop.aboutSite')}
            iconSrc={HELP_ICON}
            onClick={() => {
              const existingAbout = windows.find(w => w.type === 'about');
              if (existingAbout) {
                focusWindow(existingAbout.id);
                restoreWindow(existingAbout.id);
              } else {
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                openWindow('about', t('desktop.aboutSite'), { type: 'about' }, { x: vw / 2 - 300, y: vh / 2 - 240, width: 600, height: 480 });
              }
            }}
            menuPos={activeMenu?.id === 'about' ? activeMenu : null}
            onContextMenu={(pos) => setActiveMenu({ id: 'about', ...pos })}
          />

          <DesktopIcon
            label={loggedUser ? (loggedUser === 'Anônimo' ? t('desktop.logoutVisitor') : t('desktop.logout')) : t('desktop.login')}
            iconSrc={USER_ICON}
            onClick={handleLogout}
            menuPos={activeMenu?.id === 'auth' ? activeMenu : null}
            onContextMenu={(pos) => setActiveMenu({ id: 'auth', ...pos })}
          />

          {loggedUser && loggedUser !== 'Anônimo' && (
            <DesktopIcon
              label={t('desktop.myProfile')}
              iconSrc={PROFILE_ICON}
              onClick={() => {
                const existing = windows.find(w => w.type === 'profile');
                if (existing) {
                  focusWindow(existing.id);
                  restoreWindow(existing.id);
                } else {
                  const vw = window.innerWidth;
                  const vh = window.innerHeight;
                  openWindow('profile', t('desktop.myProfile'), { type: 'profile' }, { x: vw / 2 - 240, y: vh / 2 - 264, width: 480, height: 528 });
                }
              }}
              menuPos={activeMenu?.id === 'profile' ? activeMenu : null}
              onContextMenu={(pos) => setActiveMenu({ id: 'profile', ...pos })}
            />
          )}

          {isAdmin && (
            <DesktopIcon
              label={t('desktop.adminPanel')}
              iconSrc={ADMIN_ICON}
              onClick={() => {
                const existing = windows.find(w => w.type === 'admin');
                if (existing) {
                  focusWindow(existing.id);
                  restoreWindow(existing.id);
                } else {
                  const vw = window.innerWidth;
                  const vh = window.innerHeight;
                  openWindow('admin', t('desktop.adminPanelTitle'), { type: 'admin' }, { x: vw / 2 - 420, y: vh / 2 - 300, width: 840, height: 600 });
                }
              }}
              menuPos={activeMenu?.id === 'admin' ? activeMenu : null}
              onContextMenu={(pos) => setActiveMenu({ id: 'admin', ...pos })}
            />
          )}
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

          if (win.type === 'profile' && loggedUser && loggedUser !== 'Anônimo') {
            return (
              <ProfileWindow
                key={win.id}
                windowData={win}
                onClose={closeWindow}
                onFocus={focusWindow}
                onUpdate={updateWindow}
                loggedUser={loggedUser}
                onShowAlert={handleShowAlert}
              />
            );
          }

          if (win.type === 'admin' && loggedUser && isAdmin) {
            return (
              <AdminPanelWindow
                key={win.id}
                windowData={win}
                onClose={closeWindow}
                onMinimize={minimizeWindow}
                onToggleMaximize={toggleMaximize}
                onFocus={focusWindow}
                onUpdate={updateWindow}
                loggedUser={loggedUser}
                onShowAlert={handleShowAlert}
              />
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
              {t('contextMenu.newFolder')}
            </div>
            <div
              className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
              onClick={() => {
                handleCreateNote();
                setActiveMenu(null);
              }}
            >
              {t('contextMenu.newNote')}
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
                {win.minimized ? t('contextMenu.restore') : t('contextMenu.focus')}
              </div>

              <div
                className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
                onClick={() => {
                  if (!win.minimized) minimizeWindow(win.id);
                  else restoreWindow(win.id);
                  setActiveMenu(null);
                }}
              >
                {win.minimized ? t('contextMenu.maximize') : t('contextMenu.minimize')}
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
                    {t('contextMenu.deleteNote')}
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
                {t('contextMenu.close')}
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
                handleOpenLogin();
              }
            }}
            onOpenRecycleBin={() => {
              if (loggedUser) openWindow('recyclebin', t('desktop.recycleBin'), { type: 'recyclebin' });
              else {
                handleOpenLogin();
              }
            }}
            onLogout={handleLogout}
            onLogin={handleOpenLogin}
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
          loggedUser={loggedUser}
          onLogin={handleLogout}
        />

      </div>
    </div>
  );
}

export default App;
