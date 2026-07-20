/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import P2PModal from './components/P2PModal';
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
import Footer from './components/Footer';
import { api, db, subscribeToGlobalUpdates, isUsingRealSupabase, realSupabase, supabaseError, handleSupabaseConnectionError } from './lib/supabase';
import { botOrchestrator } from './lib/bots';
import { Profile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Share2, ShoppingCart, UserCheck, Trophy, 
  Target, Shield, ShieldCheck, AlertCircle, Sparkles, User, Key, Globe,
  Users, Briefcase, Award, Coins, Menu, X
} from 'lucide-react';

export default function App() {
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>('social');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isP2POpen, setIsP2POpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    const localAuth = localStorage.getItem('fcfunz_auth_completed') === 'true';
    return (localAuth && !isUsingRealSupabase) ? db.getActiveProfile() : null;
  });
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
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  const [supabaseActive, setSupabaseActive] = useState(isUsingRealSupabase);
  const [supabaseErrStr, setSupabaseErrStr] = useState(supabaseError);

  useEffect(() => {
    // Override standard blocking alert
    window.alert = (message: string) => {
      setCustomAlert(message);
    };
  }, []);

  // Supabase Auth and State Synchronizer (MÓDULO 1)
  useEffect(() => {
    if (isUsingRealSupabase && realSupabase) {
      // 1. Get initial session
      realSupabase.auth.getSession().then((res: any) => {
        const session = res?.data?.session;
        if (session?.user) {
          api.getCurrentUser().then((profile) => {
            if (profile) {
              db.setActiveUser(profile.id);
              setCurrentUser(profile);
              setIsRegistered(true);
            } else {
              setCurrentUser(null);
              setIsRegistered(false);
            }
          }).catch((err) => {
            handleSupabaseConnectionError(err);
            setCurrentUser(null);
            setIsRegistered(false);
          });
        } else {
          setCurrentUser(null);
          setIsRegistered(false);
        }
      }).catch((err: any) => {
        handleSupabaseConnectionError(err);
        setCurrentUser(null);
        setIsRegistered(false);
      });

      // 2. Listen to auth state changes
      let subscription: any = null;
      try {
        const res = realSupabase.auth.onAuthStateChange(async (event: any, session: any) => {
          if (session?.user) {
            try {
              const profile = await api.getCurrentUser();
              if (profile) {
                db.setActiveUser(profile.id);
                setCurrentUser(profile);
                setIsRegistered(true);
              } else {
                setCurrentUser(null);
                setIsRegistered(false);
              }
            } catch (err) {
              handleSupabaseConnectionError(err);
              setCurrentUser(null);
              setIsRegistered(false);
            }
          } else {
            setCurrentUser(null);
            setIsRegistered(false);
          }
        });
        subscription = res?.data?.subscription;
      } catch (err) {
        handleSupabaseConnectionError(err);
      }

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    } else {
      // High fidelity local storage fallback for local/preview environment
      const localAuth = localStorage.getItem('fcfunz_auth_completed') === 'true';
      setIsRegistered(localAuth);
      if (localAuth) {
        setCurrentUser(db.getActiveProfile());
      } else {
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => {
    // Start bot orchestrator loop automatically on load
    try {
      botOrchestrator.start();
    } catch (e) {
      console.error('Failed to start botOrchestrator:', e);
    }

    let lastCount = 0;
    const initialUser = db.getActiveProfile();
    if (initialUser) {
      lastCount = db.notifications.filter(n => n.usuario_id === initialUser.id).length;
    }

    const handleUpdate = () => {
      const isLogged = localStorage.getItem('fcfunz_auth_completed') === 'true';
      setSupabaseActive(isUsingRealSupabase);
      setSupabaseErrStr(supabaseError);
      
      if (isLogged) {
        const active = db.getActiveProfile();
        setCurrentUser(active ? { ...active } : null);
        
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
      } else {
        setCurrentUser(null);
      }
    };
    const handleP2PChat = (e: any) => {
      if (e.detail?.id) {
        handleOpenPMWithUser(e.detail.id);
      }
    };
    window.addEventListener('p2p_open_chat', handleP2PChat);

    const unsubscribe = subscribeToGlobalUpdates(handleUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('p2p_open_chat', handleP2PChat);
    };
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
        if (isUsingRealSupabase) {
          api.signOutUser();
        }
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

    if (!regUsername.trim() || !regPassword.trim()) {
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

    const generatedEmail = `${regUsername.toLowerCase().trim()}@fcfunz.temp`;

    try {
      const p = await api.registerUser({
        username: regUsername,
        nome: regNome,
        sobrenome: regSobrenome,
        email: generatedEmail,
        pais: regPais,
        sexo: regSexo,
        password: regPassword,
      });
      
      localStorage.setItem('fcfunz_auth_completed', 'true');
      setCurrentUser(p);
      setIsRegistered(true);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao criar conta.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setAuthError('Preencha o nome de usuário e a senha.');
      return;
    }

    try {
      const profile = await api.signInUser(loginUsername, loginPassword);
      localStorage.setItem('fcfunz_auth_completed', 'true');
      setCurrentUser(profile);
      setIsRegistered(true);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao realizar login.');
    }
  };

  const handleOpenPMWithUser = (userId: string) => {
    setInitialPMRecipientId(userId);
    setActiveTab('pms');
  };

  const handleLogout = async () => {
    localStorage.removeItem('fcfunz_auth_completed');
    try {
      await api.signOutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
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
              {/* Painel de Status de Conexão com Supabase */}
              <div className="mb-6 p-3 rounded-xl border bg-slate-950/40 text-[11px] space-y-1.5 border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-400 uppercase font-mono tracking-wider text-[10px]">Banco de Dados:</span>
                    {supabaseActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Supabase Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Modo Local / Contingência
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[9px]">FCFUNZ v2.5</span>
                </div>
                
                {supabaseActive ? (
                  <p className="text-slate-400 leading-relaxed">
                    Sua aplicação está sincronizada em tempo real com o banco de dados oficial do Supabase. Todos os cadastros e dados são persistentes.
                  </p>
                ) : (
                  <p className="text-slate-400 leading-relaxed text-amber-400/90">
                    O aplicativo está utilizando o armazenamento local temporário (localStorage). Seus dados serão mantidos localmente no seu navegador, pois não há credenciais de banco de dados ativas ou ocorreu erro na conexão.
                  </p>
                )}

                {supabaseErrStr && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] leading-relaxed break-words font-sans">
                    <strong>Alerta de Conexão:</strong> {supabaseErrStr}
                  </div>
                )}
              </div>

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
                  <div className="grid grid-cols-1 gap-4">
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
            onOpenP2P={() => setIsP2POpen(true)}
          />

          <P2PModal 
            isOpen={isP2POpen}
            onClose={() => setIsP2POpen(false)}
            currentUser={currentUser}
            setActiveTab={setActiveTab}
          />

          {/* Tab Submenu Navigation Bar (MÓDULO DE INTERFACE) - DESKTOP ONLY */}
          <nav className="w-full bg-slate-950/80 border-b border-slate-900 backdrop-blur-md sticky top-16 z-40 hidden lg:block overflow-x-auto no-scrollbar">
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
              {(currentUser?.cargo === 'Founder' || currentUser?.cargo === 'Global Admin') && (
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

          {/* Mobile compact sub-nav (no scroll needed!) */}
          <nav className="w-full bg-slate-950/80 border-b border-slate-900 backdrop-blur-md sticky top-16 z-40 block lg:hidden">
            <div className="flex items-center justify-around py-2 px-2 gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition duration-150 ${
                  activeTab === 'chat' ? 'bg-indigo-600/15 text-indigo-400 font-extrabold' : 'text-slate-400 font-medium'
                }`}
              >
                <MessageSquare className="h-4.5 w-4.5 mb-1 text-indigo-400" />
                <span className="text-[10px]">Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition duration-150 ${
                  activeTab === 'social' ? 'bg-indigo-600/15 text-indigo-400 font-extrabold' : 'text-slate-400 font-medium'
                }`}
              >
                <Share2 className="h-4.5 w-4.5 mb-1 text-indigo-400" />
                <span className="text-[10px]">Feed</span>
              </button>
              <button
                onClick={() => setActiveTab('pms')}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition duration-150 ${
                  activeTab === 'pms' ? 'bg-indigo-600/15 text-indigo-400 font-extrabold' : 'text-slate-400 font-medium'
                }`}
              >
                <UserCheck className="h-4.5 w-4.5 mb-1 text-emerald-400" />
                <span className="text-[10px]">Privado</span>
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition duration-150 font-medium"
              >
                <Menu className="h-4.5 w-4.5 mb-1 text-amber-400" />
                <span className="text-[10px]">Mais ☰</span>
              </button>
            </div>
          </nav>

          {/* Mobile Sliding Sidebar Drawer (MÓDULO DE INTERFACE) */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden"
                />

                {/* Drawer Panel */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                  className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-slate-950 border-l border-slate-900 shadow-2xl p-6 z-50 flex flex-col h-full lg:hidden overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs">AM</div>
                      <span className="font-sans font-bold text-slate-100 text-sm">Navegação AMIGOS</span>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* List of ALL Tabs */}
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Principais</p>
                    <button
                      onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <MessageSquare className="h-5 w-5 text-indigo-400 shrink-0" /> Bate-Papo
                    </button>
                    <button
                      onClick={() => { setActiveTab('social'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'social' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <Share2 className="h-5 w-5 text-indigo-400 shrink-0" /> Feed Social
                    </button>
                    <button
                      onClick={() => { setActiveTab('pms'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'pms' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <UserCheck className="h-5 w-5 text-emerald-400 shrink-0" /> Mensagens Privadas
                    </button>

                    <div className="h-px bg-slate-900 my-4" />
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Recursos & Entretenimento</p>

                    <button
                      onClick={() => { setActiveTab('market'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'market' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <ShoppingCart className="h-5 w-5 text-pink-400 shrink-0" /> Loja & Presentes
                    </button>
                    <button
                      onClick={() => { setActiveTab('credits_info'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'credits_info' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <Coins className="h-5 w-5 text-amber-400 shrink-0" /> Preços mzn
                    </button>
                    <button
                      onClick={() => { setActiveTab('vaquinha'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'vaquinha' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <Sparkles className="h-5 w-5 text-pink-400 shrink-0 animate-pulse" /> Apoiar Site (Vaquinha)
                    </button>
                    <button
                      onClick={() => { setActiveTab('leaderboard'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <Trophy className="h-5 w-5 text-yellow-400 shrink-0" /> Rankings & FC Box
                    </button>
                    <button
                      onClick={() => { setActiveTab('missions'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'missions' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <Target className="h-5 w-5 text-rose-400 shrink-0" /> Missões Diárias
                    </button>
                    <button
                      onClick={() => { setActiveTab('account'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'account' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <User className="h-5 w-5 text-sky-400 shrink-0" /> Minha Conta
                    </button>
                    <button
                      onClick={() => { setActiveTab('merchants'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'merchants' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <Users className="h-5 w-5 text-teal-400 shrink-0" /> Parcerias & Merchants
                    </button>
                    <button
                      onClick={() => { setActiveTab('badges'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'badges' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900/60'}`}
                    >
                      <Award className="h-5 w-5 text-purple-400 shrink-0" /> Emblemas & Patentes
                    </button>

                    {(currentUser?.cargo === 'Founder' || currentUser?.cargo === 'Global Admin') && (
                      <button
                        onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${activeTab === 'admin' ? 'bg-rose-600 text-white' : 'text-rose-400/90 hover:bg-rose-500/10'}`}
                      >
                        <Shield className="h-5 w-5 text-rose-400 shrink-0" /> Painel Admin
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Active section view renderer with Framer Motion route transition */}
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className={`h-full ${(activeTab === 'chat' || activeTab === 'pms') ? 'overflow-hidden' : 'overflow-y-auto'}`}
              >
                {activeTab === 'chat' && <ChatSection onViewProfile={setSelectedProfileId} />}
                {activeTab === 'social' && <SocialSection onViewProfile={setSelectedProfileId} />}
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

          {/* Custom System Alert Overlay */}
          <AnimatePresence>
            {customAlert && (
              <div id="custom-alert-overlay" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-xl shadow-inner">
                      💡
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-slate-100 font-mono uppercase tracking-wide">Notificação do Sistema</h3>
                      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed whitespace-pre-wrap font-sans">
                        {customAlert}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setCustomAlert(null)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl transition text-xs shadow-md hover:shadow-indigo-500/10 active:scale-95 cursor-pointer"
                    >
                      Entendido
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Real-time Toast Notifications Overlay */}
          <AnimatePresence>
            {activeToast && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className={`fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-slate-900/95 border rounded-xl p-4 shadow-2xl backdrop-blur-md flex gap-3.5 transition-all ${
                  activeToast.title?.includes('Enviado') || activeToast.title?.includes('Ativado')
                    ? 'border-emerald-500/40 shadow-emerald-500/5'
                    : 'border-indigo-500/30 shadow-indigo-500/10'
                }`}
              >
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-lg ${
                  activeToast.title?.includes('Enviado') || activeToast.title?.includes('Ativado')
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                }`}>
                  {activeToast.title?.includes('Enviado') || activeToast.title?.includes('Ativado') ? '💸' : '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-slate-100 font-mono tracking-wide uppercase">
                      {activeToast.title}
                    </h4>
                    {activeToast.amount !== undefined && activeToast.amount > 0 && (
                      <span className="text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded shadow-sm">
                        -{activeToast.amount.toFixed(2)} MZN
                      </span>
                    )}
                  </div>
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

      <Footer isUserLoggedIn={isRegistered} />
    </div>
  );
}
