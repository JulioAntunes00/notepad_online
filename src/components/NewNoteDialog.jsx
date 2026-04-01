import React, { useState, useEffect, useRef } from 'react';

export default function NewNoteDialog({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/20 select-none">
      <div className="window" style={{ width: '300px' }} onClick={(e) => e.stopPropagation()}>
        <div className="title-bar">
          <div className="title-bar-text">Nova Nota</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>
        <div className="window-body">
          <form onSubmit={handleSubmit}>
            <p className="mb-2">Nome do Bloco de Notas:</p>
            <input 
              ref={inputRef}
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full mb-4 px-1 border border-[#7f9db9] outline-none"
            />
            <section className="field-row" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" disabled={!name.trim()}>OK</button>
              <button type="button" onClick={onClose}>Cancelar</button>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
}
