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
  LeaderboardCompetition,
  Anuncio,
  P2POrder,
  MerchantRate,
  BotConfig,
  BotAction
} from '../types';

// Clean environment variable values (remove accidental quotes, trailing slashes, or appended subpaths like /rest/v1)
const cleanUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);
  cleaned = cleaned.trim();
  
  // Strip trailing slashes first
  while (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  
  // Strip common subpaths appended by mistake
  if (cleaned.endsWith('/rest/v1')) {
    cleaned = cleaned.slice(0, -8);
  } else if (cleaned.endsWith('/auth/v1')) {
    cleaned = cleaned.slice(0, -8);
  }
  
  // Strip trailing slashes again
  while (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  
  return cleaned;
};

const cleanKey = (key: string): string => {
  if (!key) return '';
  let cleaned = key.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);
  return cleaned.trim();
};

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Read credentials from env and clean them
const supabaseUrl = cleanUrl(rawSupabaseUrl);
const supabaseAnonKey = cleanKey(rawSupabaseAnonKey);

const isPlaceholder = (val: string): boolean => {
  const v = val.toLowerCase();
  return (
    v.includes('placeholder') ||
    v.includes('your_') ||
    v.includes('your-') ||
    v.includes('todo') ||
    v.includes('exemplo') ||
    v.includes('example') ||
    v.length < 5
  );
};

const isValidSupabaseUrl = supabaseUrl.startsWith('https://') && !isPlaceholder(supabaseUrl);
const isValidSupabaseKey = supabaseAnonKey.length > 20 && !isPlaceholder(supabaseAnonKey);

// Check if we should use the real Supabase client
export let isUsingRealSupabase = !!(isValidSupabaseUrl && isValidSupabaseKey);
export let supabaseError: string | null = null;
export let realSupabase: any = null;

export function handleSupabaseConnectionError(err: any) {
  console.warn('FCFUNZ Supabase Connection Error (Handled):', err);
  if (isUsingRealSupabase) {
    console.warn('⚠️ Conexão com o Supabase falhou ou está indisponível. Ativando o modo de contingência local automaticamente...');
    isUsingRealSupabase = false;
    supabaseError = 'Não foi possível conectar ao banco de dados do Supabase. Ativando o modo de contingência local automaticamente.';
    db.loadLocalDataFallback();
    notifyUpdate();
  }
}

if (isUsingRealSupabase) {
  try {
    realSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Install resilient wrappers for db calls to intercept "Failed to fetch" errors safely
    if (realSupabase) {
      const originalFrom = realSupabase.from;
      realSupabase.from = function(relation: string) {
        const queryBuilder = originalFrom.call(realSupabase, relation);
        
        const wrapBuilder = (builder: any): any => {
          if (!builder) return builder;
          
          if (typeof builder.then === 'function' && !builder.__wrapped) {
            const originalThen = builder.then;
            builder.__wrapped = true;
            builder.then = function(onfulfilled: any, onrejected: any) {
              return originalThen.call(
                this,
                (res: any) => {
                  if (res && res.error) {
                    const msg = String(res.error.message || '').toLowerCase();
                    if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
                      handleSupabaseConnectionError(res.error);
                    }
                  }
                  return onfulfilled ? onfulfilled(res) : res;
                },
                (err: any) => {
                  const msg = String(err?.message || err || '').toLowerCase();
                  if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
                    handleSupabaseConnectionError(err);
                    const fallbackRes = { data: null, error: err };
                    return onfulfilled ? onfulfilled(fallbackRes) : fallbackRes;
                  }
                  if (onrejected) return onrejected(err);
                  throw err;
                }
              );
            };
          }
          
          const methodsToWrap = [
            'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'gt', 'lt',
            'gte', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
            'rangeLt', 'rangeGt', 'rangeGte', 'rangeLte', 'rangeAdjacent', 'overlaps',
            'textSearch', 'match', 'not', 'or', 'filter', 'order', 'limit', 'range',
            'single', 'maybeSingle', 'csv'
          ];
          
          for (const method of methodsToWrap) {
            if (typeof builder[method] === 'function' && !builder[method].__wrapped) {
              const originalMethod = builder[method];
              builder[method] = function(...mArgs: any[]) {
                const nextBuilder = originalMethod.apply(this, mArgs);
                return wrapBuilder(nextBuilder);
              };
              builder[method].__wrapped = true;
            }
          }
          
          return builder;
        };
        
        return wrapBuilder(queryBuilder);
      };

      if (realSupabase.auth) {
        const authMethods = ['getUser', 'getSession', 'signUp', 'signInWithPassword', 'signOut', 'onAuthStateChange'];
        for (const method of authMethods) {
          if (typeof realSupabase.auth[method] === 'function') {
            const originalAuthMethod = realSupabase.auth[method];
            realSupabase.auth[method] = function(...args: any[]) {
              try {
                const result = originalAuthMethod.apply(this, args);
                if (result && typeof result.then === 'function') {
                  return result.then(
                    (res: any) => {
                      if (res && res.error) {
                        const msg = String(res.error.message || '').toLowerCase();
                        if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
                          handleSupabaseConnectionError(res.error);
                        }
                      }
                      return res;
                    },
                    (err: any) => {
                      const msg = String(err?.message || err || '').toLowerCase();
                      if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
                        handleSupabaseConnectionError(err);
                        return { data: { user: null, session: null }, error: err };
                      }
                      throw err;
                    }
                  );
                }
                return result;
              } catch (err: any) {
                const msg = String(err?.message || err || '').toLowerCase();
                if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
                  handleSupabaseConnectionError(err);
                  return Promise.resolve({ data: { user: null, session: null }, error: err });
                }
                throw err;
              }
            };
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Failed to initialize or wrap Supabase client:', err);
    isUsingRealSupabase = false;
    realSupabase = null;
    supabaseError = 'Erro ao inicializar o cliente do Supabase: ' + (err?.message || String(err));
  }
} else {
  supabaseError = 'As credenciais do Supabase não estão configuradas nas variáveis de ambiente (.env). O aplicativo está rodando em modo Local Fallback (Local Storage).';
}

// Global unhandled promise rejection handler to prevent 'Failed to fetch' browser crashes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = String(event.reason?.message || event.reason || '').toLowerCase();
    if (
      errorMsg.includes('failed to fetch') ||
      errorMsg.includes('network error') ||
      errorMsg.includes('load failed') ||
      errorMsg.includes('fetch') ||
      errorMsg.includes('cors')
    ) {
      console.warn('⚠️ FCFUNZ: Global unhandled fetch/network rejection caught:', event.reason);
      handleSupabaseConnectionError(event.reason);
      event.preventDefault(); // Stop default browser error propagation
    }
  });
}

// Self-healing database adapters for profiles (handling missing columns like 'email')
export let knownProfileColumns: Set<string> | null = null;
export const blacklistedProfileColumns = new Set<string>();

export const cleanProfilePayload = (profile: any): any => {
  if (!profile) return profile;
  const payload = { ...profile };
  
  // Remove blacklisted (confirmed non-existent) columns
  for (const col of blacklistedProfileColumns) {
    delete payload[col];
  }
  
  // If we fetched actual schema columns, prune any keys that don't exist in the database table
  if (knownProfileColumns) {
    for (const key of Object.keys(payload)) {
      if (!knownProfileColumns.has(key)) {
        delete payload[key];
      }
    }
  }
  
  return payload;
};

export const getMissingColumnFromError = (error: any): string | null => {
  if (!error) return null;
  const errorMsg = error.message || '';
  const match = errorMsg.match(/Could not find the '([^']+)' column/i) || 
                errorMsg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i) ||
                errorMsg.match(/column "([^"]+)" does not exist/i);
  return match ? match[1] : null;
};

export const blacklistedTableColumns: { [tableName: string]: Set<string> } = {};

export const cleanTablePayload = (tableName: string, record: any): any => {
  if (!record) return record;
  const payload = { ...record };
  
  if (tableName === 'profiles') {
    return cleanProfilePayload(record);
  }

  if (tableName === 'mensagens') {
    if (payload.targetBotId !== undefined) {
      payload.targetbotid = payload.targetBotId;
      delete payload.targetBotId;
    }
  }

  if (!blacklistedTableColumns[tableName]) {
    blacklistedTableColumns[tableName] = new Set<string>();
  }
  const blacklist = blacklistedTableColumns[tableName];
  for (const col of blacklist) {
    delete payload[col];
  }
  return payload;
};

export const safeUpsertTable = async (tableName: string, records: any[]): Promise<any> => {
  if (!isUsingRealSupabase || !realSupabase) return records;
  if (records.length === 0) return records;

  if (tableName === 'profiles') {
    return safeUpsertProfiles(records);
  }

  let attempt = 0;
  while (attempt < 15) {
    const payloads = records.map(r => cleanTablePayload(tableName, r));
    const { data, error } = await realSupabase!.from(tableName).upsert(payloads).select();
    if (error) {
      console.warn(`FCFUNZ Upsert error for table ${tableName} on attempt ${attempt}:`, error);
      const errorMsg = String(error.message || '').toLowerCase();
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network error') || errorMsg.includes('load failed') || errorMsg.includes('fetch') || errorMsg.includes('cors')) {
        handleSupabaseConnectionError(error);
        return records;
      }

      const missing = getMissingColumnFromError(error);
      if (missing) {
        if (!blacklistedTableColumns[tableName]) {
          blacklistedTableColumns[tableName] = new Set<string>();
        }
        blacklistedTableColumns[tableName].add(missing);
        attempt++;
        continue;
      }
      
      console.warn(`FCFUNZ Bulk upsert failed for table ${tableName}, falling back to row-by-row upserts:`, error.message || error);
      const results = [];
      for (const r of records) {
        try {
          const payload = cleanTablePayload(tableName, r);
          const { data: rowData, error: rowError } = await realSupabase!.from(tableName).upsert(payload).select().maybeSingle();
          if (rowError) {
            console.warn(`FCFUNZ Error upserting individual row into ${tableName}:`, rowError.message || rowError, payload);
          } else {
            results.push(rowData);
          }
        } catch (rowErr) {
          console.warn(`FCFUNZ Exception upserting individual row into ${tableName}:`, rowErr);
        }
      }
      return results;
    }
    return data;
  }
  console.warn(`FCFUNZ safeUpsertTable failed for ${tableName} after max attempts. Recovering gracefully...`);
  return records;
};

export const safeInsertProfile = async (profile: any): Promise<any> => {
  if (!isUsingRealSupabase) return profile;
  let attempt = 0;
  while (attempt < 15) {
    const payload = cleanProfilePayload(profile);
    const { data, error } = await realSupabase!.from('profiles').insert(payload).select().maybeSingle();
    if (error) {
      const errorMsg = String(error.message || '').toLowerCase();
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network error') || errorMsg.includes('load failed') || errorMsg.includes('fetch') || errorMsg.includes('cors')) {
        handleSupabaseConnectionError(error);
        return profile;
      }
      const missing = getMissingColumnFromError(error);
      if (missing) {
        blacklistedProfileColumns.add(missing);
        if (knownProfileColumns) knownProfileColumns.delete(missing);
        attempt++;
        continue;
      }
      throw error;
    }
    return data;
  }
  console.warn('Falha ao inserir perfil após remover colunas inexistentes. Prosseguindo de forma resiliente...');
  return profile;
};

export const safeUpdateProfile = async (id: string, updates: any): Promise<any> => {
  if (!isUsingRealSupabase) return updates;
  let attempt = 0;
  while (attempt < 15) {
    const payload = cleanProfilePayload(updates);
    const { data, error } = await realSupabase!.from('profiles').update(payload).eq('id', id).select().maybeSingle();
    if (error) {
      const errorMsg = String(error.message || '').toLowerCase();
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network error') || errorMsg.includes('load failed') || errorMsg.includes('fetch') || errorMsg.includes('cors')) {
        handleSupabaseConnectionError(error);
        return updates;
      }
      const missing = getMissingColumnFromError(error);
      if (missing) {
        blacklistedProfileColumns.add(missing);
        if (knownProfileColumns) knownProfileColumns.delete(missing);
        attempt++;
        continue;
      }
      throw error;
    }
    return data;
  }
  console.warn('Falha ao atualizar perfil após remover colunas inexistentes. Prosseguindo de forma resiliente...');
  return updates;
};

export const safeUpsertSingleProfile = async (profile: any): Promise<any> => {
  if (!isUsingRealSupabase) return profile;
  let attempt = 0;
  while (attempt < 15) {
    const payload = cleanProfilePayload(profile);
    const { data, error } = await realSupabase!.from('profiles').upsert(payload).select().maybeSingle();
    if (error) {
      const errorMsg = String(error.message || '').toLowerCase();
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network error') || errorMsg.includes('load failed') || errorMsg.includes('fetch') || errorMsg.includes('cors')) {
        handleSupabaseConnectionError(error);
        return profile;
      }
      const missing = getMissingColumnFromError(error);
      if (missing) {
        blacklistedProfileColumns.add(missing);
        if (knownProfileColumns) knownProfileColumns.delete(missing);
        attempt++;
        continue;
      }
      throw error;
    }
    return data;
  }
  console.warn('Falha ao realizar upsert de perfil após remover colunas inexistentes. Prosseguindo de forma resiliente...');
  return profile;
};

export const safeUpsertProfiles = async (profiles: any[]): Promise<any> => {
  if (!isUsingRealSupabase) return profiles;
  let attempt = 0;
  let payloads = profiles.map(p => cleanProfilePayload(p));
  while (attempt < 15) {
    const { data, error } = await realSupabase!.from('profiles').upsert(payloads).select();
    if (error) {
      const errorMsg = String(error.message || '').toLowerCase();
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network error') || errorMsg.includes('load failed') || errorMsg.includes('fetch') || errorMsg.includes('cors')) {
        handleSupabaseConnectionError(error);
        return profiles;
      }
      const missing = getMissingColumnFromError(error);
      if (missing) {
        blacklistedProfileColumns.add(missing);
        if (knownProfileColumns) knownProfileColumns.delete(missing);
        payloads = profiles.map(p => cleanProfilePayload(p));
        attempt++;
        continue;
      }
      // If any other bulk upsert error occurs, fall back to individual safe upsert
      console.warn("Bulk upsert failed, executing single-row upserts safely:", error);
      const results = [];
      for (const p of profiles) {
        const res = await safeUpsertSingleProfile(p);
        results.push(res);
      }
      return results;
    }
    return data;
  }
  console.warn('Falha ao realizar upsert em lote de perfis após remover colunas inexistentes. Prosseguindo de forma resiliente...');
  return profiles;
};

// ==========================================
// HIGH-FIDELITY LOCAL STATE FALLBACK ENGINE
// ==========================================
// This acts as a fully-featured local backend in case Supabase keys aren't configured yet,
// so the user can play with the entire app (chat, games, virtual economy, social feed, admin panel) instantly!

const DEFAULT_GIFT_CATALOG: Gift[] = [
  { id: 'g_love', nome: 'Love', imagem: '💖', valor: 0.1 },
  { id: 'g_black_diamond', nome: 'Black Diamond', imagem: '💎', valor: 600 },
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

const SEED_ANUNCIOS: Anuncio[] = [
  {
    id: 'ad_1',
    autor_id: 'u1',
    autor_username: 'kelvin',
    texto: 'Seja bem-vindo ao FCFUNZ! Adquira MZN com nossos revendedores autorizados ou apoiando nossa vaquinha! 🚀',
    visualizacoes: 45,
    dias: 7,
    valor_pago: 250,
    criado_em: '2026-07-01T00:00:00.000Z',
    expira_em: '2026-07-08T00:00:00.000Z',
    status: 'active'
  },
  {
    id: 'ad_2',
    autor_id: 'u2',
    autor_username: 'fcfunz_staff',
    texto: 'Quer anunciar seu clã, sua sala ou seus mimos aqui? Crie um anúncio no nosso Marketplace por apenas 50 MZN!',
    visualizacoes: 120,
    dias: 3,
    valor_pago: 120,
    criado_em: '2026-07-03T00:00:00.000Z',
    expira_em: '2026-07-06T00:00:00.000Z',
    status: 'active'
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

export const BOT_PROFILES_STATIC_LIST: Profile[] = [
  {
    id: 'bot_u_mari',
    username: 'Mari_Social',
    nome: 'Mariana',
    sobrenome: 'Silva',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    cargo: 'Verified User',
    pais: 'MZ',
    sexo: 'M',
    nivel: 10,
    xp: 1500,
    credits: 1000,
    bonus: 0,
    points: 500,
    mpoint: 50,
    criado_em: '2026-01-01T00:00:00.000Z',
    online_points: 0,
    black_diamonds: 0,
    last_level_up_at: '2026-01-01T00:00:00.000Z',
    password: '123',
    security_question: 'Qual o nome do seu primeiro animal de estimação?',
    security_answer: 'Rex',
    merchant_pin: '1234'
  },
  {
    id: 'bot_u_lucas',
    username: 'LucasCurioso',
    nome: 'Lucas',
    sobrenome: 'Matusse',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    cargo: 'Verified User',
    pais: 'MZ',
    sexo: 'M',
    nivel: 10,
    xp: 1500,
    credits: 1000,
    bonus: 0,
    points: 500,
    mpoint: 50,
    criado_em: '2026-01-01T00:00:00.000Z',
    online_points: 0,
    black_diamonds: 0,
    last_level_up_at: '2026-01-01T00:00:00.000Z',
    password: '123',
    security_question: 'Qual o nome do seu primeiro animal de estimação?',
    security_answer: 'Rex',
    merchant_pin: '1234'
  },
  {
    id: 'bot_u_gamerx',
    username: 'GamerX_MZ',
    nome: 'Nélio',
    sobrenome: 'Chambone',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    cargo: 'Verified User',
    pais: 'MZ',
    sexo: 'M',
    nivel: 10,
    xp: 1500,
    credits: 1000,
    bonus: 0,
    points: 500,
    mpoint: 50,
    criado_em: '2026-01-01T00:00:00.000Z',
    online_points: 0,
    black_diamonds: 0,
    last_level_up_at: '2026-01-01T00:00:00.000Z',
    password: '123',
    security_question: 'Qual o nome do seu primeiro animal de estimação?',
    security_answer: 'Rex',
    merchant_pin: '1234'
  },
  {
    id: 'bot_u_ajudante',
    username: 'Guia_FCFUNZ',
    nome: 'Ajudante',
    sobrenome: 'Oficial',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    cargo: 'Guide',
    pais: 'MZ',
    sexo: 'M',
    nivel: 10,
    xp: 1500,
    credits: 1000,
    bonus: 0,
    points: 500,
    mpoint: 50,
    criado_em: '2026-01-01T00:00:00.000Z',
    online_points: 0,
    black_diamonds: 0,
    last_level_up_at: '2026-01-01T00:00:00.000Z',
    password: '123',
    security_question: 'Qual o nome do seu primeiro animal de estimação?',
    security_answer: 'Rex',
    merchant_pin: '1234'
  },
  {
    id: 'bot_u_timida',
    username: 'Bela_Timida',
    nome: 'Anabela',
    sobrenome: 'Macuacua',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    cargo: 'Unverified User',
    pais: 'MZ',
    sexo: 'M',
    nivel: 10,
    xp: 1500,
    credits: 1000,
    bonus: 0,
    points: 500,
    mpoint: 50,
    criado_em: '2026-01-01T00:00:00.000Z',
    online_points: 0,
    black_diamonds: 0,
    last_level_up_at: '2026-01-01T00:00:00.000Z',
    password: '123',
    security_question: 'Qual o nome do seu primeiro animal de estimação?',
    security_answer: 'Rex',
    merchant_pin: '1234'
  },
  {
    id: 'bot_u_prestigio',
    username: 'Prestigio_Bot',
    nome: 'Rei',
    sobrenome: 'Do_Papo',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    cargo: 'Super Merchant',
    pais: 'MZ',
    sexo: 'M',
    nivel: 10,
    xp: 1500,
    credits: 1000,
    bonus: 0,
    points: 500,
    mpoint: 50,
    criado_em: '2026-01-01T00:00:00.000Z',
    online_points: 0,
    black_diamonds: 0,
    last_level_up_at: '2026-01-01T00:00:00.000Z',
    password: '123',
    security_question: 'Qual o nome do seu primeiro animal de estimação?',
    security_answer: 'Rex',
    merchant_pin: '1234'
  },
];

export const getBotProfile = (id: string): Profile | null => {
  return BOT_PROFILES_STATIC_LIST.find(b => b.id === id) || null;
};

function recordsEqual(r1: any, r2: any): boolean {
  if (!r1 || !r2) return false;
  const keys = new Set([...Object.keys(r1), ...Object.keys(r2)]);
  for (const k of keys) {
    if (typeof r1[k] === 'function' || typeof r2[k] === 'function') continue;
    const v1 = r1[k];
    const v2 = r2[k];
    if (v1 === v2) continue;
    if (typeof v1 === 'object' || typeof v2 === 'object') {
      if (JSON.stringify(v1) !== JSON.stringify(v2)) return false;
      continue;
    }
    return false;
  }
  return true;
}

export const INITIAL_BOT_CONFIGS: BotConfig[] = [
  {
    id: 'bot_u_mari',
    username: 'Mari_Social',
    nome: 'Mariana',
    sobrenome: 'Silva',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    cargo: 'Verified User',
    bio: 'Adoro fazer novos amigos e espalhar energia positiva! ✨ Vamos papear?',
    type: 'social',
    personality: 'extrovertido',
    active: true,
    dailyBudget: 50,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0,
    password: '123'
  },
  {
    id: 'bot_u_lucas',
    username: 'LucasCurioso',
    nome: 'Lucas',
    sobrenome: 'Matusse',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    cargo: 'Verified User',
    bio: 'Sempre curioso. Gosto de fazer perguntas e descobrir coisas novas. 🧐',
    type: 'social',
    personality: 'curioso',
    active: true,
    dailyBudget: 40,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0,
    password: '123'
  },
  {
    id: 'bot_u_gamerx',
    username: 'GamerX_MZ',
    nome: 'Nélio',
    sobrenome: 'Chambone',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    cargo: 'Verified User',
    bio: 'Viciado em jogos e piadas ruins! Rir é o melhor remédio kkkk 🎮🎲',
    type: 'movimentador',
    personality: 'engracado',
    active: true,
    dailyBudget: 30,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0,
    password: '123'
  },
  {
    id: 'bot_u_ajudante',
    username: 'Guia_FCFUNZ',
    nome: 'Ajudante',
    sobrenome: 'Oficial',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    cargo: 'Guide',
    bio: 'Olá! Sou o Guia oficial do FCFUNZ. Dúvidas sobre o chat, pontos ou MPoints? Só chamar! 💡',
    type: 'respondedor',
    personality: 'ajudante',
    active: true,
    dailyBudget: 100,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0,
    password: '123'
  },
  {
    id: 'bot_u_timida',
    username: 'Bela_Timida',
    nome: 'Anabela',
    sobrenome: 'Macuacua',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    cargo: 'Unverified User',
    bio: 'Um pouco tímida... mas gosto de ler as conversas e dar opiniões de vez em quando. 😊',
    type: 'social',
    personality: 'timido',
    active: true,
    dailyBudget: 20,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0,
    password: '123'
  },
  {
    id: 'bot_u_prestigio',
    username: 'Prestigio_Bot',
    nome: 'Rei',
    sobrenome: 'Do_Papo',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    cargo: 'Super Merchant',
    bio: 'Gosto de presentear quem mantém o chat ativo! Generosidade gera generosidade. 🔥🎁',
    type: 'presenteador',
    personality: 'extrovertido',
    active: true,
    dailyBudget: 150,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0,
    password: '123'
  }
];

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
  anuncios: Anuncio[] = [];
  p2pOrders: P2POrder[] = [];
  merchantRates: MerchantRate[] = [];
  botConfigs: BotConfig[] = [];
  botActions: BotAction[] = [];
  credits_responsible_user_id: string = 'u1';
  credits_responsible_phone: string = '870870059';
  activeUserId: string = 'u1'; // Default logged in as Kelvin

  lastSyncedState: { [key: string]: any[] } = {};
  isPushingSync: boolean = false;
  hasPendingChanges: boolean = false;

  ensureBotProfiles() {
    BOT_PROFILES_STATIC_LIST.forEach(botProfile => {
      const exists = this.profiles.some(p => p.id === botProfile.id);
      if (!exists) {
        this.profiles.push(botProfile);
      }
    });
  }

  updateLastSyncedState() {
    this.lastSyncedState = {
      profiles: JSON.parse(JSON.stringify(this.profiles)),
      salas: JSON.parse(JSON.stringify(this.salas)),
      mensagens: JSON.parse(JSON.stringify(this.mensagens)),
      tweets: JSON.parse(JSON.stringify(this.tweets)),
      comments: JSON.parse(JSON.stringify(this.comments)),
      amizades: JSON.parse(JSON.stringify(this.amizades)),
      mensagensPrivadas: JSON.parse(JSON.stringify(this.mensagensPrivadas)),
      apolloCodes: JSON.parse(JSON.stringify(this.apolloCodes)),
      notifications: JSON.parse(JSON.stringify(this.notifications)),
      diceGames: JSON.parse(JSON.stringify(this.diceGames)),
      transactions: JSON.parse(JSON.stringify(this.transactions)),
      vaquinhaContributions: JSON.parse(JSON.stringify(this.vaquinhaContributions)),
      competitions: JSON.parse(JSON.stringify(this.competitions)),
      anuncios: JSON.parse(JSON.stringify(this.anuncios))
    };
  }

  async syncDirtyToSupabase() {
    if (!isUsingRealSupabase || !realSupabase) return;
    if (this.isPushingSync) {
      this.hasPendingChanges = true;
      return;
    }
    this.isPushingSync = true;
    
    try {
      const tableConfig = [
        { key: 'profiles', array: this.profiles, tableName: 'profiles' },
        { key: 'salas', array: this.salas, tableName: 'salas' },
        { key: 'mensagens', array: this.mensagens, tableName: 'mensagens' },
        { key: 'tweets', array: this.tweets, tableName: 'tweets' },
        { key: 'comments', array: this.comments, tableName: 'comments' },
        { key: 'amizades', array: this.amizades, tableName: 'amizades' },
        { key: 'mensagensPrivadas', array: this.mensagensPrivadas, tableName: 'mensagens_privadas' },
        { key: 'apolloCodes', array: this.apolloCodes, tableName: 'apollo_codes' },
        { key: 'notifications', array: this.notifications, tableName: 'notifications' },
        { key: 'diceGames', array: this.diceGames, tableName: 'dice_games' },
        { key: 'transactions', array: this.transactions, tableName: 'transactions' },
        { key: 'vaquinhaContributions', array: this.vaquinhaContributions, tableName: 'vaquinha_contributions' },
        { key: 'competitions', array: this.competitions, tableName: 'competitions' },
        { key: 'anuncios', array: this.anuncios, tableName: 'anuncios' }
      ];

      for (const config of tableConfig) {
        const currentArray = config.array;
        const lastSyncedArray = this.lastSyncedState[config.key] || [];

        const dirtyRecords = [];
        for (const currentRecord of currentArray) {
          const syncedRecord = lastSyncedArray.find((r: any) => r.id === currentRecord.id);
          if (!syncedRecord || !recordsEqual(currentRecord, syncedRecord)) {
            dirtyRecords.push(currentRecord);
          }
        }

        if (dirtyRecords.length > 0) {
          await safeUpsertTable(config.tableName, dirtyRecords);
          this.lastSyncedState[config.key] = JSON.parse(JSON.stringify(currentArray));
        }
      }
    } catch (err) {
      console.warn('FCFUNZ Error in syncDirtyToSupabase:', err);
    } finally {
      this.isPushingSync = false;
      if (this.hasPendingChanges) {
        this.hasPendingChanges = false;
        setTimeout(() => this.syncDirtyToSupabase(), 300);
      }
    }
  }

  constructor() {
    this.profiles = loadFromStorage('profiles', SEED_PROFILES);
    this.ensureBotProfiles();
    this.updateLastSyncedState();
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
    this.anuncios = loadFromStorage('anuncios', SEED_ANUNCIOS);
    this.p2pOrders = loadFromStorage('p2p_orders', []);
    this.botConfigs = loadFromStorage('bot_configs', INITIAL_BOT_CONFIGS);
    this.botActions = loadFromStorage('bot_actions', []);
    this.merchantRates = loadFromStorage('merchant_rates', [
      { merchant_id: 'u1', rate: 1.20 },
      { merchant_id: 'u3', rate: 1.25 },
      { merchant_id: 'u2', rate: 1.15 }
    ]);
    
    this.credits_responsible_user_id = localStorage.getItem('fcfunz_credits_resp_user') || 'u1';
    this.credits_responsible_phone = localStorage.getItem('fcfunz_credits_resp_phone') || '870870059';
    
    const storedUser = localStorage.getItem('fcfunz_active_user_id');
    if (storedUser) {
      this.activeUserId = storedUser;
    } else {
      localStorage.setItem('fcfunz_active_user_id', 'u1');
    }

    this.checkMerchantExpirations();

    // Start live polling sync loop if Supabase keys are configured!
    if (isUsingRealSupabase) {
      this.syncFromSupabase().then(() => {
        // Setup real-time postgres subscriptions for immediate instant updates across all tables
        this.setupRealtimeSubscriptions();

        // Gentle backup poll every 20 seconds to guarantee consistency
        setInterval(() => {
          this.syncFromSupabase().then(() => {
            // Trigger update listeners so the UI re-renders with Supabase remote updates
            updateListeners.forEach(cb => cb());
          }).catch(err => {
            handleSupabaseConnectionError(err);
          });
        }, 20000);
      }).catch(err => {
        handleSupabaseConnectionError(err);
      });
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    const idx = this.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      const oldCargo = this.profiles[idx].cargo;
      this.profiles[idx] = { ...this.profiles[idx], ...updates } as Profile;
      const newCargo = this.profiles[idx].cargo;

      if (updates.cargo && oldCargo !== newCargo) {
        await api.addNotification({
          usuario_id: userId,
          title: '🎖️ Cargo Atualizado!',
          message: `Seu cargo de usuário foi alterado de "${oldCargo}" para o cargo especial de "${newCargo}"! Parabéns! 🎉`,
          type: 'system',
          sender_id: 'system',
          sender_username: 'Sistema FCFUNZ'
        });
      }
    }
    if (isUsingRealSupabase && realSupabase) {
      try {
        await safeUpdateProfile(userId, updates);
      } catch (error) {
        console.warn(`Error updating profile ${userId}:`, error);
      }
    }
    notifyUpdate();
  }

  setupRealtimeSubscriptions() {
    if (!isUsingRealSupabase || !realSupabase) return;

    const tables = [
      'profiles',
      'salas',
      'mensagens',
      'tweets',
      'comments',
      'amizades',
      'mensagens_privadas',
      'apollo_codes',
      'notifications',
      'dice_games',
      'transactions',
      'banned_global',
      'room_kicks',
      'room_bans',
      'group_bans',
      'favorites',
      'room_participants',
      'vaquinha_contributions',
      'competitions',
      'anuncios',
      'sys_config'
    ];

    tables.forEach(table => {
      realSupabase!.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          this.handleRealtimeChange(table, payload);
        })
        .subscribe();
    });
  }

  handleRealtimeChange(table: string, payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    const updateLocalArray = (arr: any[], key = 'id') => {
      if (eventType === 'INSERT') {
        const idx = arr.findIndex(item => item[key] === newRecord[key]);
        if (idx === -1) {
          arr.push(newRecord);
        }
      } else if (eventType === 'UPDATE') {
        const idx = arr.findIndex(item => item[key] === newRecord[key]);
        if (idx !== -1) {
          arr[idx] = { ...arr[idx], ...newRecord };
        } else {
          arr.push(newRecord);
        }
      } else if (eventType === 'DELETE') {
        const targetId = oldRecord ? oldRecord[key] : null;
        if (targetId) {
          const idx = arr.findIndex(item => item[key] === targetId);
          if (idx !== -1) {
            arr.splice(idx, 1);
          }
        }
      }
    };

    switch (table) {
      case 'profiles':
        updateLocalArray(this.profiles);
        this.ensureBotProfiles();
        break;
      case 'salas':
        updateLocalArray(this.salas);
        break;
      case 'mensagens': {
        if (newRecord) {
          newRecord.targetBotId = newRecord.targetbotid !== undefined ? newRecord.targetbotid : newRecord.targetBotId;
        }
        updateLocalArray(this.mensagens);
        if (eventType === 'INSERT') {
          const listeners = chatListeners.get(newRecord.sala_id);
          if (listeners) {
            const author = this.profiles.find(p => p.id === newRecord.autor_id);
            const enrichedMsg = {
              ...newRecord,
              autor_username: author?.username || newRecord.autor_username || 'user',
              autor_cargo: author?.cargo || newRecord.autor_cargo || 'Verified User',
              autor_avatar: author?.avatar_url || newRecord.autor_avatar || ''
            };
            listeners.forEach(cb => cb(enrichedMsg));
          }
        }
        break;
      }
      case 'tweets':
        updateLocalArray(this.tweets);
        break;
      case 'comments':
        updateLocalArray(this.comments);
        break;
      case 'amizades':
        updateLocalArray(this.amizades);
        break;
      case 'mensagens_privadas': {
        updateLocalArray(this.mensagensPrivadas);
        if (eventType === 'INSERT') {
          pmListeners.forEach(cb => cb(newRecord));
        }
        break;
      }
      case 'apollo_codes':
        updateLocalArray(this.apolloCodes);
        break;
      case 'notifications':
        updateLocalArray(this.notifications);
        break;
      case 'dice_games':
        updateLocalArray(this.diceGames);
        break;
      case 'transactions':
        updateLocalArray(this.transactions);
        break;
      case 'banned_global':
        if (eventType === 'INSERT') {
          if (!this.banned_global.includes(newRecord.user_id)) {
            this.banned_global.push(newRecord.user_id);
          }
        } else if (eventType === 'DELETE') {
          this.banned_global = this.banned_global.filter(uid => uid !== oldRecord.user_id);
        }
        break;
      case 'room_kicks':
        updateLocalArray(this.room_kicks);
        break;
      case 'room_bans':
        updateLocalArray(this.room_bans);
        break;
      case 'group_bans':
        updateLocalArray(this.group_bans);
        break;
      case 'favorites':
        updateLocalArray(this.favorites);
        break;
      case 'room_participants':
        updateLocalArray(this.room_participants);
        break;
      case 'vaquinha_contributions':
        updateLocalArray(this.vaquinhaContributions);
        break;
      case 'competitions':
        updateLocalArray(this.competitions);
        break;
      case 'anuncios':
        updateLocalArray(this.anuncios);
        break;
      case 'sys_config':
        if (newRecord && newRecord.key === 'credits_responsible_user_id') {
          this.credits_responsible_user_id = newRecord.value;
        }
        if (newRecord && newRecord.key === 'credits_responsible_phone') {
          this.credits_responsible_phone = newRecord.value;
        }
        break;
    }

    updateListeners.forEach(cb => cb());
  }

  isSyncing = false;

  async syncFromSupabase() {
    if (!isUsingRealSupabase) return;
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profilesError } = await realSupabase!.from('profiles').select('*');
      if (profilesError) {
        const pMsg = String(profilesError.message || '').toLowerCase();
        if (pMsg.includes('failed to fetch') || pMsg.includes('load failed') || pMsg.includes('networkerror') || pMsg.includes('cors') || pMsg.includes('network error') || pMsg.includes('fetch')) {
          throw new Error('Failed to fetch');
        }
      }
      if (!profilesError && profilesData) {
        if (profilesData.length > 0) {
          knownProfileColumns = new Set(Object.keys(profilesData[0]));
          this.profiles = profilesData as Profile[];
          this.ensureBotProfiles();
        } else {
          await safeUpsertProfiles(SEED_PROFILES);
        }
      }

      // 2. Fetch salas
      const { data: salasData, error: salasError } = await realSupabase!.from('salas').select('*');
      if (!salasError && salasData) {
        if (salasData.length > 0) {
          this.salas = salasData as Sala[];
        } else {
          await realSupabase!.from('salas').insert(SEED_SALAS);
        }
      }

      // 3. Fetch mensagens
      const { data: mensagensData, error: msgError } = await realSupabase!.from('mensagens').select('*');
      if (!msgError && mensagensData) {
        this.mensagens = (mensagensData as any[]).map(m => ({
          ...m,
          targetBotId: m.targetbotid !== undefined ? m.targetbotid : m.targetBotId
        })) as Mensagem[];
      }

      // 4. Fetch tweets
      const { data: tweetsData, error: tweetsError } = await realSupabase!.from('tweets').select('*');
      if (!tweetsError && tweetsData) {
        if (tweetsData.length > 0) {
          this.tweets = tweetsData as Tweet[];
        } else {
          await realSupabase!.from('tweets').insert(SEED_TWEETS);
        }
      }

      // 5. Fetch comments
      const { data: commentsData, error: commentsError } = await realSupabase!.from('comments').select('*');
      if (!commentsError && commentsData) {
        this.comments = commentsData as TweetComment[];
      }

      // 6. Fetch amizades
      const { data: amizadesData, error: amizadesError } = await realSupabase!.from('amizades').select('*');
      if (!amizadesError && amizadesData) {
        this.amizades = amizadesData as Amizade[];
      }

      // 7. Fetch mensagens_privadas
      const { data: pmsData, error: pmsError } = await realSupabase!.from('mensagens_privadas').select('*');
      if (!pmsError && pmsData) {
        this.mensagensPrivadas = pmsData as MensagemPrivada[];
      }

      // 8. Fetch apollo_codes
      const { data: codesData, error: codesError } = await realSupabase!.from('apollo_codes').select('*');
      if (!codesError && codesData) {
        if (codesData.length > 0) {
          this.apolloCodes = codesData as ApolloCode[];
        } else {
          await realSupabase!.from('apollo_codes').insert(SEED_CODES);
        }
      }

      // 9. Fetch notifications
      const { data: notifData, error: notifError } = await realSupabase!.from('notifications').select('*');
      if (!notifError && notifData) {
        this.notifications = notifData as AppNotification[];
      }

      // 10. Fetch dice_games
      const { data: diceData, error: diceError } = await realSupabase!.from('dice_games').select('*');
      if (!diceError && diceData) {
        this.diceGames = diceData as MultiplayerDiceGame[];
      }

      // 11. Fetch transactions
      const { data: txData, error: txError } = await realSupabase!.from('transactions').select('*');
      if (!txError && txData) {
        if (txData.length > 0) {
          this.transactions = txData as Transaction[];
        } else {
          await realSupabase!.from('transactions').insert(SEED_TRANSACTIONS);
        }
      }

      // 12. Fetch banned_global
      const { data: bansData, error: bansError } = await realSupabase!.from('banned_global').select('*');
      if (!bansError && bansData) {
        this.banned_global = bansData.map((b: any) => b.user_id);
      }

      // 13. Fetch room_kicks
      const { data: kicksData, error: kicksError } = await realSupabase!.from('room_kicks').select('*');
      if (!kicksError && kicksData) {
        this.room_kicks = kicksData as any[];
      }

      // 14. Fetch room_bans
      const { data: roomBansData, error: roomBansError } = await realSupabase!.from('room_bans').select('*');
      if (!roomBansError && roomBansData) {
        this.room_bans = roomBansData as any[];
      }

      // 15. Fetch group_bans
      const { data: groupBansData, error: groupBansError } = await realSupabase!.from('group_bans').select('*');
      if (!groupBansError && groupBansData) {
        this.group_bans = groupBansData as any[];
      }

      // 16. Fetch favorites
      const { data: favsData, error: favsError } = await realSupabase!.from('favorites').select('*');
      if (!favsError && favsData) {
        this.favorites = favsData as any[];
      }

      // 17. Fetch room_participants
      const { data: partsData, error: partsError } = await realSupabase!.from('room_participants').select('*');
      if (!partsError && partsData) {
        this.room_participants = partsData as any[];
      }

      // 18. Fetch vaquinha_contributions
      const { data: vaquinhaData, error: vaquinhaError } = await realSupabase!.from('vaquinha_contributions').select('*');
      if (!vaquinhaError && vaquinhaData) {
        if (vaquinhaData.length > 0) {
          this.vaquinhaContributions = vaquinhaData as VaquinhaContribution[];
        } else {
          await realSupabase!.from('vaquinha_contributions').insert(SEED_VAQUINHA);
        }
      }

      // 19. Fetch competitions
      const { data: compData, error: compError } = await realSupabase!.from('competitions').select('*');
      if (!compError && compData) {
        this.competitions = compData as LeaderboardCompetition[];
      }

      // 20. Fetch anuncios
      const { data: anunciosData, error: anunciosError } = await realSupabase!.from('anuncios').select('*');
      if (!anunciosError && anunciosData) {
        if (anunciosData.length > 0) {
          this.anuncios = anunciosData as Anuncio[];
        } else {
          await realSupabase!.from('anuncios').insert(SEED_ANUNCIOS);
        }
      }

      // 21. Fetch sys_config
      const { data: sysData, error: sysError } = await realSupabase!.from('sys_config').select('*');
      if (!sysError && sysData) {
        const respUser = sysData.find((s: any) => s.key === 'credits_responsible_user_id');
        const respPhone = sysData.find((s: any) => s.key === 'credits_responsible_phone');
        if (respUser) this.credits_responsible_user_id = respUser.value;
        if (respPhone) this.credits_responsible_phone = respPhone.value;
      }
      this.updateLastSyncedState();
      supabaseError = null;
    } catch (err: any) {
      console.warn('FCFUNZ Error pulling sync from Supabase:', err);
      supabaseError = err?.message || String(err);
      if (isUsingRealSupabase) {
        console.warn('⚠️ Conexão ou sincronização com o Supabase falhou. Ativando o modo de contingência local automaticamente...');
        isUsingRealSupabase = false;
        this.loadLocalDataFallback();
        notifyUpdate();
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async saveToSupabase() {
    if (!isUsingRealSupabase) return;
    try {
      const promises: any[] = [
        safeUpsertProfiles(this.profiles),
        realSupabase!.from('salas').upsert(this.salas),
        realSupabase!.from('mensagens').upsert(this.mensagens),
        realSupabase!.from('tweets').upsert(this.tweets),
        realSupabase!.from('comments').upsert(this.comments),
        realSupabase!.from('amizades').upsert(this.amizades),
        realSupabase!.from('mensagens_privadas').upsert(this.mensagensPrivadas),
        realSupabase!.from('apollo_codes').upsert(this.apolloCodes),
        realSupabase!.from('notifications').upsert(this.notifications),
        realSupabase!.from('dice_games').upsert(this.diceGames),
        realSupabase!.from('transactions').upsert(this.transactions),
        realSupabase!.from('room_kicks').upsert(this.room_kicks),
        realSupabase!.from('room_bans').upsert(this.room_bans),
        realSupabase!.from('group_bans').upsert(this.group_bans),
        realSupabase!.from('favorites').upsert(this.favorites),
        realSupabase!.from('room_participants').upsert(this.room_participants),
        realSupabase!.from('vaquinha_contributions').upsert(this.vaquinhaContributions),
        realSupabase!.from('competitions').upsert(this.competitions),
        realSupabase!.from('anuncios').upsert(this.anuncios),
        realSupabase!.from('sys_config').upsert([
          { key: 'credits_responsible_user_id', value: this.credits_responsible_user_id },
          { key: 'credits_responsible_phone', value: this.credits_responsible_phone }
        ])
      ];

      const bansRecords = this.banned_global.map(userId => ({ user_id: userId, created_at: new Date().toISOString() }));
      if (bansRecords.length > 0) {
        promises.push(realSupabase!.from('banned_global').upsert(bansRecords));
      }

      await Promise.all(promises);
    } catch (err) {
      console.warn('FCFUNZ Error pushing sync to Supabase:', err);
      handleSupabaseConnectionError(err);
    }
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
    saveToStorage('anuncios', this.anuncios);
    saveToStorage('p2p_orders', this.p2pOrders);
    saveToStorage('bot_configs', this.botConfigs);
    saveToStorage('bot_actions', this.botActions);
    saveToStorage('merchant_rates', this.merchantRates);
    localStorage.setItem('fcfunz_credits_resp_user', this.credits_responsible_user_id);
    localStorage.setItem('fcfunz_credits_resp_phone', this.credits_responsible_phone);

    // Sync changes to Supabase in the background!
    if (isUsingRealSupabase) {
      this.syncDirtyToSupabase().catch(err => {
        console.warn('FCFUNZ Error in background syncDirtyToSupabase:', err);
      });
    }
  }

  loadLocalDataFallback() {
    this.profiles = loadFromStorage('profiles', SEED_PROFILES);
    this.ensureBotProfiles();
    this.salas = loadFromStorage('salas', SEED_SALAS);
    this.mensagens = loadFromStorage('mensagens', SEED_MENSAGENS);
    this.tweets = loadFromStorage('tweets', SEED_TWEETS);
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
    this.anuncios = loadFromStorage('anuncios', SEED_ANUNCIOS);
    this.botConfigs = loadFromStorage('bot_configs', INITIAL_BOT_CONFIGS);
    this.botActions = loadFromStorage('bot_actions', []);
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
  // --- P2P TRANSACTIONS ---
  getP2POrders: async (): Promise<P2POrder[]> => {
    return db.p2pOrders;
  },
  createP2POrder: async (order: Omit<P2POrder, 'id' | 'created_at' | 'status'>): Promise<P2POrder> => {
    const newOrder: P2POrder = {
      ...order,
      id: 'p2p_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    db.p2pOrders.push(newOrder);
    
    // If it's a withdrawal, subtract credits from the user immediately
    if (order.type === 'withdrawal') {
      const uIdx = db.profiles.findIndex(p => p.id === order.buyer_id);
      if (uIdx !== -1) {
        db.profiles[uIdx].credits = Math.max(0, (db.profiles[uIdx].credits || 0) - order.amount_mzn);
        db.profiles[uIdx].last_withdrawal_at = new Date().toISOString();
      }
    }

    db.save();
    notifyUpdate();
    return newOrder;
  },
  updateP2POrderStatus: async (orderId: string, status: P2POrder['status']): Promise<P2POrder> => {
    const orderIdx = db.p2pOrders.findIndex(o => o.id === orderId);
    if (orderIdx === -1) throw new Error('Ordem P2P não encontrada.');
    const order = db.p2pOrders[orderIdx];
    const oldStatus = order.status;
    order.status = status;
    if (status === 'completed') {
      order.completed_at = new Date().toISOString();
      // If it was a deposit, add credits to the buyer now!
      if (order.type === 'deposit') {
        const uIdx = db.profiles.findIndex(p => p.id === order.buyer_id);
        if (uIdx !== -1) {
          db.profiles[uIdx].credits = (db.profiles[uIdx].credits || 0) + order.amount_mzn;
          
          // Trigger a beautiful notification
          await api.addNotification({
            usuario_id: order.buyer_id,
            title: '💸 Créditos P2P Liberados!',
            message: `Sua compra de ${order.amount_mzn} MZN de @${order.merchant_username} foi liberada com sucesso! Seus créditos já estão disponíveis. 🎉`,
            type: 'system',
            sender_id: 'system',
            sender_username: 'Sistema FCFUNZ'
          });
        }
      } else if (order.type === 'withdrawal') {
        // Withdrawal completed by merchant/admin! Trigger notification to user
        await api.addNotification({
          usuario_id: order.buyer_id,
          title: '✅ Levantamento Pago!',
          message: `Seu levantamento de ${order.amount_mzn} MZN foi pago via e-Mola para o número ${order.withdrawal_phone}! Verifique sua carteira. 📱`,
          type: 'system',
          sender_id: 'system',
          sender_username: 'Sistema FCFUNZ'
        });
      }
    } else if (status === 'rejected') {
      // If a withdrawal is rejected, refund the user's credits!
      if (order.type === 'withdrawal' && oldStatus === 'pending') {
        const uIdx = db.profiles.findIndex(p => p.id === order.buyer_id);
        if (uIdx !== -1) {
          db.profiles[uIdx].credits = (db.profiles[uIdx].credits || 0) + order.amount_mzn;
          // Clear last withdrawal limit so they can retry
          delete db.profiles[uIdx].last_withdrawal_at;
          
          await api.addNotification({
            usuario_id: order.buyer_id,
            title: '❌ Levantamento Rejeitado',
            message: `Seu pedido de levantamento de ${order.amount_mzn} MZN foi recusado. Seus créditos de ${order.amount_mzn} MZN foram estornados.`,
            type: 'system',
            sender_id: 'system',
            sender_username: 'Sistema FCFUNZ'
          });
        }
      }
    } else if (status === 'disputed') {
      // Put in dispute, trigger notification to both parties
      await api.addNotification({
        usuario_id: order.buyer_id,
        title: '⚠️ Ordem em Disputa',
        message: `Sua ordem P2P de ${order.amount_mzn} MZN com @${order.merchant_username} entrou em disputa e está sob análise da Administração.`,
        type: 'system',
        sender_id: 'system',
        sender_username: 'Sistema FCFUNZ'
      });
    }

    db.save();
    notifyUpdate();
    return order;
  },
  getMerchantRates: async (): Promise<MerchantRate[]> => {
    return db.merchantRates;
  },
  updateMerchantRate: async (merchantId: string, rate: number): Promise<void> => {
    const idx = db.merchantRates.findIndex(m => m.merchant_id === merchantId);
    if (idx !== -1) {
      db.merchantRates[idx].rate = rate;
    } else {
      db.merchantRates.push({ merchant_id: merchantId, rate });
    }
    
    // Also save rate in merchant's profile directly
    const uIdx = db.profiles.findIndex(p => p.id === merchantId);
    if (uIdx !== -1) {
      db.profiles[uIdx].merchant_rate_sell = rate;
    }

    db.save();
    notifyUpdate();
  },

  // --- AUTH / PROFILE ---
  getCurrentUser: async (): Promise<Profile> => {
    if (isUsingRealSupabase) {
      try {
        const { data: { user } } = await realSupabase!.auth.getUser();
        if (user) {
          const { data } = await realSupabase!.from('profiles').select('*').eq('id', user.id).single();
          if (data) {
            db.setActiveUser(data.id);
            return data as Profile;
          }
        }
      } catch (err: any) {
        const msg = String(err.message || err || '').toLowerCase();
        if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
          handleSupabaseConnectionError(err);
          return db.getActiveProfile();
        }
        handleSupabaseConnectionError(err);
      }
      return null as any; // Return null instead of falling back to default local profile
    }
    return db.getActiveProfile();
  },

  getAllUsers: async (): Promise<Profile[]> => {
    if (isUsingRealSupabase) {
      try {
        const { data } = await realSupabase!.from('profiles').select('*');
        if (data) return data as Profile[];
      } catch (err: any) {
        const msg = String(err.message || err || '').toLowerCase();
        if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
          handleSupabaseConnectionError(err);
        } else {
          handleSupabaseConnectionError(err);
        }
      }
    }
    return db.profiles;
  },

  updateProfile: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
    await db.updateProfile(id, updates);
    return db.profiles.find(p => p.id === id)!;
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
    if (isUsingRealSupabase) {
      try {
        const { data: signUpData, error: signUpError } = await realSupabase!.auth.signUp({
          email: fields.email,
          password: fields.password || '123',
        });
        if (signUpError) {
          throw signUpError;
        }
        if (!signUpData.user) throw new Error('Erro ao criar conta no Supabase Auth.');

        const newProfile: Profile = {
          id: signUpData.user.id,
          username: fields.username,
          nome: fields.nome,
          sobrenome: fields.sobrenome,
          email: fields.email,
          pais: fields.pais || 'BR',
          sexo: fields.sexo || 'M',
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${fields.username}`,
          cargo: 'Unverified User',
          nivel: 1,
          xp: 0,
          credits: 100,
          bonus: 0,
          points: 0,
          criado_em: new Date().toISOString(),
          password: fields.password || '123',
        };

        await safeInsertProfile(newProfile);
        
        db.profiles.push(newProfile);
        db.setActiveUser(newProfile.id);
        notifyUpdate();
        return newProfile;
      } catch (err: any) {
        const msg = String(err.message || err || '').toLowerCase();
        if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
          handleSupabaseConnectionError(err);
          // Fall through to local registration!
          const newProfile: Profile = {
            id: 'u_' + Math.random().toString(36).substr(2, 9),
            username: fields.username,
            nome: fields.nome,
            sobrenome: fields.sobrenome,
            email: fields.email,
            pais: fields.pais || 'MZ',
            sexo: fields.sexo || 'M',
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${fields.username}`,
            cargo: 'Unverified User',
            nivel: 1,
            xp: 0,
            credits: 100,
            bonus: 0,
            points: 0,
            criado_em: new Date().toISOString(),
            password: fields.password || '123',
          };

          db.profiles.push(newProfile);
          db.setActiveUser(newProfile.id);
          notifyUpdate();
          return newProfile;
        } else {
          const errMsg = err.message || '';
          if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('limit exceeded') || err.status === 429) {
            throw new Error('Limite de requisições (Rate Limit) do Supabase excedido. DICA: No painel do seu Supabase, vá em "Authentication" -> "Rate Limits" e aumente ou desative temporariamente os limites de "Sign Up" (Cadastro por hora/IP) para continuar criando contas de teste.');
          }
          if (errMsg.toLowerCase().includes('email logins are disabled') || errMsg.toLowerCase().includes('logins are disabled') || errMsg.toLowerCase().includes('provider is disabled')) {
            throw new Error('ATENÇÃO: O login por E-mail está desativado no seu projeto Supabase. DICA: Vá no painel do seu Supabase, em "Authentication" -> "Providers" -> "Email", ATIVE a opção principal "Enable Email provider", salve, e certifique-se de que APENAS a opção "Confirm email" (Confirmar e-mail) está desativada para não exigir links de confirmação por e-mail.');
          }
          throw err;
        }
      }
    }

    const newProfile: Profile = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      username: fields.username,
      nome: fields.nome,
      sobrenome: fields.sobrenome,
      email: fields.email,
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

  signInUser: async (usernameOrEmail: string, password?: string): Promise<Profile> => {
    if (isUsingRealSupabase) {
      try {
        let email = usernameOrEmail.trim();
        if (!email.includes('@')) {
          // Query using select('*') so it doesn't fail if the 'email' column does not exist on the 'profiles' table
          const { data: profileData, error: profileError } = await realSupabase!.from('profiles')
            .select('*')
            .ilike('username', email)
            .maybeSingle();
          if (profileError) throw profileError;
          
          if (!profileData) {
            // Username not found in real Supabase. Let's see if they are a seed user locally!
            const localUser = db.profiles.find(p => p.username.toLowerCase() === email.toLowerCase());
            if (localUser) {
              try {
                // Try to auto-signup this seed user so they exist in real Supabase
                const { data: signUpData, error: signUpError } = await realSupabase!.auth.signUp({
                  email: localUser.email || `${localUser.username.toLowerCase()}@fcfunz.temp`,
                  password: password || '123',
                });
                if (!signUpError && signUpData.user) {
                  localUser.id = signUpData.user.id;
                  await safeInsertProfile(localUser);
                  // Sign in now
                  const { data: signInData, error: signInError } = await realSupabase!.auth.signInWithPassword({
                    email: localUser.email || `${localUser.username.toLowerCase()}@fcfunz.temp`,
                    password: password || '123',
                  });
                  if (!signInError && signInData.user) {
                    db.setActiveUser(localUser.id);
                    notifyUpdate();
                    return localUser;
                  }
                }
              } catch (e) {
                console.warn('Failed to auto-sign up seed user in real Supabase, logging in locally:', e);
              }
              // Fallback to local login
              db.setActiveUser(localUser.id);
              notifyUpdate();
              return localUser;
            }
            throw new Error('Nome de usuário não encontrado.');
          }
          
          const profileEmail = (profileData as any).email;
          if (!profileEmail) {
            email = `${email.toLowerCase().trim()}@fcfunz.temp`;
          } else {
            email = profileEmail;
          }
        }

        const { data: signInData, error: signInError } = await realSupabase!.auth.signInWithPassword({
          email,
          password: password || '123',
        });
        if (signInError) {
          // If password is correct locally for a seed user, log them in locally!
          const localUser = db.profiles.find(p => 
            p.username.toLowerCase() === usernameOrEmail.trim().toLowerCase() ||
            p.email?.toLowerCase() === email.toLowerCase()
          );
          if (localUser && (localUser.password || '123') === password) {
            console.warn('Invalid Supabase auth but correct local password. Logging in locally...');
            db.setActiveUser(localUser.id);
            notifyUpdate();
            return localUser;
          }
          throw signInError;
        }
        if (!signInData.user) throw new Error('Não foi possível obter os dados do usuário após login.');

        const { data: pData, error: pError } = await realSupabase!.from('profiles')
          .select('*')
          .eq('id', signInData.user.id)
          .single();
        if (pError || !pData) {
          throw new Error('Perfil de usuário não encontrado após o login.');
        }

        db.setActiveUser(pData.id);
        notifyUpdate();
        return pData as Profile;
      } catch (err: any) {
        const msg = String(err.message || err || '').toLowerCase();
        if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed') || msg.includes('fetch') || msg.includes('cors')) {
          handleSupabaseConnectionError(err);
          // Fall through to local login
        } else {
          // Also let invalid credentials for local seed users login locally
          const localUser = db.profiles.find(p => p.username.toLowerCase() === usernameOrEmail.trim().toLowerCase());
          if (localUser && (localUser.password || '123') === password) {
            console.warn('Supabase login error, but valid seed credentials. Logging in locally...');
            db.setActiveUser(localUser.id);
            notifyUpdate();
            return localUser;
          }
          
          const errMsg = err.message || '';
          if (errMsg.toLowerCase().includes('email logins are disabled') || errMsg.toLowerCase().includes('logins are disabled') || errMsg.toLowerCase().includes('provider is disabled')) {
            throw new Error('ATENÇÃO: O login por E-mail está desativado no seu projeto Supabase. DICA: Vá no painel do seu Supabase, em "Authentication" -> "Providers" -> "Email", ATIVE a opção principal "Enable Email provider", salve, e certifique-se de que APENAS a opção "Confirm email" (Confirmar e-mail) está desativada para não exigir links de confirmação por e-mail.');
          }
          throw err;
        }
      }
    }

    const target = db.profiles.find(
      p => p.username.toLowerCase() === usernameOrEmail.trim().toLowerCase() ||
           p.email?.toLowerCase() === usernameOrEmail.trim().toLowerCase()
    );
    if (!target) {
      throw new Error('Usuário não encontrado.');
    }
    const userPassword = target.password || '123';
    if (userPassword !== password) {
      throw new Error('Senha incorreta.');
    }

    db.setActiveUser(target.id);
    notifyUpdate();
    return target;
  },

  signOutUser: async (): Promise<void> => {
    if (isUsingRealSupabase) {
      await realSupabase!.auth.signOut();
    }
    notifyUpdate();
  },

  // --- SALAS (ROOMS) ---
  getRooms: async (): Promise<Sala[]> => {
    if (isUsingRealSupabase) {
      try {
        const { data } = await realSupabase!.from('salas').select('*');
        if (data) return data as Sala[];
      } catch (err) {
        handleSupabaseConnectionError(err);
      }
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
    if (isUsingRealSupabase) {
      const { error } = await realSupabase!.from('salas').insert(newRoom);
      if (error) throw error;
    }
    db.salas.push(newRoom);
    notifyUpdate();
    return newRoom;
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    db.salas = db.salas.filter(s => s.id !== roomId);
    db.mensagens = db.mensagens.filter(m => m.sala_id !== roomId);
    if (isUsingRealSupabase) {
      await realSupabase!.from('salas').delete().eq('id', roomId);
      await realSupabase!.from('mensagens').delete().eq('sala_id', roomId);
    }
    notifyUpdate();
  },

  updateRoomAnnounce: async (roomId: string, announce: string | null): Promise<void> => {
    if (isUsingRealSupabase) {
      const { error } = await realSupabase!.from('salas').update({ announce }).eq('id', roomId);
      if (error) throw error;
    }
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
      const newPart = {
        id: 'part_' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        sala_id: roomId,
        last_activity: new Date().toISOString()
      };
      if (isUsingRealSupabase) {
        const { error } = await realSupabase!.from('room_participants').insert(newPart);
        if (error) throw error;
      }
      db.room_participants.push(newPart);

      // Send entry message once
      await api.sendMessage(roomId, `${user.username.toUpperCase()} [${user.nivel || 1}] ENTROU NA SALA`, 'system');
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
      if (isUsingRealSupabase) {
        const { error } = await realSupabase!.from('room_participants').delete().eq('user_id', userId).eq('sala_id', roomId);
        if (error) throw error;
      }
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
      const now = new Date().toISOString();
      if (isUsingRealSupabase) {
        const { error } = await realSupabase!.from('room_participants').update({ last_activity: now }).eq('user_id', userId).eq('sala_id', roomId);
        if (error) throw error;
      }
      part.last_activity = now;
      notifyUpdate();
    }
  },

  toggleFavoriteRoom: async (roomId: string): Promise<boolean> => {
    const user = db.getActiveProfile();
    const existingIdx = db.favorites.findIndex(f => f.usuario_id === user.id && f.sala_id === roomId);
    let favorited = false;
    if (existingIdx !== -1) {
      if (isUsingRealSupabase) {
        const favId = db.favorites[existingIdx].id;
        const { error } = await realSupabase!.from('favorites').delete().eq('id', favId);
        if (error) throw error;
      }
      db.favorites.splice(existingIdx, 1);
    } else {
      const newFav = {
        id: 'fav_' + Math.random().toString(36).substr(2, 9),
        usuario_id: user.id,
        sala_id: roomId,
        criado_em: new Date().toISOString()
      };
      if (isUsingRealSupabase) {
        const { error } = await realSupabase!.from('favorites').insert(newFav);
        if (error) throw error;
      }
      db.favorites.push(newFav);
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

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const kickId = 'rk_' + Math.random().toString(36).substr(2, 9);

    if (isUsingRealSupabase) {
      await realSupabase!.from('room_kicks').delete().eq('user_id', userId).eq('sala_id', roomId);
      await realSupabase!.from('room_participants').delete().eq('user_id', userId).eq('sala_id', roomId);
      const { error } = await realSupabase!.from('room_kicks').insert({
        id: kickId,
        user_id: userId,
        sala_id: roomId,
        expires_at: expiresAt
      });
      if (error) throw error;
    }

    // Add to room kicks for 5 minutes
    db.room_kicks = db.room_kicks.filter(k => !(k.user_id === userId && k.sala_id === roomId));
    db.room_kicks.push({
      user_id: userId,
      sala_id: roomId,
      expires_at: expiresAt
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

    const banId = 'rb_' + Math.random().toString(36).substr(2, 9);

    if (isUsingRealSupabase) {
      await realSupabase!.from('room_bans').delete().eq('user_id', userId).eq('sala_id', roomId);
      await realSupabase!.from('room_participants').delete().eq('user_id', userId).eq('sala_id', roomId);
      const { error } = await realSupabase!.from('room_bans').insert({
        id: banId,
        user_id: userId,
        sala_id: roomId
      });
      if (error) throw error;
    }

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

    const groupBanId = 'gb_' + Math.random().toString(36).substr(2, 9);
    const roomsInCat = db.salas.filter(s => s.categoria === room.categoria).map(s => s.id);

    if (isUsingRealSupabase) {
      await realSupabase!.from('group_bans').delete().eq('user_id', userId).eq('categoria', room.categoria);
      for (const rid of roomsInCat) {
        await realSupabase!.from('room_participants').delete().eq('user_id', userId).eq('sala_id', rid);
      }
      const { error } = await realSupabase!.from('group_bans').insert({
        id: groupBanId,
        user_id: userId,
        categoria: room.categoria
      });
      if (error) throw error;
    }

    db.group_bans = db.group_bans.filter(b => !(b.user_id === userId && b.categoria === room.categoria));
    db.group_bans.push({
      user_id: userId,
      categoria: room.categoria
    });

    // Remove from participants in all rooms of same category
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

    if (isUsingRealSupabase) {
      await realSupabase!.from('banned_global').delete().eq('user_id', userId);
      await realSupabase!.from('room_participants').delete().eq('user_id', userId);
      const { error } = await realSupabase!.from('banned_global').insert({
        user_id: userId,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
    }

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

    if (isUsingRealSupabase) {
      const { error } = await realSupabase!.from('banned_global').delete().eq('user_id', userId);
      if (error) throw error;
    }

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
    const sliced = roomMsgs.slice(-100); // LIMIT TO LAST 100 RECENT MESSAGES!
    return sliced.map(m => {
      const user = db.profiles.find(p => p.id === m.autor_id) || (m.autor_id.startsWith('bot_') ? getBotProfile(m.autor_id) : null);
      return {
        ...m,
        autor_username: user?.username || 'Desconhecido',
        autor_cargo: user?.cargo || 'Unverified User',
        autor_avatar: user?.avatar_url || null,
      };
    });
  },

  sendMessage: async (roomId: string, content: string, type: Mensagem['tipo'] = 'normal', cor?: string, senderId?: string, targetBotId?: string): Promise<Mensagem> => {
    const user = senderId 
      ? (db.profiles.find(p => p.id === senderId) || (senderId.startsWith('bot_') ? getBotProfile(senderId) : null) || db.getActiveProfile()) 
      : db.getActiveProfile();
    
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
      targetBotId,
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
      if (user.id === db.getActiveProfile().id) {
        api.triggerMission('m1');
      }
    }

    // Trigger bot response check via window decoupler
    if (typeof window !== 'undefined' && (window as any).botOrchestrator) {
      try {
        (window as any).botOrchestrator.handleUserMessage(newMsg);
      } catch (e) {
        console.error('Error triggering bot handleUserMessage:', e);
      }
    }

    // --- GAME ENGINE AND BOT TRIGGERS (*bot dice, *shower, *apollo) ---
    if (content.startsWith('*')) {
      await handleBotCommand(roomId, content, user);
    }

    return newMsg;
  },

  // --- AMIZADES (AMIGOS Redesign: Everyone is a friend, amizades table represents Close Friends) ---
  getFriends: async (): Promise<Profile[]> => {
    const user = db.getActiveProfile();
    return db.profiles.filter(p => p.id !== user.id);
  },

  getCloseFriends: async (): Promise<Profile[]> => {
    const user = db.getActiveProfile();
    const closeFriendIds = db.amizades
      .filter(a => a.solicitante_id === user.id && a.status === 'aceito')
      .map(a => a.destinatario_id);
    return db.profiles.filter(p => closeFriendIds.includes(p.id));
  },

  toggleCloseFriend: async (targetUserId: string): Promise<boolean> => {
    const user = db.getActiveProfile();
    const fIdx = db.amizades.findIndex(a => a.solicitante_id === user.id && a.destinatario_id === targetUserId);
    let added = false;
    if (fIdx !== -1) {
      db.amizades.splice(fIdx, 1);
    } else {
      db.amizades.push({
        id: 'am_' + Math.random().toString(36).substr(2, 9),
        solicitante_id: user.id,
        destinatario_id: targetUserId,
        status: 'aceito',
        criado_em: new Date().toISOString()
      });
      added = true;
    }
    db.save();
    notifyUpdate();
    return added;
  },

  getFriendshipRequests: async (): Promise<{ received: Profile[], sent: Profile[] }> => {
    return { received: [], sent: [] };
  },

  sendFriendRequest: async (username: string): Promise<void> => {
    // Stubbed since everyone is already friends, but toggles close friends instead!
    const dest = db.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
    if (!dest) throw new Error('Usuário não encontrado');
    await api.toggleCloseFriend(dest.id);
  },

  respondToFriendRequest: async (requesterId: string, accept: boolean): Promise<void> => {
    // Stubbed since requests are no longer needed
  },

  removeFriend: async (friendId: string): Promise<void> => {
    // Toggles close friend off
    const user = db.getActiveProfile();
    const fIdx = db.amizades.findIndex(a => a.solicitante_id === user.id && a.destinatario_id === friendId);
    if (fIdx !== -1) {
      db.amizades.splice(fIdx, 1);
      db.save();
    }
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

  sendGift: async (toUserId: string, giftId: string, roomId?: string, senderId?: string): Promise<void> => {
    const sender = senderId 
      ? (db.profiles.find(p => p.id === senderId) || (senderId.startsWith('bot_') ? getBotProfile(senderId) : null) || db.getActiveProfile()) 
      : db.getActiveProfile();
    const gift = DEFAULT_GIFT_CATALOG.find(g => g.id === giftId);
    if (!gift) throw new Error('Presente não encontrado');

    const isBotSender = sender.id.startsWith('bot_');

    if (toUserId === 'all') {
      const targets = db.profiles.filter(p => p.id !== sender.id && !p.id.startsWith('bot_'));
      if (targets.length < 1) throw new Error('Nenhum outro usuário real ativo na sala para receber o presente.');

      const totalCost = gift.valor * targets.length;
      if (!isBotSender) {
        if (sender.credits < totalCost) {
          throw new Error(`Créditos insuficientes para enviar presentes para todos (${targets.length} usuários). Custo total: ${totalCost} MZN.`);
        }
        sender.credits -= totalCost;
      }
      
      sender.points += Math.ceil(totalCost / 2);

      // Trigger mission completion only for active user
      if (sender.id === db.getActiveProfile().id) {
        api.triggerMission('m5');
        await api.addNotification({
          usuario_id: sender.id,
          title: 'Mimos Coletivos Enviados! 🎁',
          message: `Você distribuiu "${gift.nome}" para ${targets.length} usuários na sala. Gasto total: ${totalCost.toFixed(2)} MZN`,
          type: 'system',
          amount: totalCost,
        });
      }

      for (const receiver of targets) {
        receiver.points += gift.valor;
        await api.addXP(sender.id, gift.valor * 5);
        await api.addXP(receiver.id, gift.valor * 2);

        // If the gift is Black Diamond, receiver gets a real Black Diamond
        if (gift.id === 'g_black_diamond') {
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
        await api.sendMessage(
          roomId,
          `✨🎁 **FESTIVAL DE PRESENTES EM GRUPO!** 🎁✨\n🌟 @${sender.username} espalhou alegria e enviou **${gift.imagem} ${gift.nome}** para TODOS na sala! 🎉\n💝 Que gesto espetacular de generosidade!`,
          'automatic',
          undefined,
          sender.id
        );
      }

      notifyUpdate();
      return;
    }

    const receiver = db.profiles.find(p => p.id === toUserId);
    if (!receiver) throw new Error('Destinatário não encontrado');
    if (sender.id === receiver.id) throw new Error('Não pode enviar presente para si mesmo');
    if (isBotSender && receiver.id.startsWith('bot_')) {
      throw new Error('Bots não podem enviar presentes para outros bots.');
    }

    if (!isBotSender) {
      if (sender.credits < gift.valor) throw new Error(`Créditos insuficientes. Você precisa de ${gift.valor} MZN.`);
      sender.credits -= gift.valor;
    }
    
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

    // Trigger mission completion only for active user
    if (sender.id === db.getActiveProfile().id) {
      api.triggerMission('m5');
      await api.addNotification({
        usuario_id: sender.id,
        title: 'Mimo Individual Enviado! 🎁',
        message: `Você enviou "${gift.nome}" para @${receiver.username}. Gasto total: ${gift.valor.toFixed(2)} MZN`,
        type: 'system',
        amount: gift.valor,
      });
    }

    // If the gift is Black Diamond, receiver gets a real Black Diamond
    if (gift.id === 'g_black_diamond') {
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
      if (gift.id === 'g_black_diamond') {
        await api.sendMessage(
          roomId,
          `✨💎 **GIFT PRESTÍGIO: BLACK DIAMOND!** 💎✨\n🌟 @${sender.username} presenteou @${receiver.username} com um raríssimo **Black Diamond**! 💎\n💎 *Este diamante especial pode ser resgatado por saldo MZN!* 💸`,
          'automatic'
        );
      } else {
        await api.sendMessage(
          roomId,
          `✨🎁 **GESTO DE CARINHO NO CHAT!** 🎁✨\n🌸 @${sender.username} enviou um lindo presente ${gift.imagem} **${gift.nome}** para @${receiver.username}! 💕`,
          'automatic'
        );
      }
    }

    notifyUpdate();
  },

  sendGiftShower: async (roomId: string, giftId: string, quantity: number): Promise<void> => {
    const sender = db.getActiveProfile();
    const gift = DEFAULT_GIFT_CATALOG.find(g => g.id === giftId);
    if (!gift) throw new Error('Presente não encontrado');
    if (quantity < 2 || quantity > 50) {
      throw new Error('A quantidade de presentes no Shower deve ser entre 2 e 50.');
    }

    const targets = db.profiles.filter(p => p.id !== sender.id);
    if (targets.length === 0) {
      throw new Error('Nenhum outro usuário ativo na sala.');
    }
    if (targets.length < 1) {
      throw new Error('Deve haver pelo menos 2 usuários na sala (você e pelo menos mais 1 destinatário) para realizar um Shower.');
    }

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

    if (sender.id === db.getActiveProfile().id) {
      await api.addNotification({
        usuario_id: sender.id,
        title: 'Chuveiro de Mimos Ativado! 🌊',
        message: `Você iniciou um Chuveiro de ${quantity}x "${gift.nome}" para todos os ${targets.length} usuários. Gasto total: ${totalCost.toFixed(2)} MZN`,
        type: 'system',
        amount: totalCost,
      });
    }

    for (const receiver of targets) {
      receiver.points += costPerUser;
      receiver.stats_gifts_received = (receiver.stats_gifts_received || 0) + quantity;
      await api.addXP(sender.id, costPerUser * 5);
      await api.addXP(receiver.id, costPerUser * 2);

      // If and ONLY if the gift is Black Diamond, receivers get Black Diamonds
      if (gift.id === 'g_black_diamond') {
        receiver.black_diamonds = (receiver.black_diamonds || 0) + quantity;
      }

      await api.addNotification({
        usuario_id: receiver.id,
        title: '🌊 CHUVEIRO DE PRESENTES! 🎁',
        message: gift.id === 'g_black_diamond'
          ? `@${sender.username} lançou um super chuveiro de ${quantity}x 💎 Black Diamond! Você recebeu ${quantity} Black Diamond(s)!`
          : `@${sender.username} lançou um super chuveiro de ${quantity}x ${gift.imagem} ${gift.nome}!`,
        type: 'gift',
        sender_id: sender.id,
        sender_username: sender.username,
      });
    }

    if (gift.id === 'g_black_diamond') {
      await api.sendMessage(
        roomId,
        `🌊 ✨💎 **SUPER CHUVA DE DIAMANTES NEGROS!** 💎✨ 🌊\n👑 @${sender.username} fez chover uma tempestade de **${quantity}x 💎 Black Diamond** para TODOS na sala!\n💸 *Cada destinatário recebeu ${quantity}x Black Diamond para trocar por saldo MZN!* 💸`,
        'automatic'
      );
    } else {
      await api.sendMessage(
        roomId,
        `🌊 ✨🎁 **TEMPESTADE MAGNÍFICA DE PRESENTES!** 🎁✨ 🌊\n🎈 @${sender.username} surpreendeu a todos com um grandioso **GIFT SHOWER** de **${quantity}x ${gift.imagem} ${gift.nome}** para TODOS na sala! 🎉\n💝 Sinta a maravilhosa onda de generosidade!`,
        'automatic'
      );
    }
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
    
    logTransaction(user.id, 'apollo_redeem', creditsReward, 'Resgate de Pontos Online por MZN');
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

    logTransaction(user.id, 'apollo_redeem', creditsReward, 'Resgate de Black Diamonds por MZN');

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

  createAnuncio: async (texto: string, dias: number, custo: number, imageUrl?: string | null): Promise<Anuncio> => {
    const user = db.getActiveProfile();
    if (user.credits < custo) {
      throw new Error(`Você não tem MZN suficiente (precisa de ${custo} MZN).`);
    }

    user.credits -= custo;

    const agora = new Date();
    const expira = new Date();
    expira.setDate(agora.getDate() + dias);

    const adId = 'ad_' + Math.random().toString(36).substr(2, 9);
    const novoAnuncio: Anuncio = {
      id: adId,
      autor_id: user.id,
      autor_username: user.username,
      texto: texto.trim(),
      visualizacoes: 0,
      dias,
      valor_pago: custo,
      criado_em: agora.toISOString(),
      expira_em: expira.toISOString(),
      status: 'pending',
      image_url: imageUrl || null
    };

    db.anuncios.push(novoAnuncio);

    // Also push a Tweet for the feed
    const novoTweet: Tweet = {
      id: 't_' + adId,
      user_id: user.id,
      content: texto.trim(),
      image_url: imageUrl || null,
      video_url: null,
      likes_count: 0,
      dislikes_count: 0,
      comments_count: 0,
      created_at: agora.toISOString(),
      updated_at: agora.toISOString(),
      dias,
      valor_pago: custo,
      status: 'pending',
      expira_em: expira.toISOString()
    };
    db.tweets.push(novoTweet);

    logTransaction(user.id, 'item_buy', -custo, `Criou Anúncio (Pendente Aprovação) (${dias} dia(s))`);

    await api.addNotification({
      usuario_id: user.id,
      title: '📢 Anúncio Enviado para Aprovação!',
      message: `Seu anúncio foi criado com sucesso e enviado para aprovação da Staff! Assim que for aprovado, ele será exibido no Feed e no Rodapé!`,
      type: 'system',
      amount: custo,
    });

    notifyUpdate();
    return novoAnuncio;
  },

  getAnuncios: async (): Promise<Anuncio[]> => {
    const agora = Date.now();
    return db.anuncios.map(ad => {
      const expTime = new Date(ad.expira_em).getTime();
      if (expTime < agora && ad.status === 'active') {
        ad.status = 'expired';
        const tweet = db.tweets.find(t => t.id === 't_' + ad.id);
        if (tweet) tweet.status = 'expired';
      }
      return ad;
    }).filter(ad => ad.status === 'active');
  },

  getAllAnuncios: async (): Promise<Anuncio[]> => {
    return db.anuncios;
  },

  updateAnuncioStatus: async (id: string, status: 'active' | 'rejected'): Promise<void> => {
    const ad = db.anuncios.find(a => a.id === id);
    if (!ad) throw new Error('Anúncio não encontrado.');
    
    ad.status = status;

    // Find and update the associated Tweet as well
    const tweet = db.tweets.find(t => t.id === 't_' + id || t.id === id);
    if (tweet) {
      tweet.status = status;
    }
    
    // Notify user
    await api.addNotification({
      usuario_id: ad.autor_id,
      title: status === 'active' ? '✅ Anúncio Aprovado! 🎉' : '❌ Anúncio Rejeitado',
      message: status === 'active' 
        ? `Seu anúncio "${ad.texto}" foi aprovado pela Staff e já está ativo no Feed e no Rodapé!` 
        : `Seu anúncio "${ad.texto}" foi rejeitado pela Staff. Se achar que houve um erro, entre em contato.`,
      type: 'system',
      amount: 0,
    });

    notifyUpdate();
  },

  incrementAnuncioViews: async (id: string): Promise<void> => {
    const ad = db.anuncios.find(a => a.id === id);
    if (ad) {
      ad.visualizacoes += 1;
      notifyUpdate();
    }
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
        logTransaction(user.id, 'level_up', 25, `Recompensa por subir ao Nível ${user.nivel}`);

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
    if (isUsingRealSupabase) {
      await realSupabase!.from('notifications').delete().eq('usuario_id', user.id);
    }
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
    logTransaction(user.id, 'game_wager', -entryFee, `Aposta em Jogo de Dados Multiplayer`);
    
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
    logTransaction(user.id, 'game_wager', -game.entry_fee, `Aposta em Jogo de Dados Multiplayer`);
    
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
              logTransaction(profile.id, 'game_payout', game.prize_pool, `Prêmio de Vitória em Jogo de Dados Multiplayer`);
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
    // Automatic login bonus has been disabled by user request to preserve economy balance
    return 0;
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
  },

  getBotConfigs: async (): Promise<BotConfig[]> => {
    return db.botConfigs;
  },

  updateBotConfig: async (botId: string, updates: Partial<BotConfig>): Promise<void> => {
    const configIdx = db.botConfigs.findIndex(b => b.id === botId);
    if (configIdx !== -1) {
      db.botConfigs[configIdx] = { ...db.botConfigs[configIdx], ...updates };
    }
    const profileIdx = db.profiles.findIndex(p => p.id === botId);
    if (profileIdx !== -1) {
      if (updates.username) db.profiles[profileIdx].username = updates.username;
      if (updates.nome) db.profiles[profileIdx].nome = updates.nome;
      if (updates.sobrenome) db.profiles[profileIdx].sobrenome = updates.sobrenome;
      if (updates.avatar_url) db.profiles[profileIdx].avatar_url = updates.avatar_url;
      if (updates.cargo) db.profiles[profileIdx].cargo = updates.cargo as any;
      if (updates.password) db.profiles[profileIdx].password = updates.password;
    }
    db.save();
    notifyUpdate();
  },

  getBotActions: async (): Promise<BotAction[]> => {
    return db.botActions;
  },

  createBotAction: async (
    botId: string,
    botUsername: string,
    type: 'message' | 'ad',
    content: string,
    salaId?: string,
    salaNome?: string,
    imageUrl?: string | null
  ): Promise<BotAction> => {
    const newAction: BotAction = {
      id: 'bact_' + Math.random().toString(36).substr(2, 9),
      bot_id: botId,
      bot_username: botUsername,
      type,
      sala_id: salaId,
      sala_nome: salaNome,
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    db.botActions.push(newAction);
    db.save();
    notifyUpdate();
    return newAction;
  },

  updateBotActionStatus: async (actionId: string, status: 'approved' | 'rejected'): Promise<void> => {
    const actIdx = db.botActions.findIndex(a => a.id === actionId);
    if (actIdx !== -1) {
      const action = db.botActions[actIdx];
      action.status = status;
      
      if (status === 'approved') {
        if (action.type === 'message' && action.sala_id) {
          // Send message immediately
          await api.sendMessage(action.sala_id, action.content, 'normal', undefined, action.bot_id);
        } else if (action.type === 'ad') {
          // Create an active ad tweet for the feed
          const newTweet: Tweet = {
            id: 't_' + Math.random().toString(36).substr(2, 9),
            user_id: action.bot_id,
            content: action.content,
            image_url: action.image_url || null,
            video_url: null,
            likes_count: Math.floor(Math.random() * 12),
            dislikes_count: 0,
            comments_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            dias: 30, // Default premium bot ad duration
            valor_pago: 0,
            expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
          };
          db.tweets.push(newTweet);
        }
      }
      db.save();
      notifyUpdate();
    }
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
                logTransaction(profile.id, 'game_payout', game.entry_fee, `Reembolso de Jogo de Dados Cancelado`);
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

    // Inactivity sweep for room participants (older than 5 minutes / 300 seconds)
    const nowTime = Date.now();
    const expiredParticipants = db.room_participants.filter(p => {
      if (p.user_id.startsWith('bot_')) return false; // Exempt bots from inactivity sweep
      const lastAct = new Date(p.last_activity).getTime();
      return (nowTime - lastAct) >= 300000; // 300,000 ms = 5 minutes
    });

    if (expiredParticipants.length > 0) {
      const activeUser = db.getActiveProfile();
      for (const p of expiredParticipants) {
        // Clean up from local memory
        db.room_participants = db.room_participants.filter(item => item.id !== p.id);

        // Clean up from Supabase table if using real Supabase
        if (isUsingRealSupabase && realSupabase) {
          realSupabase.from('room_participants').delete().eq('id', p.id).then(({ error }) => {
            if (error) console.error('Error cleaning up inactive participant from Supabase:', error);
          }).catch(err => {
            handleSupabaseConnectionError(err);
          });
        }

        // Only send the exit message if this expired participant is the current logged-in user
        // (to prevent multiple active clients from spamming messages on behalf of a single disconnected user)
        if (activeUser && p.user_id === activeUser.id) {
          const userProfile = db.profiles.find(prof => prof.id === p.user_id);
          if (userProfile) {
            await api.sendMessage(p.sala_id, `@${userProfile.username} saiu por inatividade (inativo há 5 minutos)`, 'system');
          }
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
        logTransaction(user.id, 'game_wager', -amount, `Aposta de Dados (Duelo/Target)`);

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

            logTransaction(user.id, 'game_payout', winnings, `Retorno de Vitória em Aposta de Dados`);
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
            logTransaction(user.id, 'game_payout', winnings, `Retorno de Vitória em Duelo contra Bot`);
            await api.sendMessage(roomId, `⚔️ **DUELO DE DADOS contra o BOT**\n💰 Aposta: **${amount} MZN**\n👤 @${user.username}: ${playerDisplay}\n🤖 Bot: ${botDisplay}\n🏆 **VITÓRIA!** Você venceu o Bot e faturou **${winnings} MZN** (Saldo atual: ${user.credits} MZN)!`, 'automatic');
            await api.addXP(user.id, 20);
          } else if (playerTotal < botTotal) {
            // Bot wins!
            await api.sendMessage(roomId, `⚔️ **DUELO DE DADOS contra o BOT**\n💰 Aposta: **${amount} MZN**\n👤 @${user.username}: ${playerDisplay}\n🤖 Bot: ${botDisplay}\n💀 **DERROTA!** O Bot venceu e levou seus **${amount} MZN** (Saldo atual: ${user.credits} MZN)!`, 'automatic');
            await api.addXP(user.id, 10);
          } else {
            // Draw! Return bet
            user.credits += amount;
            logTransaction(user.id, 'game_payout', amount, `Reembolso de Empate em Duelo contra Bot`);
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
          logTransaction(user.id, 'access_bonus', 5, `Bônus por Duplo em Dados Livres`);
          await api.sendMessage(roomId, `✨ **DUPLO!** @${user.username} tirou números iguais e ganhou um bônus extra de **5 MZN**!`, 'automatic');
        } else if (total === 12) {
          user.credits += 15;
          logTransaction(user.id, 'access_bonus', 15, `Bônus por Craps Máximo em Dados Livres`);
          await api.sendMessage(roomId, `🎉 **CRAPS MÁXIMO!** @${user.username} conseguiu a soma máxima de 12 e ganhou **15 MZN** de bônus!`, 'automatic');
        } else if (total === 2) {
          user.credits = Math.max(0, user.credits - 2);
          logTransaction(user.id, 'item_buy', -2, `Penalidade por Craps Mínimo em Dados Livres`);
          await api.sendMessage(roomId, `💀 **CRAPS MÍNIMO!** @${user.username} deu azar com o total 2 e perdeu **2 MZN**!`, 'automatic');
        }
        notifyUpdate();
      }
    }

    // 2. *gift (Send a gift to an individual user or all)
    else if (command === '*gift') {
      const findGiftByNameOrId = (identifier: string): Gift | undefined => {
        if (!identifier) return undefined;
        const lower = identifier.toLowerCase().trim();
        let found = DEFAULT_GIFT_CATALOG.find(g => g.id.toLowerCase() === lower || g.nome.toLowerCase() === lower);
        if (found) return found;
        return DEFAULT_GIFT_CATALOG.find(g => g.nome.toLowerCase().includes(lower));
      };

      const findUserByUsername = (usernameStr: string): Profile | undefined => {
        if (!usernameStr) return undefined;
        const clean = usernameStr.replace('@', '').toLowerCase().trim();
        return db.profiles.find(p => p.username.toLowerCase() === clean);
      };

      const targetUserStr = parts[1];
      const giftNameStr = parts.slice(2).join(' ').trim();

      if (!targetUserStr || !giftNameStr) {
        await api.sendMessage(roomId, `❌ Uso incorreto. Use: \`*gift [nome_do_usuario] [nome_do_presente]\` ou \`*gift all [nome_do_presente]\`.`, 'automatic');
        return;
      }

      const gift = findGiftByNameOrId(giftNameStr);
      if (!gift) {
        await api.sendMessage(roomId, `❌ Erro: Presente "${giftNameStr}" não encontrado no catálogo.`, 'automatic');
        return;
      }

      if (targetUserStr.toLowerCase() === 'all') {
        try {
          await api.sendGift('all', gift.id, roomId);
        } catch (err: any) {
          await api.sendMessage(roomId, `❌ Erro no Gift All: ${err.message}`, 'automatic');
        }
      } else {
        const recipient = findUserByUsername(targetUserStr);
        if (!recipient) {
          await api.sendMessage(roomId, `❌ Erro: Usuário "@${targetUserStr.replace('@', '')}" não encontrado.`, 'automatic');
          return;
        }
        try {
          await api.sendGift(recipient.id, gift.id, roomId);
        } catch (err: any) {
          await api.sendMessage(roomId, `❌ Erro ao enviar presente: ${err.message}`, 'automatic');
        }
      }
    }

    // 2.5 *shower / *tempestade (Gift Shower - Send multiple presents to everyone in the room)
    else if (command === '*shower' || command === '*tempestade') {
      const findGiftByNameOrId = (identifier: string): Gift | undefined => {
        if (!identifier) return undefined;
        const lower = identifier.toLowerCase().trim();
        let found = DEFAULT_GIFT_CATALOG.find(g => g.id.toLowerCase() === lower || g.nome.toLowerCase() === lower);
        if (found) return found;
        return DEFAULT_GIFT_CATALOG.find(g => g.nome.toLowerCase().includes(lower));
      };

      const qtyStr = parts[1];
      const giftNameStr = parts.slice(2).join(' ').trim();
      const quantity = parseInt(qtyStr);

      if (isNaN(quantity) || !giftNameStr) {
        await api.sendMessage(roomId, `❌ Uso incorreto. Use: \`*tempestade [quantidade] [nome_do_presente]\`. Exemplo: \`*tempestade 5 rosa\`.`, 'automatic');
        return;
      }

      const gift = findGiftByNameOrId(giftNameStr);
      if (!gift) {
        await api.sendMessage(roomId, `❌ Erro: Presente "${giftNameStr}" não encontrado no catálogo.`, 'automatic');
        return;
      }

      try {
        await api.sendGiftShower(roomId, gift.id, quantity);
      } catch (err: any) {
        await api.sendMessage(roomId, `❌ Erro na Tempestade de Mimos: ${err.message}`, 'automatic');
      }
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
