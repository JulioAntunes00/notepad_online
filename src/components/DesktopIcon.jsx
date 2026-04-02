import React, { useState, useRef, useEffect } from 'react';

/**
 * Ícone de desktop estilo Windows XP.
 * @param {string} label - Nome exibido abaixo do ícone
 * @param {string} iconSrc - URL/path da imagem do ícone
 * @param {function} onClick - Callback ao dar um clique
 * @param {function} onRename - Callback para renomear, recebe novo string (opcional)
 */
export default function DesktopIcon({ label, iconSrc, onClick, onRename, isLarge = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
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
    if (onRename) {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  const handleWrapperKeyDown = (e) => {
    if (e.key === 'F2' && !isEditing && onRename) {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex flex-col items-center w-20 p-1 rounded focus:outline-none group select-none"
      onClick={handleClick}
      onKeyDown={handleWrapperKeyDown}
      onContextMenu={handleContextMenu}
      title={onRename ? `${label} (F2 ou Botão Direito para Renomear)` : label}
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
  );
}
