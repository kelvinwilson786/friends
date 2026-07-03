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

