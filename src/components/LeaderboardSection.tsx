/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, UserCargo, LeaderboardCompetition } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Medal, Search, Users, Shield, Zap, Sparkles, Coins, Gift, Compass,
  MessageSquare, Flame, Ticket, Clock, Play, Square, AlertCircle, Award, CheckCircle
} from 'lucide-react';
import { UserBadgesInline } from './BadgesSection';

type LeaderboardName = 'gift' | 'hot' | 'apollo' | 'op' | 'chatroom' | 'rank';

export default function LeaderboardSection() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardName>('rank');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<Profile | null>(null);
  
  // Gift specific subtabs
  const [giftSubTab, setGiftSubTab] = useState<'received' | 'sent'>('received');
  
  // HOT specific subtabs
  const [hotSubTab, setHotSubTab] = useState<'played' | 'won' | 'lost'>('played');

  // Competitions state
  const [competitions, setCompetitions] = useState<LeaderboardCompetition[]>([]);
  const [showNewCompForm, setShowNewCompForm] = useState(false);
  const [newCompType, setNewCompType] = useState<'level' | 'online_points' | 'dice_multiplayer'>('level');
  const [newCompTitle, setNewCompTitle] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompPrize, setNewCompPrize] = useState(1000);
  const [compError, setCompError] = useState<string | null>(null);
  const [compSuccess, setCompSuccess] = useState<string | null>(null);

  // Active user for admin checks
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  const loadData = () => {
    setUsers([...db.profiles]);
    setCurrentUser(db.getActiveProfile());
    // Load competitions
    setCompetitions([...db.competitions]);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToGlobalUpdates(loadData);
    return () => unsubscribe();
  }, []);

  // Calculate Apollo redeems per user based on Transactions
  const getApolloStats = () => {
    const stats: Record<string, { count: number; total: number }> = {};
    db.transactions.forEach(tx => {
      if (tx.type === 'apollo_redeem') {
        const uId = tx.user_id;
        if (!stats[uId]) {
          stats[uId] = { count: 0, total: 0 };
        }
        stats[uId].count += 1;
        stats[uId].total += Math.abs(tx.amount);
      }
    });
    return stats;
  };

  // Calculate message count per user in chat room messages
  const getChatStats = () => {
    const stats: Record<string, number> = {};
    db.mensagens.forEach(m => {
      if (m.autor_id) {
        stats[m.autor_id] = (stats[m.autor_id] || 0) + 1;
      }
    });
    return stats;
  };

  // Get active competition
  const activeComp = competitions.find(c => c.status === 'active');

  // Sort and filter users for selected Leaderboard Tab
  const getRankedUsersList = () => {
    const list = [...users].filter(u => u.username !== 'Casa_FCFUNZ'); // filter house bot
    const apolloStats = getApolloStats();
    const chatStats = getChatStats();

    switch (activeLeaderboard) {
      case 'gift':
        if (giftSubTab === 'received') {
          return list
            .map(u => ({ ...u, metric: u.stats_gifts_received || 0, label: 'Presentes Recebidos' }))
            .sort((a, b) => b.metric - a.metric);
        } else {
          return list
            .map(u => ({ ...u, metric: u.stats_gifts_sent || 0, label: 'Presentes Enviados' }))
            .sort((a, b) => b.metric - a.metric);
        }

      case 'hot':
        if (hotSubTab === 'played') {
          return list
            .map(u => ({ ...u, metric: u.stats_hot_played || 0, label: 'Partidas HOT' }))
            .sort((a, b) => b.metric - a.metric);
        } else if (hotSubTab === 'won') {
          return list
            .map(u => ({ ...u, metric: u.stats_hot_won || 0, label: 'Vitórias HOT' }))
            .sort((a, b) => b.metric - a.metric);
        } else {
          return list
            .map(u => ({ ...u, metric: u.stats_hot_lost || 0, label: 'Derrotas HOT' }))
            .sort((a, b) => b.metric - a.metric);
        }

      case 'apollo':
        return list
          .map(u => {
            const count = apolloStats[u.id]?.count || 0;
            const total = apolloStats[u.id]?.total || 0;
            return {
              ...u,
              metric: count,
              label: 'Vouchers Resgatados',
              subLabel: `${total} MZN acumulados`
            };
          })
          .sort((a, b) => b.metric - a.metric);

      case 'op':
        return list
          .map(u => ({ ...u, metric: u.online_points || 0, label: 'Online Points' }))
          .sort((a, b) => b.metric - a.metric);

      case 'chatroom':
        return list
          .map(u => ({ ...u, metric: chatStats[u.id] || 0, label: 'Mensagens no Chat' }))
          .sort((a, b) => b.metric - a.metric);

      case 'rank':
      default:
        // Ranking / Level. Sort by level desc, then points/xp desc
        return list
          .map(u => ({ 
            ...u, 
            metric: u.nivel || 1, 
            label: 'Nível', 
            subLabel: `${u.points || 0} Popularidade` 
          }))
          .sort((a, b) => b.metric - a.metric || (b.points || 0) - (a.points || 0));
    }
  };

  const rankedList = getRankedUsersList();

  const getCargoColorClasses = (cargo: UserCargo) => {
    if (cargo === 'Founder') return 'text-amber-400 font-bold';
    if (cargo === 'Global Admin') return 'text-rose-400 font-bold animate-pulse';
    if (cargo === 'Mentor' || cargo === 'Mentor Head') return 'text-red-500 font-bold';
    if (cargo === 'Super Merchant') return 'text-pink-400 font-bold';
    if (cargo === 'Merchant') return 'text-purple-500 font-bold';
    return 'text-slate-200';
  };

  // Search filter
  const searchResults = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.nome && u.nome.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Time remaining countdown formatter
  const getRemainingTimeText = (expiresAtStr: string) => {
    const totalMs = new Date(expiresAtStr).getTime() - Date.now();
    if (totalMs <= 0) return 'Terminada / Aguardando encerramento';
    
    const totalSecs = Math.floor(totalMs / 1000);
    const days = Math.floor(totalSecs / (3600 * 24));
    const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    return `${days}d ${hours}h ${mins}m restantes`;
  };

  // Handle starting a competition
  const handleStartComp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompError(null);
    setCompSuccess(null);

    if (!newCompTitle.trim() || !newCompDesc.trim()) {
      setCompError('Por favor, preencha todos os campos do formulário.');
      return;
    }

    if (newCompPrize <= 0) {
      setCompError('O prêmio deve ser um valor de MZN positivo.');
      return;
    }

    try {
      await api.startCompetition(newCompType, newCompTitle, newCompDesc, newCompPrize);
      setCompSuccess(`Competição de ${newCompType} iniciada com sucesso!`);
      setNewCompTitle('');
      setNewCompDesc('');
      setShowNewCompForm(false);
      loadData();
    } catch (err: any) {
      setCompError(err.message || 'Erro ao iniciar competição.');
    }
  };

  // Handle ending competition and awarding rewards
  const handleEndComp = async (id: string) => {
    setCompError(null);
    setCompSuccess(null);
    try {
      const ended = await api.endCompetition(id);
      setCompSuccess(`Competição "${ended.title}" finalizada! Prêmios em MZN distribuídos com sucesso.`);
      loadData();
    } catch (err: any) {
      setCompError(err.message || 'Erro ao finalizar competição.');
    }
  };

  // Calculate Standing for a user in the active competition
  const getCompScore = (user: Profile, comp: LeaderboardCompetition) => {
    let currentVal = 0;
    if (comp.type === 'level') currentVal = user.nivel || 1;
    else if (comp.type === 'online_points') currentVal = user.online_points || 0;
    else if (comp.type === 'dice_multiplayer') currentVal = user.stats_dice_played || 0;

    const startVal = comp.start_snapshots?.[user.id] ?? 0;
    return Math.max(0, currentVal - startVal);
  };

  // Get current standigs of active competition
  const getActiveCompStandings = (comp: LeaderboardCompetition) => {
    return users
      .filter(u => u.username !== 'Casa_FCFUNZ' && u.cargo !== 'Founder')
      .map(u => ({
        user: u,
        score: getCompScore(u, comp),
        current: comp.type === 'level' ? u.nivel : (comp.type === 'online_points' ? (u.online_points || 0) : (u.stats_dice_played || 0))
      }))
      .sort((a, b) => b.score - a.score || b.current - a.current);
  };

  const activeStandings = activeComp ? getActiveCompStandings(activeComp) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-12">
      
      {/* LEFT COLUMN: THE CENTRAL MULTI-LEADERBOARD SYSTEM (7 cols) */}
      <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex flex-col min-h-[500px]">
        
        {/* Header tabs */}
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Trophy className="h-4.5 w-4.5 text-amber-400" /> Rankings Gerais FCFUNZ
            </h2>
            <span className="text-[10px] font-mono font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
              Anos 2015-2016
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Explore classificações de presentes, jogos, códigos apollo, chats e níveis.</p>

          {/* 6 Icons Menu Selection for Leaderboards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 bg-slate-950/40 p-2 rounded-xl border border-slate-850">
            <button
              onClick={() => setActiveLeaderboard('rank')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition text-center ${activeLeaderboard === 'rank' ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <Award className="h-4 w-4 mb-1" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Níveis</span>
            </button>

            <button
              onClick={() => setActiveLeaderboard('gift')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition text-center ${activeLeaderboard === 'gift' ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <Gift className="h-4 w-4 mb-1" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Presentes</span>
            </button>

            <button
              onClick={() => setActiveLeaderboard('hot')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition text-center ${activeLeaderboard === 'hot' ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <Flame className="h-4 w-4 mb-1" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Jogo HOT</span>
            </button>

            <button
              onClick={() => setActiveLeaderboard('apollo')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition text-center ${activeLeaderboard === 'apollo' ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <Ticket className="h-4 w-4 mb-1" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Apollo</span>
            </button>

            <button
              onClick={() => setActiveLeaderboard('op')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition text-center ${activeLeaderboard === 'op' ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <Zap className="h-4 w-4 mb-1" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">On Points</span>
            </button>

            <button
              onClick={() => setActiveLeaderboard('chatroom')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition text-center ${activeLeaderboard === 'chatroom' ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
            >
              <MessageSquare className="h-4 w-4 mb-1" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Chat</span>
            </button>
          </div>

          {/* Sub-Filters Toggles (for Gift and HOT Leaderboards) */}
          <AnimatePresence mode="wait">
            {activeLeaderboard === 'gift' && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex gap-2 mt-3.5 bg-slate-950/20 p-1 rounded-lg border border-slate-900"
              >
                <button
                  onClick={() => setGiftSubTab('received')}
                  className={`flex-1 text-[10px] font-bold py-1 rounded transition uppercase tracking-wide ${giftSubTab === 'received' ? 'bg-slate-800 text-indigo-400 border border-slate-700/60' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Top Recebedores (rgift)
                </button>
                <button
                  onClick={() => setGiftSubTab('sent')}
                  className={`flex-1 text-[10px] font-bold py-1 rounded transition uppercase tracking-wide ${giftSubTab === 'sent' ? 'bg-slate-800 text-indigo-400 border border-slate-700/60' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Top Enviadores (sgift)
                </button>
              </motion.div>
            )}

            {activeLeaderboard === 'hot' && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex gap-2 mt-3.5 bg-slate-950/20 p-1 rounded-lg border border-slate-900"
              >
                <button
                  onClick={() => setHotSubTab('played')}
                  className={`flex-1 text-[10px] font-bold py-1 rounded transition uppercase tracking-wide ${hotSubTab === 'played' ? 'bg-slate-800 text-indigo-400 border border-slate-700/60' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Mais Jogadas (hot)
                </button>
                <button
                  onClick={() => setHotSubTab('won')}
                  className={`flex-1 text-[10px] font-bold py-1 rounded transition uppercase tracking-wide ${hotSubTab === 'won' ? 'bg-slate-800 text-indigo-400 border border-slate-700/60' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Mais Vitórias (hotw)
                </button>
                <button
                  onClick={() => setHotSubTab('lost')}
                  className={`flex-1 text-[10px] font-bold py-1 rounded transition uppercase tracking-wide ${hotSubTab === 'lost' ? 'bg-slate-800 text-indigo-400 border border-slate-700/60' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Mais Derrotas (hotl)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Leaders List */}
        <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2 mt-4 pr-1">
          {rankedList.map((u, index) => {
            const isTop3 = index < 3;
            const medalColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];

            return (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: Math.min(0.3, index * 0.03) }}
                key={u.id}
                onClick={() => setSelectedUserDetail(u)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition ${selectedUserDetail?.id === u.id ? 'border-indigo-500/50 bg-indigo-950/10' : 'border-slate-850 bg-slate-950/30 hover:bg-slate-950/60'} cursor-pointer`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-6 text-center font-mono text-xs font-bold text-slate-500">
                    {isTop3 ? (
                      <Medal className={`h-5 w-5 mx-auto ${medalColors[index]}`} />
                    ) : (
                      `#${index + 1}`
                    )}
                  </div>

                  <img 
                    src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                    alt={u.username} 
                    className="w-9 h-9 rounded-full border border-slate-800 object-cover" 
                  />
                  
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate flex items-center gap-1 ${getCargoColorClasses(u.cargo)}`}>
                      @{u.username}
                      <UserBadgesInline cargo={u.cargo} className="ml-1" />
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {u.cargo} • {(u as any).subLabel || `Nível ${u.nivel || 1}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                    {u.metric} {u.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* RIGHT COLUMN: WEEKLY COMPETITIONS & SYSTEM SEARCH DIRECTORY (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* WEEKLY COMPETITIONS SYSTEM PANEL */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-amber-400" /> Competições Semanais 🏆
            </h3>
            <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              MZN Real
            </span>
          </div>

          {/* Toast Feedbacks inside Component */}
          {compError && (
            <div className="bg-rose-950/20 border border-rose-900/40 text-rose-300 text-[11px] p-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{compError}</span>
            </div>
          )}
          {compSuccess && (
            <div className="bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-[11px] p-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{compSuccess}</span>
            </div>
          )}

          {/* Active Competition Card */}
          {activeComp ? (
            <div className="space-y-3">
              <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/20 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      ATIVA • {activeComp.type === 'level' ? 'Maratona Nível' : (activeComp.type === 'online_points' ? 'Online Points' : 'Dados Multiplayer')}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100 mt-1.5">{activeComp.title}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Prêmio</p>
                    <p className="text-xs font-black text-amber-400 font-mono">{activeComp.prize_pool_mzn} MZN</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">{activeComp.description}</p>
                
                <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{getRemainingTimeText(activeComp.expires_at)}</span>
                </div>

                {/* Admin controls to end comp and distribute prizes */}
                {(currentUser?.cargo === 'Founder' || currentUser?.cargo === 'Global Admin') && (
                  <div className="pt-2 border-t border-slate-900 mt-2">
                    <button
                      onClick={() => handleEndComp(activeComp.id)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Square className="h-3.5 w-3.5" /> Finalizar Competição & Distribuir Prêmios
                    </button>
                    <p className="text-[9px] text-slate-500 text-center mt-1">Ao finalizar, os prêmios de 1º a 4º lugar serão depositados em créditos MZN automaticamente.</p>
                  </div>
                )}
              </div>

              {/* Standings list */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Classificação Atual (Relative Gain)</p>
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {activeStandings.slice(0, 10).map((st, index) => {
                    const place = index + 1;
                    const prizesText = place === 1 ? '50%' : (place === 2 ? '25%' : (place === 3 ? '15%' : (place === 4 ? '10%' : null)));
                    const prizeValue = prizesText ? Math.floor(activeComp.prize_pool_mzn * (place === 1 ? 0.5 : (place === 2 ? 0.25 : (place === 3 ? 0.15 : 0.1)))) : 0;
                    
                    return (
                      <div key={st.user.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-850 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 text-center font-bold font-mono ${place <= 4 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {place}º
                          </span>
                          <span className="font-medium text-slate-300">@{st.user.username}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                            +{st.score} {activeComp.type === 'level' ? 'nível' : (activeComp.type === 'online_points' ? 'OP' : 'jogos')}
                          </span>
                          {place <= 4 && prizeValue > 0 && (
                            <span className="text-[10px] text-amber-500 font-bold font-mono">
                              ({prizeValue} MZN)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeStandings.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">Nenhum participante pontuando ainda.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/30 rounded-xl p-5 border border-slate-850 text-center space-y-2.5">
              <Award className="h-8 w-8 text-slate-600 mx-auto" />
              <h4 className="text-xs font-bold text-slate-300">Nenhuma Competição Ativa</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Fique atento! Novas competições semanais serão iniciadas pelos administradores em breve.</p>

              {/* Start comp button for admins */}
              {(currentUser?.cargo === 'Founder' || currentUser?.cargo === 'Global Admin') && !showNewCompForm && (
                <button
                  onClick={() => setShowNewCompForm(true)}
                  className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 px-4 rounded-lg transition inline-flex items-center gap-1.5 shadow-md"
                >
                  <Play className="h-3.5 w-3.5" /> Iniciar Competição Semanal
                </button>
              )}
            </div>
          )}

          {/* New Competition Form Modal/Panel */}
          {showNewCompForm && (
            <motion.form
              onSubmit={handleStartComp}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 space-y-3.5 mt-2 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <h4 className="font-bold text-slate-200">Painel de Criação de Competição</h4>
                <button
                  type="button"
                  onClick={() => setShowNewCompForm(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Tipo de Competição</label>
                <select
                  value={newCompType}
                  onChange={(e) => setNewCompType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="level">Maratona de Nível (Maior Ganho de Nível)</option>
                  <option value="online_points">Mestre de Online Points (Maior Ganho de OP)</option>
                  <option value="dice_multiplayer">Mestre dos Dados (Mais Partidas de Dados Multiplayer)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Título da Competição</label>
                <input
                  type="text"
                  placeholder="Ex: Competição Semanal de Dados"
                  value={newCompTitle}
                  onChange={(e) => setNewCompTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Descrição da Competição</label>
                <textarea
                  placeholder="Descreva as regras da competição..."
                  rows={2}
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Prêmio Total da Competição (MZN)</label>
                <input
                  type="number"
                  value={newCompPrize}
                  onChange={(e) => setNewCompPrize(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[9px] text-slate-500">O prêmio será rateado: 1º (50%), 2º (25%), 3º (15%), 4º (10%).</p>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition"
              >
                Lançar Competição de 1 Semana 🚀
              </button>
            </motion.form>
          )}

          {/* Past Winners Accordion/Card list */}
          {competitions.filter(c => c.status === 'ended').length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Histórico de Competições</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {competitions
                  .filter(c => c.status === 'ended')
                  .reverse()
                  .map(c => (
                    <div key={c.id} className="p-3 bg-slate-950/20 border border-slate-850 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-300">{c.title}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">{c.prize_pool_mzn} MZN</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-900 text-[10px] text-slate-400">
                        {c.winners?.map((w, idx) => (
                          <div key={idx} className="flex justify-between font-mono">
                            <span>{idx + 1}º @{w.username}</span>
                            <span className="text-amber-500">+{w.prize} MZN</span>
                          </div>
                        ))}
                        {(!c.winners || c.winners.length === 0) && (
                          <span className="text-[9px] text-slate-500 col-span-2 text-center">Nenhum vencedor registrado</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* FC Box Lookup Search Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-3 border-b border-slate-800">
            <Compass className="h-4.5 w-4.5 text-indigo-400" /> Diretório de IDs - FC BOX
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-normal">Consulte dados estatísticos públicos de qualquer usuário registrado.</p>

          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Digite o apelido de alguém..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 pl-9 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          </div>

          {searchQuery && (
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
              {searchResults.map(u => (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUserDetail(u);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950 transition cursor-pointer border border-slate-850"
                >
                  <img src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} alt={u.username} className="w-6.5 h-6.5 rounded-full" />
                  <span className={`text-xs font-semibold ${getCargoColorClasses(u.cargo)}`}>@{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected User Details presentation card */}
        {selectedUserDetail && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-5"
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedUserDetail.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                  alt={selectedUserDetail.username} 
                  className="w-12 h-12 rounded-full border-2 border-indigo-500 object-cover" 
                />
                <div>
                  <h4 className={`text-sm font-bold flex items-center gap-1 ${getCargoColorClasses(selectedUserDetail.cargo)}`}>
                    @{selectedUserDetail.username}
                    <UserBadgesInline cargo={selectedUserDetail.cargo} className="ml-1" />
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedUserDetail.cargo}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-bold">
                {selectedUserDetail.pais || 'MZ'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-400">
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Cargo / Badge</p>
                <p className="font-semibold text-slate-200 mt-1">{selectedUserDetail.cargo}</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Nível Atual</p>
                <p className="font-semibold text-indigo-400 mt-1">Nível {selectedUserDetail.nivel}</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Créditos</p>
                <p className="font-bold text-amber-400 mt-1 flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5" /> {selectedUserDetail.credits} MZN
                </p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Popularidade</p>
                <p className="font-semibold text-slate-200 mt-1 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" /> {selectedUserDetail.points} pts
                </p>
              </div>
              
              {/* Extra stats */}
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Online Points</p>
                <p className="font-semibold text-slate-200 mt-1">{selectedUserDetail.online_points || 0} OP</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Partidas de Dados</p>
                <p className="font-semibold text-slate-200 mt-1">{selectedUserDetail.stats_dice_played || 0} jogadas</p>
              </div>
              
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Presentes Recebidos</p>
                <p className="font-semibold text-slate-200 mt-1">{selectedUserDetail.stats_gifts_received || 0}</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Presentes Enviados</p>
                <p className="font-semibold text-slate-200 mt-1">{selectedUserDetail.stats_gifts_sent || 0}</p>
              </div>
              
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Partidas HOT (Cara/Coroa)</p>
                <p className="font-semibold text-slate-200 mt-1">{selectedUserDetail.stats_hot_played || 0}</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <p className="text-[10px] font-mono text-slate-500 uppercase">HOT (Vitórias / Derrotas)</p>
                <p className="font-semibold text-slate-200 mt-1">{selectedUserDetail.stats_hot_won || 0}W / {selectedUserDetail.stats_hot_lost || 0}L</p>
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-500 text-center">Registrado em: {new Date(selectedUserDetail.criado_em).toLocaleDateString()}</p>
          </motion.div>
        )}

      </div>

    </div>
  );
}
