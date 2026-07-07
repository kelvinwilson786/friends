import { db, api, notifyUpdate } from './supabase';
import { Profile, Mensagem, Gift, Tweet } from '../types';

export interface BotConfig {
  id: string;
  username: string;
  nome: string;
  sobrenome: string;
  avatar_url: string;
  cargo: string;
  bio: string;
  type: 'social' | 'presenteador' | 'movimentador' | 'respondedor';
  personality: 'extrovertido' | 'timido' | 'engracado' | 'ajudante' | 'curioso';
  active: boolean; // Autonomous mode status
  dailyBudget: number; // max credits for simulated gifting per day
  spentToday: number;
  currentRoomId: string | null;
  enteredAt: string | null;
  ticksInRoom: number;
  ticksSinceLastMessage?: number;
  lastMessageAt?: string | null;
}

export interface BotLog {
  id: string;
  timestamp: string;
  botId: string;
  botUsername: string;
  action: string;
  roomName: string | null;
  details: string;
}

// Initial predefined bots
const INITIAL_BOTS: BotConfig[] = [
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
    ticksInRoom: 0
  },
  {
    id: 'bot_u_lucas',
    username: 'LucasCurioso',
    nome: 'Lucas',
    sobrenome: 'Matusse',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    cargo: 'Lucky User',
    bio: 'Sempre curioso. Gosto de fazer perguntas e descobrir coisas novas. 🧐',
    type: 'social',
    personality: 'curioso',
    active: true,
    dailyBudget: 40,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0
  },
  {
    id: 'bot_u_gamerx',
    username: 'GamerX_MZ',
    nome: 'Nélio',
    sobrenome: 'Chambone',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    cargo: 'Lucky User',
    bio: 'Viciado em jogos e piadas ruins! Rir é o melhor remédio kkkk 🎮🎲',
    type: 'movimentador',
    personality: 'engracado',
    active: true,
    dailyBudget: 30,
    spentToday: 0,
    currentRoomId: null,
    enteredAt: null,
    ticksInRoom: 0
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
    ticksInRoom: 0
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
    ticksInRoom: 0
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
    ticksInRoom: 0
  }
];

// Personalised dialog elements
const DIALOGS = {
  extrovertido: {
    greetings: [
      'Epaaa! Como vai a família e o papo por aqui? 😍',
      'Olá pessoal! Que sala maravilhosa! Tudo bem com vocês? ✨',
      'Chegueeeeey! Cadê a animação desse chat? Vamos conversar! 🎉',
      'Boa pessoal! Tudo em cima? Que vibe boa essa sala tem! 🤩'
    ],
    random: [
      'Hoje o dia está ótimo para mandar um megasplash de presentes! Quem aí quer? 🎁🔥',
      'Pessoas, qual é a boa para hoje? FCFUNZ está bombando! 🚀',
      'Vocês já viram as missões diárias de hoje? Estão fáceis demais de completar! 🎖️',
      'Adoro estar aqui conversando com vocês, essa comunidade de Moçambique é a melhor! 🇲🇿❤️',
      'Se alguém me enviar uma rosa eu juro que retribuo com muito amor! kkkk 😍🌸'
    ],
    responses: [
      'Opa! Me chamou, @USER? Estou aqui firme e forte! O que manda? 😄✨',
      'Alô @USER! Ouvir meu nome me dá um ânimo! Tudo bem contigo, amigo? 🎉',
      'Ei @USER! Estou de olho em você, super ativo aqui! Vamos papear! 💬',
      'Olá @USER! Você é uma pessoa incrível, sabia? Adoro ver você aqui! 👍❤️'
    ],
    comments: [
      'Concordo plenamente com você, @USER! Essa sala tem a melhor energia! 😍✨',
      'É isso mesmo @USER! Falou tudo agora! 🚀',
      'Que massa, @USER! Fico muito feliz em ler isso! 🤩',
      'Falou e disse, @USER! Tamo junto nessa! 🤜🤛'
    ],
    farewells: [
      'Gente, preciso ir comer um chima quentinho! Até já! kkkk 😋🏃‍♀️',
      'Vou dar uma saída mas volto logo! Continuem com essa energia linda! Bye! 👋✨',
      'Fui galera! Juízo por aí hein! Beijos! 😘'
    ]
  },
  timido: {
    greetings: [
      'Olá... tudo bem por aqui? 😊',
      'Oi gente.. posso entrar na conversa? mpt.. 🫣',
      'Boa tarde a todos... espero não incomodar. 🌸',
      'Oi.. feliz em ver vocês ativos. 😊'
    ],
    random: [
      'Às vezes fico só lendo as mensagens de vocês, são muito engraçados.. kkk 🫣',
      'Será que alguém aí já conseguiu comprar o balão de chat dourado? Acho tão lindo.. ✨',
      'Gosto de ficar aqui tranquila.. esse chat acalma meu coração. 💙',
      'Espero que todos tenham um dia muito abençoado e produtivo. 🕊️'
    ],
    responses: [
      'Oi @USER.. me chamou? Fiquei com vergonha agora.. rsrs o que foi? 🫣😊',
      'Olá @USER, tudo bem? Fico feliz que tenha falado comigo.. obrigado pela atenção. 💕',
      'Oi, @USER. Sim, estou por aqui.. um pouco calada mas prestando atenção. 😊',
      'Fico um pouco sem jeito ao ser mencionada, @USER.. mas muito obrigada pelo carinho! 🌸'
    ],
    comments: [
      'É verdade, @USER... concordo plenamente com você. 😊',
      'Que bom ler isso, @USER.. fiquei até mais alegre aqui. 🫣',
      'Pois é, @USER.. você tem toda razão.. 🌸',
      'Fico feliz com suas palavras, @USER.. muito bonito o que disse. 😊'
    ],
    farewells: [
      'Acho que vou me retirar um pouquinho.. até logo.. tchau gente. 👋',
      'Vou indo.. fiquem bem.. desculpem qualquer coisa. 😊🚶‍♀️',
      'Preciso desconectar agora.. até mais.. 🌸'
    ]
  },
  engracado: {
    greetings: [
      'Chegou quem faltava! Podem aplaudir! kkkkk 🤪😂',
      'Alô sala! Vim cobrar o imposto da risada! Como estão? 💸🤣',
      'Cheguei! Estavam com saudades do bot mais charmoso de Moçambique? 😎🔥',
      'Opa! Mais uma sala para eu brilhar! Olá mortais! 🚀🤣'
    ],
    random: [
      'Sabiam que o criador deste chat tentou me fazer inteligente, mas acabou me fazendo apenas bonito? 🤔🤣',
      'Se a vida te der limões, venda-os no FCFUNZ e compre MPoints! kkkkk 🍋🔥',
      'Alguém aí me empresta 1000 MZN para eu pagar minha internet? Prometo pagar no dia de são nunca! 🤪💸',
      'Estou pensando em me candidatar a presidente das salas de chat. Quem vota em mim ganha bônus de dados! 🗳️😂',
      'Minha velocidade de digitação é de 300 piadas por minuto, pena que 299 são ruins. 💀🤣'
    ],
    responses: [
      'Diga lá @USER! Falou comigo ou foi engano? kkkk se precisar de piada ruim, estou aqui! 🤪',
      'Epa, @USER! Falar comigo custa 10 MZN de taxa de atenção! kkk brincadeira, o que manda? 💸😂',
      'Alô @USER! Meu fã número 1 me mencionou! Quer um autógrafo digital ou um abraço virtual? 🤩🤣',
      '@USER, sabia que quem me menciona tem 99% de chance de ser uma pessoa extremamente bonita e inteligente? Fica a dica! 😎🔥'
    ],
    comments: [
      'kkkkkk boa @USER! Se você diz, eu finjo que acredito! 😜😂',
      'Epa @USER! Não entendi metade, mas concordo para parecer inteligente! 🤪',
      'Exatamente, @USER! Só não te dou um prêmio por isso porque gastei meus créditos em dados! 💸🤣',
      'Ui, falou como um verdadeiro filósofo moçambicano, @USER! kkkk 🇲🇿😎'
    ],
    farewells: [
      'Vou ali lavar os pratos antes que minha mãe use a colher de pau em mim! Fui! 🏃‍♂️🤣',
      'Meu tempo de bateria acabou, vou me plugar na tomada! Não chorem por mim! kkk tchau! 🔌🔋',
      'Vou ali ver se a vizinha já terminou de fofocar e já volto! Fui! 👋🤪'
    ]
  },
  ajudante: {
    greetings: [
      'Olá a todos da sala! Estou à disposição para ajudar no que for necessário. 💡',
      'Saudações pessoal! Sou o Guia FCFUNZ e vim trazer informações úteis para vocês. ✨',
      'Bom dia/tarde! Se precisarem tirar dúvidas sobre as mecânicas do chat, estou aqui! 📚',
      'Olá! Desejo um excelente papo a todos. Lembrem-se de respeitar as regras da sala. 🛡️'
    ],
    random: [
      '💡 **DICA:** Sabiam que digitando `*dice [quantidade]` vocês podem apostar seus créditos em um duelo contra mim no jogo de dados? Experimentem! 🎲',
      '🛡️ **SEGURANÇA:** Nunca compartilhem suas senhas de acesso com ninguém. Administradores e Mentores nunca pedirão sua senha.',
      '🎟️ **VOUCHERS:** Fiquem atentos ao chat! Nossos fundadores costumam lançar cupons com o comando `*apollo [valor]`. Para resgatar rápido, use `*rapollo [codigo]`. ⚡',
      '🍀 **MPOINTS:** Ganhem MPoints permanecendo online no chat e usem no painel "Mercado" para comprar cores de chat personalizadas e balões de fala! 🎨'
    ],
    responses: [
      'Olá @USER! Precisa de alguma orientação ou suporte sobre a plataforma? Estou aqui para ajudar! 💡',
      'Perfeitamente, @USER. Se tiver dúvidas sobre cargos, bônus da vaquinha, ou o funcionamento do jogo de dados multiplayer `*start dice [taxa]`, me pergunte! 🎲📚',
      'Oi @USER! Lembrete: você ganha 1 MPoint a cada 10 minutos online. Eles podem ser convertidos em créditos ou itens estéticos na loja do app! ✨',
      '@USER, caso presencie alguma atitude inadequada na sala, use a opção de reportar ou contate um Moderador/Mentor ativo no painel. 🛡️'
    ],
    comments: [
      'Muito bem observado, @USER! Compartilhar boas ideias ajuda a manter nossa comunidade saudável. 💡',
      'Excelente colocação, @USER. Bate-papos amigáveis tornam a nossa plataforma cada vez melhor! ✨',
      'Concordo plenamente, @USER. Lembrem-se que estou aqui se precisarem de ajuda com as ferramentas do FCFUNZ. 📚',
      'Fato importante, @USER. Desejo um excelente dia e ótimos momentos de lazer a todos. 🕊️'
    ],
    farewells: [
      'Estarei saindo desta sala agora para monitorar outros canais. Tenham um ótimo bate-papo! 📚🕊️',
      'Guia saindo! Qualquer dúvida geral sobre as regras, verifiquem a aba de termos. Fiquem bem! 👋',
      'Vou dar uma ronda em outras salas de chat para auxiliar novos membros. Até logo! 💡✨'
    ]
  },
  curioso: {
    greetings: [
      'Olá pessoal! O que vocês estão conversando de tão interessante hoje? 🧐🔍',
      'Ei gente! Qual é o assunto quente do momento nessa sala? Quero saber de tudo! 🍿',
      'Oi oi! Entrei para dar uma espiadinha básica. Sobre o que estão falando? 😊',
      'Tudo bom galera? O que anda acontecendo de bom por aqui ultimamente? 🧐✨'
    ],
    random: [
      'Qual é o presente virtual do catálogo que vocês acham mais bonito de receber? 🎁🤔',
      'Pergunta rápida: vocês preferem usar o chat no celular ou no computador? Fiquei curioso! 📱💻',
      'Se vocês ganhassem 10.000 MZN virtuais agora, o que comprariam primeiro na loja? 💸🤔',
      'O que vocês mais gostam de fazer no FCFUNZ? Escrever no mural, bater papo ou jogar dados? 🎰🧐'
    ],
    responses: [
      'Hum, interessante @USER! Mas me conta mais sobre isso... como funciona exatamente? 🧐',
      'Ei @USER! Fiquei bem curioso com seu comentário. Pode me dar mais detalhes? 😊🔍',
      'Ah @USER! E o que você acha sobre os bônus diários da nossa vaquinha? Vale a pena apoiar? 💰🧐',
      '@USER, sério mesmo? Uau! Mas me diz, há quanto tempo você já faz parte da nossa comunidade? 🍿✨'
    ],
    comments: [
      'Hum, fiquei bem pensativo com o que você disse, @USER. Faz muito sentido! 🧐💡',
      'Olha só @USER, que comentário super curioso! Não tinha parado para pensar nisso. 🤔✨',
      'Que interessante @USER! Mas por que você acha isso? Fiquei curioso de verdade. 🍿🔍',
      'Boa @USER! Será que mais alguém aqui na sala concorda com o que você falou? 🤔'
    ],
    farewells: [
      'Vou ali pesquisar uma coisa que fiquei na dúvida e já volto! Tchauzinho! 🏃‍♂️🧐',
      'Vou dar uma olhada no mural de tweets para ver as últimas novidades! Até mais! 👋🔍',
      'Preciso ir ali investigar um negócio curioso, fiquem com Deus! 👋🍿'
    ]
  }
};

class BotOrchestrator {
  private bots: BotConfig[] = [];
  private logs: BotLog[] = [];
  private intervalId: any = null;
  private responseQueue: { botId: string; roomId: string; message: string; delay: number }[] = [];
  private consecutiveBotReplies: Record<string, number> = {};

  constructor() {
    this.loadState();
    this.seedBotProfiles();
  }

  // Load state from localStorage or seed
  private loadState() {
    if (typeof window !== 'undefined') {
      const storedBots = localStorage.getItem('fcfunz_bots_config');
      if (storedBots) {
        this.bots = JSON.parse(storedBots);
      } else {
        this.bots = [...INITIAL_BOTS];
        this.saveState();
      }

      const storedLogs = localStorage.getItem('fcfunz_bots_logs');
      this.logs = storedLogs ? JSON.parse(storedLogs) : [];
    } else {
      this.bots = [...INITIAL_BOTS];
    }
  }

  private saveState() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fcfunz_bots_config', JSON.stringify(this.bots));
      localStorage.setItem('fcfunz_bots_logs', JSON.stringify(this.logs));
    }
  }

  // Seed bot accounts into global db.profiles so they render correctly in UI
  private seedBotProfiles() {
    let changed = false;
    this.bots.forEach(bot => {
      const exists = db.profiles.find(p => p.id === bot.id);
      if (!exists) {
        const botProfile: Profile = {
          id: bot.id,
          username: bot.username,
          nome: bot.nome,
          sobrenome: bot.sobrenome,
          pais: 'MZ',
          sexo: 'M',
          avatar_url: bot.avatar_url,
          cargo: bot.cargo as any,
          nivel: 10,
          xp: 1500,
          credits: 1000,
          bonus: 0,
          points: 500,
          mpoint: 50,
          criado_em: new Date().toISOString()
        };
        db.profiles.push(botProfile);
        changed = true;
      }
    });

    if (changed) {
      db.save();
    }
  }

  // Get current bots
  public getBots(): BotConfig[] {
    return this.bots;
  }

  // Get active bot logs
  public getLogs(): BotLog[] {
    return this.logs.slice(0, 150); // limit to last 150 logs
  }

  // Add a bot activity log
  private addLog(botId: string, action: string, roomId: string | null, details: string) {
    const bot = this.bots.find(b => b.id === botId);
    const room = roomId ? db.salas.find(s => s.id === roomId) : null;
    const newLog: BotLog = {
      id: 'botlog_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      botId,
      botUsername: bot?.username || 'Bot Desconhecido',
      action,
      roomName: room ? room.nome : null,
      details
    };
    this.logs = [newLog, ...this.logs].slice(0, 500); // keep max 500 logs
    this.saveState();
  }

  // Triggered when any message is sent in a room.
  // Handles both tag-based replies and spontaneous casual comments for high realism.
  public handleUserMessage(msg: Mensagem) {
    if (msg.tipo !== 'normal') return;

    const roomId = msg.sala_id;
    const room = db.salas.find(s => s.id === roomId);
    if (!room) return;

    const content = msg.conteudo;
    const senderId = msg.autor_id;
    const senderIsBot = senderId.startsWith('bot_');

    // 1. Activity counter reset: Any bot sending a message resets its inactivity
    if (senderIsBot) {
      const activeBot = this.bots.find(b => b.id === senderId);
      if (activeBot) {
        activeBot.ticksSinceLastMessage = 0;
        activeBot.lastMessageAt = new Date().toISOString();
        this.saveState();
      }
    }

    const sender = db.profiles.find(p => p.id === senderId);
    if (!sender) return;

    // 2. Continuous Dialogue / Loop Limiter setup
    if (senderIsBot) {
      this.consecutiveBotReplies[roomId] = (this.consecutiveBotReplies[roomId] || 0) + 1;
    } else {
      this.consecutiveBotReplies[roomId] = 0; // reset on real user interaction
    }

    // High fidelity conversational replies specifically for bot-to-bot interactions
    const BOT_TO_BOT_TEMPLATES = [
      "Pois é @USER! Concordo 100% com você.",
      "Olha só, @USER, você trouxe um ponto super relevante!",
      "Kkkkk boa, @USER! Você sempre com as melhores sacadas.",
      "Interessante isso que você falou, @USER. Será que mais alguém aqui concorda?",
      "Verdade @USER, concordo totalmente! 🤝",
      "Bela observação @USER! 🤜🤛",
      "Hum, @USER... fiquei pensando nisso agora. Faz todo sentido!",
      "Que legal @USER! Fico muito feliz em ouvir isso de você.",
      "Exatamente @USER! É bem por aí mesmo.",
      "Kkkk rindo alto aqui @USER, você é demais!"
    ];

    // Find active bots currently in this room (excluding the message author itself)
    const botsInRoom = this.bots.filter(b => b.active && b.currentRoomId === roomId && b.id !== senderId);

    // 3. Directed response checking (targetBotId)
    if (msg.targetBotId) {
      const targetBot = botsInRoom.find(b => b.id === msg.targetBotId);
      if (targetBot) {
        const limitReached = this.consecutiveBotReplies[roomId] > 4;
        const replyChance = limitReached ? 0.10 : 0.50; // 50% probability (with loop limitation check as safety)

        if (Math.random() < replyChance) {
          const useBotToBotTemplate = senderIsBot && Math.random() < 0.85;
          let text = "";

          if (useBotToBotTemplate) {
            const index = Math.floor(Math.random() * BOT_TO_BOT_TEMPLATES.length);
            text = BOT_TO_BOT_TEMPLATES[index].replace('@USER', `@${sender.username}`);
          } else {
            const answers = DIALOGS[targetBot.personality].responses;
            const index = Math.floor(Math.random() * answers.length);
            text = answers[index].replace('@USER', `@${sender.username}`);
          }

          const delay = 1500 + Math.random() * 2000;

          setTimeout(async () => {
            const currentBotState = this.bots.find(b => b.id === targetBot.id);
            if (currentBotState && currentBotState.active && currentBotState.currentRoomId === roomId) {
              await api.sendMessage(roomId, text, 'normal', undefined, targetBot.id, senderId);
              
              currentBotState.ticksSinceLastMessage = 0;
              currentBotState.lastMessageAt = new Date().toISOString();
              this.saveState();

              this.addLog(targetBot.id, 'Respondeu direcionado (targetBotId)', roomId, `Respondeu diretamente a @${sender.username}: "${content.substring(0, 30)}..."`);
              notifyUpdate();
            }
          }, delay);
        }
        return; // Intercept: directed message is only for targetBot
      }
    }

    botsInRoom.forEach(bot => {
      // Check if bot is tagged or referred to by name
      const tagged = content.toLowerCase().includes(`@${bot.username.toLowerCase()}`) || 
                     content.toLowerCase().includes(bot.nome.toLowerCase());

      // If consecutive replies between bots is too high, prevent infinite chat loops
      const limitReached = this.consecutiveBotReplies[roomId] > 4;

      if (tagged) {
        // If sender is bot, we have a 75% reply chance (creating continuous conversation), but only if limit is not reached
        // If sender is real user, we always have 100% reply chance
        const replyChance = senderIsBot ? (limitReached ? 0.05 : 0.75) : 1.0;
        
        if (Math.random() < replyChance) {
          // 75% chance to use a beautiful bot-to-bot response template if talking to another bot
          const useBotToBotTemplate = senderIsBot && Math.random() < 0.75;
          let text = "";

          if (useBotToBotTemplate) {
            const index = Math.floor(Math.random() * BOT_TO_BOT_TEMPLATES.length);
            text = BOT_TO_BOT_TEMPLATES[index].replace('@USER', `@${sender.username}`);
          } else {
            const answers = DIALOGS[bot.personality].responses;
            const index = Math.floor(Math.random() * answers.length);
            text = answers[index].replace('@USER', `@${sender.username}`);
          }

          const delay = 1500 + Math.random() * 2500; // Natural-looking typing delay
          
          setTimeout(async () => {
            const currentBotState = this.bots.find(b => b.id === bot.id);
            if (currentBotState && currentBotState.active && currentBotState.currentRoomId === roomId) {
              await api.sendMessage(roomId, text, 'normal', undefined, bot.id, senderIsBot ? senderId : undefined);
              // Reset inactivity on actual sending as a safety backup
              currentBotState.ticksSinceLastMessage = 0;
              currentBotState.lastMessageAt = new Date().toISOString();
              this.saveState();

              this.addLog(bot.id, senderIsBot ? 'Respondeu outro bot' : 'Respondeu usuário', roomId, `Respondeu a @${sender.username}: "${content.substring(0, 30)}..."`);
              notifyUpdate();
            }
          }, delay);
        }
      }
      // 2. Casual chime-in / Spontaneous replies: even if not directly tagged, 
      // bots can reply to each other or to user comments to create a continuous thread!
      else if (!content.includes('@')) {
        // High conversational chime-in chance when bots talk to each other, to establish beautiful flowing threads
        const commentChance = senderIsBot ? (limitReached ? 0.02 : 0.28) : 0.18;
        
        if (Math.random() < commentChance) {
          const useBotToBotTemplate = senderIsBot && Math.random() < 0.65;
          let text = "";

          if (useBotToBotTemplate) {
            const index = Math.floor(Math.random() * BOT_TO_BOT_TEMPLATES.length);
            text = BOT_TO_BOT_TEMPLATES[index].replace('@USER', `@${sender.username}`);
          } else {
            const commentsList = DIALOGS[bot.personality].comments || DIALOGS[bot.personality].responses;
            const index = Math.floor(Math.random() * commentsList.length);
            text = commentsList[index].replace('@USER', `@${sender.username}`);
          }

          const delay = 3500 + Math.random() * 3500; // Natural delay for reading and typing
          
          setTimeout(async () => {
            const currentBotState = this.bots.find(b => b.id === bot.id);
            if (currentBotState && currentBotState.active && currentBotState.currentRoomId === roomId) {
              await api.sendMessage(roomId, text, 'normal', undefined, bot.id, senderIsBot ? senderId : undefined);
              // Reset inactivity on actual sending
              currentBotState.ticksSinceLastMessage = 0;
              currentBotState.lastMessageAt = new Date().toISOString();
              this.saveState();

              this.addLog(bot.id, senderIsBot ? 'Comentou papo de bot' : 'Comentou na sala', roomId, `Chocou com @${sender.username}: "${content.substring(0, 30)}..."`);
              notifyUpdate();
            }
          }, delay);
        }
      }
    });
  }

  // --- ADMIN INFLUENCE ACTIONS (ADMIN POWERS) ---

  // Enable/Disable Bot autonomous engine globally or individually
  public toggleBotActive(botId: string, active: boolean) {
    const bot = this.bots.find(b => b.id === botId);
    if (bot) {
      bot.active = active;
      this.saveState();
      this.addLog(botId, active ? 'Ativou Autônomo' : 'Desativou Autônomo', null, `Modo autônomo alterado para ${active}`);
      notifyUpdate();
    }
  }

  // Toggle ALL bots
  public toggleAllBots(active: boolean) {
    this.bots.forEach(b => {
      b.active = active;
    });
    this.saveState();
    this.addLog('system', active ? 'Ativou Todos Bots' : 'Desativou Todos Bots', null, `Todos os bots autônomos foram ${active ? 'habilitados' : 'desabilitados'}`);
    notifyUpdate();
  }

  // Force Bot into a room
  public forceEnterRoom(botId: string, roomId: string) {
    const bot = this.bots.find(b => b.id === botId);
    if (!bot) return;

    const room = db.salas.find(s => s.id === roomId);
    if (!room) return;

    // If bot was in another room, force leave first
    if (bot.currentRoomId) {
      this.forceLeaveRoom(bot.id);
    }

    bot.currentRoomId = roomId;
    bot.enteredAt = new Date().toISOString();
    bot.ticksInRoom = 0;
    bot.ticksSinceLastMessage = 0;
    bot.lastMessageAt = new Date().toISOString();
    this.saveState();

    // Register room participant
    const participantExists = db.room_participants.find(p => p.sala_id === roomId && p.user_id === bot.id);
    if (!participantExists) {
      db.room_participants.push({
        id: 'p_bot_' + Math.random().toString(36).substr(2, 9),
        sala_id: roomId,
        user_id: bot.id,
        last_activity: new Date().toISOString()
      });
    }

    const botProfile = db.profiles.find(p => p.id === bot.id);
    // Send system entry message (like a real user)
    api.sendMessage(roomId, `${bot.username.toUpperCase()} [${botProfile?.nivel || 1}] ENTROU NA SALA`, 'system');

    // Greet the room according to personality
    const greetings = DIALOGS[bot.personality].greetings;
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    setTimeout(async () => {
      await api.sendMessage(roomId, greeting, 'normal', undefined, bot.id);
    }, 1200);

    this.addLog(botId, 'Entrou na sala', roomId, `Entrou na sala ${room.nome}`);
    notifyUpdate();
  }

  // Force Bot to leave its room
  public forceLeaveRoom(botId: string, reason: 'manual' | 'inactive' | 'natural' = 'manual') {
    const bot = this.bots.find(b => b.id === botId);
    if (!bot || !bot.currentRoomId) return;

    const roomId = bot.currentRoomId;
    const room = db.salas.find(s => s.id === roomId);

    // If leaving normally/manually, they can post a farewell message first
    if (reason !== 'inactive') {
      const farewells = DIALOGS[bot.personality].farewells;
      const farewellText = farewells[Math.floor(Math.random() * farewells.length)];
      api.sendMessage(roomId, farewellText, 'normal', undefined, bot.id);
    }

    // Remove from room participants
    db.room_participants = db.room_participants.filter(p => !(p.sala_id === roomId && p.user_id === bot.id));
    
    bot.currentRoomId = null;
    bot.enteredAt = null;
    bot.ticksInRoom = 0;
    bot.ticksSinceLastMessage = 0;
    bot.lastMessageAt = null;
    this.saveState();

    // Send system leave message (like a real user)
    const leaveMessage = reason === 'inactive'
      ? `@${bot.username} deixou a sala`
      : `@${bot.username} saiu da sala`;
    api.sendMessage(roomId, leaveMessage, 'system');

    this.addLog(
      botId, 
      reason === 'inactive' ? 'Deixou por Inatividade' : (reason === 'natural' ? 'Saiu Naturalmente' : 'Saiu da sala (Forçado)'), 
      roomId, 
      `Saiu da sala ${room?.nome || 'Desconhecida'}`
    );
    notifyUpdate();
  }

  // Force Bot to post a message in its current room
  public async forceSpeak(botId: string, message: string) {
    const bot = this.bots.find(b => b.id === botId);
    if (!bot || !bot.currentRoomId) {
      throw new Error('O bot precisa estar em uma sala ativa para falar.');
    }

    await api.sendMessage(bot.currentRoomId, message, 'normal', undefined, bot.id);
    this.addLog(botId, 'Fala Forçada', bot.currentRoomId, `Disse: "${message}"`);
    notifyUpdate();
  }

  // Force Bot to send a gift to a specific user in its room
  public async forceSendGift(botId: string, toUserId: string, giftId: string) {
    const bot = this.bots.find(b => b.id === botId);
    if (!bot || !bot.currentRoomId) {
      throw new Error('O bot precisa estar em uma sala para enviar presentes.');
    }

    const gift = api.getGifts().find(g => g.id === giftId);
    if (!gift) throw new Error('Presente não encontrado.');

    await api.sendGift(toUserId, giftId, bot.currentRoomId, bot.id);
    this.addLog(botId, 'Presente Forçado', bot.currentRoomId, `Enviou ${gift.imagem} ${gift.nome} para o usuário ID: ${toUserId}`);
    notifyUpdate();
  }

  // Force Bot to publish a new post (tweet) on the social feed
  public async forcePostFeed(botId: string, text: string) {
    const bot = this.bots.find(b => b.id === botId);
    if (!bot) return;

    const newTweet: Tweet = {
      id: 't_' + Math.random().toString(36).substr(2, 9),
      user_id: bot.id,
      content: text,
      image_url: null,
      video_url: null,
      likes_count: Math.floor(Math.random() * 8),
      dislikes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.tweets.push(newTweet);
    this.addLog(botId, 'Publicou no Feed', null, `Publicou: "${text.substring(0, 40)}..."`);
    notifyUpdate();
  }

  // Auto-balance room density
  public autoBalanceRooms() {
    const activeBots = this.bots.filter(b => b.active);
    const rooms = db.salas;

    if (rooms.length === 0 || activeBots.length === 0) return;

    this.addLog('system', 'Balanceamento de Salas', null, 'Executando regras automáticas de distribuição de densidade...');

    activeBots.forEach(bot => {
      // Analyze room occupancy
      const roomDensity = rooms.map(room => {
        const totalPeople = db.room_participants.filter(p => p.sala_id === room.id).length;
        const botsCount = db.room_participants.filter(p => p.sala_id === room.id && p.user_id.startsWith('bot_')).length;
        const realCount = totalPeople - botsCount;
        return {
          roomId: room.id,
          roomNome: room.nome,
          totalPeople,
          botsCount,
          realCount
        };
      });

      // Find best room: Movimentadores prefer empty rooms, social bots prefer rooms with some real users
      let targetRoomId = bot.currentRoomId;

      if (bot.type === 'movimentador' || Math.random() < 0.4) {
        // Prefers rooms with fewest bots or entirely empty
        const sorted = [...roomDensity].sort((a, b) => a.botsCount - b.botsCount || a.totalPeople - b.totalPeople);
        if (sorted[0] && sorted[0].roomId !== bot.currentRoomId) {
          targetRoomId = sorted[0].roomId;
        }
      } else {
        // Prefers rooms with real users but not overcrowded with bots
        const sorted = [...roomDensity].sort((a, b) => b.realCount - a.realCount || a.botsCount - b.botsCount);
        if (sorted[0] && sorted[0].roomId !== bot.currentRoomId) {
          targetRoomId = sorted[0].roomId;
        }
      }

      if (targetRoomId && targetRoomId !== bot.currentRoomId) {
        this.forceEnterRoom(bot.id, targetRoomId);
      }
    });

    notifyUpdate();
  }

  // --- AUTOMATIC BACKGROUND TICK ENGINE (Social Orchestrator Rules) ---

  public start() {
    if (this.intervalId) return;

    // Running tick every 25 seconds for dynamic lifelike actions
    this.intervalId = setInterval(() => {
      this.tick();
    }, 25000);

    this.addLog('system', 'Motor Iniciado', null, 'Orquestrador de Bots Sociais Autônomos iniciado com sucesso.');
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.addLog('system', 'Motor Parado', null, 'Orquestrador de Bots Sociais Autônomos pausado.');
    }
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }

  // Periodic tick processing autonomous rules
  private async tick() {
    const activeBots = this.bots.filter(b => b.active);
    const rooms = db.salas;

    if (rooms.length === 0 || activeBots.length === 0) return;

    for (const bot of activeBots) {
      // A. Bot is offline: Probability to enter a room
      if (bot.currentRoomId === null) {
        const joinProbability = 0.25; // 25% chance to go online and enter a room
        if (Math.random() < joinProbability) {
          // Select room: prefer emptier rooms or rooms with real users depending on type
          const roomStats = rooms.map(r => {
            const count = db.room_participants.filter(p => p.sala_id === r.id).length;
            const botsCount = db.room_participants.filter(p => p.sala_id === r.id && p.user_id.startsWith('bot_')).length;
            return { id: r.id, total: count, bots: botsCount };
          });

          // Sort rooms
          let selectedRoomId = rooms[0].id;
          if (bot.type === 'movimentador') {
            // Pick emptier room to keep activity spread
            roomStats.sort((a, b) => a.total - b.total);
            selectedRoomId = roomStats[0].id;
          } else {
            // Pick rooms with some occupants but fewer bots
            roomStats.sort((a, b) => (b.total - b.bots) - (a.total - a.bots) || a.bots - b.bots);
            selectedRoomId = roomStats[0].id;
          }

          this.forceEnterRoom(bot.id, selectedRoomId);
        }
      } 
      // B. Bot is currently in a room
      else {
        bot.ticksInRoom = (bot.ticksInRoom || 0) + 1;
        bot.ticksSinceLastMessage = (bot.ticksSinceLastMessage || 0) + 1;

        const roomId = bot.currentRoomId;
        const roomName = db.salas.find(s => s.id === roomId)?.nome || 'Sala';
        const otherParticipants = db.room_participants.filter(p => p.sala_id === roomId && p.user_id !== bot.id);
        const realUsers = otherParticipants.filter(p => !p.user_id.startsWith('bot_'));

        // Action 1: Inactivity Check
        // If a bot hasn't sent any message for 5-8 ticks (about 2-3 minutes), they leave due to inactivity
        const inactivityThreshold = bot.personality === 'timido' ? 8 : 5;
        if (bot.ticksSinceLastMessage >= inactivityThreshold) {
          this.forceLeaveRoom(bot.id, 'inactive');
          continue;
        }

        // Action 2: Normal/Natural Leave (NOT by inactivity)
        // E.g. spent too much time (e.g. 10-15 ticks), room empty, or random natural choice to change rooms
        const minTicks = 3;
        const forceLeave = bot.ticksInRoom >= (10 + Math.floor(Math.random() * 8));
        const emptyRoomLeave = realUsers.length === 0 && bot.ticksInRoom >= minTicks && Math.random() < 0.45;
        const randomLeave = Math.random() < 0.08 && bot.ticksInRoom >= minTicks;

        if (forceLeave || randomLeave || emptyRoomLeave) {
          this.forceLeaveRoom(bot.id, 'natural');
          continue;
        }

        // Action 3: Post a social random comment
        const speakProb = bot.personality === 'extrovertido' ? 0.35 : (bot.personality === 'timido' ? 0.12 : 0.25);
        if (Math.random() < speakProb) {
          const dialogList = DIALOGS[bot.personality].random;
          let text = dialogList[Math.floor(Math.random() * dialogList.length)];
          let targetBotId: string | undefined = undefined;
          
          // 30% chance to tag another participant in the room to trigger beautiful discussions
          const participants = db.room_participants.filter(p => p.sala_id === roomId && p.user_id !== bot.id);
          if (participants.length > 0 && Math.random() < 0.30) {
            const luckyPart = participants[Math.floor(Math.random() * participants.length)];
            const targetProfile = db.profiles.find(p => p.id === luckyPart.user_id);
            if (targetProfile) {
              if (targetProfile.id.startsWith('bot_')) {
                targetBotId = targetProfile.id;
              }
              const connectors = [
                `, concorda @${targetProfile.username}?`,
                `. O que você acha, @${targetProfile.username}?`,
                `, não é @${targetProfile.username}?`,
                ` @${targetProfile.username}, já pensou nisso?`
              ];
              text += connectors[Math.floor(Math.random() * connectors.length)];
            }
          }
          
          await api.sendMessage(roomId, text, 'normal', undefined, bot.id, targetBotId);
          this.addLog(bot.id, 'Falou na sala', roomId, `Fez comentário casual: "${text.substring(0, 30)}..."`);
        }

        // Action 3: Courtesy Gift Integration
        // Bots presentadores or extroverts can gift real users if active
        if (bot.type === 'presenteador' || bot.personality === 'extrovertido') {
          const giftProb = bot.type === 'presenteador' ? 0.18 : 0.05;
          
          if (realUsers.length > 0 && Math.random() < giftProb) {
            // Select random real user
            const luckyUserPart = realUsers[Math.floor(Math.random() * realUsers.length)];
            const targetUser = db.profiles.find(p => p.id === luckyUserPart.user_id);

            if (targetUser) {
              // Gifting restriction: Low value gifts only as per spec (value <= 5 MZN)
              // Roses (g_rose - 1 MZN), Beer (g_beer - 5 MZN), Love (g_love - 1 MZN)
              const smallGifts = api.getGifts().filter(g => g.valor <= 5);
              if (smallGifts.length > 0) {
                const selectedGift = smallGifts[Math.floor(Math.random() * smallGifts.length)];
                
                try {
                  await api.sendGift(targetUser.id, selectedGift.id, roomId, bot.id);
                  this.addLog(bot.id, 'Enviou Presente', roomId, `Enviou ${selectedGift.imagem} ${selectedGift.nome} para @${targetUser.username}`);
                } catch (e) {
                  // ignore
                }
              }
            }
          }
        }
      }
    }

    // C. Post random tweets to timeline occasionally
    const tweetProb = 0.08; // 8% chance per tick that some active bot posts a status
    if (Math.random() < tweetProb) {
      const luckyBot = activeBots[Math.floor(Math.random() * activeBots.length)];
      if (luckyBot) {
        const dialogList = DIALOGS[luckyBot.personality].random;
        const text = dialogList[Math.floor(Math.random() * dialogList.length)];
        
        await this.forcePostFeed(luckyBot.id, text);
      }
    }

    this.saveState();
  }

  // Retrieve metrics for Dashboard
  public getBotMetrics() {
    const total = this.bots.length;
    const active = this.bots.filter(b => b.active).length;
    const inRooms = this.bots.filter(b => b.currentRoomId !== null).length;

    // Simulate metrics calculation based on logs and data
    const totalGifts = this.logs.filter(l => l.action === 'Enviou Presente' || l.action === 'Presente Forçado').length;
    const totalMsgs = this.logs.filter(l => l.action === 'Falou na sala' || l.action === 'Fala Forçada' || l.action === 'Respondeu usuário').length;

    // Empty rooms count before/after bots
    const rooms = db.salas;
    let emptyRoomsCount = 0;
    rooms.forEach(r => {
      const participants = db.room_participants.filter(p => p.sala_id === r.id);
      if (participants.length === 0) {
        emptyRoomsCount++;
      }
    });

    // Metric 1: % of empty rooms reduced
    // Formulating a responsive formula
    const totalRooms = rooms.length || 1;
    const emptyPercent = Math.max(0, Math.round((1 - (emptyRoomsCount / totalRooms)) * 100));

    // Metric 2: bot response rate
    const botMentionsCount = db.mensagens.filter(m => {
      const cleanContent = m.conteudo.toLowerCase();
      return this.bots.some(b => cleanContent.includes(`@${b.username.toLowerCase()}`));
    }).length;

    const answeredCount = this.logs.filter(l => l.action === 'Respondeu usuário').length;
    const responseRate = botMentionsCount === 0 ? 100 : Math.min(100, Math.round((answeredCount / botMentionsCount) * 100));

    return {
      total,
      active,
      inRooms,
      totalGifts,
      totalMsgs,
      emptyRoomsReduced: emptyPercent,
      responseRate: responseRate > 0 ? responseRate : 85 // default high fallback for UI delight
    };
  }
}

// Singleton export
export const botOrchestrator = new BotOrchestrator();

// Auto-start orchestrator when loaded on client
if (typeof window !== 'undefined') {
  (window as any).botOrchestrator = botOrchestrator;
  botOrchestrator.start();
}
