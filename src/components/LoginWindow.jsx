import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginWindow({
  windowData,
  onClose,
  onFocus,
  onUpdate,
  onLogin,
}) {
  const { id, minimized, zIndex, x, y, width, height } = windowData;
  const [view, setView] = useState('login'); // 'login' | 'register' | 'recover'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAnonAlert, setShowAnonAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    const saved = localStorage.getItem('retronote_stay_logged_in') === 'true';
    setStayLoggedIn(saved);
  }, []);

  const handleToggleStayLoggedIn = (val) => {
    setStayLoggedIn(val);
    localStorage.setItem('retronote_stay_logged_in', val);
  };

  const clearForm = () => {
    setError('');
    setSuccess('');
  };

  const switchView = (v) => {
    clearForm();
    setView(v);
  };

  const handleDragStart = (e) => {
    if (e.target.closest('.title-bar-controls')) return;
    e.preventDefault();
    onFocus(id);
    const startX = e.clientX - x;
    const startY = e.clientY - y;
    const onMove = (ev) => onUpdate(id, { x: Math.max(0, ev.clientX - startX), y: Math.max(0, ev.clientY - startY) });
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const getEmail = (u) => u.includes('@') ? u : u.toLowerCase().replace(/\s+/g, '') + '@retronote.local';

  const handleLogin = async (e) => {
    e?.preventDefault();
    clearForm();
    setLoading(true);
    if (!username || !password) {
      setLoading(false);
      return setError('Preencha login e senha.');
    }

    try {
      const email = getEmail(username);
      const { data, error: sbErr } = await supabase.auth.signInWithPassword({ email, password });

      if (sbErr) {
        setLoading(false);
        if (sbErr.message.includes('Invalid login credentials')) return setError('Login ou senha incorretos.');
        return setError(sbErr.message);
      }

      if (data.user) {
        setSuccess('Bem-vindo(a)!');
        setTimeout(() => onLogin(data.user), 600);
      }
    } catch (err) {
      setError('Erro de conexão.');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    clearForm();
    setLoading(true);
    if (!username || password.length < 8) {
      setLoading(false);
      return setError('Login obrigatório e senha com 8+ caracteres.');
    }

    try {
      const email = getEmail(username);
      const options = recoveryEmail
        ? { data: { recovery_email: recoveryEmail, display_name: username } }
        : { data: { display_name: username } };
      const { data, error: insErr } = await supabase.auth.signUp({ email, password, options });

      if (insErr) {
        setLoading(false);
        if (insErr.message.includes('already registered')) return setError('Este nome de usuário já existe.');
        return setError(insErr.message);
      }

      setSuccess('Conta criada com sucesso!');
      setTimeout(() => onLogin(data.user), 1000);
    } catch (err) {
      setError('Falha ao criar conta.');
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e?.preventDefault();
    clearForm();
    if (cooldown > 0) {
      return setError(`Aguarde ${cooldown} segundo(s) antes de tentar novamente.`);
    }
    setLoading(true);
    if (!recoveryEmail) {
      setLoading(false);
      return setError('Digite o e-mail de recuperação que cadastrou.');
    }

    try {
      const { error: recErr } = await supabase.auth.resetPasswordForEmail(recoveryEmail);
      if (recErr) throw recErr;

      setSuccess('Instruções de recuperação enviadas para o e-mail!');
      setCooldown(60);
      setLoading(false);
    } catch (err) {
      setError('Falha ao enviar. Verifique o e-mail digitado.');
      setLoading(false);
    }
  };

  const confirmAnonymous = () => {
    setShowAnonAlert(false);
    onLogin('Anônimo');
  };

  const windowStyle = minimized
    ? { display: 'none' }
    : { top: y, left: x, width, height, zIndex };

  const renderTitle = () => {
    switch (view) {
      case 'register': return 'Criar Conta - RetroNote';
      case 'recover': return 'Recuperar Senha';
      default: return 'Entrar no Sistema';
    }
  };

  // ─── VIEW: RECUPERAR SENHA ────────────────────────────
  const renderRecover = () => (
    <form className="flex flex-col gap-3 view-transition" onSubmit={handleRecover}>
      <div className="flex items-center gap-3 mb-2 justify-center">
        <p className="text-[13px] font-bold text-[#0038b3]">Recuperar Senha</p>
      </div>

      <p className="text-[11px] text-gray-600 m-0">
        Digite o <b>e-mail de recuperação</b> que você cadastrou ao criar a conta.
        O Supabase enviará um link para redefinir sua senha.
      </p>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="recover-email">E-mail de Recuperação:</label>
        <input id="recover-email" type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="seu@email.com" />
      </div>

      {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
      {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

      <div className="flex justify-center gap-2 mt-2">
        <button type="submit" style={{ minWidth: 120 }} disabled={loading || cooldown > 0}>
          {loading ? 'Enviando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar Recuperação'}
        </button>
        <button type="button" style={{ minWidth: 80 }} onClick={() => switchView('login')}>Voltar</button>
      </div>
    </form>
  );

  // ─── VIEW: REGISTRAR ──────────────────────────────────
  const renderRegister = () => (
    <form className="flex flex-col gap-3 view-transition" onSubmit={handleRegister}>
      <div className="flex items-center gap-3 mb-2 justify-center">
        <p className="text-[13px] font-bold text-[#0038b3]">Criar Nova Conta</p>
      </div>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="reg-user">Usuário:</label>
        <input id="reg-user" type="text" value={username} onChange={e => setUsername(e.target.value)} />
      </div>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="reg-email">E-mail de Recuperação (opcional):</label>
        <input id="reg-email" type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="Para recuperar sua senha depois" />
      </div>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="reg-pass">Senha (mín. 8 caracteres):</label>
        <input id="reg-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
      {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

      <div className="flex justify-center gap-2 mt-2">
        <button type="submit" style={{ minWidth: 100 }} disabled={loading}>
          {loading ? 'Criando...' : 'Criar Conta'}
        </button>
        <button type="button" style={{ minWidth: 80 }} onClick={() => switchView('login')}>Voltar</button>
      </div>
    </form>
  );

  // ─── VIEW: LOGIN ──────────────────────────────────────
  const renderLogin = () => (
    <form className="flex flex-col gap-3 view-transition" onSubmit={handleLogin}>
      <div className="flex items-center gap-3 mb-2 justify-center">
        <p className="text-[13px] font-bold text-[#0038b3]">RetroNote - Login</p>
      </div>

      <div className="field-row">
        <label htmlFor="user" className="w-14 text-right">Usuário:</label>
        <input id="user" type="text" className="flex-1" value={username} onChange={e => setUsername(e.target.value)} />
      </div>

      <div className="field-row">
        <label htmlFor="pass" className="w-14 text-right">Senha:</label>
        <input id="pass" type="password" className="flex-1" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div className="field-row">
        <input id="stay-logged" type="checkbox" checked={stayLoggedIn} onChange={e => handleToggleStayLoggedIn(e.target.checked)} />
        <label htmlFor="stay-logged" className="text-[11px]">Permanecer conectado</label>
      </div>

      {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
      {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

      <div className="flex justify-center gap-2 mt-2 text-[12px]">
        <button type="submit" style={{ minWidth: 90 }} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <button type="button" style={{ minWidth: 90 }} onClick={() => switchView('register')}>Criar Conta</button>
      </div>

      <div className="flex justify-center gap-3 mt-1">
        <button type="button" className="bg-transparent border-0 underline text-blue-700 hover:text-blue-900 cursor-pointer text-[11px] font-bold" onClick={() => switchView('recover')}>
          Esqueci minha senha
        </button>
      </div>

      <div className="flex justify-center mt-3 pt-2 border-t border-[#dfdfdf]">
        <p className="text-[10px] text-gray-500 m-0">
          Precisa de ajuda? Contate o suporte: <a href="mailto:web.ti@live.com" className="text-blue-600 font-bold hover:underline">web.ti@live.com</a>
        </p>
      </div>
    </form>
  );

  return (
    <div className="window absolute flex flex-col" style={windowStyle} onMouseDown={() => onFocus(id)}>
      <div className="title-bar" onMouseDown={handleDragStart}>
        <div className="title-bar-text">{renderTitle()}</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 !m-[3px] bg-[#ece9d8] flex flex-col p-4 relative overflow-hidden">
        {showAnonAlert ? (
          <div className="flex flex-col h-full justify-between view-transition">
            <div className="flex gap-4 items-start">
              <span className="text-4xl leading-none">⚠️</span>
              <p className="text-[12px] leading-relaxed">
                Os dados desta sessão ficarão apenas neste computador.<br /><br />
                Deseja continuar como Visitante?
              </p>
            </div>
            <section className="field-row mt-6 justify-end">
              <button style={{ minWidth: 80 }} onClick={confirmAnonymous}>Sim</button>
              <button style={{ minWidth: 80 }} onClick={() => setShowAnonAlert(false)}>Não</button>
            </section>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            {view === 'login' && renderLogin()}
            {view === 'register' && renderRegister()}
            {view === 'recover' && renderRecover()}

            {view === 'login' && (
              <div className="mt-auto pt-3 border-t border-[#dfdfdf] w-full flex justify-center text-[11px]">
                <button 
                  type="button" 
                  className="w-[85%] bg-[#0053e5] text-white border border-[#003c9b] px-4 py-2 rounded shadow-md hover:bg-[#003c9b] transition-all cursor-pointer font-bold text-[13px] flex items-center justify-center gap-2" 
                  onClick={() => setShowAnonAlert(true)}
                  style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}
                >
                  <span className="text-lg">👤</span> Entrar como Visitante
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
