import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

const MIN_WIDTH = 450;
const MIN_HEIGHT = 350;

export default function OutlookExpressWindow({
  windowData,
  onClose,
  onMinimize,
  onToggleMaximize,
  onFocus,
  onUpdate,
  loggedUser,
  onShowAlert,
}) {
  const { t } = useTranslation();
  const { id, minimized, maximized, zIndex, x, y, width, height } = windowData;
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const subjectRef = useRef(null);

  useEffect(() => {
    setTimeout(() => subjectRef.current?.focus(), 100);
  }, []);

  const handleDragStart = useCallback((e) => {
    if (maximized) return;
    e.preventDefault();
    onFocus(id);
    const startX = e.clientX - x;
    const startY = e.clientY - y;
    const onMove = (ev) => onUpdate(id, { x: Math.max(0, ev.clientX - startX), y: Math.max(0, ev.clientY - startY) });
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [id, x, y, maximized, onFocus, onUpdate]);

  const handleResizeStart = useCallback((e, direction) => {
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
  }, [id, x, y, width, height, maximized, onFocus, onUpdate]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      onShowAlert?.(t('outlookWindow.error'), t('outlookWindow.fillFields'), 'warning');
      return;
    }

    setSending(true);
    try {
      const userName = loggedUser === 'Anônimo'
        ? 'Anônimo'
        : (loggedUser?.user_metadata?.display_name || loggedUser?.email?.split('@')[0] || 'Desconhecido');

      const { error } = await supabase.from('retronote_suggestions').insert([{
        user_id: loggedUser === 'Anônimo' ? null : loggedUser?.id,
        user_name: userName,
        subject: subject.trim().substring(0, 200),
        body: body.trim().substring(0, 2000),
      }]);

      if (error) throw error;

      setSent(true);
      setTimeout(() => onClose(id), 2500);
    } catch (err) {
      console.error('[RetroNote] Erro ao enviar sugestão:', err.message);
      onShowAlert?.(t('outlookWindow.error'), t('outlookWindow.sendError'), 'error');
    } finally {
      setSending(false);
    }
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

  if (sent) {
    return (
      <div className="window absolute flex flex-col" style={windowStyle} onMouseDown={() => onFocus(id)}>
        <div className="title-bar" onMouseDown={handleDragStart}>
          <div className="title-bar-text flex items-center gap-1">
            <img src="/Email.png" alt="" className="w-[14px] h-[14px]" />
            {t('outlookWindow.title')}
          </div>
          <div className="title-bar-controls shrink-0">
            <button aria-label="Close" onClick={() => onClose(id)} />
          </div>
        </div>
        <div className="window-body flex-1 !m-[3px] flex flex-col items-center justify-center bg-white gap-4">
          <div className="text-[48px]">✅</div>
          <p className="text-[14px] font-bold text-[#003399]">{t('outlookWindow.sentSuccess')}</p>
          <p className="text-[11px] text-gray-500">{t('outlookWindow.sentSubtext')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="window absolute flex flex-col" style={windowStyle} onMouseDown={() => onFocus(id)}>
      {!maximized && resizeHandles.map(h => (
        <div key={h.dir} className={h.cls} onMouseDown={(e) => handleResizeStart(e, h.dir)} />
      ))}

      {/* Title Bar */}
      <div className="title-bar" onMouseDown={handleDragStart} style={{ cursor: maximized ? 'default' : 'move' }}>
        <div className="title-bar-text flex items-center gap-1">
          <img src="/Email.png" alt="" className="w-[14px] h-[14px]" />
          {t('outlookWindow.title')}
        </div>
        <div className="title-bar-controls shrink-0" onMouseDown={e => e.stopPropagation()}>
          <button aria-label="Minimize" onClick={() => onMinimize(id)} />
          <button aria-label="Maximize" onClick={() => onToggleMaximize(id)} />
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col !m-[3px] overflow-hidden">
        {/* Toolbar estilo Outlook Express */}
        <div className="flex items-center bg-[#ece9d8] border-b border-[#aca899] px-1 py-[3px] gap-1 select-none">
          <button
            className="flex items-center gap-1 px-3 py-1 text-[11px] hover:bg-[#c1d2ee] border border-transparent hover:border-[#316ac5] rounded disabled:opacity-50"
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
          >
            <span className="text-[14px]">📨</span>
            {sending ? t('outlookWindow.sending') : t('outlookWindow.sendBtn')}
          </button>
          <div className="w-[1px] h-[22px] bg-[#aca899] mx-1 opacity-50" />
          <button
            className="flex items-center gap-1 px-3 py-1 text-[11px] hover:bg-[#c1d2ee] border border-transparent hover:border-[#316ac5] rounded"
            onClick={() => { setSubject(''); setBody(''); }}
          >
            <span className="text-[14px]">🗑️</span>
            {t('outlookWindow.discard')}
          </button>
        </div>

        {/* Header de E-mail estilo Outlook Express */}
        <div className="bg-white border-b border-[#d5d2c4]">
          {/* Campo "Para" (fixo) */}
          <div className="flex items-center border-b border-[#e8e6df] px-2 py-[3px]">
            <label className="text-[11px] font-bold text-[#003399] w-[70px] shrink-0 select-none">{t('outlookWindow.to')}</label>
            <div className="flex-1 bg-[#f5f5f5] border border-[#c0c0c0] px-2 py-[2px] text-[11px] text-gray-500 rounded-sm">
              RetroNote XP Team &lt;web.ti@live.com&gt;
            </div>
          </div>

          {/* Campo "Assunto" */}
          <div className="flex items-center px-2 py-[3px]">
            <label className="text-[11px] font-bold text-[#003399] w-[70px] shrink-0 select-none">{t('outlookWindow.subject')}</label>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={t('outlookWindow.subjectPlaceholder')}
              maxLength={200}
              className="flex-1 border border-[#7f9db9] px-2 py-[2px] text-[12px] outline-none focus:border-[#316ac5]"
            />
          </div>
        </div>

        {/* Corpo do E-mail */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={t('outlookWindow.bodyPlaceholder')}
            maxLength={2000}
            className="flex-1 w-full p-3 text-[12px] border-none outline-none resize-none bg-white"
            style={{ fontFamily: "'Segoe UI', 'Trebuchet MS', Arial, sans-serif", lineHeight: '1.6' }}
          />
        </div>

        {/* Barra de Status */}
        <div className="status-bar !m-0 !py-1">
          <p className="status-bar-field">{body.length}/2000</p>
          <p className="status-bar-field">{t('outlookWindow.statusReady')}</p>
        </div>
      </div>
    </div>
  );
}
