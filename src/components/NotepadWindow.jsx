import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';

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
  onCreateNote,
  onShareNote,
  onShowAlert,
}) {
  const { t } = useTranslation();
  const { id, minimized, maximized, zIndex, x, y, width, height } = windowData;
  const [text, setText] = useState(initialContent || '');
  const [menuOpen, setMenuOpen] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false });

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic')
    });
  };

  // Refs para guardar os valores mais recentes para usar nos event listeners
  const latestText = useRef(text);
  const latestOnContentChange = useRef(onContentChange);
  useEffect(() => {
    latestText.current = text;
    latestOnContentChange.current = onContentChange;
  });

  // Autosave debounce com indicador visual
  useEffect(() => {
    if (text !== initialContent) {
      setIsSaving(true);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onContentChange?.(text);
        // Após o salvamento, esperamos mais 500ms para sumir o indicador
        setTimeout(() => setIsSaving(false), 500);
      }, 500);
    }
    return () => clearTimeout(debounceTimerRef.current);
  }, [text, initialContent, onContentChange]);

  // Força o salvamento ao trocar de aba ou fechar a janela
  useEffect(() => {
    const forceSave = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (latestText.current !== initialContent) {
        latestOnContentChange.current?.(latestText.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') forceSave();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      forceSave(); // Salva ao desmontar o componente (fechar a janela)
    };
  }, [initialContent]);
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

  const handleShare = async () => {
    // Compartilhamento temporariamente desativado
    onShowAlert?.('Aviso', 'O compartilhamento está desativado no momento.', 'info');
  };

  const editorRef = React.useRef(null);
  const mountInjected = React.useRef(false);

  // Injeção de conteúdo apenas na montagem inicial (Evita o apagão ao voltar para a aba)
  useEffect(() => {
    if (editorRef.current && !mountInjected.current) {
      // Sanitiza o HTML antes de injetar no DOM (Proteção contra XSS)
      editorRef.current.innerHTML = DOMPurify.sanitize(initialContent || '');
      mountInjected.current = true;
      setText(initialContent || '');
    }
  }, [initialContent]);

  const handleInput = (e) => {
    const htmlText = DOMPurify.sanitize(e.currentTarget.innerHTML);
    setText(htmlText);

    // updateActiveFormats chamado para manter o visual dos botões sincronizado durante a digitação
    updateActiveFormats();
  };

  const execCmd = (cmd) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, null);
    // Pequeno atraso para garantir que o navegador atualizou o estado interno
    requestAnimationFrame(() => {
      updateActiveFormats();
    });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Função recursiva para limpar elementos e manter apenas as tags permitidas
      const cleanNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tagName = node.tagName.toLowerCase();
        const allowedTags = ['b', 'strong', 'i', 'em', 'br'];
        const blockTags = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'];

        let childrenContent = '';
        node.childNodes.forEach(child => {
          childrenContent += cleanNode(child);
        });

        if (allowedTags.includes(tagName)) {
          return `<${tagName}>${childrenContent}</${tagName}>`;
        }

        // Se for um bloco (p, div, etc), adicionamos uma quebra de linha após o conteúdo dele
        if (blockTags.includes(tagName)) {
          return `<div>${childrenContent}</div>`;
        }

        return childrenContent;
      };

      const cleanedHtml = cleanNode(doc.body);
      document.execCommand('insertHTML', false, cleanedHtml || text.replace(/\n/g, '<br>'));
    } else {
      document.execCommand('insertHTML', false, text.replace(/\n/g, '<br>'));
    }
  };

  const handleDownloadNote = (format = 'txt') => {
    const isDoc = format === 'doc';
    const content = isDoc ? editorRef.current.innerHTML : editorRef.current.innerText;
    const mimeType = isDoc ? 'application/msword' : 'text/plain;charset=utf-8';

    // Para Word (.doc), envolvemos em um HTML básico para garantir que reconheça a formatação
    const finalContent = isDoc
      ? `<html><head><meta charset="utf-8"></head><body>${content}</body></html>`
      : content;

    const blob = new Blob([finalContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = windowData.title.replace(` - ${t('notepadWindow.suffix')}`, '');
    link.download = `${cleanTitle || 'nota'}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMenuOpen(null);
  };

  const windowStyle = minimized
    ? { display: 'none' }
    : maximized
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
        <div className="title-bar-text truncate pr-2">
          {noteTitle} - {t('notepadWindow.suffix')}
        </div>
        <div className="title-bar-controls shrink-0">
          <button aria-label="Minimize" onClick={() => onMinimize(id)} />
          <button aria-label="Maximize" onClick={() => onToggleMaximize(id)} />
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col !m-[3px] overflow-hidden">
        {/* Menu bar estilo Windows XP com Barra de Ferramentas */}
        <div className="flex items-center px-1 py-[2px] bg-[#ece9d8] border-b border-[#aca899] text-[11px] select-none relative h-[26px]">
          <div className="relative h-full flex items-center mr-2">
            <span
              className={`px-2 h-full flex items-center cursor-default ${menuOpen === 'arquivo' ? 'bg-[#316ac5] text-white' : 'hover:bg-[#316ac5] hover:text-white'}`}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === 'arquivo' ? null : 'arquivo'); }}
            >
              {t('notepadWindow.file')}
            </span>
            {menuOpen === 'arquivo' && (
              <div
                className="absolute top-full left-0 bg-[#ffffff] border border-[#716f64] shadow-[2px_2px_2px_rgba(0,0,0,0.3)] py-[2px] z-[99999] min-w-[150px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="px-6 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
                  onClick={() => { setMenuOpen(null); onCreateNote?.(); }}
                >
                  {t('notepadWindow.new')}
                </div>
                <div className="border-t border-[#aca899] mx-1 my-[2px]" />
                <div
                  className="px-6 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
                  onClick={() => { setMenuOpen(null); setShowRenameDialog(true); }}
                >
                  {t('notepadWindow.rename')}
                </div>
                <div
                  className="px-6 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
                  onClick={() => handleDownloadNote('txt')}
                >
                  {t('notepadWindow.saveAsTxt')}
                </div>
                <div
                  className="px-6 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
                  onClick={() => handleDownloadNote('doc')}
                >
                  {t('notepadWindow.saveAsWord')}
                </div>
                <div className="border-t border-[#aca899] mx-1 my-[2px]" />
                <div
                  className="px-6 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default"
                  onClick={() => { setMenuOpen(null); onDeleteNote?.(); }}
                >
                  {t('notepadWindow.delete')}
                </div>
              </div>
            )}
          </div>

          <span
            className="px-2 h-full flex items-center hover:bg-[#316ac5] hover:text-white cursor-pointer mr-4"
            onClick={handleShare}
          >
            {t('notepadWindow.share')}
          </span>

          {/* Barra de Ferramentas WordPad (B, I) */}
          <div className="flex items-center gap-1 border-l border-[#aca899] pl-2 h-[80%]">
            <button
              className={`w-6 h-6 flex items-center justify-center font-bold text-[13px] border ${activeFormats.bold ? 'bg-[#d4d0c8] border-[#aca899] shadow-inner' : 'border-transparent hover:border-[#aca899] hover:bg-[#f0f0f0]'} active:shadow-inner`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                execCmd('bold');
              }}
              title="Negrito"
            >B</button>
            <button
              className={`w-6 h-6 flex items-center justify-center italic text-[13px] border ${activeFormats.italic ? 'bg-[#d4d0c8] border-[#aca899] shadow-inner' : 'border-transparent hover:border-[#aca899] hover:bg-[#f0f0f0]'} active:shadow-inner`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                execCmd('italic');
              }}
              title="Itálico"
            >I</button>
          </div>
        </div>

        <div className="flex-1 border border-[#aca899] bg-white overflow-y-auto">
          <div
            ref={editorRef}
            contentEditable
            className="w-full min-h-full outline-none p-2 text-sm bg-transparent"
            style={{ fontFamily: "'Lucida Console', 'Courier New', monospace", fontSize: '13px' }}
            onInput={handleInput}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onPaste={handlePaste}
            spellCheck={false}
          />
        </div>

        <div className="status-bar !m-0 !py-1">
          <p className="status-bar-field">Ln 1, Col 1</p>
          <p className="status-bar-field flex items-center gap-1 min-w-[100px]">
            {isSaving ? (
              <>
                <span>💾</span>
                <span>{t('notepadWindow.saving')}</span>
              </>
            ) : (
              <span>{t('notepadWindow.savedAuto')}</span>
            )}
          </p>
          <p className="status-bar-field">UTF-8</p>
        </div>
      </div>

      {/* Rename dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 300 }} onClick={e => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">{t('notepadWindow.renameNote')}</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setShowRenameDialog(false)} />
              </div>
            </div>
            <div className="window-body">
              <form onSubmit={handleRenameSubmit}>
                <p className="mb-2 text-[12px]">{t('notepadWindow.newName')}</p>
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full mb-4 px-1 border border-[#7f9db9] outline-none"
                />
                <section className="field-row" style={{ justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={!renameValue.trim()}>{t('notepadWindow.ok')}</button>
                  <button type="button" onClick={() => setShowRenameDialog(false)}>{t('notepadWindow.cancel')}</button>
                </section>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
