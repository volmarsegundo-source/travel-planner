import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Você é o Agente Estratégico do Atlas — o consultor permanente de produto, mercado e negócio do Travel Planner Atlas.

CONTEXTO DO PRODUTO:
O Atlas é uma plataforma de jornada de viagem gamificada. O usuário é um "Explorador" que cria "Expedições" (viagens) passando por 8 fases:
1. O Chamado (cadastro + destino) — FREE
2. O Explorador (perfil do viajante) — FREE  
3. A Rota (transportes) — FREE (IA = Coordenadas)
4. O Abrigo (hospedagem) — FREE (IA = Coordenadas)
5. O Mapa dos Dias (itinerário IA) — FREE (IA = Coordenadas)
6. O Tesouro (gestão de custos) — PREMIUM
7. A Expedição (acompanhamento em tempo real) — PREMIUM
8. O Legado (memórias e review) — PREMIUM

VOCABULÁRIO: Usuário=Explorador, Viagem=Expedição, Dashboard=Meu Atlas, Pontos=Coordenadas, Badges=Selos de Passaporte.

MODELO DE NEGÓCIO:
- Free Traveler: 2 Expedições, Fases 1-5, 500 Coordenadas iniciais, IA custa Coordenadas, pode comprar mais
- Premium Explorer: ilimitado, todas as fases, 2000 Coordenadas/mês, Claude Sonnet
- Moeda virtual: Coordenadas (ganhas por progresso, gastas em IA, compradas)

STACK TÉCNICO: Next.js 15, PostgreSQL/Prisma, Redis, Anthropic API, @dnd-kit, Docker, i18n

SPRINT ATUAL: Sprint 9 — Strategic Pivot. Sem UI nova, apenas fundação técnica:
- Nova branch feat/atlas
- Schema Prisma: UserProgress, ExpeditionPhase, PointTransaction, UserBadge
- Phase Engine + Points Engine com testes ≥90%

CONCORRENTES MAPEADOS:
- Wanderlog: melhor free, sem gamificação
- MindTrip: melhor IA, Fast Company 2025, sem ciclo completo
- TripIt: corporativo, auto-organiza por email, sem IA
- Trip Planner AI (Layla): paywall agressivo, sem gamificação
- Nenhum concorrente tem gamificação nativa end-to-end

HORIZONTE: 3 meses para beta público. 4 sprints restantes (10-14).

SUAS FUNÇÕES:
1. VIGILÂNCIA DE MERCADO: análise de concorrentes, tendências, ameaças emergentes
2. REVISÃO DE PRODUTO: avaliar estado do Atlas, métricas, ajustes de fase/pontos/negócio
3. ESTRATÉGIA DE CRESCIMENTO: aquisição, retenção, parcerias, próximos mercados

PRINCÍPIOS:
- Seja direto. Sem rodeios.
- Use dados e benchmarks quando relevante.
- Priorize o que impacta o MVP em 3 meses.
- Alerte proativamente sobre riscos.
- Sugira ajustes de rota quando necessário.
- Fale português. Tom profissional mas acessível.
- Quando analisar, sempre conclua com recomendação acionável.

Você conhece profundamente o produto, o mercado e o time. Trate Volmar como um founder parceiro, não como um cliente.`;

const QUICK_ACTIONS = [
  { label: "📊 Status do mercado", msg: "Faça um status rápido do mercado de AI travel planning agora. Algum concorrente se moveu recentemente que devo saber?" },
  { label: "🎯 Avaliar Sprint 9", msg: "Avalie a estratégia do Sprint 9. Estamos priorizando certo? Algum risco que não estou vendo?" },
  { label: "💰 Modelo de pontos", msg: "Analise a economia de Coordenadas que definimos. Está bem calibrada? Algum ajuste para evitar que usuários fiquem sem pontos rápido ou acumulem demais?" },
  { label: "🚀 Estratégia de lançamento", msg: "Com 3 meses para o beta público, como devo pensar a estratégia de lançamento? Primeiros 100 usuários — como conseguir?" },
  { label: "⚠️ Maiores riscos", msg: "Quais são os 3 maiores riscos que podem matar o Atlas antes do lançamento? Seja brutal." },
  { label: "🗺️ Próximo sprint", msg: "Considerando que o Sprint 9 é a fundação técnica, o que o Sprint 10 deve priorizar para maximizar validação com usuários reais?" },
];

function Message({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
        isUser ? "bg-teal-600 text-white" : "bg-navy-900 text-white"
      }`} style={{ backgroundColor: isUser ? "#0E7C7B" : "#1A2E4A" }}>
        {isUser ? "V" : "A"}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-teal-600 text-white rounded-tr-sm"
          : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
      }`}>
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ backgroundColor: "#1A2E4A" }}>
        A
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AtlasStrategicAgent() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Olá, Volmar. Agente Estratégico do Atlas online. 🗺️\n\nEstou atualizado sobre o Sprint 9 (Strategic Pivot), os 8 concorrentes mapeados e o horizonte de 3 meses.\n\nO que precisa analisar hoje? Pode usar as ações rápidas abaixo ou me fazer qualquer pergunta sobre mercado, produto ou estratégia."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("chat");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Erro ao processar resposta.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro de conexão. Tente novamente." }]);
    }
    setLoading(false);
  }

  const competitors = [
    { name: "Wanderlog", threat: "Média", status: "Estável", note: "Sem gamificação. Líder em free tier." },
    { name: "MindTrip", threat: "Alta", status: "Crescendo", note: "350K visitas/mês. Pode adicionar gamificação." },
    { name: "TripIt", threat: "Baixa", status: "Estável", note: "Foco corporativo. Público diferente." },
    { name: "Layla AI", threat: "Média", status: "Agressivo", note: "Paywall agressivo €24,99/mês. Frustração." },
    { name: "Wonderplan", threat: "Baixa", status: "Lento", note: "Sem mobile, sem bookings." },
  ];

  const metrics = [
    { label: "Sprints restantes", value: "5", sub: "para beta público" },
    { label: "Testes unitários", value: "390+", sub: "base de regressão" },
    { label: "Retenção mercado D30", value: "2,8%", sub: "benchmark travel apps" },
    { label: "Adoção IA travel", value: "80%", sub: "viajantes em 2025" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F0F4F8", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div className="text-white px-4 py-3 flex items-center gap-3 shadow-md" style={{ backgroundColor: "#1A2E4A" }}>
        <div className="text-2xl">🗺️</div>
        <div>
          <div className="font-bold text-base tracking-wide">ATLAS — Agente Estratégico</div>
          <div className="text-xs opacity-70">Travel Planner · Sprint 9 · Março 2026</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs opacity-80">Online</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white shadow-sm">
        {[["chat", "💬 Consultor"], ["market", "📊 Mercado"], ["metrics", "🎯 Projeto"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              tab === id
                ? "border-b-2 text-teal-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
            style={{ borderBottomColor: tab === id ? "#0E7C7B" : "transparent" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {tab === "chat" && (
        <div className="flex flex-col flex-1 max-w-3xl w-full mx-auto p-3 gap-3">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => send(action.msg)}
                disabled={loading}
                className="text-left text-xs px-3 py-2 bg-white rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all shadow-sm disabled:opacity-40"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 bg-gray-50 rounded-2xl p-4 overflow-y-auto" style={{ minHeight: "320px", maxHeight: "420px" }}>
            {messages.map((m, i) => <Message key={i} {...m} />)}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Faça uma pergunta estratégica..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-teal-400 shadow-sm"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-40"
              style={{ backgroundColor: "#0E7C7B" }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Market Tab */}
      {tab === "market" && (
        <div className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="font-bold text-sm mb-3" style={{ color: "#1A2E4A" }}>🏆 Posição Competitiva — Atlas</div>
            <div className="text-xs text-gray-600 bg-teal-50 rounded-xl p-3 border border-teal-200">
              <strong>Categoria criada pelo Atlas:</strong> Gamified Travel Journey Platform<br/>
              Nenhum concorrente cobre: gamificação nativa + ciclo completo + IA + moeda virtual integrada.
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="font-bold text-sm mb-3" style={{ color: "#1A2E4A" }}>📡 Radar de Concorrentes</div>
            <div className="space-y-2">
              {competitors.map(c => (
                <div key={c.name} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                  <div className="w-24 text-xs font-bold text-gray-700">{c.name}</div>
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.threat === "Alta" ? "bg-red-100 text-red-700" :
                    c.threat === "Média" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                  }`}>
                    {c.threat}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    c.status === "Crescendo" ? "bg-orange-100 text-orange-700" :
                    c.status === "Agressivo" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                  }`}>
                    {c.status}
                  </div>
                  <div className="text-xs text-gray-500 flex-1">{c.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="font-bold text-sm mb-3" style={{ color: "#1A2E4A" }}>📈 Dados de Mercado</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              {[
                ["80%", "viajantes usam IA para planejar (2025)"],
                ["2,8%", "retenção D30 em travel apps (benchmark)"],
                ["+62%", "MAU em plataformas gamificadas"],
                ["USD 811M", "Duolingo 2025 (+39% YoY — modelo de ref.)"],
              ].map(([val, label]) => (
                <div key={val} className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                  <div className="font-bold text-base" style={{ color: "#0E7C7B" }}>{val}</div>
                  <div>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Tab */}
      {tab === "metrics" && (
        <div className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="font-bold text-2xl" style={{ color: "#0E7C7B" }}>{m.value}</div>
                <div className="text-xs font-medium text-gray-700 mt-1">{m.label}</div>
                <div className="text-xs text-gray-400">{m.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="font-bold text-sm mb-3" style={{ color: "#1A2E4A" }}>🗓️ Roadmap — 3 Meses</div>
            {[
              { sprint: "Sprint 9", title: "Strategic Pivot", status: "Em andamento", desc: "Schema + Phase Engine + Points Engine", color: "#0E7C7B" },
              { sprint: "Sprint 10", title: "Fases 1 + 2 Jogáveis", status: "Planejado", desc: "Dashboard Atlas + Cadastro gamificado", color: "#1A2E4A" },
              { sprint: "Sprint 11", title: "Fases 3, 4 e 5", status: "Planejado", desc: "Rota + Hospedagem + Itinerário IA", color: "#1A2E4A" },
              { sprint: "Sprint 12", title: "Monetização", status: "Planejado", desc: "Loja de Coordenadas + Stripe + Premium", color: "#1A2E4A" },
              { sprint: "Sprint 13", title: "Fases 6 + 7 Premium", status: "Planejado", desc: "Gestão de custos + Modo Expedição", color: "#1A2E4A" },
              { sprint: "Sprint 14", title: "Fase 8 + Beta Público", status: "Meta", desc: "Memórias + Atlas visual + Viral loop", color: "#D4A017" },
            ].map(s => (
              <div key={s.sprint} className="flex items-start gap-3 mb-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">{s.sprint}</span>
                    <span className="text-xs font-medium text-gray-800">{s.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === "Em andamento" ? "bg-teal-100 text-teal-700" :
                      s.status === "Meta" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                    }`}>{s.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="font-bold text-sm mb-2" style={{ color: "#1A2E4A" }}>⚡ Stack Técnico Atual</div>
            <div className="flex flex-wrap gap-2">
              {["Next.js 15", "PostgreSQL", "Prisma", "Redis", "Anthropic API", "@dnd-kit", "Docker", "i18n", "Jest 390+", "Playwright (pendente)"].map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
