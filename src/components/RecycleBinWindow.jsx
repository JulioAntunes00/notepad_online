import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation();

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
    const loc = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR';
    return d.toLocaleDateString(loc) + ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  };

  const daysLeft = (ts) => {
    if (!ts) return t('recycleBinWindow.daysLeft', { count: 3 });
    const deleteDate = new Date(ts).getTime();
    if (isNaN(deleteDate)) return t('recycleBinWindow.daysLeft', { count: 3 });
    
    const remaining = 3 - ((Date.now() - deleteDate) / (24 * 60 * 60 * 1000));
    if (remaining < 0) return t('recycleBinWindow.expiring');
    if (remaining < 1) return t('recycleBinWindow.lessThanDay');
    return t('recycleBinWindow.daysLeft', { count: Math.ceil(remaining) });
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
        <div className="title-bar-text">{t('recycleBinWindow.title')}</div>
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
            🗑️ {t('recycleBinWindow.emptyTrash')}
          </button>
          <span className="text-[#808080]">|</span>
          <span>{t('recycleBinWindow.itemsCount', { count: visibleItems.length })}</span>
        </div>

        <div className="flex items-center bg-[#ece9d8] border-b border-[#aca899] text-[11px] font-bold select-none px-2 py-[2px]">
          <span className="flex-1">{t('recycleBinWindow.name')}</span>
          <span className="w-[130px] text-center">{t('recycleBinWindow.deletedAt')}</span>
          <span className="w-[100px] text-center">{t('recycleBinWindow.expiresIn')}</span>
          <span className="w-[80px] text-center">{t('recycleBinWindow.action')}</span>
        </div>

        <div className="flex-1 bg-white overflow-y-auto">
          {visibleItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#808080] text-sm">
              {t('recycleBinWindow.empty')}
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
                    {t('recycleBinWindow.restore')}
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        <div className="status-bar !m-0 !py-1">
          <p className="status-bar-field">{t('recycleBinWindow.objects', { count: visibleItems.length })}</p>
          <p className="status-bar-field">{t('recycleBinWindow.autoDelete')}</p>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 320 }} onClick={e => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">{t('recycleBinWindow.confirmTitle')}</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setShowConfirm(false)} />
              </div>
            </div>
            <div className="window-body !m-[3px]">
              <div className="flex gap-3 items-start">
                <span className="text-3xl">⚠️</span>
                <p className="text-[12px]">
                  {t('recycleBinWindow.confirmText')}<br />
                  <strong>{t('recycleBinWindow.confirmWarning')}</strong>
                </p>
              </div>
              <section className="field-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => { onEmptyTrash(); setShowConfirm(false); }}>{t('recycleBinWindow.yes')}</button>
                <button onClick={() => setShowConfirm(false)}>{t('recycleBinWindow.no')}</button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
