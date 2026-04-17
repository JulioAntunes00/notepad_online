import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export default function ProfileWindow({
  windowData,
  onClose,
  onFocus,
  onUpdate,
  loggedUser,
  onShowAlert,
}) {
  const { t } = useTranslation();
  const { id, minimized, zIndex, x, y, width, height } = windowData;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const displayName = loggedUser?.user_metadata?.display_name
    || loggedUser?.email?.split('@')[0]
    || t('profileWindow.username').replace(':', '');

  const displayEmail = loggedUser?.user_metadata?.recovery_email || t('profileWindow.none');
  const accountEmail = loggedUser?.email || '';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.length < 8) {
      return setError(t('profileWindow.passwordMinError'));
    }
    if (newPassword !== confirmPassword) {
      return setError(t('profileWindow.passwordMismatch'));
    }

    setLoading(true);
    try {
      // Verify current password by re-authenticating
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: currentPassword,
      });

      if (signInErr) {
        setLoading(false);
        return setError(t('profileWindow.wrongCurrentPassword'));
      }

      // Update password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setLoading(false);
        return setError(updateErr.message);
      }

      setSuccess(t('profileWindow.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch (err) {
      setError(t('profileWindow.changeError'));
      setLoading(false);
    }
  };

  const windowStyle = minimized
    ? { display: 'none' }
    : { top: y, left: x, width, height, zIndex };

  return (
    <div className="window absolute flex flex-col" style={windowStyle} onMouseDown={() => onFocus(id)}>
      <div className="title-bar" onMouseDown={handleDragStart}>
        <div className="title-bar-text">{t('profileWindow.title')}</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 !m-[3px] bg-[#ece9d8] flex flex-col p-4 overflow-auto">
        {/* Informações do Usuário */}
        <fieldset style={{ backgroundColor: 'transparent' }}>
          <legend>{t('profileWindow.accountInfo')}</legend>
          <div className="flex flex-col gap-2 p-1">
            <div className="field-row">
              <label className="w-28 text-right font-bold text-[11px]">{t('profileWindow.username')}</label>
              <span className="text-[12px]">{displayName}</span>
            </div>
            {!accountEmail.includes('@retronote.local') && (
              <div className="field-row">
                <label className="w-28 text-right font-bold text-[11px]">{t('profileWindow.accountEmail')}</label>
                <span className="text-[12px] text-gray-600">{accountEmail}</span>
              </div>
            )}
            <div className="field-row">
              <label className="w-28 text-right font-bold text-[11px]">{t('profileWindow.recoveryEmail')}</label>
              <span className="text-[12px] text-gray-600">{displayEmail}</span>
            </div>
          </div>
        </fieldset>

        {/* Alterar Senha */}
        <fieldset className="mt-3" style={{ backgroundColor: 'transparent' }}>
          <legend>{t('profileWindow.changePassword')}</legend>
          <form className="flex flex-col gap-2 p-1" onSubmit={handleChangePassword}>
            <div className="field-row-stacked" style={{ width: '100%' }}>
              <label htmlFor="cur-pass">{t('profileWindow.currentPassword')}</label>
              <input id="cur-pass" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>

            <div className="field-row-stacked" style={{ width: '100%' }}>
              <label htmlFor="new-pass">{t('profileWindow.newPassword')}</label>
              <input id="new-pass" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>

            <div className="field-row-stacked" style={{ width: '100%' }}>
              <label htmlFor="confirm-pass">{t('profileWindow.confirmNewPassword')}</label>
              <input id="confirm-pass" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>

            {error && <p className="text-red-600 text-[11px] font-bold text-center m-0">{error}</p>}
            {success && <p className="text-[#0053e5] text-[11px] font-bold text-center m-0">{success}</p>}

            <div className="flex justify-end gap-2 mt-2">
              <button type="submit" style={{ minWidth: 110 }} disabled={loading}>
                {loading ? t('profileWindow.saving') : t('profileWindow.changePassword')}
              </button>
              <button type="button" style={{ minWidth: 80 }} onClick={() => onClose(id)}>{t('profileWindow.close')}</button>
            </div>
          </form>
        </fieldset>

        {/* Suporte Técnico */}
        <div className="mt-4 p-3 bg-[#ffffcc] border border-[#aca899] rounded shadow-sm flex items-start gap-3">
          <span className="text-2xl mt-[-2px]">❔</span>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[#0038b3]">{t('profileWindow.helpTitle')}</span>
            <p className="text-[10px] text-gray-700 m-0 leading-tight">
              {t('profileWindow.helpText')}
              <br />
              <a href="mailto:web.ti@live.com" className="text-blue-700 font-bold hover:underline">web.ti@live.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
