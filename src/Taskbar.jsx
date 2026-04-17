import React, { useState, useEffect } from 'react';

/**
 * Barra de tarefas estilo Windows XP Luna.
 * Props:
 *  - windows: lista de janelas abertas
 *  - onWindowClick: callback ao clicar numa janela na taskbar (minimizar/restaurar)
 */
export default function Taskbar({ 
  windows = [], 
  onWindowClick, 
  activeWindowId, 
  onToggleStartMenu, 
  onWindowContextMenu,
  loggedUser,
  onLogin
}) {
  const [time, setTime] = useState(new Date());
  const [showBalloon, setShowBalloon] = useState(false);

  const isAnon = loggedUser === 'Anônimo';

  useEffect(() => {
    if (isAnon) {
      const t = setTimeout(() => setShowBalloon(true), 2000); 
      return () => clearTimeout(t);
    } else {
      setShowBalloon(false);
    }
  }, [isAnon]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleContextMenu = (e, winId) => {
    e.preventDefault();
    e.stopPropagation();
    onWindowContextMenu?.({ x: e.clientX, y: e.clientY }, winId);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-gradient-to-b from-[#245edb] via-[#3f7df0] to-[#245edb] border-t border-[#1c4599] flex items-center justify-between z-[9999] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" onClick={() => onToggleStartMenu(false)}>
      
      {/* Start Button */}
      <div className="flex items-center h-full relative">
        <div 
          className="h-[34px] -mt-[4px] hover:brightness-110 active:brightness-90 flex items-center justify-center outline-none relative cursor-pointer" 
          onClick={(e) => { e.stopPropagation(); onToggleStartMenu(); }}
        >
          <img src="/start.png" className="h-[34px] w-auto drop-shadow-[1px_0_2px_rgba(0,0,0,0.5)]" alt="Start" />
          <span 
            className="absolute left-[38px] text-white font-bold italic text-[16px] select-none"
            style={{ 
              fontFamily: 'Tahoma, sans-serif',
              textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
              marginTop: '-2px'
            }}
          >
            Iniciar
          </span>
        </div>
      </div>

      {/* Open Windows */}
      <div className="flex-1 flex gap-[2px] px-[6px] items-center h-full overflow-hidden">
        {windows.map((win) => (
          <div
            key={win.id}
            onClick={() => onWindowClick(win.id)}
            onContextMenu={(e) => handleContextMenu(e, win.id)}
            className={`h-[24px] min-w-[50px] max-w-[160px] truncate px-3 text-[11px] text-white rounded-[2px] border border-[#1c4599] flex items-center gap-1 cursor-pointer select-none ${
              win.id === activeWindowId && !win.minimized
                ? 'bg-[#1c4599] shadow-[inset_0_0_5px_rgba(0,0,0,0.5)] brightness-75'
                : 'bg-gradient-to-b from-[#3c81d8] to-[#245edb] hover:from-[#4b9af3] hover:to-[#2e6ae5]'
            }`}
            title={win.title}
          >
            <span className="truncate">{win.title}</span>
          </div>
        ))}
      </div>

      {/* System Tray (Clock & Icons) */}
      <div className="h-[30px] flex items-center px-3 bg-gradient-to-b from-[#0997ff] to-[#0053ee] text-white border-l border-[#08216b] shadow-[inset_1px_0_1px_rgba(255,255,255,0.3)] relative">
        {/* Ícone de Alerta na Bandeja */}
        {isAnon && (
          <div 
            className="mr-3 cursor-pointer animate-pulse"
            onClick={onLogin}
            title="Atenção: Você está navegando como visitante e não há backup em nuvem salvo."
          >
            <div className="relative w-[16px] h-[16px] flex items-center justify-center">
              🛡️
              <span className="absolute -bottom-1 -right-1 text-[10px] drop-shadow-md">❌</span>
            </div>
          </div>
        )}

        <div className="text-[11px] font-sans drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)] cursor-default">
          {formatTime(time)}
        </div>

        {/* Balloon Tooltip */}
        {showBalloon && (
          <div className="absolute bottom-[35px] right-[40px] w-[260px] bg-[#ffffe1] border border-[#000000] rounded-lg p-3 shadow-[2px_2px_5px_rgba(0,0,0,0.3)] text-black font-sans z-[10000]">
            {/* Setinha apontando para baixo */}
            <div className="absolute -bottom-[8px] right-[40px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#000000]">
              <div className="absolute -top-[9px] -left-[7px] w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-[#ffffe1]"></div>
            </div>
            
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-1 font-bold text-[12px] text-[#003399]">
                <span>🛡️</span> Risco de Segurança
              </div>
              <button 
                className="w-4 h-4 bg-transparent border-none text-[#000] font-bold cursor-pointer flex items-center justify-center hover:bg-[#ffe1e1] pb-1"
                onClick={() => setShowBalloon(false)}
              >
                x
              </button>
            </div>
            
            <p className="text-[11px] leading-tight m-0 mb-2">
              Seus dados não estão protegidos. Arquivos criados no modo Visitante podem ser perdidos a qualquer momento.
            </p>
            <p 
              className="text-[11px] text-blue-700 underline cursor-pointer m-0 hover:text-blue-900"
              onClick={() => {
                setShowBalloon(false);
                onLogin();
              }}
            >
              Clique aqui para sair e criar uma conta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
