import React from 'react';

export default function AboutWindow({ windowData, onClose }) {
  const { title, x, y, width, height, zIndex } = windowData;

  return (
    <div
      className="window absolute flex flex-col select-none pointer-events-auto"
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
        zIndex: zIndex
      }}
    >
      <div className="title-bar" onMouseDown={(e) => e.stopPropagation()}>
        <div className="title-bar-text px-1 flex items-center gap-1">
          <img src="/Help and Support.png" alt="Help" className="w-[14px] h-[14px]" />
          {title}
        </div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={() => onClose(windowData.id)} />
        </div>
      </div>

      <div className="window-body flex-1 p-0 overflow-y-auto m-0 bg-white border border-[#7f9db9]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-5 font-sans text-[12px] text-black leading-relaxed">
          <h1 className="text-[24px] font-bold mb-4 font-serif text-[#003399]">RetroNote XP</h1>
          
          <p className="mb-4">
            Uma aplicação web de bloco de notas que emula a interface clássica do Windows XP, 
            integrando funcionalidades de persistência em nuvem e gerenciamento avançado de janelas.
          </p>

          <h2 className="text-[16px] font-bold mt-6 mb-2 border-b border-gray-300 pb-1 text-[#003399]">Arquitetura e Tecnologias</h2>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li><strong>Frontend:</strong> React + Vite para um ambiente de desenvolvimento rápido e bundles otimizados.</li>
            <li><strong>Estilização:</strong> Tailwind CSS + XP.css para a base dos componentes clássicos, garantindo fidelidade visual.</li>
            <li><strong>Estado e Janelas:</strong> Hook customizado <code>useWindowManager</code> para controle de z-index, minimização e restauração de janelas sem perda de estado do componente (mantendo conteúdo em memória dinamicamente).</li>
            <li><strong>Persistência Remota:</strong> Supabase (PostgreSQL & Auth) com políticas de Row Level Security (RLS) para proteção de dados por usuário. Ninguém altera ou lê dados alheios.</li>
            <li><strong>Resiliência Local:</strong> Implementação robusta de <code>localStorage</code> para modo "Visitante" (Anônimo), permitindo uso instantâneo offline-first.</li>
          </ul>

          <h2 className="text-[16px] font-bold mt-6 mb-2 border-b border-gray-300 pb-1 text-[#003399]">Destaques Técnicos</h2>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li><strong>Gerenciador de Janelas Próprio:</strong> Construído do zero sem bibliotecas pesadas de drag-and-drop de terceiros, permitindo controle fino do DOM para a sobreposição de divs em estilo "Desktop".</li>
            <li><strong>Otimização de Renderização:</strong> Uso de <code>display: none</code> na minimização em vez de desmontagem de componente (unmount) preserva estados complexos do React.</li>
            <li><strong>Sincronização Segura:</strong> Uso assíncrono controlado ao salvar notas para minimizar requests no backend (Debounce/Interval).</li>
          </ul>

          <div className="mt-8 p-3 bg-[#ffffe1] border border-[#716f64] text-[11px]">
            <strong>Nota aos recrutadores e desenvolvedores:</strong><br />
            Este projeto demonstra capacidade de criar interfaces complexas não-convencionais (Desktop-on-Web), 
            gerenciamento de estado global avançado e integração segura com BaaS.
          </div>
        </div>
      </div>
    </div>
  );
}
