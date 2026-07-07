# Documentação de Arquitetura: Sistema de Bots Inteligentes (FCFUNZ)

Esta especificação técnica detalha a arquitetura, modelagem de dados, algoritmos de comportamento, lógica de decisão de salas e diretrizes de integração para o **Sistema de Bots Inteligentes** na plataforma FCFUNZ.

---

## 1. Visão Geral do Sistema

O objetivo principal do Sistema de Bots é automatizar o engajamento de usuários reais, reduzir a ocorrência de salas vazias de chat e fomentar interações sociais dinâmicas de forma orgânica e indetectável.

```
                  ┌──────────────────────────────┐
                  │      Orquestrador de Bots    │ (Cron Triggered Serverless / Node.js Process)
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Módulo de Chat │     │ Módulo de Feed  │     │Módulo de Brindes│
│ (Conversas/Salas│     │(Comentários/Curt│     │ (Moedas/Present)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 2. Modelagem de Dados (Supabase / PostgreSQL)

Para suportar o sistema de forma persistente, escalável e segura, são necessárias as seguintes tabelas e estruturas relacionais:

### A) Tabela `bots`
Armazena a identidade do bot. Cada bot herda a mesma estrutura de um perfil de usuário real (`profiles`) para garantir consistência visual no chat e no feed.

```sql
CREATE TYPE bot_personality AS ENUM ('extrovertido', 'timido', 'engracado', 'ajudante', 'curioso');
CREATE TYPE bot_type AS ENUM ('social', 'presenteador', 'movimentador', 'respondedor');

CREATE TABLE bots (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    tipo bot_type NOT NULL DEFAULT 'social',
    personalidade bot_personality NOT NULL DEFAULT 'extrovertido',
    orcamento_diario_max INT NOT NULL DEFAULT 50, -- Valor máximo em moedas de presentes por dia
    orcamento_diario_gasto INT NOT NULL DEFAULT 0,
    max_salas_por_dia INT NOT NULL DEFAULT 10,
    salas_visitadas_hoje INT NOT NULL DEFAULT 0,
    ultima_atividade_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### B) Tabela `bot_sessions`
Rastreia a alocação ativa de um bot em uma sala específica de chat.

```sql
CREATE TABLE bot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    sala_id UUID NOT NULL, -- Referência à tabela de salas de chat
    entrou_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    planeja_sair_em TIMESTAMP WITH TIME ZONE NOT NULL,
    mensagens_enviadas INT NOT NULL DEFAULT 0,
    limite_mensagens_sessao INT NOT NULL, -- Definido aleatoriamente entre 3-8 na entrada
    presentes_enviados_sessao INT NOT NULL DEFAULT 0,
    limite_presentes_sessao INT NOT NULL DEFAULT 2,
    ultimo_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### C) Tabela `bot_activity_log`
Mantém o histórico de ações para auditoria e cálculo de métricas de sucesso.

```sql
CREATE TABLE bot_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES bots(id),
    sala_id UUID,
    acao_tipo VARCHAR(50) NOT NULL, -- 'entrada', 'mensagem', 'presente', 'saida', 'comentario_feed'
    detalhes JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Comportamento e Algoritmos dos Bots

O ciclo de vida de um bot na sala é governado por três estágios discretos (Entrada, Permanência e Saída), cada um simulando latências humanas de processamento e digitação.

```
[Decisão de Entrada] ──► [Latência 5-15s] ──► [Entrada na Sala]
                                                   │
                                                   ▼
                                         [Observação 10-30s]
                                                   │
                                                   ▼
                                          [Ciclo de Permanência] (10-45 min)
                                          - Mensagens (3-8) com digitação
                                          - Respostas / Comandos
                                          - Envio de Presentes
                                                   │
                                                   ▼
                                         [Mensagem Despedida]
                                                   │
                                                   ▼
                                         [Latência Saída 10-20s]
                                                   │
                                                   ▼
                                            [Saída da Sala]
```

### A) Código-Modelo: Simulador de Digitação Humana
Para simular o delay de digitação real, a função calcula o tempo de espera baseado no número de caracteres da mensagem de forma dinâmica:

```typescript
export async function simulateTypingAndSend(
  message: string, 
  sendFn: (msg: string) => Promise<void>
): Promise<void> {
  // 150 a 250 milissegundos por caractere + latência de pensamento de 1-2 segundos
  const typingSpeedMsPerChar = Math.floor(Math.random() * 100) + 150;
  const thinkingDelayMs = Math.floor(Math.random() * 1500) + 1000;

  await new Promise(resolve => setTimeout(resolve, thinkingDelayMs));
  
  const totalTypingTime = message.length * typingSpeedMsPerChar;
  // Aqui o front-end pode emitir um evento "Bot X está digitando..."
  await new Promise(resolve => setTimeout(resolve, totalTypingTime));

  await sendFn(message);
}
```

### B) Algoritmo de Ciclo de Vida do Bot na Sala

```typescript
interface BotLifecycleConfig {
  botId: string;
  roomName: string;
  personality: 'extrovertido' | 'timido' | 'engracado' | 'ajudante' | 'curioso';
}

export class BotLifecycleSimulator {
  private active: boolean = true;

  constructor(private config: BotLifecycleConfig) {}

  public async startSession(
    sendMessage: (msg: string) => Promise<void>,
    sendGift: (giftId: string) => Promise<void>
  ) {
    // 1. Padrão de Entrada (Delay de simulação de clique/conexão)
    const entryDelay = (Math.random() * 10 + 5) * 1000; 
    await new Promise(r => setTimeout(r, entryDelay));
    
    if (!this.active) return;
    console.log(`Bot ${this.config.botId} entrou na sala.`);
    
    // 2. Observação inicial antes do primeiro "Oi" (10-30s)
    const observationDelay = (Math.random() * 20 + 10) * 1000;
    await new Promise(r => setTimeout(r, observationDelay));

    // Envia saudação inicial
    const welcomeMsg = this.getRandomPhrase('saudacao');
    await simulateTypingAndSend(welcomeMsg, sendMessage);

    // 3. Loop de Permanência (Duração total de 10 a 45 minutos)
    const sessionDurationMs = (Math.random() * 35 + 10) * 60 * 1000;
    const startTime = Date.now();
    const targetMessagesCount = Math.floor(Math.random() * 6) + 3; // 3-8 mensagens
    let sentMessages = 0;

    while (Date.now() - startTime < sessionDurationMs && this.active) {
      // Intervalo aleatório entre interações (2 a 6 minutos)
      const nextInteractionInterval = (Math.random() * 4 + 2) * 60 * 1000;
      await new Promise(r => setTimeout(r, nextInteractionInterval));

      if (sentMessages < targetMessagesCount) {
        // Decide se faz pergunta, reage ou faz comentário genérico
        const actionType = Math.random();
        let phrase = '';
        if (actionType < 0.4) {
          phrase = this.getRandomPhrase('pergunta');
        } else if (actionType < 0.8) {
          phrase = this.getRandomPhrase('resposta');
        } else {
          // Pode enviar presente barato se for tipo 'presenteador'
          if (Math.random() < 0.3) {
            await sendGift('gift_badge_01'); // Presente cortesia do sistema
            continue;
          }
        }

        if (phrase) {
          await simulateTypingAndSend(phrase, sendMessage);
          sentMessages++;
        }
      }
    }

    // 4. Padrão de Saída
    const goodbyeMsg = this.getRandomPhrase('despedida');
    await simulateTypingAndSend(goodbyeMsg, sendMessage);

    // Delay final de 10 a 20 segundos antes de se desconectar formalmente
    const exitDelay = (Math.random() * 10 + 10) * 1000;
    await new Promise(r => setTimeout(r, exitDelay));
    
    console.log(`Bot ${this.config.botId} saiu da sala.`);
  }

  public stop() {
    this.active = false;
  }

  private getRandomPhrase(category: 'saudacao' | 'pergunta' | 'resposta' | 'despedida'): string {
    const databasePhrases = {
      saudacao: {
        extrovertido: ["Oiiii pessoal! Tudo bem? 😊", "Alguém animado hoje?", "Cheguei agora, o que tá rolando?"],
        timido: ["Oi... tudo bem?", "Olá", "Oi pessoal... cheguei quietinho"],
        engracado: ["E aí, qual o melhor jogo de todos?", "Alguém viu o que aconteceu hoje? 🤣", "Chegou quem faltava!"],
        ajudante: ["Olá pessoal! 😊", "Alguém precisando de alguma ajuda por aqui?", "Boa tarde! Que tenhamos uma ótima conversa."],
        curioso: ["E aí, como vocês estão?", "Olá! Quem mais está aqui online?", "Oi! O que vocês estão conversando?"]
      },
      pergunta: {
        extrovertido: ["Alguém gosta de música? Qual estilo?", "Qual o melhor jogo na opinião de vocês?"],
        timido: ["Alguém sabe sobre as novidades do site?", "Qual o assunto do momento por aqui?"],
        engracado: ["Se pudesse comer só uma coisa pro resto da vida, o que seria? 🤔", "Por que o despertador toca e a gente desliga achando que vai dormir só 5 minutos? 🤣"],
        ajudante: ["Sabiam que dá para ganhar insígnias nas missões diárias?", "Alguém precisa de dicas de como acumular créditos?"],
        curioso: ["O que vocês estão fazendo de bom?", "Qual foi a última coisa legal que aconteceu com vocês?", "Como funciona essa loja de badges?"]
      },
      resposta: {
        extrovertido: ["Nossa, que incrível! 😍", "Concordo totalmente!", "Conta mais sobre isso!"],
        timido: ["Hmm, nunca pensei por esse lado", "Verdade... faz sentido"],
        engracado: ["Kkkkkk genial!", "Misericórdia, rindo alto aqui 🤣", "Sei nem o que dizer depois dessa"],
        ajudante: ["Que interessante! Obrigado por compartilhar", "Que legal! Sabia disso não", "Com certeza, ótima dica!"],
        curioso: ["Interessante, mas como isso acontece?", "Sério mesmo? 🤔", "Fiquei curioso agora!"]
      },
      despedida: {
        extrovertido: ["Vou dar uma volta, volto depois! 😊", "Até mais, depois volto!"],
        timido: ["Preciso ir, tchau pessoal!", "Vou ali e já volto..."],
        engracado: ["Fui! Meu planeta precisa de mim 🚀", "Vou ali comer, saco vazio não para em pé!"],
        ajudante: ["Tenho que ir agora. Tenham um excelente dia!", "Foi ótimo conversar com vocês! 👋"],
        curioso: ["Vou dar uma saída agora, nos falamos depois! 👋", "Até mais tarde, pessoal!"]
      }
    };

    const phrases = databasePhrases[category][this.config.personality];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}
```

---

## 4. Orquestração e Gerenciamento Dinâmico de Salas

Para garantir a simulação humana realista, o orquestrador analisa periodicamente a densidade das salas e injeta/remove bots conforme as seguintes regras condicionais:

| Cenário de Sala | Condição | Ação do Sistema | Frequência de Verificação |
| :--- | :--- | :--- | :--- |
| **Sala Vazia** | Vazia por $> 5$ minutos | Enviar exatamente **1 Bot Social** por 15-30 minutos. Se nenhum usuário real entrar, o Bot sai e a sala entra em cooldown de 30 minutos. | A cada 2 minutos |
| **Primeira Entrada** | Usuário real entra em sala vazia (sem bot) | Enviar **1 Bot Social** em até 30 segundos para cumprimentá-lo. | Event-driven (Gatilho de Entrada) |
| **Usuário Solitário** | Apenas 1 usuário real há $> 3$ minutos | Enviar **1 Bot Amigável** para iniciar conversa e mantê-lo ativo. | A cada 1 minuto |
| **Sala Equilibrada** | De 2 a 3 usuários reais na sala | Manter **1 Bot** ativo em modo passivo (responde somente se marcado `@` ou se o assunto for genérico). | A cada 5 minutos |
| **Sala Lotada** | Mais de 5 usuários reais na sala | **Remover bots gradualmente** para dar espaço a discussões reais. Manter no máximo 1 bot como moderador passivo. | A cada 5 minutos |
| **Pico de Acesso** | Das 19:00 às 23:00 | **Reduzir a quantidade total de bots** em 50% na plataforma. | Verificação de Horário |
| **Baixa Demanda** | Das 02:00 às 06:00 | **Aumentar número de bots ativos** para manter a sensação de comunidade 24/7. | Verificação de Horário |

---

## 5. Sistema de Presentes Virtuais (Gifts) e Economia

A interação dos Bots com presentes gera valor psicológico instantâneo. O comportamento é rigidamente governado para evitar abuso inflacionário da economia do site:

```
        Gatilho de Envio (Novo Usuário / Recompensa)
                            │
                            ▼
               Verifica Orçamento do Bot
              (Filtra Presentes <= 5 Npr)
                            │
                            ▼
          O Bot é o Remetente? Sim (Cortesia)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      Usuário Recebe             Nenhum saldo real
      o Presente na Tela         é debitado do sistema
```

### Regras Econômicas dos Bots:
1. **Presentes Cortesia do Sistema:** Presentes enviados por bots não têm custo real de criação para o servidor. São identificados com uma flag `is_system_courtesy: true` na tabela de transações.
2. **Restrição de Valor:** Bots apenas presenteiam itens de baixo valor (limite fixado em **5 Npr** ou moedas equivalentes).
3. **Imunidade de Destinatários:** Bots **nunca** enviam presentes para outros bots.
4. **Recebimento Passivo:** Bots podem receber presentes de usuários reais. Os créditos fictícios recebidos são registrados no perfil do bot para criar autoridade social no ranking.

---

## 6. Automação e Integração de Feeds

Para maximizar a imersão, o engajamento dos bots se estende à seção do Feed Social.

```
Postagem de Usuário Real
          │
          ▼
Gatilho: `on_post_created` (Webhook / Supabase trigger)
          │
          ▼
Atraso Randômico (2 a 15 minutos)
          │
          ▼
Bot Seleciona Ação:
├── Curtir Post (70% de chance)
├── Seguir Autor (30% de chance)
└── Comentar Algo Relevante (50% de chance)
```

### Exemplos de Reações de Comentário por Personalidade:
* **Extrovertido:** *"Nossa, que incrível! 😍"* / *"Uau, amei esse post!"*
* **Ajudante:** *"Isso é muito útil, obrigado por postar!"* / *"Excelente explicação, parabéns!"*
* **Engraçado:** *"Kkkkkkk muito bom! Rindo horrores"* / *"Achei meu humor de hoje nesse post"*.

---

## 7. Escala, Limitações e Prevenção de Bloqueios

Para manter a operação indetectável pelas redes de análise, o sistema obedece a restrições estritas de volume:

* **Densidade Limite:** Máximo de **3 Bots** concorrentes na mesma sala de chat.
* **Proporção Geral:** 1 Bot ativo para cada 5 salas registradas no sistema.
* **Limites Individuais por Bot:**
  - Máximo de **10 salas** visitadas por dia.
  - Máximo de **50 mensagens** enviadas no período de 24 horas.
  - Máximo de **5 presentes** distribuídos diariamente.
  - Período obrigatório de descanso (Cooldown) de **30 a 60 minutos** após sair de uma sala.

---

## 8. Monitoramento, Métricas de Engajamento e Alertas

Um painel administrativo robusto permite aos gestores acompanhar a eficiência do sistema através das seguintes métricas essenciais:

### KPI's de Sucesso:
* **Taxa de Salas Desocupadas:** Redução projetada de no mínimo **70%** em canais vazios.
* **Retenção de Novos Usuários:** Aumento esperado de **50%** na retenção em D1/D7 devido às saudações e presentes imediatos de boas-vindas.
* **Tempo de Permanência Médio:** Meta de acréscimo de **30%** no tempo que usuários reais passam online.

### Sistema de Alertas Automáticos (Anomaly Detection):
```json
{
  "alerts": [
    {
      "tipo": "DENSIDADE_EXCESSIVA",
      "mensagem": "Alerta: Sala 'Geral' possui 4 bots simultâneos (Limite: 3).",
      "acao_automatizada": "Mover bot_id: 09ab82-xx para fila de descanso."
    },
    {
      "tipo": "COMPORTAMENTO_REPETITIVO",
      "mensagem": "Bot 'Mari_Social' enviou a mesma saudação 3 vezes seguidas.",
      "acao_automatizada": "Rotacionar dicionário de frases do bot."
    },
    {
      "tipo": "INATIVIDADE_PROLONGADA",
      "mensagem": "Orquestrador detectou que 5 bots sociais estão inativos há mais de 2 horas.",
      "acao_automatizada": "Reiniciar processo de polling do orquestrador de bots."
    }
  ]
}
```
