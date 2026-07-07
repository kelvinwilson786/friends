/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { api, db, subscribeToPMs, subscribeToGlobalUpdates } from '../lib/supabase';
import { MensagemPrivada, Profile } from '../types';
import { motion } from 'motion/react';
import { 
  MessageSquare, Send, Search, Users, AlertCircle, Clock, Check, CheckCheck 
} from 'lucide-react';
import { UserBadgesInline, getCargoNicknameStyle } from './BadgesSection';

interface DirectMessagesSectionProps {
  initialRecipientId: string | null;
  clearInitialRecipient: () => void;
}

export default function DirectMessagesSection({ initialRecipientId, clearInitialRecipient }: DirectMessagesSectionProps) {
  const [conversations, setConversations] = useState<{ [userId: string]: MensagemPrivada[] }>({});
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPMText, setNewPMText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = db.getActiveProfile();

  const loadPMs = async () => {
    const list = await api.getPrivateConversations();
    setConversations(list);
    setUsers(db.profiles);
  };

  useEffect(() => {
    loadPMs();
    
    // Auto-select recipient if requested from other screens
    if (initialRecipientId) {
      setActiveRecipientId(initialRecipientId);
      clearInitialRecipient();
    }

    const unsubscribeGlobal = subscribeToGlobalUpdates(loadPMs);
    const unsubscribePMs = subscribeToPMs(() => {
      loadPMs();
    });

    return () => {
      unsubscribeGlobal();
      unsubscribePMs();
    };
  }, [initialRecipientId]);

  // Scroll to bottom on conversation load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRecipientId, conversations]);

  const handleSendPM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPMText.trim() || !activeRecipientId) return;

    try {
      await api.sendPrivateMessage(activeRecipientId, newPMText);
      setNewPMText('');
      loadPMs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Get active recipient profile details
  const activeRecipient = users.find(u => u.id === activeRecipientId);
  const activeChatMessages = activeRecipientId ? (conversations[activeRecipientId] || []) : [];

  // Filter users to start new chat
  const filteredUsers = users.filter(u => 
    u.id !== currentUser.id && 
    (u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
     (u.nome && u.nome.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      
      {/* LEFT COLUMN: ACTIVE CHATS & USER DIRECTORY (4 cols) */}
      <div className="lg:col-span-4 flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-sm h-full">
        
        {/* Search for users */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar usuários para conversar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 pl-9 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-2 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* List scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-slate-950/10">
          
          {searchQuery.trim() ? (
            // Search Results
            <div className="space-y-1">
              <p className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider px-2 pb-1">Resultados de Busca</p>
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono italic px-2">Nenhum usuário encontrado</p>
              ) : (
                filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setActiveRecipientId(u.id);
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border border-slate-800/40 bg-slate-950/30 hover:bg-slate-900/40 cursor-pointer transition ${activeRecipientId === u.id ? 'border-indigo-500/40 bg-indigo-500/5' : ''}`}
                  >
                    <img src={u.avatar_url || ''} alt={u.username} className="w-7 h-7 rounded-full border border-slate-800" />
                    <div>
                      <p className={`text-xs font-bold flex items-center gap-1 ${getCargoNicknameStyle(u.cargo).text}`}>
                        {u.username}
                        <UserBadgesInline cargo={u.cargo} className="ml-1" />
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">{u.cargo}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Active Conversations
            <div className="space-y-1">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider px-2 pb-1">Conversas Ativas</p>
              {Object.keys(conversations).length === 0 ? (
                <p className="text-xs text-slate-500 font-mono italic px-2 pt-4 text-center">Nenhuma conversa recente</p>
              ) : (
                Object.keys(conversations).map(uid => {
                  const user = users.find(u => u.id === uid);
                  if (!user) return null;

                  const lastMsg = conversations[uid][conversations[uid].length - 1];
                  const hasUnread = !lastMsg.lida && lastMsg.remetente_id !== currentUser.id;

                  return (
                    <div
                      key={uid}
                      onClick={() => setActiveRecipientId(uid)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${
                        activeRecipientId === uid
                          ? 'bg-indigo-600/10 border-indigo-500/40 shadow-sm'
                          : 'bg-slate-950/30 border-slate-800/60 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img src={user.avatar_url || ''} alt={user.username} className="w-8.5 h-8.5 rounded-full border border-slate-800 object-cover" />
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-slate-950 bg-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate flex items-center gap-1 ${getCargoNicknameStyle(user.cargo).text}`}>
                            {user.username}
                            <UserBadgesInline cargo={user.cargo} className="ml-1" />
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{lastMsg.conteudo}</p>
                        </div>
                      </div>

                      {hasUnread && (
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CONVERSATION MESSAGES CHAT (8 cols) */}
      <div className="lg:col-span-8 flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-sm h-full">
        {activeRecipient ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src={activeRecipient.avatar_url || ''} alt={activeRecipient.username} className="w-9 h-9 rounded-full border-2 border-indigo-500 object-cover" />
                <div>
                  <h3 className={`text-xs font-bold flex items-center gap-1 ${getCargoNicknameStyle(activeRecipient.cargo).text}`}>
                    {activeRecipient.username}
                    <UserBadgesInline cargo={activeRecipient.cargo} className="ml-1" />
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{activeRecipient.cargo}</p>
                </div>
              </div>
            </div>

            {/* PM Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/15">
              {activeChatMessages.map(pm => {
                const isMe = pm.remetente_id === currentUser.id;
                return (
                  <div
                    key={pm.id}
                    className={`flex flex-col max-w-[70%] ${isMe ? 'ml-auto items-end' : 'items-start'}`}
                  >
                    <div className={`rounded-xl px-4 py-2.5 text-xs leading-relaxed border ${
                      isMe
                        ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-100 rounded-tr-none'
                        : 'bg-slate-900/60 border-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      <p>{pm.conteudo}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1 font-mono">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{new Date(pm.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <span>
                          {pm.lida ? <CheckCheck className="h-3 w-3 text-indigo-400 inline" /> : <Check className="h-3 w-3 inline" />}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Form */}
            <form onSubmit={handleSendPM} className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center gap-2">
              <input
                type="text"
                required
                placeholder={`Mensagem privada para @${activeRecipient.username}...`}
                value={newPMText}
                onChange={(e) => setNewPMText(e.target.value)}
                className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium p-2.5 rounded-lg transition"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="h-10 w-10 text-slate-600 mb-3" />
            <p className="text-xs font-semibold text-slate-300">Nenhum bate-papo privado selecionado</p>
            <p className="text-[11px] text-slate-500 mt-1">Escolha um usuário ao lado para iniciar uma conversa confidencial de alta velocidade.</p>
          </div>
        )}
      </div>

    </div>
  );
}
