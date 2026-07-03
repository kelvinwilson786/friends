/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Users, Award, Coins, Key, Clock, CheckCircle, 
  AlertTriangle, RefreshCw, Star, Zap, Lock, PlusCircle, Check, Play,
  TrendingUp, Sparkles, HelpCircle, UserCheck, ArrowRight, Wallet, Flame,
  Trophy, Gift, Gamepad2, CoinsIcon
} from 'lucide-react';

interface QuestDef {
  id: string;
  category: 'gifts' | 'games' | 'activities' | 'special';
  title: string;
  description: string;
  target: number;
  rewardMPoints: number;
  getProg: (u: Profile) => number;
  unit: string;
}

const QUEST_CATALOG: QuestDef[] = [
  // Missões de Presentes
  {
    id: 'q_gifts_sent',
    category: 'gifts',
    title: 'Super Doador de Mimos 🎁',
    description: 'Enviar 1.200 presentes de qualquer tipo para a comunidade.',
    target: 1200,
    rewardMPoints: 90,
    getProg: (u) => u.stats_gifts_sent || 0,
    unit: 'presentes'
  },
  {
    id: 'q_gifts_received',
    category: 'gifts',
    title: 'Queridinho do Fã-Clube 💎',
    description: 'Receber 400 presentes enviados por outros usuários.',
    target: 400,
    rewardMPoints: 40,
    getProg: (u) => u.stats_gifts_received || 0,
    unit: 'presentes'
  },
  {
    id: 'q_gifts_own_room',
    category: 'gifts',
    title: 'Anfitrião Generoso 🏰',
    description: 'Enviar 1.000 presentes dentro de sua própria sala oficial.',
    target: 1000,
    rewardMPoints: 30,
    getProg: (u) => u.stats_gifts_sent_own_room || 0,
    unit: 'presentes'
  },
  {
    id: 'q_love_gifts',
    category: 'gifts',
    title: 'Espalhando o Amor ❤️',
    description: 'Enviar 500 presentes "Love" de 0.1 MZN cada para fazer novos amigos.',
    target: 500,
    rewardMPoints: 20,
    getProg: (u) => u.stats_love_gifts_sent || 0,
    unit: 'presentes Love'
  },
  // Missões de Jogos
  {
    id: 'q_games_dice',
    category: 'games',
    title: 'Mestre da Sorte (Dados) 🎲',
    description: 'Jogar 50 partidas do minijogo de Dados (*bot dice ou lobby).',
    target: 50,
    rewardMPoints: 25,
    getProg: (u) => u.stats_dice_played || 0,
    unit: 'partidas'
  },
  {
    id: 'q_games_hot',
    category: 'games',
    title: 'Rei do Cara ou Coroa (HOT) 🪙',
    description: 'Jogar 50 partidas de HOT (Cara ou Coroa) direto no painel.',
    target: 50,
    rewardMPoints: 10,
    getProg: (u) => u.stats_hot_played || 0,
    unit: 'partidas'
  },
  // Missões de Atividades
  {
    id: 'q_daily_missions',
    category: 'activities',
    title: 'Consistência Diária 🎯',
    description: 'Completar 10 missões diárias no painel geral de missões.',
    target: 10,
    rewardMPoints: 20,
    getProg: (u) => u.stats_daily_missions_completed || 0,
    unit: 'missões'
  },
  {
    id: 'q_commissions',
    category: 'activities',
    title: 'Estrategista de Vendas (Trail) 📈',
    description: 'Receber 1.000 MZN acumulados em comissões ou transferências de parceria.',
    target: 1000,
    rewardMPoints: 20,
    getProg: (u) => Math.floor(u.stats_commissions_received || 0),
    unit: 'MZN'
  },
  {
    id: 'q_transactions',
    category: 'activities',
    title: 'Impulsionador Econômico 💸',
    description: 'Realizar 1.500 MZN em transações (envio ou recebimento de MZN/presentes).',
    target: 1500,
    rewardMPoints: 30,
    getProg: (u) => Math.floor(u.stats_transactions_amount || 0),
    unit: 'MZN'
  },
  // Extra para totalizar exatamente 370 mpoints no total
  {
    id: 'q_merchants_created',
    category: 'special',
    title: 'Mentor de Negócios 🤝',
    description: 'Ativar 3 novos Comerciantes sob sua tag de recrutador autorizada.',
    target: 3,
    rewardMPoints: 50,
    getProg: (u) => u.stats_merchants_created || 0,
    unit: 'comerciantes'
  },
  {
    id: 'q_house_contributions',
    category: 'special',
    title: 'Parceiro da Casa 🏛️',
    description: 'Aportar 150 MZN adicionais para o Caixa Público da Casa.',
    target: 150,
    rewardMPoints: 55,
    getProg: (u) => u.stats_house_contributions || 0,
    unit: 'MZN'
  }
];

export default function MerchantPanel() {
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [subordinates, setSubordinates] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Creation forms
  const [targetUsername, setTargetUsername] = useState('');
  const [creatorPin, setCreatorPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Exchange points state
  const [exchangeAmount, setExchangeAmount] = useState<number>(10);
  const [exchangeFeedback, setExchangeFeedback] = useState<{ success?: string; error?: string } | null>(null);

  // Cargo Renewal state
  const [renewalFeedback, setRenewalFeedback] = useState<{ success?: string; error?: string } | null>(null);

  const handleRenewCargo = async () => {
    try {
      setRenewalFeedback(null);
      const res = await api.renewCargoWithMPoints(currentUser.id);
      setRenewalFeedback({ success: `Sucesso! Cargo de ${res.cargo} reativado e renovado por mais 30 dias!` });
      loadData();
    } catch (err: any) {
      setRenewalFeedback({ error: err.message || 'Erro ao reativar cargo.' });
    }
  };

  // Cara ou Coroa (HOT) Mini-Game
  const [coinChoice, setCoinChoice] = useState<'cara' | 'coroa'>('cara');
  const [coinBet, setCoinBet] = useState<number>(10);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<'cara' | 'coroa' | null>(null);
  const [flipFeedback, setFlipFeedback] = useState<string | null>(null);

  // Pin update
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinError, setPinError] = useState('');

  // Check role authorization
  const isAuthorizedRole = ['Merchant', 'Super Merchant', 'Mentor', 'Mentor Head', 'Founder'].includes(currentUser.cargo);
  const isChefRole = ['Mentor', 'Mentor Head', 'Founder', 'Global Admin'].includes(currentUser.cargo);

  // Load state and update UI
  const loadData = () => {
    const active = db.getActiveProfile();
    setCurrentUser(active);

    // Filter subordinates under active user
    const allProfiles = db.profiles;
    const subs = allProfiles.filter(p => p.merchant_creator_id === active.id && ['Merchant', 'Super Merchant'].includes(p.cargo));
    setSubordinates(subs);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToGlobalUpdates(loadData);
    return () => unsubscribe();
  }, []);

  // Handle Registration
  const handleRegister = () => {
    setRegisterSuccess('');
    setRegisterError('');
    
    if (!isAuthorizedRole) {
      setRegisterError('Apenas Comerciantes (Merchant/Super Merchant) ou Mentores podem participar do painel de missões.');
      return;
    }

    try {
      const active = db.getActiveProfile();
      active.merchant_quest_registered = true;
      active.mpoint = active.mpoint || 0;
      active.merchant_claimed_quests = active.merchant_claimed_quests || [];
      
      // Persist user changes
      localStorage.setItem(`fcfunz_profile_${active.id}`, JSON.stringify(active));
      // Update our db state
      const pIdx = db.profiles.findIndex(p => p.id === active.id);
      if (pIdx !== -1) {
        db.profiles[pIdx] = { ...db.profiles[pIdx], ...active };
      }
      
      // Save changes globally
      localStorage.setItem('fcfunz_profiles', JSON.stringify(db.profiles));

      setRegisterSuccess('Inscrição efetuada com sucesso! Você já pode completar desafios e resgatar recompensas.');
      loadData();
    } catch (err: any) {
      setRegisterError(err.message || 'Erro ao registrar no sistema de missões.');
    }
  };

  // Claim Mission reward
  const handleClaimQuest = (questId: string) => {
    const quest = QUEST_CATALOG.find(q => q.id === questId);
    if (!quest) return;

    const currentProg = quest.getProg(currentUser);
    const claimed = currentUser.merchant_claimed_quests || [];

    if (claimed.includes(questId)) {
      alert('Esta missão já foi reivindicada!');
      return;
    }

    if (currentProg < quest.target) {
      alert('Você ainda não atingiu a meta para esta missão.');
      return;
    }

    try {
      const active = db.getActiveProfile();
      active.mpoint = (active.mpoint || 0) + quest.rewardMPoints;
      active.merchant_claimed_quests = [...(active.merchant_claimed_quests || []), questId];

      // Save locally & globally
      localStorage.setItem(`fcfunz_profile_${active.id}`, JSON.stringify(active));
      const pIdx = db.profiles.findIndex(p => p.id === active.id);
      if (pIdx !== -1) {
        db.profiles[pIdx] = { ...db.profiles[pIdx], ...active };
      }
      localStorage.setItem('fcfunz_profiles', JSON.stringify(db.profiles));

      api.addNotification({
        usuario_id: active.id,
        title: 'Missão de Comerciante Reivindicada! ⭐',
        message: `Você completou o desafio "${quest.title}" e ganhou ${quest.rewardMPoints} mpoints!`,
        type: 'system'
      });

      loadData();
    } catch (err: any) {
      alert('Erro ao reivindicar a recompensa: ' + err.message);
    }
  };

  // Convert mpoints to MZN (credits)
  const handleExchangePoints = (e: React.FormEvent) => {
    e.preventDefault();
    setExchangeFeedback(null);

    const userMPoints = currentUser.mpoint || 0;
    if (exchangeAmount <= 0) {
      setExchangeFeedback({ error: 'O valor deve ser maior que zero.' });
      return;
    }

    if (userMPoints < exchangeAmount) {
      setExchangeFeedback({ error: `Saldo de mpoints insuficiente. Você possui ${userMPoints} mpoint.` });
      return;
    }

    try {
      // 370 mpoints yields up to 2000 MZN. Thus: 1 mpoint = 5.4 MZN
      const conversionRate = 5.4;
      const creditsReward = Math.floor(exchangeAmount * conversionRate);

      const active = db.getActiveProfile();
      active.mpoint = (active.mpoint || 0) - exchangeAmount;
      active.credits = (active.credits || 0) + creditsReward;

      // Save locally & globally
      localStorage.setItem(`fcfunz_profile_${active.id}`, JSON.stringify(active));
      const pIdx = db.profiles.findIndex(p => p.id === active.id);
      if (pIdx !== -1) {
        db.profiles[pIdx] = { ...db.profiles[pIdx], ...active };
      }
      localStorage.setItem('fcfunz_profiles', JSON.stringify(db.profiles));

      api.addNotification({
        usuario_id: active.id,
        title: 'Troca de MPoints Efetuada! 💰',
        message: `Você converteu ${exchangeAmount} mpoints por ${creditsReward} MZN com sucesso!`,
        type: 'transfer',
        amount: creditsReward
      });

      setExchangeFeedback({ success: `Sucesso! Convertido ${exchangeAmount} mpoints por +${creditsReward} MZN!` });
      loadData();
    } catch (err: any) {
      setExchangeFeedback({ error: err.message || 'Erro ao realizar conversão.' });
    }
  };

  // Cara ou Coroa (HOT) Simulated Interactive Game
  const handleFlipCoin = () => {
    if (isFlipping) return;
    setFlipFeedback(null);
    setFlipResult(null);

    if (currentUser.credits < coinBet) {
      setFlipFeedback(`Saldo de créditos insuficiente para apostar ${coinBet} MZN.`);
      return;
    }

    setIsFlipping(true);

    setTimeout(() => {
      const outcome: 'cara' | 'coroa' = Math.random() < 0.5 ? 'cara' : 'coroa';
      const isWinner = outcome === coinChoice;
      const profit = isWinner ? coinBet : -coinBet;

      try {
        const active = db.getActiveProfile();
        active.credits = (active.credits || 0) + profit;
        // Increment HOT stats played
        active.stats_hot_played = (active.stats_hot_played || 0) + 1;
        if (isWinner) {
          active.stats_hot_won = (active.stats_hot_won || 0) + 1;
        } else {
          active.stats_hot_lost = (active.stats_hot_lost || 0) + 1;
        }
        // Count as transaction
        active.stats_transactions_amount = (active.stats_transactions_amount || 0) + coinBet;

        // Save
        localStorage.setItem(`fcfunz_profile_${active.id}`, JSON.stringify(active));
        const pIdx = db.profiles.findIndex(p => p.id === active.id);
        if (pIdx !== -1) {
          db.profiles[pIdx] = { ...db.profiles[pIdx], ...active };
        }
        localStorage.setItem('fcfunz_profiles', JSON.stringify(db.profiles));

        setFlipResult(outcome);
        setIsFlipping(false);
        if (isWinner) {
          setFlipFeedback(`🎉 Parabéns! Deu ${outcome.toUpperCase()}! Você ganhou ${coinBet} MZN! (+1 partida HOT)`);
        } else {
          setFlipFeedback(`😔 Deu ${outcome.toUpperCase()}! Você perdeu ${coinBet} MZN. (+1 partida HOT)`);
        }
        loadData();
      } catch (err: any) {
        setIsFlipping(false);
        setFlipFeedback('Erro ao salvar dados do jogo.');
      }
    }, 1200);
  };

  // Sandbox simulation actions (For seamless dev testing)
  const handleSimulateStat = (statName: keyof Profile, value: number) => {
    try {
      const active = db.getActiveProfile();
      // @ts-ignore
      active[statName] = ((active[statName] || 0) as number) + value;

      // Save
      localStorage.setItem(`fcfunz_profile_${active.id}`, JSON.stringify(active));
      const pIdx = db.profiles.findIndex(p => p.id === active.id);
      if (pIdx !== -1) {
        db.profiles[pIdx] = { ...db.profiles[pIdx], ...active };
      }
      localStorage.setItem('fcfunz_profiles', JSON.stringify(db.profiles));

      loadData();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Create sub merchant
  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await api.createMerchant(targetUsername, creatorPin);
      setSuccessMsg(`Sucesso absoluto! @${result.username} foi promovido a Merchant por 30 dias com vínculo permanente à sua conta.`);
      setTargetUsername('');
      setCreatorPin('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar comerciante.');
    } finally {
      setLoading(false);
    }
  };

  // Update merchant pin
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSuccess('');
    setPinError('');

    try {
      await api.updateMerchantPin(currentPin, newPin);
      setPinSuccess('PIN de Comerciante atualizado com sucesso!');
      setCurrentPin('');
      setNewPin('');
    } catch (err: any) {
      setPinError(err.message || 'Erro ao atualizar PIN.');
    }
  };

  // Contribute to the House fund manually
  const handleContributeToHouse = () => {
    const amount = 50;
    if (currentUser.credits < amount) {
      alert(`Saldo insuficiente. Você precisa de pelo menos ${amount} MZN.`);
      return;
    }

    try {
      const active = db.getActiveProfile();
      active.credits -= amount;
      active.stats_house_contributions = (active.stats_house_contributions || 0) + amount;
      active.stats_transactions_amount = (active.stats_transactions_amount || 0) + amount;

      const house = db.profiles.find(u => u.id === 'u_casa');
      if (house) {
        house.credits += amount;
      }

      // Save
      localStorage.setItem(`fcfunz_profile_${active.id}`, JSON.stringify(active));
      const pIdx = db.profiles.findIndex(p => p.id === active.id);
      if (pIdx !== -1) {
        db.profiles[pIdx] = { ...db.profiles[pIdx], ...active };
      }
      localStorage.setItem('fcfunz_profiles', JSON.stringify(db.profiles));

      alert(`Você aportou ${amount} MZN ao Caixa da Casa com sucesso!`);
      loadData();
    } catch (e: any) {
      alert('Erro ao realizar o aporte.');
    }
  };

  // Expiration days tracker helper
  const getDaysRemaining = (expiryStr?: string) => {
    if (!expiryStr) return 0;
    const diff = new Date(expiryStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Block screen if not authorized
  if (!isAuthorizedRole) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl space-y-6">
          <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 rounded-2xl mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Painel Exclusivo de Comerciantes</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Desculpe, o acesso ao painel de missões e parcerias é estritamente restrito a parceiros com cargo <strong className="text-purple-300">Merchant</strong>, <strong className="text-purple-300">Super Merchant</strong> ou <strong className="text-purple-300">Mentor</strong>.
          </p>
          <div className="border-t border-slate-800/60 pt-6 mt-4">
            <span className="text-xs text-slate-500 font-mono">
              Seu Cargo Atual: <span className="text-red-400 font-semibold uppercase">{currentUser.cargo}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Not registered state
  if (!currentUser.merchant_quest_registered) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6 text-center">
            <div className="h-14 w-14 bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 rounded-2xl mx-auto">
              <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-purple-400">
                <Shield className="h-7 w-7" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">Registro de Desafios de Comerciante</h2>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                Bem-vindo ao Sistema Exclusivo de Missões de Negócios! Para começar a rastrear suas metas, acumular <strong className="text-purple-300">MPoints</strong> e trocá-los por dinheiro real (MZN), registre-se no sistema abaixo.
              </p>
            </div>

            {registerError && (
              <div className="bg-red-500/10 border border-red-500/15 p-3 rounded-lg text-red-400 text-xs font-mono">
                {registerError}
              </div>
            )}

            <button
              onClick={handleRegister}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition text-sm shadow-lg shadow-purple-500/20 uppercase tracking-wider"
            >
              Registrar no Sistema
            </button>

            <div className="border-t border-slate-800/60 pt-6 text-[11px] text-slate-500 font-mono flex justify-center gap-6">
              <span>👤 Cargo: {currentUser.cargo}</span>
              <span>•</span>
              <span>💰 Registro Gratuito</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const claimedCount = currentUser.merchant_claimed_quests?.length || 0;
  const currentMPoints = currentUser.mpoint || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 4. PAINEL DE STATUS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 p-0.5 shadow-lg">
              <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center text-pink-400 text-xl font-bold font-mono">
                {currentUser.username[0]?.toUpperCase()}
              </div>
            </div>
            <div>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Comerciante Registrado
              </span>
              <h1 className="text-xl font-black text-white tracking-tight mt-1">
                Olá, @{currentUser.username}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Explore suas missões e converta seus pontos mpoint acumulados em créditos MZN a qualquer hora.</p>
            </div>
          </div>

          {/* User balance & points cards */}
          <div className="md:col-span-5 grid grid-cols-3 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
              <span className="block text-[9px] text-slate-500 uppercase font-mono">Rank de Negócios</span>
              <span className="text-xs font-black text-purple-400 block truncate mt-0.5">{currentUser.cargo}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
              <span className="block text-[9px] text-slate-500 uppercase font-mono">Pontos MPoint</span>
              <span className="text-xs font-black text-emerald-400 block mt-0.5">{currentMPoints}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
              <span className="block text-[9px] text-slate-500 uppercase font-mono">Créditos MZN</span>
              <span className="text-xs font-bold text-amber-400 block mt-0.5">{currentUser.credits} MZN</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Challenges & Active tasks */}
        <div className="lg:col-span-8 space-y-6">

          {/* 2. MISSÕES DISPONÍVEIS */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-400" />
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Seus Desafios de Parceria</h2>
                  <p className="text-[10px] text-slate-400">Complete as metas cumulativas para ganhar recompensas em pontos mpoint.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/30 border border-purple-900/40 px-2.5 py-0.5 rounded">
                {claimedCount} / {QUEST_CATALOG.length} Reivindicadas
              </span>
            </div>

            <div className="space-y-4">
              {QUEST_CATALOG.map((quest) => {
                const prog = quest.getProg(currentUser);
                const pct = Math.min(100, Math.floor((prog / quest.target) * 100));
                const claimed = currentUser.merchant_claimed_quests?.includes(quest.id);
                const isReady = prog >= quest.target;

                return (
                  <div key={quest.id} className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition duration-200 hover:border-slate-800">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-200">{quest.title}</h4>
                        <span className="text-[10px] font-mono font-semibold text-purple-400">+{quest.rewardMPoints} mpoint</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{quest.description}</p>
                      
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                          <span>Progresso: {prog} / {quest.target} {quest.unit}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${isReady ? 'from-emerald-500 to-teal-400' : 'from-purple-600 to-indigo-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end md:ml-4">
                      {claimed ? (
                        <span className="text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-500 border border-slate-750 px-3.5 py-1.5 rounded-lg">
                          Claimed
                        </span>
                      ) : isReady ? (
                        <button
                          onClick={() => handleClaimQuest(quest.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition shadow-md shadow-emerald-500/10 flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" /> Claim
                        </button>
                      ) : (
                        <button
                          disabled
                          className="bg-slate-850 text-slate-500 font-bold px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-not-allowed border border-slate-800"
                        >
                          Bloqueado
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* cara ou coroa interactive simulator */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Cara ou Coroa (HOT) 🪙</h2>
                  <p className="text-[10px] text-slate-400">Jogue partidas rápidas de HOT para atingir a meta do desafio e apostar créditos!</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setCoinChoice('cara')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition font-mono border ${
                      coinChoice === 'cara' 
                        ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' 
                        : 'bg-slate-950/60 text-slate-500 border-slate-850 hover:text-slate-300'
                    }`}
                  >
                    CARA (Heads)
                  </button>
                  <button
                    onClick={() => setCoinChoice('coroa')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition font-mono border ${
                      coinChoice === 'coroa' 
                        ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' 
                        : 'bg-slate-950/60 text-slate-500 border-slate-850 hover:text-slate-300'
                    }`}
                  >
                    COROA (Tails)
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Aposta (MZN)</label>
                  <input
                    type="number"
                    min={1}
                    max={currentUser.credits}
                    value={coinBet}
                    onChange={(e) => setCoinBet(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full rounded-lg bg-slate-950 border border-slate-850 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <button
                  onClick={handleFlipCoin}
                  disabled={isFlipping}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition text-xs shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2"
                >
                  {isFlipping ? 'Jogando Moeda...' : 'Lançar Moeda (HOT)'}
                </button>

                {flipFeedback && (
                  <div className="text-xs font-mono p-3 rounded-lg border bg-slate-950/50 border-slate-800 text-slate-300 text-center">
                    {flipFeedback}
                  </div>
                )}
              </div>

              {/* Graphical representation of the coin */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950/40 border border-slate-850 rounded-xl">
                <div className={`h-24 w-24 rounded-full border-4 flex items-center justify-center text-2xl font-black font-mono transition duration-500 ${
                  isFlipping 
                    ? 'animate-spin border-purple-500/50 text-purple-400' 
                    : flipResult === 'cara'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10'
                    : flipResult === 'coroa'
                    ? 'border-indigo-400 bg-indigo-500/10 text-indigo-400 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-700 bg-slate-800/20 text-slate-500'
                }`}>
                  {isFlipping ? '🔄' : flipResult ? flipResult[0].toUpperCase() : '🪙'}
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-4 uppercase">
                  {isFlipping ? 'Girando no ar...' : flipResult ? `Resultado: ${flipResult}` : 'Escolha Cara ou Coroa'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Referral lists & Exchange widget */}
        <div className="lg:col-span-4 space-y-6">

          {/* 3. SISTEMA DE REIVINDICAÇÃO / PONTOS EXCHANGE */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2.5 mb-4 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-emerald-400" /> Trocar MPoints por MZN
            </h3>

            <p className="text-[11px] text-slate-400 leading-normal mb-4">
              Cada ponto mpoint de comerciante pode ser convertido por <strong className="text-emerald-300">5.4 MZN</strong> de crédito para a sua carteira de forma imediata.
            </p>

            <form onSubmit={handleExchangePoints} className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Seus Pontos Disponíveis</label>
                <div className="text-lg font-mono font-black text-emerald-400 bg-slate-950/60 border border-slate-850 p-2.5 rounded-lg text-center">
                  {currentMPoints} mpoint
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Quantidade para Trocar</label>
                <input
                  type="number"
                  min={1}
                  max={currentMPoints}
                  value={exchangeAmount}
                  onChange={(e) => setExchangeAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-850 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono text-center"
                />
              </div>

              <div className="text-center font-mono text-[10px] text-slate-400">
                Você receberá: <strong className="text-amber-400">{Math.floor(exchangeAmount * 5.4)} MZN</strong>
              </div>

              <button
                type="submit"
                disabled={currentMPoints <= 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-2 rounded-lg transition text-xs shadow-md shadow-emerald-500/10"
              >
                Trocar Pontos por MZN
              </button>
            </form>

            {exchangeFeedback?.success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg p-2.5 mt-3">
                {exchangeFeedback.success}
              </div>
            )}
            {exchangeFeedback?.error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono rounded-lg p-2.5 mt-3">
                {exchangeFeedback.error}
              </div>
            )}
          </div>

          {/* RENOVAÇÃO DE CARGO FREE POR MPOINTS */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2.5 mb-2 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-purple-400 animate-pulse" /> Reativação / Renovação de Cargo
            </h3>

            {['Merchant', 'Super Merchant', 'Mentor'].includes(currentUser.cargo) ? (
              <div className="space-y-4">
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Cargo Atual:</span>
                    <span className="font-bold text-purple-400">{currentUser.cargo}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Data de Expiração:</span>
                    <span className="font-mono text-slate-300">
                      {currentUser.merchant_expires_at 
                        ? new Date(currentUser.merchant_expires_at).toLocaleDateString('pt-MZ')
                        : 'Sem limite'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Prazo Restante:</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {currentUser.merchant_expires_at 
                        ? `${Math.max(0, Math.ceil((new Date(currentUser.merchant_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} dias`
                        : 'Ilimitado'
                      }
                    </span>
                  </div>
                </div>

                {/* Target Cost info */}
                <div className="text-xs text-slate-400 leading-normal space-y-1 bg-purple-950/20 border border-purple-900/30 rounded-xl p-3">
                  <div className="font-bold text-purple-300 font-mono text-[10px] uppercase tracking-wider mb-1">Custo de Manutenção / Reativação:</div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>• Merchant:</span>
                    <span className="text-purple-400">150 MPoints</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>• Super Merchant:</span>
                    <span className="text-purple-400">250 MPoints</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>• Mentor:</span>
                    <span className="text-purple-400">350 MPoints</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={handleRenewCargo}
                    disabled={
                      (currentUser.mpoint || 0) < (currentUser.cargo === 'Mentor' ? 350 : currentUser.cargo === 'Super Merchant' ? 250 : 150)
                    }
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-white font-black py-2.5 rounded-lg transition text-xs shadow-md shadow-indigo-600/10 uppercase tracking-wider font-mono flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" /> Reativar Cargo Free por +30 Dias
                  </button>

                  <p className="text-[10px] text-slate-500 text-center leading-normal">
                    Seus pontos atuais: <span className="text-emerald-400 font-bold font-mono">{currentUser.mpoint || 0} mpoint</span>.
                    Você precisa de <span className="text-purple-400 font-bold font-mono">{(currentUser.cargo === 'Mentor' ? 350 : currentUser.cargo === 'Super Merchant' ? 250 : 150)} mpoint</span> para reativar gratuitamente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl text-center">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Seu cargo atual (<strong className="text-slate-300">{currentUser.cargo || 'User Normal'}</strong>) não é elegível para renovação por MPoints. Esta seção está disponível para:
                </p>
                <div className="flex justify-center gap-1.5 mt-2 font-mono text-[9px] font-bold text-purple-400">
                  <span className="px-1.5 py-0.5 bg-purple-950/30 border border-purple-900/30 rounded">Merchant</span>
                  <span className="px-1.5 py-0.5 bg-purple-950/30 border border-purple-900/30 rounded">Super Merchant</span>
                  <span className="px-1.5 py-0.5 bg-purple-950/30 border border-purple-900/30 rounded">Mentor</span>
                </div>
              </div>
            )}

            {/* DEGRADATION RULE (PROFESSIONAL BRIEFING) */}
            <div className="border-t border-slate-800/80 pt-3.5 space-y-2">
              <span className="text-[9px] font-bold font-mono uppercase text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-400" /> Regra de Degradação de Cargo (Decay)
              </span>
              <p className="text-[10px] text-slate-400 leading-normal">
                Caso sua parceria expire sem que você reative seu cargo, o sistema efetuará um rebaixamento automático no seu próximo login:
              </p>
              <div className="font-mono text-[9px] text-slate-500 space-y-1 bg-slate-950/50 p-2.5 rounded-lg border border-slate-850">
                <div className="flex items-center gap-1">
                  <span className="text-red-400 font-bold">Mentor</span>
                  <span>➡️</span>
                  <span className="text-amber-400 font-bold">Super Merchant</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-amber-400 font-bold">Super Merchant</span>
                  <span>➡️</span>
                  <span className="text-purple-400 font-bold">Merchant</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-400 font-bold">Merchant</span>
                  <span>➡️</span>
                  <span className="text-slate-400 font-bold">User Normal (Verified)</span>
                </div>
              </div>
            </div>

            {renewalFeedback?.success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg p-2.5 mt-2">
                {renewalFeedback.success}
              </div>
            )}
            {renewalFeedback?.error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono rounded-lg p-2.5 mt-2">
                {renewalFeedback.error}
              </div>
            )}
          </div>

          {/* 5. GESTÃO DE SUBORDINADOS (Para Chefes, Mentores, Founders) */}
          {isChefRole && (
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2.5 mb-4 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-400" /> Seus Comerciantes ({subordinates.length})
              </h3>

              <div className="space-y-3.5">
                {subordinates.length > 0 ? (
                  subordinates.map((merchant) => {
                    const daysLeft = getDaysRemaining(merchant.merchant_expires_at);
                    const pct = Math.max(0, Math.min(100, (daysLeft / 30) * 100));
                    return (
                      <div key={merchant.id} className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-400">@{merchant.username}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{daysLeft} dias restantes</span>
                        </div>

                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-slate-500 text-xs italic font-mono">
                    Nenhum parceiro de comércio cadastrado sob sua tag ainda.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registrar Comerciantes (Only for Mentors, Mentor Heads, Founders) */}
          {isChefRole && (
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg relative">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2.5 mb-4 flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-indigo-400" /> Ativar Parceiro (Merchant)
              </h3>

              <form onSubmit={handleCreateMerchant} className="space-y-3.5">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Seu PIN Autorizador</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="Ex: 1234"
                    value={creatorPin}
                    onChange={(e) => setCreatorPin(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none font-mono text-center tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 rounded-lg transition text-xs flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Processando...' : 'Ativar Merchant (1000 MZN)'}
                </button>
              </form>

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg p-2.5 mt-3">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono rounded-lg p-2.5 mt-3">
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Manage PIN Card */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2.5 mb-4 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-400" /> PIN de Segurança
            </h3>

            <form onSubmit={handleUpdatePin} className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">PIN Atual</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="Ex: 1234"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono text-center tracking-widest"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Novo PIN (4 dígitos)</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="Ex: 5678"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono text-center tracking-widest"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold py-2 rounded-lg transition text-xs"
              >
                Atualizar PIN de Segurança
              </button>
            </form>

            {pinSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg p-2 mt-3 text-center">
                {pinSuccess}
              </div>
            )}
            {pinError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono rounded-lg p-2 mt-3 text-center">
                {pinError}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
