import React, { useState } from 'react';
import DesktopIcon from './DesktopIcon';

const FOLDER_ICON = '/folder-closed.png';
const FOLDER_OPEN_ICON = '/folder-opened.png';
const NOTEPAD_ICON = '/Notepad.png';

export default function FolderWindow({ 
  windowData, 
  onClose, 
  onMinimize,
  onToggleMaximize,
  onFocus,
  onUpdate,
  notes, 
  folders, 
  onOpenWindow, 
  onRenameNote, 
  onRenameFolder, 
  onCreateFolder,
  onCreateNote,
  onMoveItem, 
  onDeleteNote,
  onDeleteFolder,
  activeMenu,
  setActiveMenu
}) {
  const { id, title, context, x, y, width, height, zIndex, maximized } = windowData;
  const folderId = context.folderId;
  const [isDragOver, setIsDragOver] = useState(false);

  const currentFolder = folders.find(f => f.id === folderId);
  const folderNotes = notes.filter(n => n.folder_id === folderId);
  const subFolders = folders.filter(f => f.parent_id === folderId);

  const handleBack = () => {
    if (currentFolder?.parent_id) {
      const parent = folders.find(f => f.id === currentFolder?.parent_id);
      if (parent) {
        onUpdate(id, { context: { ...context, folderId: parent.id }, title: parent.name });
      } else {
        onClose(id);
      }
    } else {
      // It's at root level, close window
      onClose(id);
    }
  };

  const handleDragStart = (e) => {
    if (maximized) return;
    e.preventDefault();
    onFocus(id);
    const startX = e.clientX - x;
    const startY = e.clientY - y;
    const onMove = (ev) => onUpdate(id, { x: Math.max(0, ev.clientX - startX), y: Math.max(0, ev.clientY - startY) });
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.id && (data.type === 'note' || data.type === 'folder')) {
        if (data.type === 'folder' && data.id === folderId) return;
        onMoveItem(data.id, data.type, folderId);
      }
    } catch { }
  };

  const windowStyle = maximized
    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 32px)', zIndex }
    : { left: x, top: y, width, height, zIndex };

  return (
    <div
      className="window absolute flex flex-col select-none pointer-events-auto"
      style={windowStyle}
      onMouseDown={() => onFocus(id)}
    >
      <div 
        className="title-bar" 
        onMouseDown={handleDragStart}
        onDoubleClick={() => onToggleMaximize(id)}
      >
        <div className="title-bar-text px-1 flex items-center gap-1">
          <img src={FOLDER_OPEN_ICON} alt="Folder" className="w-[14px] h-[14px]" />
          {title}
        </div>
        <div className="title-bar-controls" onMouseDown={e => e.stopPropagation()}>
          <button aria-label="Minimize" onClick={() => onMinimize(id)} />
          <button aria-label="Maximize" onClick={() => onToggleMaximize(id)} />
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col !m-[3px] overflow-hidden">
        {/* Menus e Toolbar */}
      <div className="w-full bg-[#ece9d8] border-b border-[#aca899] py-1 px-2 flex items-center gap-1">
        <button 
          onClick={handleBack} 
          className="flex items-center gap-1 hover:bg-[#c1d2ee] px-2 py-1 rounded text-black text-[11px] border border-transparent hover:border-[#316ac5]"
        >
          <img src="/voltar.png" alt="Voltar" className="w-[20px] h-[20px]" />
          Voltar
        </button>
        <div className="w-[1px] h-[22px] bg-[#aca899] mx-1 opacity-50" />
        <button 
          onClick={() => onCreateFolder(folderId)} 
          className="flex items-center gap-1 hover:bg-[#c1d2ee] px-2 py-1 rounded text-black text-[11px] border border-transparent hover:border-[#316ac5]"
        >
          <img src="/nova-pasta.png" alt="Nova Pasta" className="w-[20px] h-[20px]" />
          Nova Pasta
        </button>
      </div>

      {/* Address Bar */}
      <div className="w-full bg-[#ece9d8] border-b border-[#aca899] py-1 px-2 flex items-center gap-2">
        <span className="text-[11px] text-gray-500">Endereço:</span>
        <div className="flex-1 bg-white border border-[#7f9db9] h-[20px] px-1 flex items-center text-[11px] overflow-hidden whitespace-nowrap">
          {title}
        </div>
      </div>

        {/* Main Content Area */}
        <div 
          className={`flex-1 p-2 overflow-auto bg-white flex flex-wrap content-start gap-4 relative ${isDragOver ? 'bg-blue-50/50' : ''}`}
          onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          const target = e.target;
          if (target.closest('[role="button"]')) return;
          e.preventDefault();
          e.stopPropagation();
          setActiveMenu({ id: 'folder-bg', type: 'folder-bg', x: e.clientX, y: e.clientY, folderId });
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {subFolders.map(folder => (
          <DesktopIcon
            key={folder.id}
            id={folder.id}
            type="folder"
            label={folder.name}
            iconSrc={FOLDER_ICON}
            onClick={() => onUpdate(id, { context: { ...context, folderId: folder.id }, title: folder.name })}
            onRename={(newName) => onRenameFolder(folder.id, newName)}
            onDelete={() => onDeleteFolder(folder.id)}
            menuPos={activeMenu?.id === `f-${folder.id}` ? activeMenu : null}
            onContextMenu={(pos) => setActiveMenu({ id: `f-${folder.id}`, ...pos })}
            onCloseMenu={() => setActiveMenu(null)}
            onDropItem={(droppedId, droppedType) => {
              if (droppedType === 'note') onMoveItem(droppedId, 'note', folder.id);
              if (droppedType === 'folder') onMoveItem(droppedId, 'folder', folder.id);
            }}
          />
        ))}

        {folderNotes.map(note => (
          <DesktopIcon
            key={note.id}
            id={note.id}
            type="note"
            label={note.title}
            iconSrc={NOTEPAD_ICON}
            onClick={() => onOpenWindow('notepad', note.title, { type: 'notepad', noteId: note.id })}
            onRename={(newName) => onRenameNote(note.id, newName)}
            onDelete={() => onDeleteNote(note.id)}
            menuPos={activeMenu?.id === `n-${note.id}` ? activeMenu : null}
            onContextMenu={(pos) => setActiveMenu({ id: `n-${note.id}`, ...pos })}
            onCloseMenu={() => setActiveMenu(null)}
          />
        ))}

        {subFolders.length === 0 && folderNotes.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[12px] text-gray-400">
            Esta pasta está vazia.
          </div>
        )}

        {/* Menu de Contexto do Fundo da Pasta */}
        {activeMenu?.id === 'folder-bg' && activeMenu.folderId === folderId && (
          <div
            className="fixed bg-[#ece9d8] border border-[#716f64] shadow-[2px_2px_4px_rgba(0,0,0,0.5)] py-[2px] z-[999999] min-w-[140px]"
            style={{ top: activeMenu.y, left: activeMenu.x }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div 
              className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default" 
              onClick={() => {
                onCreateFolder(folderId);
                setActiveMenu(null);
              }}
            >
              Nova Pasta
            </div>
            <div 
              className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default" 
              onClick={() => {
                onCreateNote(folderId);
                setActiveMenu(null);
              }}
            >
              Nova Nota
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
