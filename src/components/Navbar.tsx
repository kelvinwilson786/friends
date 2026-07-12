/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, AppNotification } from '../types';
import { UserBadgesInline } from './BadgesSection';
import { Coins, Award, Users, LogOut, Bell, Shield, MessageSquare, Search, Sparkles, Gift } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openPMWithUser: (userId: string) => void;
  onViewProfile: (userId: string) => void;
  onLogout: () => void;
  onOpenP2P: () => void;
}

export default function Navbar({ activeTab, setActiveTab, openPMWithUser, onViewProfile, onLogout, onOpenP2P }: NavbarProps) {
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [allUsers, setAllUsers] = useState<Profile[]>(db.profiles);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(db.getActiveProfile());
      setAllUsers(db.profiles);
      api.getNotifications().then(setNotifications);
    };
    handleUpdate();
    const unsubscribe = subscribeToGlobalUpdates(handleUpdate);
    return () => unsubscribe();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = allUsers.filter(u => {
      if (u.id === currentUser.id) return true;

      // Visibility restriction: friends or official platform users only
      const isFriend = db.amizades.some(a => 
        a.status === 'aceito' && 
        ((a.solicitante_id === currentUser.id && a.destinatario_id === u.id) || 
         (a.solicitante_id === u.id && a.destinatario_id === currentUser.id))
      );
      const isOfficial = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff', 'Guide'].includes(u.cargo);

      if (!isFriend && !isOfficial) return false;

      return u.username.toLowerCase().includes(query.toLowerCase()) ||
             (u.nome && u.nome.toLowerCase().includes(query.toLowerCase()));
    });
    setSearchResults(filtered);
  };

  // Cargo badge color helper
  const getCargoStyle = (cargo: string) => {
    switch (cargo) {
      case 'Founder':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'Global Admin':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'Mentor':
      case 'Mentor Head':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'; // Red for Mentor
      case 'Super Merchant':
        return 'bg-pink-500/20 text-pink-400 border border-pink-500/30'; // Pink for Super Merchant
      case 'Merchant':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'; // Purple for Merchant
      case 'Guide':
        return 'bg-teal-500/20 text-teal-400 border border-teal-500/30';
      case 'Staff':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'Verified User':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/30';
    }
  };

  const cargoTextClass = (cargo: string) => {
    if (cargo === 'Mentor' || cargo === 'Mentor Head') return 'text-red-400 font-bold';
    if (cargo === 'Super Merchant') return 'text-pink-400 font-bold';
    if (cargo === 'Merchant') return 'text-purple-400 font-bold';
    if (cargo === 'Founder') return 'text-amber-400 font-bold';
    if (cargo === 'Global Admin') return 'text-rose-400 font-bold';
    return 'text-slate-200';
  };

  const nextLevelXP = 100;
  const xpPercentage = Math.min(100, Math.max(0, currentUser.xp));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo AMIGOS */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('chat')}>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <span className="font-sans text-lg font-black text-white tracking-wider">AM</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-sans text-lg font-bold text-white tracking-wider flex items-center gap-1">
              AMIGOS <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase font-mono tracking-tight font-extrabold">Fcfunztbook Premium</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-mono tracking-tight uppercase">Rede Social Virtual</p>
          </div>
        </div>

        {/* Search Engine (FC BOX / MÓDULO 22) */}
        <div className="relative hidden md:block w-72">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar usuários ou salas..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 pl-9 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-2 h-4 w-4 text-slate-500" />
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-11 left-0 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-xl z-50">
              <p className="text-[10px] font-mono text-slate-500 px-2 pb-1.5 uppercase border-b border-slate-800">Diretório FC Box</p>
              <div className="max-h-60 overflow-y-auto mt-1 space-y-1">
                {searchResults.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 transition cursor-pointer"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      onViewProfile(u.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <img src={u.avatar_url || ''} alt={u.username} className="w-6 h-6 rounded-full border border-slate-700" />
                      <div>
                        <p className={`text-xs ${cargoTextClass(u.cargo)} flex items-center gap-1`}>
                          {u.username}
                          <UserBadgesInline cargo={u.cargo} className="ml-1" />
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">{u.cargo}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${getCargoStyle(u.cargo)}`}>
                      {u.cargo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Balance & Level Info */}
        <div className="flex items-center gap-4 sm:gap-6">
          
          {/* Credits / Moeda Unica (MZN) */}
          <div 
            onClick={onOpenP2P}
            className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 group" 
            title="Clique para Depositar ou Levantar MZN via e-Mola"
          >
            <Coins className="h-4 w-4 text-amber-400 group-hover:animate-pulse" />
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-amber-400 group-hover:text-amber-300">{currentUser ? currentUser.credits : 0}</span>
              <span className="text-[10px] text-slate-400 ml-1 font-medium">MZN</span>
            </div>
          </div>

          {/* XP & Level Progress */}
          <div className="hidden xs:flex flex-col text-right w-24">
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <span className="font-bold text-indigo-400 flex items-center gap-0.5">
                <Award className="h-3 w-3" /> Nível {currentUser.nivel}
              </span>
              <span className="font-mono text-slate-400 font-semibold">{Math.round(currentUser.xp)}/{nextLevelXP} XP</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-slate-950 border border-slate-850 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-500 shadow-[0_0_6px_rgba(245,158,11,0.35)]" 
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={async () => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  await api.markNotificationsAsRead();
                }
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition relative focus:outline-none"
              title="Notificações"
            >
              <Bell className="h-4.5 w-4.5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider font-bold flex items-center gap-1">
                    <Bell className="h-3 w-3" /> Notificações ({notifications.filter(n => !n.read).length} não lidas)
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        await api.markNotificationsAsRead();
                      }}
                      className="text-[9px] text-slate-400 hover:text-slate-200 transition font-medium"
                    >
                      Lidas
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        await api.clearNotifications();
                      }}
                      className="text-[9px] text-red-400 hover:text-red-300 transition font-medium"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 font-mono">
                      Nenhuma notificação por enquanto
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const getNotifIcon = (type: string) => {
                        switch (type) {
                          case 'transfer': return <Coins className="h-4 w-4 text-amber-400 shrink-0" />;
                          case 'gift': return <Gift className="h-4 w-4 text-purple-400 shrink-0" />;
                          case 'friend_request': return <Users className="h-4 w-4 text-indigo-400 shrink-0" />;
                          default: return <Bell className="h-4 w-4 text-slate-400 shrink-0" />;
                        }
                      };

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.sender_id) {
                              onViewProfile(n.sender_id);
                              setShowNotifications(false);
                            }
                          }}
                          className={`flex items-start gap-2.5 p-2 rounded-lg transition text-left cursor-pointer ${
                            n.read ? 'hover:bg-slate-900/40 opacity-75' : 'bg-slate-900/60 border border-slate-850 hover:bg-slate-900'
                          }`}
                        >
                          {getNotifIcon(n.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200 leading-tight">{n.title}</p>
                            <p className="text-[11px] text-slate-400 leading-normal mt-0.5 whitespace-pre-wrap">{n.message}</p>
                            <p className="text-[9px] text-slate-500 font-mono mt-1">
                              {new Date(n.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.criado_em).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Info - Clicking navigates to account screen */}
          <button 
            onClick={() => setActiveTab('account')}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-900 transition focus:outline-none"
            title="Visualizar Minha Conta"
          >
            <div className="relative">
              <img 
                src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                alt={currentUser.username} 
                className="h-8.5 w-8.5 rounded-full object-cover border-2 border-indigo-500"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500" />
            </div>
            <div className="hidden lg:block text-left">
              <p className={`text-xs leading-none font-semibold flex items-center gap-1 ${cargoTextClass(currentUser.cargo)}`}>
                {currentUser.username}
                <UserBadgesInline cargo={currentUser.cargo} className="ml-0.5" />
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{currentUser.cargo}</p>
            </div>
          </button>

          {/* Secure Logout Button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-slate-900 hover:bg-rose-500/10 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
            title="Sair da Conta (Logout)"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>

        </div>

      </div>
    </header>
  );
}
