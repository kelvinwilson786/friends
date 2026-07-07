/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Tweet, TweetComment, UserCargo } from '../types';
import { UserBadgesInline, getCargoNicknameStyle } from './BadgesSection';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, ThumbsUp, ThumbsDown, MessageSquare, Send, Image, 
  Sparkles, Globe, Shield, Clock, HelpCircle, AlertCircle, Users, Check, X,
  UserPlus, UserMinus, Search, Share2
} from 'lucide-react';
import { Profile } from '../types';

export default function SocialSection({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [activeCommentsTweetId, setActiveCommentsTweetId] = useState<string | null>(null);
  const [comments, setComments] = useState<TweetComment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Pagination & Mobile Navigation Focus
  const [feedLimit, setFeedLimit] = useState(10);
  const [mobileActiveTab, setMobileActiveTab] = useState<'feed' | 'amigos'>('feed');

  // Friendship and suggestions state
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ received: Profile[], sent: Profile[] }>({ received: [], sent: [] });
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchUsername, setSearchUsername] = useState('');

  const currentUser = db.getActiveProfile();

  const handleSendRequest = async (username: string) => {
    setActionLoading(username);
    try {
      await api.sendFriendRequest(username);
      setSearchUsername('');
      await loadFriendshipData();
    } catch (err: any) {
      alert(err.message || "Erro ao enviar solicitação");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespondRequest = async (requesterId: string, accept: boolean) => {
    setActionLoading(requesterId);
    try {
      await api.respondToFriendRequest(requesterId, accept);
      await loadFriendshipData();
    } catch (err: any) {
      alert(err.message || "Erro ao responder solicitação");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("Deseja realmente desfazer a amizade?")) return;
    setActionLoading(friendId);
    try {
      await api.removeFriend(friendId);
      await loadFriendshipData();
    } catch (err: any) {
      alert(err.message || "Erro ao remover amigo");
    } finally {
      setActionLoading(null);
    }
  };

  const loadFriendshipData = async () => {
    try {
      const allFriends = await api.getFriends();
      const requests = await api.getFriendshipRequests();
      const allUsers = await api.getAllUsers();
      
      setFriends(allFriends);
      setPendingRequests(requests);
      
      const friendIds = allFriends.map(f => f.id);
      const pendingIds = [
        ...requests.received.map(r => r.id),
        ...requests.sent.map(s => s.id)
      ];
      
      const filteredSug = allUsers.filter(u => 
        u.id !== currentUser.id && 
        !friendIds.includes(u.id) && 
        !pendingIds.includes(u.id)
      );
      
      setSuggestions(filteredSug.slice(0, 4));
    } catch (err) {
      console.error("Error loading friendship data:", err);
    }
  };

  const loadFeed = async () => {
    const feed = await api.getTweets();
    setTweets(feed);
    await loadFriendshipData();
  };

  useEffect(() => {
    loadFeed();
    const unsubscribe = subscribeToGlobalUpdates(loadFeed);
    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      await api.createTweet(newContent, newImage.trim() || null);
      setNewContent('');
      setNewImage('');
      setShowImageInput(false);
      loadFeed();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReact = async (tweetId: string, type: 'like' | 'dislike') => {
    try {
      await api.reactToTweet(tweetId, type);
      loadFeed();
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
      loadFeed();
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

  const friendIds = friends.map(f => f.id);
  const filteredTweets = tweets.filter(t => {
    // Current user can always see their own posts
    if (t.user_id === currentUser.id) return true;
    
    // Is friend
    if (friendIds.includes(t.user_id)) return true;
    
    // Check role of author: guides, admins, founders, staff, moderators, mentors
    const authorCargo = t.author_cargo || '';
    const cargoLower = authorCargo.toLowerCase();
    
    const isGuide = cargoLower.includes('guide');
    const isAdmin = cargoLower.includes('admin') || cargoLower.includes('manager');
    const isFounder = cargoLower.includes('founder');
    const isStaff = cargoLower.includes('staff');
    const isMentor = cargoLower.includes('mentor');
    const isModerator = cargoLower.includes('moderator');
    
    return isGuide || isAdmin || isFounder || isStaff || isMentor || isModerator;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-12 space-y-4">
      {/* Mobile focused layout tabs */}
      <div className="flex lg:hidden bg-slate-900/60 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setMobileActiveTab('feed')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center gap-2 ${
            mobileActiveTab === 'feed'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="h-4 w-4" />
          Feed de Publicações
        </button>
        <button
          onClick={() => setMobileActiveTab('amigos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center gap-2 ${
            mobileActiveTab === 'amigos'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4 text-emerald-400" />
          Amigos & Solicitações
          {pendingRequests.received.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse ml-1.5" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Post creator & Feed list (8 cols) */}
        <div className={`lg:col-span-8 space-y-6 ${mobileActiveTab === 'feed' ? 'block' : 'hidden lg:block'}`}>
        
        {/* Post Publisher */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex gap-3">
            <img 
              src={currentUser.avatar_url || ''} 
              alt={currentUser.username} 
              className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover" 
            />
            <form onSubmit={handleCreatePost} className="flex-1 space-y-3">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="No que você está pensando para o FCFUNZ hoje?"
                rows={3}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />

              <AnimatePresence>
                {showImageInput && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="url"
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      placeholder="Cole a URL de uma imagem linda (Unsplash, etc)..."
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                    showImageInput 
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' 
                      : 'border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Image className="h-4 w-4" />
                  <span>{showImageInput ? 'Esconder Imagem' : 'Adicionar Imagem'}</span>
                </button>

                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-md shadow-indigo-600/15"
                >
                  <Send className="h-3.5 w-3.5" /> Publicar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* FEED LIST */}
        <div className="space-y-4">
          {tweets.slice(0, feedLimit).map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4"
            >
              {/* Header profile */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={post.author_avatar || ''} alt={post.author_username} className="w-10 h-10 rounded-full border border-slate-800 object-cover" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className={`text-xs font-bold flex items-center gap-1 ${getCargoColorClasses(post.author_cargo || 'Unverified User')}`}>
                        {post.author_username}
                        <UserBadgesInline cargo={post.author_cargo || 'Unverified User'} className="ml-0.5" />
                      </h4>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight ${getCargoLabelStyle(post.author_cargo || 'Unverified User')}`}>
                        {post.author_cargo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(post.created_at).toLocaleDateString()} às {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                <Globe className="h-4 w-4 text-slate-600" />
              </div>

              {/* Publication text content */}
              <p className="text-xs text-slate-200 leading-relaxed">
                {post.content}
              </p>

              {/* Publication optional image */}
              {post.image_url && (
                <div className="rounded-lg overflow-hidden border border-slate-800 max-h-96">
                  <img src={post.image_url} alt="Social Post" referrerPolicy="no-referrer" className="w-full object-cover max-h-96" />
                </div>
              )}

              {/* Reactions Bar */}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-800/40 text-xs text-slate-400">
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
                        placeholder="Deixe um comentário respeitoso..."
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
                    <div className="space-y-2.5 max-h-60 overflow-y-auto mt-2">
                      {comments.length === 0 ? (
                        <p className="text-[10px] text-slate-500 font-mono italic px-2">Ninguém comentou ainda. Seja o primeiro!</p>
                      ) : (
                        comments.map(c => (
                          <div key={c.id} className="flex items-start gap-2.5 bg-slate-950/30 border border-slate-800/60 rounded-lg p-2.5">
                            <img src={c.author_avatar || ''} alt={c.author_username} className="w-6 h-6 rounded-full border border-slate-850" />
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
                              <p className="text-xs text-slate-300 mt-1 leading-normal">{c.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          
          {tweets.length > feedLimit && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setFeedLimit(prev => prev + 10)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 text-xs font-mono uppercase tracking-wider font-bold rounded-xl transition duration-150 shadow-lg shadow-indigo-950/20"
              >
                <Clock className="h-4 w-4 text-indigo-400 animate-pulse" />
                Carregar Feeds Mais Antigos
              </button>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Statistics, Friends & Guidelines (4 cols) */}
      <div className={`lg:col-span-4 space-y-6 ${mobileActiveTab === 'amigos' ? 'block' : 'hidden lg:block'}`}>
        
        {/* Adicionar Amigo Search Bar */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
            <Users className="h-4 w-4 text-indigo-400" /> Enviar Convite de Amizade
          </h3>
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              if (searchUsername.trim()) handleSendRequest(searchUsername.trim()); 
            }} 
            className="mt-3 flex gap-2"
          >
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Digite o @username..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading !== null}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Adicionar
            </button>
          </form>
        </div>

        {/* Amigos List */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
            Amigos Online ({friends.length})
          </h3>
          <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
            {friends.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic">Nenhum amigo adicionado ainda.</p>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/20 border border-slate-800/40 hover:bg-slate-950/30 transition">
                  <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => onViewProfile(friend.id)}>
                    <div className="relative shrink-0">
                      <img src={friend.avatar_url || ''} alt={friend.username} className="w-8 h-8 rounded-full border border-slate-800" />
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                        @{friend.username}
                        <UserBadgesInline cargo={friend.cargo} />
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{friend.nome || 'Usuário'} {friend.sobrenome || ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    disabled={actionLoading !== null}
                    title="Desfazer Amizade"
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition hover:bg-slate-800/40 shrink-0"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Solicitações de Amizade */}
        {(pendingRequests.received.length > 0 || pendingRequests.sent.length > 0) && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
              <Clock className="h-4 w-4 text-indigo-400" /> Solicitações Pendentes
            </h3>
            <div className="mt-3 space-y-3 max-h-48 overflow-y-auto">
              {/* Received */}
              {pendingRequests.received.map(req => (
                <div key={req.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/20 border border-slate-800/40">
                  <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => onViewProfile(req.id)}>
                    <img src={req.avatar_url || ''} alt={req.username} className="w-7 h-7 rounded-full border border-slate-800 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">@{req.username}</p>
                      <p className="text-[9px] text-indigo-400">Recebida</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleRespondRequest(req.id, true)}
                      disabled={actionLoading !== null}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded transition"
                      title="Aceitar"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleRespondRequest(req.id, false)}
                      disabled={actionLoading !== null}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 p-1 rounded transition"
                      title="Recusar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Sent */}
              {pendingRequests.sent.map(req => (
                <div key={req.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/20 border border-slate-800/40">
                  <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => onViewProfile(req.id)}>
                    <img src={req.avatar_url || ''} alt={req.username} className="w-7 h-7 rounded-full border border-slate-800 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">@{req.username}</p>
                      <p className="text-[9px] text-slate-500">Enviada</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sugestões de Amigos */}
        {suggestions.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
              <Sparkles className="h-4 w-4 text-indigo-400" /> Sugestões de Amizade
            </h3>
            <div className="mt-3 space-y-3">
              {suggestions.map(sug => (
                <div key={sug.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/20 border border-slate-800/40 hover:bg-slate-950/30 transition">
                  <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => onViewProfile(sug.id)}>
                    <img src={sug.avatar_url || ''} alt={sug.username} className="w-7 h-7 rounded-full border border-slate-800 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                        @{sug.username}
                        <UserBadgesInline cargo={sug.cargo} />
                      </p>
                      <p className="text-[9px] text-slate-500 truncate">{sug.nome || 'Usuário'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendRequest(sug.username)}
                    disabled={actionLoading !== null}
                    className="text-indigo-400 hover:text-indigo-300 p-1.5 rounded transition hover:bg-slate-800/40 shrink-0"
                    title="Adicionar Amigo"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Guidelines & community metrics */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
            <Sparkles className="h-4 w-4 text-indigo-400" /> Diretrizes FCFunztbook
          </h3>
          <ul className="text-[11px] text-slate-400 space-y-2.5 mt-3 leading-normal">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
              <span>Ganhe **20 XP** para cada publicação feita e **10 XP** para cada comentário respondido.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
              <span>Respeite as tags de moderação (**Mentores** e **Admins** fiscalizam o feed).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
              <span>Insira links de imagens diretas para enriquecer sua postagem e acumular popularidade.</span>
            </li>
          </ul>
        </div>

        {/* Level up guidelines */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
            <Shield className="h-4 w-4 text-indigo-400" /> Sistema de Progresso
          </h3>
          <div className="mt-3 text-xs text-slate-400 space-y-3">
            <p>Seja um membro ativo para evoluir seu ranking e acumular MZN de bônus automático a cada subida de nível!</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg text-center">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Publicações</p>
                <p className="text-sm font-bold text-indigo-400 mt-1">+20 XP</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg text-center">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Comentários</p>
                <p className="text-sm font-bold text-indigo-400 mt-1">+10 XP</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    </div>
  );
}
