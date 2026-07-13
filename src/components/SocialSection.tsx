/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Re-designed SocialSection conforming to the "AMIGOS" motto:
 * - All users are friends by default.
 * - Manage and organize your "Amigos Próximos" (Close Friends) list.
 * - Feed is exclusively for paid advertisements (Publicidade).
 * - Create advertisements with 4 packages (1 Day, 3 Days, 1 Week, 1 Month).
 * - Rotates exactly 5 active publicidades every 2 minutes smoothly.
 */

import React, { useState, useEffect, useRef } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Tweet, TweetComment, UserCargo, Profile } from '../types';
import { UserBadgesInline, getCargoNicknameStyle } from './BadgesSection';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, ThumbsUp, ThumbsDown, MessageSquare, Send, Image, 
  Sparkles, Globe, Shield, Clock, AlertCircle, Users, Check, X,
  Search, Star, StarOff, HelpCircle, Coins, Megaphone
} from 'lucide-react';

export default function SocialSection({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [activeCommentsTweetId, setActiveCommentsTweetId] = useState<string | null>(null);
  const [comments, setComments] = useState<TweetComment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Ad Creator Campaign state
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [adDays, setAdDays] = useState<number>(3); // default 3 days
  const [submittingAd, setSubmittingAd] = useState(false);

  // Close Friends List states
  const [closeFriends, setCloseFriends] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pagination / Rotation Settings
  const [activeAdsOffset, setActiveAdsOffset] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser = db.getActiveProfile();

  const getAdCost = (dias: number) => {
    if (dias === 1) return 50;
    if (dias === 3) return 120;
    if (dias === 7) return 250;
    if (dias === 30) return 2500;
    return 50 * dias;
  };

  // Fetch feeds and friends
  const loadSocialData = async () => {
    try {
      const allFeed = await api.getTweets();
      // Filter only active approved ads/tweets (or ones with no status for seeds backwards-compatibility)
      const approvedFeed = allFeed.filter(t => t.status === 'active' || !t.status);
      setTweets(approvedFeed);

      const cf = await api.getCloseFriends();
      setCloseFriends(cf);

      const users = await api.getAllUsers();
      setAllUsers(users.filter(u => u.id !== currentUser.id));
    } catch (err) {
      console.error('Error loading social data:', err);
    }
  };

  useEffect(() => {
    loadSocialData();
    const unsubscribe = subscribeToGlobalUpdates(loadSocialData);
    return () => unsubscribe();
  }, []);

  // 2 Minutes Rotation Timer Engine
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up! Move to the next set of 5 ads
          handleRotateAds();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tweets.length]);

  const handleRotateAds = () => {
    setActiveAdsOffset((prevOffset) => {
      const nextOffset = prevOffset + 5;
      return nextOffset >= tweets.length ? 0 : nextOffset;
    });
    setTimeLeft(120);
  };

  // Get active 5 ads to display
  const displayedTweets = tweets.slice(activeAdsOffset, activeAdsOffset + 5);

  const handleCreateAdCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const cost = getAdCost(adDays);
    if (currentUser.credits < cost) {
      alert(`Saldo insuficiente! Esta campanha custa ${cost} MZN e você possui apenas ${currentUser.credits} MZN.`);
      return;
    }

    setSubmittingAd(true);
    try {
      await api.createAnuncio(newContent, adDays, cost, newImage.trim() || null);
      
      setNewContent('');
      setNewImage('');
      setShowImageInput(false);
      alert(`Sua Publicidade foi enviada para moderação!\n\nDebitado: ${cost} MZN\nStatus: Pendente para aprovação pelo Admin Kelvin.`);
      
      loadSocialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar anúncio.');
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleToggleCloseFriend = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.toggleCloseFriend(userId);
      await loadSocialData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar amigos próximos.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReact = async (tweetId: string, type: 'like' | 'dislike') => {
    try {
      await api.reactToTweet(tweetId, type);
      loadSocialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleComments = async (tweetId: string) => {
    if (activeCommentsTweetId === tweetId) {
      setActiveCommentsTweetId(null);
      setComments([]);
    } else {
      setActiveCommentsTweetId(tweetId);
      const list = await api.getTweetComments(tweetId);
      setComments(list);
    }
  };

  const handleAddComment = async (e: React.FormEvent, tweetId: string) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.addTweetComment(tweetId, newComment);
      setNewComment('');
      const list = await api.getTweetComments(tweetId);
      setComments(list);
      loadSocialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCargoColorClasses = (cargo: string) => {
    return getCargoNicknameStyle(cargo).text;
  };

  const getCargoLabelStyle = (cargo: UserCargo) => {
    switch (cargo) {
      case 'Founder':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'Global Admin':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/20';
      case 'Mentor':
        return 'bg-red-500/15 text-red-400 border border-red-500/20';
      case 'Merchant':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/20';
      case 'Guide':
        return 'bg-teal-500/15 text-teal-400 border border-teal-500/20';
      case 'Verified User':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  // Format countdown mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filter users based on query
  const filteredUsers = searchQuery.trim() === ''
    ? []
    : allUsers.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u.nome && u.nome.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-12 space-y-4 font-sans">
      
      {/* HEADER BANNER - AMIGOS MOTTO */}
      <div className="bg-gradient-to-r from-slate-900/80 via-indigo-950/20 to-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Lema Oficial
            </span>
            <span className="text-xs bg-pink-500/15 border border-pink-500/30 text-pink-400 font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              AMIGOS 🤝
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Neste aplicativo, todos os usuários já são seus amigos!
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Não há necessidade de enviar ou aprovar pedidos de amizade. Organize seus usuários mais próximos marcando-os como <strong className="text-indigo-400">Amigos Próximos</strong> para encontrá-los rapidamente!
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center gap-3 shrink-0">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-500 uppercase">Seu Saldo</p>
            <p className="text-base font-black text-amber-400">{currentUser.credits} MZN</p>
          </div>
        </div>
      </div>

      {/* MAIN SOCIAL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Paid Ad Publisher & Alternating Rotational Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* AD CAMPAIGN PUBLISHER (Only Paid Posts allowed) */}
          <div className="bg-slate-900/40 border border-indigo-500/20 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-indigo-500/10 border-b border-l border-indigo-500/20 rounded-bl-xl text-[9px] font-mono uppercase text-indigo-400 font-extrabold flex items-center gap-1">
              <Megaphone className="h-3 w-3 animate-pulse" /> Campanha Paga
            </div>

            <div className="flex gap-4">
              <img 
                src={currentUser.avatar_url || ''} 
                alt={currentUser.username} 
                className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover shrink-0" 
              />
              <form onSubmit={handleCreateAdCampaign} className="flex-1 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Criar Publicidade no Feed</span>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Escreva sua publicidade aqui (máximo 280 caracteres)... O que quer anunciar hoje no feed oficial?"
                    maxLength={280}
                    rows={3}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans leading-relaxed"
                  />
                  <div className="flex justify-end text-[9px] font-mono text-slate-500">
                    {newContent.length} / 280
                  </div>
                </div>

                <AnimatePresence>
                  {showImageInput && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-2"
                    >
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">URL da Foto / Imagem</span>
                      <input
                        type="url"
                        value={newImage}
                        onChange={(e) => setNewImage(e.target.value)}
                        placeholder="Insira o link direto de uma foto linda (ex: Unsplash, Imgur)..."
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      {newImage.trim() && (
                        <div className="border border-slate-800 rounded-lg overflow-hidden max-h-40 mt-1">
                          <img src={newImage} alt="Preview" className="w-full object-cover max-h-40" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ADVERTISING PACKAGES */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Selecione o Pacote de Duração</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { days: 1, label: '1 Dia', price: 50 },
                      { days: 3, label: '3 Dias', price: 120 },
                      { days: 7, label: '7 Dias (1 Sem)', price: 250 },
                      { days: 30, label: '30 Dias (1 Mês)', price: 2500, premium: true }
                    ].map((pkg) => (
                      <button
                        key={pkg.days}
                        type="button"
                        onClick={() => setAdDays(pkg.days)}
                        className={`p-3 rounded-xl border text-center flex flex-col justify-center gap-1 transition ${
                          adDays === pkg.days
                            ? pkg.premium 
                              ? 'bg-pink-950/20 border-pink-500/80 text-pink-400 shadow-md shadow-pink-950/30'
                              : 'bg-indigo-950/20 border-indigo-500/80 text-indigo-400 shadow-md shadow-indigo-950/30'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-[11px] font-extrabold uppercase font-sans">{pkg.label}</span>
                        <span className="text-xs font-black text-amber-400 font-mono">{pkg.price} MZN</span>
                        {pkg.premium && (
                          <span className="text-[8px] font-mono text-pink-500 uppercase tracking-wider font-extrabold mt-0.5 animate-pulse">
                            🔥 Premium
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PUBLISH ACTIONS BAR */}
                <div className="flex items-center justify-between pt-3.5 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setShowImageInput(!showImageInput)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border transition ${
                      showImageInput 
                        ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' 
                        : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Image className="h-4 w-4" />
                    <span>{showImageInput ? 'Ocultar Foto' : 'Adicionar Foto'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!newContent.trim() || submittingAd}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {submittingAd ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 animate-spin" /> Processando...
                      </span>
                    ) : (
                      <>
                        <Coins className="h-4 w-4 text-amber-300" />
                        <span>Contratar Campanha ({getAdCost(adDays)} MZN)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ACTIVE ADVERTISEMENTS ROTATING FEED */}
          <div className="space-y-4">
            
            {/* ROTATOR METADATA HEADER */}
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                <div>
                  <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                    📢 Feed Oficial de Publicidade
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Exibindo 5 anúncios em rotatividade suave • {tweets.length} ativos no total
                  </p>
                </div>
              </div>

              {/* ROTATOR PROGRESS & MANUAL CYCLER */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <div className="text-right">
                  <p className="text-[9px] font-mono font-bold text-indigo-400 uppercase">Rotação em</p>
                  <p className="text-xs font-black font-mono text-slate-300">{formatTime(timeLeft)}</p>
                </div>
                {/* Visual Progress Line */}
                <div className="w-14 bg-slate-800 rounded-full h-1 overflow-hidden relative">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 120) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRotateAds}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono uppercase font-bold transition flex items-center gap-1"
                >
                  Próximos 5 ➡️
                </button>
              </div>
            </div>

            {/* AD LIST */}
            <div className="space-y-4">
              {displayedTweets.length === 0 ? (
                <div className="bg-slate-900/10 border border-slate-850 rounded-2xl p-12 text-center space-y-3 backdrop-blur-sm">
                  <Megaphone className="h-8 w-8 text-slate-600 mx-auto animate-bounce" />
                  <p className="text-xs text-slate-400">Nenhum anúncio ativo no feed no momento.</p>
                  <p className="text-[10px] text-slate-500">Seja o primeiro a criar uma publicidade usando o formulário acima!</p>
                </div>
              ) : (
                displayedTweets.map(post => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm space-y-4 hover:border-slate-700/80 transition"
                  >
                    {/* Header profile */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(post.user_id)}>
                        <img src={post.author_avatar || ''} alt={post.author_username} className="w-10 h-10 rounded-full border border-slate-800 object-cover" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-xs font-extrabold flex items-center gap-1 ${getCargoColorClasses(post.author_cargo || 'Unverified User')}`}>
                              {post.author_username}
                              <UserBadgesInline cargo={post.author_cargo || 'Unverified User'} className="ml-0.5" />
                            </h4>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight ${getCargoLabelStyle(post.author_cargo || 'Unverified User')}`}>
                              {post.author_cargo}
                            </span>
                            {/* AD SPONSOR LABEL */}
                            <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider animate-pulse">
                              Anunciante 🌟
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>Anúncio feito em {new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Globe className="h-4 w-4 text-indigo-400/50" />
                    </div>

                    {/* Publication text content */}
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* Publication optional image */}
                    {post.image_url && (
                      <div className="rounded-xl overflow-hidden border border-slate-800 max-h-96">
                        <img src={post.image_url} alt="Sponsor Campaign" referrerPolicy="no-referrer" className="w-full object-cover max-h-96" />
                      </div>
                    )}

                    {/* Reactions Bar */}
                    <div className="flex items-center gap-5 pt-2 border-t border-slate-800/40 text-[11px] text-slate-400">
                      <button
                        onClick={() => handleReact(post.id, 'like')}
                        className="flex items-center gap-1.5 hover:text-indigo-400 transition"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{post.likes_count} Curtidas</span>
                      </button>

                      <button
                        onClick={() => handleReact(post.id, 'dislike')}
                        className="flex items-center gap-1.5 hover:text-red-400 transition"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>{post.dislikes_count} Deslikes</span>
                      </button>

                      <button
                        onClick={() => handleToggleComments(post.id)}
                        className={`flex items-center gap-1.5 transition ${activeCommentsTweetId === post.id ? 'text-indigo-400 font-bold' : 'hover:text-indigo-400'}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.comments_count} Comentários</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    <AnimatePresence>
                      {activeCommentsTweetId === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden border-t border-slate-800/40 pt-4 space-y-3"
                        >
                          {/* Add Comment input */}
                          <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-2">
                            <input
                              type="text"
                              required
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Participe deixando seu comentário..."
                              className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="submit"
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium p-2 rounded-lg transition text-xs flex items-center justify-center"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </form>

                          {/* Comments list */}
                          <div className="space-y-2 max-h-60 overflow-y-auto mt-2">
                            {comments.length === 0 ? (
                              <p className="text-[10px] text-slate-500 font-mono italic px-2">Ninguém comentou ainda. Seja o primeiro!</p>
                            ) : (
                              comments.map(c => (
                                <div key={c.id} className="flex items-start gap-2.5 bg-slate-950/30 border border-slate-800/60 rounded-xl p-2.5">
                                  <img src={c.author_avatar || ''} alt={c.author_username} className="w-6 h-6 rounded-full border border-slate-850 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[10px] font-bold flex items-center gap-1 ${getCargoColorClasses(c.author_cargo || 'Unverified User')}`}>
                                        {c.author_username}
                                        <UserBadgesInline cargo={c.author_cargo || 'Unverified User'} className="ml-0.5" />
                                      </span>
                                      <span className="text-[8px] text-slate-500">
                                        {new Date(c.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-1 leading-normal whitespace-pre-wrap">{c.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Close Friends Management & User Database Index (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SEARCH & DISCOVER USERS */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800 uppercase tracking-wider font-mono">
              <Search className="h-4 w-4 text-indigo-400" /> Buscar Amigos no App
            </h3>
            
            <p className="text-[10px] text-slate-500 mt-1.5">
              Todos os usuários já são seus amigos! Busque pelo username abaixo para marcá-los como <strong>Amigo Próximo</strong>.
            </p>

            <div className="mt-3 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquise por @username..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* SEARCH RESULTS */}
            {filteredUsers.length > 0 && (
              <div className="mt-3 bg-slate-950 border border-slate-850 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-900 pr-1">
                {filteredUsers.map(user => {
                  const isCloseFriend = closeFriends.some(cf => cf.id === user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-2.5 hover:bg-slate-900/20">
                      <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => onViewProfile(user.id)}>
                        <img src={user.avatar_url || ''} alt={user.username} className="w-7 h-7 rounded-full border border-slate-800 object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                            @{user.username}
                            <UserBadgesInline cargo={user.cargo} />
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">{user.nome || 'Usuário'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleCloseFriend(user.id)}
                        disabled={actionLoading === user.id}
                        className={`p-1.5 rounded-lg border transition ${
                          isCloseFriend 
                            ? 'bg-amber-600/10 border-amber-500/30 text-amber-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                        title={isCloseFriend ? 'Remover dos Próximos' : 'Adicionar aos Próximos'}
                      >
                        {isCloseFriend ? <Star className="h-3.5 w-3.5 fill-amber-400" /> : <StarOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CLOSE FRIENDS LIST (Amigos Próximos) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800 uppercase tracking-wider font-mono">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Amigos Próximos ({closeFriends.length})
            </h3>
            
            <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {closeFriends.length === 0 ? (
                <div className="text-center py-8 space-y-1">
                  <StarOff className="h-5 w-5 text-slate-600 mx-auto" />
                  <p className="text-[11px] text-slate-500 italic">Nenhum amigo próximo favorito ainda.</p>
                  <p className="text-[9px] text-slate-600">Use a busca acima para favoritar amigos próximos.</p>
                </div>
              ) : (
                closeFriends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/20 border border-slate-850/40 hover:bg-slate-950/40 transition">
                    <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => onViewProfile(friend.id)}>
                      <div className="relative shrink-0">
                        <img src={friend.avatar_url || ''} alt={friend.username} className="w-8 h-8 rounded-full border border-slate-800 object-cover" />
                        <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-slate-900" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                          @{friend.username}
                          <UserBadgesInline cargo={friend.cargo} />
                        </p>
                        <span className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded ${getCargoLabelStyle(friend.cargo)}`}>
                          {friend.cargo}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleToggleCloseFriend(friend.id)}
                      disabled={actionLoading === friend.id}
                      title="Remover dos Amigos Próximos"
                      className="text-slate-500 hover:text-amber-400 p-1.5 rounded transition hover:bg-slate-800/40 shrink-0"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ALL OTHER USERS (The general active directory) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800 uppercase tracking-wider font-mono">
              <Users className="h-4 w-4 text-indigo-400" /> Diretório Geral de Membros
            </h3>
            
            <p className="text-[10px] text-slate-500 mt-1.5">
              Aqui está a lista de outros usuários com quem você já é amigo por padrão. Clique na estrela para adicioná-los aos seus próximos!
            </p>

            <div className="mt-3.5 space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {allUsers.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Nenhum outro usuário registrado.</p>
              ) : (
                allUsers.map(user => {
                  const isCloseFriend = closeFriends.some(cf => cf.id === user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/10 border border-slate-900 hover:bg-slate-950/20 transition">
                      <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => onViewProfile(user.id)}>
                        <img src={user.avatar_url || ''} alt={user.username} className="w-7.5 h-7.5 rounded-full border border-slate-800 object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                            @{user.username}
                            <UserBadgesInline cargo={user.cargo} />
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">{user.cargo}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleCloseFriend(user.id)}
                        disabled={actionLoading === user.id}
                        className={`p-1 rounded-md transition ${
                          isCloseFriend 
                            ? 'text-amber-400 hover:text-slate-400' 
                            : 'text-slate-600 hover:text-amber-400'
                        }`}
                        title={isCloseFriend ? 'Remover dos Próximos' : 'Adicionar aos Próximos'}
                      >
                        {isCloseFriend ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <Star className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* REWARDS GUIDELINES */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800 uppercase tracking-wider font-mono">
              <Sparkles className="h-4 w-4 text-indigo-400" /> Sistema de Progresso Social
            </h3>
            <ul className="text-[11px] text-slate-400 space-y-2.5 mt-3 leading-normal">
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                <span>Publique anúncios relevantes na timeline oficial e receba **20 XP** por campanha!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                <span>Interaja e responda anúncios de outros membros para ganhar **10 XP** por comentário!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                <span>Aumente o seu nível para desbloquear emblemas e prêmios automáticos creditados!</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
