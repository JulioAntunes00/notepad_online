import React, { useState, useRef, useCallback, useEffect } from 'react';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

export default function NotepadWindow({
  windowData,
  onClose,
  onMinimize,
  onToggleMaximize,
  onFocus,
  onUpdate,
  noteTitle,
  initialContent,
  onContentChange,
  onDeleteNote,
  onRenameNote,
}) {
  const { id, minimized, maximized, zIndex, x, y, width, height } = windowData;
  const [text, setText] = useState(initialContent || '');
  const [menuOpen, setMenuOpen] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  // Autosave debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      onContentChange?.(text);
    }, 500);
    return () => clearTimeout(timeout);
  }, [text, onContentChange]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  // Focus rename input
  useEffect(() => {
    if (showRenameDialog) {
      setRenameValue(noteTitle);
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 50);
    }
  }, [showRenameDialog, noteTitle]);

  const handleDragStart = useCallback(
    (e) => {
      if (maximized) return;
      e.preventDefault();
      onFocus(id);
      const startX = e.clientX - x;
      const startY = e.clientY - y;
      const onMove = (ev) => onUpdate(id, { x: Math.max(0, ev.clientX - startX), y: Math.max(0, ev.clientY - startY) });
      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [id, x, y, maximized, onFocus, onUpdate]
  );

  const handleResizeStart = useCallback(
    (e, direction) => {
      if (maximized) return;
      e.preventDefault(); e.stopPropagation(); onFocus(id);
      const startMouseX = e.clientX, startMouseY = e.clientY;
      const sX = x, sY = y, sW = width, sH = height;
      const onMove = (ev) => {
        const dx = ev.clientX - startMouseX, dy = ev.clientY - startMouseY;
        const u = {};
        if (direction.includes('e')) u.width = Math.max(MIN_WIDTH, sW + dx);
        if (direction.includes('s')) u.height = Math.max(MIN_HEIGHT, sH + dy);
        if (direction.includes('w')) { const nW = Math.max(MIN_WIDTH, sW - dx); u.width = nW; u.x = sX + (sW - nW); }
        if (direction.includes('n')) { const nH = Math.max(MIN_HEIGHT, sH - dy); u.height = nH; u.y = sY + (sH - nH); }
        onUpdate(id, u);
      };
      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [id, x, y, width, height, maximized, onFocus, onUpdate]
  );

  const handleRenameSubmit = (e) => {
    e?.preventDefault();
    if (renameValue.trim() && renameValue !== noteTitle) {
      onRenameNote?.(renameValue.trim());
    }
    setShowRenameDialog(false);
  };

  if (minimized) return null;

  const windowStyle = maximized
    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 32px)', zIndex }
    : { top: y, left: x, width, height, zIndex };

  const resizeHandles = [
    { dir: 'n', className: 'absolute top-0 left-2 right-2 h-1 cursor-n-resize' },
    { dir: 's', className: 'absolute bottom-0 left-2 right-2 h-1 cursor-s-resize' },
    { dir: 'e', className: 'absolute top-2 bottom-2 right-0 w-1 cursor-e-resize' },
    { dir: 'w', className: 'absolute top-2 bottom-2 left-0 w-1 cursor-w-resize' },
    { dir: 'ne', className: 'absolute top-0 right-0 w-3 h-3 cursor-ne-resize' },
    { dir: 'nw', className: 'absolute top-0 left-0 w-3 h-3 cursor-nw-resize' },
    { dir: 'se', className: 'absolute bottom-0 right-0 w-3 h-3 cursor-se-resize' },
    { dir: 'sw', className: 'absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize' },
  ];

  return (
    <div className="window absolute flex flex-col" style={windowStyle} onMouseDown={() => onFocus(id)}>
      {!maximized && resizeHandles.map((h) => (
        <div key={h.dir} className={h.className} onMouseDown={(e) => handleResizeStart(e, h.dir)} />
      ))}

      <div className="title-bar" onMouseDown={handleDragStart} style={{ cursor: maximized ? 'default' : 'move' }}>
        <div className="title-bar-text truncate pr-2">{noteTitle} - Bloco de Notas</div>
        <div className="title-bar-controls shrink-0">
          <button aria-label="Minimize" onClick={() => onMinimize(id)} />
          <button aria-label="Maximize" onClick={() => onToggleMaximize(id)} />
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col !m-[3px] overflow-hidden">
        {/* Menu bar with functional Arquivo dropdown */}
        <div className="flex items-center px-1 py-[1px] bg-[#ece9d8] border-b border-[#aca899] text-[11px] select-none relative">
          <div className="relative">
            <span
              className={`px-2 cursor-default rounded-sm ${menuOpen === 'arquivo' ? 'bg-[#316ac5] text-white' : 'hover:bg-[#316ac5] hover:text-white'}`}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === 'arquivo' ? null : 'arquivo'); }}
            >
              Arquivo
            </span>
            {menuOpen === 'arquivo' && (
              <div
                className="absolute top-full left-0 bg-white border border-[#aca899] shadow-md py-1 z-[99999] min-w-[180px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="px-4 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
                  onClick={() => { setMenuOpen(null); setShowRenameDialog(true); }}
                >
                  ✏️ Renomear nota
                </div>
                <div className="border-t border-[#e0e0e0] my-1" />
                <div
                  className="px-4 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default text-red-600 hover:!text-white"
                  onClick={() => { setMenuOpen(null); onDeleteNote?.(); }}
                >
                  🗑️ Excluir nota
                </div>
              </div>
            )}
          </div>
          <span className="px-2 hover:bg-[#316ac5] hover:text-white cursor-default rounded-sm">Editar</span>
          <span className="px-2 hover:bg-[#316ac5] hover:text-white cursor-default rounded-sm">Formatar</span>
          <span className="px-2 hover:bg-[#316ac5] hover:text-white cursor-default rounded-sm">Ajuda</span>
        </div>

        <div className="flex-1 border border-[#aca899] bg-white overflow-hidden">
          <textarea
            className="w-full h-full resize-none border-none outline-none p-1 text-sm bg-transparent"
            style={{ fontFamily: "'Lucida Console', 'Courier New', monospace", fontSize: '13px' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="status-bar !m-0 !py-1">
          <p className="status-bar-field">Ln 1, Col 1</p>
          <p className="status-bar-field">Salvo autom.</p>
          <p className="status-bar-field">UTF-8</p>
        </div>
      </div>

      {/* Rename dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 300 }} onClick={e => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">Renomear Nota</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setShowRenameDialog(false)} />
              </div>
            </div>
            <div className="window-body">
              <form onSubmit={handleRenameSubmit}>
                <p className="mb-2 text-[12px]">Novo nome:</p>
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full mb-4 px-1 border border-[#7f9db9] outline-none"
                />
                <section className="field-row" style={{ justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={!renameValue.trim()}>OK</button>
                  <button type="button" onClick={() => setShowRenameDialog(false)}>Cancelar</button>
                </section>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
