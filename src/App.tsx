/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ChatSection from './components/ChatSection';
import SocialSection from './components/SocialSection';
import MarketplaceSection from './components/MarketplaceSection';
import DirectMessagesSection from './components/DirectMessagesSection';
import LeaderboardSection from './components/LeaderboardSection';
import MissionsSection from './components/MissionsSection';
import AdminSection from './components/AdminSection';
import AccountSection from './components/AccountSection';
import MerchantPanel from './components/MerchantPanel';
import UserProfileModal from './components/UserProfileModal';
import BadgesSection from './components/BadgesSection';
import CreditsInfoSection from './components/CreditsInfoSection';
import VaquinhaSection from './components/VaquinhaSection';
import { api, db, subscribeToGlobalUpdates } from './lib/supabase';
import { Profile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Share2, ShoppingCart, UserCheck, Trophy, 
  Target, Shield, ShieldCheck, AlertCircle, Sparkles, User, Key, Globe,
  Users, Briefcase, Award, Coins
} from 'lucide-react';

export default function App() {
  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    return localStorage.getItem('fcfunz_auth_completed') === 'true';
  });

  const [activeTab, setActiveTab] = useState<string>('social');
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [initialPMRecipientId, setInitialPMRecipientId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Authentication Fields (MÓDULO 1)
  const [regUsername, setRegUsername] = useState('');
  const [regNome, setRegNome] = useState('');
  const [regSobrenome, setRegSobrenome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPais, setRegPais] = useState('BR');
  const [regSexo, setRegSexo] = useState('M');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaValue, setCaptchaValue] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [authError, setAuthError] = useState('');

  // Login via Username (MÓDULO 1)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(false);

  const [activeToast, setActiveToast] = useState<any | null>(null);

  useEffect(() => {
    let lastCount = 0;
    const initialUser = db.getActiveProfile();
    if (initialUser) {
      lastCount = db.notifications.filter(n => n.usuario_id === initialUser.id).length;
    }

    const handleUpdate = () => {
      const active = db.getActiveProfile();
      setCurrentUser(active);
      
      if (active) {
        const userNotifs = db.notifications.filter(n => n.usuario_id === active.id);
        if (userNotifs.length > lastCount) {
          const newest = userNotifs[userNotifs.length - 1];
          if (!newest.read) {
            setActiveToast(newest);
            // Auto-hide after 4 seconds
            setTimeout(() => {
              setActiveToast((prev: any) => prev?.id === newest.id ? null : prev);
            }, 4000);
          }
        }
        lastCount = userNotifs.length;
      }
    };
    const unsubscribe = subscribeToGlobalUpdates(handleUpdate);
    return () => unsubscribe();
  }, []);

  // Switch to badges tab automatically on load if ?u= is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('u')) {
      setActiveTab('badges');
    }
  }, []);

  // Accumulate Online Points dynamically while the user is actively exploring the FCFUNZ app
  useEffect(() => {
    if (!isRegistered || !currentUser) return;

    const interval = setInterval(() => {
      // Accumulate +1 online point every 15 seconds
      api.addOnlinePoints(currentUser.id, 1);
    }, 15000);

    return () => clearInterval(interval);
  }, [isRegistered, currentUser?.id]);

  // 5 Minutes Auto-Logout on Inactivity
  useEffect(() => {
    if (!isRegistered) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.removeItem('fcfunz_auth_completed');
        setIsRegistered(false);
        alert('Sua sessão expirou devido a 5 minutos de inatividade. Por favor, faça login novamente.');
      }, 5 * 60 * 1000); // 5 minutes
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isRegistered]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setAuthError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setAuthError('As senhas não coincidem.');
      return;
    }

    if (!acceptTerms) {
      setAuthError('Você precisa aceitar os Termos de Serviço do FCFUNZ.');
      return;
    }

    if (captchaInput !== captchaValue) {
      setAuthError('CAPTCHA inválido.');
      setCaptchaValue(Math.floor(1000 + Math.random() * 9000).toString());
      return;
    }

    // Block registering official seed usernames to prevent hijacking
    const seedUsernames = ['kelvin', 'carlos_mentor', 'sara_merchant', 'guide_ana', 'casa_fcfunz'];
    if (seedUsernames.includes(regUsername.toLowerCase().trim())) {
      setAuthError('Este nome de usuário é reservado para contas oficiais da plataforma.');
      return;
    }

    // Simulate unique username
    const exists = db.profiles.some(p => p.username.toLowerCase() === regUsername.toLowerCase());
    if (exists) {
      setAuthError('Este nome de usuário já está sendo utilizado.');
      return;
    }

    try {
      const p = await api.registerUser({
        username: regUsername,
        nome: regNome,
        sobrenome: regSobrenome,
        email: regEmail,
        pais: regPais,
        sexo: regSexo,
        password: regPassword,
      });
      
      localStorage.setItem('fcfunz_auth_completed', 'true');
      setIsRegistered(true);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao criar conta.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setAuthError('Preencha o nome de usuário e a senha.');
      return;
    }

    const target = db.profiles.find(p => p.username.toLowerCase() === loginUsername.trim().toLowerCase());
    if (target) {
      const userPassword = target.password || '123';
      if (userPassword === loginPassword) {
        api.loginAsUser(target.id);
        localStorage.setItem('fcfunz_auth_completed', 'true');
        setIsRegistered(true);
      } else {
        setAuthError('Senha incorreta. Por favor, tente novamente.');
      }
    } else {
      setAuthError('Nome de usuário não encontrado.');
    }
  };

  const handleOpenPMWithUser = (userId: string) => {
    setInitialPMRecipientId(userId);
    setActiveTab('pms');
  };

  const handleLogout = () => {
    localStorage.removeItem('fcfunz_auth_completed');
    setIsRegistered(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      
      {/* 1. AUTHENTICATION WALL (MÓDULO 1 & MÓDULO 36) */}
      {!isRegistered ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-tr from-slate-950 via-indigo-950/10 to-slate-950">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative z-10">
            <div className="p-6 sm:p-8 border-b border-slate-800 bg-slate-950/40 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 mb-3">
                <span className="font-sans text-2xl font-black text-white tracking-widest">FC</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">Bem-vindo ao FCFUNZ Premium</h2>
              <p className="text-xs text-slate-400 mt-1">A clássica rede social e chatroom virtual de 2015 em sua versão definitiva</p>
            </div>

            <div className="p-6 sm:p-8">
              {authError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{authError}</span>
                </div>
              )}

              {isLoginView ? (
                /* Login screen (MÓDULO 1) */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Nome de Usuário</label>
                    <input
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Digite seu nome de usuário"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Senha</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Digite sua senha de acesso"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition text-xs shadow-md shadow-indigo-600/10"
                  >
                    Entrar no Applet
                  </button>

                  <div className="pt-4 border-t border-slate-800 text-center">
                    <button 
                      type="button" 
                      onClick={() => setIsLoginView(false)} 
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Não tem uma conta? Crie uma agora!
                    </button>
                  </div>
                </form>
              ) : (
                /* Register Screen (MÓDULO 1) */
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Username *</label>
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Nome único de usuário"
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Email *</label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="Seu email para contato"
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Nome</label>
                      <input
                        type="text"
                        value={regNome}
                        onChange={(e) => setRegNome(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Sobrenome</label>
                      <input
                        type="text"
                        value={regSobrenome}
                        onChange={(e) => setRegSobrenome(e.target.value)}
                        placeholder="Seu sobrenome"
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Senha *</label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Senha de segurança"
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Confirmar Senha *</label>
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repita a senha anterior"
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">País</label>
                      <select
                        value={regPais}
                        onChange={(e) => setRegPais(e.target.value)}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="MZ">Moçambique (MZ)</option>
                        <option value="BR">Brasil (BR)</option>
                        <option value="PT">Portugal (PT)</option>
                        <option value="AO">Angola (AO)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Sexo</label>
                      <select
                        value={regSexo}
                        onChange={(e) => setRegSexo(e.target.value)}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="O">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* CAPTCHA validation (MÓDULO 1 & MÓDULO 36) */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Verificação:</span>
                      <span className="text-sm font-bold font-mono tracking-widest text-indigo-400 line-through select-none bg-slate-900 border border-slate-800 px-3.5 py-1 rounded-md">{captchaValue}</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Digite o CAPTCHA"
                      className="w-32 rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-start gap-2.5 pt-1.5">
                    <input
                      type="checkbox"
                      id="accept-terms"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <label htmlFor="accept-terms" className="text-[11px] text-slate-400 leading-normal select-none">
                      Aceito os termos de uso do FCFUNZ, regras de conduta amigável e proteção contra proxy/VPN.
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition text-xs shadow-md shadow-indigo-600/10"
                  >
                    Cadastrar e Ganhar 100 MZN Iniciais
                  </button>

                  <div className="pt-4 border-t border-slate-800 text-center">
                    <button 
                      type="button" 
                      onClick={() => setIsLoginView(true)} 
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Já tem uma conta? Entre por Username
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. THE MAIN APPLICATION WORKSPACE */
        <>
          <Navbar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            openPMWithUser={handleOpenPMWithUser} 
            onViewProfile={setSelectedProfileId}
            onLogout={handleLogout}
          />

          {/* Tab Submenu Navigation Bar (MÓDULO DE INTERFACE) */}
          <nav className="w-full bg-slate-950/80 border-b border-slate-900 backdrop-blur-md sticky top-16 z-40 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1.5 py-3 shrink-0">
              <button
                onClick={() => setActiveTab('social')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'social' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Share2 className="h-4 w-4 text-indigo-400" /> Feed
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'chat' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <MessageSquare className="h-4 w-4 text-indigo-400" /> Bate-Papo
              </button>
              <button
                onClick={() => setActiveTab('market')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'market' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <ShoppingCart className="h-4 w-4 text-pink-400" /> Loja & Presentes
              </button>
              <button
                onClick={() => setActiveTab('credits_info')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'credits_info' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Coins className="h-4 w-4 text-amber-400" /> Preços mzn
              </button>
              <button
                onClick={() => setActiveTab('vaquinha')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'vaquinha' 
                    ? 'bg-gradient-to-r from-pink-500 to-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="h-4 w-4 text-pink-400 animate-pulse" /> Apoiar Site (Vaquinha)
              </button>
              <button
                onClick={() => setActiveTab('pms')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'pms' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <UserCheck className="h-4 w-4 text-emerald-400" /> Mensagens Privadas
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'leaderboard' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Trophy className="h-4 w-4 text-yellow-400" /> Rankings & FC Box
              </button>
              <button
                onClick={() => setActiveTab('missions')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'missions' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Target className="h-4 w-4 text-rose-400" /> Missões Diárias
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'account' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <User className="h-4 w-4 text-sky-400" /> Minha Conta
              </button>
              <button
                onClick={() => setActiveTab('merchants')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'merchants' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Users className="h-4 w-4 text-teal-400" /> Parcerias & Merchants
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === 'badges' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Award className="h-4 w-4 text-purple-400" /> Emblemas & Patentes
              </button>
              {(currentUser.cargo === 'Founder' || currentUser.cargo === 'Global Admin') && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 ${
                    activeTab === 'admin' 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25 scale-[1.02]' 
                      : 'text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10'
                  }`}
                >
                  <Shield className="h-4 w-4 text-rose-400" /> Painel Admin
                </button>
              )}
            </div>
          </nav>

          {/* Active section view renderer with Framer Motion route transition */}
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto"
              >
                {activeTab === 'chat' && <ChatSection onViewProfile={setSelectedProfileId} />}
                {activeTab === 'social' && <SocialSection />}
                {activeTab === 'market' && <MarketplaceSection />}
                {activeTab === 'credits_info' && <CreditsInfoSection />}
                {activeTab === 'vaquinha' && <VaquinhaSection />}
                {activeTab === 'pms' && <DirectMessagesSection initialRecipientId={initialPMRecipientId} clearInitialRecipient={() => setInitialPMRecipientId(null)} />}
                {activeTab === 'leaderboard' && <LeaderboardSection onViewProfile={setSelectedProfileId} />}
                {activeTab === 'missions' && <MissionsSection />}
                {activeTab === 'account' && <AccountSection onViewProfile={setSelectedProfileId} />}
                {activeTab === 'merchants' && <MerchantPanel />}
                {activeTab === 'badges' && <BadgesSection />}
                {activeTab === 'admin' && <AdminSection />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Centralized User Profile Viewer Modal */}
          {selectedProfileId && (
            <UserProfileModal 
              userId={selectedProfileId} 
              onClose={() => setSelectedProfileId(null)} 
              onOpenPM={handleOpenPMWithUser} 
            />
          )}

          {/* Real-time Toast Notifications Overlay */}
          <AnimatePresence>
            {activeToast && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-slate-900/95 border border-indigo-500/30 rounded-xl p-4 shadow-2xl shadow-indigo-500/10 backdrop-blur-md flex gap-3.5"
              >
                <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-lg">
                  🔔
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-slate-100 font-mono tracking-wide uppercase">
                    {activeToast.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-normal font-sans">
                    {activeToast.message}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveToast(null)}
                  className="text-slate-500 hover:text-slate-400 font-mono text-[10px] self-start"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

    </div>
  );
}
