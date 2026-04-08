import React, { useState, useRef, useEffect } from 'react';

/**
 * Ícone de desktop estilo Windows XP.
 * @param {string} label - Nome exibido abaixo do ícone
 * @param {string} iconSrc - URL/path da imagem do ícone
 * @param {function} onClick - Callback ao dar um clique
 * @param {function} onRename - Callback para renomear, recebe novo string (opcional)
 */
export default function DesktopIcon({ id, type, label, iconSrc, onClick, onRename, onDuplicate, onDelete, onEmptyTrash, menuPos, onContextMenu, onCloseMenu, isLarge = false, onDropItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditLabel(label);
  }, [label]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleClick = (e) => {
    if (isEditing) return;
    e.stopPropagation();
    onClick();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (editLabel.trim() && editLabel !== label) {
        onRename?.(editLabel.trim());
      } else {
        setEditLabel(label);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditLabel(label);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editLabel.trim() && editLabel !== label) {
      onRename?.(editLabel.trim());
    } else {
      setEditLabel(label);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    onContextMenu?.({ x: e.clientX, y: e.clientY });
  };

  const handleWrapperKeyDown = (e) => {
    if (e.key === 'F2' && !isEditing && onRename) {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  const handleDragStart = (e) => {
    if (id && type) {
      e.dataTransfer.setData('application/json', JSON.stringify({ id, type }));
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e) => {
    if (type === 'folder' || onDropItem) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (!isDragOver) setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    if (type === 'folder' || onDropItem) {
      e.stopPropagation();
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    if (type === 'folder' || onDropItem) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data && data.id) {
          // Avoid self-drop or moving a folder into itself
          if (data.id === id) return;
          if (onDropItem) onDropItem(data.id, data.type);
        }
      } catch (err) {
        // Ignorar
      }
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        draggable={!!(id && type && !isEditing)}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center w-20 p-1 rounded focus:outline-none group select-none relative ${isDragOver ? 'bg-blue-500/30' : ''}`}
        onClick={handleClick}
        onKeyDown={handleWrapperKeyDown}
        onContextMenu={handleContextMenu}
        title={onRename ? `${label} (Botão Direito para opções)` : label}
      >
        <img
          src={iconSrc}
          alt={label}
          className={`${isLarge ? 'w-[77px] h-auto' : 'w-12 h-auto'} drop-shadow-[1px_2px_2px_rgba(0,0,0,0.5)] group-focus:brightness-75`}
          draggable={false}
        />
        {isEditing ? (
          <input
            ref={inputRef}
            className="mt-1 text-[11px] text-black text-center w-full border border-blue-500 bg-white"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="mt-1 text-[11px] text-white text-center leading-tight px-1 group-focus:bg-[#316ac5] group-focus:text-white rounded-sm break-words max-w-[80px]"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}
          >
            {label}
          </span>
        )}
      </div>

      {menuPos && (
        <div
          className="fixed bg-[#ece9d8] border border-[#716f64] shadow-[2px_2px_4px_rgba(0,0,0,0.5)] py-[2px] z-[99999] min-w-[120px]"
          style={{ top: menuPos.y, left: menuPos.x }}
          onClick={(e) => {
            e.stopPropagation();
            onCloseMenu?.();
          }}
        >
          <div className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default font-bold" onClick={() => { onClick?.(); onCloseMenu?.(); }}>Abrir</div>
          
          {onEmptyTrash && (
            <>
              <div className="border-t border-[#aca899] my-[2px] mx-1" />
              <div className="px-5 py-1 text-[11px] hover:bg-[#316ac5] hover:text-white cursor-default" onClick={() => onEmptyTrash()}>Esvaziar Lixeira</div>
            </>
          )}

          <div className="border-t border-[#aca899] my-[2px] mx-1" />
          
          {!onEmptyTrash && (
            <>
              <div 
                className={`px-5 py-1 text-[11px] cursor-default ${onDuplicate ? 'hover:bg-[#316ac5] hover:text-white' : 'text-gray-400'}`} 
                onClick={() => { if (onDuplicate) onDuplicate?.(); }}
              >
                Duplicar
              </div>
              <div 
                className={`px-5 py-1 text-[11px] cursor-default ${onDelete ? 'hover:bg-[#316ac5] hover:text-white' : 'text-gray-400'}`} 
                onClick={() => { if (onDelete) onDelete?.(); }}
              >
                Deletar
              </div>
              <div 
                className={`px-5 py-1 text-[11px] cursor-default ${onRename ? 'hover:bg-[#316ac5] hover:text-white' : 'text-gray-400'}`} 
                onClick={() => { if (onRename) setIsEditing(true); }}
              >
                Renomear
              </div>
              <div className="px-5 py-1 text-[11px] text-gray-400 cursor-default">Compartilhar</div>
            </>
          )}
        </div>
      )}
    </>
  );
}
