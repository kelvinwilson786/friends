/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Tweet, TweetComment, UserCargo } from '../types';
import { UserBadgesInline } from './BadgesSection';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, ThumbsUp, ThumbsDown, MessageSquare, Send, Image, 
  Sparkles, Globe, Shield, Clock, HelpCircle, AlertCircle
} from 'lucide-react';

export default function SocialSection() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [activeCommentsTweetId, setActiveCommentsTweetId] = useState<string | null>(null);
  const [comments, setComments] = useState<TweetComment[]>([]);
  const [newComment, setNewComment] = useState('');

  const currentUser = db.getActiveProfile();

  const loadFeed = async () => {
    const feed = await api.getTweets();
    setTweets(feed);
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

  const getCargoColorClasses = (cargo: UserCargo) => {
    switch (cargo) {
      case 'Founder':
        return 'text-amber-400 font-black';
      case 'Global Admin':
        return 'text-rose-400 font-bold';
      case 'Mentor':
      case 'Mentor Head':
        return 'text-red-500 font-bold';
      case 'Merchant':
      case 'Super Merchant':
        return 'text-purple-500 font-bold';
      case 'Guide':
        return 'text-teal-400 font-medium';
      case 'Verified User':
        return 'text-emerald-400 font-semibold';
      default:
        return 'text-slate-200';
    }
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-12">
      
      {/* LEFT COLUMN: Post creator & Feed list (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        
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
          {tweets.map(post => (
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
        </div>

      </div>

      {/* RIGHT COLUMN: Statistics & Guidelines (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        
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
  );
}
