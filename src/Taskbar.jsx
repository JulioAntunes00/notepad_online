import React, { useState, useEffect } from 'react';

/**
 * Barra de tarefas estilo Windows XP Luna.
 * Props:
 *  - windows: lista de janelas abertas
 *  - onWindowClick: callback ao clicar numa janela na taskbar (minimizar/restaurar)
 */
export default function Taskbar({ windows = [], onWindowClick }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-[#245edb] via-[#3f7df0] to-[#245edb] border-t border-[#1c4599] flex items-center justify-between z-[9999] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
      
      {/* Start Button */}
      <div className="flex items-end h-full relative">
        <button 
          className="absolute bottom-0 left-0 h-10 px-5 text-white font-bold italic shadow-[2px_3px_3px_rgba(0,0,0,0.5)] rounded-r-xl rounded-l-sm bg-gradient-to-b from-[#3ba245] via-[#2f8832] to-[#206722] hover:brightness-110 active:brightness-90 border border-[#1b611e] flex items-center gap-2" 
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
        >
          <img src="https://upload.wikimedia.org/wikipedia/en/thumb/5/5f/Windows_logo_-_2001.svg/300px-Windows_logo_-_2001.svg.png" className="w-5 h-5 drop-shadow-md" alt="Windows Logo" />
          <span className="text-xl leading-none font-['Trebuchet_MS'] pr-2">start</span>
        </button>
      </div>

      {/* Open Windows */}
      <div className="flex-1 ml-32 flex gap-1 px-2 items-center h-full overflow-hidden">
        {windows.map((win) => (
          <button
            key={win.id}
            onClick={() => onWindowClick(win.id)}
            className={`h-6 max-w-[180px] truncate px-3 text-[11px] text-white rounded-sm border border-[#1c4599] flex items-center gap-1 ${
              win.minimized
                ? 'bg-gradient-to-b from-[#3c69a7] to-[#3174c2] opacity-70'
                : 'bg-gradient-to-b from-[#3c81d8] to-[#245edb] shadow-[inset_0_0_4px_rgba(0,0,0,0.3)]'
            }`}
            title={win.title}
          >
            <span className="truncate">{win.title}</span>
          </button>
        ))}
      </div>

      {/* System Tray */}
      <div className="h-full flex items-center px-4 space-x-3 bg-gradient-to-b from-[#0e51cc] to-[#1281e8] text-white border-l border-[#092e7c] shadow-[inset_1px_0_1px_rgba(255,255,255,0.3)]">
        <div className="text-xs font-sans drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]">
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
}
