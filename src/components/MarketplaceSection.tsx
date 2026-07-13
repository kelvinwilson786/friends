/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Gift, Profile, Anuncio } from '../types';
import { motion } from 'motion/react';
import { 
  ShoppingBag, Sparkles, Send, Coins, Users, Heart, Gift as GiftIcon, 
  Paintbrush, Check, AlertTriangle, ShieldCheck, Megaphone, Smile, 
  Zap, Compass, MessageSquare, Clock, Star, HelpCircle
} from 'lucide-react';

const CUSTOM_COLORS_PERMANENT = [
  { id: 'c1', name: 'Azul Safira 🌌', hex: '#6366f1', cost: 30, desc: 'Cor do chat azul espacial de elite.' },
  { id: 'c2', name: 'Esmeralda Neon 🧪', hex: '#10b981', cost: 50, desc: 'Verde vibrante digno de guias avançados.' },
  { id: 'c3', name: 'Púrpura Imperial 🔮', hex: '#8b5cf6', cost: 75, desc: 'Roxo nobre de mercadores exclusivos.' },
  { id: 'c4', name: 'Chama Escarlate 🔥', hex: '#ef4444', cost: 100, desc: 'Vermelho intenso de mentores de honra.' },
  { id: 'c5', name: 'Dourado de Founder 👑', hex: '#f59e0b', cost: 150, desc: 'A cor mística dourada dos criadores originais.' }
];

const CUSTOM_COLORS_24H = [
  { id: 't1', name: 'Verde Limão Neon 🧪', hex: '#a3e635', cost: 30, desc: 'Tom ácido super vibrante por 24 horas.' },
  { id: 't2', name: 'Ciano Elétrico ⚡', hex: '#22d3ee', cost: 35, desc: 'Azul ciano de alta voltagem por 24 horas.' },
  { id: 't3', name: 'Rosa Shocking 🌸', hex: '#f472b6', cost: 40, desc: 'Rosa extremamente brilhante por 24 horas.' },
  { id: 't4', name: 'Laranja Vulcão 🔥', hex: '#fb923c', cost: 45, desc: 'Laranja incandescente por 24 horas.' },
  { id: 't5', name: 'Púrpura Galáctico 🔮', hex: '#c084fc', cost: 50, desc: 'Roxo estelar de nebulosa profunda por 24 horas.' }
];

const STICKER_PACKS = [
  { id: 'basic_stickers', name: 'Pacote Básico (10 Stickers)', cost: 50, description: 'Série de 10 animais fofinhos para animar suas conversas no chat.', items: ['🐶', '🐱', '🦊', '🦁', '🐯', '🐼', '🐨', '🐻', '🐷', '🐸'] },
  { id: 'premium_stickers', name: 'Pacote Premium (30 Stickers)', cost: 120, description: '30 stickers incluindo pets exóticos, criaturas aquáticas e aves raras.', items: ['🦄', '🐲', '🐙', '🐵', '🐔', '🐧', '🐦', '🐤', '🐺', '🐗', '🐴', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🐠', '🐳', '🐬', '🐪', '🐘', '🐐', '🐏', '🐎', '🐖', '🐕', '🐈', '🐇'] },
  { id: 'special_stickers', name: 'Pacote Especial (50 Stickers)', cost: 180, description: 'Série completa de 50 stickers de fantasia, espaço, criaturas míticas e efeitos cósmicos.', items: ['👾', '👽', '👻', '🤖', '🎃', '🧙', '🧚', '🧛', '🛸', '🚀', '🔥', '💥', '⚡', '✨', '🌈'] }
];

const EMOJI_PACKS = [
  { id: 'basic_emojis', name: 'Pacote de Emojis (15 Emojis)', cost: 40, description: '15 emojis personalizados de pedras preciosas, coroas e galáxias.', items: ['💎', '👑', '🌈', '🦄', '🌟', '🔮', '🔱', '🧿', '🧬', '🧪', '🌡️', '🪐', '🌌', '☄️', '🛸'] },
  { id: 'vip_emojis', name: 'Pacote VIP (30 Emojis)', cost: 80, description: 'Seleção VIP de 30 emojis exclusivos de games, troféus de ouro, moedas e festa.', items: ['💫', '⚜️', '🔱', '👑', '🥂', '🍿', '🎰', '🎯', '🎮', '👾', '🎸', '🎷', '🎹', '🎬', '🎭', '🎪', '🎟️', '🏅', '🏆', '🥇', '🥈', '🥉'] }
];

interface MarketplaceSectionProps {
  onGoToChat?: () => void;
}

export default function MarketplaceSection({ onGoToChat }: MarketplaceSectionProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<'gifts' | 'divinos' | 'stickers_emojis' | 'colors24h' | 'active_rooms' | 'anuncios'>('gifts');
  
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [recipientId, setRecipientId] = useState('');
  const [sendType, setSendType] = useState<'single' | 'shower'>('single');
  const [showerQuantity, setShowerQuantity] = useState<number>(3);
  const [purchasedColors, setPurchasedColors] = useState<string[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  
  // Gift Command Builder States
  const [giftCommandType, setGiftCommandType] = useState<'individual' | 'all' | 'shower'>('individual');
  const [commandUser, setCommandUser] = useState('');
  const [commandShowerQty, setCommandShowerQty] = useState('5');
  const [copiedCommand, setCopiedCommand] = useState(false);
  
  // Megafone form
  const [megafoneText, setMegafoneText] = useState('');

  // Anúncio Form
  const [adText, setAdText] = useState('');
  const [adDuration, setAdDuration] = useState<number>(1);
  const [adImage, setAdImage] = useState('');
  const [allAds, setAllAds] = useState<Anuncio[]>([]);
  
  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Force rerender timer for 24h expiration countdowns
  const [, setTimeTick] = useState(0);

  const loadData = () => {
    setGifts(api.getGifts());
    setUsers(db.profiles);
    setCurrentUser(db.getActiveProfile());
    
    // Load local storage preferences for colors
    const colors = localStorage.getItem(`fcfunz_colors_${db.getActiveProfile().id}`);
    if (colors) setPurchasedColors(JSON.parse(colors));
    else setPurchasedColors([]);

    const activeCol = localStorage.getItem(`fcfunz_active_color_${db.getActiveProfile().id}`);
    setActiveColor(activeCol);

    // Load active announcements
    api.getAnuncios().then(ads => {
      setAllAds(ads);
    }).catch(err => console.error(err));
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToGlobalUpdates(loadData);
    
    // Setup interval to keep expiration countdowns fresh
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGift) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (sendType === 'shower') {
        const roomId = 'r1'; // default room
        await api.sendGiftShower(roomId, selectedGift.id, showerQuantity);
        setSuccessMsg(`🌊 CHUVEIRO DE PRESENTES LANÇADO! Você espalhou ${showerQuantity}x "${selectedGift.imagem} ${selectedGift.nome}" para TODOS na sala!`);
      } else {
        if (!recipientId) {
          setErrorMsg('Por favor, selecione um destinatário.');
          return;
        }

        const roomId = 'r1'; // default room
        if (recipientId === 'all') {
          await api.sendGift('all', selectedGift.id, roomId);
          setSuccessMsg(`🎁 Presente "${selectedGift.imagem} ${selectedGift.nome}" enviado com sucesso para TODOS na sala!`);
        } else {
          await api.sendGift(recipientId, selectedGift.id, roomId);
          const recipient = db.profiles.find(p => p.id === recipientId);
          setSuccessMsg(`🎁 Presente "${selectedGift.imagem} ${selectedGift.nome}" enviado com sucesso para @${recipient?.username}!`);
        }
      }
      
      // Reset form
      setSelectedGift(null);
      setRecipientId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar presente.');
    }
  };

  const handleBuyColor = async (colorId: string, hex: string, cost: number) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (purchasedColors.includes(colorId)) {
      if (activeColor === hex) {
        setActiveColor(null);
        localStorage.removeItem(`fcfunz_active_color_${currentUser.id}`);
        setSuccessMsg('Aparência restaurada para o padrão.');
      } else {
        setActiveColor(hex);
        localStorage.setItem(`fcfunz_active_color_${currentUser.id}`, hex);
        setSuccessMsg('Nova cor de chat ativa com sucesso!');
      }
      return;
    }

    try {
      await api.buyColor(hex, cost);
      
      const updatedColors = [...purchasedColors, colorId];
      setPurchasedColors(updatedColors);
      localStorage.setItem(`fcfunz_colors_${currentUser.id}`, JSON.stringify(updatedColors));
      
      setActiveColor(hex);
      localStorage.setItem(`fcfunz_active_color_${currentUser.id}`, hex);

      setSuccessMsg('🎨 Cor comprada e ativada no seu perfil com sucesso!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comprar cor.');
    }
  };

  // --- NEW STORE MODULES ---

  const handleBuyMegafone = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.buyMegafone(200);
      setSuccessMsg('📣 Megafone comprado com sucesso! Use o formulário abaixo para disparar mensagens globais.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comprar Megafone.');
    }
  };

  const handleUseMegafone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!megafoneText.trim()) {
      setErrorMsg('Por favor, digite uma mensagem para o Megafone.');
      return;
    }

    try {
      await api.useMegafone('r1', megafoneText.trim());
      setSuccessMsg('⚡ Megafone global disparado com sucesso em todas as salas online!');
      setMegafoneText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao usar Megafone.');
    }
  };

  const handleBuyStickers = async (packId: string, cost: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.buyStickerPack(packId, cost);
      setSuccessMsg(`🎨 Pacote de Stickers "${packId}" comprado e liberado para sempre no seu chat!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comprar stickers.');
    }
  };

  const handleBuyEmojis = async (packId: string, cost: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.buyEmojiPack(packId, cost);
      setSuccessMsg(`💎 Pacote de Emojis "${packId}" comprado e desbloqueado permanentemente no chat!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comprar emojis.');
    }
  };

  const handleBuy24hColor = async (hex: string, cost: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.buyTemporaryColor(hex, cost);
      setSuccessMsg(`🎨 Cor de texto 24h ativada com sucesso! Suas novas mensagens aparecerão com este destaque.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comprar cor temporária.');
    }
  };

  const getAdCost = (dias: number) => {
    if (dias === 1) return 50;
    if (dias === 3) return 120;
    if (dias === 7) return 250;
    if (dias === 30) return 1000;
    return 50 * dias;
  };

  const handleCreateAnuncio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!adText.trim()) {
      setErrorMsg('Por favor, insira o texto do anúncio.');
      return;
    }

    if (adText.trim().length > 140) {
      setErrorMsg('O texto do anúncio não pode ultrapassar 140 caracteres para garantir o visual elegante do rodapé.');
      return;
    }

    const custo = getAdCost(adDuration);
    if (currentUser.credits < custo) {
      setErrorMsg(`Você não tem MZN suficiente para esta duração (precisa de ${custo} MZN).`);
      return;
    }

    try {
      await api.createAnuncio(adText, adDuration, custo, adImage.trim() || null);
      setSuccessMsg(`📢 Anúncio enviado com sucesso! Assim que for aprovado pela Staff, ele será exibido de forma aleatória no Feed de Publicidades e no rodapé por ${adDuration} dia(s).`);
      setAdText('');
      setAdImage('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar o anúncio.');
    }
  };

  const handleUseOracle = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const prophecy = await api.useOracle('r1');
      setSuccessMsg(`🔮 O Oráculo sussurrou a profecia: "${prophecy}"`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao consultar o Oráculo.');
    }
  };

  const handleUseStarShower = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.useStarShower('r1');
      setSuccessMsg(`🌠 A Chuva de Estrelas foi conjurada! Todos os usuários na plataforma receberam +30 XP!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conjurar a Chuva de Estrelas.');
    }
  };

  // Helper to calculate hours left for temporary text color
  const get24hColorTimeLeft = () => {
    if (!currentUser.purchased_text_color_expires_at) return null;
    const expires = new Date(currentUser.purchased_text_color_expires_at);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m restantes`;
  };

  const isColor24hActive = currentUser.purchased_text_color_expires_at && 
                           new Date(currentUser.purchased_text_color_expires_at) > new Date();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-12">
      
      {/* GORGEOUS STORE HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-6 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Shopping Virtual FCFUNZ
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-indigo-400" /> Loja de Utilidades & Divinos
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Compre itens exclusivos, boosters de XP, pacotes de stickers retro e personalize sua experiência visual para brilhar na nossa comunidade social!
            </p>
          </div>
          
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Coins className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Seu Saldo Atual</p>
              <p className="text-lg font-black text-amber-400 font-mono">{currentUser.credits} MZN</p>
            </div>
          </div>
        </div>

        {/* FEEDBACK POPUPS */}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-4 flex items-center gap-2"
          >
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 flex items-center gap-2"
          >
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </motion.div>
        )}
      </div>

      {/* LOJA NAVIGATION TABS */}
      <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-thin border-b border-slate-800 mb-6">
        <button
          onClick={() => { setActiveSubTab('gifts'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-wide transition flex items-center gap-2 shrink-0 border ${
            activeSubTab === 'gifts'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <GiftIcon className="h-4 w-4" /> Presentes & Mimos
        </button>

        <button
          id="btn-entrar-divino"
          onClick={() => { setActiveSubTab('divinos'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-wide transition flex items-center gap-2 shrink-0 border animate-pulse relative overflow-hidden ${
            activeSubTab === 'divinos'
              ? 'bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 border-amber-400 text-white shadow-xl shadow-purple-600/20 font-black scale-105'
              : 'bg-gradient-to-r from-purple-950/40 to-slate-900/80 border-purple-900/40 text-purple-300 hover:text-purple-100'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-300 animate-spin" /> Entrar no Divino ⚡
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-amber-400 animate-ping" />
        </button>

        <button
          onClick={() => { setActiveSubTab('stickers_emojis'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-wide transition flex items-center gap-2 shrink-0 border ${
            activeSubTab === 'stickers_emojis'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Smile className="h-4 w-4" /> Stickers & Emojis
        </button>

        <button
          onClick={() => { setActiveSubTab('colors24h'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-wide transition flex items-center gap-2 shrink-0 border ${
            activeSubTab === 'colors24h'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Paintbrush className="h-4 w-4" /> Cores de Texto (24h)
        </button>

        <button
          onClick={() => { setActiveSubTab('anuncios'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-wide transition flex items-center gap-2 shrink-0 border ${
            activeSubTab === 'anuncios'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Megaphone className="h-4 w-4" /> Criar Anúncio (MZN) 📢
        </button>

        <button
          onClick={() => { setActiveSubTab('active_rooms'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-wide transition flex items-center gap-2 shrink-0 border ${
            activeSubTab === 'active_rooms'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="h-4 w-4" /> Salas & Usuários Ativos 👥
        </button>
      </div>

      {/* RENDER ACTIVE VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT / CATALOGS (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TAB 1: PRESENTES (GIFTS) */}
          {activeSubTab === 'gifts' && (
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <GiftIcon className="h-4.5 w-4.5 text-indigo-400" /> Catálogo de Presentes
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">Escolha um presente, envie para amigos ou lance um Chuveiro para todos na sala!</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                  {gifts.map(gift => (
                    <div
                      key={gift.id}
                      onClick={() => setSelectedGift(gift)}
                      className={`relative p-4 rounded-xl border flex flex-col items-center text-center transition cursor-pointer select-none ${
                        selectedGift?.id === gift.id
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 hover:bg-slate-900/30'
                      }`}
                    >
                      <span className="text-3xl filter drop-shadow-md">{gift.imagem}</span>
                      <h3 className="text-xs font-semibold text-slate-200 mt-2.5">{gift.nome}</h3>
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold">
                        <span>{gift.valor} MZN</span>
                      </div>
                      {selectedGift?.id === gift.id && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gift sending instructions and command generator */}
              {selectedGift && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-950/15 border border-indigo-900/40 rounded-xl p-5 space-y-4"
                >
                  <div className="border-b border-indigo-900/30 pb-3">
                    <h3 className="text-xs font-black text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <GiftIcon className="h-4 w-4 text-indigo-400" /> Instruções de Envio: "{selectedGift.imagem} {selectedGift.nome}"
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      ⚠️ <strong className="text-pink-400">Atenção:</strong> Não é possível enviar presentes diretamente da loja. Para presentear amigos, você deve copiar o comando abaixo e executá-lo dentro de uma sala de chat ativa!
                    </p>
                  </div>

                  {/* Sub tabs to choose command type */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-850">
                    <button
                      type="button"
                      onClick={() => setGiftCommandType('individual')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                        giftCommandType === 'individual'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Mimo Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setGiftCommandType('all')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                        giftCommandType === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Mimo para Todos na Sala
                    </button>
                    <button
                      type="button"
                      onClick={() => setGiftCommandType('shower')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                        giftCommandType === 'shower'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Chuveiro (Shower) 🌊
                    </button>
                  </div>

                  {/* Dynamic inputs based on command type */}
                  <div className="space-y-3">
                    {giftCommandType === 'individual' && (
                      <div>
                        <label className="block text-[10px] font-mono text-indigo-400 uppercase tracking-wider mb-1">Destinatário (Nickname ou @username)</label>
                        <input
                          type="text"
                          placeholder="Digite o nickname da pessoa (ex: kelvin)"
                          value={commandUser}
                          onChange={(e) => setCommandUser(e.target.value)}
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {giftCommandType === 'shower' && (
                      <div>
                        <label className="block text-[10px] font-mono text-indigo-400 uppercase tracking-wider mb-1">Quantidade de Mimos por Pessoa</label>
                        <select
                          value={commandShowerQty}
                          onChange={(e) => setCommandShowerQty(e.target.value)}
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="1">1x presente para cada participante</option>
                          <option value="3">3x presentes para cada participante (Super Shower)</option>
                          <option value="5">5x presentes para cada participante (Mega Shower)</option>
                          <option value="10">10x presentes para cada participante (Tempestade ⚡)</option>
                          <option value="25">25x presentes para cada participante (Tsunami de Mimos 🌊)</option>
                        </select>
                      </div>
                    )}

                    {/* Render generated command ready for copying */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-indigo-400 uppercase tracking-wider">Comando de Chat (Clique para copiar):</label>
                      <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800 flex items-center justify-between gap-4 font-mono text-xs">
                        <span className="text-amber-400 font-bold truncate select-all">
                          {giftCommandType === 'individual' 
                            ? `*gift @${commandUser.replace('@', '').trim() || 'username'} ${selectedGift.nome}`
                            : giftCommandType === 'all'
                            ? `*gift all ${selectedGift.nome}`
                            : `*shower ${commandShowerQty} ${selectedGift.nome}`
                          }
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const cmdText = giftCommandType === 'individual' 
                              ? `*gift @${commandUser.replace('@', '').trim() || 'username'} ${selectedGift.nome}`
                              : giftCommandType === 'all'
                              ? `*gift all ${selectedGift.nome}`
                              : `*shower ${commandShowerQty} ${selectedGift.nome}`;
                            navigator.clipboard.writeText(cmdText);
                            setCopiedCommand(true);
                            setTimeout(() => setCopiedCommand(false), 2000);
                          }}
                          className="flex items-center gap-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 px-3 py-1.5 rounded-md border border-indigo-500/20 text-[10px] font-bold transition font-sans shrink-0"
                        >
                          {copiedCommand ? <Check className="h-3 w-3 text-emerald-400" /> : <Send className="h-3 w-3" />}
                          {copiedCommand ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Redirection button */}
                  {onGoToChat && (
                    <button
                      type="button"
                      onClick={onGoToChat}
                      className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
                    >
                      <MessageSquare className="h-4 w-4" /> Ir para as Salas de Chat e Enviar!
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 2: ENTRAR NO DIVINO ✨ */}
          {activeSubTab === 'divinos' && (
            <div className="space-y-6">
              
              {/* SACRED SHRINE INTRO */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/80 via-purple-950/50 to-slate-950 border-2 border-amber-500/30 rounded-xl p-6 backdrop-blur-md">
                <div className="absolute top-0 right-0 p-4 animate-spin-slow">
                  <Sparkles className="h-10 w-10 text-amber-400/40" />
                </div>
                
                <h2 className="text-base font-black text-amber-300 flex items-center gap-2 uppercase tracking-wider font-sans">
                  <Sparkles className="h-5 w-5 text-amber-400" /> Santuário de Consumíveis Divinos
                </h2>
                <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                  Bem-vindo à dimensão Divina do FCFUNZ. Aqui repousam os itens mais cobiçados e poderosos de toda a rede social. Estes consumíveis afetam as salas de forma mágica e permanente em termos de prestígio!
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg self-start inline-flex">
                  ✦ COM O TEMPO VAMOS ADICIONAR VÁRIOS OUTROS CONSUMÍVEIS DIVINOS! ✦
                </div>
              </div>

              {/* DIVINE GRID OF ITEMS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* ITEM 1: MEGAFONE */}
                <div className="bg-slate-950/80 border border-purple-900/30 hover:border-amber-500/30 rounded-xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 text-[9px] font-mono font-bold px-2 py-1 rounded-bl-lg border-l border-b border-purple-900/20 uppercase tracking-wider">
                    Uso Único
                  </div>
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center border border-amber-400/30 shadow-lg group-hover:scale-110 transition">
                      <Megaphone className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 mt-4 flex items-center gap-1">
                      Megafone Divino 📣
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Envia uma transmissão global imediata em destaque com um efeito visual neon para <strong>TODOS os usuários de todas as salas online</strong> da plataforma!
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">200 MZN</span>
                    <button
                      onClick={handleBuyMegafone}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition"
                    >
                      Adquirir
                    </button>
                  </div>
                </div>

                {/* ITEM 2: ORÁCULO CÓSMICO */}
                <div className="bg-slate-950/80 border border-purple-900/30 hover:border-amber-500/30 rounded-xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 text-[9px] font-mono font-bold px-2 py-1 rounded-bl-lg border-l border-b border-purple-900/20 uppercase tracking-wider">
                    Instantâneo
                  </div>
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center border border-purple-400/30 shadow-lg group-hover:scale-110 transition">
                      <Zap className="h-6 w-6 text-white animate-pulse" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 mt-4 flex items-center gap-1">
                      Oráculo Cósmico 🔮
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Consulte a sabedoria das estrelas. Dispara uma gloriosa profecia/revelação mística em destaque no chat, prevendo fortunas para todos os ouvintes!
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">150 MZN</span>
                    <button
                      onClick={handleUseOracle}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition"
                    >
                      Consultar
                    </button>
                  </div>
                </div>

                {/* ITEM 3: CHUVA DE ESTRELAS */}
                <div className="bg-slate-950/80 border border-purple-900/30 hover:border-amber-500/30 rounded-xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 text-[9px] font-mono font-bold px-2 py-1 rounded-bl-lg border-l border-b border-purple-900/20 uppercase tracking-wider">
                    Instantâneo
                  </div>
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center border border-teal-400/30 shadow-lg group-hover:scale-110 transition">
                      <Star className="h-6 w-6 text-white animate-bounce" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 mt-4 flex items-center gap-1">
                      Chuva de Estrelas 🌠
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Invoca um evento estelar sublime no fã-clube. Concede imediatamente <strong>+30 pontos de XP purificados</strong> para absolutamente TODOS os usuários!
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">350 MZN</span>
                    <button
                      onClick={handleUseStarShower}
                      className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition"
                    >
                      Conjurar
                    </button>
                  </div>
                </div>

              </div>

              {/* INVENTÁRIO DIVINO & MEGAFONE SENDER */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Megaphone className="h-4 w-4 text-amber-400" /> Inventário de Consumíveis Divinos
                  </h3>
                  <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-amber-400 font-mono font-bold">
                    Disponíveis: {currentUser.inventory_megafones || 0} Megafones
                  </span>
                </div>

                <div className="mt-4">
                  {currentUser.inventory_megafones && currentUser.inventory_megafones > 0 ? (
                    <form onSubmit={handleUseMegafone} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                          Escreva a Mensagem Global (Transmitida para todo o site):
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={megafoneText}
                          onChange={(e) => setMegafoneText(e.target.value)}
                          placeholder="Digite aqui algo grandioso para divulgar globalmente..."
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-600"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-500 italic">
                          *Aviso: Mensagens inapropriadas serão punidas pela moderação.
                        </p>
                        <button
                          type="submit"
                          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs px-5 py-2 rounded-lg transition shadow-md shadow-amber-500/10 flex items-center gap-1.5"
                        >
                          <Megaphone className="h-4 w-4 text-white" /> Disparar Megafone Global!
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                      <HelpCircle className="h-8 w-8 text-slate-600" />
                      <span>Seu inventário de Megafones está vazio.</span>
                      <button
                        onClick={handleBuyMegafone}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline mt-1"
                      >
                        Comprar meu primeiro Megafone por 200 MZN
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: STICKERS & EMOJIS 🎨 */}
          {activeSubTab === 'stickers_emojis' && (
            <div className="space-y-6">
              
              {/* STICKERS SECTION */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 pb-3 border-b border-slate-800">
                  <Smile className="h-4.5 w-4.5 text-indigo-400" /> Pacotes de Stickers Exclusivos
                </h2>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Pacotes de ilustrações expressivas de grandes dimensões para usar e destacar suas conversas em qualquer sala de chat ou mensagem privada (DMs).
                </p>

                <div className="space-y-4">
                  {STICKER_PACKS.map(pack => {
                    const isPurchased = currentUser.purchased_stickers?.includes(pack.id);
                    
                    return (
                      <div 
                        key={pack.id} 
                        className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-200">{pack.name}</h3>
                            <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">Permanente</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">{pack.description}</p>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {pack.items.map((emoji, idx) => (
                              <span key={idx} className="h-7 w-7 rounded bg-slate-900 border border-slate-850 flex items-center justify-center text-sm filter hover:scale-125 transition cursor-default" title="Sticker">
                                {emoji}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          disabled={isPurchased}
                          onClick={() => handleBuyStickers(pack.id, pack.cost)}
                          className={`shrink-0 text-xs font-bold px-4 py-2 rounded-lg border transition flex items-center justify-center gap-1.5 ${
                            isPurchased
                              ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 cursor-default'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-400 hover:border-amber-500/30'
                          }`}
                        >
                          {isPurchased ? (
                            <>
                              <Check className="h-4 w-4" /> Desbloqueado
                            </>
                          ) : (
                            <>
                              <Coins className="h-4 w-4 text-amber-400" /> {pack.cost} MZN
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EMOJIS SECTION */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 pb-3 border-b border-slate-800">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-400" /> Emojis Personalizados & VIPs
                </h2>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Desbloqueie conjuntos de mini-emojis temáticos para usar diretamente no corpo de suas mensagens comuns nas discussões sociais!
                </p>

                <div className="space-y-4">
                  {EMOJI_PACKS.map(pack => {
                    const isPurchased = currentUser.purchased_emojis?.includes(pack.id);
                    
                    return (
                      <div 
                        key={pack.id} 
                        className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-200">{pack.name}</h3>
                            <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">Permanente</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">{pack.description}</p>
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {pack.items.map((emoji, idx) => (
                              <span key={idx} className="h-6 w-6 rounded bg-slate-900 border border-slate-850 flex items-center justify-center text-xs filter hover:scale-125 transition cursor-default">
                                {emoji}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          disabled={isPurchased}
                          onClick={() => handleBuyEmojis(pack.id, pack.cost)}
                          className={`shrink-0 text-xs font-bold px-4 py-2 rounded-lg border transition flex items-center justify-center gap-1.5 ${
                            isPurchased
                              ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 cursor-default'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-400 hover:border-amber-500/30'
                          }`}
                        >
                          {isPurchased ? (
                            <>
                              <Check className="h-4 w-4" /> Desbloqueado
                            </>
                          ) : (
                            <>
                              <Coins className="h-4 w-4 text-amber-400" /> {pack.cost} MZN
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: CORES DE TEXTO 24H 🖌️ */}
          {activeSubTab === 'colors24h' && (
            <div className="space-y-6">
              
              {/* INTRO */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Paintbrush className="h-4.5 w-4.5 text-indigo-400" /> Aluguel de Cores de Mensagem (24 horas)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Destaque o conteúdo das suas mensagens do chat de forma marcante. Compre o aluguel temporário por 24 horas!
                    </p>
                  </div>
                  {isColor24hActive && (
                    <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-indigo-400 font-mono font-bold flex items-center gap-1 shrink-0">
                      <Clock className="h-3.5 w-3.5" /> Ativo: {get24hColorTimeLeft()}
                    </span>
                  )}
                </div>

                {/* CURRENT ACTIVE STATE */}
                {isColor24hActive ? (
                  <div className="mt-4 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center gap-3">
                    <span 
                      className="h-6 w-6 rounded-full border border-white shrink-0 animate-pulse" 
                      style={{ backgroundColor: currentUser.purchased_text_color }} 
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-100">Sua cor temporária está ativa!</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Vá até o chat e selecione a opção <strong className="text-indigo-400">"Cor Adquirida 🛍️"</strong> no painel de cores sob o campo de texto para usá-la!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-lg bg-slate-950/40 border border-slate-850 text-slate-500 text-[11px] italic">
                    Nenhuma cor de mensagem de 24 horas está ativa no momento. Compre uma das opções vibrantes abaixo para desbloquear!
                  </div>
                )}

                {/* AVAILABLE TEMPORARY COLORS */}
                <div className="space-y-3.5 mt-5">
                  {CUSTOM_COLORS_24H.map(color => {
                    const isCurrentActiveHex = currentUser.purchased_text_color === color.hex && isColor24hActive;

                    return (
                      <div 
                        key={color.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 transition"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 rounded-full shrink-0 border border-slate-800 shadow-sm" style={{ backgroundColor: color.hex }} />
                            <h4 className="text-xs font-semibold text-slate-200 truncate">{color.name}</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{color.desc}</p>
                        </div>

                        <button
                          onClick={() => handleBuy24hColor(color.hex, color.cost)}
                          className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
                            isCurrentActiveHex
                              ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 cursor-default'
                              : 'bg-slate-900 border-slate-850 text-amber-400 hover:border-amber-500/40'
                          }`}
                        >
                          {isCurrentActiveHex ? (
                            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Ativa</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3" /> {color.cost} MZN (24h)
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {activeSubTab === 'active_rooms' && (
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Users className="h-4.5 w-4.5 text-indigo-400" /> Presença Global de Usuários
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">
                      Abaixo você pode ver em quais salas de chat cada usuário está ativo no momento. Clique para voltar ou se juntar à mesma sala!
                    </p>
                  </div>
                </div>

                {/* Users List */}
                <div className="mt-5 space-y-3">
                  {(() => {
                    const activeParticipants = db.room_participants.map(p => {
                      const user = db.profiles.find(prof => prof.id === p.user_id);
                      const room = db.salas.find(s => s.id === p.sala_id);
                      return { participant: p, user, room };
                    }).filter(item => item.user && item.room);

                    if (activeParticipants.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-500 text-xs font-sans border border-dashed border-slate-800/80 rounded-xl bg-slate-950/20">
                          <p className="text-lg">👥</p>
                          <p className="mt-2 font-medium">Nenhum usuário ativo em salas no momento.</p>
                          <p className="text-[10px] text-slate-600 mt-1">Seja o primeiro a iniciar uma conversa no Chat!</p>
                        </div>
                      );
                    }

                    return activeParticipants.map(({ user, room }) => {
                      if (!user || !room) return null;
                      return (
                        <div
                          key={`${user.id}-${room.id}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-slate-750 transition animate-fadeIn"
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <img
                              src={user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                              alt={user.username}
                              className="h-10 w-10 rounded-full border border-slate-800 shrink-0 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-200">@{user.username}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                  Nível {user.nivel}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Ativo na sala: <strong className="text-indigo-400">💬 {room.nome}</strong>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              localStorage.setItem('fcfunz_active_room_id', room.id);
                              if (onGoToChat) {
                                onGoToChat();
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-1 shadow-md shadow-indigo-600/10 cursor-pointer font-sans"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Entrar na Sala
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'anuncios' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* INTRO & CREATE FORM */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <div className="pb-3 border-b border-slate-800">
                  <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Megaphone className="h-4.5 w-4.5 text-indigo-400" /> Criar Anúncio no Rodapé (MZN) 📢
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed font-sans">
                    Promova sua marca, canal, clã ou envie mimos para toda a comunidade. Seu texto passará em destaque no rodapé do FCFUNZ para todos os usuários logados!
                  </p>
                </div>

                <form onSubmit={handleCreateAnuncio} className="mt-5 space-y-4">
                  {/* TEXT AREA */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      Mensagem do Anúncio (Máx. 140 caracteres)
                    </label>
                    <div className="relative">
                      <textarea
                        required
                        value={adText}
                        onChange={(e) => setAdText(e.target.value.slice(0, 140))}
                        placeholder="Ex: Entre no clã OS DESTRUIDORES na sala 3! / Vendo presentes raros, fale comigo no PV!"
                        rows={3}
                        className="w-full rounded-xl bg-slate-950 border border-slate-850 p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                      />
                      <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-600">
                        {adText.length}/140
                      </span>
                    </div>
                  </div>

                  {/* DURATION SELECTION */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                      Duração & Custo
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { dias: 1, label: '1 Dia', custo: 50, desc: 'Ideal para um teste rápido' },
                        { dias: 3, label: '3 Dias', custo: 120, desc: 'Economize 30 MZN' },
                        { dias: 7, label: '1 Semana', custo: 250, desc: 'Destaque contínuo' },
                        { dias: 30, label: '1 Mês (Premium)', custo: 1000, desc: 'Melhor alcance de público' }
                      ].map(opt => (
                        <button
                          type="button"
                          key={opt.dias}
                          onClick={() => setAdDuration(opt.dias)}
                          className={`p-3.5 rounded-xl border text-left transition duration-150 flex flex-col justify-between cursor-pointer ${
                            adDuration === opt.dias
                              ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 shadow-md shadow-indigo-500/5'
                              : 'bg-slate-950/60 border-slate-850 hover:bg-slate-950 hover:border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black block font-sans">{opt.label}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 leading-normal block font-sans">
                              {opt.desc}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-black text-amber-400 mt-3 flex items-center gap-1 shrink-0">
                            <Coins className="h-3 w-3" /> {opt.custo} MZN
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* IMAGE URL INPUT */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      Imagem da Publicidade (URL Opcional) 🖼️
                    </label>
                    <input
                      type="url"
                      value={adImage}
                      onChange={(e) => setAdImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full rounded-xl bg-slate-950 border border-slate-850 p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Deixe em branco para uma publicidade apenas de texto. Use um link público de imagem.
                    </span>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-6 py-2.5 rounded-xl transition duration-150 flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer font-sans"
                    >
                      <Megaphone className="h-4 w-4" /> Publicar Anúncio por {getAdCost(adDuration)} MZN
                    </button>
                  </div>
                </form>
              </div>

              {/* ACTIVE ADS LIST */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-800 flex items-center gap-1.5">
                  🌟 Anúncios Ativos na Plataforma ({allAds.length})
                </h3>

                <div className="mt-4 space-y-3">
                  {allAds.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-950/20 border border-dashed border-slate-850 rounded-xl font-sans">
                      Nenhum anúncio ativo cadastrado no momento. Seja o primeiro a criar um!
                    </div>
                  ) : (
                    allAds.map(ad => (
                      <div
                        key={ad.id}
                        className="p-4 rounded-xl border border-slate-850 bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1 pr-2">
                          <p className="text-xs text-slate-200 font-semibold leading-relaxed break-words font-sans">
                            "{ad.texto}"
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono">
                            <span>
                              Autor: <strong className="text-slate-400">@{ad.autor_username}</strong>
                            </span>
                            <span>•</span>
                            <span>Expira em: {new Date(ad.expira_em).toLocaleDateString('pt-MZ')}</span>
                            <span>•</span>
                            <span className="text-indigo-400 font-bold bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                              {ad.dias} {ad.dias === 1 ? 'dia' : 'dias'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">
                              Visualizações
                            </span>
                            <span className="text-sm font-mono font-black text-emerald-400 block">
                              👁️ {ad.visualizacoes}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: PERMANENT PREMIUM COLORS & RULES (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Permanent Nick/Name Colors */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 pb-3 border-b border-slate-800">
              <Paintbrush className="h-4.5 w-4.5 text-indigo-400" /> Cores de Chat Premium (Permanente)
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Destaque o seu nickname na lista de membros de forma permanente ativando um dos pigmentos sagrados do FCFUNZ.
            </p>

            <div className="space-y-3.5 mt-5">
              {CUSTOM_COLORS_PERMANENT.map(color => {
                const isPurchased = purchasedColors.includes(color.id);
                const isActive = activeColor === color.hex;

                return (
                  <div 
                    key={color.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 transition"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color.hex }} />
                        <h4 className="text-xs font-semibold text-slate-200 truncate">{color.name}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{color.desc}</p>
                    </div>

                    <button
                      onClick={() => handleBuyColor(color.id, color.hex, color.cost)}
                      className={`shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition ${
                        isActive
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                          : isPurchased
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-900 border-slate-800 text-amber-400 hover:border-amber-500/40'
                      }`}
                    >
                      {isActive ? (
                        <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Ativa</span>
                      ) : isPurchased ? (
                        'Ativar'
                      ) : (
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3" /> {color.cost} MZN
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules & Guidelines */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
              <Sparkles className="h-4 w-4 text-indigo-400" /> Regulamento & Prestígio
            </h3>
            <ul className="text-[11px] text-slate-400 space-y-2.5 mt-3 leading-normal">
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                <span>Os mimos presenteados geram popularidade imediata de igual valor para o destinatário!</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                <span>Pacotes de Emojis e Stickers comprados são mantidos vinculados ao seu ID para sempre de forma vitalícia.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                <span>O aluguel de Cores de Texto de 24 horas expira precisamente 24h após o horário exato da compra.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                <span>Consumíveis Divinos como Megafones são estocados no seu inventário e podem ser disparados quando você quiser.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
