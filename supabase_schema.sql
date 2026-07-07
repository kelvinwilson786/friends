-- ====================================================================
-- FCFUNZ SUPABASE DATABASE SCHEMA
-- Execute this script inside the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ====================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nome TEXT,
    sobrenome TEXT,
    pais TEXT DEFAULT 'MZ',
    sexo TEXT,
    avatar_url TEXT,
    cargo TEXT DEFAULT 'Unverified User',
    nivel INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    credits NUMERIC DEFAULT 100,
    bonus NUMERIC DEFAULT 0,
    points NUMERIC DEFAULT 0,
    criado_em TEXT,
    online_points INTEGER DEFAULT 0,
    black_diamonds INTEGER DEFAULT 0,
    last_level_up_at TEXT,
    password TEXT DEFAULT '123',
    security_question TEXT,
    security_answer TEXT,
    merchant_pin TEXT DEFAULT '1234',
    merchant_creator_id TEXT,
    merchant_expires_at TEXT,
    stats_gifts_sent INTEGER DEFAULT 0,
    stats_gifts_received INTEGER DEFAULT 0,
    stats_gifts_sent_own_room INTEGER DEFAULT 0,
    stats_love_gifts_sent INTEGER DEFAULT 0,
    stats_dice_played INTEGER DEFAULT 0,
    stats_hot_played INTEGER DEFAULT 0,
    stats_hot_won INTEGER DEFAULT 0,
    stats_hot_lost INTEGER DEFAULT 0,
    stats_daily_missions_completed INTEGER DEFAULT 0,
    stats_commissions_received INTEGER DEFAULT 0,
    stats_transactions_amount NUMERIC DEFAULT 0,
    stats_merchants_created INTEGER DEFAULT 0,
    stats_house_contributions NUMERIC DEFAULT 0,
    mpoint INTEGER DEFAULT 0,
    merchant_quest_registered BOOLEAN DEFAULT FALSE,
    merchant_claimed_quests TEXT[] DEFAULT '{}',
    inventory_megafones INTEGER DEFAULT 0,
    purchased_stickers TEXT[] DEFAULT '{}',
    purchased_emojis TEXT[] DEFAULT '{}',
    purchased_text_color TEXT,
    purchased_text_color_expires_at TEXT
);

-- Enable Row Level Security (RLS) or leave public for direct API access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. SALAS (ROOMS) TABLE
CREATE TABLE IF NOT EXISTS public.salas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT DEFAULT 'Official Rooms',
    capacidade INTEGER DEFAULT 100,
    dono_id TEXT,
    criado_em TEXT,
    announce TEXT,
    silence BOOLEAN DEFAULT FALSE,
    silence_by TEXT,
    bot BOOLEAN DEFAULT FALSE,
    locked BOOLEAN DEFAULT FALSE,
    treasure_number INTEGER,
    treasure_amount NUMERIC,
    treasure_by TEXT,
    quiz_question TEXT,
    quiz_answer TEXT,
    quiz_amount NUMERIC,
    quiz_by TEXT
);

ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Salas are readable by everyone" ON public.salas FOR SELECT USING (true);
CREATE POLICY "Salas are modifiable by everyone" ON public.salas FOR ALL USING (true) WITH CHECK (true);

-- 3. MENSAGENS TABLE
CREATE TABLE IF NOT EXISTS public.mensagens (
    id TEXT PRIMARY KEY,
    sala_id TEXT,
    autor_id TEXT,
    conteudo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    cor TEXT,
    autor_username TEXT,
    autor_cargo TEXT,
    autor_avatar TEXT,
    targetBotId TEXT
);

ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mensagens are readable by everyone" ON public.mensagens FOR SELECT USING (true);
CREATE POLICY "Mensagens are modifiable by everyone" ON public.mensagens FOR ALL USING (true) WITH CHECK (true);

-- 4. TWEETS TABLE
CREATE TABLE IF NOT EXISTS public.tweets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    author_username TEXT,
    author_avatar TEXT,
    author_cargo TEXT
);

ALTER TABLE public.tweets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tweets are readable by everyone" ON public.tweets FOR SELECT USING (true);
CREATE POLICY "Tweets are modifiable by everyone" ON public.tweets FOR ALL USING (true) WITH CHECK (true);

-- 5. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY,
    tweet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    author_username TEXT,
    author_avatar TEXT,
    author_cargo TEXT
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are readable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Comments are modifiable by everyone" ON public.comments FOR ALL USING (true) WITH CHECK (true);

-- 6. AMIZADES TABLE
CREATE TABLE IF NOT EXISTS public.amizades (
    id TEXT PRIMARY KEY,
    solicitante_id TEXT NOT NULL,
    destinatario_id TEXT NOT NULL,
    status TEXT NOT NULL,
    criado_em TEXT NOT NULL
);

ALTER TABLE public.amizades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Amizades are readable by everyone" ON public.amizades FOR SELECT USING (true);
CREATE POLICY "Amizades are modifiable by everyone" ON public.amizades FOR ALL USING (true) WITH CHECK (true);

-- 7. MENSAGENS PRIVADAS TABLE
CREATE TABLE IF NOT EXISTS public.mensagens_privadas (
    id TEXT PRIMARY KEY,
    remetente_id TEXT NOT NULL,
    destinatario_id TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    criado_em TEXT NOT NULL
);

ALTER TABLE public.mensagens_privadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DMs are readable by everyone" ON public.mensagens_privadas FOR SELECT USING (true);
CREATE POLICY "DMs are modifiable by everyone" ON public.mensagens_privadas FOR ALL USING (true) WITH CHECK (true);

-- 8. APOLLO CODES TABLE
CREATE TABLE IF NOT EXISTS public.apollo_codes (
    id TEXT PRIMARY KEY,
    code INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    created_by TEXT,
    status TEXT DEFAULT 'active',
    redeemed_by TEXT,
    redeemed_at TEXT,
    created_at TEXT NOT NULL
);

ALTER TABLE public.apollo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apollo codes readable by everyone" ON public.apollo_codes FOR SELECT USING (true);
CREATE POLICY "Apollo codes modifiable by everyone" ON public.apollo_codes FOR ALL USING (true) WITH CHECK (true);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    sender_id TEXT,
    sender_username TEXT,
    amount NUMERIC,
    read BOOLEAN DEFAULT FALSE,
    criado_em TEXT NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications are readable by everyone" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Notifications are modifiable by everyone" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 10. DICE GAMES TABLE
CREATE TABLE IF NOT EXISTS public.dice_games (
    id TEXT PRIMARY KEY,
    sala_id TEXT NOT NULL,
    status TEXT NOT NULL,
    entry_fee NUMERIC DEFAULT 0,
    prize_pool NUMERIC DEFAULT 0,
    house_cut NUMERIC DEFAULT 0,
    created_at TEXT NOT NULL,
    time_left INTEGER DEFAULT 0,
    players JSONB DEFAULT '[]',
    round INTEGER DEFAULT 1,
    creator_id TEXT NOT NULL
);

ALTER TABLE public.dice_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dice games readable by everyone" ON public.dice_games FOR SELECT USING (true);
CREATE POLICY "Dice games modifiable by everyone" ON public.dice_games FOR ALL USING (true) WITH CHECK (true);

-- 11. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions readable by everyone" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Transactions modifiable by everyone" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- 12. BANNED GLOBAL TABLE
CREATE TABLE IF NOT EXISTS public.banned_global (
    user_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
);

ALTER TABLE public.banned_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bans readable by everyone" ON public.banned_global FOR SELECT USING (true);
CREATE POLICY "Bans modifiable by everyone" ON public.banned_global FOR ALL USING (true) WITH CHECK (true);

-- 13. ROOM KICKS TABLE
CREATE TABLE IF NOT EXISTS public.room_kicks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sala_id TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

ALTER TABLE public.room_kicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kicks readable by everyone" ON public.room_kicks FOR SELECT USING (true);
CREATE POLICY "Kicks modifiable by everyone" ON public.room_kicks FOR ALL USING (true) WITH CHECK (true);

-- 14. ROOM BANS TABLE
CREATE TABLE IF NOT EXISTS public.room_bans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sala_id TEXT NOT NULL
);

ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room bans readable by everyone" ON public.room_bans FOR SELECT USING (true);
CREATE POLICY "Room bans modifiable by everyone" ON public.room_bans FOR ALL USING (true) WITH CHECK (true);

-- 15. GROUP BANS TABLE
CREATE TABLE IF NOT EXISTS public.group_bans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    categoria TEXT NOT NULL
);

ALTER TABLE public.group_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group bans readable by everyone" ON public.group_bans FOR SELECT USING (true);
CREATE POLICY "Group bans modifiable by everyone" ON public.group_bans FOR ALL USING (true) WITH CHECK (true);

-- 16. FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    sala_id TEXT NOT NULL,
    criado_em TEXT NOT NULL
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favorites readable by everyone" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Favorites modifiable by everyone" ON public.favorites FOR ALL USING (true) WITH CHECK (true);

-- 17. ROOM PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.room_participants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sala_id TEXT NOT NULL,
    last_activity TEXT NOT NULL
);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants readable by everyone" ON public.room_participants FOR SELECT USING (true);
CREATE POLICY "Participants modifiable by everyone" ON public.room_participants FOR ALL USING (true) WITH CHECK (true);

-- 18. VAQUINHA CONTRIBUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.vaquinha_contributions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    amount_mt NUMERIC NOT NULL,
    transaction_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT
);

ALTER TABLE public.vaquinha_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vaquinha readable by everyone" ON public.vaquinha_contributions FOR SELECT USING (true);
CREATE POLICY "Vaquinha modifiable by everyone" ON public.vaquinha_contributions FOR ALL USING (true) WITH CHECK (true);

-- 19. COMPETITIONS TABLE
CREATE TABLE IF NOT EXISTS public.competitions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    prize_pool_mzn NUMERIC DEFAULT 0,
    winners JSONB DEFAULT '[]',
    start_snapshots JSONB DEFAULT '{}'
);

-- RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competitions readable by everyone" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "Competitions modifiable by everyone" ON public.competitions FOR ALL USING (true) WITH CHECK (true);

-- 20. ANUNCIOS TABLE
CREATE TABLE IF NOT EXISTS public.anuncios (
    id TEXT PRIMARY KEY,
    autor_id TEXT NOT NULL,
    autor_username TEXT NOT NULL,
    texto TEXT NOT NULL,
    visualizacoes INTEGER DEFAULT 0,
    dias INTEGER DEFAULT 1,
    valor_pago NUMERIC DEFAULT 0,
    criado_em TEXT NOT NULL,
    expira_em TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
);

ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anuncios readable by everyone" ON public.anuncios FOR SELECT USING (true);
CREATE POLICY "Anuncios modifiable by everyone" ON public.anuncios FOR ALL USING (true) WITH CHECK (true);

-- 21. SYS CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.sys_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

ALTER TABLE public.sys_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sys config readable by everyone" ON public.sys_config FOR SELECT USING (true);
CREATE POLICY "Sys config modifiable by everyone" ON public.sys_config FOR ALL USING (true) WITH CHECK (true);


-- ====================================================================
-- SEED INITIAL DATA FOR THE COLD BOOT (Optional, inserts default setup if empty)
-- ====================================================================

-- Insert default admin configuration
INSERT INTO public.sys_config (key, value) 
VALUES 
    ('credits_responsible_user_id', 'u1'),
    ('credits_responsible_phone', '870870059')
ON CONFLICT (key) DO NOTHING;

-- Seed default user accounts (Kelvin [Founder], Carlos [Mentor], Sara [Merchant], Ana [Guide], and public Caixa)
INSERT INTO public.profiles (id, username, nome, sobrenome, pais, sexo, avatar_url, cargo, nivel, xp, credits, bonus, points, criado_em, online_points, black_diamonds, last_level_up_at, password, security_question, security_answer, merchant_pin)
VALUES
    ('u1', 'kelvin', 'Kelvin', 'Wilson', 'MZ', 'M', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', 'Founder', 10, 950, 1000, 20, 15, '2026-06-07T11:46:16.000Z', 0, 0, '2026-06-07T11:46:16.000Z', '123', 'Qual o nome do seu primeiro animal de estimação?', 'Rex', '1234'),
    ('u2', 'Carlos_Mentor', 'Carlos', 'Silva', 'BR', 'M', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', 'Mentor', 8, 720, 500, 100, 80, '2026-05-23T11:46:16.000Z', 0, 0, '2026-05-23T11:46:16.000Z', '123', 'Qual a sua cidade natal?', 'Maputo', '1234'),
    ('u3', 'Sara_Merchant', 'Sara', 'Santos', 'PT', 'F', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', 'Merchant', 7, 610, 1500, 250, 120, '2026-06-22T11:46:16.000Z', 0, 0, '2026-06-22T11:46:16.000Z', '123', 'Qual a sua comida favorita?', 'Pizza', '1234'),
    ('u4', 'Guide_Ana', 'Ana', 'Gomes', 'BR', 'F', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', 'Guide', 5, 400, 250, 50, 30, '2026-06-27T11:46:16.000Z', 0, 0, '2026-06-27T11:46:16.000Z', '123', 'Qual o nome da sua mãe?', 'Maria', '1234'),
    ('u_casa', 'Casa_FCFUNZ', 'Caixa', 'Público', 'MZ', 'M', 'https://api.dicebear.com/7.x/identicon/svg?seed=casa', 'Verified User', 100, 0, 50000, 0, 0, '2025-07-07T11:46:16.000Z', 0, 0, '2025-07-07T11:46:16.000Z', 'casa_fcfunz_secret', 'Qual a fundação?', 'FCFUNZ', '1234')
ON CONFLICT (id) DO NOTHING;

-- Seed default initial chat rooms
INSERT INTO public.salas (id, nome, descricao, categoria, capacidade, dono_id, criado_em, silence, bot, locked)
VALUES
    ('s_oficial', 'Sala Oficial FCFUNZ', 'Canal principal para bate-papo, suporte e diversão.', 'Official Rooms', 1000, 'u1', '2026-06-07T11:46:16.000Z', false, false, false),
    ('s_suporte', 'Suporte Técnico & Ajuda', 'Tire suas dúvidas com nossa equipe de guias e moderadores.', 'Official Rooms', 500, 'u1', '2026-06-07T11:46:16.000Z', false, false, false),
    ('s_comercio', 'Comércio Geral FCFUNZ', 'Espaço livre para negociações com revendedores e comerciantes autorizados.', 'Marketplace Rooms', 300, 'u1', '2026-06-07T11:46:16.000Z', false, false, false),
    ('s_apostas', 'Minijogos & Apostas', 'Sinta a adrenalina jogando dados e apostando com outros membros.', 'Gaming Rooms', 200, 'u1', '2026-06-07T11:46:16.000Z', false, false, false)
ON CONFLICT (id) DO NOTHING;

-- Seed active announcements
INSERT INTO public.anuncios (id, autor_id, autor_username, texto, visualizacoes, dias, valor_pago, criado_em, expira_em, status)
VALUES
    ('ad_1', 'u1', 'kelvin', 'Seja bem-vindo ao FCFUNZ! Adquira MZN com nossos revendedores autorizados ou apoiando nossa vaquinha! 🚀', 25, 7, 50, '2026-07-07T11:46:16.000Z', '2026-07-14T11:46:16.000Z', 'active'),
    ('ad_2', 'u3', 'Sara_Merchant', 'Compre créditos 100% seguros com @Sara_Merchant! Atendimento imediato e taxas reduzidas! 🔮🌟', 12, 5, 50, '2026-07-07T11:46:16.000Z', '2026-07-12T11:46:16.000Z', 'active')
ON CONFLICT (id) DO NOTHING;


-- ====================================================================
-- 22. ENABLE SUPABASE REALTIME (WebSockets) FOR ALL CORE TABLES
-- ====================================================================

-- Ensure supabase_realtime publication exists safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END;
$$;

-- Safely add tables to the realtime publication
-- (If they are already in the publication, pg will ignore or we can catch conflicts gracefully)
DO $$
DECLARE
    t_name TEXT;
    tables_to_add TEXT[] := ARRAY[
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
BEGIN
    FOREACH t_name IN ARRAY tables_to_add LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t_name);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Table is already in publication, ignore
                NULL;
            WHEN OTHERS THEN
                -- Other errors, log or ignore
                RAISE NOTICE 'Could not add table % to supabase_realtime: %', t_name, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ====================================================================
-- INSTRUÇÕES DE INSTALAÇÃO NO SUPABASE
-- ====================================================================
-- 1. Acesse o painel do Supabase (https://supabase.com) do seu projeto.
-- 2. Vá em 'SQL Editor' no menu lateral esquerdo.
-- 3. Clique em 'New query' (Nova Consulta).
-- 4. Cole todo o conteúdo deste script (`supabase_schema.sql`) no editor de código.
-- 5. Clique em 'Run' (Executar) no canto inferior direito.
-- 6. Pronto! Todas as tabelas, políticas de segurança, registros iniciais e o Realtime estarão prontos para uso imediato pelo app FCFUNZ.
-- ====================================================================
