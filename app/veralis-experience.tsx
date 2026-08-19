"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { buildPublicCfoCaseState } from "../src/demo/public-cfo-case";
import { buildUploadedCfoCaseState, parseUploadedCsv, parseUploadedPdfText, type UploadedSchoolDocument } from "../src/demo/uploaded-school-case";

type Theme = "dark" | "light";
type DemoStage = "ready" | "question" | "revised";
type WorkspaceView = "chat" | "overview" | "performance" | "plan" | "files" | "questions";

type CfoAnalysis = {
  mode: "OPENAI" | "DETERMINISTIC_DEMO" | "DETERMINISTIC_FALLBACK" | "SAFE_FALLBACK";
  fallbackReason?: string;
  response: {
    directAnswer: string;
    diagnosis: { secondaryDrivers: string[] };
    evidence: { items: Array<{ id: string; statement: string }> };
    recommendation: { immediate: { action: string } | null };
    nextQuestion: string | null;
    confidence: number;
  };
};

type FollowUpTurn = {
  id: number;
  question: string;
  analysis?: CfoAnalysis;
  error?: string;
};

const quickPrompts = [
  "Por que minha margem caiu?",
  "Meu reajuste funcionou?",
  "Posso contratar?",
  "O que faço amanhã?",
];

const evidenceItems = [
  { label: "Alunos", before: "86", after: "98", delta: "+14,0%", tone: "cyan" },
  { label: "Receita líquida", before: "R$ 236 mil", after: "R$ 250 mil", delta: "+5,8%", tone: "purple" },
  { label: "Margem operacional", before: "14,4%", after: "5,7%", delta: "−8,7 p.p.", tone: "red" },
];

const bridgeItems = [
  { label: "Volume", amount: "+ R$ 28,6 mil", value: 62, positive: true },
  { label: "Preço", amount: "+ R$ 8,9 mil", value: 25, positive: true },
  { label: "Descontos", amount: "− R$ 23,5 mil", value: 51, positive: false },
  { label: "Pessoal", amount: "− R$ 24,8 mil", value: 55, positive: false },
  { label: "Custos fixos", amount: "− R$ 4,6 mil", value: 18, positive: false },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark${compact ? " brand-mark--compact" : ""}`}>
      <span className="brand-spark" aria-hidden="true" />
      <span className="brand-word">Veralis</span>
    </span>
  );
}

function ThemeButton({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const nextTheme = theme === "dark" ? "claro" : "escuro";
  return (
    <button className="icon-button" type="button" onClick={onToggle} aria-label={`Usar tema ${nextTheme}`} title={`Usar tema ${nextTheme}`}>
      <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
    </button>
  );
}

function HomeScreen({ onStart, onNewSchool, theme, onTheme }: { onStart: () => void; onNewSchool: (files: File[]) => void; theme: Theme; onTheme: () => void }) {
  const schoolInputRef = useRef<HTMLInputElement>(null);
  const selectSchoolFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) onNewSchool(files);
  };
  return (
    <main className="home-shell">
      <div className="ambient-aurora" aria-hidden="true" />
      <header className="home-header">
        <BrandMark compact />
        <nav className="home-actions" aria-label="Ações principais">
          <ThemeButton theme={theme} onToggle={onTheme} />
          <a className="text-button" href="/private">Entrar</a>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Verdade antes de resposta</p>
          <h1 id="hero-title"><span>Seu CFO</span><br />dia e noite.</h1>
          <p className="hero-lede">
            Entenda o que está acontecendo com os números da sua escola.
            <strong>E o que fazer a seguir.</strong>
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={onStart}>
              Explorar demonstração <span aria-hidden="true">↗</span>
            </button>
            <p>Pergunta antes de presumir. Calcula antes de responder.</p>
          </div>
          <input ref={schoolInputRef} className="visually-hidden" type="file" accept=".csv,.pdf" multiple onChange={selectSchoolFiles} />
          <button className="new-school-entry" type="button" onClick={() => schoolInputRef.current?.click()}>
            <span aria-hidden="true">＋</span>
            <span><small>NOVA ESCOLA</small><strong>Subir arquivos para avaliar</strong><em>Selecione CSV ou PDF · até 12 arquivos</em></span>
            <b aria-hidden="true">↗</b>
          </button>
        </div>

        <div className="conversation-preview" aria-label="Prévia de uma análise da Veralis">
          <div className="preview-topline"><span>Escola Horizonte</span><span className="live-dot">Demo ativa</span></div>
          <div className="preview-question">Por que minha margem caiu mesmo com mais alunos?</div>
          <div className="preview-answer">
            <span className="assistant-avatar" aria-hidden="true">V</span>
            <div>
              <p className="preview-kicker">Sinal encontrado</p>
              <p>A receita cresceu, mas não acompanhou o aumento da estrutura.</p>
              <div className="preview-metric"><span>Margem operacional</span><strong>−8,7 p.p.</strong></div>
              <div className="preview-trace"><i /><i /><i /><i /></div>
              <p className="preview-source">3 cálculos · 5 evidências verificadas</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <span>Decisões financeiras explicáveis para Educação Infantil</span>
        <span>São Paulo · Brasil</span>
      </footer>
    </main>
  );
}

function AnalysisOrigin({ analysis }: { analysis: CfoAnalysis }) {
  const openAI = analysis.mode === "OPENAI";
  return <div className={`analysis-origin${openAI ? " is-openai" : " is-fallback"}`}><i />{openAI ? "OpenAI · resposta verificada" : "Motor verificável · fallback seguro"}</div>;
}

function InitialDiagnosis({ analysis }: { analysis: CfoAnalysis }) {
  return (
    <article className="assistant-message" aria-label="Diagnóstico inicial da Veralis">
      <div className="message-heading">
        <span className="assistant-avatar" aria-hidden="true">V</span>
        <div><strong>Veralis</strong><span>agora</span></div>
      </div>
      <div className="message-content">
        <AnalysisOrigin analysis={analysis} />
        <p className="answer-lede">{analysis.response.directAnswer}</p>
        <p className="answer-copy">{analysis.response.diagnosis.secondaryDrivers.slice(0, 2).join(" ") || "A resposta usa somente dados sintéticos reconciliados da Escola Horizonte."}</p>
        <div className="metric-grid">
          {evidenceItems.map((item) => (
            <div className="metric-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.after}</strong>
              <small className={`tone-${item.tone}`}>{item.delta}</small>
              <em>antes {item.before}</em>
            </div>
          ))}
        </div>
        <div className="unknown-card">
          <span className="unknown-icon" aria-hidden="true">!</span>
          <div><strong>Falta um contexto operacional</strong><p>Os arquivos mostram o aumento de pessoal e turmas, mas não explicam a decisão.</p></div>
        </div>
        {analysis.response.nextQuestion ? <div className="next-question">
          <span>Uma pergunta para fechar o diagnóstico</span>
          <p>{analysis.response.nextQuestion}</p>
        </div> : null}
      </div>
    </article>
  );
}

function DetailPanel({ panel }: { panel: "calculation" | "evidence" | "simulation" }) {
  if (panel === "calculation") {
    return (
      <section className="detail-panel" aria-label="Detalhes do cálculo">
        <div className="detail-title"><span>ƒ</span><div><strong>Queda da margem operacional</strong><small>Fórmula verificada · versão 1.0</small></div></div>
        <div className="formula"><span>(R$ 14.250 ÷ R$ 250.000)</span><b>−</b><span>(R$ 34.000 ÷ R$ 236.300)</span><b>= −8,7 p.p.</b></div>
        <p>Valores calculados em precisão integral e arredondados apenas para exibição.</p>
      </section>
    );
  }

  if (panel === "evidence") {
    return (
      <section className="detail-panel" aria-label="Evidências usadas">
        <div className="detail-title"><span>≡</span><div><strong>Evidências deste diagnóstico</strong><small>5 referências materiais</small></div></div>
        <div className="source-list">
          <div><span>DRE mensal · Resultado operacional</span><b>jan–jun/2026</b></div>
          <div><span>equipe.csv · Custo de pessoal</span><b>jun/2026</b></div>
          <div><span>turmas.csv · Ocupação por turma</span><b>jun/2026</b></div>
          <div><span>Contexto informado nesta conversa</span><b>turno da tarde</b></div>
        </div>
      </section>
    );
  }

  return (
    <section className="detail-panel simulation-panel" aria-label="Simulação de cinco novos alunos">
      <div className="detail-title"><span>+</span><div><strong>Cenário: 5 alunos na turma nova</strong><small>Não altera os dados originais</small></div></div>
      <div className="simulation-result"><span>Margem operacional estimada</span><strong>8,9%</strong><em>+3,2 p.p.</em></div>
      <p>Cenário assume ticket líquido atual e nenhum aumento adicional de quadro.</p>
    </section>
  );
}

function RevisedDiagnosis({ analysis }: { analysis: CfoAnalysis }) {
  const [openPanel, setOpenPanel] = useState<"calculation" | "evidence" | "simulation" | null>(null);
  const togglePanel = (panel: "calculation" | "evidence" | "simulation") => {
    setOpenPanel((current) => current === panel ? null : panel);
  };

  return (
    <article className="assistant-message assistant-message--insight" aria-label="Diagnóstico revisado da Veralis">
      <div className="insight-glow" aria-hidden="true" />
      <div className="message-heading">
        <span className="assistant-avatar" aria-hidden="true">V</span>
        <div><strong>Veralis</strong><span>diagnóstico atualizado</span></div>
      </div>
      <div className="message-content">
        <AnalysisOrigin analysis={analysis} />
        <div className="update-label"><i /> Novo contexto aplicado ao diagnóstico</div>
        <p className="answer-lede">{analysis.response.directAnswer}</p>
        <p className="answer-copy">{analysis.response.diagnosis.secondaryDrivers.slice(0, 2).join(" ") || "O diagnóstico continua limitado aos números reconciliados desta demonstração."}</p>

        <section className="evidence-highlight" aria-label="Evidência principal">
          <div className="evidence-label"><span>FOLHA / RECEITA</span><small>evidência principal</small></div>
          <div className="evidence-values"><div><span>Anterior</span><b>54,2%</b></div><div><span>Atual</span><b>61,8%</b></div><strong>+7,6 p.p.</strong></div>
          <div className="evidence-source"><span>DRE mensal</span><span>Despesas com pessoal · jan–jun/2026</span></div>
        </section>

        <section className="bridge" aria-labelledby="bridge-title">
          <div className="section-title"><div><span>ANÁLISE MECE</span><h3 id="bridge-title">Onde a margem foi parar</h3></div><small>Bridge reconciliada ✓</small></div>
          <div className="bridge-list">
            {bridgeItems.map((item) => (
              <div className="bridge-row" key={item.label}>
                <span>{item.label}</span>
                <div className="bridge-track"><i className={item.positive ? "positive" : "negative"} style={{ width: `${item.value}%` }} /></div>
                <b className={item.positive ? "positive-text" : "negative-text"}>{item.amount}</b>
              </div>
            ))}
          </div>
          <div className="bridge-total"><span>Variação do resultado</span><strong>− R$ 15,4 mil</strong><em>diferença de R$ 0,00</em></div>
        </section>

        <section className="expert-views" aria-labelledby="views-title">
          <div className="section-title"><div><span>TRÊS PERSPECTIVAS</span><h3 id="views-title">Leitura conjunta</h3></div></div>
          <div className="view-grid">
            <div><span>CFO</span><p>A nova estrutura ainda não se paga.</p></div>
            <div><span>OPERAÇÕES</span><p>A sala tem capacidade ociosa.</p></div>
            <div><span>ACADÊMICO</span><p>Não reduza o quadro sem validar o impacto pedagógico.</p></div>
          </div>
        </section>

        <section className="recommendation">
          <div className="recommendation-label"><span>01</span><small>PRÓXIMA MELHOR AÇÃO</small></div>
          <p>Não corte a equipe ainda.</p>
          <div>Primeiro revise descontos e ataque a ocupação da nova turma. É a ação mais reversível e com melhor relação entre impacto e risco.</div>
          <ul aria-label="Critérios da recomendação"><li>alto impacto</li><li>alta reversibilidade</li><li>confiança 88%</li></ul>
        </section>

        <div className="inline-actions" aria-label="Explorar diagnóstico">
          <button type="button" aria-expanded={openPanel === "calculation"} onClick={() => togglePanel("calculation")}>Ver cálculo</button>
          <button type="button" aria-expanded={openPanel === "simulation"} onClick={() => togglePanel("simulation")}>Simular +5 alunos</button>
          <button type="button" aria-expanded={openPanel === "evidence"} onClick={() => togglePanel("evidence")}>Ver evidências</button>
        </div>
        {openPanel ? <DetailPanel panel={openPanel} /> : null}
      </div>
    </article>
  );
}

function FollowUpExchange({ turn }: { turn: FollowUpTurn }) {
  return (
    <>
      <article className="user-message"><span>Você</span><p>{turn.question}</p></article>
      {turn.analysis ? <article className="assistant-message assistant-message--follow-up" aria-label="Resposta de acompanhamento da Veralis">
        <div className="message-heading">
          <span className="assistant-avatar" aria-hidden="true">V</span>
          <div><strong>Veralis</strong><span>agora</span></div>
        </div>
        <div className="message-content">
          <AnalysisOrigin analysis={turn.analysis} />
          <p className="answer-lede">{turn.analysis.response.directAnswer}</p>
          {turn.analysis.response.diagnosis.secondaryDrivers.length > 0 ? <p className="answer-copy">{turn.analysis.response.diagnosis.secondaryDrivers.slice(0, 3).join(" ")}</p> : null}
          {turn.analysis.response.recommendation.immediate?.action ? <div className="follow-up-action"><span>Próxima ação</span><p>{turn.analysis.response.recommendation.immediate.action}</p></div> : null}
          {turn.analysis.response.nextQuestion ? <div className="next-question"><span>Para aprofundar</span><p>{turn.analysis.response.nextQuestion}</p></div> : null}
        </div>
      </article> : null}
      {turn.error ? <article className="assistant-message" aria-label="Falha ao responder">
        <div className="message-heading"><span className="assistant-avatar" aria-hidden="true">V</span><div><strong>Veralis</strong><span>não enviado</span></div></div>
        <div className="message-content"><p className="answer-copy">{turn.error}</p></div>
      </article> : null}
    </>
  );
}

function UploadedDiagnosis({ analysis }: { analysis: CfoAnalysis }) {
  return (
    <article className="assistant-message assistant-message--follow-up" aria-label="Análise dos arquivos enviados">
      <div className="message-heading"><span className="assistant-avatar" aria-hidden="true">V</span><div><strong>Veralis</strong><span>arquivos da sua escola</span></div></div>
      <div className="message-content">
        <AnalysisOrigin analysis={analysis} />
        <p className="answer-lede">{analysis.response.directAnswer}</p>
        {analysis.response.diagnosis.secondaryDrivers.length > 0 ? <p className="answer-copy">{analysis.response.diagnosis.secondaryDrivers.slice(0, 3).join(" ")}</p> : null}
        {analysis.response.recommendation.immediate?.action ? <div className="follow-up-action"><span>Próxima ação</span><p>{analysis.response.recommendation.immediate.action}</p></div> : null}
        {analysis.response.nextQuestion ? <div className="next-question"><span>Informação necessária</span><p>{analysis.response.nextQuestion}</p></div> : null}
      </div>
    </article>
  );
}

const navigationItems: Array<{ view: WorkspaceView; label: string; icon: string }> = [
  { view: "overview", label: "Visão geral", icon: "⌂" },
  { view: "chat", label: "Conversa", icon: "◫" },
  { view: "performance", label: "Performance", icon: "↗" },
  { view: "plan", label: "Plano de ação", icon: "✓" },
  { view: "files", label: "Arquivos", icon: "+" },
  { view: "questions", label: "Perguntas", icon: "?" },
];

const viewTitles: Record<WorkspaceView, string> = {
  overview: "O que precisa da sua atenção",
  chat: "Por que minha margem caiu?",
  performance: "Performance e benchmark",
  plan: "Plano de ação priorizado",
  files: "Arquivos da análise",
  questions: "Banco de perguntas",
};

const benchmarkByRegion = {
  "São Paulo — Capital": [
    { label: "Receita líquida / aluno", school: "R$ 2.551", median: "R$ 2.620", index: 97, percentile: "P42", direction: "maior é melhor" },
    { label: "Desconto médio", school: "16,0%", median: "11,8%", index: 74, percentile: "P28", direction: "menor é melhor · índice invertido" },
    { label: "Folha / receita", school: "61,8%", median: "54,9%", index: 89, percentile: "P31", direction: "menor é melhor · índice invertido" },
    { label: "Margem operacional", school: "5,7%", median: "11,2%", index: 51, percentile: "P24", direction: "maior é melhor" },
    { label: "Ocupação", school: "81,7%", median: "84,0%", index: 97, percentile: "P44", direction: "maior é melhor" },
  ],
  "Zona Oeste": [
    { label: "Receita líquida / aluno", school: "R$ 2.551", median: "R$ 2.740", index: 93, percentile: "P36", direction: "maior é melhor" },
    { label: "Desconto médio", school: "16,0%", median: "12,5%", index: 78, percentile: "P33", direction: "menor é melhor · índice invertido" },
    { label: "Folha / receita", school: "61,8%", median: "56,1%", index: 91, percentile: "P35", direction: "menor é melhor · índice invertido" },
    { label: "Margem operacional", school: "5,7%", median: "10,4%", index: 55, percentile: "P27", direction: "maior é melhor" },
    { label: "Ocupação", school: "81,7%", median: "86,5%", index: 94, percentile: "P39", direction: "maior é melhor" },
  ],
  "Zona Sul": [
    { label: "Receita líquida / aluno", school: "R$ 2.551", median: "R$ 2.680", index: 95, percentile: "P39", direction: "maior é melhor" },
    { label: "Desconto médio", school: "16,0%", median: "10,9%", index: 68, percentile: "P21", direction: "menor é melhor · índice invertido" },
    { label: "Folha / receita", school: "61,8%", median: "55,4%", index: 90, percentile: "P32", direction: "menor é melhor · índice invertido" },
    { label: "Margem operacional", school: "5,7%", median: "12,0%", index: 48, percentile: "P19", direction: "maior é melhor" },
    { label: "Ocupação", school: "81,7%", median: "83,2%", index: 98, percentile: "P46", direction: "maior é melhor" },
  ],
};

function DemoSidebar({
  open,
  activeView,
  onClose,
  onReset,
  onNavigate,
}: {
  open: boolean;
  activeView: WorkspaceView;
  onClose: () => void;
  onReset: () => void;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const navigate = (view: WorkspaceView) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      <button className={`sidebar-backdrop${open ? " is-open" : ""}`} type="button" aria-label="Fechar navegação" onClick={onClose} />
      <aside className={`demo-sidebar demo-sidebar--launch${open ? " is-open" : ""}`} aria-label="Navegação da Veralis">
        <div className="sidebar-brand-row">
          <BrandMark compact />
          <button className="sidebar-close" type="button" onClick={onClose} aria-label="Fechar barra lateral">×</button>
        </div>

        <button className="new-chat-button" type="button" onClick={() => { onReset(); navigate("chat"); }}>
          <span aria-hidden="true">＋</span> Nova conversa
        </button>

        <nav className="workspace-nav" aria-label="Áreas da Veralis">
          <p>ACOMPANHAR</p>
          {navigationItems.slice(0, 4).map((item) => (
            <button className={activeView === item.view ? "is-active" : ""} type="button" key={item.view} onClick={() => navigate(item.view)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
              {item.view === "overview" ? <small>3</small> : null}
            </button>
          ))}
          <p>ORGANIZAR</p>
          {navigationItems.slice(4).map((item) => (
            <button className={activeView === item.view ? "is-active" : ""} type="button" key={item.view} onClick={() => navigate(item.view)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <section className="recent-thread" aria-label="Conversa recente">
          <div><span>CONVERSA RECENTE</span><small>local</small></div>
          <button type="button" onClick={() => navigate("chat")}><strong>Por que minha margem caiu?</strong><small>Agora · Escola Horizonte</small></button>
        </section>

        <div className="sidebar-footnote">
          <span><i className="status-dot" /> Demo sintética</span>
          <p>Conversas e arquivos ficam apenas nesta sessão. Nada é salvo em servidor.</p>
        </div>
      </aside>
    </>
  );
}

function OverviewPanel({ completed, onToggle, onNavigate }: { completed: string[]; onToggle: (id: string) => void; onNavigate: (view: WorkspaceView) => void }) {
  const tasks = [
    { id: "discounts", urgency: "Hoje", title: "Revisar descontos acima de 15%", detail: "Impacto estimado: R$ 9,8 mil/mês", tone: "danger" },
    { id: "class", urgency: "Esta semana", title: "Plano de ocupação da turma nova", detail: "10 vagas para atingir 75% de ocupação", tone: "warning" },
    { id: "receivables", urgency: "Esta semana", title: "Confirmar saldo realmente em aberto", detail: "Separar atraso, acordo e baixa efetiva", tone: "neutral" },
  ];
  return (
    <section className="workspace-panel overview-panel" aria-labelledby="overview-title">
      <div className="panel-intro"><div><span>PRIORIDADES</span><h2 id="overview-title">Bom dia. Há três decisões esperando você.</h2><p>Comece pelo que protege caixa e margem sem comprometer a operação pedagógica.</p></div><button type="button" onClick={() => onNavigate("plan")}>Abrir plano completo →</button></div>
      <div className="attention-grid">
        <article><span>Margem operacional</span><strong>5,7%</strong><small className="tone-red">−8,7 p.p. em 12 meses</small></article>
        <article><span>Ocupação da turma nova</span><strong>50%</strong><small>10 de 20 vagas</small></article>
        <article><span>Folha / receita</span><strong>61,8%</strong><small className="tone-red">+7,6 p.p.</small></article>
      </div>
      <div className="pending-list">
        <div className="panel-section-heading"><div><span>O QUE FAZER</span><h3>Pendências priorizadas</h3></div><small>{completed.length}/3 concluídas</small></div>
        {tasks.map((task, index) => {
          const done = completed.includes(task.id);
          return <button className={`pending-item${done ? " is-done" : ""}`} type="button" key={task.id} onClick={() => onToggle(task.id)} aria-pressed={done}><i className={`priority-dot ${task.tone}`} /><span><small>{task.urgency}</small><strong>{index + 1}. {task.title}</strong><em>{task.detail}</em></span><b>{done ? "✓" : "Marcar feita"}</b></button>;
        })}
      </div>
      <button className="resume-chat-card" type="button" onClick={() => onNavigate("chat")}><span>CONTINUAR CONVERSA</span><strong>Entenda por que a margem caiu</strong><small>A Veralis encontrou três movimentos confiáveis →</small></button>
    </section>
  );
}

function PerformancePanel() {
  const [region, setRegion] = useState<keyof typeof benchmarkByRegion>("São Paulo — Capital");
  return (
    <section className="workspace-panel performance-panel" aria-labelledby="performance-title">
      <div className="panel-intro"><div><span>COMPARAÇÃO ANÔNIMA</span><h2 id="performance-title">Como a escola se compara?</h2><p>Uma referência experimental para contextualizar indicadores — nunca para identificar outras escolas.</p></div><label>Região<select value={region} onChange={(event) => setRegion(event.target.value as keyof typeof benchmarkByRegion)}>{Object.keys(benchmarkByRegion).map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="benchmark-warning"><strong>Benchmark experimental baseado em escolas sintéticas comparáveis.</strong> Não representa dados reais do mercado.</div>
      <div className="benchmark-criteria"><span>Comparáveis</span><b>Educação Infantil</b><b>80–140 alunos</b><b>5–8 turmas</b><b>mensalidade similar</b></div>
      <div className="benchmark-table" role="table" aria-label={`Benchmark sintético de ${region}`}>
        <div className="benchmark-row benchmark-head" role="row"><span>Métrica</span><span>Escola</span><span>Mediana</span><span>Índice</span><span>Percentil</span></div>
        {benchmarkByRegion[region].map((metric) => <div className="benchmark-row" role="row" key={metric.label}><span><strong>{metric.label}</strong><small>{metric.direction}</small></span><b>{metric.school}</b><span>{metric.median}</span><span><i style={{ width: `${Math.min(metric.index, 120) / 1.2}%` }} /><strong>{metric.index}</strong></span><em>{metric.percentile}</em></div>)}
      </div>
      <p className="index-explainer"><strong>Índice 100 = mediana das escolas comparáveis.</strong> Acima de 100 é melhor. Para desconto e folha/receita, o cálculo é invertido para manter a direção explícita.</p>
    </section>
  );
}

function ActionPlanPanel() {
  const groups = [
    { label: "Agora", period: "Hoje e amanhã", open: true, items: ["Listar descontos acima de 15% e validar exceções", "Definir responsável pelo plano da turma nova"] },
    { label: "Próximas semanas", period: "Semanas 1–4", items: ["Reduzir concessões sem regra", "Acompanhar ocupação e conversão toda sexta-feira", "Separar atraso, acordo e baixa nos recebimentos"] },
    { label: "Próximos meses", period: "Meses 2–3", items: ["Reavaliar ponto de equilíbrio da turma nova", "Revisar dimensionamento somente após validar demanda"] },
    { label: "Próximo trimestre", period: "90 dias", items: ["Recalibrar política de preço e bolsas", "Comparar margem, ocupação e qualidade pedagógica"] },
  ];
  return (
    <section className="workspace-panel action-plan-panel" aria-labelledby="plan-title">
      <div className="panel-intro"><div><span>EXECUÇÃO</span><h2 id="plan-title">Um plano simples, na ordem certa.</h2><p>Prioridade combina impacto, reversibilidade e segurança operacional.</p></div><span className="confidence-chip">Confiança 88%</span></div>
      <div className="plan-accordion">
        {groups.map((group, index) => <details key={group.label} open={group.open}><summary><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{group.label}</strong><small>{group.period}</small></div><i>⌄</i></summary><div className="plan-items">{group.items.map((item) => <label key={item}><input type="checkbox" /><span>{item}</span></label>)}</div></details>)}
      </div>
      <div className="plan-guardrail"><strong>Guardrail pedagógico</strong><p>Não reduzir equipe antes de validar ocupação, rotina e impacto na qualidade.</p></div>
    </section>
  );
}

type LocalFileState = {
  id: string;
  name: string;
  kind: "CSV" | "PDF" | "XLSX" | "FILE";
  status: "checking" | "ready" | "blocked";
  message: string;
  rows?: number;
  columns?: number;
  pages?: number;
  characters?: number;
  document?: UploadedSchoolDocument;
};

function localFileId(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

async function inspectPdf(file: File): Promise<Pick<LocalFileState, "status" | "message" | "pages" | "characters" | "document">> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url,
    ).toString();
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    if (document.numPages > 80) {
      await document.destroy();
      return { status: "blocked", message: "PDF acima do limite de 80 páginas desta demonstração." };
    }
    let characters = 0;
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        if (item.str.trim()) pageText += `${item.str}\n`;
      }
      characters += pageText.length;
      pageTexts.push(pageText);
      page.cleanup();
    }
    const pages = document.numPages;
    await document.destroy();
    if (characters === 0) {
      return { status: "blocked", message: "PDF sem texto selecionável. Documentos digitalizados ainda exigem OCR.", pages, characters };
    }
    return {
      status: "ready",
      message: "PDF lido e normalizado localmente para o CFO desta sessão.",
      pages,
      characters,
      document: parseUploadedPdfText(file.name, pageTexts.join("\n")),
    };
  } catch {
    return { status: "blocked", message: "Não foi possível ler este PDF. Verifique se o arquivo está íntegro e sem senha." };
  }
}

async function inspectLocalFile(file: File): Promise<LocalFileState> {
  const id = localFileId(file);
  const extension = file.name.split(".").pop()?.toLowerCase();
  const kind = extension === "csv" ? "CSV" : extension === "pdf" ? "PDF" : extension === "xlsx" ? "XLSX" : "FILE";
  if (file.size > 5 * 1024 * 1024) return { id, name: file.name, kind, status: "blocked", message: "Arquivo bloqueado: limite local de 5 MB." };
  if (extension === "pdf") return { id, name: file.name, kind, ...(await inspectPdf(file)) };
  if (extension === "xlsx") return { id, name: file.name, kind, status: "blocked", message: "Converta o XLSX para CSV ou envie o PDF correspondente nesta versão." };
  if (extension !== "csv") return { id, name: file.name, kind, status: "blocked", message: "Formato incompatível. Use CSV ou PDF." };
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const columns = (lines[0] ?? "").split(/[,;]/).map((value) => value.trim());
  if (lines.length < 2 || lines.length > 2_000 || columns.length < 2 || columns.length > 40) {
    return { id, name: file.name, kind, status: "blocked", message: "Estrutura incompatível: use entre 2 e 2.000 linhas e 2 a 40 colunas." };
  }
  const document = parseUploadedCsv(file.name, text);
  return { id, name: file.name, kind, status: "ready", message: "CSV lido e normalizado localmente para o CFO desta sessão.", rows: lines.length - 1, columns: columns.length, document };
}

function FilesPanel({ initialFiles = [], onDocumentsReady, onDocumentRemoved, onAnalyze }: { initialFiles?: File[]; onDocumentsReady: (documents: UploadedSchoolDocument[]) => void; onDocumentRemoved: (name: string) => void; onAnalyze: () => void }) {
  const [fileStates, setFileStates] = useState<LocalFileState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialKeyRef = useRef("");

  const inspectFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const acceptedFiles = files.slice(0, 12);
    const ids = new Set(acceptedFiles.map(localFileId));
    const pending: LocalFileState[] = acceptedFiles.map((file) => ({
      id: localFileId(file),
      name: file.name,
      kind: file.name.toLowerCase().endsWith(".pdf") ? "PDF" : file.name.toLowerCase().endsWith(".csv") ? "CSV" : file.name.toLowerCase().endsWith(".xlsx") ? "XLSX" : "FILE",
      status: "checking",
      message: "Lendo o arquivo localmente…",
    }));
    setFileStates((current) => [...current.filter((item) => !ids.has(item.id)), ...pending]);
    const inspected = await Promise.all(acceptedFiles.map(inspectLocalFile));
    setFileStates((current) => [...current.filter((item) => !ids.has(item.id)), ...inspected]);
    onDocumentsReady(inspected.flatMap((item) => item.document ? [item.document] : []));
  }, [onDocumentsReady]);

  useEffect(() => {
    const key = initialFiles.map((file) => `${file.name}:${file.size}`).join("|");
    if (!key || key === initialKeyRef.current) return;
    initialKeyRef.current = key;
    void inspectFiles(initialFiles);
  }, [initialFiles, inspectFiles]);

  const inspectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void inspectFiles(files);
  };

  return (
    <section className="workspace-panel files-panel" aria-labelledby="files-title">
      <div className="panel-intro"><div><span>DADOS LOCAIS</span><h2 id="files-title">Adicione os arquivos da escola.</h2><p>Selecione até 12 PDFs e CSVs de uma vez. Os arquivos aprovados alimentam o CFO somente nesta sessão.</p></div><a href="/private">Área privada →</a></div>
      <input ref={inputRef} className="visually-hidden" type="file" accept=".csv,.pdf" multiple onChange={inspectFile} />
      <button className="upload-zone" type="button" onClick={() => inputRef.current?.click()}><span>＋</span><strong>Selecionar vários arquivos da escola</strong><small>PDF e CSV · até 12 arquivos · máximo 5 MB por arquivo · leitura somente nesta sessão</small></button>
      <div className="privacy-strip"><span>✓ múltiplos arquivos</span><span>✓ PDF com texto</span><span>✓ sem persistência</span><span>✓ dados identificáveis permitidos</span></div>
      {fileStates.some((file) => file.document) ? <div className="new-school-ready"><strong>Arquivos conectados ao CFO</strong><span>A próxima resposta usará somente os dados normalizados da escola enviada.</span><button type="button" onClick={onAnalyze}>Ir para a conversa →</button></div> : null}
      {fileStates.map((fileState) => <article className={`file-result ${fileState.status}`} aria-live="polite" key={fileState.id}><div><span>{fileState.status === "ready" ? fileState.kind : "!"}</span><div><strong>{fileState.name}</strong><p>{fileState.message}</p>{fileState.rows ? <small>{fileState.rows} linhas · {fileState.columns} colunas · dados mapeados</small> : null}{fileState.pages ? <small>{fileState.pages} páginas · {fileState.characters?.toLocaleString("pt-BR")} caracteres extraídos</small> : null}{fileState.document?.warnings.map((warning) => <small key={warning}>Atenção: {warning}</small>)}</div></div><button type="button" onClick={() => { setFileStates((current) => current.filter((file) => file.id !== fileState.id)); onDocumentRemoved(fileState.name); }}>Remover</button></article>)}
      <div className="file-flow"><div><b>1</b><span><strong>Ler</strong><small>PDF e CSV no navegador</small></span></div><div><b>2</b><span><strong>Validar</strong><small>tipo, tamanho e estrutura</small></span></div><div><b>3</b><span><strong>Normalizar</strong><small>mapear ou preservar UNKNOWN</small></span></div><div><b>4</b><span><strong>Reconciliar</strong><small>confirmar totais antes de responder</small></span></div></div>
    </section>
  );
}

function QuestionsPanel({ onUse }: { onUse: (question: string) => void }) {
  const [draft, setDraft] = useState("Posso contratar?");
  const [improved, setImproved] = useState("");
  const groups = [
    ["Rentabilidade", "Por que minha margem caiu?", "Onde foi parar meu resultado?", "Meu reajuste funcionou?"],
    ["Pessoas", "Posso contratar?", "Minha folha está alta?"],
    ["Turmas", "Qual turma está abaixo do equilíbrio?", "Tenho capacidade ociosa?"],
    ["Recebimentos", "Minha inadimplência está alta?", "Quanto está realmente em aberto?"],
    ["Ações", "O que faço amanhã?", "Quais são as três prioridades?"],
  ];
  const improve = () => {
    const clean = draft.trim();
    if (!clean) return;
    setImproved(/contratar/i.test(clean) ? "Considerando o custo mensal da nova contratação, a ocupação atual das turmas e a margem operacional dos últimos três meses, a escola consegue contratar sem comprometer o caixa?" : `Considerando o período, os indicadores disponíveis e as principais mudanças operacionais, ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`);
  };
  return (
    <section className="workspace-panel questions-panel" aria-labelledby="questions-title">
      <div className="panel-intro"><div><span>PERGUNTAR MELHOR</span><h2 id="questions-title">Perguntas que levam a decisões.</h2><p>Escolha um atalho ou refine uma pergunta vaga sem inventar informações.</p></div></div>
      <div className="question-workbench"><label>Sua pergunta<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} /></label><button type="button" onClick={improve}>Melhorar pergunta</button>{improved ? <div className="improved-question"><span>VERSÃO MELHORADA</span><p>{improved}</p><small>Acrescentamos período, ocupação, custo e proteção de caixa. Dados ainda ausentes serão perguntados na conversa.</small><div><button type="button" onClick={() => onUse(improved)}>Usar na conversa</button><button type="button" onClick={() => navigator.clipboard?.writeText(improved)}>Copiar pergunta</button></div></div> : null}</div>
      <div className="question-bank">{groups.map(([category, ...questions]) => <section key={category}><h3>{category}</h3>{questions.map((question) => <button type="button" key={question} onClick={() => onUse(question)}>{question}<span>↗</span></button>)}</section>)}</div>
    </section>
  );
}

function DemoScreen({ theme, onTheme, onExit, initialView = "overview", initialFiles = [] }: { theme: Theme; onTheme: () => void; onExit: () => void; initialView?: WorkspaceView; initialFiles?: File[] }) {
  const [stage, setStage] = useState<DemoStage>("ready");
  const [activeView, setActiveView] = useState<WorkspaceView>(initialView);
  const [input, setInput] = useState("");
  const [firstQuestion, setFirstQuestion] = useState("");
  const [contextAnswer, setContextAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [firstAnalysis, setFirstAnalysis] = useState<CfoAnalysis | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<CfoAnalysis | null>(null);
  const [followUpTurns, setFollowUpTurns] = useState<FollowUpTurn[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedSchoolDocument[]>([]);
  const [analysisError, setAnalysisError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextTurnIdRef = useRef(1);
  const uploadedBusinessName = uploadedDocuments.find((document) => document.businessName)?.businessName ?? "Escola enviada";
  const hasUploadedSchool = uploadedDocuments.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [stage, isThinking, followUpTurns.length]);

  const resetDemo = () => {
    setStage("ready"); setInput(""); setFirstQuestion(""); setContextAnswer(""); setIsThinking(false);
    setFirstAnalysis(null); setLatestAnalysis(null); setFollowUpTurns([]); setAnalysisError("");
    nextTurnIdRef.current = 1;
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const mergeUploadedDocuments = useCallback((documents: UploadedSchoolDocument[]) => {
    setUploadedDocuments((current) => {
      const names = new Set(documents.map((document) => document.name));
      return [...current.filter((document) => !names.has(document.name)), ...documents];
    });
  }, []);

  const removeUploadedDocument = useCallback((name: string) => {
    setUploadedDocuments((current) => current.filter((document) => document.name !== name));
  }, []);

  const processMessage = async (message: string) => {
    const cleanMessage = message.trim();
    if (!cleanMessage || isThinking) return;
    const currentStage = stage;
    const followUpId = currentStage === "revised" ? nextTurnIdRef.current++ : null;
    setActiveView("chat"); setInput("");
    if (currentStage === "ready") setFirstQuestion(cleanMessage);
    else if (currentStage === "question") setContextAnswer(cleanMessage);
    else if (followUpId !== null) setFollowUpTurns((current) => [...current, { id: followUpId, question: cleanMessage }]);
    setAnalysisError("");
    if (!hasUploadedSchool && /(?:avali|analis).*(?:minha|meu).*(?:escola|empresa)|(?:minha|meu).*(?:escola|empresa)/iu.test(cleanMessage)) {
      setAnalysisError("Para avaliar a sua escola, abra Arquivos, envie ao menos um PDF ou CSV e toque em “Analisar minha escola agora”. Sem arquivos próprios, eu só posso demonstrar o caso sintético da Escola Horizonte.");
      setStage(currentStage === "ready" ? "question" : currentStage);
      return;
    }
    setIsThinking(true);
    try {
      const previous = [firstQuestion, contextAnswer, ...followUpTurns.map((turn) => turn.question)].filter(Boolean);
      const response = await fetch("/api/analyze", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseState: hasUploadedSchool ? buildUploadedCfoCaseState(cleanMessage, previous, uploadedDocuments) : buildPublicCfoCaseState(cleanMessage, previous) }),
      });
      const payload = await response.json() as CfoAnalysis | { message?: string };
      if (!response.ok || !("mode" in payload)) {
        throw new Error(("message" in payload && payload.message) || "Não foi possível concluir a análise agora.");
      }
      if (currentStage === "ready") setFirstAnalysis(payload);
      else if (currentStage === "question") setLatestAnalysis(payload);
      else if (followUpId !== null) setFollowUpTurns((current) => current.map((turn) => turn.id === followUpId ? { ...turn, analysis: payload } : turn));
      setStage(currentStage === "ready" ? "question" : "revised");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir a análise agora.";
      if (followUpId !== null) setFollowUpTurns((current) => current.map((turn) => turn.id === followUpId ? { ...turn, error: message } : turn));
      else setAnalysisError(message);
    } finally {
      setIsThinking(false);
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); processMessage(input); };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); processMessage(input); } };
  const toggleTask = (id: string) => setCompletedTasks((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <main className="demo-shell demo-shell--workspace launch-workspace">
      <DemoSidebar open={sidebarOpen} activeView={activeView} onClose={() => setSidebarOpen(false)} onReset={resetDemo} onNavigate={setActiveView} />
      <section className="chat-column" aria-label="Workspace Veralis">
        <header className="demo-header launch-header">
          <div className="demo-title-area"><button className="sidebar-trigger" type="button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">☰</button><button className="brand-button mobile-brand" type="button" onClick={onExit} aria-label="Voltar para a página inicial"><BrandMark compact /></button><div className="conversation-title"><strong>{hasUploadedSchool && activeView === "chat" ? "Conversa sobre a escola enviada" : viewTitles[activeView]}</strong><span><i /> {hasUploadedSchool ? `${uploadedBusinessName} · arquivos desta sessão` : "Escola Horizonte · 100% sintética"}</span></div></div>
          <div className="demo-actions"><span className="safe-mode"><i /> Demo segura</span><button className="reset-button" type="button" onClick={resetDemo}>↺ <span>Reset demo</span></button><ThemeButton theme={theme} onToggle={onTheme} /></div>
        </header>
        <div className="synthetic-banner" role="note"><span aria-hidden="true">◇</span><p><strong>Ambiente de demonstração.</strong> Não envie informações pessoais ou financeiras reais.</p></div>

        <div className={`workspace-scroll${activeView === "chat" ? " is-chat" : ""}`}>
          {activeView === "overview" ? <OverviewPanel completed={completedTasks} onToggle={toggleTask} onNavigate={setActiveView} /> : null}
          {activeView === "performance" ? <PerformancePanel /> : null}
          {activeView === "plan" ? <ActionPlanPanel /> : null}
          {activeView === "files" ? <FilesPanel initialFiles={initialFiles} onDocumentsReady={mergeUploadedDocuments} onDocumentRemoved={removeUploadedDocument} onAnalyze={() => { resetDemo(); setInput("Analise os arquivos enviados e diga o que merece atenção primeiro."); setActiveView("chat"); requestAnimationFrame(() => inputRef.current?.focus()); }} /> : null}
          {activeView === "questions" ? <QuestionsPanel onUse={(question) => { setInput(question); setActiveView("chat"); requestAnimationFrame(() => inputRef.current?.focus()); }} /> : null}
          {activeView === "chat" ? <section className="conversation" aria-label="Conversa com a Veralis"><div className="conversation-inner"><div className="date-divider"><span>Hoje</span></div><article className="assistant-message assistant-message--welcome"><div className="message-heading"><span className="assistant-avatar" aria-hidden="true">V</span><div><strong>Veralis</strong><span>agora</span></div></div><div className="message-content"><p className="answer-lede">{hasUploadedSchool ? `Carreguei ${uploadedDocuments.length} arquivo${uploadedDocuments.length === 1 ? "" : "s"} de ${uploadedBusinessName}.` : "Carreguei os dados sintéticos da Escola Horizonte."}</p><p className="answer-copy">{hasUploadedSchool ? "As respostas desta conversa usarão somente os indicadores normalizados desses arquivos." : "Pergunte sobre a demo ou envie seus arquivos em Arquivos para avaliar outra escola."}</p></div></article>{stage === "ready" ? <div className="quick-prompts" aria-label="Perguntas sugeridas">{quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => processMessage(prompt)}>{prompt}<span aria-hidden="true">↗</span></button>)}</div> : null}{firstQuestion ? <article className="user-message"><span>Você</span><p>{firstQuestion}</p></article> : null}{firstAnalysis ? (hasUploadedSchool ? <UploadedDiagnosis analysis={firstAnalysis} /> : <InitialDiagnosis analysis={firstAnalysis} />) : null}{contextAnswer ? <article className="user-message"><span>Você</span><p>{contextAnswer}</p></article> : null}{latestAnalysis ? (hasUploadedSchool ? <UploadedDiagnosis analysis={latestAnalysis} /> : <RevisedDiagnosis analysis={latestAnalysis} />) : null}{followUpTurns.map((turn) => <FollowUpExchange key={turn.id} turn={turn} />)}{analysisError ? <article className="assistant-message"><div className="message-heading"><span className="assistant-avatar" aria-hidden="true">V</span><div><strong>Veralis</strong><span>ação necessária</span></div></div><div className="message-content"><p className="answer-copy">{analysisError}</p></div></article> : null}{isThinking ? <div className="thinking" role="status" aria-live="polite"><span className="assistant-avatar" aria-hidden="true">V</span><div><i /><i /><i /></div><p>{hasUploadedSchool ? "OpenAI analisando os arquivos da sua escola" : stage === "ready" ? "OpenAI analisando os indicadores" : "Atualizando o diagnóstico"}</p></div> : null}<div ref={endRef} /></div></section> : null}
        </div>

        <div className="composer-wrap launch-composer"><form className="composer" onSubmit={submit}><button className="attach-button" type="button" onClick={() => setActiveView("files")} aria-label="Abrir entrada de arquivos" title="Arquivos">＋</button><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} rows={1} aria-label="Mensagem para a Veralis" placeholder={stage === "question" ? "Conte o que mudou na operação..." : "Pergunte à Veralis..."} /><button className="voice-button" type="button" aria-label="Áudio ainda não disponível" title="Áudio entra na próxima etapa">●</button><button className="send-button" type="submit" disabled={!input.trim() || isThinking} aria-label="Enviar mensagem">↑</button></form><p>Enter para enviar · Shift + Enter para nova linha · voz em preparação</p></div>

        <nav className="mobile-bottom-nav" aria-label="Navegação móvel">{navigationItems.slice(0, 4).map((item) => <button className={activeView === item.view ? "is-active" : ""} type="button" key={item.view} onClick={() => setActiveView(item.view)}><span aria-hidden="true">{item.icon}</span>{item.label === "Visão geral" ? "Início" : item.label === "Plano de ação" ? "Plano" : item.label}</button>)}<button type="button" onClick={() => setSidebarOpen(true)}><span aria-hidden="true">•••</span>Mais</button></nav>
      </section>
    </main>
  );
}

export function VeralisExperience() {
  const [screen, setScreen] = useState<"home" | "demo">("home");
  const [theme, setTheme] = useState<Theme>("dark");
  const [initialView, setInitialView] = useState<WorkspaceView>("overview");
  const [initialFiles, setInitialFiles] = useState<File[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("veralis-theme") as Theme | null;
      const nextTheme = savedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem("veralis-theme", nextTheme);
      return nextTheme;
    });
  };

  return screen === "home" ? (
    <HomeScreen onStart={() => { setInitialView("overview"); setInitialFiles([]); setScreen("demo"); }} onNewSchool={(files) => { setInitialView("files"); setInitialFiles(files); setScreen("demo"); }} theme={theme} onTheme={toggleTheme} />
  ) : (
    <DemoScreen theme={theme} onTheme={toggleTheme} onExit={() => setScreen("home")} initialView={initialView} initialFiles={initialFiles} />
  );
}
