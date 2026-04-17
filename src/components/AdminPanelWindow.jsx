import React, { useState, useEffect, useMemo } from 'react';
import useAdmin from '../hooks/useAdmin';

/**
 * AdminPanelWindow - Painel de Controle Administrativo
 * Visual inspirado no Windows XP Computer Management (MMC).
 * Layout: Sidebar de usuários + Painel de detalhes com árvore de arquivos.
 */
export default function AdminPanelWindow({
  windowData,
  onClose,
  onMinimize,
  onToggleMaximize,
  onFocus,
  onUpdate,
  loggedUser,
  onShowAlert,
}) {
  const { id, minimized, maximized, zIndex, x, y, width, height } = windowData;

  const {
    users, selectedUser, userNotes, userFolders,
    loading, error,
    fetchUsers, selectUser, changeUserPassword, deleteUser,
  } = useAdmin(loggedUser);

  // Estados internos do painel
  const [previewNote, setPreviewNote] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Carregar usuários ao montar
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Limpar preview ao trocar de usuário
  useEffect(() => {
    setPreviewNote(null);
    setExpandedFolders(new Set());
  }, [selectedUser]);

  // ─── Drag da janela ───
  const handleDragStart = (e) => {
    if (maximized) return;
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

  // ─── Resize da janela ───
  const handleResizeStart = (e, direction) => {
    if (maximized) return;
    e.preventDefault(); e.stopPropagation(); onFocus(id);
    const startMouseX = e.clientX, startMouseY = e.clientY;
    const sX = x, sY = y, sW = width, sH = height;
    const onMove = (ev) => {
      const dx = ev.clientX - startMouseX, dy = ev.clientY - startMouseY;
      const u = {};
      if (direction.includes('e')) u.width = Math.max(680, sW + dx);
      if (direction.includes('s')) u.height = Math.max(450, sH + dy);
      if (direction.includes('w')) { const nW = Math.max(680, sW - dx); u.width = nW; u.x = sX + (sW - nW); }
      if (direction.includes('n')) { const nH = Math.max(450, sH - dy); u.height = nH; u.y = sY + (sH - nH); }
      onUpdate(id, u);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ─── Árvore de arquivos ───
  const fileTree = useMemo(() => {
    const folderMap = {};
    userFolders.forEach(f => {
      folderMap[f.id] = { ...f, type: 'folder', children: [] };
    });

    const rootItems = [];

    // Notas sem pasta → raiz (Área de Trabalho)
    userNotes.forEach(n => {
      const item = { ...n, type: 'note' };
      if (n.folder_id && folderMap[n.folder_id]) {
        folderMap[n.folder_id].children.push(item);
      } else {
        rootItems.push(item);
      }
    });

    // Pastas na hierarquia
    userFolders.forEach(f => {
      if (f.parent_id && folderMap[f.parent_id]) {
        folderMap[f.parent_id].children.push(folderMap[f.id]);
      } else {
        rootItems.push(folderMap[f.id]);
      }
    });

    return rootItems;
  }, [userNotes, userFolders]);

  // Toggle expand/collapse de pasta
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // ─── Alterar Senha ───
  const handlePasswordSubmit = async () => {
    setDialogError('');
    if (!newPassword || newPassword.length < 6) {
      return setDialogError('A senha deve ter pelo menos 6 caracteres.');
    }
    if (newPassword !== confirmPassword) {
      return setDialogError('As senhas não coincidem.');
    }

    setDialogLoading(true);
    const result = await changeUserPassword(selectedUser.id, newPassword);
    setDialogLoading(false);

    if (result.success) {
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
      onShowAlert('Senha Alterada', `Senha de "${selectedUser.display_name}" alterada com sucesso.`, 'info');
    } else {
      setDialogError(result.error);
    }
  };

  // ─── Excluir Conta ───
  const handleDeleteConfirm = async () => {
    setDialogLoading(true);
    const userName = selectedUser.display_name;
    const result = await deleteUser(selectedUser.id);
    setDialogLoading(false);

    if (result.success) {
      setShowDeleteDialog(false);
      onShowAlert('Conta Excluída', `A conta "${userName}" foi removida permanentemente.`, 'info');
    } else {
      setDialogError(result.error);
    }
  };

  // ─── Formatação ───
  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // ─── Renderização de Árvore Recursiva ───
  const renderTreeItem = (item, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = previewNote?.id === item.id;
    const indent = depth * 16;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-1 py-[2px] px-1 cursor-default text-[11px] hover:bg-[#e8e8e8] ${isSelected ? 'bg-[#316ac5] text-white hover:bg-[#316ac5]' : ''}`}
          style={{ paddingLeft: 4 + indent }}
          onClick={() => {
            if (isFolder) toggleFolder(item.id);
            else setPreviewNote(item);
          }}
        >
          {isFolder ? (
            <>
              <span className="text-[9px] w-3 text-center select-none">{isExpanded ? '▼' : '►'}</span>
              <span>{isExpanded ? '📂' : '📁'}</span>
              <span className="truncate">{item.name}</span>
              <span className={`ml-auto text-[9px] ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                {item.children?.length || 0}
              </span>
            </>
          ) : (
            <>
              <span className="w-3" />
              <span>📄</span>
              <span className="truncate">{item.title}</span>
            </>
          )}
        </div>
        {isFolder && isExpanded && item.children?.map(child => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  // ─── Estilos da Janela ───
  const windowStyle = minimized
    ? { display: 'none' }
    : maximized
      ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 32px)', zIndex }
      : { top: y, left: x, width, height, zIndex };

  const resizeHandles = [
    { dir: 'n', cls: 'absolute top-0 left-2 right-2 h-1 cursor-n-resize' },
    { dir: 's', cls: 'absolute bottom-0 left-2 right-2 h-1 cursor-s-resize' },
    { dir: 'e', cls: 'absolute top-2 bottom-2 right-0 w-1 cursor-e-resize' },
    { dir: 'w', cls: 'absolute top-2 bottom-2 left-0 w-1 cursor-w-resize' },
    { dir: 'ne', cls: 'absolute top-0 right-0 w-3 h-3 cursor-ne-resize' },
    { dir: 'nw', cls: 'absolute top-0 left-0 w-3 h-3 cursor-nw-resize' },
    { dir: 'se', cls: 'absolute bottom-0 right-0 w-3 h-3 cursor-se-resize' },
    { dir: 'sw', cls: 'absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize' },
  ];

  return (
    <div className="window absolute flex flex-col select-none" style={windowStyle} onMouseDown={() => onFocus(id)}>
      {!maximized && resizeHandles.map(h => (
        <div key={h.dir} className={h.cls} onMouseDown={(e) => handleResizeStart(e, h.dir)} />
      ))}

      {/* ═══ Title Bar ═══ */}
      <div className="title-bar" onMouseDown={handleDragStart} onDoubleClick={() => onToggleMaximize(id)}>
        <div className="title-bar-text px-1">🔧 Painel de Controle — Usuários</div>
        <div className="title-bar-controls" onMouseDown={e => e.stopPropagation()}>
          <button aria-label="Minimize" onClick={() => onMinimize(id)} />
          <button aria-label="Maximize" onClick={() => onToggleMaximize(id)} />
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      {/* ═══ Window Body ═══ */}
      <div className="window-body flex-1 flex flex-col !m-[3px] overflow-hidden bg-[#ece9d8]">

        {/* Toolbar */}
        <div className="w-full bg-[#ece9d8] border-b border-[#aca899] py-1 px-2 flex items-center gap-1">
          <button
            onClick={() => { fetchUsers(); if (selectedUser) selectUser(selectedUser); }}
            className="flex items-center gap-1 hover:bg-[#c1d2ee] px-2 py-1 rounded text-black text-[11px] border border-transparent hover:border-[#316ac5]"
          >
            🔄 Atualizar
          </button>

          {selectedUser && selectedUser.id !== loggedUser?.id && (
            <>
              <div className="w-[1px] h-[22px] bg-[#aca899] mx-1 opacity-50" />
              <button
                onClick={() => { setShowPasswordDialog(true); setDialogError(''); setNewPassword(''); setConfirmPassword(''); }}
                className="flex items-center gap-1 hover:bg-[#c1d2ee] px-2 py-1 rounded text-black text-[11px] border border-transparent hover:border-[#316ac5]"
              >
                🔑 Alterar Senha
              </button>
              <button
                onClick={() => { setShowDeleteDialog(true); setDialogError(''); }}
                className="flex items-center gap-1 hover:bg-[#ffcccc] px-2 py-1 rounded text-red-700 text-[11px] border border-transparent hover:border-red-400"
              >
                ❌ Excluir Conta
              </button>
            </>
          )}
        </div>

        {/* Erro global */}
        {error && (
          <div className="bg-[#fff1f0] border-b border-red-300 px-3 py-1 text-[11px] text-red-700 font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* ═══ Split Panel ═══ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ─── Sidebar: Lista de Usuários ─── */}
          <div className="w-[200px] min-w-[160px] bg-white border-r border-[#aca899] flex flex-col overflow-hidden">
            <div className="bg-[#ece9d8] border-b border-[#aca899] px-2 py-[3px] text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              Contas ({users.length})
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && users.length === 0 ? (
                <div className="p-3 text-[11px] text-gray-400 text-center">Carregando...</div>
              ) : (
                users.map(user => {
                  const isMe = user.id === loggedUser?.id;
                  const isActive = selectedUser?.id === user.id;
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-2 px-2 py-[6px] cursor-default text-[11px] border-b border-[#f4f4f4] transition-colors
                        ${isActive ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8e8e8]'}`}
                      onClick={() => selectUser(user)}
                    >
                      <span className="text-[14px]">👤</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`truncate font-bold ${isActive ? 'text-white' : ''}`}>
                          {user.display_name}
                          {isMe && <span className="ml-1 text-[9px]">★</span>}
                        </span>
                        <span className={`truncate text-[9px] ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                          {user.notes_count} nota(s) · {user.folders_count} pasta(s)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Painel Principal ─── */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {!selectedUser ? (
              /* Estado vazio */
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-[40px] mb-2">🛡️</span>
                <p className="text-[13px] font-bold text-gray-700">Painel de Controle Admin</p>
                <p className="text-[11px] text-gray-500 mt-1 max-w-[280px]">
                  Selecione um usuário na lista à esquerda para visualizar seus arquivos, alterar senha ou gerenciar a conta.
                </p>
                <p className="text-[10px] text-gray-400 mt-4">
                  {users.length} usuário(s) cadastrado(s)
                </p>
              </div>
            ) : (
              <>
                {/* ═══ Card de Informações do Usuário ═══ */}
                <fieldset style={{ backgroundColor: 'transparent' }}>
                  <legend>Informações da Conta</legend>
                  <div className="flex flex-col gap-[6px] p-1 text-[11px]">
                    <div className="flex gap-2">
                      <span className="text-[32px]">👤</span>
                      <div className="flex flex-col justify-center">
                        <span className="font-bold text-[14px]">{selectedUser.display_name}</span>
                        <span className="text-gray-500 text-[10px]">{selectedUser.email}</span>
                      </div>
                      {selectedUser.id === loggedUser?.id && (
                        <span className="ml-auto bg-[#316ac5] text-white text-[9px] px-2 py-[2px] rounded-sm self-start font-bold">
                          ADMIN (Você)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 pl-[40px]">
                      <div>
                        <span className="text-gray-500">Criado em:</span>{' '}
                        <span className="font-bold">{formatDate(selectedUser.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Último login:</span>{' '}
                        <span className="font-bold">{formatDate(selectedUser.last_sign_in_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Notas:</span>{' '}
                        <span className="font-bold">{selectedUser.notes_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pastas:</span>{' '}
                        <span className="font-bold">{selectedUser.folders_count}</span>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* ═══ Árvore de Arquivos ═══ */}
                <fieldset className="flex-1 min-h-[120px] flex flex-col overflow-hidden" style={{ backgroundColor: 'transparent' }}>
                  <legend>Arquivos do Usuário</legend>
                  <div className="flex-1 bg-white border border-[#7f9db9] overflow-y-auto min-h-[80px]">
                    {loading ? (
                      <div className="p-3 text-[11px] text-gray-400 text-center">Carregando arquivos...</div>
                    ) : fileTree.length === 0 ? (
                      <div className="p-3 text-[11px] text-gray-400 text-center italic">
                        Este usuário não possui arquivos.
                      </div>
                    ) : (
                      <div className="py-1">
                        <div className="flex items-center gap-1 py-[2px] px-1 text-[11px] text-gray-500 font-bold border-b border-[#f0f0f0] mb-1">
                          <span className="w-3" />
                          <span>🖥️</span>
                          <span>Área de Trabalho</span>
                        </div>
                        {fileTree.map(item => renderTreeItem(item, 1))}
                      </div>
                    )}
                  </div>
                </fieldset>

                {/* ═══ Preview de Nota ═══ */}
                {previewNote && (
                  <fieldset className="min-h-[100px] max-h-[200px] flex flex-col overflow-hidden" style={{ backgroundColor: 'transparent' }}>
                    <legend>
                      📃 {previewNote.title}
                      <button
                        className="ml-2 text-[9px] text-gray-500 hover:text-red-500"
                        onClick={() => setPreviewNote(null)}
                      >
                        [fechar]
                      </button>
                    </legend>
                    <div
                      className="flex-1 bg-white border border-[#7f9db9] p-2 overflow-y-auto text-[11px] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: previewNote.content || '<em style="color:#999">Nota vazia.</em>' }}
                    />
                  </fieldset>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="status-bar !m-0 !py-1">
          <p className="status-bar-field">
            {selectedUser ? `Visualizando: ${selectedUser.display_name}` : `${users.length} usuário(s)`}
          </p>
          <p className="status-bar-field">
            {loading ? '⏳ Processando...' : '✅ Pronto'}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ═══ DIÁLOGO: Alterar Senha ═══ */}
      {/* ═══════════════════════════════════════════════ */}
      {showPasswordDialog && selectedUser && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">🔑 Alterar Senha — {selectedUser.display_name}</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setShowPasswordDialog(false)} />
              </div>
            </div>
            <div className="window-body !m-[3px] p-3">
              <p className="text-[11px] mb-3">
                Defina uma nova senha para <strong>{selectedUser.display_name}</strong>.
              </p>

              <div className="field-row-stacked mb-2" style={{ width: '100%' }}>
                <label htmlFor="admin-new-pass">Nova senha (mín. 6 caracteres):</label>
                <input
                  id="admin-new-pass"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="field-row-stacked mb-2" style={{ width: '100%' }}>
                <label htmlFor="admin-confirm-pass">Confirmar nova senha:</label>
                <input
                  id="admin-confirm-pass"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              {dialogError && (
                <p className="text-red-600 text-[10px] font-bold text-center mb-2">⚠️ {dialogError}</p>
              )}

              <section className="field-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={handlePasswordSubmit} disabled={dialogLoading} style={{ minWidth: 90 }}>
                  {dialogLoading ? 'Salvando...' : 'Confirmar'}
                </button>
                <button onClick={() => setShowPasswordDialog(false)} style={{ minWidth: 70 }}>
                  Cancelar
                </button>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ═══ DIÁLOGO: Confirmar Exclusão ═══ */}
      {/* ═══════════════════════════════════════════════ */}
      {showDeleteDialog && selectedUser && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">⚠️ Confirmar Exclusão</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setShowDeleteDialog(false)} />
              </div>
            </div>
            <div className="window-body !m-[3px] p-3">
              <div className="flex gap-3 items-start">
                <div
                  className="w-[34px] h-[34px] flex-shrink-0 rounded-full flex items-center justify-center border-2 border-white shadow-[1px_1px_2px_rgba(0,0,0,0.5)]"
                  style={{ background: 'radial-gradient(circle at 30% 30%, #ff5a33, #b02d0d)' }}
                >
                  <span className="text-white text-xl font-bold drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]">!</span>
                </div>
                <div className="text-[11px]">
                  <p className="font-bold mb-1">Excluir permanentemente a conta de "{selectedUser.display_name}"?</p>
                  <p className="text-gray-600 leading-relaxed">
                    Esta ação irá apagar <strong>todos os dados</strong> deste usuário:
                    notas, pastas, lixeira e configurações de janelas.
                    <br /><br />
                    <strong className="text-red-600">Esta ação é irreversível.</strong>
                  </p>
                </div>
              </div>

              {dialogError && (
                <p className="text-red-600 text-[10px] font-bold text-center mt-2">⚠️ {dialogError}</p>
              )}

              <section className="field-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={dialogLoading}
                  className="!bg-red-50 !text-red-700 hover:!bg-red-100"
                  style={{ minWidth: 100 }}
                >
                  {dialogLoading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                <button onClick={() => setShowDeleteDialog(false)} style={{ minWidth: 70 }}>
                  Cancelar
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
