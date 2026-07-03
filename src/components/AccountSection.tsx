/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, Transaction } from '../types';
import { UserBadgesInline } from './BadgesSection';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Shield, Coins, Key, RefreshCw, Send, ArrowRightLeft, 
  Ticket, Check, Award, ArrowUpRight, ArrowDownLeft, 
  Lock, HelpCircle, ArrowLeft, ChevronRight, BookOpen, Clock
} from 'lucide-react';

interface AccountSectionProps {
  onViewProfile: (userId: string) => void;
}

export default function AccountSection({ onViewProfile }: AccountSectionProps) {
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  
  // Progress Bar / Automatic Sync State
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'completed'>('syncing');
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [bonusMessage, setBonusMessage] = useState('');

  // Active Menu / Sub-page Option
  const [activeOption, setActiveOption] = useState<'menu' | 'transfer' | 'voucher' | 'password' | 'security' | 'history'>('menu');

  // Financial forms state
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError, setTransferError] = useState('');

  const [apolloCode, setApolloCode] = useState('');
  const [apolloSuccess, setApolloSuccess] = useState('');
  const [apolloError, setApolloError] = useState('');

  // Security forms state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');

  // Sync details
  const loadAccountDetails = async () => {
    const active = db.getActiveProfile();
    setCurrentUser(active);
    
    // Load users (for transfer dropdown)
    const allUsers = await api.getAllUsers();
    setUsers(allUsers.filter(u => u.id !== active.id));

    // Load transactions
    const txList = await api.getUserTransactions(active.id);
    setTransactions(txList);
  };

  useEffect(() => {
    loadAccountDetails();
    const unsubscribe = subscribeToGlobalUpdates(() => {
      loadAccountDetails();
    });
    return () => unsubscribe();
  }, []);

  // Automatic Sync Bar Effect on tab access
  useEffect(() => {
    setSyncProgress(0);
    setSyncStatus('syncing');
    setBonusClaimed(false);
    setBonusMessage('');

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 10;
      if (current >= 100) {
        current = 100;
        setSyncProgress(100);
        setSyncStatus('completed');
        clearInterval(interval);
        
        // Give automatic access bonus
        api.claimAccessBonus()
          .then((amount) => {
            setBonusClaimed(true);
            setBonusMessage(`+${amount} MZN creditado como bônus de acesso automático!`);
            loadAccountDetails();
          })
          .catch(() => {
            // Already processed or fallback
            setBonusClaimed(true);
            setBonusMessage('Conta sincronizada com sucesso!');
          });
      } else {
        setSyncProgress(current);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Get cargo color details
  const getCargoColor = (cargo: string) => {
    switch (cargo) {
      case 'Founder': return 'text-amber-400';
      case 'Global Admin': return 'text-rose-400';
      case 'Mentor':
      case 'Mentor Head': return 'text-red-500';
      case 'Merchant':
      case 'Super Merchant': return 'text-purple-500';
      case 'Guide': return 'text-teal-400';
      case 'Verified User': return 'text-emerald-400';
      default: return 'text-slate-300';
    }
  };

  // 1. Handle transfer Credits
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSuccess('');
    setTransferError('');

    const targetUser = users.find(u => u.id === transferTargetId);
    if (!targetUser) {
      setTransferError('Por favor, selecione um destinatário válido.');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('Digite um valor maior que zero.');
      return;
    }

    try {
      await api.transferCredits(targetUser.username, amount, transferDesc);
      setTransferSuccess(`Sucesso! Você transferiu ${amount} MZN para ${targetUser.username}.`);
      setTransferAmount('');
      setTransferDesc('');
      setTransferTargetId('');
      loadAccountDetails();
    } catch (err: any) {
      setTransferError(err.message || 'Erro ao efetuar transferência.');
    }
  };

  // 2. Handle redeem Apollo voucher
  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setApolloSuccess('');
    setApolloError('');

    const codeNum = parseInt(apolloCode.trim());
    if (isNaN(codeNum)) {
      setApolloError('O código do cupom deve conter apenas números.');
      return;
    }

    try {
      const amount = await api.redeemVoucher(codeNum);
      setApolloSuccess(`Sucesso! Cupom resgatado. +${amount} MZN e +50 XP adicionados à sua conta!`);
      setApolloCode('');
      loadAccountDetails();
    } catch (err: any) {
      setApolloError(err.message || 'Código inválido ou já resgatado.');
    }
  };

  // 3. Handle update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    try {
      await api.updatePassword(currentPassword, newPassword);
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao alterar senha.');
    }
  };

  // 4. Handle update security question
  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySuccess('');
    setSecurityError('');

    try {
      await api.updateSecurityQuestion(securityQuestion, securityAnswer);
      setSecuritySuccess('Pergunta e resposta de segurança atualizadas com sucesso!');
      setSecurityQuestion('');
      setSecurityAnswer('');
    } catch (err: any) {
      setSecurityError(err.message || 'Erro ao atualizar dados de segurança.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Gerenciamento de Conta</h1>
            <p className="text-xs text-slate-400">Gerencie suas finanças virtuais, segurança e visualize seu extrato de transações</p>
          </div>
        </div>
        
        {/* Dynamic Sync Bar Indicator */}
        <div className="min-w-[240px] bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <RefreshCw className={`h-3 w-3 text-indigo-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Sincronizando Conta...' : 'Sincronizado!'}
            </span>
            <span className="font-bold text-indigo-300">{syncProgress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-150" 
              style={{ width: `${syncProgress}%` }}
            />
          </div>
          {bonusMessage && (
            <span className="text-[9px] text-emerald-400 font-mono mt-1 flex items-center gap-0.5 animate-pulse">
              <Check className="h-3 w-3 shrink-0" /> {bonusMessage}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Account Details and Overview (Always visible) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Account Card */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
            
            <div className="flex flex-col items-center text-center py-4">
              <div className="relative group mb-3">
                <img 
                  src={currentUser.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`} 
                  alt={currentUser.username} 
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-2xl bg-slate-950 border-2 border-indigo-500/20 shadow-md object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full border border-slate-900">
                  Lv.{currentUser.nivel}
                </span>
              </div>

              {/* Username Link to view full profile details */}
              <button 
                onClick={() => onViewProfile(currentUser.id)}
                className={`text-base font-extrabold hover:underline flex items-center gap-1.5 justify-center ${getCargoColor(currentUser.cargo)} transition`}
              >
                {currentUser.username}
                <UserBadgesInline cargo={currentUser.cargo} className="ml-1" />
              </button>
              
              <span className="text-[10px] font-mono uppercase bg-slate-950/70 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-md tracking-wider mt-1.5">
                {currentUser.cargo}
              </span>
            </div>

            <div className="border-t border-slate-800/60 pt-4 mt-2 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Saldo Virtual</span>
                <span className="text-lg font-mono font-bold text-amber-400 flex items-center gap-1">
                  <Coins className="h-4.5 w-4.5" /> {currentUser.credits} MZN
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Popularidade</span>
                <span className="text-xs font-mono font-bold text-purple-400">
                  {currentUser.points} PTS
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Diamantes Negros</span>
                <span className="text-xs font-mono font-bold text-pink-400">
                  💎 {currentUser.black_diamonds || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Membro Desde</span>
                <span className="text-xs font-mono text-slate-400">
                  {new Date(currentUser.criado_em).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Hint to see profile */}
            <div className="mt-4 bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl text-[10px] text-slate-400 leading-relaxed text-center font-mono">
              💡 Clique no seu nome para abrir o seu perfil completo e resgatar pontos online acumulados!
            </div>
          </div>

          {/* Quick Stats Widget */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">Informações de Acesso</h3>
            <ul className="text-xs text-slate-400 space-y-2.5 font-mono">
              <li className="flex justify-between py-1 border-b border-slate-800/40">
                <span>E-mail da Conta:</span>
                <span className="text-slate-300">kelvin.wilson786@gmail.com</span>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-800/40">
                <span>Região de Acesso:</span>
                <span className="text-slate-300">{currentUser.pais === 'MZ' ? 'Moçambique' : 'Brasil'}</span>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-800/40">
                <span>Segurança IP/VPN:</span>
                <span className="text-emerald-400 font-semibold">Protegido</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Right Column: Dynamic Settings Layout with Bento Action menu */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            
            {/* 1. MAIN OPTIONS BENTO MENU */}
            {activeOption === 'menu' && (
              <motion.div
                key="menu-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono border-b border-slate-800 pb-3 mb-5 flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-indigo-400" /> Configurações & Finanças
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Option: Transfer credits */}
                    <button
                      onClick={() => setActiveOption('transfer')}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-800/30 hover:border-slate-700 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                          <Send className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-200">Transferir Créditos</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Envie MZN para usuários ativos</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </button>

                    {/* Option: Redeem Voucher */}
                    <button
                      onClick={() => setActiveOption('voucher')}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-800/30 hover:border-slate-700 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                          <Ticket className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-200">Resgatar Apollo Voucher</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Ative códigos de bônus especiais</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </button>

                    {/* Option: Change Password */}
                    <button
                      onClick={() => setActiveOption('password')}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-800/30 hover:border-slate-700 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                          <Key className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-200">Trocar Palavra-Passe</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Atualize sua senha secreta de login</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </button>

                    {/* Option: Security answer */}
                    <button
                      onClick={() => setActiveOption('security')}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-800/30 hover:border-slate-700 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                          <HelpCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-200">Pergunta de Segurança</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Configure recuperação e saques seguros</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </button>

                    {/* Option: Transactions History */}
                    <button
                      onClick={() => setActiveOption('history')}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-800/30 hover:border-slate-700 transition-all text-left group md:col-span-2"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-200">Extrato de Conta & Transações</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Veja todas as transferências e bônus recebidos na plataforma</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </button>

                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. SUB-VIEW: TRANSFER CREDITS */}
            {activeOption === 'transfer' && (
              <motion.div
                key="transfer-view"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-5"
              >
                <button
                  onClick={() => { setActiveOption('menu'); setTransferSuccess(''); setTransferError(''); }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-mono"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Opções
                </button>

                <div className="border-b border-slate-800/60 pb-3">
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <Send className="h-4.5 w-4.5 text-indigo-400" /> Transferir Créditos (MZN)
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1">Transfira saldo virtual instantaneamente para qualquer outro membro ativo do fã-clube.</p>
                </div>

                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Destinatário da Plataforma</label>
                    <select
                      required
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Selecione um usuário...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.nome || 'Membro'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Valor do Repasse (MZN)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Ex: 50"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Descrição / Nota Privada (Opcional)</label>
                    <input
                      type="text"
                      value={transferDesc}
                      onChange={(e) => setTransferDesc(e.target.value)}
                      placeholder="Ex: Pagamento por aposta de dados ou presente"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition text-xs flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" /> Enviar Créditos com Segurança
                  </button>
                </form>

                {transferSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono rounded-lg p-3">
                    {transferSuccess}
                  </div>
                )}
                {transferError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono rounded-lg p-3">
                    {transferError}
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. SUB-VIEW: REDEEM APOLLO VOUCHER */}
            {activeOption === 'voucher' && (
              <motion.div
                key="voucher-view"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-5"
              >
                <button
                  onClick={() => { setActiveOption('menu'); setApolloSuccess(''); setApolloError(''); }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-mono"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Opções
                </button>

                <div className="border-b border-slate-800/60 pb-3">
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <Ticket className="h-4.5 w-4.5 text-indigo-400" /> Resgatar Apollo Voucher
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1">Insira códigos de vouchers gerados pela gerência para ganhar fundos virtuais imediatos.</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/35 border border-slate-800/65 p-3.5 rounded-xl">
                  Os administradores e mentores periodicamente distribuem vouchers Apollo no Feed ou nas salas oficiais em eventos promocionais. Cada voucher de 5 dígitos concede MZN e prestígio de XP!
                </p>

                <form onSubmit={handleRedeemVoucher} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 text-center">Código Confidencial (5 dígitos)</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={apolloCode}
                      onChange={(e) => setApolloCode(e.target.value)}
                      placeholder="Ex: 84391"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none font-mono text-center tracking-widest font-black"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 font-bold py-2.5 rounded-lg transition text-xs flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> Ativar Voucher Apollo
                  </button>
                </form>

                {apolloSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono rounded-lg p-3">
                    {apolloSuccess}
                  </div>
                )}
                {apolloError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono rounded-lg p-3">
                    {apolloError}
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. SUB-VIEW: TROCAR PALAVRA-PASSE */}
            {activeOption === 'password' && (
              <motion.div
                key="password-view"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-5"
              >
                <button
                  onClick={() => { setActiveOption('menu'); setPasswordSuccess(''); setPasswordError(''); }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-mono"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Opções
                </button>

                <div className="border-b border-slate-800/60 pb-3">
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <Key className="h-4.5 w-4.5 text-indigo-400" /> Alterar Senha de Acesso
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1">Atualize as credenciais da sua carteira e login no fã-clube oficial FCFUNZ.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Senha Atual</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Confirme sua senha atual de entrada"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Nova Senha Escolhida</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 3 caracteres ou símbolos"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition text-xs"
                  >
                    Confirmar Nova Palavra-Passe
                  </button>
                </form>

                {passwordSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono rounded-lg p-3">
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono rounded-lg p-3">
                    {passwordError}
                  </div>
                )}
              </motion.div>
            )}

            {/* 5. SUB-VIEW: SECURITY QUESTION */}
            {activeOption === 'security' && (
              <motion.div
                key="security-view"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-5"
              >
                <button
                  onClick={() => { setActiveOption('menu'); setSecuritySuccess(''); setSecurityError(''); }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-mono"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Opções
                </button>

                <div className="border-b border-slate-800/60 pb-3">
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <HelpCircle className="h-4.5 w-4.5 text-indigo-400" /> Pergunta de Segurança Confidencial
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1">Configure uma chave de segurança secundária para processos de saques de premiações virtuais.</p>
                </div>

                <form onSubmit={handleUpdateSecurity} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Escolha uma Pergunta (Desafio)</label>
                    <input
                      type="text"
                      required
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      placeholder="Ex: Qual foi o nome do seu primeiro professor?"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Sua Resposta Confidencial</label>
                    <input
                      type="password"
                      required
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Sua resposta criptografada"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800/80 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition text-xs"
                  >
                    Salvar Pergunta de Segurança
                  </button>
                </form>

                {securitySuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono rounded-lg p-3">
                    {securitySuccess}
                  </div>
                )}
                {securityError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono rounded-lg p-3">
                    {securityError}
                  </div>
                )}
              </motion.div>
            )}

            {/* 6. SUB-VIEW: HISTORY */}
            {activeOption === 'history' && (
              <motion.div
                key="history-view"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-5"
              >
                <button
                  onClick={() => setActiveOption('menu')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-mono"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Opções
                </button>

                <div className="border-b border-slate-800/60 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Clock className="h-4.5 w-4.5 text-indigo-400" /> Extrato da Conta (MZN)
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Veja o histórico completo de créditos virtuais recebidos, enviados ou resgatados.</p>
                  </div>
                  <div className="text-[10px] font-mono bg-slate-950 border border-slate-850 px-2.5 py-1 rounded text-slate-400 shrink-0">
                    Total: <span className="text-amber-400 font-bold">{transactions.length} registros</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[10px] font-mono uppercase text-slate-500 border-b border-slate-800 bg-slate-950/40">
                      <tr>
                        <th className="py-3 px-3">Data</th>
                        <th className="py-3 px-3">Operação</th>
                        <th className="py-3 px-3">Nota / Detalhe</th>
                        <th className="py-3 px-3 text-right">Montante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono">
                      {transactions.length > 0 ? (
                        transactions.map((tx) => {
                          const isPositive = tx.amount > 0;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-850/20 transition">
                              <td className="py-2.5 px-3 text-[10px] text-slate-500 whitespace-nowrap">
                                {new Date(tx.timestamp).toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  tx.type.includes('send') || tx.type === 'color_buy'
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {tx.type === 'transfer_send' ? 'Enviado' :
                                   tx.type === 'transfer_receive' ? 'Recebido' :
                                   tx.type === 'apollo_redeem' ? 'Resgate' :
                                   tx.type === 'access_bonus' ? 'Bônus' :
                                   tx.type === 'level_up' ? 'Nível Up' :
                                   tx.type === 'gift_send' ? 'Enviado' :
                                   tx.type === 'gift_receive' ? 'Recebido' : 'Sistema'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 text-[11px] max-w-[200px] truncate" title={tx.description}>
                                {tx.description}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold text-[11px] ${isPositive ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {isPositive ? '+' : ''}{tx.amount} MZN
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 text-[11px] italic">
                            Nenhuma movimentação registrada nesta conta ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
