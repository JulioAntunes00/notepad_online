import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
      return setError(t('loginWindow.fillFields'));
    }

    try {
      const email = getEmail(username);
      const { data, error: sbErr } = await supabase.auth.signInWithPassword({ email, password });

      if (sbErr) {
        setLoading(false);
        if (sbErr.message.includes('Invalid login credentials')) return setError(t('loginWindow.wrongCredentials'));
        return setError(sbErr.message);
      }

      if (data.user) {
        setSuccess(t('loginWindow.welcome'));
        setTimeout(() => onLogin(data.user), 600);
      }
    } catch (err) {
      setError(t('loginWindow.connectionError'));
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    clearForm();
    setLoading(true);
    if (!username || password.length < 8) {
      setLoading(false);
      return setError(t('loginWindow.requiredFields'));
    }

    try {
      const email = getEmail(username);
      const options = recoveryEmail
        ? { data: { recovery_email: recoveryEmail, display_name: username } }
        : { data: { display_name: username } };
      const { data, error: insErr } = await supabase.auth.signUp({ email, password, options });

      if (insErr) {
        setLoading(false);
        if (insErr.message.includes('already registered')) return setError(t('loginWindow.userExists'));
        return setError(insErr.message);
      }

      setSuccess(t('loginWindow.accountCreated'));
      setTimeout(() => onLogin(data.user), 1000);
    } catch (err) {
      setError(t('loginWindow.createFailed'));
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e?.preventDefault();
    clearForm();
    if (cooldown > 0) {
      return setError(t('loginWindow.waitBeforeRetry', { seconds: cooldown }));
    }
    setLoading(true);
    if (!recoveryEmail) {
      setLoading(false);
      return setError(t('loginWindow.enterRecoveryEmail'));
    }

    try {
      const { error: recErr } = await supabase.auth.resetPasswordForEmail(recoveryEmail);
      if (recErr) throw recErr;

      setSuccess(t('loginWindow.recoverySent'));
      setCooldown(60);
      setLoading(false);
    } catch (err) {
      setError(t('loginWindow.recoveryFailed'));
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
      case 'register': return t('loginWindow.registerTitle');
      case 'recover': return t('loginWindow.recoverTitle');
      default: return t('loginWindow.title');
    }
  };

  // ─── VIEW: RECUPERAR SENHA ────────────────────────────
  const renderRecover = () => (
    <form className="flex flex-col gap-3 view-transition" onSubmit={handleRecover}>
      <div className="flex items-center gap-3 mb-2 justify-center">
        <p className="text-[13px] font-bold text-[#0038b3]">{t('loginWindow.recoverHeader')}</p>
      </div>

      <p className="text-[11px] text-gray-600 m-0">
        {t('loginWindow.recoverDesc')}
      </p>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="recover-email">{t('loginWindow.recoveryEmailLabel')}</label>
        <input id="recover-email" type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="seu@email.com" />
      </div>

      {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
      {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

      <div className="flex justify-center gap-2 mt-2">
        <button type="submit" style={{ minWidth: 120 }} disabled={loading || cooldown > 0}>
          {loading ? t('loginWindow.sending') : cooldown > 0 ? t('loginWindow.waitSeconds', { seconds: cooldown }) : t('loginWindow.sendRecovery')}
        </button>
        <button type="button" style={{ minWidth: 80 }} onClick={() => switchView('login')}>{t('loginWindow.back')}</button>
      </div>
    </form>
  );

  // ─── VIEW: REGISTRAR ──────────────────────────────────
  const renderRegister = () => (
    <form className="flex flex-col gap-3 view-transition" onSubmit={handleRegister}>
      <div className="flex items-center gap-3 mb-2 justify-center">
        <p className="text-[13px] font-bold text-[#0038b3]">{t('loginWindow.registerHeader')}</p>
      </div>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="reg-user">{t('loginWindow.user')}</label>
        <input id="reg-user" type="text" value={username} onChange={e => setUsername(e.target.value)} />
      </div>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="reg-email">{t('loginWindow.recoveryEmail')}</label>
        <input id="reg-email" type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder={t('loginWindow.recoveryEmailPlaceholder')} />
      </div>

      <div className="field-row-stacked" style={{ width: '100%' }}>
        <label htmlFor="reg-pass">{t('loginWindow.passwordMin')}</label>
        <input id="reg-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
      {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

      <div className="flex justify-center gap-2 mt-2">
        <button type="submit" style={{ minWidth: 100 }} disabled={loading}>
          {loading ? t('loginWindow.creating') : t('loginWindow.createAccount')}
        </button>
        <button type="button" style={{ minWidth: 80 }} onClick={() => switchView('login')}>{t('loginWindow.back')}</button>
      </div>
    </form>
  );

  // ─── VIEW: LOGIN ──────────────────────────────────────
  const renderLogin = () => (
    <form className="flex flex-col gap-3 view-transition" onSubmit={handleLogin}>
      <div className="flex items-center gap-3 mb-2 justify-center">
        <p className="text-[13px] font-bold text-[#0038b3]">{t('loginWindow.loginHeader')}</p>
      </div>

      <div className="field-row">
        <label htmlFor="user" className="w-14 text-right">{t('loginWindow.user')}</label>
        <input id="user" type="text" className="flex-1" value={username} onChange={e => setUsername(e.target.value)} />
      </div>

      <div className="field-row">
        <label htmlFor="pass" className="w-14 text-right">{t('loginWindow.password')}</label>
        <input id="pass" type="password" className="flex-1" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div className="field-row">
        <input id="stay-logged" type="checkbox" checked={stayLoggedIn} onChange={e => handleToggleStayLoggedIn(e.target.checked)} />
        <label htmlFor="stay-logged" className="text-[11px]">{t('loginWindow.stayLoggedIn')}</label>
      </div>

      {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
      {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

      <div className="flex justify-center gap-2 mt-2 text-[12px]">
        <button type="submit" style={{ minWidth: 90 }} disabled={loading}>
          {loading ? t('loginWindow.entering') : t('loginWindow.enter')}
        </button>
        <button type="button" style={{ minWidth: 90 }} onClick={() => switchView('register')}>{t('loginWindow.createAccount')}</button>
      </div>

      <div className="flex justify-center gap-3 mt-1">
        <button type="button" className="bg-transparent border-0 underline text-blue-700 hover:text-blue-900 cursor-pointer text-[11px] font-bold" onClick={() => switchView('recover')}>
          {t('loginWindow.forgotPassword')}
        </button>
      </div>

      <div className="flex justify-center mt-3 pt-2 border-t border-[#dfdfdf]">
        <p className="text-[10px] text-gray-500 m-0">
          {t('loginWindow.needHelp')} <a href="mailto:web.ti@live.com" className="text-blue-600 font-bold hover:underline">web.ti@live.com</a>
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
                {t('loginWindow.anonWarning')}<br /><br />
                {t('loginWindow.anonConfirm')}
              </p>
            </div>
            <section className="field-row mt-6 justify-end">
              <button style={{ minWidth: 80 }} onClick={confirmAnonymous}>{t('loginWindow.yes')}</button>
              <button style={{ minWidth: 80 }} onClick={() => setShowAnonAlert(false)}>{t('loginWindow.no')}</button>
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
                  <span className="text-lg">👤</span> {t('loginWindow.enterAsVisitor')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
