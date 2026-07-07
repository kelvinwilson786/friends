/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, UserCargo, BADGE_CONFIG } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, CheckCircle, Shield, User, Users, Star, Lock,
  Search, ArrowRight, HelpCircle, RefreshCw, Zap, Sparkles, AlertCircle
} from 'lucide-react';

interface BadgeDef {
  filename: string;
  name: string;
  colorName: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
  icon: string;
}

// Maps any user cargo to their custom list of badges (Emblem Hierarchy)
export function getBadgesForCargo(cargo: string): BadgeDef[] {
  const norm = (cargo || 'Unverified User').toLowerCase().trim();
  
  const badges: BadgeDef[] = [];
  
  const getBadge = (c: UserCargo): BadgeDef => {
    const conf = BADGE_CONFIG[c];
    return {
      filename: `${conf.icon}.png`,
      name: conf.name,
      colorName: conf.textClass.includes('amber') ? 'Marrom/Dourado' :
                 conf.textClass.includes('orange') ? 'Laranja' :
                 conf.textClass.includes('teal') ? 'Verde' :
                 conf.textClass.includes('red') ? 'Vermelho' :
                 conf.textClass.includes('rose') ? 'Vermelho' :
                 conf.textClass.includes('pink') ? 'Rosa' :
                 conf.textClass.includes('purple') ? 'Roxo' :
                 conf.textClass.includes('emerald') ? 'Verde' : 'Cinza',
      textClass: conf.textClass,
      bgClass: conf.bgClass,
      borderClass: conf.borderClass,
      description: conf.description,
      icon: conf.icon
    };
  };

  if (norm === 'founder') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Founder'));
  } else if (norm === 'global admin' || norm === 'gadmin' || norm === 'admin') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Global Admin'));
  } else if (norm === 'mentor head') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Mentor Head'));
    badges.push(getBadge('Mentor'));
  } else if (norm === 'mentor') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Mentor'));
  } else if (norm === 'super merchant') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Super Merchant'));
  } else if (norm === 'merchant') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Merchant'));
  } else if (norm === 'merchant guide' || norm === 'm-guide') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Merchant'));
    badges.push(getBadge('Guide'));
  } else if (norm === 'super merchant guide' || norm === 's-guide') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Super Merchant'));
    badges.push(getBadge('Guide'));
  } else if (norm === 'guide') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Guide'));
  } else if (norm === 'merchant staff' || norm === 'm-staff') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Merchant'));
    badges.push(getBadge('Staff'));
  } else if (norm === 'staff') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Staff'));
  } else if (norm === 'merchant hero' || norm === 'm-hero') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Merchant'));
    badges.push(getBadge('Hero'));
  } else if (norm === 'hero') {
    badges.push(getBadge('Hero'));
  } else if (norm === 'lucky user' || norm === 'lucky') {
    badges.push(getBadge('Lucky User'));
  } else if (norm === 'verified user') {
    badges.push(getBadge('Verified User'));
  } else if (norm === 'chatroom moderator' || norm === 'moderator') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Chatroom Moderator'));
  } else if (norm === 'chatroom manager' || norm === 'manager') {
    badges.push(getBadge('Verified User'));
    badges.push(getBadge('Chatroom Manager'));
  } else {
    badges.push(getBadge('Unverified User'));
  }
  
  return badges;
}

// Maps cargo to custom nickname styling and color description
export function getCargoNicknameStyle(cargo: string) {
  const norm = cargo.toLowerCase().trim();
  switch (norm) {
    case 'founder':
      return { text: 'text-amber-500 font-black tracking-tight', label: 'Marrom/Dourado' };
    case 'global admin':
    case 'admin':
    case 'gadmin':
      return { text: 'text-orange-400 font-bold', label: 'Laranja' };
    case 'mentor head':
    case 'mentor':
      return { text: 'text-red-500 font-extrabold', label: 'Vermelho' };
    case 'super merchant':
      return { text: 'text-pink-400 font-bold', label: 'Rosa' };
    case 'merchant':
      return { text: 'text-purple-400 font-bold', label: 'Roxo' };
    case 'merchant guide':
    case 'm-guide':
      return { text: 'text-teal-400 font-bold underline decoration-purple-500/50', label: 'Verde (com destaque)' };
    case 'super merchant guide':
    case 's-guide':
      return { text: 'text-teal-400 font-bold underline decoration-pink-500/50', label: 'Verde (com destaque)' };
    case 'guide':
      return { text: 'text-emerald-400 font-medium', label: 'Verde' };
    case 'merchant staff':
    case 'm-staff':
      return { text: 'text-slate-400 font-bold underline decoration-purple-500/50', label: 'Cinza (com destaque)' };
    case 'staff':
      return { text: 'text-slate-400 font-medium', label: 'Cinza' };
    case 'merchant hero':
    case 'm-hero':
      return { text: 'text-cyan-400 font-bold underline decoration-purple-500/50', label: 'Ciano (com destaque)' };
    case 'hero':
      return { text: 'text-cyan-400 font-medium', label: 'Ciano' };
    case 'lucky user':
    case 'lucky':
      return { text: 'text-yellow-400 font-bold animate-pulse', label: 'Amarelo/Dourado' };
    case 'gameman':
    case 'verified user':
      return { text: 'text-emerald-400 font-semibold', label: 'Verde' };
    default:
      return { text: 'text-slate-300 font-normal', label: 'Cinza Claro (Padrão)' };
  }
}

export function UserBadgesInline({ cargo, className = "ml-1.5" }: { cargo: string; className?: string }) {
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('badge_config_updated', handleUpdate);
    return () => window.removeEventListener('badge_config_updated', handleUpdate);
  }, []);

  const badges = getBadgesForCargo(cargo || 'Unverified User');
  if (badges.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 shrink-0 align-middle ${className}`}>
      {badges.map((badge, idx) => {
        const isImage = badge.icon && (
          badge.icon.startsWith('data:image/') || 
          badge.icon.startsWith('http://') || 
          badge.icon.startsWith('https://') || 
          badge.icon.includes('/') || 
          badge.icon.includes('.')
        );
        return (
          <span
            key={idx}
            title={`${badge.name} - ${badge.description}`}
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] overflow-hidden select-none cursor-help shadow-sm border ${badge.bgClass} ${badge.borderClass} hover:scale-125 hover:rotate-6 transition-all duration-200`}
          >
            {isImage ? (
              <img src={badge.icon} alt={badge.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              badge.icon
            )}
          </span>
        );
      })}
    </span>
  );
}

export default function BadgesSection() {
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [targetUsername, setTargetUsername] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [notFoundUser, setNotFoundUser] = useState<string | null>(null);

  // Parse `?u=username` on load & when URL changes
  useEffect(() => {
    const parseUrlParam = () => {
      const params = new URLSearchParams(window.location.search);
      const usernameParam = params.get('u');
      
      if (usernameParam) {
        setTargetUsername(usernameParam);
        const found = db.profiles.find(
          p => p.username.toLowerCase() === usernameParam.toLowerCase()
        );
        if (found) {
          setSelectedProfile(found);
          setNotFoundUser(null);
        } else {
          setSelectedProfile(null);
          setNotFoundUser(usernameParam);
        }
      } else {
        // If no parameter is provided, we default to the active user's username
        // but tell them the parameter 'u' is required by setting the URL or asking
        setSelectedProfile(null);
        setNotFoundUser(null);
      }
    };

    parseUrlParam();
    // Listen to changes
    window.addEventListener('popstate', parseUrlParam);
    const unsubscribe = subscribeToGlobalUpdates(parseUrlParam);
    return () => {
      window.removeEventListener('popstate', parseUrlParam);
      unsubscribe();
    };
  }, []);

  // Update URL search parameter dynamically
  const navigateToUser = (username: string) => {
    const newUrl = `${window.location.pathname}?u=${encodeURIComponent(username)}`;
    window.history.pushState({}, '', newUrl);
    // Dispatch popstate event manually so listeners can update state
    window.dispatchEvent(new Event('popstate'));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUsername.trim()) {
      navigateToUser(targetUsername.trim());
    }
  };

  const activeIsSelf = selectedProfile ? currentUser.id === selectedProfile.id : false;
  const badges = selectedProfile ? getBadgesForCargo(selectedProfile.cargo) : [];
  const nickStyle = selectedProfile ? getCargoNicknameStyle(selectedProfile.cargo) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* HEADER HERO SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Sistema de Autenticação Visual & Patentes
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Central de Emblemas & Insígnias FCFUNZ
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consulte e valide as credenciais oficiais, parcerias e níveis de moderação de qualquer usuário. Os emblemas representam as responsabilidades, status econômicos e cargos de liderança vigentes na comunidade.
            </p>
          </div>
          
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Verificação em Tempo Real Ativa</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Search & Directory list */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SEARCH BOX FOR PARAMETER 'u' */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Search className="h-4 w-4 text-emerald-400" /> Consultar Usuário (?u=)
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Insira o nome de usuário (u) para validar as insígnias e o cargo diretamente do banco de dados.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Parâmetro de Busca (u)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Digite o username (ex: Kelvin)"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-850 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold font-mono transition"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            </form>

            {notFoundUser && (
              <div className="bg-red-500/10 border border-red-500/15 p-3 rounded-lg text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Usuário <strong>@{notFoundUser}</strong> não foi encontrado no banco de dados.</span>
              </div>
            )}
          </div>

          {/* QUICK DIRECTORY SELECTION */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Selecione um Usuário Seed
              </h3>
              <p className="text-[10px] text-slate-500">
                Selecione um dos perfis pré-configurados para verificar as diferentes combinações de emblemas:
              </p>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {db.profiles.map((p) => {
                const isSelected = selectedProfile?.id === p.id;
                const pBadges = getBadgesForCargo(p.cargo);
                const pNickStyle = getCargoNicknameStyle(p.cargo);

                return (
                  <button
                    key={p.id}
                    onClick={() => navigateToUser(p.username)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-slate-950 border-emerald-500/40 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-950 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <img 
                        src={p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} 
                        alt={p.username} 
                        className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 shrink-0 object-cover" 
                      />
                      <div className="truncate">
                        <span className={`text-xs font-bold block truncate ${pNickStyle.text}`}>
                          @{p.username}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block uppercase">
                          Cargo: {p.cargo}
                        </span>
                      </div>
                    </div>

                    {/* Small badges visual indicator */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {pBadges.slice(0, 3).map((b, bIdx) => (
                        <span 
                          key={bIdx} 
                          title={b.name}
                          className="text-[10px] bg-slate-900 p-1 rounded-md border border-slate-800"
                        >
                          {b.icon}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Emblem Exhibition & Premium Sandbox Simulation */}
        <div className="lg:col-span-8 space-y-6">

          <AnimatePresence mode="wait">
            {selectedProfile ? (
              <motion.div
                key={selectedProfile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                
                {/* USER CARD INFO */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  {activeIsSelf && (
                    <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2.5 rounded-xl font-mono flex items-center gap-2">
                      <Sparkles className="h-4 w-4 shrink-0 animate-spin" />
                      <span><strong>Identidade Confirmada:</strong> Este é o seu próprio usuário conectado. Você está vendo suas insígnias vigentes!</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={selectedProfile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedProfile.username}`} 
                        alt={selectedProfile.username} 
                        className="w-14 h-14 rounded-2xl border-2 border-slate-700 bg-slate-950 object-cover" 
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className={`text-xl font-black ${nickStyle?.text}`}>
                            @{selectedProfile.username}
                          </h2>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {selectedProfile.pais === 'MZ' ? 'MZ 🇲🇿' : 'BR 🇧🇷'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Cor do Nickname: <strong className="text-slate-300 font-semibold">{nickStyle?.label}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">Cargo / Patente Atual</span>
                      <span className="text-sm font-black text-emerald-400 block mt-0.5">{selectedProfile.cargo}</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Nível {selectedProfile.nivel} ({selectedProfile.xp} XP)</span>
                    </div>
                  </div>
                </div>

                {/* THE BADGES GRID (EACH BADGE IN AN INDIVIDUAL CARD) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Insígnias Ativas ({badges.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {badges.map((badge, idx) => (
                      <div 
                        key={idx} 
                        className={`bg-slate-950/50 border ${badge.borderClass} rounded-2xl p-5 flex items-start gap-4 transition duration-200 hover:scale-[1.01]`}
                      >
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl font-mono shrink-0 select-none ${badge.bgClass} border ${badge.borderClass}`}>
                          {badge.icon}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white tracking-tight">{badge.name}</h4>
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded uppercase">
                              {badge.filename}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed font-sans">{badge.description}</p>
                          <div className="pt-1 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[9px] text-slate-500 font-mono">Cor do Emblema: {badge.colorName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-6"
              >
                <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 rounded-2xl mx-auto">
                  <Award className="h-8 w-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white tracking-tight">Nenhum Parâmetro 'u' Selecionado</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Por favor, utilize o painel ao lado para selecionar um dos perfis seed da plataforma ou pesquise por um nome de usuário acima. O parâmetro <strong className="text-emerald-300">u</strong> é obrigatório para exibir as insígnias.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

    </div>
  );
}
