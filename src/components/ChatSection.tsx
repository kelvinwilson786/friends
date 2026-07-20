/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { api, db, subscribeToChat, subscribeToGlobalUpdates } from '../lib/supabase';
import { Sala, Mensagem, Profile, UserCargo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Send, Users, Shield, Sparkles, Smile, Trash2, 
  Heart, VolumeX, Volume2, Award, Zap, HelpCircle, Gift, AlertCircle, Coins, Dices,
  Lock, Unlock, RefreshCw, Crown, ShieldAlert, Settings, LogOut
} from 'lucide-react';
import { UserBadgesInline } from './BadgesSection';

interface ChatSectionProps {
  onViewProfile: (userId: string) => void;
}

const CATEGORIES = ['Official Rooms', 'Gaming Rooms', 'Hot Rooms', 'My Rooms'];

// 2015 Retro-Futuristic Custom Emoji library as requested by MÓDULO 21
const EMOJIS = [
  '😀', '😂', '😍', '😎', '😜', '🔥', '💎', '🚀', '⭐', '🎲', '👑', '🎁', '🌹', '🍕', '☕', '💩', '👾', '💖', '👏', '🎉',
  '🎈', '🎭', '🎨', '🎬', '🎧', '🎸', '🎮', '🎳', '🎯', '⚽', '🏆', '💰', '💳', '💵', '🔔', '🔋', '🔌', '💻', '📱',
  '🌈', '☀️', '🌟', '⚡', '❄️', '🍀', '🍎', '🍺', '🍿', '✈️', '⛵', '🗺️', '👻', '👽', '🤖', '💥', '✨', '💯'
];

function parseDiceMessageContent(content: string) {
  const lines = content.split('\n');
  return (
    <div className="flex flex-col gap-2.5 text-left">
      {lines.map((line, idx) => {
        let lineStyle = "text-xs text-slate-100 leading-relaxed";
        let parsedLine = line;

        const isWinnerLine = line.includes('🏆') || line.includes('GANHOU') || line.includes('VITÓRIA') || line.includes('venceu') || line.includes('vencedor') || line.includes('Parabéns');
        const isLossLine = line.includes('💀') || line.includes('PERDEU') || line.includes('DERROTA') || line.includes('ELIMINAÇÃO');
        const isHeaderLine = line.includes('🎯') || line.includes('⚔️') || line.includes('🎲');

        if (isHeaderLine) {
          return (
            <div key={idx} className="flex items-center gap-2 border-b border-blue-400/30 pb-2 mb-1.5">
              <span className="text-xl animate-bounce">🎲</span>
              <p className="text-xs font-black uppercase tracking-wider text-sky-200 font-mono">
                {line.replace(/[🎯⚔️🎲]/g, '').trim()}
              </p>
            </div>
          );
        } else if (isWinnerLine) {
          return (
            <div 
              key={idx} 
              className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-400 rounded-xl p-3 my-1.5 text-center shadow-lg shadow-amber-500/10 border-dashed animate-pulse"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-lg">👑</span>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">VENCEDOR DESTACADO</span>
                <span className="text-lg">👑</span>
              </div>
              <p className="text-xs font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]">
                {line.replace(/[🏆👑]/g, '').trim()}
              </p>
            </div>
          );
        } else if (isLossLine) {
          lineStyle = "text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1.5 rounded-lg my-1 flex items-center gap-1.5 justify-center text-center";
        }

        const hasDiceIcons = /[⚀⚁⚂⚃⚄⚅]/.test(line);
        if (hasDiceIcons) {
          return (
            <div key={idx} className="bg-blue-600/20 border-2 border-blue-400/40 rounded-xl p-3.5 my-2 text-center shadow-inner">
              <span className="text-[9px] uppercase font-mono text-sky-300 font-bold tracking-widest block mb-2">✦ VALORES DOS DADOS SORTEADOS ✦</span>
              <div className="text-5xl font-extrabold text-amber-300 tracking-widest font-mono flex items-center justify-center gap-3 drop-shadow-[0_4px_14px_rgba(245,158,11,0.65)] select-none">
                {line.split(' ').map((word, wIdx) => {
                  if (/[⚀⚁⚂⚃⚄⚅]/.test(word)) {
                    return (
                      <span 
                        key={wIdx} 
                        className="text-6xl text-amber-300 transform hover:scale-125 transition duration-250 inline-block drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] filter active:rotate-12"
                        title={`Dado: ${word}`}
                      >
                        {word}
                      </span>
                    );
                  }
                  return <span key={wIdx} className="text-[11px] font-bold text-white font-sans bg-blue-500/20 px-2 py-0.5 rounded ml-1">{word}</span>;
                })}
              </div>
            </div>
          );
        }

        const cleanLine = parsedLine.replace(/\*\*(.*?)\*\*/g, '$1');

        return (
          <p key={idx} className={lineStyle}>
            {cleanLine}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatSection({ onViewProfile }: ChatSectionProps) {
  const [rooms, setRooms] = useState<Sala[]>(db.salas);
  const [activeRoom, setActiveRoom] = useState<Sala | null>(null);
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>(db.profiles);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Official Rooms');
  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeDiceGame, setActiveDiceGame] = useState<any>(null);

  // New features states
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserForMod, setSelectedUserForMod] = useState<string | null>(null);
  const [showRoomOptions, setShowRoomOptions] = useState(false);
  const [announceInput, setAnnounceInput] = useState('');
  const [emojiKeyboardTab, setEmojiKeyboardTab] = useState<'standard' | 'exclusive' | 'stickers'>('standard');
  const [mobileSection, setMobileSection] = useState<'rooms' | 'chat'>('rooms');

  // Gift popover states
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [giftTargetId, setGiftTargetId] = useState<string>('');
  const [selectedGiftId, setSelectedGiftId] = useState<string>('');
  const [giftStatus, setGiftStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [giftPanelMode, setGiftPanelMode] = useState<'individual' | 'all' | 'shower'>('individual');
  const [giftShowerQty, setGiftShowerQty] = useState<number>(5);

  // Room Creator Form
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomCat, setNewRoomCat] = useState('Official Rooms');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(true);
  const [visibleCount, setVisibleCount] = useState(15);
  const currentUser = db.getActiveProfile();

  const getRoomUsers = () => {
    if (!activeRoom) return [];
    
    // Get all users currently in db.room_participants for this room
    const participantIds = db.room_participants
      .filter(p => p.sala_id === activeRoom.id)
      .map(p => p.user_id);

    // Filter profiles that are online/part of participants list
    let profilesInRoom = onlineUsers.filter(u => participantIds.includes(u.id));

    // Fallback/Simulated population to make the room feel live if empty
    if (profilesInRoom.length <= 1) {
      // Let's populate seed users based on the room category or seed configuration
      const seedParticipants = onlineUsers.filter(u => {
        if (u.id === currentUser.id) return true;
        
        // Seed users assigned statically to make room feel alive
        const userRoomMap: Record<string, string> = {
          'u2': 's1', // Carlos_Mentor
          'u3': 's1', // Sara_Merchant
          'u4': 's2', // Guide_Ana
        };
        const assigned = userRoomMap[u.id] || 's1';
        return assigned === activeRoom.id;
      });
      return seedParticipants;
    }

    // Since everyone is friends by default under the AMIGOS model, return all profiles in this room
    return profilesInRoom;
  };

  const roomUsers = getRoomUsers();

  // Load Rooms, active message logs, and favorites
  useEffect(() => {
    const handleUpdate = () => {
      setRooms([...db.salas]);
      setOnlineUsers([...db.profiles]);
    };
    const unsubscribe = subscribeToGlobalUpdates(handleUpdate);

    // Initial load favorites
    api.getFavoriteRooms().then(setFavorites);

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Deep-linking / Redirecting room selector from other components (Marketplace / Profiles)
  useEffect(() => {
    const targetRoomId = localStorage.getItem('fcfunz_active_room_id');
    if (targetRoomId) {
      const room = db.salas.find(s => s.id === targetRoomId);
      if (room) {
        // Automatically enter this room
        setActiveRoom(room);
        setMobileSection('chat');
        // Clean up immediately so subsequent regular chat entries start fresh
        localStorage.removeItem('fcfunz_active_room_id');
      }
    }
  }, [rooms]);

  // Sync Active Dice Game
  useEffect(() => {
    if (!activeRoom) {
      setActiveDiceGame(null);
      return;
    }
    const updateGame = async () => {
      const game = await api.getRoomDiceGame(activeRoom.id);
      setActiveDiceGame(game);
    };
    
    updateGame();
    const unsubscribe = subscribeToGlobalUpdates(updateGame);
    return () => unsubscribe();
  }, [activeRoom]);

  // Inactivity Timer tracking (6 minutes of silence/no activity)
  const lastActivityRef = useRef<number>(Date.now());

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    if (activeRoom && currentUser) {
      api.heartbeatRoom(activeRoom.id, currentUser.id);
    }
  };

  useEffect(() => {
    if (!activeRoom || !currentUser) return;

    // Reset timer on change room
    lastActivityRef.current = Date.now();

    const interval = setInterval(() => {
      const inactiveSecs = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      if (inactiveSecs >= 300) { // 5 minutes (300 seconds)
        api.leaveRoom(activeRoom.id, currentUser.id, 'inactive').then(() => {
          setActiveRoom(null);
          setAccessError('Sua sessão nesta sala expirou devido a inatividade (inativo há 5 minutos).');
        });
      } else {
        // Automatically renew the user's active status in this room
        api.heartbeatRoom(activeRoom.id, currentUser.id);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [activeRoom?.id, currentUser?.id]);

  // Handle room entering and exiting with security checks
  const prevRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const prevRoomId = prevRoomIdRef.current;
    const currentRoomId = activeRoom?.id || null;

    if (prevRoomId === currentRoomId) return;

    const manageRoomTransition = async () => {
      setAccessError(null);

      // Enter new room without immediately leaving the previous one
      // (The previous room will naturally expire after 6 minutes of inactivity)
      if (currentRoomId) {
        try {
          await api.enterRoom(currentRoomId, currentUser.id);
          prevRoomIdRef.current = currentRoomId;
          // Sync messages
          const msgs = await api.getMessages(currentRoomId);
          shouldScrollToBottomRef.current = true;
          setVisibleCount(15);
          setMessages(msgs);
        } catch (err: any) {
          console.error('Access denied:', err.message);
          setAccessError(err.message || 'Acesso negado à sala.');
          setActiveRoom(null);
          prevRoomIdRef.current = null;
        }
      } else {
        prevRoomIdRef.current = null;
      }
    };

    manageRoomTransition();
  }, [activeRoom?.id, currentUser?.id]);

  // Clean up room on unmount - we do not immediately leave so that page refreshes or quick tab switches don't spam leave/enter messages.
  // The global 6-minute inactivity system will cleanly remove the user from the room participants database.
  useEffect(() => {
    return () => {
      // No immediate exit here either to keep the multi-room active sessions alive for up to 6 minutes.
    };
  }, [currentUser?.id]);

  // Sync Messages of Active Room
  useEffect(() => {
    if (!activeRoom) return;

    // Subscribe to incoming messages
    const unsubscribe = subscribeToChat(activeRoom.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        // Limit local message state to 100 most recent messages so we can paginate back
        shouldScrollToBottomRef.current = true;
        return [...prev, newMsg].slice(-100);
      });
    });

    return () => unsubscribe();
  }, [activeRoom?.id]);

  // Scroll to bottom
  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleLoadMore = () => {
    if (!messageContainerRef.current) return;
    
    // Save current scroll metrics
    const container = messageContainerRef.current;
    const previousScrollHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;
    
    shouldScrollToBottomRef.current = false;
    setVisibleCount(prev => Math.min(prev + 15, messages.length));
    
    // After render, restore scroll position relative to the bottom
    requestAnimationFrame(() => {
      if (!messageContainerRef.current) return;
      const newScrollHeight = messageContainerRef.current.scrollHeight;
      messageContainerRef.current.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
    });
  };

  // Infinite scroll up - Intersection Observer for sentinel
  useEffect(() => {
    if (!sentinelRef.current || !messageContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && messages.length > visibleCount) {
          handleLoadMore();
        }
      },
      {
        root: messageContainerRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [messages.length, visibleCount]);

  const handleSendInlineGift = async () => {
    if (!activeRoom || !selectedGiftId) {
      setGiftStatus({ error: 'Selecione um presente.' });
      return;
    }

    if (giftPanelMode === 'individual' && !giftTargetId) {
      setGiftStatus({ error: 'Selecione um destinatário.' });
      return;
    }

    setIsSendingGift(true);
    setGiftStatus(null);

    try {
      if (giftPanelMode === 'individual') {
        await api.sendGift(giftTargetId, selectedGiftId, activeRoom.id, currentUser.id);
        setGiftStatus({ success: 'Presente enviado com sucesso!' });
      } else if (giftPanelMode === 'all') {
        await api.sendGift('all', selectedGiftId, activeRoom.id, currentUser.id);
        setGiftStatus({ success: 'Presentes enviados para todos!' });
      } else if (giftPanelMode === 'shower') {
        await api.sendGiftShower(activeRoom.id, selectedGiftId, giftShowerQty);
        setGiftStatus({ success: 'Chuveiro de presentes ativado!' });
      }
      setSelectedGiftId('');
      // Show success briefly, then close panel
      setTimeout(() => {
        setShowGiftPanel(false);
        setGiftStatus(null);
      }, 2000);
    } catch (err: any) {
      setGiftStatus({ error: err.message || 'Falha ao enviar presente.' });
    } finally {
      setIsSendingGift(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;

    resetInactivityTimer();

    const msgLower = newMessage.trim();
    if (msgLower.startsWith('/anuncio ') || msgLower.startsWith('*anuncio ')) {
      const parts = newMessage.split(/\s+/);
      const text = newMessage.substring(parts[0].length).trim();
      
      const hasPerm = currentUser.id === activeRoom.dono_id || 
                      ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Chatroom Moderator', 'Chatroom Manager', 'Staff'].includes(currentUser.cargo);
      
      if (!hasPerm) {
        alert('Você não tem permissão para alterar o anúncio desta sala.');
        return;
      }

      try {
        await api.updateRoomAnnounce(activeRoom.id, text || null);
        const updated = db.salas.find(s => s.id === activeRoom.id);
        if (updated) {
          setActiveRoom({ ...updated });
        }
        await api.sendMessage(activeRoom.id, `📢 @${currentUser.username} alterou o anúncio da sala para: "${text || '(vazio)'}"`, 'automatic');
        setNewMessage('');
        return;
      } catch (err: any) {
        alert(err.message || 'Erro ao alterar o anúncio.');
        return;
      }
    }

    try {
      await api.sendMessage(activeRoom.id, newMessage, 'normal', selectedColor);
      setNewMessage('');
      setShowEmojis(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem.');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const room = await api.createRoom({
        nome: newRoomName,
        descricao: newRoomDesc,
        categoria: newRoomCat,
      });
      setActiveRoom(room);
      setShowRoomCreator(false);
      setNewRoomName('');
      setNewRoomDesc('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSilence = async () => {
    if (!activeRoom) return;
    try {
      await api.silenceRoom(activeRoom.id, !activeRoom.silence);
      const updated = db.salas.find(s => s.id === activeRoom.id);
      if (updated) setActiveRoom({ ...updated });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Modern and high-fidelity moderation actions
  const handleKickUser = async (targetId: string) => {
    if (!activeRoom) return;
    try {
      await api.kickUserFromRoom(activeRoom.id, targetId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBanUserRoomPermanent = async (targetId: string) => {
    if (!activeRoom) return;
    try {
      await api.banUserFromRoomPermanent(activeRoom.id, targetId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBanUserGroup = async (targetId: string) => {
    if (!activeRoom) return;
    try {
      await api.banUserFromGroup(activeRoom.id, targetId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBanUserGlobal = async (targetId: string) => {
    try {
      if (confirm('Tem certeza que deseja BANIR GLOBALMENTE este usuário? Esta ação é irreversível.')) {
        await api.globalBanUser(targetId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleLockRoom = async () => {
    if (!activeRoom) return;
    try {
      await api.toggleLockRoom(activeRoom.id);
      const updated = db.salas.find(s => s.id === activeRoom.id);
      if (updated) setActiveRoom({ ...updated });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRefreshChat = async () => {
    if (!activeRoom) return;
    setIsRefreshing(true);
    resetInactivityTimer();
    try {
      const msgs = await api.getMessages(activeRoom.id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleFavoriteRoom = async (roomId: string) => {
    try {
      await api.toggleFavoriteRoom(roomId);
      const updated = await api.getFavoriteRooms();
      setFavorites(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelectRoom = async (room: Sala) => {
    try {
      const access = await api.checkRoomAccess(room.id, currentUser.id);
      if (!access.allowed) {
        setAccessError(access.reason || 'Acesso negado.');
        return;
      }
      setAccessError(null);
      setActiveRoom(room);
      setAnnounceInput(room.announce || '');
      setShowRoomOptions(false);
      setMobileSection('chat');
    } catch (err: any) {
      setAccessError(err.message || 'Erro ao acessar a sala.');
    }
  };

  const renderRichTextWithUsers = (text: string) => {
    // Split by newlines to preserve lines nicely
    const lines = text.split('\n');
    
    return (
      <span className="block whitespace-pre-wrap">
        {lines.map((line, lineIdx) => {
          // For each line, parse users and bold markdown
          const parts = line.split(/(@[a-zA-Z0-9_]+|\*\*.*?\*\*)/g);
          
          return (
            <span key={lineIdx} className="block min-h-[1.1rem]">
              {parts.map((part, index) => {
                if (part.startsWith('@')) {
                  const username = part.slice(1);
                  const profile = db.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
                  if (profile) {
                    return (
                      <span
                        key={index}
                        onClick={() => onViewProfile(profile.id)}
                        className={`inline-flex items-center gap-0.5 font-bold cursor-pointer hover:underline mx-0.5 align-middle ${getCargoColorClasses(profile.cargo)}`}
                      >
                        @{profile.username}
                        <UserBadgesInline cargo={profile.cargo} className="ml-0.5 scale-90" />
                      </span>
                    );
                  }
                } else if (part.startsWith('**') && part.endsWith('**')) {
                  const inner = part.slice(2, -2);
                  return (
                    <strong key={index} className="font-extrabold text-white filter drop-shadow">
                      {inner}
                    </strong>
                  );
                }
                return part;
              })}
            </span>
          );
        })}
      </span>
    );
  };

  // Cargo colors configuration (Creative and modern with PDF styling rules)
  const getCargoColorClasses = (cargo: UserCargo) => {
    switch (cargo) {
      case 'Founder':
        return 'text-amber-400 font-black shadow-amber-500/10 shadow-sm';
      case 'Global Admin':
        return 'text-rose-400 font-bold';
      case 'Mentor':
      case 'Mentor Head':
        return 'text-red-500 font-bold'; // Red as requested by user
      case 'Super Merchant':
        return 'text-pink-400 font-bold'; // Pink as requested by user
      case 'Merchant':
        return 'text-purple-500 font-bold'; // Purple as requested by user
      case 'Guide':
        return 'text-teal-400 font-medium';
      case 'Staff':
        return 'text-blue-400 font-medium';
      case 'Verified User':
        return 'text-emerald-400 font-semibold';
      case 'Lucky User':
        return 'text-yellow-400 font-semibold animate-pulse';
      default:
        return 'text-slate-300';
    }
  };

  const getCargoLabelStyle = (cargo: UserCargo) => {
    switch (cargo) {
      case 'Founder':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'Global Admin':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/20';
      case 'Mentor':
      case 'Mentor Head':
        return 'bg-red-500/15 text-red-400 border border-red-500/20';
      case 'Super Merchant':
        return 'bg-pink-500/15 text-pink-400 border border-pink-500/20';
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

  // Filter rooms based on selected category
  const filteredRooms = rooms.filter(r => {
    if (activeCategory === 'My Rooms') return r.dono_id === currentUser.id;
    return r.categoria === activeCategory;
  });

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-0 lg:gap-6 h-[calc(100dvh-112px)] lg:h-[calc(100vh-10rem)] w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 mt-0 lg:mt-4">
      
      {/* 1. ROOMS NAVIGATION BAR (Lg: 3 columns) */}
      <div className={`lg:col-span-3 flex flex-col bg-slate-900/40 lg:border lg:border-slate-800/80 rounded-none lg:rounded-xl overflow-hidden backdrop-blur-sm h-full ${activeRoom && mobileSection === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" /> Salas de Chat
          </h2>
          <button 
            onClick={() => setShowRoomCreator(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1"
          >
            <span>+ Criar</span>
          </button>
        </div>

        {/* Categories Tab selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/20">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 text-[10px] sm:text-xs py-2 text-center border-b-2 font-medium transition ${
                activeCategory === cat 
                  ? 'border-indigo-500 text-slate-100 bg-indigo-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
              }`}
            >
              {cat === 'Official Rooms' ? 'Oficiais' : cat === 'Gaming Rooms' ? 'Jogos' : cat === 'Hot Rooms' ? 'Populares' : 'Minhas'}
            </button>
          ))}
        </div>

        {/* Rooms list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-slate-950/10">
          {/* Seção de Salas Ativas */}
          {(() => {
            const userActiveParticipants = db.room_participants.filter(p => p.user_id === currentUser.id);
            if (userActiveParticipants.length === 0) return null;
            return (
              <div className="mb-3.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-indigo-400">
                    Salas Ativas ({userActiveParticipants.length}/2)
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Limite Máximo</span>
                </div>
                <div className="space-y-1">
                  {userActiveParticipants.map(part => {
                    const room = rooms.find(r => r.id === part.sala_id);
                    if (!room) return null;
                    return (
                      <div key={room.id} className="flex items-center justify-between bg-slate-900/40 px-2 py-1.5 rounded border border-slate-800/40 text-xs">
                        <span 
                          onClick={() => handleSelectRoom(room)} 
                          className="font-medium text-slate-300 truncate cursor-pointer hover:text-white hover:underline flex-1 text-[11px]"
                        >
                          💬 {room.nome}
                        </span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja realmente sair da sala "${room.nome}"?`)) {
                              try {
                                await api.leaveRoom(room.id, currentUser.id, 'manual');
                                // Force state refreshes
                                setRooms([...db.salas]);
                                setOnlineUsers([...db.profiles]);
                                if (activeRoom?.id === room.id) {
                                  setActiveRoom(null);
                                }
                              } catch (err: any) {
                                alert(err.message || 'Erro ao sair da sala.');
                              }
                            }
                          }}
                          className="text-[8px] font-mono font-bold bg-red-500/10 hover:bg-red-500/20 px-1.5 py-0.5 rounded text-red-400 transition"
                        >
                          Sair
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono">
              Nenhuma sala encontrada
            </div>
          ) : (
            filteredRooms.map(room => {
              const isFav = favorites.includes(room.id);
              return (
                <div
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className={`group relative flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${
                    activeRoom?.id === room.id
                      ? 'bg-indigo-600/10 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/30 border-slate-800/60 hover:bg-slate-900/40 hover:border-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                        {room.nome}
                      </h3>
                      {room.bot && (
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1 rounded">Bot</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {room.descricao || 'Bate-papo divertido'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavoriteRoom(room.id);
                      }}
                      className={`p-1 rounded-full hover:bg-slate-800 transition ${isFav ? 'text-amber-400' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                      <Heart className={`h-3 w-3 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    {room.dono_id === currentUser.id && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if(confirm('Tem certeza que deseja excluir esta sala?')) {
                            await api.deleteRoom(room.id);
                            setRooms(db.salas);
                            if(activeRoom?.id === room.id) setActiveRoom(db.salas[0] || null);
                          }
                        }}
                        className="p-1 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. CHAT FEED & MESSAGE AREA (Lg: 9 columns) */}
      <div className={`lg:col-span-9 flex flex-col bg-slate-900/40 lg:border lg:border-slate-800/80 rounded-none lg:rounded-xl overflow-hidden backdrop-blur-sm h-full ${!activeRoom || mobileSection === 'rooms' ? 'hidden lg:flex' : 'flex'}`}>
        {activeRoom ? (
          <>
            {/* Header of Active Room - Highly cleaned visual area like Telegram PC as requested */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/80 flex flex-col justify-center h-[58px] shrink-0">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileSection('rooms')}
                    className="lg:hidden flex items-center justify-center text-slate-400 hover:text-slate-200 p-1 rounded-lg shrink-0 transition"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {/* Title & Subtitle Stack - Telegram PC Style */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1 truncate tracking-tight">
                        💬 {activeRoom.nome}
                      </h2>
                      
                      {/* Favorites Indicator */}
                      <button
                        onClick={() => handleFavoriteRoom(activeRoom.id)}
                        className={`transition shrink-0 ${favorites.includes(activeRoom.id) ? 'text-amber-400 hover:text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                        title={favorites.includes(activeRoom.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Heart className={`h-3 w-3 ${favorites.includes(activeRoom.id) ? 'fill-current text-amber-400' : ''}`} />
                      </button>

                      {/* Status Badges */}
                      {activeRoom.locked && (
                        <span className="text-[7px] bg-red-500/15 border border-red-500/20 text-red-400 px-1 rounded font-mono font-bold shrink-0">
                          LOCKED
                        </span>
                      )}
                      {activeRoom.silence && (
                        <span className="text-[7px] bg-amber-500/15 border border-amber-500/20 text-amber-400 px-1 rounded font-mono font-bold shrink-0">
                          SILENCE
                        </span>
                      )}
                    </div>
                    {/* Small compact subtitle beneath the group name */}
                    <span className="text-[10px] text-slate-500 font-mono tracking-tight -mt-0.5">
                      {roomUsers.length} membros • {roomUsers.length} online
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Manual Refresh Button */}
                  <button
                    onClick={handleRefreshChat}
                    disabled={isRefreshing}
                    className="p-1 sm:p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 transition flex items-center justify-center"
                    title="Atualizar Feed"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>

                  {/* Options Balloon Button - All tools tucked here to keep chat pristine */}
                  <button
                    onClick={() => {
                      setShowRoomOptions(!showRoomOptions);
                      setAnnounceInput(activeRoom.announce || '');
                    }}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition flex items-center gap-1 ${
                      showRoomOptions 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="hidden xs:inline">Opções</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Access/General Error Indicator */}
            {accessError && (
              <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex items-start gap-2.5 animate-pulse">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-400">Acesso Restrito</p>
                  <p className="text-[11px] text-red-300/80 mt-0.5 leading-normal">{accessError}</p>
                </div>
              </div>
            )}

            {/* Room Announcement Banner (Visual-only representation) */}
            {activeRoom.announce && (
              <div className="bg-indigo-950/20 border-b border-indigo-900/30 px-4 py-2 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <p className="text-[11px] text-indigo-300 font-mono tracking-tight leading-normal">
                  <span className="font-bold uppercase text-[9px] tracking-wider text-pink-500">ANÚNCIO:</span> {activeRoom.announce}
                </p>
              </div>
            )}

            {/* POPUP OPTIONS BALLOON PANEL (Holds moderation actions, announcement editing, and active dice game) */}
            <AnimatePresence>
              {showRoomOptions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-4 mt-3 p-4 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl space-y-4 relative z-30"
                >
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      🛠️ Painel de Opções & Utilitários
                    </span>
                    <button 
                      onClick={() => setShowRoomOptions(false)}
                      className="text-[9px] text-slate-500 hover:text-slate-300 font-mono"
                    >
                      [Fechar Painel]
                    </button>
                  </div>

                  {/* Info da Sala & Membros - Telegram PC Style inside Options */}
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 space-y-2.5">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      <span className="font-semibold text-slate-300">Descrição:</span> {activeRoom.descricao || 'Sem descrição.'}
                    </p>
                    <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber-500/70" /> Dono: <span className="text-slate-400">Kelvin</span>
                      </span>
                      <span>•</span>
                      <span>{roomUsers.length} membros online</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-900/60">
                      <span className="text-[9px] font-mono uppercase text-indigo-400/80 font-bold">Na sala agora:</span>
                      {roomUsers.map(u => {
                        const isMe = u.id === currentUser.id;
                        return (
                          <span
                            key={u.id}
                            onClick={() => {
                              setShowRoomOptions(false);
                              onViewProfile(u.id);
                            }}
                            className="inline-flex items-center gap-0.5 bg-slate-950/80 border border-slate-800/80 rounded-md px-1.5 py-0.5 hover:bg-slate-850 cursor-pointer transition text-[10px]"
                            title={`Nível ${u.nivel} • ${u.cargo}`}
                          >
                            <span className={`${getCargoColorClasses(u.cargo)} font-medium`}>
                              {u.username}
                            </span>
                            {isMe && <span className="text-[8px] text-slate-600 ml-0.5">(Você)</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1. ANNOUNCEMENT MANAGEMENT SECTION */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Anúncio da Sala</label>
                      <span className="text-[9px] text-slate-500 font-mono">Dono & Admins</span>
                    </div>

                    {/* Editor Form for Authorized users */}
                    {(currentUser.id === activeRoom.dono_id || ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Chatroom Moderator', 'Chatroom Manager', 'Staff'].includes(currentUser.cargo)) ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={announceInput}
                          onChange={(e) => setAnnounceInput(e.target.value)}
                          placeholder="Mudar anúncio da sala... (ou envie o comando *anuncio no chat)"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-base lg:text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={async () => {
                            try {
                              await api.updateRoomAnnounce(activeRoom.id, announceInput.trim() || null);
                              const updated = db.salas.find(s => s.id === activeRoom.id);
                              if (updated) {
                                setActiveRoom({ ...updated });
                              }
                              await api.sendMessage(activeRoom.id, `📢 @${currentUser.username} alterou o anúncio da sala para: "${announceInput.trim() || '(vazio)'}"`, 'automatic');
                              alert('Anúncio atualizado com sucesso!');
                            } catch (err: any) {
                              alert(err.message || 'Erro ao atualizar anúncio.');
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          Salvar
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-900 italic">
                        {activeRoom.announce || 'Nenhum anúncio oficial ativo no momento.'}
                      </p>
                    )}
                  </div>

                  {/* 2. CHATROOM MODERATION CONTROLS (Only visible to Mods/Admins) */}
                  {(currentUser.cargo === 'Founder' || currentUser.cargo === 'Global Admin' || currentUser.cargo === 'Mentor' || currentUser.cargo === 'Mentor Head' || currentUser.cargo === 'Chatroom Moderator' || currentUser.cargo === 'Chatroom Manager') && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Ferramentas de Moderação</label>
                      <div className="flex gap-2.5">
                        {/* Silence Toggle */}
                        <button
                          onClick={handleToggleSilence}
                          className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            activeRoom.silence
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {activeRoom.silence ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                          {activeRoom.silence ? 'Desmutar Sala' : 'Silenciar Chat'}
                        </button>

                        {/* Lock Toggle */}
                        <button
                          onClick={handleToggleLockRoom}
                          className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            activeRoom.locked
                              ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {activeRoom.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {activeRoom.locked ? 'Desbloquear Sala' : 'Bloquear Entrada'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. MULTIPLAYER DICE GAME UTILITY */}
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Dices className="h-3.5 w-3.5 text-indigo-400 animate-pulse" /> Arena de Dados Multiplayer
                    </label>

                    {activeDiceGame ? (
                      <div className="p-3 bg-slate-900/60 border border-indigo-500/20 rounded-lg space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-indigo-300 block">
                              {activeDiceGame.status === 'lobby' ? '🎲 INSCRIÇÕES ABERTAS' : `⚔️ ROUND ${activeDiceGame.round} ATIVO`}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {activeDiceGame.status === 'lobby' 
                                ? `Inicia em ${activeDiceGame.time_left}s • Entrada: ${activeDiceGame.entry_fee} MZN`
                                : `Prêmio total: ${activeDiceGame.prize_pool} MZN`
                              }
                            </span>
                          </div>

                          <div>
                            {activeDiceGame.status === 'lobby' ? (
                              activeDiceGame.players.some((p: any) => p.id === currentUser.id) ? (
                                <span className="text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                                  ✓ Inscrito
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.joinRoomDiceGame(activeRoom.id);
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }}
                                  className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition"
                                >
                                  Entrar ({activeDiceGame.entry_fee} MZN)
                                </button>
                              )
                            ) : (
                              (() => {
                                const player = activeDiceGame.players.find((p: any) => p.id === currentUser.id);
                                if (!player) {
                                  return <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded">Espectador</span>;
                                }
                                if (player.eliminated) {
                                  return <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-1 rounded">💀 Eliminado</span>;
                                }
                                if (player.rolled) {
                                  return <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">Aguardando...</span>;
                                }
                                return (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.rollInRoomDiceGame(activeRoom.id);
                                      } catch (err: any) {
                                        alert(err.message);
                                      }
                                    }}
                                    className="text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded transition flex items-center gap-1"
                                  >
                                    Lançar Dados 🎲
                                  </button>
                                );
                              })()
                            )}
                          </div>
                        </div>

                        {/* Players list */}
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-950">
                          {activeDiceGame.players.map((p: any) => {
                            const hasRolled = p.rolled;
                            const diceEmojis = (num: number) => {
                              switch (num) {
                                case 1: return '⚀';
                                case 2: return '⚁';
                                case 3: return '⚂';
                                case 4: return '⚃';
                                case 5: return '⚄';
                                case 6: return '⚅';
                                default: return '🎲';
                              }
                            };
                            const rollDisplay = p.rolled && p.roll1 && p.roll2 ? `${diceEmojis(p.roll1)} ${diceEmojis(p.roll2)} (${p.score})` : '';

                            return (
                              <div 
                                key={p.id} 
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
                                  p.eliminated 
                                    ? 'bg-red-950/10 border-red-900/10 text-slate-600 line-through' 
                                    : hasRolled
                                      ? 'bg-emerald-950/15 border-emerald-500/20 text-emerald-400'
                                      : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                <span>{p.username}</span>
                                {p.eliminated ? (
                                  <span>💀</span>
                                ) : hasRolled ? (
                                  <span className="font-bold text-emerald-400">{rollDisplay}</span>
                                ) : (
                                  <span className="w-1 h-1 rounded-full bg-slate-500 animate-pulse" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-lg flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">Nenhuma partida aberta de dados. Começar nova:</span>
                        <div className="flex gap-1.5">
                          {[20, 50, 100].map(fee => (
                            <button
                              key={fee}
                              onClick={async () => {
                                try {
                                  await api.startRoomDiceGame(activeRoom.id, fee);
                                  await api.sendMessage(activeRoom.id, `🎲 **DADOS MULTIPLAYER INICIADO!** @${currentUser.username} abriu uma disputa de dados com taxa de entrada de **${fee} MZN**!\n⏱️ Você tem **50 segundos** para se inscrever! Digite \`*join\` ou clique no botão para entrar na arena de dados!`, 'automatic');
                                } catch (err: any) {
                                  alert(err.message);
                                }
                              }}
                              className="text-[10px] font-bold bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 px-2.5 py-1 rounded transition cursor-pointer"
                            >
                              +{fee} MZN
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. LEAVE ROOM BUTTON */}
                  <div className="pt-3 border-t border-slate-900 flex justify-end">
                    <button
                      onClick={async () => {
                        if (window.confirm('Tem certeza de que deseja sair desta sala de chat?')) {
                          setShowRoomOptions(false);
                          try {
                            await api.leaveRoom(activeRoom.id, currentUser.id, 'manual');
                            setActiveRoom(null);
                          } catch (err: any) {
                            console.error('Erro ao sair da sala:', err);
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/25 text-red-400 border border-red-500/20 rounded-lg px-3.5 py-1.5 text-xs font-bold transition duration-150 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sair da Sala de Chat
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Message Feed Container */}
            <div
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 bg-slate-950/15"
              style={{ overflowAnchor: 'auto' }}
            >
              <div className="text-center py-2">
                <span className="text-[10px] font-mono bg-slate-800/40 text-slate-500 px-2 py-0.5 rounded border border-slate-700/20">
                  Bem-vindo ao canal de mensagens criptografadas FCFUNZ
                </span>
              </div>

              {messages.length > visibleCount && (
                <div ref={sentinelRef} className="flex justify-center py-1">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/15 hover:border-indigo-500/25 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                    Carregar mensagens anteriores...
                  </button>
                </div>
              )}

              {messages.slice(-visibleCount).map((msg) => {
                const isSystem = msg.tipo === 'system' || msg.tipo === 'administrative';
                const isAutomatic = msg.tipo === 'automatic';

                if (isSystem) {
                  const entryMatch = msg.conteudo.match(/^([A-Z0-9_-]+)\s*\[(\d+)\]\s*ENTROU NA SALA$/i);
                  if (entryMatch) {
                    const username = entryMatch[1];
                    const nivel = entryMatch[2];
                    const profile = db.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
                    return (
                      <div key={msg.id} className="flex justify-center my-1.5">
                        <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 rounded-md px-3 py-1.5 text-center max-w-md flex items-center justify-center gap-1.5 flex-wrap">
                          <span className={`font-bold uppercase ${profile ? getCargoColorClasses(profile.cargo) : 'text-indigo-200'}`}>
                            {username}
                          </span>
                          <span className="text-amber-400 font-extrabold bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded text-[8px] tracking-tight">
                            Lvl {nivel}
                          </span>
                          {profile && <UserBadgesInline cargo={profile.cargo} className="scale-95" />}
                          <span className="text-indigo-400 font-bold tracking-wider">
                            ENTROU NA SALA
                          </span>
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 rounded-md px-3 py-1 text-center max-w-md">
                        {renderRichTextWithUsers(msg.conteudo)}
                      </span>
                    </div>
                  );
                }

                if (isAutomatic) {
                  const isShower = msg.conteudo.includes('GIFT SHOWER') || msg.conteudo.includes('🌊') || msg.conteudo.includes('SUPER CHUVA');
                  const isGift = msg.conteudo.includes('🎁') || msg.conteudo.includes('GIFT') || msg.conteudo.includes('💎') || msg.conteudo.includes('presenteou') || msg.conteudo.includes('enviou');
                  
                  if (isShower) {
                    const isBD = msg.conteudo.includes('💎') || msg.conteudo.includes('DIAMANTE') || msg.conteudo.includes('Diamond');
                    return (
                      <div key={msg.id} className="w-full flex justify-center my-3 px-4">
                        <div className={`relative overflow-hidden border-2 rounded-xl p-4 text-center max-w-lg flex flex-col items-center gap-1.5 w-full transition duration-300 hover:scale-102 ${
                          isBD 
                            ? 'bg-gradient-to-r from-cyan-950/60 via-indigo-950/60 to-blue-950/60 border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                            : 'bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-600/20 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        }`}>
                          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                            isBD ? 'from-cyan-400 via-blue-500 to-indigo-500' : 'from-yellow-400 via-pink-500 to-purple-500'
                          }`} />
                          
                          <div className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider animate-bounce ${
                            isBD ? 'bg-cyan-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                          }`}>
                            {isBD ? '💎 TEMPESTADE DE DIAMANTES NEGROS 💎' : '🌊 CHUVEIRO DE PRESENTES MAGNÍFICO 🌊'}
                          </div>
                          
                          <p className="text-xs font-bold text-white leading-relaxed whitespace-pre-line filter drop-shadow">
                            {renderRichTextWithUsers(msg.conteudo)}
                          </p>
                          
                          <div className={`text-[10px] font-mono mt-0.5 ${isBD ? 'text-cyan-300' : 'text-amber-300'}`}>
                            {isBD ? '✨ Um espetáculo luxuoso no chat do FCFUNZ! ✨' : '✨ Sinta a chuva de generosidade no FCFUNZ! ✨'}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (isGift) {
                    const isBD = msg.conteudo.includes('💎') || msg.conteudo.includes('DIAMANTE') || msg.conteudo.includes('Diamond');
                    return (
                      <div key={msg.id} className="w-full flex justify-center my-2 px-4">
                        <div className={`border rounded-lg p-3 text-center max-w-md shadow-md flex items-center gap-2.5 justify-center w-full transition duration-300 hover:scale-102 ${
                          isBD
                            ? 'bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-indigo-950/40 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                            : 'bg-gradient-to-r from-purple-950/40 via-indigo-950/50 to-purple-950/40 border-purple-500/40'
                        }`}>
                          <span className="text-2xl animate-pulse">{isBD ? '💎' : '🎁'}</span>
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-relaxed ${isBD ? 'text-cyan-200' : 'text-purple-200'}`}>
                              {renderRichTextWithUsers(msg.conteudo)}
                            </p>
                            <span className={`text-[9px] font-mono uppercase tracking-wider block mt-0.5 ${isBD ? 'text-cyan-400' : 'text-indigo-400'}`}>
                              {isBD ? '✦ Prestígio & Nobreza no FCFUNZ ✦' : '✦ Generosidade no chat retrô FCFUNZ ✦'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isDiceMsg = msg.conteudo.includes('DADOS') || msg.conteudo.includes('🎲') || msg.conteudo.includes('DUELO') || msg.conteudo.includes('DADO') || msg.conteudo.includes('venceu') || msg.conteudo.includes('VENCEDOR');
                  if (isDiceMsg) {
                    return (
                      <div key={msg.id} className="w-full flex justify-center my-2.5 px-4">
                        <div className="bg-gradient-to-br from-slate-950 via-blue-950/60 to-indigo-950/70 border border-blue-500/40 rounded-xl p-4 text-left max-w-md w-full shadow-[0_0_15px_rgba(59,130,246,0.25)] relative overflow-hidden">
                          <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                          {parseDiceMessageContent(msg.conteudo)}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/15 rounded-md px-3 py-1 text-center max-w-md">
                        {msg.conteudo}
                      </span>
                    </div>
                  );
                }

                const isMe = msg.autor_id === currentUser.id;

                return (
                  <div 
                    key={msg.id} 
                    className={`flex items-start gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* User Avatar */}
                    <img 
                      src={msg.autor_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.autor_username}`} 
                      alt={msg.autor_username}
                      onClick={() => onViewProfile(msg.autor_id)}
                      className="w-8 h-8 rounded-full border border-slate-800 object-cover cursor-pointer hover:scale-105 transition"
                    />

                    <div>
                      {/* Name Header */}
                      <div className={`flex items-center gap-1.5 text-[11px] mb-0.5 flex-wrap ${isMe ? 'justify-end' : ''}`}>
                        <span 
                          onClick={() => onViewProfile(msg.autor_id)}
                          className={`font-semibold cursor-pointer hover:underline flex items-center gap-1 ${getCargoColorClasses(msg.autor_cargo || 'Unverified User')}`}
                        >
                          {msg.autor_username}
                          <UserBadgesInline cargo={msg.autor_cargo || 'Unverified User'} className="ml-1" />
                        </span>
                        
                        {/* Cargo custom badge */}
                        <span className={`text-[8px] px-1 rounded scale-95 uppercase font-bold tracking-tight ${getCargoLabelStyle(msg.autor_cargo || 'Unverified User')}`}>
                          {msg.autor_cargo}
                        </span>

                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(msg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Msg text bubble */}
                      <div className={`rounded-xl px-3.5 py-2 text-xs leading-relaxed border transition-all duration-300 ${
                        isMe 
                          ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-100 rounded-tr-none' 
                          : 'bg-slate-900/60 border-slate-800 text-slate-200 rounded-tl-none'
                      } ${msg.cor ? 'shadow-[0_0_10px_rgba(99,102,241,0.12)] border-indigo-500/40' : ''}`}>
                        {msg.conteudo.startsWith('[ST_') && msg.conteudo.endsWith(']') ? (
                          <div className="flex flex-col items-center p-2 bg-slate-950/80 border border-indigo-500/20 rounded-xl shadow-md hover:scale-105 transition cursor-default">
                            <span className="text-4xl filter drop-shadow-md select-none animate-bounce" style={{ animationDuration: '3s' }}>
                              {msg.conteudo.substring(4, msg.conteudo.length - 1)}
                            </span>
                            <span className="text-[8px] font-mono text-indigo-400 mt-1 uppercase tracking-wider font-bold">Sticker Retro 🎨</span>
                          </div>
                        ) : (
                          <p 
                            style={msg.cor && msg.cor.startsWith('#') ? { color: msg.cor } : undefined}
                            className={msg.cor ? `${!msg.cor.startsWith('#') ? msg.cor : ''} font-bold` : ''}
                          >
                            {renderRichTextWithUsers(msg.conteudo)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form with Command suggestions & emoticons */}
            <form onSubmit={handleSendMessage} className="p-2 sm:p-3 border-t border-slate-800 bg-slate-950/40 relative">

              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojis(!showEmojis);
                    setShowCommands(false);
                    setShowGiftPanel(false);
                  }}
                  className={`p-2 rounded-lg border transition ${showEmojis ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'}`}
                  title="Emojis"
                >
                  <Smile className="h-4.5 w-4.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowGiftPanel(!showGiftPanel);
                    setShowEmojis(false);
                    setShowCommands(false);
                    // Select a default target from participants if not set
                    if (!giftTargetId && roomUsers.length > 0) {
                      const otherUser = roomUsers.find(u => u.id !== currentUser.id);
                      if (otherUser) setGiftTargetId(otherUser.id);
                    }
                  }}
                  className={`p-2 rounded-lg border transition ${showGiftPanel ? 'bg-pink-600/10 border-pink-500/30 text-pink-400' : 'bg-slate-900 border-slate-800 text-pink-500 hover:text-pink-400'}`}
                  title="Enviar Presente Rápido"
                >
                  <Gift className="h-4.5 w-4.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCommands(!showCommands);
                    setShowEmojis(false);
                    setShowGiftPanel(false);
                  }}
                  className={`p-2 rounded-lg border transition flex items-center gap-1 shrink-0 ${showCommands ? 'bg-amber-600/10 border-amber-500/30 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'}`}
                  title="Comandos da Sala"
                >
                  <Zap className="h-4.5 w-4.5" />
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wide hidden sm:inline">Comandos</span>
                </button>

                {showGiftPanel && (
                  <div className="absolute bottom-12 left-0 w-80 max-w-[calc(100vw-2.5rem)] p-4 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl z-50 flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
                      <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                        🎁 Enviar Presente Rápido
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowGiftPanel(false)} 
                        className="text-[9px] text-slate-500 hover:text-slate-300 font-mono"
                      >
                        [Fechar]
                      </button>
                    </div>

                    {/* Sub tabs to choose mode */}
                    <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setGiftPanelMode('individual')}
                        className={`flex-1 py-1 rounded-md transition text-center ${
                          giftPanelMode === 'individual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setGiftPanelMode('all')}
                        className={`flex-1 py-1 rounded-md transition text-center ${
                          giftPanelMode === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Para Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setGiftPanelMode('shower')}
                        className={`flex-1 py-1 rounded-md transition text-center ${
                          giftPanelMode === 'shower' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Chuveiro 🌊
                      </button>
                    </div>

                    {/* Dynamic Inputs based on mode */}
                    {giftPanelMode === 'individual' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Destinatário:</label>
                        <select
                          value={giftTargetId}
                          onChange={(e) => setGiftTargetId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-medium"
                        >
                          <option value="">-- Selecione um usuário na sala --</option>
                          {roomUsers.filter(u => u.id !== currentUser.id).map(u => (
                            <option key={u.id} value={u.id}>
                              {u.username} ({u.cargo})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {giftPanelMode === 'all' && (
                      <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-2 text-[10px] text-slate-400 leading-normal">
                        🎁 O presente selecionado será enviado para **todos os {roomUsers.filter(u => u.id !== currentUser.id).length} usuários ativos** na sala ao mesmo tempo!
                      </div>
                    )}

                    {giftPanelMode === 'shower' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Mimos por Pessoa (Chuveiro):</label>
                        <select
                          value={giftShowerQty}
                          onChange={(e) => setGiftShowerQty(parseInt(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-medium"
                        >
                          <option value="2">2x presentes para cada participante</option>
                          <option value="3">3x presentes (Super Shower)</option>
                          <option value="5">5x presentes (Mega Shower)</option>
                          <option value="10">10x presentes (Tempestade ⚡)</option>
                          <option value="25">25x presentes (Tsunami de Mimos 🌊)</option>
                        </select>
                      </div>
                    )}

                    {/* Gift Item Selector Grid */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Presente:</label>
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                        {api.getGifts().map(g => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGiftId(g.id)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition ${
                              selectedGiftId === g.id 
                                ? 'bg-pink-600/10 border-pink-500 text-pink-300' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                            }`}
                          >
                            <span className="text-xl filter drop-shadow-sm select-none">{g.imagem}</span>
                            <span className="text-[8px] font-bold mt-1 text-center truncate w-full">{g.nome}</span>
                            <span className="text-[8px] font-mono text-amber-500 font-semibold mt-0.5">{g.valor} MZN</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Status */}
                    {giftStatus && (
                      <div className={`p-2 rounded-lg text-[10px] font-medium leading-tight text-center ${
                        giftStatus.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                      }`}>
                        {giftStatus.success || giftStatus.error}
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={isSendingGift || !selectedGiftId || (giftPanelMode === 'individual' && !giftTargetId)}
                      onClick={handleSendInlineGift}
                      className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg transition shadow-lg shadow-pink-600/15"
                    >
                      {isSendingGift ? 'Enviando presente...' : 'Enviar Presente'}
                    </button>
                  </div>
                )}

                {showEmojis && (
                  <div className="absolute bottom-12 left-0 w-72 max-w-[calc(100vw-2.5rem)] sm:w-72 p-3 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl z-40 flex flex-col gap-2.5">
                    {/* Keyboard Tabs */}
                    <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/65 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEmojiKeyboardTab('standard')}
                        className={`flex-1 py-1 rounded-md transition text-center ${
                          emojiKeyboardTab === 'standard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Padrão
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmojiKeyboardTab('exclusive')}
                        className={`flex-1 py-1 rounded-md transition text-center flex items-center justify-center gap-0.5 ${
                          emojiKeyboardTab === 'exclusive' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Exclusivos 💎
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmojiKeyboardTab('stickers')}
                        className={`flex-1 py-1 rounded-md transition text-center flex items-center justify-center gap-0.5 ${
                          emojiKeyboardTab === 'stickers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Stickers 🎨
                      </button>
                    </div>

                    {/* Keyboard Content */}
                    <div className="max-h-48 overflow-y-auto pr-1">
                      {emojiKeyboardTab === 'standard' && (
                        <div className="grid grid-cols-6 gap-1.5">
                          {EMOJIS.map(em => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => setNewMessage(prev => prev + em)}
                              className="text-lg hover:scale-125 active:scale-95 p-1 transition flex items-center justify-center"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}

                      {emojiKeyboardTab === 'exclusive' && (
                        <div className="space-y-3">
                          {(!currentUser.purchased_emojis || currentUser.purchased_emojis.length === 0) ? (
                            <div className="text-center py-4 px-2 space-y-1.5">
                              <span className="text-xl">🔒</span>
                              <p className="text-[10px] text-slate-400 font-medium">Nenhum pacote exclusivo adquirido.</p>
                              <p className="text-[9px] text-slate-500">Visite a <strong className="text-amber-400 font-mono">Loja Virtual</strong> para desbloquear emojis cosmo e VIPs!</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {currentUser.purchased_emojis.includes('basic_emojis') && (
                                <div>
                                  <p className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1">Pacote de Emojis Exclusivos</p>
                                  <div className="grid grid-cols-6 gap-1.5 bg-slate-900/40 p-1.5 rounded-lg border border-slate-850">
                                    {['💎', '👑', '🌈', '🦄', '🌟', '🔮', '🔱', '🧿', '🧬', '🧪', '🌡️', '🪐', '🌌', '☄️', '🛸'].map(em => (
                                      <button
                                        key={em}
                                        type="button"
                                        onClick={() => setNewMessage(prev => prev + em)}
                                        className="text-lg hover:scale-125 p-0.5 transition"
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {currentUser.purchased_emojis.includes('vip_emojis') && (
                                <div>
                                  <p className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1">Pacote Emojis VIPs</p>
                                  <div className="grid grid-cols-6 gap-1.5 bg-slate-900/40 p-1.5 rounded-lg border border-slate-850">
                                    {['💫', '⚜️', '🔱', '👑', '🥂', '🍿', '🎰', '🎯', '🎮', '👾', '🎸', '🎷', '🎹', '🎬', '🎭', '🎪', '🎟️', '🏅', '🏆', '🥇', '🥈', '🥉'].map(em => (
                                      <button
                                        key={em}
                                        type="button"
                                        onClick={() => setNewMessage(prev => prev + em)}
                                        className="text-lg hover:scale-125 p-0.5 transition"
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {emojiKeyboardTab === 'stickers' && (
                        <div className="space-y-3">
                          {(!currentUser.purchased_stickers || currentUser.purchased_stickers.length === 0) ? (
                            <div className="text-center py-4 px-2 space-y-1.5">
                              <span className="text-xl">🔒</span>
                              <p className="text-[10px] text-slate-400 font-medium">Nenhum sticker adquirido.</p>
                              <p className="text-[9px] text-slate-500">Visite a <strong className="text-amber-400 font-mono">Loja Virtual</strong> para desbloquear pacotes de stickers premium!</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {currentUser.purchased_stickers.includes('basic_stickers') && (
                                <div>
                                  <p className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1">Stickers Básicos</p>
                                  <div className="grid grid-cols-5 gap-1.5 bg-slate-900/40 p-1.5 rounded-lg border border-slate-850">
                                    {['🐶', '🐱', '🦊', '🦁', '🐯', '🐼', '🐨', '🐻', '🐷', '🐸'].map(st => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={async () => {
                                          await api.sendMessage(activeRoom?.id || 'r1', `[ST_${st}]`, 'normal');
                                          setShowEmojis(false);
                                        }}
                                        className="text-2xl hover:scale-125 p-1 transition bg-slate-950 border border-slate-800 rounded flex items-center justify-center"
                                        title="Clique para enviar sticker instantâneo"
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {currentUser.purchased_stickers.includes('premium_stickers') && (
                                <div>
                                  <p className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1">Stickers Premium</p>
                                  <div className="grid grid-cols-5 gap-1.5 bg-slate-900/40 p-1.5 rounded-lg border border-slate-850">
                                    {['🦄', '🐲', '🐙', '🐵', '🐔', '🐧', '🐦', '🐤', '🐺', '🐗', '🐴', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🐠', '🐳', '🐬', '🐪', '🐘', '🐐', '🐏', '🐎', '🐖', '🐕', '🐈', '🐇'].map(st => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={async () => {
                                          await api.sendMessage(activeRoom?.id || 'r1', `[ST_${st}]`, 'normal');
                                          setShowEmojis(false);
                                        }}
                                        className="text-2xl hover:scale-125 p-1 transition bg-slate-950 border border-slate-800 rounded flex items-center justify-center"
                                        title="Clique para enviar sticker instantâneo"
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {currentUser.purchased_stickers.includes('special_stickers') && (
                                <div>
                                  <p className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1">Stickers Especiais</p>
                                  <div className="grid grid-cols-5 gap-1.5 bg-slate-900/40 p-1.5 rounded-lg border border-slate-850">
                                    {['👾', '👽', '👻', '🤖', '🎃', '🧙', '🧚', '🧛', '🛸', '🚀', '🔥', '💥', '⚡', '✨', '🌈'].map(st => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={async () => {
                                          await api.sendMessage(activeRoom?.id || 'r1', `[ST_${st}]`, 'normal');
                                          setShowEmojis(false);
                                        }}
                                        className="text-2xl hover:scale-125 p-1 transition bg-slate-950 border border-slate-800 rounded flex items-center justify-center"
                                        title="Clique para enviar sticker instantâneo"
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showCommands && (
                  <div className="absolute bottom-12 left-0 w-80 max-w-[calc(100vw-2.5rem)] max-h-64 sm:max-h-96 overflow-y-auto p-4 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl z-45 space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <Zap className="h-3 w-3 text-indigo-400" /> Menu de Comandos da Sala
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowCommands(false)} 
                        className="text-[9px] text-slate-500 hover:text-slate-300 font-mono"
                      >
                        [Fechar]
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Categoria Jogos */}
                      <div>
                        <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">JOGOS DA SALA 🎲</p>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => { setNewMessage('*start 10 dice'); setShowCommands(false); }}
                            className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700 transition text-[11px] flex justify-between items-center"
                          >
                            <span className="font-mono text-slate-200">*start [valor] dice</span>
                            <span className="text-[9px] text-indigo-400">Dice Multiplayer</span>
                          </button>
                        </div>
                      </div>

                      {/* Categoria Moedas */}
                      <div>
                        <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">AÇÕES FINANCEIRAS 💰</p>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => { setNewMessage('*tempestade 3 rosa'); setShowCommands(false); }}
                            className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700 transition text-[11px] flex justify-between items-center"
                          >
                            <span className="font-mono text-slate-200">*tempestade [quant] [presente]</span>
                            <span className="text-[9px] text-amber-400">Tempestade de Mimos ⚡</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setNewMessage('*rapollo '); setShowCommands(false); }}
                            className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700 transition text-[11px] flex justify-between items-center"
                          >
                            <span className="font-mono text-slate-200">*rapollo [voucher]</span>
                            <span className="text-[9px] text-emerald-400">Resgatar Voucher</span>
                          </button>
                        </div>
                      </div>

                      {/* Categoria Admin */}
                      {(currentUser.cargo === 'Founder' || currentUser.cargo === 'Global Admin' || currentUser.cargo === 'Mentor' || currentUser.cargo === 'Mentor Head') && (
                        <div>
                          <p className="text-[9px] font-mono font-bold text-rose-500 uppercase tracking-wider mb-1">MODERAÇÃO / ADMINISTRAÇÃO ⚡</p>
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => { setNewMessage('*apollo 100'); setShowCommands(false); }}
                              className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-rose-950/20 border border-slate-800/60 hover:border-rose-900/40 transition text-[11px] flex justify-between items-center"
                            >
                              <span className="font-mono text-rose-300">*apollo [mzn]</span>
                              <span className="text-[9px] text-rose-400 font-mono">Gerar Voucher</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  placeholder={activeRoom.silence && currentUser.cargo === 'Unverified User' ? "Sala silenciada pelo moderador" : "Digite uma mensagem ou comando (*)..."}
                  value={newMessage}
                  disabled={activeRoom.silence && currentUser.cargo === 'Unverified User'}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className={`flex-1 rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-base lg:text-xs placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 ${selectedColor ? `${selectedColor} font-bold` : 'text-slate-200'}`}
                />

                <button
                  type="submit"
                  disabled={!newMessage.trim() || (activeRoom.silence && currentUser.cargo === 'Unverified User')}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium p-2.5 rounded-lg transition"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Custom message text color picker - Only visible if user has an active purchased color */}
              {currentUser.purchased_text_color && currentUser.purchased_text_color_expires_at && new Date(currentUser.purchased_text_color_expires_at) > new Date() ? (
                <div className="flex items-center gap-1.5 mt-2 px-1">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mr-1">Cor da Mensagem:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedColor('')}
                    className={`w-3.5 h-3.5 rounded-full border transition hover:scale-115 ${selectedColor === '' ? 'border-white bg-slate-200' : 'border-slate-800 bg-slate-400'}`}
                    title="Padrão (Slate)"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedColor(currentUser.purchased_text_color || '')}
                    className={`w-4 h-4 rounded-full border border-slate-700 transition hover:scale-115 relative flex items-center justify-center`}
                    style={{ backgroundColor: currentUser.purchased_text_color }}
                    title={`Sua Cor Comprada (${currentUser.purchased_text_color}) 🛍️`}
                  >
                    {selectedColor === currentUser.purchased_text_color && (
                      <span className="h-1 w-1 bg-white rounded-full" />
                    )}
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] filter drop-shadow">🛍️</span>
                  </button>
                </div>
              ) : null}
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {accessError ? (
              <div className="max-w-md bg-red-500/5 border border-red-500/20 rounded-xl p-6 shadow-xl animate-fade-in">
                <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <ShieldAlert className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-sm font-bold text-red-400">Limite de Salas Excedido</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {accessError}
                </p>
                
                <div className="mt-5 space-y-2 text-left">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Suas Salas Ativas Atuais:</p>
                  {db.room_participants.filter(p => p.user_id === currentUser.id).map(part => {
                    const room = rooms.find(r => r.id === part.sala_id);
                    if (!room) return null;
                    return (
                      <div key={room.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/60 p-2.5 rounded-lg text-xs">
                        <span className="font-semibold text-slate-300 truncate">💬 {room.nome}</span>
                        <button
                          onClick={async () => {
                            try {
                              await api.leaveRoom(room.id, currentUser.id, 'manual');
                              setRooms([...db.salas]);
                              setOnlineUsers([...db.profiles]);
                              setAccessError(null);
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                        >
                          Sair desta Sala
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <MessageSquare className="h-10 w-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma sala ativa</p>
                <p className="text-xs text-slate-500 mt-1">Selecione ou crie uma sala na barra esquerda para iniciar.</p>
              </>
            )}
          </div>
        )}
      </div>



      {/* Room Creation Dialog Modal */}
      <AnimatePresence>
        {showRoomCreator && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" /> Criar Nova Sala FCFUNZ
                </h3>
                <button onClick={() => setShowRoomCreator(false)} className="text-slate-500 hover:text-slate-300 text-xs font-mono">Fechar</button>
              </div>

              <form onSubmit={handleCreateRoom} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Nome da Sala</label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Ex: Arena Dice *bot 🎲"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-base lg:text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Descrição</label>
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="Ex: Local oficial para minijogos e conversas"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-base lg:text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={newRoomCat}
                    onChange={(e) => setNewRoomCat(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'My Rooms').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRoomCreator(false)}
                    className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs text-slate-400 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition"
                  >
                    Criar Sala
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
