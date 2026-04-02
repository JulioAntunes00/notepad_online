import React, { useState, useEffect } from 'react';

/**
 * Barra de tarefas estilo Windows XP Luna.
 * Props:
 *  - windows: lista de janelas abertas
 *  - onWindowClick: callback ao clicar numa janela na taskbar (minimizar/restaurar)
 */
export default function Taskbar({ windows = [], onWindowClick, activeWindowId }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-gradient-to-b from-[#245edb] via-[#3f7df0] to-[#245edb] border-t border-[#1c4599] flex items-center justify-between z-[9999] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
      
      {/* Start Button */}
      <div className="flex items-center h-full">
        <button 
          className="h-[34px] px-4 -mt-[4px] text-white font-bold italic shadow-[1px_0_4px_rgba(0,0,0,0.5)] rounded-tr-[12px] rounded-br-[12px] bg-gradient-to-b from-[#3ba245] via-[#2f8832] to-[#206722] hover:brightness-110 active:brightness-90 border-r border-[#1b611e] flex items-center gap-1" 
          style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.7)' }}
        >
          <img src="https://win98icons.alexmeub.com/icons/png/windows_flag-0.png" className="w-[22px] h-[18px] filter drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)]" alt="flag" />
          <span className="text-[17px] tracking-tight leading-none font-sans italic pr-2">start</span>
        </button>
      </div>

      {/* Open Windows */}
      <div className="flex-1 flex gap-[2px] px-[6px] items-center h-full overflow-hidden">
        {windows.map((win) => (
          <button
            key={win.id}
            onClick={() => onWindowClick(win.id)}
            className={`h-[24px] min-w-[50px] max-w-[160px] truncate px-3 text-[11px] text-white rounded-[2px] border border-[#1c4599] flex items-center gap-1 ${
              win.id === activeWindowId && !win.minimized
                ? 'bg-[#1c4599] shadow-[inset_0_0_5px_rgba(0,0,0,0.5)] brightness-75'
                : 'bg-gradient-to-b from-[#3c81d8] to-[#245edb] hover:from-[#4b9af3] hover:to-[#2e6ae5]'
            }`}
            title={win.title}
          >
            <span className="truncate">{win.title}</span>
          </button>
        ))}
      </div>

      {/* System Tray (Clock) */}
      <div className="h-full flex items-center px-4 bg-gradient-to-b from-[#0997ff] to-[#0053ee] text-white border-l border-[#08216b] shadow-[inset_1px_0_1px_rgba(255,255,255,0.3)]">
        <div className="text-[11px] font-sans drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
}
