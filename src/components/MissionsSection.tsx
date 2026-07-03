/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Sparkles, CheckCircle2, Circle, Calendar, Zap, Coins, 
  Clock, Gift, MessageSquare, Dices, Send, ArrowUpRight, 
  Lock, Award, ChevronRight, Check, RefreshCw
} from 'lucide-react';

interface Mission {
  id: string;
  type: 'chat' | 'dice' | 'post' | 'gift' | 'transfer';
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCredits: number;
  rewardXP: number;
  completed: boolean;
  claimed: boolean;
  actionLabel: string;
}

interface ClaimedLoot {
  credits: number;
  xp: number;
  points: number;
  hasDiamond: boolean;
}

export default function MissionsSection() {
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [missions, setMissions] = useState<Mission[]>([]);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [showLootModal, setShowLootModal] = useState(false);
  const [lootResult, setLootResult] = useState<ClaimedLoot | null>(null);
  const [isOpeningChest, setIsOpeningChest] = useState(false);

  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const loadMissionsState = () => {
    const activeProfile = db.getActiveProfile();
    setCurrentUser(activeProfile);
    
    const userId = activeProfile.id;
    const todayStr = getTodayString();
    
    // Check daily bonus claim date
    const lastBonusDate = localStorage.getItem(`fcfunz_bonus_date_v2_${userId}`);
    setDailyBonusClaimed(lastBonusDate === todayStr);

    // Load or generate daily missions (Exactly 2 per day, level-scaled)
    const storedMissions = localStorage.getItem(`fcfunz_missions_v2_${userId}`);
    const storedMissionsDate = localStorage.getItem(`fcfunz_missions_date_v2_${userId}`);

    if (storedMissions && storedMissionsDate === todayStr) {
      setMissions(JSON.parse(storedMissions));
    } else {
      // Generate two random, level-scaled, harder daily missions
      const userLevel = activeProfile.nivel || 1;
      
      const pool = [
        {
          type: 'chat' as const,
          title: 'Tagarela da Comunidade',
          description: 'Mantenha a sala ativa e envie mensagens no chat oficial.',
          baseTarget: 5,
          scale: 1.5,
          baseCredits: 8,
          baseXP: 30,
          actionLabel: 'Ir para o Chat',
        },
        {
          type: 'dice' as const,
          title: 'Desafiador de Dados',
          description: 'Aposte ou brinque jogando dados no chat oficial da sala.',
          baseTarget: 3,
          scale: 0.8,
          baseCredits: 10,
          baseXP: 35,
          actionLabel: 'Jogar Dados',
        },
        {
          type: 'post' as const,
          title: 'Influenciador Social',
          description: 'Compartilhe suas ideias publicando posts ou comentários no FCFunztbook.',
          baseTarget: 1,
          scale: 0.4,
          baseCredits: 12,
          baseXP: 45,
          actionLabel: 'Escrever Post',
        },
        {
          type: 'gift' as const,
          title: 'Membro Altruísta',
          description: 'Envie mimos e presentes para espalhar carinho na plataforma.',
          baseTarget: 1,
          scale: 0.3,
          baseCredits: 15,
          baseXP: 50,
          actionLabel: 'Enviar Presente',
        },
        {
          type: 'transfer' as const,
          title: 'Investidor e Parceiro',
          description: 'Apoie um amigo enviando moedas virtuais MZN via transferência de créditos.',
          baseTarget: 15,
          scale: 5,
          baseCredits: 10,
          baseXP: 40,
          actionLabel: 'Fazer Repasse',
        }
      ];

      // Shuffle and pick exactly two different types
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 2);

      const generatedMissions: Mission[] = selected.map((m, idx) => {
        // Progressive level-scaled target (gradually more difficult)
        const target = Math.max(1, m.baseTarget + Math.floor(userLevel * m.scale));
        // Moderated MZN reward to prevent inflation (max 25 MZN)
        const rewardCredits = Math.min(25, m.baseCredits + Math.floor(target * 0.2));
        const rewardXP = m.baseXP + target * 4;

        return {
          id: `m_v2_${todayStr}_${idx}`,
          type: m.type,
          title: m.title,
          description: m.description,
          progress: 0,
          target: target,
          rewardCredits: rewardCredits,
          rewardXP: rewardXP,
          completed: false,
          claimed: false,
          actionLabel: m.actionLabel
        };
      });

      setMissions(generatedMissions);
      localStorage.setItem(`fcfunz_missions_v2_${userId}`, JSON.stringify(generatedMissions));
      localStorage.setItem(`fcfunz_missions_date_v2_${userId}`, todayStr);

      // Notify the user about new available missions
      api.addNotification({
        usuario_id: userId,
        title: '🎯 Novas Missões Diárias!',
        message: 'Duas novas missões diárias foram geradas para você hoje. Venha completá-las!',
        type: 'system',
        sender_id: 'system',
        sender_username: 'Sistema'
      });
    }
  };

  useEffect(() => {
    loadMissionsState();
    const unsubscribe = subscribeToGlobalUpdates(loadMissionsState);
    return () => unsubscribe();
  }, []);

  // Claim Daily Varying Reward (Chest Open)
  const handleClaimDailyBonus = async () => {
    if (dailyBonusClaimed || isOpeningChest) return;
    
    setIsOpeningChest(true);

    // Shaking / Open animation simulation
    setTimeout(async () => {
      const todayStr = getTodayString();
      const userId = currentUser.id;

      // Roll randomized, balanced rewards (no excessive MZN)
      const rolledCredits = 15 + Math.floor(Math.random() * 16); // 15 to 30 MZN
      const rolledXP = 40 + Math.floor(Math.random() * 41); // 40 to 80 XP
      const rolledPoints = 10 + Math.floor(Math.random() * 16); // 10 to 25 Popularity PTS
      const hasDiamond = Math.random() < 0.08; // 8% chance of 1 Black Diamond

      // Apply to user profile
      currentUser.credits += rolledCredits;
      currentUser.points += rolledPoints;
      if (hasDiamond) {
        currentUser.black_diamonds = (currentUser.black_diamonds || 0) + 1;
      }
      
      await api.updateProfile(userId, { 
        credits: currentUser.credits,
        points: currentUser.points,
        black_diamonds: currentUser.black_diamonds
      });

      await api.addXP(userId, rolledXP);

      // Save claim date
      localStorage.setItem(`fcfunz_bonus_date_v2_${userId}`, todayStr);
      setDailyBonusClaimed(true);
      setIsOpeningChest(false);

      // Set loot result and show modal
      setLootResult({
        credits: rolledCredits,
        xp: rolledXP,
        points: rolledPoints,
        hasDiamond: hasDiamond
      });
      setShowLootModal(true);
      loadMissionsState();
    }, 1200);
  };

  // Collect reward for completed mission
  const handleClaimMissionReward = async (missionId: string) => {
    const userId = currentUser.id;
    const updated = missions.map(m => {
      if (m.id === missionId && m.progress >= m.target && !m.claimed) {
        // Award rewards safely
        currentUser.credits += m.rewardCredits;
        currentUser.stats_daily_missions_completed = (currentUser.stats_daily_missions_completed || 0) + 1;
        
        api.updateProfile(userId, { 
          credits: currentUser.credits,
          stats_daily_missions_completed: currentUser.stats_daily_missions_completed
        });

        api.addXP(userId, m.rewardXP);

        // Notify user
        api.addNotification({
          usuario_id: userId,
          title: '🎁 Recompensa Coletada!',
          message: `Você resgatou +${m.rewardCredits} MZN e +${m.rewardXP} XP de sua missão diária!`,
          type: 'system',
          sender_id: 'system',
          sender_username: 'Sistema'
        });

        return { ...m, claimed: true, completed: true };
      }
      return m;
    });

    setMissions(updated);
    localStorage.setItem(`fcfunz_missions_v2_${userId}`, JSON.stringify(updated));
    loadMissionsState();
  };

  // Get mission icon based on type
  const getMissionIcon = (type: Mission['type']) => {
    switch (type) {
      case 'chat': return <MessageSquare className="h-5 w-5 text-indigo-400" />;
      case 'dice': return <Dices className="h-5 w-5 text-amber-400" />;
      case 'post': return <Sparkles className="h-5 w-5 text-pink-400" />;
      case 'gift': return <Gift className="h-5 w-5 text-red-400" />;
      case 'transfer': return <Send className="h-5 w-5 text-teal-400" />;
    }
  };

  // Calculate total progress of the day
  const completedCount = missions.filter(m => m.completed).length;
  const claimedCount = missions.filter(m => m.claimed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Gamified Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Arena de Missões Diárias <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">Nível {currentUser.nivel}</span>
            </h1>
            <p className="text-xs text-slate-400">Complete seus desafios pessoais para ganhar prestígio de XP e MZN com sabedoria</p>
          </div>
        </div>

        {/* Level Stats Summary */}
        <div className="flex items-center gap-5 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
          <div className="text-center">
            <p className="text-[10px] font-mono text-slate-500 uppercase">Seus Desafios</p>
            <p className="text-sm font-black font-mono text-indigo-400 mt-0.5">{completedCount} / 2 Feitos</p>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div className="text-center">
            <p className="text-[10px] font-mono text-slate-500 uppercase">MZN Acumulado</p>
            <p className="text-sm font-black font-mono text-amber-400 mt-0.5">{currentUser.credits} MZN</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE MISSIONS (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-indigo-400" /> Desafios de Hoje ({missions.length})
              </h2>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> DIÁRIO
              </span>
            </div>

            <div className="space-y-4">
              {missions.map((mission) => {
                const percent = Math.min(100, Math.floor((mission.progress / mission.target) * 100));
                const isFinishedButNotClaimed = mission.progress >= mission.target && !mission.claimed;
                
                return (
                  <div 
                    key={mission.id}
                    className={`relative p-5 rounded-xl border transition-all duration-350 overflow-hidden ${
                      mission.claimed
                        ? 'bg-slate-950/20 border-slate-900 opacity-60'
                        : isFinishedButNotClaimed
                        ? 'bg-indigo-600/5 border-indigo-500/40 shadow-md shadow-indigo-600/5'
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          {getMissionIcon(mission.type)}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`text-sm font-bold flex items-center gap-2 ${mission.claimed ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                            {mission.title}
                            {mission.claimed && <span className="text-[9px] uppercase font-mono font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Resgatado</span>}
                            {isFinishedButNotClaimed && <span className="text-[9px] uppercase font-mono font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">Pronto para Coletar</span>}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">{mission.description}</p>
                          
                          {/* Reward Badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-3.5">
                            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/5 border border-amber-500/15 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                              <Coins className="h-3 w-3" /> +{mission.rewardCredits} MZN
                            </span>
                            <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/5 border border-indigo-500/15 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                              <Zap className="h-3 w-3" /> +{mission.rewardXP} XP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Claims / Interactive Area */}
                      <div className="shrink-0 text-right self-end sm:self-center">
                        {mission.claimed ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-black">
                            <Check className="h-3.5 w-3.5" /> CONCLUÍDO
                          </div>
                        ) : isFinishedButNotClaimed ? (
                          <button
                            onClick={() => handleClaimMissionReward(mission.id)}
                            className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg transition-all shadow-md animate-pulse uppercase tracking-wider font-mono flex items-center gap-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Coletar Recompensa
                          </button>
                        ) : (
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-500 block mb-1">Ação requisitada</span>
                            <span className="inline-block bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-lg">
                              {mission.actionLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mission Live progress meter */}
                    {!mission.claimed && (
                      <div className="mt-4 pt-3 border-t border-slate-900 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-500">Progresso do Desafio</span>
                          <span className={percent >= 100 ? 'text-emerald-400 font-bold' : 'text-indigo-400'}>
                            {mission.progress} / {mission.target} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Daily Streak Indicator */}
            <div className="mt-6 p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center gap-3">
              <span className="text-lg">🔥</span>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-200">Por que manter as missões diárias?</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Completando seus desafios todos os dias, você acelera seu nível e desbloqueia novos cargos prestigiados (Mentor, Merchant, Hero) para comandar na comunidade fã-clube!</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE DAILY TREASURE CHEST (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
            
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-200">Baú Diário FCFUNZ</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Ganhe MZN, XP e bônus de prestígio abrindo o baú de hoje!</p>

            {/* Interactive Chest View */}
            <div className="py-8 my-4 bg-slate-950/40 border border-slate-850 rounded-xl relative flex flex-col items-center justify-center">
              
              <motion.div
                animate={isOpeningChest ? {
                  rotate: [0, -6, 6, -6, 6, 0],
                  scale: [1, 1.1, 1.1, 1]
                } : {}}
                transition={{ duration: 0.8, repeat: isOpeningChest ? Infinity : 0 }}
                className="text-6xl select-none cursor-pointer filter drop-shadow-[0_4px_12px_rgba(99,102,241,0.2)] mb-4"
                onClick={handleClaimDailyBonus}
              >
                {dailyBonusClaimed ? '🔓' : isOpeningChest ? '📦' : '🎁'}
              </motion.div>

              {dailyBonusClaimed ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
                    Coletado com Sucesso ✓
                  </span>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">Volte amanhã para abrir outro baú!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-indigo-400 font-extrabold animate-pulse uppercase">
                    {isOpeningChest ? 'Abrindo Selos...' : 'Toque para Abrir!'}
                  </span>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">Loot variável e altamente equilibrado</p>
                </div>
              )}
            </div>

            <button
              onClick={handleClaimDailyBonus}
              disabled={dailyBonusClaimed || isOpeningChest}
              className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
                dailyBonusClaimed
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95'
              }`}
            >
              {dailyBonusClaimed ? 'Resgatado Hoje' : isOpeningChest ? 'Destravando...' : 'Reivindicar Bônus do Baú'}
            </button>
          </div>
        </div>

      </div>

      {/* LOOT OPEN MODAL */}
      <AnimatePresence>
        {showLootModal && lootResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 animate-pulse" />
              
              <div className="text-center space-y-4">
                <div className="text-5xl">🎉</div>
                <div>
                  <h3 className="text-base font-black text-white">Baú Aberto com Sucesso!</h3>
                  <p className="text-xs text-slate-400 mt-1">Você encontrou itens incríveis dentro do baú do fã-clube:</p>
                </div>

                <div className="space-y-2 bg-slate-950/60 border border-slate-850 p-4 rounded-xl text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                      <Coins className="h-4 w-4 text-amber-400" /> Créditos Virtuais
                    </span>
                    <span className="text-xs font-black font-mono text-amber-400">+{lootResult.credits} MZN</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                      <Zap className="h-4 w-4 text-indigo-400" /> Prestígio XP
                    </span>
                    <span className="text-xs font-black font-mono text-indigo-400">+{lootResult.xp} XP</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                      <Sparkles className="h-4 w-4 text-purple-400" /> Popularidade
                    </span>
                    <span className="text-xs font-black font-mono text-purple-400">+{lootResult.points} PTS</span>
                  </div>

                  {lootResult.hasDiamond && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                        💎 Diamante Negro Raro
                      </span>
                      <span className="text-xs font-black font-mono text-pink-400">+1 RARO</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowLootModal(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition"
                >
                  Ótimo, obrigado!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
