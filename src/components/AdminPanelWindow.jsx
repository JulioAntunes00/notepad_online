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
    users, selectedUser, userNotes, userFolders, suggestions,
    loading, error,
    fetchUsers, fetchSuggestions, selectUser, changeUserPassword, deleteUser, deleteSuggestion,
  } = useAdmin(loggedUser);

  // Estados internos do painel
  const [activeTab, setActiveTab] = useState('users'); // 'users' ou 'suggestions'
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [previewNote, setPreviewNote] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Carregar dados iniciais
  useEffect(() => {
    fetchUsers();
    fetchSuggestions();
  }, [fetchUsers, fetchSuggestions]);

  // Limpar previews ao trocar de aba ou seleção
  useEffect(() => {
    setPreviewNote(null);
    setSelectedSuggestion(null);
  }, [selectedUser, activeTab]);

  // ─── Drag da janela ───
  // ... (mantendo lógica de drag)
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

  // ─── Árvore de arquivos e Handlers ───
  const fileTree = useMemo(() => {
    const folderMap = {};
    userFolders.forEach(f => {
      folderMap[f.id] = { ...f, type: 'folder', children: [] };
    });
    const rootItems = [];
    userNotes.forEach(n => {
      const item = { ...n, type: 'note' };
      if (n.folder_id && folderMap[n.folder_id]) folderMap[n.folder_id].children.push(item);
      else rootItems.push(item);
    });
    userFolders.forEach(f => {
      if (f.parent_id && folderMap[f.parent_id]) folderMap[f.parent_id].children.push(folderMap[f.id]);
      else rootItems.push(folderMap[f.id]);
    });
    return rootItems;
  }, [userNotes, userFolders]);

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const handlePasswordSubmit = async () => {
    setDialogError('');
    if (!newPassword || newPassword.length < 6) return setDialogError('A senha deve ter pelo menos 6 caracteres.');
    if (newPassword !== confirmPassword) return setDialogError('As senhas não coincidem.');
    setDialogLoading(true);
    const result = await changeUserPassword(selectedUser.id, newPassword);
    setDialogLoading(false);
    if (result.success) {
      setShowPasswordDialog(false); setNewPassword(''); setConfirmPassword('');
      onShowAlert('Senha Alterada', `Senha de "${selectedUser.display_name}" alterada com sucesso.`, 'info');
    } else setDialogError(result.error);
  };

  const handleDeleteConfirm = async () => {
    setDialogLoading(true);
    const userName = selectedUser.display_name;
    const result = await deleteUser(selectedUser.id);
    setDialogLoading(false);
    if (result.success) {
      setShowDeleteDialog(false);
      onShowAlert('Conta Excluída', `A conta "${userName}" foi removida permanentemente.`, 'info');
    } else setDialogError(result.error);
  };

  const handleDeleteSuggestion = async (id) => {
    if (window.confirm('Excluir esta sugestão para sempre?')) {
      await deleteSuggestion(id);
      setSelectedSuggestion(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderTreeItem = (item, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = previewNote?.id === item.id;
    const indent = depth * 16;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-1 py-[2px] px-1 cursor-default text-[11px] hover:bg-[#e8e8e8] ${isSelected ? 'bg-[#316ac5] text-white' : ''}`}
          style={{ paddingLeft: 4 + indent }}
          onClick={() => { if (isFolder) toggleFolder(item.id); else setPreviewNote(item); }}
        >
          {isFolder ? (<>
            <span className="text-[9px] w-3 text-center select-none">{isExpanded ? '▼' : '►'}</span>
            <span>{isExpanded ? '📂' : '📁'}</span>
            <span className="truncate">{item.name}</span>
          </>) : (<>
            <span className="w-3" /><span>📄</span><span className="truncate">{item.title}</span>
          </>)}
        </div>
        {isFolder && isExpanded && item.children?.map(child => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  const windowStyle = minimized ? { display: 'none' } : maximized ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 32px)', zIndex } : { top: y, left: x, width, height, zIndex };

  return (
    <div className="window absolute flex flex-col select-none" style={windowStyle} onMouseDown={() => onFocus(id)}>
      {!maximized && [
        { dir: 'n', cls: 'absolute top-0 left-2 right-2 h-1 cursor-n-resize' },
        { dir: 's', cls: 'absolute bottom-0 left-2 right-2 h-1 cursor-s-resize' },
        { dir: 'e', cls: 'absolute top-2 bottom-2 right-0 w-1 cursor-e-resize' },
        { dir: 'w', cls: 'absolute top-2 bottom-2 left-0 w-1 cursor-w-resize' },
        { dir: 'ne', cls: 'absolute top-0 right-0 w-3 h-3 cursor-ne-resize' },
        { dir: 'nw', cls: 'absolute top-0 left-0 w-3 h-3 cursor-nw-resize' },
        { dir: 'se', cls: 'absolute bottom-0 right-0 w-3 h-3 cursor-se-resize' },
        { dir: 'sw', cls: 'absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize' },
      ].map(h => (
        <div key={h.dir} className={h.cls} onMouseDown={(e) => handleResizeStart(e, h.dir)} />
      ))}

      <div className="title-bar" onMouseDown={handleDragStart} onDoubleClick={() => onToggleMaximize(id)}>
        <div className="title-bar-text px-1">🔧 Painel de Controle Administrativo</div>
        <div className="title-bar-controls" onMouseDown={e => e.stopPropagation()}>
          <button aria-label="Minimize" onClick={() => onMinimize(id)} />
          <button aria-label="Maximize" onClick={() => onToggleMaximize(id)} />
          <button aria-label="Close" onClick={() => onClose(id)} />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col !m-[3px] overflow-hidden bg-[#ece9d8]">
        {/* Toolbar Superior */}
        <div className="w-full bg-[#ece9d8] border-b border-[#aca899] py-1 px-2 flex items-center gap-1">
          <button
            onClick={() => { if (activeTab === 'users') fetchUsers(); else fetchSuggestions(); }}
            className="flex items-center gap-1 hover:bg-[#c1d2ee] px-2 py-1 rounded text-black text-[11px] border border-transparent hover:border-[#316ac5]"
          >
            🔄 Atualizar Lista
          </button>
          
          <div className="w-[1px] h-[22px] bg-[#aca899] mx-1 opacity-50" />
          
          <div className="flex bg-[#d5d2c4] p-[2px] rounded-sm gap-[2px]">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 text-[11px] rounded-sm transition-all ${activeTab === 'users' ? 'bg-[#316ac5] text-white shadow-inner font-bold' : 'hover:bg-[#f0f0f0] text-gray-700'}`}
            >
              👥 Usuários
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-3 py-1 text-[11px] rounded-sm transition-all ${activeTab === 'suggestions' ? 'bg-[#316ac5] text-white shadow-inner font-bold' : 'hover:bg-[#f0f0f0] text-gray-700'}`}
            >
              📧 Sugestões
              {suggestions.length > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1 rounded-full">{suggestions.length}</span>}
            </button>
          </div>

          {activeTab === 'users' && selectedUser && selectedUser.id !== loggedUser?.id && (
            <>
              <div className="w-[1px] h-[22px] bg-[#aca899] mx-1 opacity-50" />
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="flex items-center gap-1 hover:bg-[#c1d2ee] px-2 py-1 rounded text-black text-[11px] border border-transparent hover:border-[#316ac5]"
              >
                🔑 Senha
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-1 hover:bg-[#ffcccc] px-2 py-1 rounded text-red-700 text-[11px] border border-transparent hover:border-red-400"
              >
                ❌ Excluir
              </button>
            </>
          )}

          {activeTab === 'suggestions' && selectedSuggestion && (
            <>
              <div className="w-[1px] h-[22px] bg-[#aca899] mx-1 opacity-50" />
              <button
                onClick={() => handleDeleteSuggestion(selectedSuggestion.id)}
                className="flex items-center gap-1 hover:bg-[#ffcccc] px-2 py-1 rounded text-red-700 text-[11px] border border-transparent hover:border-red-400"
              >
                🗑️ Apagar "E-mail"
              </button>
            </>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-[200px] min-w-[160px] bg-white border-r border-[#aca899] flex flex-col overflow-hidden">
            <div className="bg-[#ece9d8] border-b border-[#aca899] px-2 py-[3px] text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              {activeTab === 'users' ? `Contas (${users.length})` : `Inbox (${suggestions.length})`}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && (activeTab === 'users' ? users.length === 0 : suggestions.length === 0) ? (
                <div className="p-3 text-[11px] text-gray-400 text-center">Carregando...</div>
              ) : activeTab === 'users' ? (
                users.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-2 px-2 py-[6px] cursor-default text-[11px] border-b border-[#f4f4f4] ${selectedUser?.id === user.id ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8e8e8]'}`}
                    onClick={() => selectUser(user)}
                  >
                    <span>👤</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-bold">{user.display_name}{user.id === loggedUser?.id && '★'}</span>
                      <span className={`truncate text-[9px] ${selectedUser?.id === user.id ? 'text-blue-200' : 'text-gray-400'}`}>
                        {user.notes_count} notas · {user.folders_count} pastas
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                suggestions.map(sug => (
                  <div
                    key={sug.id}
                    className={`flex flex-col px-2 py-[6px] cursor-default text-[11px] border-b border-[#f4f4f4] ${selectedSuggestion?.id === sug.id ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8e8e8]'}`}
                    onClick={() => setSelectedSuggestion(sug)}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="truncate font-bold">{sug.user_name}</span>
                      <span className={`text-[8px] whitespace-nowrap ${selectedSuggestion?.id === sug.id ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(sug.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span className={`truncate text-[10px] ${selectedSuggestion?.id === sug.id ? 'text-white' : 'text-gray-600'}`}>{sug.subject}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Painel Principal */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col bg-[#ece9d8] relative shadow-inner">
            {activeTab === 'users' ? (
              !selectedUser ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                  <span className="text-[40px] mb-2">🛡️</span>
                  <p className="text-[13px] font-bold">Gestão de Usuários</p>
                  <p className="text-[11px] mt-1">Selecione uma conta para gerenciar.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <fieldset style={{ backgroundColor: 'white' }} className="shadow-sm">
                    <legend>Perfil de "{selectedUser.display_name}"</legend>
                    <div className="p-1 text-[11px] grid grid-cols-2 gap-y-1">
                      <div><span className="text-gray-500">Email:</span> <b>{selectedUser.email}</b></div>
                      <div><span className="text-gray-500">Criado:</span> <b>{formatDate(selectedUser.created_at)}</b></div>
                      <div><span className="text-gray-500">Notas:</span> <b>{selectedUser.notes_count}</b></div>
                      <div><span className="text-gray-500">Pastas:</span> <b>{selectedUser.folders_count}</b></div>
                    </div>
                  </fieldset>

                  <fieldset style={{ backgroundColor: 'white', flex: 1 }} className="flex flex-col min-h-[200px] shadow-sm overflow-hidden">
                    <legend>Navegador de Arquivos</legend>
                    <div className="flex-1 overflow-y-auto bg-white border border-[#7f9db9]">
                      <div className="flex items-center gap-1 py-[2px] px-1 text-[11px] text-gray-500 font-bold border-b border-[#f0f0f0] mb-1 italic">
                        <span className="w-3" /><span>🖥️</span><span>Área de Trabalho</span>
                      </div>
                      {fileTree.length === 0 ? <div className="p-4 text-center text-gray-400 italic text-[11px]">Nenhum arquivo encontrado.</div> : fileTree.map(item => renderTreeItem(item, 1))}
                    </div>
                  </fieldset>

                  {previewNote && (
                    <fieldset style={{ backgroundColor: '#ffffe1', maxHeight: '250px' }} className="flex flex-col shadow-md animate-in slide-in-from-bottom-2">
                      <legend className="flex items-center justify-between w-full pr-1">
                        <span>📃 Nota: {previewNote.title}</span>
                        <button onClick={() => setPreviewNote(null)} className="text-[9px] hover:text-red-600">[X]</button>
                      </legend>
                      <div className="flex-1 p-3 overflow-y-auto text-[11px] bg-white border border-[#7f9db9]" dangerouslySetInnerHTML={{ __html: previewNote.content || '<em>Vazia</em>' }} />
                    </fieldset>
                  )}
                </div>
              )
            ) : (
              /* ABA DE SUGESTÕES */
              !selectedSuggestion ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                  <span className="text-[40px] mb-2">💡</span>
                  <p className="text-[13px] font-bold">Inbox de Sugestões</p>
                  <p className="text-[11px] mt-1">Clique em uma mensagem para ler o feedback.</p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 bg-white border border-[#7f9db9] shadow-sm overflow-hidden">
                  {/* Cabeçalho do Email no Admin */}
                  <div className="bg-[#ece9d8] p-3 border-b border-[#aca899] flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h2 className="text-[14px] font-bold text-[#003399] truncate">{selectedSuggestion.subject}</h2>
                      <span className="text-[9px] text-gray-500 mt-1">{formatDate(selectedSuggestion.created_at)}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-gray-500 font-bold">De:</span> {selectedSuggestion.user_name}
                    </div>
                    <div className="text-[11px]">
                      <span className="text-gray-500 font-bold">Para:</span> RetroNote XP Team
                    </div>
                  </div>
                  {/* Corpo da Sugestão */}
                  <div className="flex-1 p-4 overflow-y-auto text-[12px] leading-relaxed whitespace-pre-wrap font-sans bg-white selection:bg-[#316ac5] selection:text-white">
                    {selectedSuggestion.body}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="status-bar !m-0 !py-1">
          <p className="status-bar-field">{activeTab === 'users' ? `${users.length} usuários` : `${suggestions.length} sugestões`}</p>
          <p className="status-bar-field">RetroNote XP Admin</p>
        </div>
      </div>

      {/* Diálogos de Senha e Delete (mantendo os originais) */}
      {showPasswordDialog && selectedUser && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 320 }}>
            <div className="title-bar"><div className="title-bar-text">🔑 Senha - {selectedUser.display_name}</div></div>
            <div className="window-body !m-[3px] p-3">
              <div className="field-row-stacked mb-2"><label>Nova Senha:</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus /></div>
              <div className="field-row-stacked mb-2"><label>Confirmar:</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
              {dialogError && <p className="text-red-600 text-[10px] text-center mb-2">{dialogError}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={handlePasswordSubmit} disabled={dialogLoading}>Confirmar</button>
                <button onClick={() => setShowPasswordDialog(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && selectedUser && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20">
          <div className="window" style={{ width: 340 }}>
            <div className="title-bar"><div className="title-bar-text">⚠️ Excluir Conta</div></div>
            <div className="window-body !m-[3px] p-4 text-center">
              <p className="text-[11px] mb-4">Deseja excluir permanentemente a conta <b>{selectedUser.display_name}</b>?</p>
              <div className="flex justify-center gap-2">
                <button onClick={handleDeleteConfirm} disabled={dialogLoading} className="!text-red-700">Sim, Excluir</button>
                <button onClick={() => setShowDeleteDialog(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
