/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserCargo =
  | 'Founder'
  | 'Global Admin'
  | 'Guide'
  | 'Staff'
  | 'Mentor'
  | 'Mentor Head'
  | 'Hero'
  | 'Merchant'
  | 'Super Merchant'
  | 'Merchant Staff'
  | 'Merchant Guide'
  | 'Merchant Hero'
  | 'Verified User'
  | 'Unverified User'
  | 'Lucky User'
  | 'Chatroom Moderator'
  | 'Chatroom Manager';

export interface BadgeConfigItem {
  icon: string;
  name: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

const DEFAULT_BADGE_CONFIG: Record<UserCargo, BadgeConfigItem> = {
  'Founder': {
    icon: '👑',
    name: 'Founder',
    textClass: 'text-amber-500',
    bgClass: 'bg-amber-600/10',
    borderClass: 'border-amber-600/30',
    description: 'Fundador e criador original do ecossistema.'
  },
  'Global Admin': {
    icon: '⚡',
    name: 'Global Admin',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    description: 'Administrador global com plenos poderes.'
  },
  'Guide': {
    icon: '🧭',
    name: 'Guide',
    textClass: 'text-teal-400',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500/30',
    description: 'Guia encarregado de orientar novatos.'
  },
  'Staff': {
    icon: '🛠️',
    name: 'Staff',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/20',
    description: 'Membro oficial do suporte técnico.'
  },
  'Mentor': {
    icon: '🎯',
    name: 'Mentor',
    textClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    description: 'Mentor oficial responsável por guiar comerciantes.'
  },
  'Mentor Head': {
    icon: '🔥',
    name: 'Mentor Head',
    textClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    description: 'Chefe dos mentores e autoridade máxima.'
  },
  'Hero': {
    icon: '🛡️',
    name: 'Hero',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30',
    description: 'Herói honorário que contribui significativamente.'
  },
  'Merchant': {
    icon: '🔮',
    name: 'Merchant',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    description: 'Comerciante oficial autorizado a realizar transações.'
  },
  'Super Merchant': {
    icon: '🌸',
    name: 'Super Merchant',
    textClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10',
    borderClass: 'border-pink-500/30',
    description: 'Super Comerciante com limites ampliados e alto volume.'
  },
  'Merchant Staff': {
    icon: '💼',
    name: 'Merchant Staff',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/20',
    description: 'Staff oficial do Comerciante.'
  },
  'Merchant Guide': {
    icon: '🧭',
    name: 'Merchant Guide',
    textClass: 'text-teal-400',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500/30',
    description: 'Guia do Comerciante.'
  },
  'Merchant Hero': {
    icon: '🛡️',
    name: 'Merchant Hero',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30',
    description: 'Herói do Comerciante.'
  },
  'Verified User': {
    icon: '✅',
    name: 'Verified User',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    description: 'Usuário verificado oficialmente com autenticidade.'
  },
  'Unverified User': {
    icon: '👤',
    name: 'Unverified User',
    textClass: 'text-slate-300',
    bgClass: 'bg-slate-800/20',
    borderClass: 'border-slate-850',
    description: 'Membro comum registrado aproveitando a comunidade.'
  },
  'Lucky User': {
    icon: '🍀',
    name: 'Lucky User',
    textClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10',
    borderClass: 'border-yellow-500/30',
    description: 'Usuário com sorte extraordinária em minijogos.'
  },
  'Chatroom Moderator': {
    icon: '⚔️',
    name: 'Chatroom Moderator',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    description: 'Moderador encarregado de manter a ordem na sala.'
  },
  'Chatroom Manager': {
    icon: '🔑',
    name: 'Chatroom Manager',
    textClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30',
    description: 'Gerente oficial de sala de chat.'
  }
};

// Initialize BADGE_CONFIG with merged values from localStorage
const getInitialBadgeConfig = (): Record<UserCargo, BadgeConfigItem> => {
  const config = { ...DEFAULT_BADGE_CONFIG };
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('fcfunz_custom_badge_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach((k) => {
          if (config[k as UserCargo]) {
            config[k as UserCargo] = { ...config[k as UserCargo], ...parsed[k] };
          }
        });
      } catch (e) {
        console.error('Failed parsing custom badge config:', e);
      }
    }
  }
  return config;
};

export const BADGE_CONFIG = getInitialBadgeConfig();

export const saveCustomBadgeConfig = (config: Partial<Record<UserCargo, Partial<BadgeConfigItem>>>) => {
  Object.keys(config).forEach((k) => {
    const key = k as UserCargo;
    if (BADGE_CONFIG[key] && config[key]) {
      BADGE_CONFIG[key] = { ...BADGE_CONFIG[key], ...config[key] };
    }
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem('fcfunz_custom_badge_config', JSON.stringify(BADGE_CONFIG));
    // Trigger global update callback if any
    window.dispatchEvent(new Event('badge_config_updated'));
  }
};

export const resetBadgeConfigToDefault = (cargo: UserCargo) => {
  if (DEFAULT_BADGE_CONFIG[cargo]) {
    BADGE_CONFIG[cargo] = { ...DEFAULT_BADGE_CONFIG[cargo] };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fcfunz_custom_badge_config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          delete parsed[cargo];
          localStorage.setItem('fcfunz_custom_badge_config', JSON.stringify(parsed));
        } catch (e) {
          console.error('Failed resetting custom badge config:', e);
        }
      }
      window.dispatchEvent(new Event('badge_config_updated'));
    }
  }
};

export interface Profile {
  id: string; // uuid
  username: string;
  nome: string | null;
  sobrenome: string | null;
  pais: string; // default 'BR'
  sexo: string | null;
  avatar_url: string | null;
  cargo: UserCargo; // default 'Unverified User'
  nivel: number; // default 1
  xp: number; // default 0
  credits: number; // default 100
  bonus: number; // default 0
  points: number; // default 0
  criado_em: string;
  online_points?: number;
  black_diamonds?: number;
  last_level_up_at?: string;
  password?: string;
  email?: string;
  security_question?: string;
  security_answer?: string;
  merchant_pin?: string;
  merchant_creator_id?: string;
  merchant_expires_at?: string;
  stats_gifts_sent?: number;
  stats_gifts_received?: number;
  stats_gifts_sent_own_room?: number;
  stats_love_gifts_sent?: number;
  stats_dice_played?: number;
  stats_hot_played?: number;
  stats_hot_won?: number;
  stats_hot_lost?: number;
  stats_daily_missions_completed?: number;
  stats_commissions_received?: number;
  stats_transactions_amount?: number;
  stats_merchants_created?: number;
  stats_house_contributions?: number;
  mpoint?: number;
  merchant_quest_registered?: boolean;
  merchant_claimed_quests?: string[];
  inventory_megafones?: number;
  purchased_stickers?: string[]; // e.g. ['basic', 'premium', 'special']
  purchased_emojis?: string[];   // e.g. ['basic_emojis', 'vip_emojis']
  purchased_text_color?: string; // hex color for chat text
  purchased_text_color_expires_at?: string; // ISO timestamp
  last_withdrawal_at?: string; // Last MZN P2P withdrawal date
  merchant_rate_sell?: number; // Custom rate set by merchant (MTs per 1 MZN)
}

export interface Sala {
  id: string; // uuid
  nome: string;
  descricao: string | null;
  categoria: string; // default 'Official'
  capacidade: number; // default 100
  dono_id: string | null;
  criado_em: string;
  announce: string | null;
  silence: boolean; // default false
  silence_by: string | null;
  bot: boolean; // default false
  locked?: boolean; // whether room is locked
  treasure_number: number | null;
  treasure_amount: number | null;
  treasure_by: string | null;
  quiz_question: string | null;
  quiz_answer: string | null;
  quiz_amount: number | null;
  quiz_by: string | null;
}

export interface Mensagem {
  id: string; // uuid
  sala_id: string;
  autor_id: string;
  conteudo: string;
  tipo: 'normal' | 'administrative' | 'automatic' | 'system';
  criado_em: string;
  cor?: string; // Hex color or styling for custom colored messages
  // Extra client properties for rich rendering
  autor_username?: string;
  autor_cargo?: UserCargo;
  autor_avatar?: string | null;
  targetBotId?: string;
}

export interface Amizade {
  id: string; // uuid
  solicitante_id: string;
  destinatario_id: string;
  status: 'pendente' | 'aceito' | 'recusado';
  criado_em: string;
}

export interface MensagemPrivada {
  id: string; // uuid
  remetente_id: string;
  destinatario_id: string;
  conteudo: string;
  lida: boolean; // default false
  criado_em: string;
}

export interface Favorito {
  id: string; // uuid
  usuario_id: string;
  sala_id: string;
  criado_em: string;
}

export interface LowrollGame {
  id: string; // uuid
  sala_id: string;
  status: 'idle' | 'running' | 'completed';
  gameby: string | null;
  gameby_id: string | null;
  amount: number; // default 0
  pot: number; // default 0
  round: number; // default 1
  expires_at: string | null;
  criado_em: string;
}

export interface LowrollPlayer {
  id: string; // uuid
  game_id: string;
  user_id: string;
  username: string;
  roll: number | null;
  eliminated: boolean; // default false
  criado_em: string;
}

export interface ApolloCode {
  id: string; // uuid
  code: number;
  amount: number;
  created_by: string | null;
  status: 'active' | 'redeemed';
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
}

export interface Moderador {
  id: string; // uuid
  user_id: string;
  sala_id: string;
  added_by: string;
  created_at: string;
}

export interface Expulso {
  id: string; // uuid
  user_id: string;
  sala_id: string;
  expires_at: string | null;
  created_at: string;
}

export interface Entry {
  id: string; // uuid
  login: string;
  name: string | null;
  room: string | null;
  time: number | null;
  created_at: string;
}

export interface Tweet {
  id: string; // uuid
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  likes_count: number; // default 0
  dislikes_count: number; // default 0
  comments_count: number; // default 0
  created_at: string;
  updated_at: string;
  // Extra client fields
  author_username?: string;
  author_avatar?: string | null;
  author_cargo?: UserCargo;
}

export interface TweetReaction {
  id: string; // uuid
  tweet_id: string;
  user_id: string;
  type: 'like' | 'dislike';
  created_at: string;
}

export interface TweetComment {
  id: string; // uuid
  tweet_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Extra client fields
  author_username?: string;
  author_avatar?: string | null;
  author_cargo?: UserCargo;
}

// Presentes Catalogo (Gift Catalog)
export interface Gift {
  id: string;
  nome: string;
  imagem: string; // icon name or URL
  valor: number;
}

export interface AppNotification {
  id: string;
  usuario_id: string;
  title: string;
  message: string;
  type: 'transfer' | 'gift' | 'friend_request' | 'system' | 'message';
  sender_id?: string;
  sender_username?: string;
  amount?: number;
  read: boolean;
  criado_em: string;
}

export interface MultiplayerDicePlayer {
  id: string;
  username: string;
  avatar_url: string | null;
  cargo: string;
  rolled: boolean;
  score: number | null;
  roll1: number | null;
  roll2: number | null;
  eliminated: boolean;
}

export interface MultiplayerDiceGame {
  id: string;
  sala_id: string;
  status: 'lobby' | 'playing' | 'ended';
  entry_fee: number;
  prize_pool: number;
  house_cut: number;
  created_at: string;
  time_left: number;
  players: MultiplayerDicePlayer[];
  round: number;
  creator_id: string;
  announced_30s?: boolean;
  announced_10s?: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'transfer_send' | 'transfer_receive' | 'apollo_redeem' | 'access_bonus' | 'level_up' | 'game_wager' | 'game_payout' | 'gift_send' | 'gift_receive' | 'color_buy' | 'item_buy';
  amount: number; // positive for income, negative for expense
  description: string;
  timestamp: string;
}

export interface VaquinhaContribution {
  id: string;
  user_id: string;
  username: string;
  phone_number: string;
  amount_mt: number;
  transaction_id: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface LeaderboardCompetition {
  id: string;
  type: 'level' | 'online_points' | 'dice_multiplayer';
  title: string;
  description: string;
  status: 'active' | 'ended';
  created_at: string;
  expires_at: string;
  prize_pool_mzn: number;
  winners?: {
    user_id: string;
    username: string;
    rank: number;
    prize: number;
    score: number;
  }[];
  start_snapshots?: Record<string, number>; // user_id -> metric value snapshot at start
}

export interface Anuncio {
  id: string;
  autor_id: string;
  autor_username: string;
  texto: string;
  visualizacoes: number;
  dias: number;
  valor_pago: number;
  criado_em: string;
  expira_em: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
}

export interface P2POrder {
  id: string;
  buyer_id: string;
  buyer_username: string;
  merchant_id: string;
  merchant_username: string;
  amount_mzn: number;
  rate: number; // 1 mzn = rate MTs
  total_mts: number;
  payment_method: string; // e.g. "e-Mola"
  comprovativo_name?: string; // name of receipt uploaded
  comprovativo_data?: string; // base64 or placeholder url
  status: 'pending' | 'completed' | 'rejected' | 'disputed';
  created_at: string;
  completed_at?: string;
  type: 'deposit' | 'withdrawal';
  withdrawal_phone?: string;
}

export interface MerchantRate {
  merchant_id: string;
  rate: number;
}


