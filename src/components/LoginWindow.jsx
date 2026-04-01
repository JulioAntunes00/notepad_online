import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginWindow({
  windowData,
  onClose,
  onFocus,
  onUpdate,
  onLogin,
}) {
  const { id, minimized, zIndex, x, y, width, height } = windowData;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAnonAlert, setShowAnonAlert] = useState(false);

  // ── Drag ──
  const handleDragStart = (e) => {
    e.preventDefault();
    onFocus(id);
    const startX = e.clientX - x;
    const startY = e.clientY - y;
    const onMove = (ev) => onUpdate(id, { x: Math.max(0, ev.clientX - startX), y: Math.max(0, ev.clientY - startY) });
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError(''); setSuccess('');
    if (!username || !password) return setError('Preencha login e senha.');

    try {
      const email = username.includes('@') ? username : `${username.toLowerCase().replace(/\s+/g, '')}@retronote.local`;
      const { data, error: sbErr } = await supabase.auth.signInWithPassword({ email, password });
      
      if (sbErr) return setError('Login ou senha incorretos.');
      
      if (data.user) {
        setSuccess(`Autenticado com sucesso.`);
        setTimeout(() => onLogin(data.user), 600);
      }
    } catch { setError('Erro de comunicação.'); }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError(''); setSuccess('');
    if (!username || !password) return setError('Preencha login e senha para criar conta.');

    try {
      const email = username.includes('@') ? username : `${username.toLowerCase().replace(/\s+/g, '')}@retronote.local`;
      const { data, error: insErr } = await supabase.auth.signUp({ email, password });
      
      if (insErr) {
        if (insErr.message.includes('already registered')) return setError('Usuário já existe.');
        if (insErr.message.includes('Password should be')) return setError('A senha deve ter 6+ chars.');
        throw insErr;
      }

      setSuccess('Cadastrado com sucesso!');
      setTimeout(() => onLogin(data.user), 1000);
    } catch { setError('Erro ao comunicar com provedor.'); }
  };

  const confirmAnonymous = () => {
    setShowAnonAlert(false);
    onLogin('Anônimo');
  };

  if (minimized) return null;

  return (
    <div className="window absolute flex flex-col shadow-[2px_2px_15px_rgba(0,0,0,0.5)]" style={{ top: y, left: x, width, height, zIndex }} onMouseDown={() => onFocus(id)}>
      <div className="title-bar" onMouseDown={handleDragStart}>
        <div className="title-bar-text">Identificação do Sistema</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>
      
      <div className="window-body flex-1 m-[3px] bg-[#ece9d8] flex flex-col p-4 relative overflow-hidden">
        {showAnonAlert ? (
          <div className="flex flex-col h-full justify-between">
            <div className="flex gap-4 items-start">
              <span className="text-4xl leading-none">⚠️</span>
              <p className="text-[12px] leading-relaxed">
                Os dados desta sessão estão salvos <br/><strong>localmente</strong> e qualquer um com <br/>acesso a este computador poderá vê-los.<br /><br />
                Deseja operar como Anônimo mesmo assim?
              </p>
            </div>
            <section className="field-row mt-6 justify-end">
              <button style={{ minWidth: 80 }} onClick={confirmAnonymous}>Sim</button>
              <button style={{ minWidth: 80 }} onClick={() => setShowAnonAlert(false)}>Não</button>
            </section>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="flex items-center gap-3 mb-4 mt-2 justify-center">
              <p className="text-[13px] font-bold text-[#0038b3]">Bem-vindo(a) ao RetroNote</p>
            </div>
            
            <form className="flex flex-col gap-3" onSubmit={handleLogin}>
              <div className="field-row">
                <label htmlFor="user" className="w-12 text-right">Login:</label>
                <input id="user" type="text" className="flex-1" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              
              <div className="field-row">
                <label htmlFor="pass" className="w-12 text-right">Senha:</label>
                <input id="pass" type="password" className="flex-1" value={password} onChange={e => setPassword(e.target.value)} />
              </div>

              {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
              {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

              <div className="flex justify-center gap-2 mt-4 text-[12px]">
                <button type="submit" style={{ minWidth: 90 }}>Logar</button>
                <button type="button" style={{ minWidth: 90 }} onClick={handleRegister}>Criar conta</button>
              </div>
            </form>

            <div className="mt-auto pt-4 border-t border-[#dfdfdf] w-full flex justify-center text-[11px]">
               <button type="button" className="w-[85%] bg-transparent border-0 underline text-blue-700 hover:text-blue-900 cursor-pointer text-[11px] font-bold" onClick={() => setShowAnonAlert(true)}>
                 Acessar como Visitante (Anônimo)
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
