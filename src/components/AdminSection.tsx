/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, Sala, ApolloCode, UserCargo, VaquinhaContribution, BADGE_CONFIG, saveCustomBadgeConfig, resetBadgeConfigToDefault, Anuncio, P2POrder } from '../types';
import { Megaphone } from 'lucide-react';
import { botOrchestrator } from '../lib/bots';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Users, Settings, History, Plus, Coins, Zap, ShieldCheck, 
  Trash2, AlertTriangle, Key, List, Lock, FileText, Ban, Edit, 
  VolumeX, Volume2, LockKeyhole, Unlock, KeyRound, ArrowUpCircle, Check, X,
  Cpu, Play, Square, MessageSquare, Gift, Sparkles, RefreshCw, Send, Radio,
  Award, Upload
} from 'lucide-react';
import { UserBadgesInline } from './BadgesSection';

const CARGOS: UserCargo[] = [
  'Founder', 'Global Admin', 'Guide', 'Staff', 'Mentor', 'Mentor Head',
  'Hero', 'Merchant', 'Super Merchant', 'Verified User', 'Unverified User',
  'Lucky User', 'Chatroom Moderator', 'Chatroom Manager'
];

interface AuditLog {
  id: string;
  action: string;
  target: string;
  executor: string;
  timestamp: string;
}

export default function AdminSection() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [rooms, setRooms] = useState<Sala[]>([]);
  const [vouchers, setVouchers] = useState<ApolloCode[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'salas' | 'vouchers' | 'logs' | 'credits' | 'vaquinha' | 'bots' | 'badges' | 'anuncios'>('users');
  const [ads, setAds] = useState<Anuncio[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [vaquinhaContributions, setVaquinhaContributions] = useState<VaquinhaContribution[]>([]);
  const [p2pOrders, setP2pOrders] = useState<P2POrder[]>([]);

  // Custom non-blocking modals and toasts to bypass iframe alert/confirm issues
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Form states for Vouchers
  const [voucherAmount, setVoucherAmount] = useState<number>(100);
  const [generatedCode, setGeneratedCode] = useState<number | null>(null);

  // States for advanced user edits
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [customCredits, setCustomCredits] = useState<string>('');
  const [customXp, setCustomXp] = useState<string>('');
  const [customNivel, setCustomNivel] = useState<string>('');
  const [customPassword, setCustomPassword] = useState<string>('');

  // States for advanced room creation
  const [newRoomNome, setNewRoomNome] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomCategoria, setNewRoomCategoria] = useState('Official Rooms');
  const [newRoomCapacidade, setNewRoomCapacidade] = useState<number>(100);
  const [newRoomAnnounce, setNewRoomAnnounce] = useState('');

  // States for room announcement edits
  const [editingAnnounceRoomId, setEditingAnnounceRoomId] = useState<string | null>(null);
  const [tempAnnounceText, setTempAnnounceText] = useState<string>('');

  // States for Credits Configuration
  const [respUserId, setRespUserId] = useState<string>('');
  const [respPhone, setRespPhone] = useState<string>('');

  // States for Bot Management Panel
  const [botsList, setBotsList] = useState(() => botOrchestrator.getBots());
  const [botMetrics, setBotMetrics] = useState(() => botOrchestrator.getBotMetrics());
  const [botLogs, setBotLogs] = useState(() => botOrchestrator.getLogs());
  const [isOrchestratorRunning, setIsOrchestratorRunning] = useState(() => botOrchestrator.isRunning());

  // Action drawers for individual bots
  const [activeActionBotId, setActiveActionBotId] = useState<string | null>(null);
  const [botActionType, setBotActionType] = useState<'enter' | 'speak' | 'gift' | 'feed' | null>(null);

  // Bot action form values
  const [botEnterRoomId, setBotEnterRoomId] = useState('');
  const [botSpeakText, setBotSpeakText] = useState('');
  const [botGiftReceiverId, setBotGiftReceiverId] = useState('');
  const [botGiftId, setBotGiftId] = useState('g_rose');
  const [botFeedText, setBotFeedText] = useState('');

  // Badge customizer state
  const [activeCargoToEdit, setActiveCargoToEdit] = useState<UserCargo>('Founder');
  const [badgeName, setBadgeName] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeIcon, setBadgeIcon] = useState('');
  const [badgeBgClass, setBadgeBgClass] = useState('');
  const [badgeTextClass, setBadgeTextClass] = useState('');
  const [badgeBorderClass, setBadgeBorderClass] = useState('');

  useEffect(() => {
    if (activeCargoToEdit) {
      const conf = BADGE_CONFIG[activeCargoToEdit];
      if (conf) {
        setBadgeName(conf.name);
        setBadgeDesc(conf.description);
        setBadgeIcon(conf.icon);
        setBadgeBgClass(conf.bgClass);
        setBadgeTextClass(conf.textClass);
        setBadgeBorderClass(conf.borderClass);
      }
    }
  }, [activeCargoToEdit, activeAdminTab]);

  const currentUser = db.getActiveProfile();

  const loadAdminData = () => {
    setUsers([...db.profiles]);
    setRooms([...db.salas]);
    setVouchers([...db.apolloCodes]);
    setVaquinhaContributions([...db.vaquinhaContributions]);
    
    api.getAllAnuncios().then(allAds => {
      setAds([...allAds]);
    }).catch(() => {
      setAds([...db.anuncios]);
    });
    
    setRespUserId(db.credits_responsible_user_id || 'u1');
    setRespPhone(db.credits_responsible_phone || '870870059');
    
    api.getP2POrders().then(setP2pOrders).catch(() => {});

    // Refresh bot statistics and listings
    setBotsList([...botOrchestrator.getBots()]);
    setBotMetrics(botOrchestrator.getBotMetrics());
    setBotLogs(botOrchestrator.getLogs());
    setIsOrchestratorRunning(botOrchestrator.isRunning());

    // Load logs from localStorage
    const storedLogs = localStorage.getItem('fcfunz_audit_logs');
    if (storedLogs) {
      setAuditLogs(JSON.parse(storedLogs));
    } else {
      const defaultLogs: AuditLog[] = [
        { id: '1', action: 'Criação de Sistema', target: 'Plataforma FCFUNZ', executor: 'Kelvin', timestamp: new Date(Date.now() - 600000).toISOString() },
        { id: '2', action: 'Gerou voucher Apollo', target: '12345 (150 MZN)', executor: 'Kelvin', timestamp: new Date(Date.now() - 300000).toISOString() }
      ];
      setAuditLogs(defaultLogs);
      localStorage.setItem('fcfunz_audit_logs', JSON.stringify(defaultLogs));
    }
  };

  const handleSaveCreditsSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.setCreditsResponsible(respUserId, respPhone.trim());
      const selectedUser = db.profiles.find(p => p.id === respUserId);
      addAuditLog('Alterou Responsável de Créditos', `@${selectedUser?.username || 'Desconhecido'} (${respPhone})`);
      showSuccess('Configuração de responsável para transações de créditos atualizada com sucesso!');
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleApproveVaquinha = async (id: string) => {
    const contrib = vaquinhaContributions.find(c => c.id === id);
    if (!contrib) return;
    setConfirmModal({
      isOpen: true,
      title: 'Aprovar Doação',
      message: `Deseja realmente APROVAR a doação de ${contrib.amount_mt} MT do usuário @${contrib.username}? O usuário receberá as moedas e o cargo correspondente.`,
      onConfirm: async () => {
        try {
          await api.approveVaquinhaContribution(id);
          addAuditLog('Aprovou Doação Vaquinha', `@${contrib.username} (${contrib.amount_mt} MT)`);
          showSuccess('Doação aprovada com sucesso! O usuário foi notificado e recebeu as recompensas.');
          loadAdminData();
        } catch (err: any) {
          showError(err.message || 'Erro ao aprovar doação.');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDeclineVaquinha = async (id: string) => {
    const contrib = vaquinhaContributions.find(c => c.id === id);
    if (!contrib) return;
    setConfirmModal({
      isOpen: true,
      title: 'Recusar Doação',
      message: `Deseja realmente REJEITAR a doação de ${contrib.amount_mt} MT do usuário @${contrib.username}?`,
      onConfirm: async () => {
        try {
          await api.declineVaquinhaContribution(id);
          addAuditLog('Rejeitou Doação Vaquinha', `@${contrib.username} (${contrib.amount_mt} MT)`);
          showSuccess('Doação rejeitada e usuário notificado.');
          loadAdminData();
        } catch (err: any) {
          showError(err.message || 'Erro ao rejeitar doação.');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  useEffect(() => {
    loadAdminData();
    const unsubscribe = subscribeToGlobalUpdates(loadAdminData);
    return () => unsubscribe();
  }, []);

  const addAuditLog = (action: string, target: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      target,
      executor: currentUser.username,
      timestamp: new Date().toISOString()
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('fcfunz_audit_logs', JSON.stringify(updated));
  };

  // Change User Role (Cargo) - MÓDULO 34
  const handleChangeCargo = async (userId: string, newCargo: UserCargo) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    try {
      await api.updateProfile(userId, { cargo: newCargo });
      addAuditLog(`Alteração de Cargo para [${newCargo}]`, `@${target.username}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Grant/Modify Credits - MÓDULO 34
  const handleUpdateCredits = async (userId: string, customVal: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    const parsed = parseFloat(customVal);
    if (isNaN(parsed)) {
      alert('Por favor, digite um valor numérico válido.');
      return;
    }

    try {
      await api.updateProfile(userId, { credits: parsed });
      addAuditLog(`Definiu saldo para ${parsed} MZN`, `@${target.username}`);
      setSelectedUserId(null);
      setCustomCredits('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Change Level and XP
  const handleUpdateXpAndLevel = async (userId: string, xpStr: string, levelStr: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    const xp = parseInt(xpStr);
    const nivel = parseInt(levelStr);

    if (isNaN(xp) || isNaN(nivel)) {
      alert('Por favor, digite valores numéricos válidos.');
      return;
    }

    try {
      await api.updateProfile(userId, { xp, nivel });
      addAuditLog(`Definiu XP para ${xp} e Nível para ${nivel}`, `@${target.username}`);
      setSelectedUserId(null);
      setCustomXp('');
      setCustomNivel('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Change Password
  const handleUpdatePassword = async (userId: string, pass: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    if (!pass.trim()) {
      alert('A senha não pode estar em branco.');
      return;
    }

    try {
      await api.updateProfile(userId, { password: pass.trim() });
      addAuditLog(`Alterou a senha de acesso`, `@${target.username}`);
      setSelectedUserId(null);
      setCustomPassword('');
      alert(`Senha de @${target.username} alterada com sucesso!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Global Ban Toggle
  const handleToggleGlobalBan = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    const isBanned = db.banned_global?.includes(userId);

    try {
      if (isBanned) {
        await api.globalUnbanUser(userId);
        addAuditLog('Removeu Ban Global', `@${target.username}`);
        alert(`@${target.username} foi desbanido globalmente!`);
      } else {
        if (confirm(`Tem certeza de que deseja BANIR GLOBALMENTE o usuário @${target.username}? Ele perderá acesso imediato a todas as salas.`)) {
          await api.globalBanUser(userId);
          addAuditLog('Aplicou Ban Global', `@${target.username}`);
          alert(`@${target.username} foi banido globalmente!`);
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create Custom Chatroom
  const handleCreateCustomRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNome.trim()) return;

    try {
      const room = await api.createRoom({
        nome: newRoomNome.trim(),
        descricao: newRoomDesc.trim(),
        categoria: newRoomCategoria,
        capacidade: newRoomCapacidade,
      });

      if (newRoomAnnounce.trim()) {
        await api.updateRoomAnnounce(room.id, newRoomAnnounce.trim());
      }

      addAuditLog('Criou nova sala de chat', `"${room.nome}" na categoria ${room.categoria}`);
      
      // Reset form
      setNewRoomNome('');
      setNewRoomDesc('');
      setNewRoomCategoria('Official Rooms');
      setNewRoomCapacidade(100);
      setNewRoomAnnounce('');
      
      alert('Sala de chat criada com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Chatroom
  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (confirm(`⚠️ ALERTA CRÍTICO: Tem certeza que deseja DELETAR permanentemente a sala "${roomName}"? Todas as mensagens serão destruídas.`)) {
      try {
        await api.deleteRoom(roomId);
        addAuditLog('Deletou sala de chat', `"${roomName}"`);
        alert('Sala deletada com sucesso.');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Toggle Silence state of a Room
  const handleToggleSilenceRoom = async (roomId: string, currentSilence: boolean, roomName: string) => {
    try {
      await api.silenceRoom(roomId, !currentSilence);
      addAuditLog(`${!currentSilence ? 'Silenciou' : 'Desilenciou'} sala de chat`, `"${roomName}"`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle Lock state of a Room
  const handleToggleLockRoom = async (roomId: string, roomName: string) => {
    try {
      const locked = await api.toggleLockRoom(roomId);
      addAuditLog(`${locked ? 'Bloqueou (Lock)' : 'Desbloqueou (Unlock)'} sala de chat`, `"${roomName}"`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Update Room Announcement
  const handleSaveRoomAnnounce = async (roomId: string, roomName: string) => {
    try {
      await api.updateRoomAnnounce(roomId, tempAnnounceText.trim() || null);
      addAuditLog(`Atualizou anúncio da sala`, `"${roomName}"`);
      setEditingAnnounceRoomId(null);
      setTempAnnounceText('');
      alert('Anúncio atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create Apollo Voucher - MÓDULO 16
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherAmount <= 0) return;

    try {
      const code = await api.createVoucher(voucherAmount);
      setGeneratedCode(code);
      addAuditLog('Gerou Voucher Apollo', `${code} (${voucherAmount} MZN)`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- BOT MANAGEMENT PANEL ACTIONS ---
  const handleToggleOrchestrator = () => {
    if (botOrchestrator.isRunning()) {
      botOrchestrator.stop();
      showSuccess('Motor de Bots Sociais PAUSADO com sucesso.');
    } else {
      botOrchestrator.start();
      showSuccess('Motor de Bots Sociais INICIADO com sucesso.');
    }
    loadAdminData();
  };

  const handleToggleBotActive = (botId: string, currentActive: boolean) => {
    botOrchestrator.toggleBotActive(botId, !currentActive);
    showSuccess(`Estado autônomo do Robô modificado.`);
    loadAdminData();
  };

  const handleToggleAllBots = (active: boolean) => {
    botOrchestrator.toggleAllBots(active);
    showSuccess(`Todos os Robôs foram ${active ? 'ativados' : 'desativados'}.`);
    loadAdminData();
  };

  const handleForceEnterRoom = (botId: string) => {
    if (!botEnterRoomId) {
      showError('Selecione uma sala de chat primeiro.');
      return;
    }
    botOrchestrator.forceEnterRoom(botId, botEnterRoomId);
    showSuccess('Robô conectado à sala com sucesso!');
    setActiveActionBotId(null);
    setBotActionType(null);
    setBotEnterRoomId('');
    loadAdminData();
  };

  const handleForceLeaveRoom = (botId: string) => {
    botOrchestrator.forceLeaveRoom(botId);
    showSuccess('Robô desconectado da sala.');
    loadAdminData();
  };

  const handleForceSpeak = async (botId: string) => {
    if (!botSpeakText.trim()) {
      showError('Digite uma mensagem primeiro.');
      return;
    }
    try {
      await botOrchestrator.forceSpeak(botId, botSpeakText.trim());
      showSuccess('Robô falou na sala com sucesso!');
      setBotSpeakText('');
      setActiveActionBotId(null);
      setBotActionType(null);
      loadAdminData();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleForceSendGift = async (botId: string) => {
    if (!botGiftReceiverId) {
      showError('Selecione um usuário para receber o presente.');
      return;
    }
    try {
      await botOrchestrator.forceSendGift(botId, botGiftReceiverId, botGiftId);
      showSuccess('Presente cortesia enviado com sucesso!');
      setBotGiftReceiverId('');
      setActiveActionBotId(null);
      setBotActionType(null);
      loadAdminData();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleForcePostFeed = async (botId: string) => {
    if (!botFeedText.trim()) {
      showError('Escreva um texto para a publicação.');
      return;
    }
    try {
      await botOrchestrator.forcePostFeed(botId, botFeedText.trim());
      showSuccess('Publicação compartilhada na timeline!');
      setBotFeedText('');
      setActiveActionBotId(null);
      setBotActionType(null);
      loadAdminData();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleRunAutoBalance = () => {
    botOrchestrator.autoBalanceRooms();
    showSuccess('Balanceamento automático de salas executado!');
    loadAdminData();
  };

  // Check if active user has permission (Founder or Global Admin)
  const isAuthorized = currentUser.cargo === 'Founder' || currentUser.cargo === 'Global Admin';

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 rounded-xl border border-red-500/20 bg-red-500/5 text-center space-y-4">
        <Lock className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider">Acesso Restrito ao Painel Administrativo</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Somente usuários com o cargo de **Founder** ou **Global Admin** possuem as chaves de acesso a esta seção de auditoria.
        </p>
        <p className="text-[11px] text-slate-500 font-mono italic">
          Dica de desenvolvimento: Use a Troca Rápida de Usuário no menu superior para logar como @Kelvin (Founder) ou @Carlos_Mentor e testar!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-12 relative">
      {/* Toast Notifications */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-950/95 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm">
          <span className="text-base">✅</span>
          <span className="text-xs font-bold leading-relaxed">{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 bg-red-950/95 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm">
          <span className="text-base">❌</span>
          <span className="text-xs font-bold leading-relaxed">{errorToast}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs rounded-xl font-bold transition shadow-lg shadow-indigo-600/10"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDE NAVIGATION ACTIONS (3 cols) */}
      <div className="lg:col-span-3 flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden h-fit">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Shield className="h-4.5 w-4.5 text-indigo-400" /> Controle Administrativo
          </h2>
        </div>

        <div className="p-2 space-y-1">
          <button
            onClick={() => { setActiveAdminTab('users'); setSelectedUserId(null); }}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Users className="h-4 w-4" /> Gerenciar Usuários
          </button>
          <button
            onClick={() => { setActiveAdminTab('salas'); setEditingAnnounceRoomId(null); }}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'salas' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Settings className="h-4 w-4" /> Gerenciar Salas
          </button>
          <button
            onClick={() => setActiveAdminTab('vouchers')}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'vouchers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Key className="h-4 w-4" /> Sistema Apollo Vouchers
          </button>
          <button
            onClick={() => setActiveAdminTab('logs')}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <History className="h-4 w-4" /> Logs de Auditoria
          </button>
          <button
            onClick={() => setActiveAdminTab('credits')}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'credits' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Coins className="h-4 w-4 text-amber-400" /> Configurar Créditos
          </button>
          <button
            onClick={() => setActiveAdminTab('vaquinha')}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'vaquinha' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Aprovar Doações Vaquinha
          </button>
          <button
            onClick={() => setActiveAdminTab('bots')}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'bots' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Cpu className="h-4 w-4 text-pink-400 font-bold" /> Robôs Sociais (Bots)
          </button>
          <button
            onClick={() => setActiveAdminTab('badges')}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center gap-2 transition ${
              activeAdminTab === 'badges' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Award className="h-4 w-4 text-purple-400 font-bold" /> Gerenciar Emblemas (Novo)
          </button>
          <button
            onClick={() => setActiveAdminTab('anuncios')}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center justify-between transition ${
              activeAdminTab === 'anuncios' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-amber-400" /> Aprovar Anúncios
            </div>
            {ads.filter(a => a.status === 'pending').length > 0 && (
              <span className="bg-rose-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {ads.filter(a => a.status === 'pending').length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveAdminTab('p2p' as any)}
            className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg text-left flex items-center justify-between transition ${
              activeAdminTab === ('p2p' as any) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-400" /> Auditoria Transações P2P
            </div>
            {p2pOrders.filter(o => o.status === 'pending' || o.status === 'disputed').length > 0 && (
              <span className="bg-indigo-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {p2pOrders.filter(o => o.status === 'pending' || o.status === 'disputed').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* DETAILED CONTENT VIEWER (9 cols) */}
      <div className="lg:col-span-9 bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm h-[calc(100vh-12rem)] flex flex-col min-h-[600px]">
        
        {/* TAB 1: USERS MANAGEMENT */}
        {activeAdminTab === 'users' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Gerenciamento de Membros & Privilégios</h3>
              <p className="text-xs text-slate-400 mt-0.5">Altere o cargo oficial, ajuste saldos MZN, defina XP/Nível, altere senhas de acesso ou aplique bans globais.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1">
              {users.map(u => {
                const isGlobalBanned = db.banned_global?.includes(u.id);
                const isExpanded = selectedUserId === u.id;

                return (
                  <div 
                    key={u.id}
                    className={`flex flex-col p-4 rounded-xl border transition-all duration-300 ${
                      isGlobalBanned 
                        ? 'border-red-950 bg-red-950/10' 
                        : isExpanded 
                          ? 'border-indigo-500/50 bg-slate-950/50' 
                          : 'border-slate-850 bg-slate-950/30 hover:border-slate-800'
                    }`}
                  >
                    {/* Main row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar_url || ''} alt={u.username} className="w-10 h-10 rounded-full border border-slate-800" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-200 flex items-center gap-1">
                              @{u.username}
                              <UserBadgesInline cargo={u.cargo} className="ml-1" />
                            </p>
                            {isGlobalBanned && (
                              <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest">
                                BANIDO GLOBAL
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            MZN: <span className="font-bold text-amber-400">{u.credits}</span> • XP: <span className="font-bold text-indigo-400">{u.xp}</span> • Nível: <span className="font-bold text-sky-400">{u.nivel}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Cargo selector */}
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-slate-500 uppercase pb-1">Cargo Oficial</span>
                          <select
                            value={u.cargo}
                            onChange={(e) => handleChangeCargo(u.id, e.target.value as UserCargo)}
                            className="rounded bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
                          >
                            {CARGOS.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        {/* Expand actions toggle */}
                        <button
                          onClick={() => {
                            if (isExpanded) {
                              setSelectedUserId(null);
                            } else {
                              setSelectedUserId(u.id);
                              setCustomCredits(u.credits.toString());
                              setCustomXp((u.xp || 0).toString());
                              setCustomNivel((u.nivel || 1).toString());
                              setCustomPassword(u.password || '');
                            }
                          }}
                          className={`text-[9px] font-mono font-bold px-3 py-1.5 rounded-lg border transition ${
                            isExpanded 
                              ? 'bg-indigo-600 border-indigo-500 text-white' 
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                          }`}
                        >
                          {isExpanded ? 'FECHAR CONTROLES' : '⚙️ MAIS PODERES'}
                        </button>

                        {/* Quick Ban button */}
                        <button
                          onClick={() => handleToggleGlobalBan(u.id)}
                          className={`p-1.5 rounded transition ${
                            isGlobalBanned 
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400'
                          }`}
                          title={isGlobalBanned ? 'Desbanir globalmente' : 'Banir de toda a plataforma'}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Advanced Controls Dropdown Drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 pt-4 border-t border-slate-800/80 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Panel A: Set Balance */}
                            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl space-y-2.5">
                              <p className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                <Coins className="h-3 w-3" /> DEFINIR SALDO MZN
                              </p>
                              <div>
                                <input
                                  type="number"
                                  value={customCredits}
                                  onChange={(e) => setCustomCredits(e.target.value)}
                                  placeholder="Ex: 500"
                                  className="w-full rounded bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <button
                                onClick={() => handleUpdateCredits(u.id, customCredits)}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold py-1.5 rounded transition uppercase"
                              >
                                Aplicar Novo Saldo
                              </button>
                            </div>

                            {/* Panel B: XP & Level */}
                            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl space-y-2.5">
                              <p className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                                <ArrowUpCircle className="h-3 w-3" /> PROGRESÃO DE NÍVEL & XP
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] text-slate-500 uppercase font-mono mb-0.5">Nível</label>
                                  <input
                                    type="number"
                                    value={customNivel}
                                    onChange={(e) => setCustomNivel(e.target.value)}
                                    className="w-full rounded bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] text-slate-500 uppercase font-mono mb-0.5">XP total</label>
                                  <input
                                    type="number"
                                    value={customXp}
                                    onChange={(e) => setCustomXp(e.target.value)}
                                    className="w-full rounded bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => handleUpdateXpAndLevel(u.id, customXp, customNivel)}
                                className="w-full bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold py-1.5 rounded transition uppercase"
                              >
                                Salvar Nível/XP
                              </button>
                            </div>

                            {/* Panel C: Credentials recovery */}
                            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl space-y-2.5">
                              <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <KeyRound className="h-3 w-3" /> ALTERAR SENHA
                              </p>
                              <div>
                                <input
                                  type="text"
                                  value={customPassword}
                                  onChange={(e) => setCustomPassword(e.target.value)}
                                  placeholder="Nova senha de acesso"
                                  className="w-full rounded bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <button
                                onClick={() => handleUpdatePassword(u.id, customPassword)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded transition uppercase"
                              >
                                Forçar Nova Senha
                              </button>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS MANAGEMENT (GERENCIAR SALAS) */}
        {activeAdminTab === 'salas' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Controle Global de Chatrooms (Salas)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Crie salas de bate-papo exclusivas, gerencie silenciamento ou bloqueios, edite anúncios ou destrua salas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4 min-h-0">
              
              {/* Creator Form */}
              <form onSubmit={handleCreateCustomRoom} className="md:col-span-5 bg-slate-950/40 border border-slate-850 p-4 rounded-xl h-fit space-y-4">
                <p className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">✦ CRIAR NOVA CHATROOM</p>
                
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Nome da Sala</label>
                  <input
                    type="text"
                    required
                    value={newRoomNome}
                    onChange={(e) => setNewRoomNome(e.target.value)}
                    placeholder="Ex: Sala VIP Platinum 💎"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Descrição</label>
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="Descrição rápida da finalidade"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Categoria</label>
                    <select
                      value={newRoomCategoria}
                      onChange={(e) => setNewRoomCategoria(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Official Rooms">Official Rooms</option>
                      <option value="Gaming Rooms">Gaming Rooms</option>
                      <option value="Hot Rooms">Hot Rooms</option>
                      <option value="VIP Lounges">VIP Lounges</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Capacidade</label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={500}
                      value={newRoomCapacidade}
                      onChange={(e) => setNewRoomCapacidade(parseInt(e.target.value) || 100)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Anúncio de Boas-vindas (Opcional)</label>
                  <textarea
                    rows={2}
                    value={newRoomAnnounce}
                    onChange={(e) => setNewRoomAnnounce(e.target.value)}
                    placeholder="Texto de aviso em banner no topo do chat"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-lg transition"
                >
                  Criar e Ativar Sala
                </button>
              </form>

              {/* Active list */}
              <div className="md:col-span-7 flex flex-col min-h-0">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider pb-2">Salas de Chat Ativas ({rooms.length})</p>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {rooms.map(room => {
                    const isEditingAnnounce = editingAnnounceRoomId === room.id;

                    return (
                      <div 
                        key={room.id}
                        className="flex flex-col p-3 rounded-lg border border-slate-850 bg-slate-950/20 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-200 flex items-center gap-1.5">
                              {room.nome}
                              {room.locked && <LockKeyhole className="h-3.5 w-3.5 text-amber-500" title="Sala Bloqueada" />}
                              {room.silence && <VolumeX className="h-3.5 w-3.5 text-red-400" title="Sala Silenciada" />}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{room.categoria} • Máx: {room.capacidade} participantes</p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Toggle Lock */}
                            <button
                              onClick={() => handleToggleLockRoom(room.id, room.nome)}
                              className={`p-1.5 rounded transition ${room.locked ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-amber-400'}`}
                              title={room.locked ? 'Desbloquear Entrada (Abrir para todos)' : 'Bloquear Entrada (Restrito a Mod/Admin)'}
                            >
                              {room.locked ? <LockKeyhole className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>

                            {/* Toggle Silence */}
                            <button
                              onClick={() => handleToggleSilenceRoom(room.id, !!room.silence, room.nome)}
                              className={`p-1.5 rounded transition ${room.silence ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-red-400'}`}
                              title={room.silence ? 'Desfazer Silenciamento da Sala' : 'Silenciar Usuários Comuns'}
                            >
                              {room.silence ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </button>

                            {/* Toggle Announce Edit */}
                            <button
                              onClick={() => {
                                if (isEditingAnnounce) {
                                  setEditingAnnounceRoomId(null);
                                } else {
                                  setEditingAnnounceRoomId(room.id);
                                  setTempAnnounceText(room.announce || '');
                                }
                              }}
                              className={`p-1.5 rounded transition ${isEditingAnnounce ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-indigo-400'}`}
                              title="Editar Anúncio (Top Banner)"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Room */}
                            <button
                              onClick={() => handleDeleteRoom(room.id, room.nome)}
                              className="p-1.5 rounded bg-red-650/10 hover:bg-red-600/30 border border-red-500/20 hover:border-red-500/40 text-red-400 transition"
                              title="Destruir Sala Permanentemente"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Announcement edit drawer */}
                        {isEditingAnnounce && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-800 space-y-1.5">
                            <label className="block text-[8px] font-mono text-slate-500 uppercase">BANNER DE ANÚNCIO DO TOPO</label>
                            <input
                              type="text"
                              value={tempAnnounceText}
                              onChange={(e) => setTempAnnounceText(e.target.value)}
                              placeholder="Digite o texto informativo da sala..."
                              className="w-full rounded bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingAnnounceRoomId(null)}
                                className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveRoomAnnounce(room.id, room.nome)}
                                className="px-2.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}

                        {room.announce && !isEditingAnnounce && (
                          <div className="mt-1.5 p-1.5 rounded bg-indigo-950/20 border border-indigo-500/10 text-[10px] text-indigo-300 italic">
                            📢 {room.announce}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM APOLLO VOUCHERS */}
        {activeAdminTab === 'vouchers' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Gerador de Vouchers Apollo</h3>
              <p className="text-xs text-slate-400 mt-0.5">Crie códigos numéricos resgatáveis de bônus MZN para distribuir aos usuários nas salas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-5 min-h-0">
              
              {/* Creator Form */}
              <form onSubmit={handleCreateVoucher} className="md:col-span-5 bg-slate-950/40 border border-slate-850 p-4 rounded-xl h-fit space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Valor do Voucher (MZN)</label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    required
                    value={voucherAmount}
                    onChange={(e) => setVoucherAmount(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition"
                >
                  Gerar Código Apollo
                </button>

                {generatedCode && (
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-mono text-slate-500 uppercase">Voucher Gerado</p>
                    <p className="text-xl font-black text-indigo-400 tracking-widest mt-1">{generatedCode}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Compartilhe no chat para resgate via *rapollo [código]</p>
                  </div>
                )}
              </form>

              {/* Active list */}
              <div className="md:col-span-7 flex flex-col min-h-0">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider pb-2">Vouchers Criados</p>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {vouchers.map(v => (
                    <div 
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-850 bg-slate-950/20 text-xs"
                    >
                      <div>
                        <p className="font-mono font-bold text-slate-200">Código: {v.code}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Criado por Admin • Valor: {v.amount} MZN</p>
                      </div>

                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                        v.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {v.status === 'active' ? 'Ativo' : 'Resgatado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeAdminTab === 'logs' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Histórico de Auditoria & Segurança</h3>
              <p className="text-xs text-slate-400 mt-0.5">Log cronológico de todas as ações administrativas executadas na plataforma FCFUNZ</p>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 font-mono text-[10px]">
              {auditLogs.map(log => (
                <div 
                  key={log.id}
                  className="p-3 rounded-lg border border-slate-850 bg-slate-950/20 flex items-start justify-between gap-4 text-slate-400"
                >
                  <div className="space-y-1">
                    <p className="text-slate-200 leading-normal">
                      <span className="text-indigo-400 font-bold">[{log.executor}]</span> {log.action} em {log.target}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      ID: {log.id} • {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <span className="shrink-0 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-500 text-[8px] uppercase font-bold">
                    SECURE_LOG
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CREDITS CONFIGURATION */}
        {activeAdminTab === 'credits' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Coins className="h-4.5 w-4.5 text-amber-400" /> Configuração do Responsável de Créditos (Npr)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Defina qual membro da equipe de administração responderá pelos recebimentos e envios manuais de créditos MZN.</p>
            </div>

            <div className="mt-5 max-w-xl bg-slate-950/40 border border-slate-850 p-5 rounded-xl space-y-5">
              <form onSubmit={handleSaveCreditsSettings} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Membro Responsável Autorizado</label>
                  <select
                    value={respUserId}
                    onChange={(e) => setRespUserId(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="" disabled>Selecione um administrador...</option>
                    {users
                      .filter(u => ['Founder', 'Global Admin', 'Mentor', 'Staff', 'Mentor Head'].includes(u.cargo))
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          @{u.username} - {u.nome} {u.sobrenome} ({u.cargo})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Número de Telefone de Contato</label>
                  <input
                    type="text"
                    required
                    value={respPhone}
                    onChange={(e) => setRespPhone(e.target.value)}
                    placeholder="Ex: 870870059"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Este número será disponibilizado para os usuários gerarem links diretos de ligação e conversa no WhatsApp.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-md shadow-indigo-600/10"
                  >
                    Salvar Alterações de Contato
                  </button>
                </div>
              </form>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-850/60 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 block text-[10px] uppercase font-mono tracking-wider">Como funciona?</span>
                <p className="leading-relaxed">
                  Quando os usuários acessarem a aba <strong>Preços mzn</strong> no menu principal, o sistema buscará em tempo real este responsável e o número configurado.
                </p>
                <p className="leading-relaxed">
                  Isso permite trocar de responsável rapidamente caso o fundador mude de telefone ou delegue a função para um Mentor de confiança posteriormente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: VAQUINHA/DONATIONS MANAGEMENT */}
        {activeAdminTab === 'vaquinha' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" /> Aprovações de Contribuições (Vaquinha)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Valide as transferências E-mola enviadas para a vaquinha profissional do site. Ao aprovar, moedas e cargos são liberados na hora.</p>
              </div>

              {/* Stats Summary Cards */}
              <div className="flex items-center gap-3">
                <div className="bg-slate-950/40 border border-slate-850 px-3 py-1.5 rounded-lg text-right">
                  <span className="text-[9px] text-slate-500 block font-mono uppercase font-semibold">Total Arrecadado</span>
                  <span className="text-emerald-400 font-extrabold text-xs">
                    {vaquinhaContributions
                      .filter(c => c.status === 'approved')
                      .reduce((sum, c) => sum + c.amount_mt, 0)} MT
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 px-3 py-1.5 rounded-lg text-right">
                  <span className="text-[9px] text-slate-500 block font-mono uppercase font-semibold">Fila Pendente</span>
                  <span className="text-amber-400 font-extrabold text-xs">
                    {vaquinhaContributions.filter(c => c.status === 'pending').length} solicitações
                  </span>
                </div>
              </div>
            </div>

            {/* List of Contributions */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 min-h-0">
              {vaquinhaContributions.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/20 border border-slate-850 rounded-xl">
                  <ShieldCheck className="h-8 w-8 text-slate-600 mx-auto mb-2.5" />
                  <p className="text-xs font-mono font-medium text-slate-400">Nenhuma contribuição registrada no sistema.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaquinhaContributions.map((contrib) => (
                    <div 
                      key={contrib.id} 
                      className={`p-4 rounded-xl border transition ${
                        contrib.status === 'pending'
                          ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          : contrib.status === 'approved'
                          ? 'bg-emerald-950/10 border-emerald-900/30'
                          : 'bg-slate-950/30 border-slate-900/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-200">@{contrib.username}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              ID Usuário: {contrib.user_id}
                            </span>
                            {contrib.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse border border-amber-500/15 font-mono uppercase">
                                ⏳ Aguardando Verificação
                              </span>
                            )}
                            {contrib.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15 font-mono uppercase">
                                ✓ Aprovado por @{contrib.approved_by}
                              </span>
                            )}
                            {contrib.status === 'declined' && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/15 font-mono uppercase">
                                ❌ Recusado por @{contrib.approved_by}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
                            <div>
                              <span className="text-slate-500">Valor Transferido:</span>{' '}
                              <strong className="text-slate-200 font-extrabold">{contrib.amount_mt} MT</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Nº Celular E-mola:</span>{' '}
                              <span className="text-slate-300">{contrib.phone_number}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-500">Ref / Transação ID:</span>{' '}
                              <span className="text-indigo-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                                {contrib.transaction_id}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span>Enviado em: {new Date(contrib.created_at).toLocaleString('pt-MZ')}</span>
                            {contrib.approved_at && (
                              <>
                                <span className="text-slate-700">•</span>
                                <span>Ação em: {new Date(contrib.approved_at).toLocaleString('pt-MZ')}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {contrib.status === 'pending' && (
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleDeclineVaquinha(contrib.id)}
                              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-900/30 text-[10px] font-bold font-mono rounded-lg transition flex items-center gap-1 uppercase"
                            >
                              <X className="h-3 w-3" /> Recusar
                            </button>
                            <button
                              onClick={() => handleApproveVaquinha(contrib.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold font-mono rounded-lg transition shadow-md shadow-emerald-600/10 flex items-center gap-1 uppercase"
                            >
                              <Check className="h-3 w-3" /> Confirmar Pagamento
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: BOTS MANAGEMENT PANEL */}
        {activeAdminTab === 'bots' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Cpu className="h-4.5 w-4.5 text-pink-400" /> Painel de Controle de Robôs Autônomos (Social Bots)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gerencie o comportamento, force ações ou ajuste a densidade de presença dos bots nas salas de chat.
                </p>
              </div>

              {/* Orchestrator Master Switch */}
              <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 px-4 py-2 rounded-xl">
                <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isOrchestratorRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  MOTOR DE BOTS: {isOrchestratorRunning ? 'ATIVO' : 'PAUSADO'}
                </span>
                <button
                  onClick={handleToggleOrchestrator}
                  className={`px-3 py-1 text-[10px] font-black font-mono uppercase rounded-lg transition ${
                    isOrchestratorRunning 
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isOrchestratorRunning ? 'Pausar' : 'Iniciar'}
                </button>
              </div>
            </div>

            {/* Engagement Metrics Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-950/30 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Bots Ativos</span>
                  <p className="text-xl font-black text-white mt-1">{botMetrics.active} / {botMetrics.total}</p>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {botMetrics.inRooms} em salas de chat
                </div>
              </div>

              <div className="bg-slate-950/30 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Salas Vazias Reduzidas</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className="text-xl font-black text-emerald-400">{botMetrics.emptyRoomsReduced}%</p>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${botMetrics.emptyRoomsReduced}%` }} />
                </div>
              </div>

              <div className="bg-slate-950/30 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Taxa de Resposta de Menção</span>
                  <p className="text-xl font-black text-pink-400 mt-1">{botMetrics.responseRate}%</p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
                  <div className="bg-pink-500 h-full rounded-full" style={{ width: `${botMetrics.responseRate}%` }} />
                </div>
              </div>

              <div className="bg-slate-950/30 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Histórico de Atividade</span>
                  <p className="text-xs font-semibold text-slate-200 mt-1">
                    💬 {botMetrics.totalMsgs} Mensagens enviadas
                  </p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">
                    🎁 {botMetrics.totalGifts} Presentes cortesia
                  </p>
                </div>
                <button
                  onClick={handleRunAutoBalance}
                  className="mt-2 w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 py-1 rounded text-[9px] font-mono font-bold uppercase transition flex items-center justify-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Balancear Densidade
                </button>
              </div>
            </div>

            {/* Split view: Bot listing & Terminal Logs */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 min-h-0">
              
              {/* Bots list (7 cols) */}
              <div className="lg:col-span-8 flex flex-col min-h-0 border border-slate-850/60 rounded-xl bg-slate-950/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-850/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Configuração Individual de Robôs</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAllBots(true)}
                      className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded text-slate-300 transition"
                    >
                      Ligar Todos
                    </button>
                    <button
                      onClick={() => handleToggleAllBots(false)}
                      className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded text-slate-300 transition"
                    >
                      Desligar Todos
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 pr-1">
                  {botsList.map((bot) => {
                    const room = rooms.find(r => r.id === bot.currentRoomId);
                    const isBotActionOpen = activeActionBotId === bot.id;

                    return (
                      <div key={bot.id} className="p-3.5 rounded-xl border border-slate-850/80 bg-slate-900/30 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={bot.avatar_url} alt={bot.username} className="w-10 h-10 rounded-full border border-slate-850 object-cover" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">@{bot.username}</span>
                                <span className={`text-[8px] font-bold font-mono px-1.5 py-0.2 rounded border uppercase ${
                                  bot.personality === 'extrovertido' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  bot.personality === 'timido' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                  bot.personality === 'engracado' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  bot.personality === 'ajudante' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                  'bg-pink-500/10 border-pink-500/20 text-pink-400'
                                }`}>
                                  {bot.personality}
                                </span>
                                <span className="text-[8px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                                  {bot.type}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${bot.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                                {bot.active ? 'Autônomo' : 'Manual apenas'}
                                <span className="text-slate-600">|</span>
                                📍 {room ? `Em: ${room.nome}` : 'Offline'}
                              </p>
                            </div>
                          </div>

                          {/* Quick controls */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Autonomous toggle */}
                            <button
                              onClick={() => handleToggleBotActive(bot.id, bot.active)}
                              className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg border transition ${
                                bot.active
                                  ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30'
                                  : 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              {bot.active ? 'Auto: ON' : 'Auto: OFF'}
                            </button>

                            {/* Open actions */}
                            <button
                              onClick={() => {
                                if (isBotActionOpen) {
                                  setActiveActionBotId(null);
                                  setBotActionType(null);
                                } else {
                                  setActiveActionBotId(bot.id);
                                  setBotActionType('enter');
                                }
                              }}
                              className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border transition ${
                                isBotActionOpen 
                                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                                  : 'bg-slate-800 border-slate-750 text-slate-200 hover:bg-slate-750'
                              }`}
                            >
                              ⚡ COMANDAR
                            </button>

                            {bot.currentRoomId && (
                              <button
                                onClick={() => handleForceLeaveRoom(bot.id)}
                                className="text-[9px] font-mono font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg transition"
                                title="Forçar saída da sala"
                              >
                                Desconectar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable actions panel */}
                        {isBotActionOpen && (
                          <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-850 text-xs text-slate-300 space-y-3">
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                              <button
                                onClick={() => setBotActionType('enter')}
                                className={`flex-1 text-center py-1 rounded font-mono text-[9px] font-bold transition uppercase ${
                                  botActionType === 'enter' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Sala 🚪
                              </button>
                              <button
                                onClick={() => setBotActionType('speak')}
                                className={`flex-1 text-center py-1 rounded font-mono text-[9px] font-bold transition uppercase ${
                                  botActionType === 'speak' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Falar 💬
                              </button>
                              <button
                                onClick={() => setBotActionType('gift')}
                                className={`flex-1 text-center py-1 rounded font-mono text-[9px] font-bold transition uppercase ${
                                  botActionType === 'gift' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Presente 🎁
                              </button>
                              <button
                                onClick={() => setBotActionType('feed')}
                                className={`flex-1 text-center py-1 rounded font-mono text-[9px] font-bold transition uppercase ${
                                  botActionType === 'feed' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Timeline 📱
                              </button>
                            </div>

                            {/* Option 1: Join room */}
                            {botActionType === 'enter' && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Forçar entrada em Sala</span>
                                <div className="flex gap-2">
                                  <select
                                    value={botEnterRoomId}
                                    onChange={(e) => setBotEnterRoomId(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                                  >
                                    <option value="">-- Escolher Sala --</option>
                                    {rooms.map(r => (
                                      <option key={r.id} value={r.id}>{r.nome} ({db.room_participants.filter(p => p.sala_id === r.id).length} ativos)</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleForceEnterRoom(bot.id)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs px-4 py-1 rounded-md font-bold transition uppercase"
                                  >
                                    Ir para Sala
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Option 2: Force speak */}
                            {botActionType === 'speak' && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Forçar envio de Mensagem (no Chat)</span>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={botSpeakText}
                                    onChange={(e) => setBotSpeakText(e.target.value)}
                                    placeholder="Digite o que o robô falará na sala..."
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleForceSpeak(bot.id)}
                                  />
                                  <button
                                    onClick={() => handleForceSpeak(bot.id)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs px-4 py-1 rounded-md font-bold transition uppercase flex items-center gap-1"
                                  >
                                    <Send className="h-3 w-3" /> Falar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Option 3: Force gift */}
                            {botActionType === 'gift' && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Enviar Presente Cortesia</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {/* Select Target User */}
                                  <select
                                    value={botGiftReceiverId}
                                    onChange={(e) => setBotGiftReceiverId(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="">-- Destinatário --</option>
                                    {db.room_participants
                                      .filter(p => p.sala_id === bot.currentRoomId && !p.user_id.startsWith('bot_'))
                                      .map(p => {
                                        const u = db.profiles.find(pr => pr.id === p.user_id);
                                        return (
                                          <option key={p.id} value={p.user_id}>@{u?.username || 'Anônimo'}</option>
                                        );
                                      })}
                                  </select>

                                  {/* Select Gift */}
                                  <select
                                    value={botGiftId}
                                    onChange={(e) => setBotGiftId(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                                  >
                                    {api.getGifts()
                                      .filter(g => g.valor <= 5)
                                      .map(g => (
                                        <option key={g.id} value={g.id}>{g.imagem} {g.nome} ({g.valor} MZN)</option>
                                      ))}
                                  </select>

                                  <button
                                    onClick={() => handleForceSendGift(bot.id)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs py-1 rounded-md font-bold transition uppercase flex items-center justify-center gap-1"
                                  >
                                    <Gift className="h-3.5 w-3.5" /> Gifting
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Option 4: Force post on feed */}
                            {botActionType === 'feed' && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Forçar publicação no Feed (Status Social)</span>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={botFeedText}
                                    onChange={(e) => setBotFeedText(e.target.value)}
                                    placeholder="No que o robô está pensando hoje para publicar?"
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleForcePostFeed(bot.id)}
                                  />
                                  <button
                                    onClick={() => handleForcePostFeed(bot.id)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs px-4 py-1 rounded-md font-bold transition uppercase"
                                  >
                                    Publicar Feed
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Terminal Logs (4 cols) */}
              <div className="lg:col-span-4 flex flex-col min-h-0 border border-slate-850 bg-slate-950/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-850 flex items-center justify-between font-semibold">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Radio className="h-3 w-3 text-pink-400 animate-pulse" /> Logs em Tempo Real
                  </span>
                  <button
                    onClick={() => {
                      localStorage.setItem('fcfunz_bots_logs', JSON.stringify([]));
                      setBotLogs([]);
                    }}
                    className="text-[8px] font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 px-2 py-0.5 rounded transition uppercase"
                  >
                    Limpar
                  </button>
                </div>

                <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] space-y-2.5 bg-slate-950/80 scrollbar-thin scrollbar-thumb-slate-800 text-slate-300 pr-1 select-text">
                  {botLogs.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 italic">
                      [Nenhuma atividade registrada ainda]
                    </div>
                  ) : (
                    botLogs.map((log) => (
                      <div key={log.id} className="border-b border-slate-900/60 pb-1.5 last:border-0 leading-relaxed">
                        <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString('pt-MZ')}]</span>{' '}
                        <span className="text-indigo-400 font-bold">@{log.botUsername}</span>{' '}
                        <span className="text-slate-100 font-semibold">({log.action})</span>
                        {log.roomName && (
                          <span className="text-pink-400"> na sala [{log.roomName}]</span>
                        )}
                        <p className="text-slate-400 pl-4 mt-0.5 text-[9.5px] border-l border-slate-800 bg-slate-950/30 py-0.5 rounded">
                          {log.details}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeAdminTab === 'badges' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-400" /> Gerenciador de Emblemas de Cargos
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure e envie imagens customizadas para os emblemas de patentes de todos os cargos do sistema.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm("Deseja redefinir TODOS os emblemas para as configurações padrões?")) {
                    (Object.keys(BADGE_CONFIG) as UserCargo[]).forEach(c => {
                      resetBadgeConfigToDefault(c);
                    });
                    // Refresh current fields
                    const conf = BADGE_CONFIG[activeCargoToEdit];
                    if (conf) {
                      setBadgeName(conf.name);
                      setBadgeDesc(conf.description);
                      setBadgeIcon(conf.icon);
                      setBadgeBgClass(conf.bgClass);
                      setBadgeTextClass(conf.textClass);
                      setBadgeBorderClass(conf.borderClass);
                    }
                    showSuccess("Todos os emblemas foram restaurados para os padrões!");
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 hover:text-white transition"
              >
                Restaurar Todos Padrões
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
              {/* Left Column: Cargos list (5 cols) */}
              <div className="lg:col-span-5 flex flex-col min-h-0 border border-slate-850 bg-slate-950/20 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-850">
                  <span className="text-xs font-semibold text-slate-300">Escolha o Cargo para Customizar</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                  {(Object.keys(BADGE_CONFIG) as UserCargo[]).map((cargo) => {
                    const active = cargo === activeCargoToEdit;
                    const bConf = BADGE_CONFIG[cargo];
                    const isImage = bConf.icon && (
                      bConf.icon.startsWith('data:image/') || 
                      bConf.icon.startsWith('http://') || 
                      bConf.icon.startsWith('https://') || 
                      bConf.icon.includes('/') || 
                      bConf.icon.includes('.')
                    );
                    return (
                      <button
                        key={cargo}
                        onClick={() => setActiveCargoToEdit(cargo)}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition ${
                          active 
                            ? 'bg-indigo-600/25 border border-indigo-500/40 text-white' 
                            : 'hover:bg-slate-800/40 border border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-sm shrink-0 text-xs ${bConf.bgClass} ${bConf.borderClass} ${bConf.textClass}`}>
                            {isImage ? (
                              <img src={bConf.icon} alt={bConf.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              bConf.icon
                            )}
                          </span>
                          <span className="text-xs font-medium truncate">{cargo}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-60 truncate max-w-[120px] text-right">
                          {bConf.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Customizer Form (7 cols) */}
              <div className="lg:col-span-7 flex flex-col min-h-0 border border-slate-850 bg-slate-950/20 rounded-xl overflow-y-auto scrollbar-none">
                <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-850 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Customização do Emblema: <span className="text-indigo-400 font-bold">{activeCargoToEdit}</span></span>
                  <button
                    onClick={() => {
                      resetBadgeConfigToDefault(activeCargoToEdit);
                      // reload values
                      const conf = BADGE_CONFIG[activeCargoToEdit];
                      if (conf) {
                        setBadgeName(conf.name);
                        setBadgeDesc(conf.description);
                        setBadgeIcon(conf.icon);
                        setBadgeBgClass(conf.bgClass);
                        setBadgeTextClass(conf.textClass);
                        setBadgeBorderClass(conf.borderClass);
                      }
                      showSuccess(`Restaurado padrão para o cargo ${activeCargoToEdit}`);
                    }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-rose-400 transition"
                  >
                    Restaurar Padrão Deste Cargo
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Name and Description fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                        Nome de Exibição
                      </label>
                      <input
                        type="text"
                        value={badgeName}
                        onChange={(e) => setBadgeName(e.target.value)}
                        placeholder="Ex: Fundador Supremo"
                        className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                        Descrição do Emblema
                      </label>
                      <input
                        type="text"
                        value={badgeDesc}
                        onChange={(e) => setBadgeDesc(e.target.value)}
                        placeholder="Ex: Proprietário e criador original..."
                        className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Badge Upload Area with Drag & Drop */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                      Upload do Emblema Personalizado (Ícone/Imagem)
                    </label>
                    
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            showError("A imagem é muito grande! Escolha uma imagem de até 1MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64Url = event.target?.result as string;
                            if (base64Url) {
                              setBadgeIcon(base64Url);
                              showSuccess("Imagem arrastada com sucesso!");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 text-center bg-slate-900/60 hover:bg-slate-900/80 transition cursor-pointer relative"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              showError("A imagem é muito grande! Escolha uma imagem de até 1MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64Url = event.target?.result as string;
                              if (base64Url) {
                                setBadgeIcon(base64Url);
                                showSuccess("Imagem selecionada com sucesso!");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-300">
                        Clique para selecionar ou arraste o arquivo aqui
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Formatos aceitos: PNG, JPG, WEBP, SVG (Recomendado: 64x64, máx 1MB)
                      </p>
                    </div>
                  </div>

                  {/* Icon character alternative */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                        Ou utilize Emoji / Caractere (Alternativa)
                      </label>
                      <input
                        type="text"
                        value={badgeIcon && badgeIcon.startsWith('data:') ? '' : badgeIcon}
                        onChange={(e) => setBadgeIcon(e.target.value)}
                        placeholder="Ex: 👑, ⭐, 🛡️"
                        className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold font-mono">
                        Tema/Cor de Borda & Fundo
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setBadgeBgClass('bg-amber-600/10');
                            setBadgeBorderClass('border-amber-600/30');
                            setBadgeTextClass('text-amber-500');
                          }}
                          className="px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-[10px] font-semibold hover:bg-amber-500/20 transition truncate"
                        >
                          Dourado
                        </button>
                        <button
                          onClick={() => {
                            setBadgeBgClass('bg-red-600/10');
                            setBadgeBorderClass('border-red-600/30');
                            setBadgeTextClass('text-red-500');
                          }}
                          className="px-2 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-semibold hover:bg-red-500/20 transition truncate"
                        >
                          Vermelho
                        </button>
                        <button
                          onClick={() => {
                            setBadgeBgClass('bg-blue-600/10');
                            setBadgeBorderClass('border-blue-600/30');
                            setBadgeTextClass('text-blue-500');
                          }}
                          className="px-2 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] font-semibold hover:bg-blue-500/20 transition truncate"
                        >
                          Azul
                        </button>
                        <button
                          onClick={() => {
                            setBadgeBgClass('bg-purple-600/10');
                            setBadgeBorderClass('border-purple-600/30');
                            setBadgeTextClass('text-purple-500');
                          }}
                          className="px-2 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-[10px] font-semibold hover:bg-purple-500/20 transition truncate"
                        >
                          Roxo
                        </button>
                        <button
                          onClick={() => {
                            setBadgeBgClass('bg-emerald-600/10');
                            setBadgeBorderClass('border-emerald-600/30');
                            setBadgeTextClass('text-emerald-500');
                          }}
                          className="px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-semibold hover:bg-emerald-500/20 transition truncate"
                        >
                          Verde
                        </button>
                        <button
                          onClick={() => {
                            setBadgeBgClass('bg-slate-600/10');
                            setBadgeBorderClass('border-slate-600/30');
                            setBadgeTextClass('text-slate-400');
                          }}
                          className="px-2 py-1.5 bg-slate-500/10 border border-slate-500/30 text-slate-400 rounded text-[10px] font-semibold hover:bg-slate-500/20 transition truncate"
                        >
                          Cinza
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CSS classes tuning */}
                  <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-3 space-y-3">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Visual & CSS Customizado</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] text-slate-500 font-mono block mb-1">Fundo (Filtro/Opacidade)</label>
                        <input
                          type="text"
                          value={badgeBgClass}
                          onChange={(e) => setBadgeBgClass(e.target.value)}
                          className="w-full text-[11px] bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-300 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 font-mono block mb-1">Borda (Estilo/Cor)</label>
                        <input
                          type="text"
                          value={badgeBorderClass}
                          onChange={(e) => setBadgeBorderClass(e.target.value)}
                          className="w-full text-[11px] bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-300 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 font-mono block mb-1">Texto (Alternativo)</label>
                        <input
                          type="text"
                          value={badgeTextClass}
                          onChange={(e) => setBadgeTextClass(e.target.value)}
                          className="w-full text-[11px] bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-300 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PREVIEW CONTAINER */}
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">Prévia em Tempo Real</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-slate-500 block">Emblema Isolado:</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            title={`${badgeName} - ${badgeDesc}`}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs select-none shadow-sm border overflow-hidden ${badgeBgClass} ${badgeBorderClass} ${badgeTextClass}`}
                          >
                            {badgeIcon && (badgeIcon.startsWith('data:image/') || badgeIcon.startsWith('http')) ? (
                              <img src={badgeIcon} alt={badgeName} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              badgeIcon || '?'
                            )}
                          </span>
                          <span className="text-xs text-slate-300 font-bold font-mono">"{badgeName}"</span>
                        </div>
                      </div>

                      <div className="hidden sm:block h-8 w-[1px] bg-slate-800" />

                      <div className="space-y-1 flex-1">
                        <span className="text-[9px] font-mono text-slate-500 block">Exibição no Chat:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-bold">Lvl 10</span>
                          <span className="text-xs font-bold text-amber-400 underline decoration-indigo-500/40">Kelvin_Wilson</span>
                          <span className="inline-flex items-center gap-1 shrink-0 align-middle ml-1.5">
                            <span
                              title={`${badgeName} - ${badgeDesc}`}
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] overflow-hidden select-none cursor-help shadow-sm border ${badgeBgClass} ${badgeBorderClass} ${badgeTextClass} hover:scale-125 hover:rotate-6 transition-all duration-200`}
                            >
                              {badgeIcon && (badgeIcon.startsWith('data:image/') || badgeIcon.startsWith('http')) ? (
                                <img src={badgeIcon} alt={badgeName} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                badgeIcon || '?'
                              )}
                            </span>
                          </span>
                          <span className="text-xs text-slate-400 ml-2">: Olá pessoal, confiram o novo emblema! 🚀</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SAVE BUTTON */}
                  <button
                    onClick={() => {
                      if (!badgeName.trim()) {
                        showError("Por favor, preencha o nome do emblema.");
                        return;
                      }
                      saveCustomBadgeConfig({
                        [activeCargoToEdit]: {
                          name: badgeName,
                          description: badgeDesc,
                          icon: badgeIcon,
                          bgClass: badgeBgClass,
                          borderClass: badgeBorderClass,
                          textClass: badgeTextClass
                        }
                      });
                      
                      // Add audit log
                      const newAudit: AuditLog = {
                        id: 'audit_' + Math.random().toString(36).substr(2, 9),
                        action: `Alterou emblema de ${activeCargoToEdit}`,
                        executor: currentUser.username,
                        target: `Emblema: ${badgeName}`,
                        timestamp: new Date().toISOString()
                      };
                      setAuditLogs(prev => [newAudit, ...prev]);
                      const savedLogs = JSON.parse(localStorage.getItem('fcfunz_admin_audit_logs') || '[]');
                      localStorage.setItem('fcfunz_admin_audit_logs', JSON.stringify([newAudit, ...savedLogs]));

                      showSuccess(`Emblema de ${activeCargoToEdit} atualizado com sucesso!`);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold border border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/15 transition flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" /> Salvar Customização do Emblema
                  </button>

                </div>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === 'anuncios' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-400" /> Aprovação de Anúncios Públicos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Revise e aprove anúncios submetidos pelos usuários antes de serem publicados e exibidos aleatoriamente no rodapé.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
              {ads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-950/20 border border-slate-850 rounded-xl">
                  <Megaphone className="h-8 w-8 text-slate-700 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">Nenhum anúncio cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ads.map((ad) => (
                    <div 
                      key={ad.id} 
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        ad.status === 'pending' 
                          ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' 
                          : ad.status === 'active' 
                          ? 'bg-emerald-500/5 border-emerald-500/15' 
                          : ad.status === 'rejected'
                          ? 'bg-rose-500/5 border-rose-500/15'
                          : 'bg-slate-950/20 border-slate-850'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-indigo-400">@{ad.autor_username}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(ad.criado_em).toLocaleString('pt-MZ')}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                              {ad.dias} dias • {ad.valor_pago} MZN
                            </span>
                            
                            {ad.status === 'pending' && (
                              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Pendente Staff
                              </span>
                            )}
                            {ad.status === 'active' && (
                              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Ativo no Rodapé
                              </span>
                            )}
                            {ad.status === 'rejected' && (
                              <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Rejeitado
                              </span>
                            )}
                            {ad.status === 'expired' && (
                              <span className="text-[9px] bg-slate-500/10 border border-slate-500/20 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Expirado
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-200 font-medium bg-slate-950/40 p-3 rounded-lg border border-slate-850/50 break-words font-sans">
                            {ad.texto}
                          </p>
                        </div>

                        {ad.status === 'pending' && (
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <button
                              onClick={async () => {
                                try {
                                  await api.updateAnuncioStatus(ad.id, 'active');
                                  showSuccess(`Anúncio de @${ad.autor_username} aprovado com sucesso!`);
                                  
                                  // Log audit log
                                  const log: AuditLog = {
                                    id: 'audit_' + Math.random().toString(36).substr(2, 9),
                                    action: `Aprovou anúncio de ${ad.autor_username}`,
                                    executor: currentUser.username,
                                    target: `Texto: ${ad.texto.substring(0, 30)}...`,
                                    timestamp: new Date().toISOString()
                                  };
                                  setAuditLogs(prev => [log, ...prev]);
                                  const savedLogs = JSON.parse(localStorage.getItem('fcfunz_admin_audit_logs') || '[]');
                                  localStorage.setItem('fcfunz_admin_audit_logs', JSON.stringify([log, ...savedLogs]));
                                  
                                  loadAdminData();
                                } catch (err: any) {
                                  showError(err.message || "Erro ao aprovar anúncio.");
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-emerald-950/20 cursor-pointer animate-none"
                            >
                              <Check className="h-3.5 w-3.5" /> Aprovar
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await api.updateAnuncioStatus(ad.id, 'rejected');
                                  showSuccess(`Anúncio de @${ad.autor_username} rejeitado.`);
                                  
                                  // Log audit log
                                  const log: AuditLog = {
                                    id: 'audit_' + Math.random().toString(36).substr(2, 9),
                                    action: `Rejeitou anúncio de ${ad.autor_username}`,
                                    executor: currentUser.username,
                                    target: `Texto: ${ad.texto.substring(0, 30)}...`,
                                    timestamp: new Date().toISOString()
                                  };
                                  setAuditLogs(prev => [log, ...prev]);
                                  const savedLogs = JSON.parse(localStorage.getItem('fcfunz_admin_audit_logs') || '[]');
                                  localStorage.setItem('fcfunz_admin_audit_logs', JSON.stringify([log, ...savedLogs]));
                                  
                                  loadAdminData();
                                } catch (err: any) {
                                  showError(err.message || "Erro ao rejeitar anúncio.");
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-rose-950/20 cursor-pointer animate-none"
                            >
                              <X className="h-3.5 w-3.5" /> Rejeitar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeAdminTab === ('p2p' as any) && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Coins className="h-4.5 w-4.5 text-emerald-400" /> Auditoria Geral de Transações P2P (e-Mola)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Revise os depósitos e retiradas P2P do sistema. Monitore merchants, evite fraudes ("merchants burladores") e libere ou recuse ordens manualmente se necessário.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
              {p2pOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-950/20 border border-slate-850 rounded-xl">
                  <Coins className="h-8 w-8 text-slate-700 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">Nenhuma ordem P2P registrada no sistema</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {p2pOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 rounded-xl border transition-all duration-300 bg-slate-950/40 border-slate-800"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-850/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-300">Ordem ID: {order.id}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(order.created_at).toLocaleString('pt-MZ')}</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              order.type === 'deposit' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {order.type === 'deposit' ? 'Depósito (Comprar)' : 'Levantamento (Vender)'}
                            </span>
                          </div>
                          
                          <div className="text-xs text-slate-400">
                            Comprador/Autor: <strong className="text-slate-200">@{order.buyer_username}</strong> | Comerciante: <strong className="text-slate-200">@{order.merchant_username}</strong>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-slate-500 font-medium">Quantidade</div>
                          <div className="text-sm font-mono font-bold text-amber-400">{order.amount_mzn} MZN</div>
                          <div className="text-[11px] font-mono text-slate-400">Total: {order.total_mts.toFixed(2)} MTs</div>
                        </div>
                      </div>

                      {/* Display Proof if exists */}
                      {order.comprovativo_data && (
                        <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
                            <div className="text-left">
                              <div className="text-xs font-bold text-slate-300">Comprovativo de Pagamento</div>
                              <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{order.comprovativo_name}</div>
                            </div>
                          </div>
                          <a 
                            href={order.comprovativo_data} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-xs font-bold transition-all"
                          >
                            Ver Imagem Completa
                          </a>
                        </div>
                      )}

                      {/* Display phone for withdrawal */}
                      {order.withdrawal_phone && (
                        <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-850 text-xs flex justify-between items-center">
                          <span className="text-slate-400">Carteira e-Mola Destinatária:</span>
                          <span className="font-mono font-bold text-indigo-400 select-all">{order.withdrawal_phone}</span>
                        </div>
                      )}

                      {/* Controls */}
                      <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>Status Atual:</span>
                          <span className={`font-mono font-bold ${
                            order.status === 'completed' 
                              ? 'text-emerald-400' 
                              : order.status === 'rejected' 
                              ? 'text-red-400' 
                              : order.status === 'disputed' 
                              ? 'text-yellow-400 animate-pulse'
                              : 'text-amber-400'
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>

                        {order.status === 'pending' || order.status === 'disputed' ? (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={async () => {
                                try {
                                  await api.updateP2POrderStatus(order.id, 'completed');
                                  showSuccess(`Ordem ${order.id} liberada manualmente com sucesso!`);
                                  
                                  // Log audit log
                                  const log: AuditLog = {
                                    id: 'audit_' + Math.random().toString(36).substr(2, 9),
                                    action: `Aprovou Ordem P2P ${order.id}`,
                                    executor: currentUser.username,
                                    target: `Usuário: @${order.buyer_username} (${order.amount_mzn} MZN)`,
                                    timestamp: new Date().toISOString()
                                  };
                                  setAuditLogs(prev => [log, ...prev]);
                                  const savedLogs = JSON.parse(localStorage.getItem('fcfunz_admin_audit_logs') || '[]');
                                  localStorage.setItem('fcfunz_admin_audit_logs', JSON.stringify([log, ...savedLogs]));

                                  loadAdminData();
                                } catch (err: any) {
                                  showError(err.message || 'Erro ao liberar ordem.');
                                }
                              }}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" /> Liberar Moedas
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await api.updateP2POrderStatus(order.id, 'rejected');
                                  showSuccess(`Ordem ${order.id} recusada manualmente.`);
                                  
                                  // Log audit log
                                  const log: AuditLog = {
                                    id: 'audit_' + Math.random().toString(36).substr(2, 9),
                                    action: `Recusou Ordem P2P ${order.id}`,
                                    executor: currentUser.username,
                                    target: `Usuário: @${order.buyer_username} (${order.amount_mzn} MZN)`,
                                    timestamp: new Date().toISOString()
                                  };
                                  setAuditLogs(prev => [log, ...prev]);
                                  const savedLogs = JSON.parse(localStorage.getItem('fcfunz_admin_audit_logs') || '[]');
                                  localStorage.setItem('fcfunz_admin_audit_logs', JSON.stringify([log, ...savedLogs]));

                                  loadAdminData();
                                } catch (err: any) {
                                  showError(err.message || 'Erro ao recusar ordem.');
                                }
                              }}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" /> Recusar Ordem
                            </button>
                          </div>
                        ) : null}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
