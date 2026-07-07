/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, Gift } from '../types';
import { UserBadgesInline, getCargoNicknameStyle } from './BadgesSection';
import { 
  X, MessageSquare, Coins, Award, Gift as GiftIcon, 
  Send, UserPlus, Globe, Sparkles, Heart, RefreshCw, Check
} from 'lucide-react';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onOpenPM: (userId: string) => void;
}

export default function UserProfileModal({ userId, onClose, onOpenPM }: UserProfileModalProps) {
  const [user, setUser] = useState<Profile | null>(null);
  const [allGifts] = useState<Gift[]>(api.getGifts());
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'transfer' | 'gift'>('stats');

  // Transfer state
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Gift state
  const [giftSuccess, setGiftSuccess] = useState('');
  const [giftError, setGiftError] = useState('');

  // Redemption state
  const [redeemSuccess, setRedeemSuccess] = useState('');
  const [redeemError, setRedeemError] = useState('');

  const handleRedeemOnlinePoints = async () => {
    setRedeemError('');
    setRedeemSuccess('');
    try {
      const res = await api.redeemOnlinePoints(user.id);
      setRedeemSuccess(`Sucesso! Resgatou ${res.amountRedeemed} pontos online por +${res.credits} MZN e +${res.xp} XP!`);
      const updatedUser = db.profiles.find(p => p.id === user.id);
      if (updatedUser) {
        setUser({ ...updatedUser });
      }
    } catch (err: any) {
      setRedeemError(err.message || 'Erro ao resgatar pontos.');
    }
  };

  const handleRedeemBlackDiamonds = async () => {
    setRedeemError('');
    setRedeemSuccess('');
    try {
      const res = await api.redeemBlackDiamonds(user.id);
      setRedeemSuccess(`Sucesso! Resgatou ${res.amountRedeemed} Black Diamond(s) por +${res.credits} MZN!`);
      const updatedUser = db.profiles.find(p => p.id === user.id);
      if (updatedUser) {
        setUser({ ...updatedUser });
      }
    } catch (err: any) {
      setRedeemError(err.message || 'Erro ao resgatar Black Diamonds.');
    }
  };

  // Fetch / Sync profile details
  useEffect(() => {
    const loadProfile = () => {
      const p = db.profiles.find(u => u.id === userId);
      if (p) {
        setUser({ ...p });
      }
      setCurrentUser(db.getActiveProfile());
    };

    loadProfile();
    const unsubscribe = subscribeToGlobalUpdates(loadProfile);
    return () => unsubscribe();
  }, [userId]);

  // Sync friendship status
  useEffect(() => {
    if (!user) return;
    const myId = currentUser.id;
    const friendship = db.amizades.find(a => 
      (a.solicitante_id === myId && a.destinatario_id === user.id) ||
      (a.solicitante_id === user.id && a.destinatario_id === myId)
    );

    if (friendship) {
      if (friendship.status === 'aceito') {
        setFriendshipStatus('accepted');
      } else if (friendship.status === 'pendente') {
        if (friendship.solicitante_id === myId) {
          setFriendshipStatus('pending_sent');
        } else {
          setFriendshipStatus('pending_received');
        }
      }
    } else {
      setFriendshipStatus('none');
    }
  }, [user, currentUser]);

  if (!user) return null;

  const handleSendFriendRequest = async () => {
    try {
      await api.sendFriendRequest(user.username);
      // Status will auto-update via subscribeToGlobalUpdates
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar solicitação.');
    }
  };

  const handleAcceptFriendRequest = async () => {
    try {
      await api.respondToFriendRequest(user.id, true);
    } catch (err: any) {
      alert(err.message || 'Erro ao aceitar solicitação.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('Por favor, insira um valor válido de MZN.');
      return;
    }

    if (currentUser.credits < amount) {
      setTransferError(`Você não tem saldo suficiente. Seu saldo atual é ${currentUser.credits} MZN.`);
      return;
    }

    setIsTransferring(true);
    try {
      await api.transferCredits(user.username, amount, transferDesc);
      setTransferSuccess(`Sucesso! Você transferiu ${amount} MZN para @${user.username}.`);
      setTransferAmount('');
      setTransferDesc('');
    } catch (err: any) {
      setTransferError(err.message || 'Erro ao realizar transferência.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSendGift = async (giftId: string, giftVal: number) => {
    setGiftError('');
    setGiftSuccess('');

    if (currentUser.credits < giftVal) {
      setGiftError(`Saldo insuficiente. Você tem ${currentUser.credits} MZN, mas o presente custa ${giftVal} MZN.`);
      return;
    }

    try {
      await api.sendGift(user.id, giftId);
      setGiftSuccess(`Presente enviado com sucesso!`);
    } catch (err: any) {
      setGiftError(err.message || 'Erro ao enviar presente.');
    }
  };

  // UI styling based on cargo rank
  const getCargoDetails = (cargo: string) => {
    switch (cargo) {
      case 'Founder':
        return {
          banner: 'from-amber-600 via-amber-500 to-yellow-500',
          text: 'text-amber-400',
          badge: 'bg-amber-500/25 border-amber-500/40 text-amber-300'
        };
      case 'Global Admin':
        return {
          banner: 'from-rose-600 via-rose-500 to-red-500',
          text: 'text-rose-400',
          badge: 'bg-rose-500/25 border-rose-500/40 text-rose-300'
        };
      case 'Mentor':
      case 'Mentor Head':
        return {
          banner: 'from-red-600 via-red-500 to-orange-500',
          text: 'text-red-500',
          badge: 'bg-red-500/25 border-red-500/40 text-red-300'
        };
      case 'Super Merchant':
        return {
          banner: 'from-pink-600 via-pink-500 to-rose-500',
          text: 'text-pink-400 font-bold',
          badge: 'bg-pink-500/25 border-pink-500/40 text-pink-300'
        };
      case 'Merchant':
        return {
          banner: 'from-purple-600 via-purple-500 to-indigo-500',
          text: 'text-purple-500',
          badge: 'bg-purple-500/25 border-purple-500/40 text-purple-300'
        };
      case 'Guide':
        return {
          banner: 'from-teal-600 via-teal-500 to-emerald-500',
          text: 'text-teal-400',
          badge: 'bg-teal-500/25 border-teal-500/40 text-teal-300'
        };
      case 'Verified User':
        return {
          banner: 'from-emerald-600 via-emerald-500 to-teal-500',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
        };
      default:
        return {
          banner: 'from-slate-800 via-slate-700 to-slate-800',
          text: 'text-slate-300',
          badge: 'bg-slate-700/30 border-slate-650 text-slate-400'
        };
    }
  };

  const cStyle = getCargoDetails(user.cargo);
  const nextXP = 100;
  const xpPercentage = Math.min(100, Math.max(0, user.xp));

  const getCountryName = (code: string) => {
    switch (code) {
      case 'MZ': return 'Moçambique 🇲🇿';
      case 'BR': return 'Brasil 🇧🇷';
      case 'PT': return 'Portugal 🇵🇹';
      case 'AO': return 'Angola 🇦🇴';
      default: return 'Geral 🌐';
    }
  };

  const isMe = currentUser.id === user.id;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        id="user-profile-modal-card"
        className="w-full max-w-lg bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Banner with gradient color based on user rank */}
        <div className={`h-24 bg-gradient-to-r ${cStyle.banner} relative flex items-end px-5 pb-3`}>
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/50 hover:bg-slate-950 text-slate-300 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="absolute -bottom-10 left-5">
            <div className="relative">
              <img 
                src={user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`} 
                alt={user.username} 
                className="w-20 h-20 rounded-full border-4 border-slate-900 bg-slate-950 object-cover"
              />
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-slate-900 bg-emerald-500" />
            </div>
          </div>

          <div className="ml-24 text-left">
            <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${cStyle.badge}`}>
              {user.cargo}
            </span>
          </div>
        </div>

        {/* User Bio Header */}
        <div className="pt-12 px-6 pb-4 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xl font-extrabold flex items-center gap-2 tracking-tight ${getCargoNicknameStyle(user.cargo).text}`}>
                @{user.username}
              </span>
              <div className="flex items-center bg-slate-950/40 border border-slate-800/80 rounded-full px-2.5 py-1 ml-1 select-none">
                <UserBadgesInline cargo={user.cargo} className="scale-110" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-slate-500" /> {getCountryName(user.pais)}
              <span className="text-slate-600">•</span>
              <span>Gênero: {user.sexo === 'M' ? 'Masculino' : user.sexo === 'F' ? 'Feminino' : 'Outro'}</span>
            </p>
          </div>

          {/* Friendship actions (No friends with yourself) */}
          {!isMe && (
            <div className="flex items-center gap-2 shrink-0">
              {friendshipStatus === 'none' && (
                <button
                  onClick={handleSendFriendRequest}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Adicionar Amigo
                </button>
              )}
              {friendshipStatus === 'pending_sent' && (
                <span className="bg-slate-800 text-slate-400 border border-slate-750 text-xs px-3 py-1.5 rounded-lg font-medium">
                  Solicitação Enviada
                </span>
              )}
              {friendshipStatus === 'pending_received' && (
                <button
                  onClick={handleAcceptFriendRequest}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> Aceitar Amigo
                </button>
              )}
              {friendshipStatus === 'accepted' && (
                <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-current" /> Amigos
                </span>
              )}

              <button
                onClick={() => {
                  onClose();
                  onOpenPM(user.id);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Chat
              </button>
            </div>
          )}
        </div>

        {/* Modal Subtabs selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/20">
          <button
            onClick={() => setActiveSubTab('stats')}
            className={`flex-1 text-xs py-3 text-center border-b-2 font-medium transition ${
              activeSubTab === 'stats' 
                ? 'border-indigo-500 text-slate-100 bg-indigo-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/10'
            }`}
          >
            <Award className="h-3.5 w-3.5 inline mr-1" /> Atributos & XP
          </button>
          {!isMe && (
            <>
              <button
                onClick={() => setActiveSubTab('transfer')}
                className={`flex-1 text-xs py-3 text-center border-b-2 font-medium transition ${
                  activeSubTab === 'transfer' 
                    ? 'border-indigo-500 text-slate-100 bg-indigo-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/10'
                }`}
              >
                <Coins className="h-3.5 w-3.5 inline mr-1" /> Transferir MZN
              </button>
              <button
                onClick={() => setActiveSubTab('gift')}
                className={`flex-1 text-xs py-3 text-center border-b-2 font-medium transition ${
                  activeSubTab === 'gift' 
                    ? 'border-indigo-500 text-slate-100 bg-indigo-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/10'
                }`}
              >
                <GiftIcon className="h-3.5 w-3.5 inline mr-1" /> Enviar Presente
              </button>
            </>
          )}
        </div>

        {/* Tab contents */}
        <div className="p-6">
          {activeSubTab === 'stats' && (
            <div className="space-y-4">
              {/* Level progress bar */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-left">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-amber-500 flex items-center gap-1">
                    <Award className="h-4 w-4" /> Nível {user.nivel}
                  </span>
                  <span className="font-mono text-slate-400 font-semibold">{Math.round(user.xp)} / 100 XP</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-950 border border-slate-850 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-1.5 leading-relaxed">
                  Progresso até o Nível {user.nivel + 1}. Ganhe XP enviando mensagens, jogando e trocando presentes!
                </p>
              </div>

              {/* Redemption Feedback Popups */}
              {redeemSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg p-3 font-mono">
                  {redeemSuccess}
                </div>
              )}
              {redeemError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3 font-mono">
                  {redeemError}
                </div>
              )}

              {/* Bento grid style details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-800/40 text-left flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Moeda (FC MZN)</p>
                    <p className="text-lg font-mono font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                      <Coins className="h-5 w-5" /> {user.credits} <span className="text-xs text-slate-400 font-normal">MZN</span>
                    </p>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-2 block">Saldo de créditos virtual</span>
                </div>

                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-800/40 text-left flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Popularidade / Pontos</p>
                    <p className="text-lg font-mono font-bold text-purple-400 mt-1 flex items-center gap-1.5">
                      <Heart className="h-5 w-5 fill-current" /> {user.points} <span className="text-xs text-slate-400 font-normal">PTS</span>
                    </p>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-2 block">Ganhos ao enviar ou receber mimos</span>
                </div>

                {/* Online Points (redeemable) */}
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-800/40 text-left flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Pontos Online</p>
                    <p className="text-lg font-mono font-bold text-teal-400 mt-1 flex items-center gap-1.5">
                      <Sparkles className="h-5 w-5 text-teal-400" /> {user.online_points || 0} <span className="text-xs text-slate-400 font-normal">PTS</span>
                    </p>
                  </div>
                  {isMe && (user.online_points || 0) > 0 ? (
                    <button
                      onClick={handleRedeemOnlinePoints}
                      className="mt-3 w-full bg-teal-600/20 hover:bg-teal-600/35 border border-teal-500/30 text-teal-300 text-[10px] font-bold py-1 px-2 rounded-lg transition"
                    >
                      Resgatar MZN & XP
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-mono mt-2 block">10 PTS = 1 MZN (+2 XP por ponto!)</span>
                  )}
                </div>

                {/* Black Diamonds (redeemable) */}
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-800/40 text-left flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Diamantes Negros</p>
                    <p className="text-lg font-mono font-bold text-pink-400 mt-1 flex items-center gap-1.5">
                      <Sparkles className="h-5 w-5 text-pink-400" /> 💎 {user.black_diamonds || 0}
                    </p>
                  </div>
                  {isMe && (user.black_diamonds || 0) > 0 ? (
                    <button
                      onClick={handleRedeemBlackDiamonds}
                      className="mt-3 w-full bg-pink-600/20 hover:bg-pink-600/35 border border-pink-500/30 text-pink-300 text-[10px] font-bold py-1 px-2 rounded-lg transition"
                    >
                      Resgatar p/ 50 MZN
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-mono mt-2 block">Cofres raros dão 50 MZN cada!</span>
                  )}
                </div>
              </div>

              {/* level up details */}
              <div className="pt-3 border-t border-slate-800/40 text-left text-[10px] font-mono text-slate-500 flex flex-col sm:flex-row justify-between gap-1.5">
                <span>Criado em: {new Date(user.criado_em).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span>
                  Último Level Up:{' '}
                  {user.last_level_up_at 
                    ? new Date(user.last_level_up_at).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Nunca subiu de nível'}
                </span>
              </div>
            </div>
          )}

          {activeSubTab === 'transfer' && (
            <form onSubmit={handleTransfer} className="space-y-4 text-left">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-3 text-[11px] font-mono leading-relaxed">
                ℹ️ <strong>Virtual Economy Transfer:</strong> Você pode transferir créditos (MZN) diretamente de sua conta para a deste usuário. Esta ação é instantânea e não pode ser desfeita.
              </div>

              {transferError && <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/15 p-2 rounded-lg">{transferError}</div>}
              {transferSuccess && <div className="text-emerald-400 text-xs font-mono bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-lg">{transferSuccess}</div>}

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Valor da Transferência (MZN) *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={isTransferring}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Quantidade de créditos MZN"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 pl-9 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Coins className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <span className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-500">Saldo: {currentUser.credits} MZN</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Mensagem / Nota (Opcional)</label>
                <input
                  type="text"
                  disabled={isTransferring}
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Ex: Pelo item lendário que negociamos!"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isTransferring || !transferAmount}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition text-xs shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
              >
                {isTransferring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Transferir Créditos Agora
                  </>
                )}
              </button>
            </form>
          )}

          {activeSubTab === 'gift' && (
            <div className="space-y-4 text-left">
              <div className="bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 rounded-xl p-3 text-[11px] font-mono leading-relaxed">
                🎁 <strong>Mimos e Presentes:</strong> Envie um presente do catálogo para @{user.username}. Isso consome seu saldo em MZN, aumenta a popularidade dele e dá bônus de XP para ambos!
              </div>

              {giftError && <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/15 p-2 rounded-lg">{giftError}</div>}
              {giftSuccess && <div className="text-emerald-400 text-xs font-mono bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-lg">{giftSuccess}</div>}

              <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {allGifts.map((gf) => {
                  const canAfford = currentUser.credits >= gf.valor;
                  return (
                    <button
                      key={gf.id}
                      onClick={() => handleSendGift(gf.id, gf.valor)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between gap-1 group ${
                        canAfford 
                          ? 'bg-slate-950/40 border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/10' 
                          : 'bg-slate-950/20 border-slate-900 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className="text-2xl group-hover:scale-110 transition duration-150">{gf.imagem}</span>
                      <div className="mt-1">
                        <p className="text-[9px] font-semibold text-slate-300 truncate max-w-[80px]">{gf.nome}</p>
                        <p className="text-[10px] font-mono font-bold text-amber-400 mt-0.5">{gf.valor} MZN</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
