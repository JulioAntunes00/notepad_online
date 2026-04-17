import React, { useState } from 'react';

export default function RecycleBinWindow({
  windowData,
  onClose,
  onMinimize,
  onToggleMaximize,
  onFocus,
  onUpdate,
  trashItems,
  onRestore,
  onEmptyTrash,
}) {
  const { id, minimized, maximized, zIndex, x, y, width, height } = windowData;
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleResizeStart = (e, direction) => {
    if (maximized) return;
    e.preventDefault(); e.stopPropagation(); onFocus(id);
    const startMouseX = e.clientX, startMouseY = e.clientY;
    const sX = x, sY = y, sW = width, sH = height;
    const onMove = (ev) => {
      const dx = ev.clientX - startMouseX, dy = ev.clientY - startMouseY;
      const u = {};
      if (direction.includes('e')) u.width = Math.max(350, sW + dx);
      if (direction.includes('s')) u.height = Math.max(250, sH + dy);
      if (direction.includes('w')) { const nW = Math.max(350, sW - dx); u.width = nW; u.x = sX + (sW - nW); }
      if (direction.includes('n')) { const nH = Math.max(250, sH - dy); u.height = nH; u.y = sY + (sH - nH); }
      onUpdate(id, u);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const windowStyle = minimized
    ? { display: 'none' }
    : maximized
      ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 32px)', zIndex }
      : { top: y, left: x, width, height, zIndex };

  const resizeHandles = [
    { dir: 'n', cls: 'absolute top-0 left-2 right-2 h-1 cursor-n-resize' },
    { dir: 's', cls: 'absolute bottom-0 left-2 right-2 h-1 cursor-s-resize' },
    { dir: 'e', cls: 'absolute top-2 bottom-2 right-0 w-1 cursor-e-resize' },
    { dir: 'w', cls: 'absolute top-2 bottom-2 left-0 w-1 cursor-w-resize' },
    { dir: 'ne', cls: 'absolute top-0 right-0 w-3 h-3 cursor-ne-resize' },
    { dir: 'nw', cls: 'absolute top-0 left-0 w-3 h-3 cursor-nw-resize' },
    { dir: 'se', cls: 'absolute bottom-0 right-0 w-3 h-3 cursor-se-resize' },
    { dir: 'sw', cls: 'absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize' },
  ];

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const daysLeft = (ts) => {
    if (!ts) return '3 dias';
    const deleteDate = new Date(ts).getTime();
    if (isNaN(deleteDate)) return '3 dias';
    
    const remaining = 3 - ((Date.now() - deleteDate) / (24 * 60 * 60 * 1000));
    if (remaining < 0) return 'Expirando...';
    if (remaining < 1) return 'Menos de 1 dia';
    return `${Math.ceil(remaining)} dia(s)`;
  };

  // Só mostra itens "raiz" (iguala ao Windows: pasta deletada aparece sozinha, filhos ficam escondidos)
  const trashIds = new Set(trashItems.map(t => t.id));
  const visibleItems = trashItems.filter(item => !item.folder_id || !trashIds.has(item.folder_id));

  return (
    <div className="window absolute flex flex-col" style={windowStyle} onMouseDown={() => onFocus(id)}>
      {!maximized && resizeHandles.map(h => (
        <div key={h.dir} className={h.cls} onMouseDown={(e) => handleResizeStart(e, h.dir)} />
      ))}

      <div className="title-bar" onMouseDown={handleDragStart} style={{ cursor: maximized ? 'default' : 'move' }}>
        <div className="title-bar-text">Lixeira</div>
        <div className="title-bar-controls shrink-0">
          <button aria-label="Minimize" onClick={() => onMinimize(id)} />
          <button aria-label="Maximize" onClick={() => onToggleMaximize(id)} />
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col !m-[3px] overflow-hidden bg-[#ece9d8]">
        <div className="flex items-center gap-2 px-2 py-1 bg-[#ece9d8] border-b border-[#aca899] text-[11px] select-none">
          <button
            className="px-3 py-0.5 text-[11px]"
            onClick={() => {
              if (trashItems.length > 0) setShowConfirm(true);
            }}
            disabled={trashItems.length === 0}
          >
            🗑️ Esvaziar Lixeira
          </button>
          <span className="text-[#808080]">|</span>
          <span>{visibleItems.length} item(ns)</span>
        </div>

        <div className="flex items-center bg-[#ece9d8] border-b border-[#aca899] text-[11px] font-bold select-none px-2 py-[2px]">
          <span className="flex-1">Nome</span>
          <span className="w-[130px] text-center">Excluído em</span>
          <span className="w-[100px] text-center">Expira em</span>
          <span className="w-[80px] text-center">Ação</span>
        </div>

        <div className="flex-1 bg-white overflow-y-auto">
          {visibleItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#808080] text-sm">
              A Lixeira está vazia.
            </div>
          ) : (
            visibleItems.map(item => (
              <div key={item.id} className="flex items-center px-2 py-1 border-b border-[#f0f0f0] text-[12px] hover:bg-[#e8e8e8]">
                <span className="flex-1 truncate">{item.item_type === 'folder' ? '📁' : '📄'} {item.title}</span>
                <span className="w-[130px] text-center text-[#808080]">{formatDate(item.deleted_at || item.deletedAt)}</span>
                <span className="w-[100px] text-center text-[#808080]">{daysLeft(item.deleted_at || item.deletedAt)}</span>
                <span className="w-[80px] text-center">
                  <button
                    className="text-[11px] px-2 py-0.5"
                    onClick={() => onRestore(item.id)}
                  >
                    Restaurar
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        <div className="status-bar !m-0 !py-1">
          <p className="status-bar-field">{visibleItems.length} objeto(s)</p>
          <p className="status-bar-field">Exclusão automática: 3 dias</p>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 320 }} onClick={e => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">Confirmar exclusão</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setShowConfirm(false)} />
              </div>
            </div>
            <div className="window-body !m-[3px]">
              <div className="flex gap-3 items-start">
                <span className="text-3xl">⚠️</span>
                <p className="text-[12px]">
                  Tem certeza que deseja esvaziar a Lixeira?<br />
                  <strong>Esta ação não pode ser desfeita.</strong>
                </p>
              </div>
              <section className="field-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => { onEmptyTrash(); setShowConfirm(false); }}>Sim</button>
                <button onClick={() => setShowConfirm(false)}>Não</button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
