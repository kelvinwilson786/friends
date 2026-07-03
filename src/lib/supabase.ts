/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { 
  Profile, 
  Sala, 
  Mensagem, 
  Amizade, 
  MensagemPrivada, 
  Tweet, 
  TweetComment, 
  ApolloCode,
  Gift,
  UserCargo,
  AppNotification,
  MultiplayerDicePlayer,
  MultiplayerDiceGame,
  Transaction,
  VaquinhaContribution,
  LeaderboardCompetition
} from '../types';

// Read credentials from env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if we should use the real Supabase client
export const isUsingRealSupabase = !!(supabaseUrl && supabaseAnonKey);

const realSupabase = isUsingRealSupabase 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// ==========================================
// HIGH-FIDELITY LOCAL STATE FALLBACK ENGINE
// ==========================================
// This acts as a fully-featured local backend in case Supabase keys aren't configured yet,
// so the user can play with the entire app (chat, games, virtual economy, social feed, admin panel) instantly!

const DEFAULT_GIFT_CATALOG: Gift[] = [
  { id: 'g_love', nome: 'Love', imagem: '💖', valor: 0.1 },
  { id: 'g1', nome: 'Rosa Vermelha', imagem: '🌹', valor: 5 },
  { id: 'g2', nome: 'Café Quente', imagem: '☕', valor: 10 },
  { id: 'g3', nome: 'Pizza de Pepperoni', imagem: '🍕', valor: 25 },
  { id: 'g4', nome: 'Ursinho de Pelúcia', imagem: '🧸', valor: 50 },
  { id: 'g5', nome: 'Poção Mágica', imagem: '🧪', valor: 100 },
  { id: 'g6', nome: 'Estrela Cintilante', imagem: '⭐', valor: 200 },
  { id: 'g7', nome: 'Carro Clássico', imagem: '🚗', valor: 500 },
  { id: 'g8', nome: 'Coroa Imperial', imagem: '👑', valor: 1000 },
];

const SEED_PROFILES: Profile[] = [
  {
    id: 'u1',
    username: 'Kelvin',
    nome: 'Kelvin',
    sobrenome: 'Wilson',
    pais: 'MZ',
    sexo: 'M',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    cargo: 'Founder',
    nivel: 10,
    xp: 950,
    credits: 100, // starting credit as requested
    bonus: 20,
    points: 15,
    criado_em: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    password: '123',
    security_question: 'Qual o nome do seu primeiro animal de estimação?',
    security_answer: 'Rex'
  },
  {
    id: 'u2',
    username: 'Carlos_Mentor',
    nome: 'Carlos',
    sobrenome: 'Silva',
    pais: 'BR',
    sexo: 'M',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    cargo: 'Mentor', // Red name
    nivel: 8,
    xp: 720,
    credits: 500,
    bonus: 100,
    points: 80,
    criado_em: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    password: '123',
    security_question: 'Qual a sua cidade natal?',
    security_answer: 'Maputo'
  },
  {
    id: 'u3',
    username: 'Sara_Merchant',
    nome: 'Sara',
    sobrenome: 'Santos',
    pais: 'PT',
    sexo: 'F',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    cargo: 'Merchant', // Purple name
    nivel: 7,
    xp: 610,
    credits: 1500,
    bonus: 250,
    points: 120,
    criado_em: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    password: '123',
    security_question: 'Qual a sua comida favorita?',
    security_answer: 'Pizza'
  },
  {
    id: 'u4',
    username: 'Guide_Ana',
    nome: 'Ana',
    sobrenome: 'Gomes',
    pais: 'BR',
    sexo: 'F',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    cargo: 'Guide',
    nivel: 5,
    xp: 400,
    credits: 250,
    bonus: 50,
    points: 30,
    criado_em: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    password: '123',
    security_question: 'Qual o nome da sua mãe?',
    security_answer: 'Maria'
  },
  {
    id: 'u_casa',
    username: 'Casa_FCFUNZ',
    nome: 'Caixa',
    sobrenome: 'Público',
    pais: 'MZ',
    sexo: 'M',
    avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=casa',
    cargo: 'Verified User',
    nivel: 100,
    xp: 0,
    credits: 50000,
    bonus: 0,
    points: 0,
    criado_em: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    password: 'casa_fcfunz_secret',
    security_question: 'Qual a fundação?',
    security_answer: 'FCFUNZ'
  }
];

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 't_init_1',
    user_id: 'u1',
    type: 'access_bonus',
    amount: 100,
    description: 'Bônus de Boas-Vindas FCFUNZ Premium',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 't_init_2',
    user_id: 'u2',
    type: 'access_bonus',
    amount: 500,
    description: 'Bônus de Boas-Vindas FCFUNZ Premium',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 't_init_3',
    user_id: 'u3',
    type: 'access_bonus',
    amount: 1500,
    description: 'Depósito Inicial de Fundos Virtuais',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 't_init_4',
    user_id: 'u4',
    type: 'access_bonus',
    amount: 2500,
    description: 'Depósito Inicial de Fundos Virtuais',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

const SEED_VAQUINHA: VaquinhaContribution[] = [
  {
    id: 'vq1',
    user_id: 'u4',
    username: 'Guide_Ana',
    phone_number: '841112223',
    amount_mt: 200,
    transaction_id: 'TX998231',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'vq2',
    user_id: 'u2',
    username: 'Carlos_Mentor',
    phone_number: '824445556',
    amount_mt: 500,
    transaction_id: 'TX887211',
    status: 'approved',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    approved_by: 'Kelvin',
    approved_at: new Date(Date.now() - 3600000 * 23).toISOString()
  }
];

const SEED_SALAS: Sala[] = [
  {
    id: 's1',
    nome: 'Chat Principal FCFUNZ 🚀',
    descricao: 'A sala de bate-papo oficial do FCFUNZ. Bem-vindos de volta a 2015!',
    categoria: 'Official Rooms',
    capacidade: 100,
    dono_id: 'u1',
    criado_em: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    announce: 'Sejam educados e aproveitem os minijogos! Use *bot dice para jogar dados.',
    silence: false,
    silence_by: null,
    bot: true,
    treasure_number: null,
    treasure_amount: null,
    treasure_by: null,
    quiz_question: 'Qual o ano de lançamento do FCFUNZ original?',
    quiz_answer: '2015',
    quiz_amount: 50,
    quiz_by: 'u1',
  },
  {
    id: 's2',
    nome: 'Lounge dos Gamers 🎮',
    descricao: 'Bate-papo focado em jogos, apostas e discussões técnicas.',
    categoria: 'Gaming Rooms',
    capacidade: 50,
    dono_id: 'u2',
    criado_em: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    announce: 'Desafie seus amigos no minijogo Lowroll com o comando de dados!',
    silence: false,
    silence_by: null,
    bot: false,
    treasure_number: null,
    treasure_amount: null,
    treasure_by: null,
    quiz_question: null,
    quiz_answer: null,
    quiz_amount: null,
    quiz_by: null,
  },
  {
    id: 's3',
    nome: 'Mercado de Trocas 💎',
    descricao: 'Espaço dedicado a compra e venda de itens, doações de presentes e negócios virtuais.',
    categoria: 'Hot Rooms',
    capacidade: 80,
    dono_id: 'u3',
    criado_em: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    announce: 'Negocie de forma justa. Adquira novas cores de chat com a Sara_Merchant!',
    silence: false,
    silence_by: null,
    bot: false,
    treasure_number: null,
    treasure_amount: null,
    treasure_by: null,
    quiz_question: null,
    quiz_answer: null,
    quiz_amount: null,
    quiz_by: null,
  }
];

const SEED_MENSAGENS: Mensagem[] = [
  {
    id: 'm1',
    sala_id: 's1',
    autor_id: 'u2',
    conteudo: 'Olá a todos! Sejam muito bem-vindos ao novo FCFUNZ modernizado.',
    tipo: 'normal',
    criado_em: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm2',
    sala_id: 's1',
    autor_id: 'u3',
    conteudo: 'Os presentes e as cores customizadas já estão funcionando na loja!',
    tipo: 'normal',
    criado_em: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm3',
    sala_id: 's1',
    autor_id: 'u1',
    conteudo: 'Incrível! Que nostalgia ver tudo isso de volta com um design moderno.',
    tipo: 'normal',
    criado_em: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  }
];

const SEED_TWEETS: Tweet[] = [
  {
    id: 't1',
    user_id: 'u1',
    content: 'Sejam bem-vindos ao FCFUNZ Retro! 🌟 Nossa missão é recriar o espaço social virtual mais divertido e nostálgico. Aqui você pode acumular moedas em MZN (Créditos Npr), participar de salas de bate-papo exclusivas com recursos interativos, e colecionar emblemas e patentes lendárias. Lembre-se de conferir nossa nova aba de "Preços mzn" para adquirir saldo com total segurança diretamente com a administração oficial!',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    video_url: null,
    likes_count: 18,
    dislikes_count: 0,
    comments_count: 2,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 't2',
    user_id: 'u2',
    content: '💡 GUIA DE SEGURANÇA & SUPORTE: Olá pessoal, eu sou o Carlos, Mentor Head da comunidade. Minha função e a dos demais mentores é garantir um ambiente saudável. Lembrem-se: nunca realizem transações particulares com usuários não credenciados fora do nosso ecossistema oficial. O preço de créditos oficial é tabelado e transparente. Caso precisem de ajuda, utilizem os comandos da sala ou entrem em contato direto pelo telefone oficial da administração!',
    image_url: null,
    video_url: null,
    likes_count: 14,
    dislikes_count: 0,
    comments_count: 0,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 't3',
    user_id: 'u3',
    content: '🛍️ PARCERIAS & LOJA DE PRESENTES: Quer destacar seu perfil? Na nossa Loja Oficial você pode adquirir emblemas especiais, caixas misteriosas FC Box, presentes interativos para enviar a outros usuários e muito mais! Além disso, se você for um Merchant credenciado, poderá comercializar itens e códigos com bônus exclusivos. Fiquem atentos aos sorteios de Apollo Codes de 5 dígitos na nossa linha do tempo!',
    image_url: 'https://images.unsplash.com/photo-1472851294608-062f824d296e?auto=format&fit=crop&w=800&q=80',
    video_url: null,
    likes_count: 11,
    dislikes_count: 1,
    comments_count: 0,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 't4',
    user_id: 'u4',
    content: '🎮 SALAS DE CHAT INTERATIVAS: Bem-vindos ao Bate-Papo! Nossas salas possuem comandos interativos fantásticos! Digite *ajuda ou *commands no chat para listar comandos como *dice, *kiss, *shower (que distribui pontos), *shutup, *kick e muito mais. Divirtam-se interagindo e lembrem-se de que a inatividade prolongada (+6 minutos) desconecta você automaticamente da sala para manter a vaga livre para novos membros!',
    image_url: null,
    video_url: null,
    likes_count: 9,
    dislikes_count: 0,
    comments_count: 0,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  }
];

const SEED_COMMENTS: TweetComment[] = [
  {
    id: 'tc1',
    tweet_id: 't1',
    user_id: 'u3',
    content: 'Eu sentia muita falta do sistema de presentes e do comando *shower! Vamos distribuir muitos mzn!',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tc2',
    tweet_id: 't1',
    user_id: 'u4',
    content: 'Muito bom ver essa evolução! O chat está super rápido.',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const SEED_AMIZADES: Amizade[] = [
  {
    id: 'am1',
    solicitante_id: 'u1',
    destinatario_id: 'u2',
    status: 'aceito',
    criado_em: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'am2',
    solicitante_id: 'u1',
    destinatario_id: 'u3',
    status: 'aceito',
    criado_em: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'am3',
    solicitante_id: 'u4',
    destinatario_id: 'u1',
    status: 'pendente',
    criado_em: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const SEED_PRIVATEMSGS: MensagemPrivada[] = [
  {
    id: 'pm1',
    remetente_id: 'u2',
    destinatario_id: 'u1',
    conteudo: 'Olá Kelvin, configurei o bot da sala 1. Está pronto para rodar os dados!',
    lida: true,
    criado_em: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pm2',
    remetente_id: 'u1',
    destinatario_id: 'u2',
    conteudo: 'Excelente trabalho, Carlos! Obrigado.',
    lida: false,
    criado_em: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  }
];

const SEED_CODES: ApolloCode[] = [
  {
    id: 'c1',
    code: 12345,
    amount: 150,
    created_by: 'u1',
    status: 'active',
    redeemed_by: null,
    redeemed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c2',
    code: 99999,
    amount: 500,
    created_by: 'u1',
    status: 'active',
    redeemed_by: null,
    redeemed_at: null,
    created_at: new Date().toISOString(),
  }
];

// Helper to initialize localStorage
const loadFromStorage = <T>(key: string, seed: T): T => {
  const data = localStorage.getItem(`fcfunz_${key}`);
  if (!data) {
    localStorage.setItem(`fcfunz_${key}`, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

const saveToStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(`fcfunz_${key}`, JSON.stringify(value));
};

// Simulated Local Database State
class LocalDB {
  profiles: Profile[] = [];
  salas: Sala[] = [];
  mensagens: Mensagem[] = [];
  tweets: Tweet[] = [];
  comments: TweetComment[] = [];
  amizades: Amizade[] = [];
  mensagensPrivadas: MensagemPrivada[] = [];
  apolloCodes: ApolloCode[] = [];
  notifications: AppNotification[] = [];
  diceGames: MultiplayerDiceGame[] = [];
  transactions: Transaction[] = [];
  banned_global: string[] = [];
  room_kicks: { user_id: string, sala_id: string, expires_at: string }[] = [];
  room_bans: { user_id: string, sala_id: string }[] = [];
  group_bans: { user_id: string, categoria: string }[] = [];
  favorites: { id: string, usuario_id: string, sala_id: string, criado_em: string }[] = [];
  room_participants: { id: string, user_id: string, sala_id: string, last_activity: string }[] = [];
  vaquinhaContributions: VaquinhaContribution[] = [];
  competitions: LeaderboardCompetition[] = [];
  credits_responsible_user_id: string = 'u1';
  credits_responsible_phone: string = '870870059';
  activeUserId: string = 'u1'; // Default logged in as Kelvin

  constructor() {
    this.profiles = loadFromStorage('profiles', SEED_PROFILES);
    // Initialize required progression fields if missing
    for (const p of this.profiles) {
      if (p.online_points === undefined) p.online_points = 0;
      if (p.black_diamonds === undefined) p.black_diamonds = 0;
      if (p.last_level_up_at === undefined) p.last_level_up_at = p.criado_em || new Date().toISOString();
      if (!p.password) p.password = '123';
      if (!p.security_question) p.security_question = 'Qual o nome do seu primeiro animal de estimação?';
      if (!p.security_answer) p.security_answer = 'Rex';
      if (!p.merchant_pin) p.merchant_pin = '1234';
    }

    this.salas = loadFromStorage('salas', SEED_SALAS);
    this.mensagens = loadFromStorage('mensagens', SEED_MENSAGENS);
    this.tweets = loadFromStorage('tweets', SEED_TWEETS);
    // Force reload if we don't have the new seed tweets to keep the workspace up to date
    if (!this.tweets.some(t => t.id === 't4')) {
      this.tweets = [...SEED_TWEETS];
      this.save();
    }
    this.comments = loadFromStorage('comments', SEED_COMMENTS);
    this.amizades = loadFromStorage('amizades', SEED_AMIZADES);
    this.mensagensPrivadas = loadFromStorage('mensagens_privadas', SEED_PRIVATEMSGS);
    this.apolloCodes = loadFromStorage('apollo_codes', SEED_CODES);
    this.notifications = loadFromStorage('notifications', []);
    this.diceGames = loadFromStorage('dice_games', []);
    this.transactions = loadFromStorage('transactions', SEED_TRANSACTIONS);
    this.banned_global = loadFromStorage('banned_global', []);
    this.room_kicks = loadFromStorage('room_kicks', []);
    this.room_bans = loadFromStorage('room_bans', []);
    this.group_bans = loadFromStorage('group_bans', []);
    this.favorites = loadFromStorage('favorites', []);
    this.room_participants = loadFromStorage('room_participants', []);
    this.vaquinhaContributions = loadFromStorage('vaquinha_contributions', SEED_VAQUINHA);
    this.competitions = loadFromStorage('competitions', []);
    
    this.credits_responsible_user_id = localStorage.getItem('fcfunz_credits_resp_user') || 'u1';
    this.credits_responsible_phone = localStorage.getItem('fcfunz_credits_resp_phone') || '870870059';
    
    const storedUser = localStorage.getItem('fcfunz_active_user_id');
    if (storedUser) {
      this.activeUserId = storedUser;
    } else {
      localStorage.setItem('fcfunz_active_user_id', 'u1');
    }

    this.checkMerchantExpirations();
  }

  checkMerchantExpirations() {
    let changed = false;
    for (const p of this.profiles) {
      if ((p.cargo === 'Mentor' || p.cargo === 'Super Merchant' || p.cargo === 'Merchant') && p.merchant_expires_at) {
        if (new Date(p.merchant_expires_at).getTime() < Date.now()) {
          const oldCargo = p.cargo;
          let newCargo: UserCargo = 'Verified User';
          
          if (oldCargo === 'Mentor') {
            newCargo = 'Super Merchant';
          } else if (oldCargo === 'Super Merchant') {
            newCargo = 'Merchant';
          } else if (oldCargo === 'Merchant') {
            newCargo = 'Verified User';
          }
          
          p.cargo = newCargo;
          
          if (newCargo !== 'Verified User') {
            // Set another 30 days for the decayed cargo tier to let them try to renew it
            p.merchant_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          } else {
            p.merchant_expires_at = undefined;
            p.merchant_creator_id = undefined;
          }
          
          changed = true;
          
          // Create notification
          const notif: AppNotification = {
            id: 'notif_exp_' + Math.random().toString(36).substr(2, 9),
            usuario_id: p.id,
            title: 'Rebaixamento de Cargo / Expiração ⏳',
            message: `Sua assinatura como ${oldCargo} expirou por não alcançar ou reativar com MPoints necessários. Você foi rebaixado para ${newCargo}. Complete as missões para manter seu cargo!`,
            type: 'system',
            read: false,
            criado_em: new Date().toISOString()
          };
          this.notifications.push(notif);
        }
      }
    }
    if (changed) {
      this.save();
    }
  }

  save() {
    saveToStorage('profiles', this.profiles);
    saveToStorage('salas', this.salas);
    saveToStorage('mensagens', this.mensagens);
    saveToStorage('tweets', this.tweets);
    saveToStorage('comments', this.comments);
    saveToStorage('amizades', this.amizades);
    saveToStorage('mensagens_privadas', this.mensagensPrivadas);
    saveToStorage('apollo_codes', this.apolloCodes);
    saveToStorage('notifications', this.notifications);
    saveToStorage('dice_games', this.diceGames);
    saveToStorage('transactions', this.transactions);
    saveToStorage('banned_global', this.banned_global);
    saveToStorage('room_kicks', this.room_kicks);
    saveToStorage('room_bans', this.room_bans);
    saveToStorage('group_bans', this.group_bans);
    saveToStorage('favorites', this.favorites);
    saveToStorage('room_participants', this.room_participants);
    saveToStorage('vaquinha_contributions', this.vaquinhaContributions);
    saveToStorage('competitions', this.competitions);
    localStorage.setItem('fcfunz_credits_resp_user', this.credits_responsible_user_id);
    localStorage.setItem('fcfunz_credits_resp_phone', this.credits_responsible_phone);
  }

  getActiveProfile(): Profile {
    return this.profiles.find(p => p.id === this.activeUserId) || this.profiles[0];
  }

  setActiveUser(id: string) {
    this.activeUserId = id;
    localStorage.setItem('fcfunz_active_user_id', id);
  }
}

export const db = new LocalDB();

// Simulated Real-Time callbacks
type ChatListener = (msg: Mensagem) => void;
type PMListener = (msg: MensagemPrivada) => void;
type ActionCallback = () => void;

const chatListeners = new Map<string, Set<ChatListener>>();
const pmListeners = new Set<PMListener>();
const updateListeners = new Set<ActionCallback>();

export const notifyUpdate = () => {
  db.save();
  updateListeners.forEach(cb => cb());
};

export const logTransaction = (userId: string, type: Transaction['type'], amount: number, description: string) => {
  const tx: Transaction = {
    id: 'tx_' + Math.random().toString(36).substr(2, 9),
    user_id: userId,
    type,
    amount,
    description,
    timestamp: new Date().toISOString()
  };
  db.transactions.push(tx);
  notifyUpdate();
};

export const subscribeToChat = (roomId: string, listener: ChatListener) => {
  if (!chatListeners.has(roomId)) {
    chatListeners.set(roomId, new Set());
  }
  chatListeners.get(roomId)!.add(listener);
  return () => {
    chatListeners.get(roomId)?.delete(listener);
  };
};

export const subscribeToPMs = (listener: PMListener) => {
  pmListeners.add(listener);
  return () => {
    pmListeners.delete(listener);
  };
};

export const subscribeToGlobalUpdates = (cb: ActionCallback) => {
  updateListeners.add(cb);
  return () => {
    updateListeners.delete(cb);
  };
};

// ==========================================
// HIGH LEVEL API ACTIONS (MOCK & REAL PASSTHROUGH)
// ==========================================

export const api = {
  // --- AUTH / PROFILE ---
  getCurrentUser: async (): Promise<Profile> => {
    if (isUsingRealSupabase) {
      const { data: { user } } = await realSupabase!.auth.getUser();
      if (user) {
        const { data } = await realSupabase!.from('profiles').select('*').eq('id', user.id).single();
        if (data) return data as Profile;
      }
    }
    return db.getActiveProfile();
  },

  getAllUsers: async (): Promise<Profile[]> => {
    if (isUsingRealSupabase) {
      const { data } = await realSupabase!.from('profiles').select('*');
      if (data) return data as Profile[];
    }
    return db.profiles;
  },

  updateProfile: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
    if (isUsingRealSupabase) {
      const { data, error } = await realSupabase!.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Profile;
    }
    const idx = db.profiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      const oldCargo = db.profiles[idx].cargo;
      db.profiles[idx] = { ...db.profiles[idx], ...updates } as Profile;
      const newCargo = db.profiles[idx].cargo;

      // If cargo changed, notify the user immediately!
      if (updates.cargo && oldCargo !== newCargo) {
        await api.addNotification({
          usuario_id: id,
          title: '🎖️ Cargo Atualizado!',
          message: `Seu cargo de usuário foi alterado de "${oldCargo}" para o cargo especial de "${newCargo}"! Parabéns! 🎉`,
          type: 'system',
          sender_id: 'system',
          sender_username: 'Sistema FCFUNZ'
        });
      }

      notifyUpdate();
      return db.profiles[idx];
    }
    throw new Error('User not found');
  },

  registerUser: async (fields: {
    username: string;
    nome: string;
    sobrenome: string;
    email: string;
    pais: string;
    sexo: string;
    password?: string;
  }): Promise<Profile> => {
    const newProfile: Profile = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      username: fields.username,
      nome: fields.nome,
      sobrenome: fields.sobrenome,
      pais: fields.pais || 'MZ',
      sexo: fields.sexo || 'M',
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${fields.username}`,
      cargo: 'Unverified User',
      nivel: 1,
      xp: 0,
      credits: 100, // 100 mzn initial credits as requested
      bonus: 0,
      points: 0,
      criado_em: new Date().toISOString(),
      password: fields.password || '123',
    };

    db.profiles.push(newProfile);
    db.setActiveUser(newProfile.id);
    notifyUpdate();
    return newProfile;
  },

  loginAsUser: async (id: string): Promise<Profile> => {
    db.setActiveUser(id);
    notifyUpdate();
    return db.getActiveProfile();
  },

  // --- SALAS (ROOMS) ---
  getRooms: async (): Promise<Sala[]> => {
    if (isUsingRealSupabase) {
      const { data } = await realSupabase!.from('salas').select('*');
      if (data) return data as Sala[];
    }
    return db.salas;
  },

  createRoom: async (room: Partial<Sala>): Promise<Sala> => {
    const user = db.getActiveProfile();
    const newRoom: Sala = {
      id: 's_' + Math.random().toString(36).substr(2, 9),
      nome: room.nome || 'Nova Sala',
      descricao: room.descricao || '',
      categoria: room.categoria || 'Official Rooms',
      capacidade: room.capacidade || 100,
      dono_id: user.id,
      criado_em: new Date().toISOString(),
      announce: room.announce || null,
      silence: false,
      silence_by: null,
      bot: false,
      treasure_number: null,
      treasure_amount: null,
      treasure_by: null,
      quiz_question: null,
      quiz_answer: null,
      quiz_amount: null,
      quiz_by: null,
    };
    db.salas.push(newRoom);
    notifyUpdate();
    return newRoom;
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    db.salas = db.salas.filter(s => s.id !== roomId);
    db.mensagens = db.mensagens.filter(m => m.sala_id !== roomId);
    notifyUpdate();
  },

  updateRoomAnnounce: async (roomId: string, announce: string | null): Promise<void> => {
    const rIdx = db.salas.findIndex(s => s.id === roomId);
    if (rIdx !== -1) {
      db.salas[rIdx].announce = announce;
      notifyUpdate();
    }
  },

  checkRoomAccess: async (roomId: string, userId: string): Promise<{ allowed: boolean, reason?: string }> => {
    const user = db.profiles.find(p => p.id === userId);
    if (!user) return { allowed: false, reason: 'Usuário não encontrado.' };

    // 1. Check if user is globally banned
    const isGlobalBanned = db.banned_global?.includes(userId);
    if (isGlobalBanned) {
      return { allowed: false, reason: 'Você está banido globalmente da plataforma.' };
    }

    // 2. Check if user is kicked recently (kick recente)
    const kick = db.room_kicks?.find(k => k.user_id === userId && k.sala_id === roomId);
    if (kick) {
      const expires = new Date(kick.expires_at).getTime();
      if (expires > Date.now()) {
        const secondsLeft = Math.ceil((expires - Date.now()) / 1000);
        return { allowed: false, reason: `Você foi expulso recentemente desta sala. Tente novamente em ${secondsLeft} segundos.` };
      }
    }

    // 3. Check if user is banned from specific room
    const isRoomBanned = db.room_bans?.some(b => b.user_id === userId && b.sala_id === roomId);
    if (isRoomBanned) {
      return { allowed: false, reason: 'Você está banido desta sala de chat.' };
    }

    // 4. Check if user is banned from group of rooms
    const room = db.salas.find(s => s.id === roomId);
    if (room) {
      const isGroupBanned = db.group_bans?.some(b => b.user_id === userId && b.categoria === room.categoria);
      if (isGroupBanned) {
        return { allowed: false, reason: `Você está banido do grupo de salas "${room.categoria}".` };
      }
    }

    // 5. Check if room is locked (bloqueada)
    const isLocked = room?.locked;
    const isModOrAdmin = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff', 'Guide', 'Chatroom Moderator', 'Chatroom Manager'].includes(user.cargo);
    if (isLocked && !isModOrAdmin) {
      return { allowed: false, reason: 'Esta sala está bloqueada para manutenção ou restrita a moderadores.' };
    }

    return { allowed: true };
  },

  enterRoom: async (roomId: string, userId: string): Promise<void> => {
    const user = db.profiles.find(p => p.id === userId);
    if (!user) return;

    // Check access first
    const access = await api.checkRoomAccess(roomId, userId);
    if (!access.allowed) {
      throw new Error(access.reason || 'Acesso negado à sala.');
    }

    // Check if already in participants list
    const inRoom = db.room_participants.some(p => p.user_id === userId && p.sala_id === roomId);
    if (!inRoom) {
      db.room_participants.push({
        id: 'part_' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        sala_id: roomId,
        last_activity: new Date().toISOString()
      });

      // Send entry message once
      await api.sendMessage(roomId, `@${user.username} entrou na sala`, 'system');
      notifyUpdate();
    } else {
      // Just update activity
      await api.heartbeatRoom(roomId, userId);
    }
  },

  leaveRoom: async (roomId: string, userId: string, type: 'manual' | 'inactive' = 'manual'): Promise<void> => {
    const user = db.profiles.find(p => p.id === userId);
    if (!user) return;

    const inRoom = db.room_participants.some(p => p.user_id === userId && p.sala_id === roomId);
    if (inRoom) {
      db.room_participants = db.room_participants.filter(p => !(p.user_id === userId && p.sala_id === roomId));
      
      const content = type === 'inactive' 
        ? `@${user.username} saiu por inatividade (inativo há 6 minutos)`
        : `@${user.username} saiu da sala`;

      await api.sendMessage(roomId, content, 'system');
      notifyUpdate();
    }
  },

  heartbeatRoom: async (roomId: string, userId: string): Promise<void> => {
    const part = db.room_participants.find(p => p.user_id === userId && p.sala_id === roomId);
    if (part) {
      part.last_activity = new Date().toISOString();
      notifyUpdate();
    }
  },

  toggleFavoriteRoom: async (roomId: string): Promise<boolean> => {
    const user = db.getActiveProfile();
    const existingIdx = db.favorites.findIndex(f => f.usuario_id === user.id && f.sala_id === roomId);
    let favorited = false;
    if (existingIdx !== -1) {
      db.favorites.splice(existingIdx, 1);
    } else {
      db.favorites.push({
        id: 'fav_' + Math.random().toString(36).substr(2, 9),
        usuario_id: user.id,
        sala_id: roomId,
        criado_em: new Date().toISOString()
      });
      favorited = true;
    }
    notifyUpdate();
    return favorited;
  },

  getFavoriteRooms: async (): Promise<string[]> => {
    const user = db.getActiveProfile();
    return db.favorites.filter(f => f.usuario_id === user.id).map(f => f.sala_id);
  },

  kickUserFromRoom: async (roomId: string, userId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const isModOrAdmin = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff', 'Guide', 'Chatroom Moderator', 'Chatroom Manager'].includes(user.cargo);
    if (!isModOrAdmin) {
      throw new Error('Você não tem permissão para expulsar usuários.');
    }

    const target = db.profiles.find(p => p.id === userId);
    if (!target) return;

    // Add to room kicks for 5 minutes
    db.room_kicks = db.room_kicks.filter(k => !(k.user_id === userId && k.sala_id === roomId));
    db.room_kicks.push({
      user_id: userId,
      sala_id: roomId,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });

    // Remove from participants
    db.room_participants = db.room_participants.filter(p => !(p.user_id === userId && p.sala_id === roomId));

    await api.sendMessage(roomId, `🚫 @${target.username} foi expulso (kick) da sala pelo moderador @${user.username}.`, 'administrative');
    notifyUpdate();
  },

  banUserFromRoomPermanent: async (roomId: string, userId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const isModOrAdmin = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff', 'Guide', 'Chatroom Moderator', 'Chatroom Manager'].includes(user.cargo);
    if (!isModOrAdmin) {
      throw new Error('Você não tem permissão para banir usuários.');
    }

    const target = db.profiles.find(p => p.id === userId);
    if (!target) return;

    db.room_bans = db.room_bans.filter(b => !(b.user_id === userId && b.sala_id === roomId));
    db.room_bans.push({
      user_id: userId,
      sala_id: roomId
    });

    // Remove from participants
    db.room_participants = db.room_participants.filter(p => !(p.user_id === userId && p.sala_id === roomId));

    await api.sendMessage(roomId, `🚫 @${target.username} foi BANIDO permanentemente desta sala pelo moderador @${user.username}.`, 'administrative');
    notifyUpdate();
  },

  banUserFromGroup: async (roomId: string, userId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const isModOrAdmin = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff', 'Guide', 'Chatroom Moderator', 'Chatroom Manager'].includes(user.cargo);
    if (!isModOrAdmin) {
      throw new Error('Você não tem permissão para banir do grupo.');
    }

    const room = db.salas.find(s => s.id === roomId);
    if (!room) return;

    const target = db.profiles.find(p => p.id === userId);
    if (!target) return;

    db.group_bans = db.group_bans.filter(b => !(b.user_id === userId && b.categoria === room.categoria));
    db.group_bans.push({
      user_id: userId,
      categoria: room.categoria
    });

    // Remove from participants in all rooms of same category
    const roomsInCat = db.salas.filter(s => s.categoria === room.categoria).map(s => s.id);
    db.room_participants = db.room_participants.filter(p => !(p.user_id === userId && roomsInCat.includes(p.sala_id)));

    await api.sendMessage(roomId, `🚫 @${target.username} foi BANIDO do grupo de salas "${room.categoria}" por @${user.username}.`, 'administrative');
    notifyUpdate();
  },

  globalBanUser: async (userId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const isModOrAdmin = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff'].includes(user.cargo);
    if (!isModOrAdmin) {
      throw new Error('Você não tem permissão para banir globalmente.');
    }

    const target = db.profiles.find(p => p.id === userId);
    if (!target) return;

    if (!db.banned_global.includes(userId)) {
      db.banned_global.push(userId);
    }

    // Remove from participants everywhere
    db.room_participants = db.room_participants.filter(p => p.user_id !== userId);

    // Broadcast system-wide message or notify in all rooms
    for (const r of db.salas) {
      await api.sendMessage(r.id, `🚨 O usuário @${target.username} foi BANIDO GLOBALMENTE de toda a plataforma FCFUNZ.`, 'administrative');
    }
    notifyUpdate();
  },

  globalUnbanUser: async (userId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const isModOrAdmin = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff'].includes(user.cargo);
    if (!isModOrAdmin) {
      throw new Error('Você não tem permissão para desbanir globalmente.');
    }

    const target = db.profiles.find(p => p.id === userId);
    if (!target) return;

    db.banned_global = db.banned_global.filter(id => id !== userId);

    for (const r of db.salas) {
      await api.sendMessage(r.id, `✅ O usuário @${target.username} foi DESBANIDO GLOBALMENTE pelo administrador @${user.username}.`, 'administrative');
    }
    notifyUpdate();
  },

  getCreditsResponsible: async (): Promise<{ userId: string; phone: string }> => {
    return {
      userId: db.credits_responsible_user_id,
      phone: db.credits_responsible_phone
    };
  },

  setCreditsResponsible: async (userId: string, phone: string): Promise<void> => {
    const user = db.getActiveProfile();
    const isFounderOrAdmin = ['Founder', 'Global Admin'].includes(user.cargo);
    if (!isFounderOrAdmin) {
      throw new Error('Apenas Founders ou Global Admins podem alterar o responsável de créditos.');
    }
    db.credits_responsible_user_id = userId;
    db.credits_responsible_phone = phone;
    db.save();
    notifyUpdate();
  },

  toggleLockRoom: async (roomId: string): Promise<boolean> => {
    const user = db.getActiveProfile();
    const isModOrAdmin = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff', 'Guide', 'Chatroom Moderator', 'Chatroom Manager'].includes(user.cargo);
    if (!isModOrAdmin) {
      throw new Error('Você não tem permissão para bloquear/desbloquear salas.');
    }

    const room = db.salas.find(s => s.id === roomId);
    if (!room) throw new Error('Sala não encontrada');

    room.locked = !room.locked;
    await api.sendMessage(roomId, room.locked
      ? `🔒 A sala foi BLOQUEADA pelo moderador @${user.username}. Apenas moderadores e administradores têm acesso agora.`
      : `🔓 A sala foi DESBLOQUEADA pelo moderador @${user.username}. Entrada permitida para todos.`,
      'administrative'
    );
    notifyUpdate();
    return room.locked;
  },

  // --- MENSAGENS / CHAT ---
  getMessages: async (roomId: string): Promise<Mensagem[]> => {
    const roomMsgs = db.mensagens.filter(m => m.sala_id === roomId);
    const sliced = roomMsgs.slice(-30); // LIMIT TO LAST 30 RECENT MESSAGES!
    return sliced.map(m => {
      const user = db.profiles.find(p => p.id === m.autor_id);
      return {
        ...m,
        autor_username: user?.username || 'Desconhecido',
        autor_cargo: user?.cargo || 'Unverified User',
        autor_avatar: user?.avatar_url || null,
      };
    });
  },

  sendMessage: async (roomId: string, content: string, type: Mensagem['tipo'] = 'normal', cor?: string): Promise<Mensagem> => {
    const user = db.getActiveProfile();
    
    // Check if room is silenced
    const room = db.salas.find(s => s.id === roomId);
    if (room?.silence && user.cargo === 'Unverified User') {
      throw new Error('Esta sala está silenciada para usuários comuns.');
    }

    const newMsg: Mensagem = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      sala_id: roomId,
      autor_id: user.id,
      conteudo: content,
      tipo: type,
      criado_em: new Date().toISOString(),
      cor, // Store message custom styling color
    };

    db.mensagens.push(newMsg);
    notifyUpdate();

    // Trigger local socket listener
    const listeners = chatListeners.get(roomId);
    if (listeners) {
      const enrichedMsg = {
        ...newMsg,
        autor_username: user.username,
        autor_cargo: user.cargo,
        autor_avatar: user.avatar_url
      };
      listeners.forEach(cb => cb(enrichedMsg));
    }

    // Add 5 XP and trigger mission m1 if normal chat message
    if (type === 'normal') {
      await api.addXP(user.id, 5);
      api.triggerMission('m1');
    }

    // --- GAME ENGINE AND BOT TRIGGERS (*bot dice, *shower, *apollo) ---
    if (content.startsWith('*')) {
      await handleBotCommand(roomId, content, user);
    }

    return newMsg;
  },

  // --- AMIZADES ---
  getFriends: async (): Promise<Profile[]> => {
    const user = db.getActiveProfile();
    const friendshipIds = db.amizades
      .filter(a => a.status === 'aceito' && (a.solicitante_id === user.id || a.destinatario_id === user.id))
      .map(a => a.solicitante_id === user.id ? a.destinatario_id : a.solicitante_id);
    return db.profiles.filter(p => friendshipIds.includes(p.id));
  },

  getFriendshipRequests: async (): Promise<{ received: Profile[], sent: Profile[] }> => {
    const user = db.getActiveProfile();
    
    const receivedIds = db.amizades
      .filter(a => a.status === 'pendente' && a.destinatario_id === user.id)
      .map(a => a.solicitante_id);
    
    const sentIds = db.amizades
      .filter(a => a.status === 'pendente' && a.solicitante_id === user.id)
      .map(a => a.destinatario_id);

    return {
      received: db.profiles.filter(p => receivedIds.includes(p.id)),
      sent: db.profiles.filter(p => sentIds.includes(p.id))
    };
  },

  sendFriendRequest: async (username: string): Promise<void> => {
    const user = db.getActiveProfile();
    const dest = db.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
    if (!dest) throw new Error('Usuário não encontrado');
    if (dest.id === user.id) throw new Error('Você não pode ser amigo de si mesmo');

    const exists = db.amizades.some(a => 
      (a.solicitante_id === user.id && a.destinatario_id === dest.id) ||
      (a.solicitante_id === dest.id && a.destinatario_id === user.id)
    );
    if (exists) throw new Error('Solicitação ou amizade já existente');

    db.amizades.push({
      id: 'am_' + Math.random().toString(36).substr(2, 9),
      solicitante_id: user.id,
      destinatario_id: dest.id,
      status: 'pendente',
      criado_em: new Date().toISOString()
    });
    
    // Add friend request notification
    await api.addNotification({
      usuario_id: dest.id,
      title: 'Solicitação de Amizade 🤝',
      message: `@${user.username} enviou uma solicitação de amizade para você.`,
      type: 'friend_request',
      sender_id: user.id,
      sender_username: user.username,
    });

    notifyUpdate();
  },

  respondToFriendRequest: async (requesterId: string, accept: boolean): Promise<void> => {
    const user = db.getActiveProfile();
    const fIdx = db.amizades.findIndex(a => a.solicitante_id === requesterId && a.destinatario_id === user.id && a.status === 'pendente');
    if (fIdx !== -1) {
      if (accept) {
        db.amizades[fIdx].status = 'aceito';
        // Add some XP for making friends
        await api.addXP(user.id, 15);
        await api.addXP(requesterId, 15);

        // Add response notification
        await api.addNotification({
          usuario_id: requesterId,
          title: 'Solicitação de Amizade Aceita 🎉',
          message: `@${user.username} aceitou sua solicitação de amizade!`,
          type: 'friend_request',
          sender_id: user.id,
          sender_username: user.username,
        });
      } else {
        db.amizades.splice(fIdx, 1);
      }
      notifyUpdate();
    }
  },

  removeFriend: async (friendId: string): Promise<void> => {
    const user = db.getActiveProfile();
    db.amizades = db.amizades.filter(a => 
      !((a.solicitante_id === user.id && a.destinatario_id === friendId) || 
        (a.solicitante_id === friendId && a.destinatario_id === user.id))
    );
    notifyUpdate();
  },

  // --- MENSAGENS PRIVADAS ---
  getPrivateConversations: async (): Promise<{ [userId: string]: MensagemPrivada[] }> => {
    const user = db.getActiveProfile();
    const myPMs = db.mensagensPrivadas.filter(p => p.remetente_id === user.id || p.destinatario_id === user.id);
    
    const conversations: { [userId: string]: MensagemPrivada[] } = {};
    myPMs.forEach(pm => {
      const otherId = pm.remetente_id === user.id ? pm.destinatario_id : pm.remetente_id;
      if (!conversations[otherId]) {
        conversations[otherId] = [];
      }
      conversations[otherId].push(pm);
    });

    // Sort messages inside conversation
    Object.keys(conversations).forEach(uid => {
      conversations[uid].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());
    });

    return conversations;
  },

  sendPrivateMessage: async (destId: string, content: string): Promise<MensagemPrivada> => {
    const user = db.getActiveProfile();
    const newPM: MensagemPrivada = {
      id: 'pm_' + Math.random().toString(36).substr(2, 9),
      remetente_id: user.id,
      destinatario_id: destId,
      conteudo: content,
      lida: false,
      criado_em: new Date().toISOString()
    };
    db.mensagensPrivadas.push(newPM);
    await api.addXP(user.id, 10); // 10 XP for DMing
    api.triggerMission('m4'); // trigger Interagir com um Amigo mission

    // Notify the recipient about the private message
    await api.addNotification({
      usuario_id: destId,
      title: 'Nova Mensagem Privada 💬',
      message: `@${user.username} enviou uma mensagem privada para você: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
      type: 'system',
      sender_id: user.id,
      sender_username: user.username,
    });

    notifyUpdate();

    pmListeners.forEach(cb => cb(newPM));
    return newPM;
  },

  // --- SOCIAL FEED (TWEETS / POSTS) ---
  getTweets: async (): Promise<Tweet[]> => {
    return db.tweets.map(t => {
      const user = db.profiles.find(p => p.id === t.user_id);
      return {
        ...t,
        author_username: user?.username || 'Anônimo',
        author_avatar: user?.avatar_url || null,
        author_cargo: user?.cargo || 'Unverified User',
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  createTweet: async (content: string, imageUrl: string | null = null): Promise<Tweet> => {
    const user = db.getActiveProfile();
    const newTweet: Tweet = {
      id: 't_' + Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      content,
      image_url: imageUrl,
      video_url: null,
      likes_count: 0,
      dislikes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.tweets.push(newTweet);
    await api.addXP(user.id, 20); // 20 XP for tweeting
    api.triggerMission('m2'); // trigger First Post mission
    notifyUpdate();
    return newTweet;
  },

  reactToTweet: async (tweetId: string, type: 'like' | 'dislike'): Promise<void> => {
    const tIdx = db.tweets.findIndex(t => t.id === tweetId);
    if (tIdx !== -1) {
      const tweet = db.tweets[tIdx];
      const user = db.getActiveProfile();
      if (type === 'like') {
        tweet.likes_count += 1;
        // Notify author if it's not the user liking their own post
        if (tweet.user_id !== user.id) {
          await api.addNotification({
            usuario_id: tweet.user_id,
            title: 'Curtida no seu Post! ❤️',
            message: `@${user.username} curtiu sua publicação: "${tweet.content.substring(0, 30)}${tweet.content.length > 30 ? '...' : ''}"`,
            type: 'system',
            sender_id: user.id,
            sender_username: user.username,
          });
        }
      } else {
        tweet.dislikes_count += 1;
      }
      notifyUpdate();
    }
  },

  getTweetComments: async (tweetId: string): Promise<TweetComment[]> => {
    const comments = db.comments.filter(c => c.tweet_id === tweetId);
    return comments.map(c => {
      const user = db.profiles.find(p => p.id === c.user_id);
      return {
        ...c,
        author_username: user?.username || 'Anônimo',
        author_avatar: user?.avatar_url || null,
        author_cargo: user?.cargo || 'Unverified User',
      };
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  addTweetComment: async (tweetId: string, content: string): Promise<TweetComment> => {
    const user = db.getActiveProfile();
    const newComment: TweetComment = {
      id: 'tc_' + Math.random().toString(36).substr(2, 9),
      tweet_id: tweetId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.comments.push(newComment);
    
    // Update comments count on tweet
    const tIdx = db.tweets.findIndex(t => t.id === tweetId);
    if (tIdx !== -1) {
      db.tweets[tIdx].comments_count += 1;
      const tweet = db.tweets[tIdx];
      // Notify author if it's not the user commenting on their own post
      if (tweet.user_id !== user.id) {
        await api.addNotification({
          usuario_id: tweet.user_id,
          title: 'Novo Comentário! 💬',
          message: `@${user.username} comentou na sua publicação: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
          type: 'system',
          sender_id: user.id,
          sender_username: user.username,
        });
      }
    }

    await api.addXP(user.id, 10); // 10 XP for commenting
    notifyUpdate();
    return newComment;
  },

  // --- ECONOMY / MARKETPLACE & GIFTS ---
  getGifts: () => {
    return DEFAULT_GIFT_CATALOG;
  },

  sendGift: async (toUserId: string, giftId: string, roomId?: string): Promise<void> => {
    const sender = db.getActiveProfile();
    const gift = DEFAULT_GIFT_CATALOG.find(g => g.id === giftId);
    if (!gift) throw new Error('Presente não encontrado');

    if (toUserId === 'all') {
      const targets = db.profiles.filter(p => p.id !== sender.id);
      if (targets.length === 0) throw new Error('Nenhum outro usuário ativo na sala para receber o presente.');

      const totalCost = gift.valor * targets.length;
      if (sender.credits < totalCost) {
        throw new Error(`Créditos insuficientes para enviar presentes para todos (${targets.length} usuários). Custo total: ${totalCost} MZN.`);
      }

      sender.credits -= totalCost;
      sender.points += Math.ceil(totalCost / 2);

      // Trigger mission completion
      api.triggerMission('m5');

      for (const receiver of targets) {
        receiver.points += gift.valor;
        await api.addXP(sender.id, gift.valor * 5);
        await api.addXP(receiver.id, gift.valor * 2);

        // 25% chance of dropping a Black Diamond for receivers
        if (Math.random() < 0.25) {
          receiver.black_diamonds = (receiver.black_diamonds || 0) + 1;
        }

        await api.addNotification({
          usuario_id: receiver.id,
          title: 'Presente em Grupo! 🎁',
          message: `@${sender.username} enviou um(a) ${gift.imagem} ${gift.nome} para todos na sala!`,
          type: 'gift',
          sender_id: sender.id,
          sender_username: sender.username,
        });
      }

      if (roomId) {
        await api.sendMessage(roomId, `🎁 @${sender.username} enviou ${gift.imagem} **${gift.nome}** para TODOS na sala! Que grande gesto de carinho e generosidade!`, 'automatic');
      }

      notifyUpdate();
      return;
    }

    const receiver = db.profiles.find(p => p.id === toUserId);
    if (!receiver) throw new Error('Destinatário não encontrado');
    if (sender.id === receiver.id) throw new Error('Não pode enviar presente para si mesmo');
    if (sender.credits < gift.valor) throw new Error(`Créditos insuficientes. Você precisa de ${gift.valor} MZN.`);

    sender.credits -= gift.valor;
    sender.points += Math.ceil(gift.valor / 2);
    receiver.points += gift.valor;

    // Tracker stats for merchant quests
    sender.stats_gifts_sent = (sender.stats_gifts_sent || 0) + 1;
    receiver.stats_gifts_received = (receiver.stats_gifts_received || 0) + 1;
    if (giftId === 'g_love') {
      sender.stats_love_gifts_sent = (sender.stats_love_gifts_sent || 0) + 1;
    }
    if (roomId) {
      const room = db.salas.find(r => r.id === roomId);
      if (room && room.dono_id === sender.id) {
        sender.stats_gifts_sent_own_room = (sender.stats_gifts_sent_own_room || 0) + 1;
      }
    }
    sender.stats_transactions_amount = (sender.stats_transactions_amount || 0) + gift.valor;

    // Trigger mission completion
    api.triggerMission('m5');

    // 25% chance of dropping a Black Diamond for receivers
    if (Math.random() < 0.25) {
      receiver.black_diamonds = (receiver.black_diamonds || 0) + 1;
    }

    await api.addXP(sender.id, gift.valor * 5);
    await api.addXP(receiver.id, gift.valor * 2);

    await api.addNotification({
      usuario_id: receiver.id,
      title: 'Presente Recebido! 🎁',
      message: `@${sender.username} te enviou um presente: ${gift.imagem} ${gift.nome}! (+${gift.valor} pontos)`,
      type: 'gift',
      sender_id: sender.id,
      sender_username: sender.username,
    });

    if (roomId) {
      await api.sendMessage(roomId, `🎁 @${sender.username} enviou ${gift.imagem} **${gift.nome}** de presente para @${receiver.username}!`, 'automatic');
    }

    notifyUpdate();
  },

  sendGiftShower: async (roomId: string, giftId: string, quantity: number): Promise<void> => {
    const sender = db.getActiveProfile();
    const gift = DEFAULT_GIFT_CATALOG.find(g => g.id === giftId);
    if (!gift) throw new Error('Presente não encontrado');
    if (quantity <= 0) throw new Error('Quantidade deve ser maior que zero');

    const targets = db.profiles.filter(p => p.id !== sender.id);
    if (targets.length === 0) throw new Error('Nenhum outro usuário ativo na sala.');

    const costPerUser = gift.valor * quantity;
    const totalCost = costPerUser * targets.length;

    if (sender.credits < totalCost) {
      throw new Error(`Créditos insuficientes para o Gift Shower (${quantity}x ${gift.nome} para ${targets.length} usuários). Custo total: ${totalCost} MZN.`);
    }

    sender.credits -= totalCost;
    sender.points += Math.ceil(totalCost / 2);

    // Tracker stats for merchant quests
    sender.stats_gifts_sent = (sender.stats_gifts_sent || 0) + (quantity * targets.length);
    if (giftId === 'g_love') {
      sender.stats_love_gifts_sent = (sender.stats_love_gifts_sent || 0) + (quantity * targets.length);
    }
    if (roomId) {
      const room = db.salas.find(r => r.id === roomId);
      if (room && room.dono_id === sender.id) {
        sender.stats_gifts_sent_own_room = (sender.stats_gifts_sent_own_room || 0) + (quantity * targets.length);
      }
    }
    sender.stats_transactions_amount = (sender.stats_transactions_amount || 0) + totalCost;

    // Trigger mission completion
    api.triggerMission('m5');

    for (const receiver of targets) {
      receiver.points += costPerUser;
      receiver.stats_gifts_received = (receiver.stats_gifts_received || 0) + quantity;
      await api.addXP(sender.id, costPerUser * 5);
      await api.addXP(receiver.id, costPerUser * 2);

      // Showers drop 1 to 2 guaranteed Black Diamonds for receivers
      const diamondsAwarded = Math.floor(Math.random() * 2) + 1;
      receiver.black_diamonds = (receiver.black_diamonds || 0) + diamondsAwarded;

      await api.addNotification({
        usuario_id: receiver.id,
        title: '🌊 CHUVEIRO DE PRESENTES! 🎁',
        message: `@${sender.username} lançou um super chuveiro de ${quantity}x ${gift.imagem} ${gift.nome}! Você recebeu o presente e coletou ${diamondsAwarded} Black Diamond(s)!`,
        type: 'gift',
        sender_id: sender.id,
        sender_username: sender.username,
      });
    }

    await api.sendMessage(roomId, `🌊 ✨ GIFT SHOWER MARAVILHOSO! @${sender.username} enviou uma tempestade de **${quantity}x ${gift.imagem} ${gift.nome}** para TODOS na sala! Que espetáculo de generosidade! ✨ 🌊`, 'automatic');
    notifyUpdate();
  },

  redeemOnlinePoints: async (userId: string): Promise<{ credits: number; xp: number; amountRedeemed: number }> => {
    const user = db.profiles.find(p => p.id === userId);
    if (!user) throw new Error('Usuário não encontrado');
    const points = user.online_points || 0;
    if (points <= 0) throw new Error('Você não possui pontos online acumulados para resgatar.');

    // 10 points = 1 MZN, and give 2 XP per online point to facilitate level progression as requested
    const creditsReward = Math.floor(points / 10);
    const xpReward = points * 2;

    user.credits += creditsReward;
    user.online_points = 0;
    await api.addXP(user.id, xpReward);

    notifyUpdate();
    return { credits: creditsReward, xp: xpReward, amountRedeemed: points };
  },

  redeemBlackDiamonds: async (userId: string): Promise<{ credits: number; amountRedeemed: number }> => {
    const user = db.profiles.find(p => p.id === userId);
    if (!user) throw new Error('Usuário não encontrado');
    const diamonds = user.black_diamonds || 0;
    if (diamonds <= 0) throw new Error('Você não possui Black Diamonds para resgatar.');

    const creditsReward = diamonds * 50; // 50 MZN each
    user.credits += creditsReward;
    user.black_diamonds = 0;

    notifyUpdate();
    return { credits: creditsReward, amountRedeemed: diamonds };
  },

  addOnlinePoints: async (userId: string, amount: number): Promise<void> => {
    const user = db.profiles.find(p => p.id === userId);
    if (user) {
      user.online_points = (user.online_points || 0) + amount;
      notifyUpdate();
    }
  },

  incrementMissionProgress: (type: 'chat' | 'dice' | 'post' | 'gift' | 'transfer', amount: number = 1) => {
    const user = db.getActiveProfile();
    const stored = localStorage.getItem(`fcfunz_missions_v2_${user.id}`);
    if (stored) {
      try {
        const missions = JSON.parse(stored);
        let changed = false;
        const updated = missions.map((m: any) => {
          if (m.type === type && !m.claimed) {
            const oldProgress = m.progress || 0;
            m.progress = Math.min((m.progress || 0) + amount, m.target);
            if (m.progress >= m.target && oldProgress < m.target) {
              m.completed = true;
              
              // Notify user with a system notification
              api.addNotification({
                usuario_id: user.id,
                title: '🏆 Missão Cumprida!',
                message: `Você cumpriu os requisitos de "${m.title}". Vá ao menu de Missões para coletar sua recompensa!`,
                type: 'system',
                sender_id: 'system',
                sender_username: 'Sistema'
              });
            }
            changed = true;
          }
          return m;
        });
        if (changed) {
          localStorage.setItem(`fcfunz_missions_v2_${user.id}`, JSON.stringify(updated));
          notifyUpdate();
        }
      } catch (e) {
        console.error('Error updating mission progress', e);
      }
    }
  },

  triggerMission: (missionId: string) => {
    let type: 'chat' | 'dice' | 'post' | 'gift' | 'transfer' = 'chat';
    if (missionId === 'm1' || missionId === 'm4') type = 'chat';
    else if (missionId === 'm2') type = 'post';
    else if (missionId === 'm3') type = 'dice';
    else if (missionId === 'm5') type = 'gift';
    
    api.incrementMissionProgress(type, 1);
  },

  buyColor: async (colorHex: string, cost: number): Promise<void> => {
    const user = db.getActiveProfile();
    if (user.credits < cost) {
      throw new Error('Você não tem créditos suficientes (precisa de ' + cost + ' MZN)');
    }
    user.credits -= cost;
    // Set custom premium color indicator on profile name
    user.avatar_url = user.avatar_url || ''; 
    
    // Add purchase notification
    await api.addNotification({
      usuario_id: user.id,
      title: 'Compra Realizada! 🛍️',
      message: `Você comprou uma Cor de Balão de Chat por ${cost} MZN na Loja do Fã-clube!`,
      type: 'system',
      amount: cost,
    });

    notifyUpdate();
  },

  buyMegafone: async (cost: number): Promise<void> => {
    const user = db.getActiveProfile();
    if (user.credits < cost) {
      throw new Error('Você não tem créditos suficientes (precisa de ' + cost + ' MZN)');
    }
    user.credits -= cost;
    user.inventory_megafones = (user.inventory_megafones || 0) + 1;
    
    logTransaction(user.id, 'item_buy', -cost, `Comprou 1x Megafone Divino`);
    
    await api.addNotification({
      usuario_id: user.id,
      title: 'Item Adquirido! 📣',
      message: `Você comprou 1x Megafone Divino por ${cost} MZN na Loja Divina!`,
      type: 'system',
      amount: cost,
    });
    
    notifyUpdate();
  },

  useMegafone: async (roomId: string, message: string): Promise<void> => {
    const user = db.getActiveProfile();
    if (!user.inventory_megafones || user.inventory_megafones < 1) {
      throw new Error('Você não possui Megafones no seu inventário.');
    }
    user.inventory_megafones -= 1;
    
    const globalContent = `📣 [MEGAFONE GLOBAL] @${user.username}: ${message}`;
    
    for (const r of db.salas) {
      const newMsg: Mensagem = {
        id: 'msg_m_' + Math.random().toString(36).substr(2, 9),
        sala_id: r.id,
        autor_id: user.id,
        conteudo: globalContent,
        tipo: 'administrative',
        criado_em: new Date().toISOString(),
        cor: '#f59e0b',
      };
      db.mensagens.push(newMsg);
      
      const listeners = chatListeners.get(r.id);
      if (listeners) {
        const enrichedMsg = {
          ...newMsg,
          autor_username: user.username,
          autor_cargo: user.cargo,
          autor_avatar: user.avatar_url
        };
        listeners.forEach(cb => cb(enrichedMsg));
      }
    }
    
    notifyUpdate();
  },

  buyStickerPack: async (packId: string, cost: number): Promise<void> => {
    const user = db.getActiveProfile();
    if (user.credits < cost) {
      throw new Error('Você não tem créditos suficientes (precisa de ' + cost + ' MZN)');
    }
    user.purchased_stickers = user.purchased_stickers || [];
    if (user.purchased_stickers.includes(packId)) {
      throw new Error('Você já possui este pacote de stickers.');
    }
    
    user.credits -= cost;
    user.purchased_stickers.push(packId);
    
    logTransaction(user.id, 'item_buy', -cost, `Comprou Pacote de Stickers: ${packId}`);
    
    await api.addNotification({
      usuario_id: user.id,
      title: 'Stickers Liberados! 🎨',
      message: `Você comprou o Pacote de Stickers (${packId}) por ${cost} MZN! Já pode usá-los no chat!`,
      type: 'system',
      amount: cost,
    });
    
    notifyUpdate();
  },

  buyEmojiPack: async (packId: string, cost: number): Promise<void> => {
    const user = db.getActiveProfile();
    if (user.credits < cost) {
      throw new Error('Você não tem créditos suficientes (precisa de ' + cost + ' MZN)');
    }
    user.purchased_emojis = user.purchased_emojis || [];
    if (user.purchased_emojis.includes(packId)) {
      throw new Error('Você já possui este pacote de emojis.');
    }
    
    user.credits -= cost;
    user.purchased_emojis.push(packId);
    
    logTransaction(user.id, 'item_buy', -cost, `Comprou Pacote de Emojis: ${packId}`);
    
    await api.addNotification({
      usuario_id: user.id,
      title: 'Emojis Exclusivos! 💎',
      message: `Você comprou o Pacote de Emojis Exclusivos (${packId}) por ${cost} MZN! Já pode usá-los no chat!`,
      type: 'system',
      amount: cost,
    });
    
    notifyUpdate();
  },

  buyTemporaryColor: async (colorHex: string, cost: number): Promise<void> => {
    const user = db.getActiveProfile();
    if (user.credits < cost) {
      throw new Error('Você não tem créditos suficientes (precisa de ' + cost + ' MZN)');
    }
    
    user.credits -= cost;
    user.purchased_text_color = colorHex;
    
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    user.purchased_text_color_expires_at = expiry.toISOString();
    
    logTransaction(user.id, 'item_buy', -cost, `Comprou Cor de Texto (24h): ${colorHex}`);
    
    await api.addNotification({
      usuario_id: user.id,
      title: 'Cor de Texto Ativada! 🎨',
      message: `Você comprou e ativou a cor de chat por 24 horas por ${cost} MZN!`,
      type: 'system',
      amount: cost,
    });
    
    notifyUpdate();
  },

  useOracle: async (roomId: string): Promise<string> => {
    const user = db.getActiveProfile();
    const cost = 150;
    if (user.credits < cost) {
      throw new Error('Você não tem créditos suficientes (precisa de ' + cost + ' MZN)');
    }
    user.credits -= cost;
    
    const predictions = [
      "As estrelas se alinharam! Um bônus secreto de MZN o aguarda nas próximas 24 horas! ✨",
      "O Oráculo vê grandes vitórias na Arena de Dados para você hoje! 🎲",
      "Um vento místico sopra pela plataforma... Alguém especial está prestes a lhe enviar um presente! 🎁",
      "Cuidado com os dados desafiadores! A sorte favorece os audazes hoje! ⚡",
      "Sua popularidade está prestes a subir como um foguete espacial! 🚀",
      "O cosmos sorri para você. Que as suas interações tragam pura alegria retro!"
    ];
    const prophecy = predictions[Math.floor(Math.random() * predictions.length)];
    
    const newMsg: Mensagem = {
      id: 'msg_o_' + Math.random().toString(36).substr(2, 9),
      sala_id: roomId,
      autor_id: user.id,
      conteudo: `🔮 [ORÁCULO DIVINO] O Oráculo ouviu @${user.username} e declarou:\n"${prophecy}"`,
      tipo: 'administrative',
      criado_em: new Date().toISOString(),
      cor: '#a855f7',
    };
    db.mensagens.push(newMsg);
    
    const listeners = chatListeners.get(roomId);
    if (listeners) {
      const enrichedMsg = {
        ...newMsg,
        autor_username: user.username,
        autor_cargo: user.cargo,
        autor_avatar: user.avatar_url
      };
      listeners.forEach(cb => cb(enrichedMsg));
    }
    
    logTransaction(user.id, 'item_buy', -cost, `Usou o Oráculo Cósmico`);
    notifyUpdate();
    return prophecy;
  },

  useStarShower: async (roomId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const cost = 350;
    if (user.credits < cost) {
      throw new Error('Você não tem créditos suficientes (precisa de ' + cost + ' MZN)');
    }
    user.credits -= cost;
    
    const newMsg: Mensagem = {
      id: 'msg_s_' + Math.random().toString(36).substr(2, 9),
      sala_id: roomId,
      autor_id: user.id,
      conteudo: `🌠 [DIVINO] @${user.username} conjurou uma CHUVA DE ESTRELAS! Todos os usuários ganharam +30 XP instantaneamente! ✨`,
      tipo: 'administrative',
      criado_em: new Date().toISOString(),
      cor: '#10b981',
    };
    db.mensagens.push(newMsg);
    
    const listeners = chatListeners.get(roomId);
    if (listeners) {
      const enrichedMsg = {
        ...newMsg,
        autor_username: user.username,
        autor_cargo: user.cargo,
        autor_avatar: user.avatar_url
      };
      listeners.forEach(cb => cb(enrichedMsg));
    }
    
    for (const p of db.profiles) {
      p.xp += 30;
      if (p.xp >= 100) {
        p.xp = p.xp % 100;
        p.nivel += 1;
      }
    }
    
    logTransaction(user.id, 'item_buy', -cost, `Conjurou Chuva de Estrelas`);
    notifyUpdate();
  },

  // --- APOLLO VOUCHERS ---
  redeemVoucher: async (codeValue: number): Promise<number> => {
    const user = db.getActiveProfile();
    const codeIndex = db.apolloCodes.findIndex(c => c.code === codeValue && c.status === 'active');
    
    if (codeIndex === -1) {
      throw new Error('Código de voucher inválido ou já resgatado.');
    }

    const voucher = db.apolloCodes[codeIndex];
    voucher.status = 'redeemed';
    voucher.redeemed_by = user.id;
    voucher.redeemed_at = new Date().toISOString();

    user.credits += voucher.amount;
    await api.addXP(user.id, 50);

    logTransaction(user.id, 'apollo_redeem', voucher.amount, `Resgatou Voucher Apollo #${voucher.code}`);

    notifyUpdate();
    return voucher.amount;
  },

  createVoucher: async (amount: number): Promise<number> => {
    const user = db.getActiveProfile();
    if (user.cargo !== 'Founder' && user.cargo !== 'Global Admin') {
      throw new Error('Apenas Administradores ou Founders podem gerar vouchers Apollo.');
    }

    const code = Math.floor(10000 + Math.random() * 90000); // 5 digits code
    const newVoucher: ApolloCode = {
      id: 'c_' + Math.random().toString(36).substr(2, 9),
      code,
      amount,
      created_by: user.id,
      status: 'active',
      redeemed_by: null,
      redeemed_at: null,
      created_at: new Date().toISOString()
    };

    db.apolloCodes.push(newVoucher);
    notifyUpdate();
    return code;
  },

  // --- XP / LEVEL UP SYSTEM ---
  addXP: async (userId: string, amount: number): Promise<void> => {
    const user = db.profiles.find(p => p.id === userId);
    if (user) {
      if (user.nivel === undefined) user.nivel = 1;
      if (user.xp === undefined) user.xp = 0;

      // Scaling XP down based on level to make progress harder:
      // At level 1, divisor is 1^0.65 = 1 (100% XP)
      // At level 7, divisor is 7^0.65 = 3.55 (28% XP)
      // At level 50, divisor is 50^0.65 = 12.7 (8% XP)
      const scalingFactor = Math.pow(user.nivel, 0.65);
      const effectiveXP = amount / scalingFactor;

      user.xp += effectiveXP;

      // Always exactly 100 XP to level up
      while (user.xp >= 100) {
        user.nivel += 1;
        user.xp -= 100;
        user.last_level_up_at = new Date().toISOString();
        user.credits += 25; // level up reward

        // Notify user about level up
        await api.addNotification({
          usuario_id: user.id,
          title: '🔥 PARABÉNS! VOCÊ SUBIU DE NÍVEL! 🔥',
          message: `Você alcançou o Nível ${user.nivel}! Ganhou +25 MZN de recompensa!`,
          type: 'gift',
          sender_id: 'system',
          sender_username: 'Sistema'
        });
      }
      notifyUpdate();
    }
  },

  // --- CHATROOM MODERATION ---
  silenceRoom: async (roomId: string, silence: boolean): Promise<void> => {
    const user = db.getActiveProfile();
    if (user.cargo === 'Unverified User') {
      throw new Error('Você não tem permissão para moderar esta sala.');
    }

    const rIdx = db.salas.findIndex(s => s.id === roomId);
    if (rIdx !== -1) {
      db.salas[rIdx].silence = silence;
      db.salas[rIdx].silence_by = silence ? user.id : null;
      
      // Notify inside room
      await api.sendMessage(roomId, silence 
        ? `🚨 A sala foi SILENCIADA pelo moderador ${user.username}.`
        : `✅ A sala foi DESILENCIADA pelo moderador ${user.username}.`, 
        'administrative'
      );
    }
  },

  banUserFromRoom: async (roomId: string, userId: string): Promise<void> => {
    const user = db.getActiveProfile();
    if (user.cargo === 'Unverified User') {
      throw new Error('Sem permissão para expulsar usuários.');
    }
    const target = db.profiles.find(p => p.id === userId);
    if (target) {
      await api.sendMessage(roomId, `🚫 O usuário ${target.username} foi expulso da sala.`, 'administrative');
    }
  },

  // --- NOTIFICATIONS MANAGEMENT ---
  addNotification: async (params: {
    usuario_id: string;
    title: string;
    message: string;
    type: AppNotification['type'];
    sender_id?: string;
    sender_username?: string;
    amount?: number;
  }): Promise<AppNotification> => {
    const newNotif: AppNotification = {
      id: 'nt_' + Math.random().toString(36).substr(2, 9),
      usuario_id: params.usuario_id,
      title: params.title,
      message: params.message,
      type: params.type,
      sender_id: params.sender_id,
      sender_username: params.sender_username,
      amount: params.amount,
      read: false,
      criado_em: new Date().toISOString(),
    };
    db.notifications.push(newNotif);
    notifyUpdate();
    return newNotif;
  },

  getNotifications: async (): Promise<AppNotification[]> => {
    const user = db.getActiveProfile();
    return db.notifications
      .filter(n => n.usuario_id === user.id)
      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  },

  markNotificationsAsRead: async (): Promise<void> => {
    const user = db.getActiveProfile();
    db.notifications.forEach(n => {
      if (n.usuario_id === user.id) {
        n.read = true;
      }
    });
    notifyUpdate();
  },

  clearNotifications: async (): Promise<void> => {
    const user = db.getActiveProfile();
    db.notifications = db.notifications.filter(n => n.usuario_id !== user.id);
    notifyUpdate();
  },

  // --- ECONOMY TRANSFERS ---
  transferCredits: async (recipientUsername: string, amount: number, description?: string): Promise<void> => {
    const sender = db.getActiveProfile();
    const recipient = db.profiles.find(p => p.username.toLowerCase() === recipientUsername.toLowerCase().trim());

    if (!recipient) {
      throw new Error('Usuário destinatário não encontrado.');
    }
    if (recipient.id === sender.id) {
      throw new Error('Você não pode transferir MZN para si mesmo.');
    }
    if (isNaN(amount) || amount <= 0) {
      throw new Error('O valor de transferência deve ser maior que zero.');
    }
    if (sender.credits < amount) {
      throw new Error(`Saldo insuficiente. Você tem ${sender.credits} MZN.`);
    }

    // Deduct and add
    sender.credits -= amount;
    recipient.credits += amount;

    // Track stats
    sender.stats_transactions_amount = (sender.stats_transactions_amount || 0) + amount;
    recipient.stats_transactions_amount = (recipient.stats_transactions_amount || 0) + amount;
    
    // If recipient is a Merchant or Mentor, count as commission received
    const isMerchantOrMentor = ['Merchant', 'Super Merchant', 'Mentor', 'Mentor Head', 'Founder'].includes(recipient.cargo);
    if (isMerchantOrMentor) {
      recipient.stats_commissions_received = (recipient.stats_commissions_received || 0) + amount;
    }

    // Log transactions
    logTransaction(sender.id, 'transfer_send', -amount, `Transferiu para @${recipient.username}${description ? `: "${description}"` : ''}`);
    logTransaction(recipient.id, 'transfer_receive', amount, `Recebeu de @${sender.username}${description ? `: "${description}"` : ''}`);

    // Log a notification for the recipient
    await api.addNotification({
      usuario_id: recipient.id,
      title: 'Transferência Recebida! 💸',
      message: `@${sender.username} transferiu ${amount} MZN para você.${description ? ` Mensagem: "${description}"` : ''}`,
      type: 'transfer',
      sender_id: sender.id,
      sender_username: sender.username,
      amount: amount,
    });

    // Notify sender as well
    await api.addNotification({
      usuario_id: sender.id,
      title: 'Transferência Efetuada ✅',
      message: `Você transferiu ${amount} MZN para @${recipient.username}.`,
      type: 'system',
      amount: amount,
    });

    api.incrementMissionProgress('transfer', amount);

    notifyUpdate();
  },

  // --- MULTIPLAYER DICE GAME (FCFUNZ 2015-STYLE) ---
  getRoomDiceGame: async (roomId: string): Promise<MultiplayerDiceGame | null> => {
    const game = db.diceGames.find(g => g.sala_id === roomId && g.status !== 'ended');
    return game || null;
  },

  startRoomDiceGame: async (roomId: string, entryFee: number): Promise<MultiplayerDiceGame> => {
    const user = db.getActiveProfile();
    
    // Check if there is already an active game
    const existing = db.diceGames.find(g => g.sala_id === roomId && g.status !== 'ended');
    if (existing) {
      throw new Error('Já existe um jogo de dados ativo nesta sala!');
    }
    
    if (isNaN(entryFee) || entryFee <= 0) {
      throw new Error('Valor de aposta inválido!');
    }
    
    if (user.credits < entryFee) {
      throw new Error(`Você não tem créditos suficientes (${entryFee} MZN) para criar o jogo.`);
    }
    
    // Deduct entry fee
    user.credits -= entryFee;
    
    const newGame: MultiplayerDiceGame = {
      id: 'dg_' + Math.random().toString(36).substr(2, 9),
      sala_id: roomId,
      status: 'lobby',
      entry_fee: entryFee,
      prize_pool: 0,
      house_cut: 0,
      created_at: new Date().toISOString(),
      time_left: 50,
      players: [{
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        cargo: user.cargo,
        rolled: false,
        score: null,
        roll1: null,
        roll2: null,
        eliminated: false
      }],
      round: 1,
      creator_id: user.id
    };
    
    db.diceGames.push(newGame);
    notifyUpdate();
    return newGame;
  },

  joinRoomDiceGame: async (roomId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const game = db.diceGames.find(g => g.sala_id === roomId && g.status === 'lobby');
    if (!game) {
      throw new Error('Não há nenhum jogo de dados no período de inscrições nesta sala!');
    }
    
    if (game.players.some(p => p.id === user.id)) {
      throw new Error('Você já está inscrito neste jogo!');
    }
    
    if (user.credits < game.entry_fee) {
      throw new Error(`Você não tem créditos suficientes (${game.entry_fee} MZN) para entrar.`);
    }
    
    // Deduct entry fee
    user.credits -= game.entry_fee;
    
    game.players.push({
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      cargo: user.cargo,
      rolled: false,
      score: null,
      roll1: null,
      roll2: null,
      eliminated: false
    });
    
    await api.sendMessage(roomId, `✅ @${user.username} entrou na disputa dos dados de **${game.entry_fee} MZN**! (${game.players.length} jogadores inscritos)`, 'automatic');
    notifyUpdate();
  },

  rollInRoomDiceGame: async (roomId: string): Promise<void> => {
    const user = db.getActiveProfile();
    const game = db.diceGames.find(g => g.sala_id === roomId && g.status === 'playing');
    if (!game) {
      throw new Error('Não há nenhum jogo de dados ativo rodando nesta sala!');
    }
    
    const player = game.players.find(p => p.id === user.id);
    if (!player) {
      throw new Error('Você não está participando deste jogo!');
    }
    
    if (player.eliminated) {
      throw new Error('Você foi eliminado deste jogo de dados!');
    }
    
    if (player.rolled) {
      throw new Error('Você já lançou seus dados neste round!');
    }
    
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const total = roll1 + roll2;
    
    player.rolled = true;
    player.roll1 = roll1;
    player.roll2 = roll2;
    player.score = total;

    // Track statistics
    user.stats_dice_played = (user.stats_dice_played || 0) + 1;
    
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
    
    await api.sendMessage(roomId, `🎲 @${user.username} lançou os dados (Round ${game.round}): ${diceEmojis(roll1)} ${diceEmojis(roll2)} (${roll1} + ${roll2}) = **${total}**!`, 'automatic');
    
    // Check if everyone active has rolled
    const activePlayers = game.players.filter(p => !p.eliminated);
    const allRolled = activePlayers.every(p => p.rolled);
    
    if (allRolled) {
      // Small timeout to announce results so it looks like it computes
      setTimeout(async () => {
        const minScore = Math.min(...activePlayers.map(p => p.score as number));
        const playersWithMin = activePlayers.filter(p => p.score === minScore);
        
        if (playersWithMin.length === activePlayers.length) {
          // General tie!
          await api.sendMessage(roomId, `🤝 **EMPATE GERAL:** Todos os jogadores tiraram **${minScore}**. O Round ${game.round} será jogado novamente! Lancem os dados de novo!`, 'automatic');
          for (const p of game.players) {
            if (!p.eliminated) {
              p.rolled = false;
              p.score = null;
              p.roll1 = null;
              p.roll2 = null;
            }
          }
        } else {
          // Eliminate players with minScore
          const eliminatedNames = playersWithMin.map(p => `@${p.username}`).join(', ');
          for (const p of playersWithMin) {
            const gp = game.players.find(prof => prof.id === p.id);
            if (gp) gp.eliminated = true;
          }
          
          await api.sendMessage(roomId, `💀 **ELIMINAÇÃO:** ${eliminatedNames} tirou(aram) o menor valor (**${minScore}**) e foi(ram) eliminado(s)!`, 'automatic');
          
          // Check survivors
          const survivors = game.players.filter(p => !p.eliminated);
          if (survivors.length === 1) {
            const winner = survivors[0];
            const profile = db.profiles.find(prof => prof.id === winner.id);
            if (profile) {
              profile.credits += game.prize_pool;
              await api.addXP(profile.id, 50);
            }
            game.status = 'ended';
            
            await api.sendMessage(roomId, `🏆 **FIM DE JOGO!** @${winner.username} venceu a disputa de dados de FCFUNZ e faturou o prêmio total de **${game.prize_pool} MZN**! (Taxa de 10% da casa: ${game.house_cut} MZN) 🎉`, 'automatic');
          } else {
            game.round += 1;
            for (const p of game.players) {
              p.rolled = false;
              p.score = null;
              p.roll1 = null;
              p.roll2 = null;
            }
            
            await api.sendMessage(roomId, `⚔️ **ROUND ${game.round} INICIADO**\nRestam na arena: ${survivors.map(p => `@${p.username}`).join(', ')}.\n👉 Lancem os dados digitando \`*d\` ou clicando no botão!`, 'automatic');
          }
        }
        notifyUpdate();
      }, 800);
    }
    
    notifyUpdate();
  },

  // --- ACCOUNT HUB & SECURITY ACTIONS ---
  getUserTransactions: async (userId: string): Promise<Transaction[]> => {
    return db.transactions
      .filter(t => t.user_id === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  claimAccessBonus: async (): Promise<number> => {
    const user = db.getActiveProfile();
    const bonusAmount = 5; // 5 MZN access bonus
    user.credits += bonusAmount;
    
    logTransaction(user.id, 'access_bonus', bonusAmount, 'Bônus de Acesso Automático à Conta');
    notifyUpdate();
    return bonusAmount;
  },

  updatePassword: async (currentPass: string, newPass: string): Promise<void> => {
    const user = db.getActiveProfile();
    const currentStored = user.password || '123';
    if (currentPass !== currentStored) {
      throw new Error('Senha atual incorreta.');
    }
    if (!newPass || newPass.trim().length < 3) {
      throw new Error('A nova senha deve ter no mínimo 3 caracteres.');
    }
    user.password = newPass;
    notifyUpdate();
  },

  updateSecurityQuestion: async (question: string, answer: string): Promise<void> => {
    const user = db.getActiveProfile();
    if (!question || question.trim().length < 5) {
      throw new Error('A pergunta de segurança deve ter no mínimo 5 caracteres.');
    }
    if (!answer || answer.trim().length < 2) {
      throw new Error('A resposta de segurança deve ter no mínimo 2 caracteres.');
    }
    user.security_question = question;
    user.security_answer = answer;
    notifyUpdate();
  },

  createMerchant: async (targetUsername: string, creatorPin: string): Promise<Profile> => {
    const creator = db.getActiveProfile();
    
    // 1. Permission checks
    const isAuthorized = ['Founder', 'Global Admin', 'Mentor Head', 'Mentor'].includes(creator.cargo);
    if (!isAuthorized) {
      throw new Error('Você não tem permissão para criar comerciantes. Apenas Administradores e Mentores podem efetuar esta ação.');
    }

    // 2. PIN validation
    const storedPin = creator.merchant_pin || '1234';
    if (creatorPin !== storedPin) {
      throw new Error('PIN de comerciante incorreto. Confirme o PIN nas suas configurações.');
    }

    // 3. Balance validation
    if (creator.credits < 1000) {
      throw new Error('Saldo insuficiente. É necessário pelo menos 1000 MZN para ativar um novo comerciante.');
    }

    // 4. Target user checks
    const targetUser = db.profiles.find(u => u.username.toLowerCase() === targetUsername.trim().toLowerCase());
    if (!targetUser) {
      throw new Error(`Usuário @${targetUsername} não foi encontrado.`);
    }

    if (targetUser.id === creator.id) {
      throw new Error('Você não pode se tornar seu próprio comerciante.');
    }

    // 5. Duplicity check
    if (['Merchant', 'Super Merchant'].includes(targetUser.cargo)) {
      throw new Error(`O usuário @${targetUser.username} já é um Comerciante (Merchant).`);
    }

    // 6. Perform transactions & roles updates
    creator.credits -= 1000;
    targetUser.credits += 880;
    targetUser.cargo = 'Merchant';
    targetUser.merchant_creator_id = creator.id;
    targetUser.merchant_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Track statistics for merchant quests
    creator.stats_merchants_created = (creator.stats_merchants_created || 0) + 1;

    const house = db.profiles.find(u => u.id === 'u_casa');
    if (house) {
      house.credits += 120;
    }

    // 7. Log transactions in public audit
    logTransaction(creator.id, 'color_buy', -1000, `Criou Comerciante @${targetUser.username} (Tag Própria)`);
    logTransaction(targetUser.id, 'transfer_receive', 880, `Ativado como Comerciante por @${creator.username}`);
    logTransaction('u_casa', 'transfer_receive', 120, `Taxa de Parceria: Criação de @${targetUser.username} por @${creator.username}`);

    // 8. Log direct notification
    await api.addNotification({
      usuario_id: targetUser.id,
      title: 'Parceria Ativada! 🤝',
      message: `Parabéns! Você foi promovido a Comerciante (Merchant) por @${creator.username} com validade de 30 dias e recebeu bônus de 880 MZN!`,
      type: 'system',
      amount: 880
    });

    notifyUpdate();
    return targetUser;
  },

  updateMerchantPin: async (currentPin: string, newPin: string): Promise<void> => {
    const user = db.getActiveProfile();
    const storedPin = user.merchant_pin || '1234';
    if (currentPin !== storedPin) {
      throw new Error('PIN atual incorreto.');
    }
    if (!newPin || newPin.trim().length !== 4 || isNaN(Number(newPin))) {
      throw new Error('O PIN deve conter exatamente 4 números.');
    }
    user.merchant_pin = newPin.trim();
    notifyUpdate();
  },

  submitVaquinhaContribution: async (phoneNumber: string, amountMt: number, transactionId: string): Promise<VaquinhaContribution> => {
    const user = db.getActiveProfile();
    const duplicate = db.vaquinhaContributions.find(c => c.transaction_id === transactionId.trim());
    if (duplicate) {
      throw new Error('Este ID de Transação já foi enviado para análise anteriormente.');
    }
    const newContrib: VaquinhaContribution = {
      id: 'vq_' + Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      username: user.username,
      phone_number: phoneNumber.trim(),
      amount_mt: amountMt,
      transaction_id: transactionId.trim(),
      status: 'pending',
      created_at: new Date().toISOString()
    };
    db.vaquinhaContributions.push(newContrib);

    // Notify Founders/Global Admins and Credits Responsible
    const adminTargets = db.profiles.filter(p => p.cargo === 'Founder' || p.cargo === 'Global Admin' || p.id === db.credits_responsible_user_id);
    const uniqueAdminIds = Array.from(new Set(adminTargets.map(p => p.id)));
    
    for (const adminId of uniqueAdminIds) {
      if (adminId !== user.id) {
        db.notifications.push({
          id: 'notif_vaq_' + Math.random().toString(36).substr(2, 9),
          usuario_id: adminId,
          title: '💰 Nova Doação Pendente!',
          message: `@${user.username} enviou um comprovante de ${amountMt} MT (Ref: ${transactionId.trim()}). Verifique e aprove no painel administrativo!`,
          type: 'system',
          read: false,
          criado_em: new Date().toISOString()
        });
      }
    }

    notifyUpdate();
    return newContrib;
  },

  getAllVaquinhaContributions: async (): Promise<VaquinhaContribution[]> => {
    return db.vaquinhaContributions;
  },

  approveVaquinhaContribution: async (contributionId: string): Promise<VaquinhaContribution> => {
    const admin = db.getActiveProfile();
    if (admin.cargo !== 'Founder' && admin.cargo !== 'Global Admin') {
      throw new Error('Sem permissão para aprovar doações.');
    }
    const contrib = db.vaquinhaContributions.find(c => c.id === contributionId);
    if (!contrib) {
      throw new Error('Contribuição não encontrada.');
    }
    if (contrib.status !== 'pending') {
      throw new Error('Esta contribuição já foi ' + (contrib.status === 'approved' ? 'aprovada' : 'rejeitada') + '.');
    }

    contrib.status = 'approved';
    contrib.approved_by = admin.username;
    contrib.approved_at = new Date().toISOString();

    const targetUser = db.profiles.find(p => p.id === contrib.user_id);
    if (targetUser) {
      const mt = contrib.amount_mt;
      let credits = Math.round(mt * 3);
      let cargo: UserCargo = 'Unverified User';
      let badge = '';
      let benefit = '';

      if (mt >= 1000) {
        credits = 3500;
        cargo = 'Super Merchant';
        badge = 'Emblema Super Merchant (Elite)';
        benefit = 'Moldura de Avatar em Chamas 🔥';
      } else if (mt >= 500) {
        credits = 1600;
        cargo = 'Merchant';
        badge = 'Emblema Premium de Comerciante';
        benefit = 'Permissões de Comerciante Autorizado 🔮';
      } else if (mt >= 200) {
        credits = 600;
        cargo = 'Guide';
        badge = 'Emblema de Ouro de Apoiador';
        benefit = 'Balão de Chat Dourado ✨';
      } else if (mt >= 100) {
        credits = 250;
        cargo = 'Verified User';
        badge = 'Emblema de Prata de Apoiador';
        benefit = 'Balão de Chat Azul 💙';
      } else if (mt >= 50) {
        credits = 100;
        cargo = 'Lucky User';
        badge = 'Emblema de Bronze de Apoiador';
        benefit = 'Cargo da Sorte 🍀';
      } else if (mt > 0) {
        badge = 'Apoiador Comum';
        benefit = 'Colaborador da Vaquinha';
      }

      targetUser.credits += credits;
      
      if (cargo !== 'Unverified User') {
        targetUser.cargo = cargo;
        targetUser.merchant_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      await api.addNotification({
        usuario_id: targetUser.id,
        title: '🏆 Contribuição Confirmada!',
        message: `Obrigado por apoiar a vaquinha com ${contrib.amount_mt} MT! O pagamento foi confirmado por @${admin.username} e você recebeu +${credits} MZN virtuais bônus!`,
        type: 'transfer',
        sender_id: admin.id,
        sender_username: admin.username
      });

      if (cargo !== 'Unverified User') {
        await api.addNotification({
          usuario_id: targetUser.id,
          title: '🎖️ Novo Cargo Especial Ativado!',
          message: `Você agora é um "${cargo}" oficial por 30 dias! Seus benefícios estéticos foram desbloqueados.`,
          type: 'system',
          sender_id: 'system',
          sender_username: 'Sistema'
        });
      }

      const tx: Transaction = {
        id: 'tx_' + Math.random().toString(36).substr(2, 9),
        user_id: targetUser.id,
        type: 'access_bonus',
        amount: credits,
        description: `Doação Confirmada (ID: ${contrib.transaction_id}) • Recompensa Vaquinha`,
        timestamp: new Date().toISOString()
      };
      db.transactions.push(tx);
    }

    notifyUpdate();
    return contrib;
  },

  declineVaquinhaContribution: async (contributionId: string): Promise<VaquinhaContribution> => {
    const admin = db.getActiveProfile();
    if (admin.cargo !== 'Founder' && admin.cargo !== 'Global Admin') {
      throw new Error('Sem permissão para rejeitar doações.');
    }
    const contrib = db.vaquinhaContributions.find(c => c.id === contributionId);
    if (!contrib) {
      throw new Error('Contribuição não encontrada.');
    }
    if (contrib.status !== 'pending') {
      throw new Error('Esta contribuição já foi ' + (contrib.status === 'approved' ? 'aprovada' : 'rejeitada') + '.');
    }

    contrib.status = 'declined';
    contrib.approved_by = admin.username;
    contrib.approved_at = new Date().toISOString();

    await api.addNotification({
      usuario_id: contrib.user_id,
      title: '❌ Doação não confirmada',
      message: `Não conseguimos validar o recebimento da sua transferência de ${contrib.amount_mt} MT (ID: ${contrib.transaction_id}). Verifique os dados ou fale com o suporte.`,
      type: 'system',
      sender_id: admin.id,
      sender_username: admin.username
    });

    notifyUpdate();
    return contrib;
  },

  renewCargoWithMPoints: async (userId: string): Promise<{ success: boolean; newExpiration: string; cargo: UserCargo }> => {
    const user = db.profiles.find(p => p.id === userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }
    const currentCargo = user.cargo;
    if (currentCargo !== 'Merchant' && currentCargo !== 'Super Merchant' && currentCargo !== 'Mentor') {
      throw new Error('Você precisa ser um Comerciante (Merchant), Super Merchant ou Mentor para reativar seu cargo com MPoints.');
    }
    
    let cost = 150;
    if (currentCargo === 'Super Merchant') cost = 250;
    if (currentCargo === 'Mentor') cost = 350;
    
    const userMPoints = user.mpoint || 0;
    if (userMPoints < cost) {
      throw new Error(`MPoints insuficientes. Você precisa de ${cost} mpoints para reativar o cargo de ${currentCargo}, mas possui apenas ${userMPoints}.`);
    }
    
    // Deduct points
    user.mpoint = userMPoints - cost;
    
    // Extend expiration
    const newExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    user.merchant_expires_at = newExp;
    
    // Log transaction
    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      type: 'transfer_send',
      amount: -cost,
      description: `Reativação de Cargo (${currentCargo}) • Consumo de ${cost} MPoints`,
      timestamp: new Date().toISOString()
    };
    db.transactions.push(tx);
    
    // Notification
    db.notifications.push({
      id: 'notif_ren_' + Math.random().toString(36).substr(2, 9),
      usuario_id: user.id,
      title: '⚡ Cargo Reativado com Sucesso!',
      message: `Você usou ${cost} mpoints para renovar seu cargo de ${currentCargo} por mais 30 dias! Nova data de expiração: ${new Date(newExp).toLocaleDateString('pt-MZ')}.`,
      type: 'system',
      read: false,
      criado_em: new Date().toISOString()
    });
    
    notifyUpdate();
    return { success: true, newExpiration: newExp, cargo: currentCargo };
  },

  getCompetitions: async (): Promise<LeaderboardCompetition[]> => {
    return db.competitions;
  },

  startCompetition: async (type: 'level' | 'online_points' | 'dice_multiplayer', title: string, description: string, prizePool: number): Promise<LeaderboardCompetition> => {
    const admin = db.getActiveProfile();
    if (admin.cargo !== 'Founder' && admin.cargo !== 'Global Admin') {
      throw new Error('Apenas Administradores ou Founders podem iniciar novas competições.');
    }
    
    // Deactivate current active competitions of same type
    db.competitions.forEach(c => {
      if (c.status === 'active' && c.type === type) {
        c.status = 'ended';
      }
    });

    // Take snapshots
    const snapshots: Record<string, number> = {};
    for (const u of db.profiles) {
      if (type === 'level') snapshots[u.id] = u.nivel || 1;
      else if (type === 'online_points') snapshots[u.id] = u.online_points || 0;
      else if (type === 'dice_multiplayer') snapshots[u.id] = u.stats_dice_played || 0;
    }

    const newComp: LeaderboardCompetition = {
      id: 'comp_' + Math.random().toString(36).substr(2, 9),
      type,
      title,
      description,
      status: 'active',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      prize_pool_mzn: prizePool,
      start_snapshots: snapshots
    };

    db.competitions.push(newComp);
    db.save();
    notifyUpdate();
    return newComp;
  },

  endCompetition: async (id: string): Promise<LeaderboardCompetition> => {
    const admin = db.getActiveProfile();
    if (admin.cargo !== 'Founder' && admin.cargo !== 'Global Admin') {
      throw new Error('Apenas Administradores ou Founders podem encerrar competições.');
    }

    const comp = db.competitions.find(c => c.id === id);
    if (!comp) {
      throw new Error('Competição não encontrada.');
    }

    if (comp.status === 'ended') {
      throw new Error('Esta competição já foi finalizada.');
    }

    // Calculate ranking scores based on the snapshots
    const participants = db.profiles
      .filter(u => u.username !== 'Casa_FCFUNZ' && u.cargo !== 'Founder') // filter out house and founder
      .map(u => {
        let currentVal = 0;
        if (comp.type === 'level') currentVal = u.nivel;
        else if (comp.type === 'online_points') currentVal = u.online_points || 0;
        else if (comp.type === 'dice_multiplayer') currentVal = u.stats_dice_played || 0;

        const startVal = comp.start_snapshots?.[u.id] ?? 0;
        // relative gain
        const score = Math.max(0, currentVal - startVal);
        return {
          user_id: u.id,
          username: u.username,
          score,
          current: currentVal
        };
      })
      .sort((a, b) => b.score - a.score || b.current - a.current);

    // Prizes for top 4 places
    // 1st: 50%, 2nd: 25%, 3rd: 15%, 4th: 10%
    const prizeShares = [0.5, 0.25, 0.15, 0.1];
    const winnersList: any[] = [];

    for (let i = 0; i < Math.min(4, participants.length); i++) {
      const part = participants[i];
      const u = db.profiles.find(profile => profile.id === part.user_id);
      if (u) {
        const prize = Math.floor(comp.prize_pool_mzn * prizeShares[i]);
        if (prize > 0) {
          u.credits = (u.credits || 0) + prize;
          
          // Log Transaction
          const tx: Transaction = {
            id: 'tx_prize_' + Math.random().toString(36).substr(2, 9),
            user_id: u.id,
            type: 'game_payout',
            amount: prize,
            description: `Prêmio da Competição: ${comp.title} (${i + 1}º Lugar)`,
            timestamp: new Date().toISOString()
          };
          db.transactions.push(tx);

          // Notification
          db.notifications.push({
            id: 'notif_comp_' + Math.random().toString(36).substr(2, 9),
            usuario_id: u.id,
            title: `🏆 Vencedor da Competição!`,
            message: `Parabéns! Você ficou em ${i + 1}º Lugar na competição "${comp.title}" e ganhou um prêmio de ${prize} MZN!`,
            type: 'system',
            read: false,
            criado_em: new Date().toISOString()
          });
        }

        winnersList.push({
          user_id: part.user_id,
          username: part.username,
          rank: i + 1,
          prize: prize,
          score: part.score
        });
      }
    }

    comp.status = 'ended';
    comp.winners = winnersList;
    db.save();
    notifyUpdate();
    return comp;
  }
};

// ==========================================
// BOT COMMANDS INTERPRETER
// ==========================================

// Background interval to tick down lobby timers for multiplayer dice games
if (typeof window !== 'undefined') {
  setInterval(async () => {
    const now = Date.now();
    let changed = false;
    
    // We only tick games that are in the lobby state
    for (const game of db.diceGames) {
      if (game.status === 'lobby') {
        const createdTime = new Date(game.created_at).getTime();
        const elapsed = Math.floor((now - createdTime) / 1000);
        const timeLeft = Math.max(0, 50 - elapsed);
        
        if (game.time_left !== timeLeft) {
          game.time_left = timeLeft;
          changed = true;
        }
        
        // Announcements at 30 seconds left and 10 seconds left
        if (timeLeft === 30 && !game.announced_30s) {
          game.announced_30s = true;
          changed = true;
          await api.sendMessage(game.sala_id, `⏳ **DADOS MULTIPLAYER:** Restam **30 segundos** de inscrições! Entrada: **${game.entry_fee} MZN**. Digite \`*join\` ou clique no botão para participar!`, 'automatic');
        } else if (timeLeft === 10 && !game.announced_10s) {
          game.announced_10s = true;
          changed = true;
          await api.sendMessage(game.sala_id, `⏳ **DADOS MULTIPLAYER:** Restam apenas **10 segundos** para fechar! Digite \`*join\` rápido!`, 'automatic');
        }
        
        // When time expires:
        if (timeLeft <= 0) {
          game.status = 'playing';
          game.round = 1;
          changed = true;
          
          const numPlayers = game.players.length;
          if (numPlayers < 2) {
            game.status = 'ended';
            // Refund players
            for (const p of game.players) {
              const profile = db.profiles.find(prof => prof.id === p.id);
              if (profile) {
                profile.credits += game.entry_fee;
              }
            }
            await api.sendMessage(game.sala_id, `❌ **DADOS MULTIPLAYER CANCELADO:** Mínimo de 2 jogadores necessário para iniciar. A taxa de entrada de **${game.entry_fee} MZN** foi devolvida aos inscritos.`, 'automatic');
          } else {
            const totalCollected = numPlayers * game.entry_fee;
            game.house_cut = Math.floor(totalCollected * 0.1);
            game.prize_pool = totalCollected - game.house_cut;
            
            await api.sendMessage(game.sala_id, `🎲 **DADOS MULTIPLAYER INICIADO (ROUND 1)**\n⚔️ Participantes: ${game.players.map(p => `@${p.username}`).join(', ')}\n💰 Prêmio acumulado: **${game.prize_pool} MZN** (10% de taxa da casa deduzida: ${game.house_cut} MZN)\n👉 Cada participante deve digitar \`*d\` ou clicar no botão "Lançar Dados" para jogar!`, 'automatic');
          }
        }
      }
    }

    // Inactivity sweep for room participants (older than 6 minutes / 360 seconds)
    const nowTime = Date.now();
    const expiredParticipants = db.room_participants.filter(p => {
      const lastAct = new Date(p.last_activity).getTime();
      return (nowTime - lastAct) >= 360000; // 360,000 ms = 6 minutes
    });

    if (expiredParticipants.length > 0) {
      for (const p of expiredParticipants) {
        db.room_participants = db.room_participants.filter(item => item.id !== p.id);
        const userProfile = db.profiles.find(prof => prof.id === p.user_id);
        if (userProfile) {
          // Send system inactivity message to the room
          await api.sendMessage(p.sala_id, `@${userProfile.username} saiu por inatividade (inativo há 6 minutos)`, 'system');
        }
      }
      changed = true;
    }
    
    if (changed) {
      notifyUpdate();
    }
  }, 1000);
}

async function handleBotCommand(roomId: string, content: string, user: Profile) {
  const parts = content.split(' ');
  const command = parts[0].toLowerCase();

  setTimeout(async () => {
    // A. *start <amount> dice or *start dice <amount> (Initiate multiplayer dice game)
    if (command === '*start') {
      const isDice = parts.some(p => p.toLowerCase() === 'dice');
      const feePart = parts.find((p, idx) => idx > 0 && !isNaN(parseFloat(p)));
      const fee = feePart ? parseFloat(feePart) : 0;
      
      if (isDice && fee > 0) {
        try {
          await api.startRoomDiceGame(roomId, fee);
          await api.sendMessage(roomId, `🎲 **DADOS MULTIPLAYER INICIADO!** @${user.username} abriu uma disputa de dados com taxa de entrada de **${fee} MZN**!\n⏱️ Você tem **50 segundos** para se inscrever! Digite \`*join\` ou clique no botão para entrar na arena de dados!`, 'automatic');
        } catch (err: any) {
          await api.sendMessage(roomId, `❌ @${user.username} falhou ao iniciar jogo: ${err.message}`, 'automatic');
        }
        return;
      }
    }

    // B. *join (Join active room dice game)
    else if (command === '*join') {
      try {
        await api.joinRoomDiceGame(roomId);
      } catch (err: any) {
        await api.sendMessage(roomId, `❌ @${user.username} falhou ao entrar: ${err.message}`, 'automatic');
      }
      return;
    }

    // D. *announce <message> (Change room announcement)
    else if (command === '*announce') {
      const isAuthorized = ['Founder', 'Global Admin', 'Mentor', 'Mentor Head', 'Staff', 'Guide', 'Chatroom Moderator', 'Chatroom Manager'].includes(user.cargo);
      const room = db.salas.find(s => s.id === roomId);
      const isOwner = room && room.dono_id === user.id;

      if (!isAuthorized && !isOwner) {
        await api.sendMessage(roomId, `❌ Erro: @${user.username}, você não tem permissão para alterar o anúncio desta sala.`, 'automatic');
        return;
      }

      const text = parts.slice(1).join(' ').trim();
      if (!text) {
        await api.sendMessage(roomId, `❌ Erro: Digite uma mensagem para o anúncio. Exemplo: \`*announce Bem-vindos à nova sala!\``, 'automatic');
        return;
      }

      if (room) {
        if (text.toLowerCase() === 'clear' || text.toLowerCase() === 'none' || text.toLowerCase() === 'limpar') {
          room.announce = undefined;
          await api.sendMessage(roomId, `📢 @${user.username} removeu o anúncio da sala.`, 'automatic');
        } else {
          room.announce = text;
          await api.sendMessage(roomId, `📢 @${user.username} atualizou o anúncio da sala para:\n"${text}"`, 'automatic');
        }
        notifyUpdate();
      }
      return;
    }

    // C. *d (Roll in active room dice game)
    else if (command === '*d') {
      try {
        await api.rollInRoomDiceGame(roomId);
      } catch (err: any) {
        await api.sendMessage(roomId, `❌ @${user.username}: ${err.message}`, 'automatic');
      }
      return;
    }

    // 1. *bot dice / *dice (Nostalgic 2015-style high/low betting & Bot duel engine)
    if ((command === '*bot' && parts[1]?.toLowerCase() === 'dice') || command === '*dice') {
      user.stats_dice_played = (user.stats_dice_played || 0) + 1;
      api.triggerMission('m3'); // trigger Sorte de Principiante mission
      let amountStr = '';
      let targetStr = '';
      if (command === '*bot') {
        amountStr = parts[2] || '';
        targetStr = parts[3] || '';
      } else {
        amountStr = parts[1] || '';
        targetStr = parts[2] || '';
      }

      const amount = parseFloat(amountStr);
      const hasBet = !isNaN(amount) && amount > 0;

      if (hasBet) {
        // Player wants to bet! Let's check their credits
        if (user.credits < amount) {
          await api.sendMessage(roomId, `❌ Erro: @${user.username} não tem saldo suficiente de **${amount} MZN** para fazer esta aposta! (Saldo atual: ${user.credits} MZN)`, 'automatic');
          return;
        }

        // Deduct bet amount upfront
        user.credits -= amount;

        // Roll the dice for the player
        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;
        const playerTotal = roll1 + roll2;

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

        const playerDisplay = `${diceEmojis(roll1)} ${diceEmojis(roll2)} (${roll1} + ${roll2}) = **${playerTotal}**`;

        // Check if they bet on a target (alto / baixo / 7) or if they bet against the bot (Duel)
        const target = targetStr.toLowerCase().trim();
        if (target === 'alto' || target === 'high' || target === 'maior' || target === 'baixo' || target === 'low' || target === 'menor' || target === '7' || target === 'sete') {
          // Bet on outcome!
          let isWin = false;
          let payoutMultiplier = 0;
          let targetLabel = '';

          if (target === 'alto' || target === 'high' || target === 'maior') {
            targetLabel = 'ALTO (8-12)';
            if (playerTotal >= 8 && playerTotal <= 12) {
              isWin = true;
              payoutMultiplier = 2; // double the bet (net +amount)
            }
          } else if (target === 'baixo' || target === 'low' || target === 'menor') {
            targetLabel = 'BAIXO (2-6)';
            if (playerTotal >= 2 && playerTotal <= 6) {
              isWin = true;
              payoutMultiplier = 2; // double the bet (net +amount)
            }
          } else if (target === '7' || target === 'sete') {
            targetLabel = 'EXATAMENTE 7';
            if (playerTotal === 7) {
              isWin = true;
              payoutMultiplier = 5; // 5x the bet (net +4*amount)
            }
          }

          if (isWin) {
            const winnings = amount * payoutMultiplier;
            user.credits += winnings;
            const netGain = winnings - amount;

            await api.sendMessage(roomId, `🎯 **JOGO DE DADOS (APOSTA)**\n@${user.username} apostou **${amount} MZN** em **${targetLabel}**!\n🎲 Dados: ${playerDisplay}\n🎉 **GANHOU!** Parabéns, você acertou e levou **${winnings} MZN** (Lucro limpo: +${netGain} MZN)!`, 'automatic');
            await api.addXP(user.id, 25);
          } else {
            // Check if they rolled a 7 but bet on alto/baixo
            if (playerTotal === 7 && (target === 'alto' || target === 'high' || target === 'maior' || target === 'baixo' || target === 'low' || target === 'menor')) {
              await api.sendMessage(roomId, `🎯 **JOGO DE DADOS (APOSTA)**\n@${user.username} apostou **${amount} MZN** em **${targetLabel}**!\n🎲 Dados: ${playerDisplay}\n💀 **A CASA GANHA!** O resultado foi exatamente **7**! Sete limpa todas as apostas de Alto/Baixo! Você perdeu **${amount} MZN**!`, 'automatic');
            } else {
              await api.sendMessage(roomId, `🎯 **JOGO DE DADOS (APOSTA)**\n@${user.username} apostou **${amount} MZN** em **${targetLabel}**!\n🎲 Dados: ${playerDisplay}\n😭 **PERDEU!** Os dados não foram favoráveis. Você perdeu **${amount} MZN**!`, 'automatic');
            }
            await api.addXP(user.id, 10);
          }
        } else {
          // No outcome target specified, so it is a DUEL against the Bot!
          const botRoll1 = Math.floor(Math.random() * 6) + 1;
          const botRoll2 = Math.floor(Math.random() * 6) + 1;
          const botTotal = botRoll1 + botRoll2;
          const botDisplay = `${diceEmojis(botRoll1)} ${diceEmojis(botRoll2)} (${botRoll1} + ${botRoll2}) = **${botTotal}**`;

          if (playerTotal > botTotal) {
            // Player wins!
            const winnings = amount * 2;
            user.credits += winnings;
            await api.sendMessage(roomId, `⚔️ **DUELO DE DADOS contra o BOT**\n💰 Aposta: **${amount} MZN**\n👤 @${user.username}: ${playerDisplay}\n🤖 Bot: ${botDisplay}\n🏆 **VITÓRIA!** Você venceu o Bot e faturou **${winnings} MZN** (Saldo atual: ${user.credits} MZN)!`, 'automatic');
            await api.addXP(user.id, 20);
          } else if (playerTotal < botTotal) {
            // Bot wins!
            await api.sendMessage(roomId, `⚔️ **DUELO DE DADOS contra o BOT**\n💰 Aposta: **${amount} MZN**\n👤 @${user.username}: ${playerDisplay}\n🤖 Bot: ${botDisplay}\n💀 **DERROTA!** O Bot venceu e levou seus **${amount} MZN** (Saldo atual: ${user.credits} MZN)!`, 'automatic');
            await api.addXP(user.id, 10);
          } else {
            // Draw! Return bet
            user.credits += amount;
            await api.sendMessage(roomId, `⚔️ **DUELO DE DADOS contra o BOT**\n💰 Aposta: **${amount} MZN**\n👤 @${user.username}: ${playerDisplay}\n🤖 Bot: ${botDisplay}\n🤝 **EMPATE!** Ninguém ganha, seus **${amount} MZN** foram devolvidos integralmente!`, 'automatic');
            await api.addXP(user.id, 10);
          }
        }
        notifyUpdate();
      } else {
        // Free Roll!
        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;
        const total = roll1 + roll2;

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

        const diceDisplay = `${diceEmojis(roll1)} ${diceEmojis(roll2)} (${roll1} + ${roll2}) = **${total}**`;
        await api.sendMessage(roomId, `🎲 **DADOS LIVRES**\n@${user.username} lançou os dados: ${diceDisplay}!`, 'automatic');
        
        await api.addXP(user.id, 10);

        if (roll1 === roll2) {
          user.credits += 5;
          await api.sendMessage(roomId, `✨ **DUPLO!** @${user.username} tirou números iguais e ganhou um bônus extra de **5 MZN**!`, 'automatic');
        } else if (total === 12) {
          user.credits += 15;
          await api.sendMessage(roomId, `🎉 **CRAPS MÁXIMO!** @${user.username} conseguiu a soma máxima de 12 e ganhou **15 MZN** de bônus!`, 'automatic');
        } else if (total === 2) {
          user.credits = Math.max(0, user.credits - 2);
          await api.sendMessage(roomId, `💀 **CRAPS MÍNIMO!** @${user.username} deu azar com o total 2 e perdeu **2 MZN**!`, 'automatic');
        }
        notifyUpdate();
      }
    }

    // 2. *shower (Gift Shower - Send present to everyone in the room)
    else if (command === '*shower') {
      const amountPerUser = parseInt(parts[1]) || 5;
      const room = db.salas.find(s => s.id === roomId);
      
      if (user.credits < amountPerUser * 5) {
        await api.sendMessage(roomId, `❌ Erro: @${user.username} tentou dar um *shower, mas precisa de pelo menos ${amountPerUser * 5} MZN de saldo para agraciar a sala.`, 'automatic');
        return;
      }

      // Deduct from sender
      user.credits -= amountPerUser * 4;
      
      // Give to other active profiles (up to 4 people)
      const others = db.profiles.filter(p => p.id !== user.id).slice(0, 4);
      others.forEach(p => {
        p.credits += amountPerUser;
        p.points += 2;
      });

      await api.sendMessage(roomId, `🌊 ✨ GIFT SHOWER! @${user.username} enviou ${amountPerUser} MZN de presente para todos os usuários ativos da sala!`, 'automatic');
      notifyUpdate();
    }

    // 3. *apollo (Admin voucher creation command inside room chat)
    else if (command === '*apollo') {
      if (user.cargo !== 'Founder' && user.cargo !== 'Global Admin') {
        await api.sendMessage(roomId, `❌ Permissão negada para @${user.username}.`, 'automatic');
        return;
      }
      const amount = parseInt(parts[1]) || 100;
      const code = await api.createVoucher(amount);
      await api.sendMessage(roomId, `🎟️ [SISTEMA APOLLO] Novo Voucher Gerado no valor de **${amount} MZN**! Use o código **${code}** para resgatar.`, 'automatic');
    }

    // 4. *rapollo (Quick redeem voucher command inside room chat)
    else if (command === '*rapollo') {
      const codeValue = parseInt(parts[1]);
      if (isNaN(codeValue)) {
        await api.sendMessage(roomId, `❌ Uso correto: *rapollo [código]`, 'automatic');
        return;
      }
      try {
        const redeemedAmount = await api.redeemVoucher(codeValue);
        await api.sendMessage(roomId, `🎉 @${user.username} resgatou com sucesso o Voucher Apollo no valor de **${redeemedAmount} MZN**!`, 'automatic');
      } catch (err: any) {
        await api.sendMessage(roomId, `❌ @${user.username} falhou ao resgatar: ${err.message}`, 'automatic');
      }
    }
  }, 1000);
}
