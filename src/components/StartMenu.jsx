import React from 'react';

export default function StartMenu({
  loggedUser,
  onClose,
  onCreateNote,
  onOpenRecycleBin,
  onLogout,
  onLogin
}) {
  return (
    <div 
      className="absolute bottom-[30px] left-0 overflow-hidden flex flex-col z-[10000] shadow-[4px_4px_10px_rgba(0,0,0,0.5)] select-none"
      style={{
        backgroundImage: "url('/menu iniciar.png')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        width: '242px',
        height: '580px',
        backgroundColor: 'transparent'
      }}
    >
      {/* Single Column Area to prevent truncation */}
      <div className="absolute top-0 left-0 w-full h-[92%] flex flex-col pt-[105px] px-4">
        
        <div 
          className="w-full h-[50px] mb-1 cursor-pointer hover:bg-black/5 rounded flex items-center px-2"
          onClick={() => { onCreateNote(); onClose(); }}
          title="Bloco de Notas"
        >
          <div className="w-full h-full flex items-center gap-3">
            <img src="/Notepad.png" className="w-[32px] h-[32px] shrink-0" alt="Notepad" />
            <div className="flex flex-col">
              <span className="font-bold text-[12px] leading-tight flex-nowrap whitespace-nowrap" style={{ fontFamily: 'Tahoma, sans-serif' }}>Bloco de Notas</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Bar (Logout) */}
      <div className="absolute bottom-[5px] right-0 w-full h-[35px] flex justify-end items-center pr-2">
        <div 
          className="cursor-pointer hover:brightness-110 active:brightness-90 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/20"
          onClick={() => { 
            if (loggedUser) onLogout(); 
            else onLogin(); 
             onClose(); 
          }}
          title={loggedUser ? "Fazer Logout" : "Fazer Login"}
        >
          <img src="/Power.png" className="w-[18px] h-[18px]" alt="Sair" />
          <span className="text-white text-[10px] font-bold drop-shadow-[1px_1px_1px_black]">
            {loggedUser ? "Sair" : "Entrar"}
          </span>
        </div>
      </div>

    </div>
  );
}
