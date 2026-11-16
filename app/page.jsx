"use client";
import { useState, useEffect, useRef } from "react";
import {
  Compass,
  ScrollText,
  Swords,
  Backpack,
  Map,
  BookOpen,
  Settings,
  Users,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  X,
  Menu,
  Dices,
  Sparkles,
  Send,
  Heart,
  Flame,
  Shield,
  Check,
  LoaderCircle,
  LogOut,
  Download,
  Upload,
  Flag,
  NotebookPen,
  TreePine,
  Mountain,
  Castle,
  Moon,
  Sun,
  Coins,
  CheckCircle2,
  HelpCircle,
  Copy,
  RefreshCw,
  UserRound,
  Search,
  ChevronDown,
  Target,
} from "lucide-react";
import {
  attributes,
  classes,
  races,
  items,
  talents,
  scenarios,
  defaultRules,
} from "../lib/catalog.mjs";
import { mod, defense } from "../server/engine.mjs";

const nav = [
  ["home", "A taverna", Compass],
  ["adventure", "Aventura", Swords],
  ["character", "Meu personagem", UserRound],
  ["inventory", "Inventário", Backpack],
  ["skills", "Habilidades", Sparkles],
  ["map", "Mapa do mundo", Map],
  ["quests", "Missões", Flag],
  ["journal", "Diário", NotebookPen],
  ["codex", "Enciclopédia", BookOpen],
  ["room", "Minha mesa", Users],
];
const initialHero = {
  name: "",
  surname: "",
  nickname: "",
  age: 25,
  gender: "",
  race: "Humano",
  class: "Guerreiro",
  stats: Object.fromEntries(attributes.map((a) => [a, 12])),
  origin: "",
  personality: "",
  appearance: "",
  goal: "",
  fear: "",
  alignment: "Neutro",
  relations: "",
};
async function api(input) {
  const r = await fetch(
    "/api/game",
    input
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : {},
  );
  const data = await r.json();
  if (!r.ok || data.error)
    throw Error(data.error || "Falha ao acessar o servidor.");
  return data;
}
const Button = ({ children, kind = "", className = "", ...props }) => (
  <button className={`button ${kind} ${className}`} {...props}>
    {children}
  </button>
);
function Empty({
  icon: Icon = Compass,
  title,
  text,
  action,
  label = "Nova aventura",
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={30} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Button kind="primary" onClick={action}>
          <Plus size={16} />
          {label}
        </Button>
      )}
    </div>
  );
}
function Meter({ label, value, max, color = "red" }) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <strong>
          {value} <small>/ {max}</small>
        </strong>
      </div>
      <div className="meter-track">
        <i
          className={color}
          style={{
            width: Math.max(0, Math.min(100, (value / max) * 100)) + "%",
          }}
        />
      </div>
    </div>
  );
}
function Badge({ children, green = false }) {
  return <span className={"badge " + (green ? "green" : "")}>{children}</span>;
}
export default function App() {
  const [page, setPage] = useState("home"),
    [account, setAccount] = useState(null),
    [campaigns, setCampaigns] = useState([]),
    [active, setActive] = useState(null),
    [configured, setConfigured] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [creator, setCreator] = useState(null),
    [help, setHelp] = useState(false),
    [mobile, setMobile] = useState(false),
    [rollOpen, setRollOpen] = useState(false),
    [draft, setDraft] = useState(""),
    [kind, setKind] = useState("action"),
    [note, setNote] = useState(""),
    [chat, setChat] = useState(""),
    [target, setTarget] = useState(""),
    [search, setSearch] = useState("");
  const [dice, setDice] = useState(20),
    [bonus, setBonus] = useState(0),
    [loadError, setLoadError] = useState(false);
  const fileRef = useRef(null),
    bottomRef = useRef(null);
  const state = active?.state,
    hero = state?.heroes[account?.id];
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 4000);
  };
  const refresh = async () => {
    try {
      const r = await api();
      setAccount(r.user);
      setCampaigns(r.campaigns);
      setConfigured(r.configured);
      setLoadError(false);
    } catch (e) {
      setError(e.message);
      setLoadError(true);
    }
  };
  useEffect(() => {
    if (!creator && !help && !rollOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => document.querySelector('[role="dialog"] button')?.focus());
    const onKey = event => {
      if (event.key === 'Escape' && !busy) { setCreator(null); setHelp(false); setRollOpen(false); }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('[role="dialog"]');
      const controls = [...(dialog?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)') || [])];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [!!creator, help, rollOpen, busy]);
  useEffect(() => {
    refresh();
    const id = localStorage.getItem("aether-active");
    if (id) load(id, false);
    const invite = new URLSearchParams(location.search).get("sala");
    if (invite) setCreator({ scenario: "sino", joinCode: invite });
  }, []);
  useEffect(() => {
    if (!active || busy) return;
    const timer = setInterval(async () => {
      try {
        const r = await fetch("/api/game?id=" + active.id);
        if (!r.ok) return;
        const d = await r.json();
        setActive((previous) => (previous?.id === d.id ? d : previous));
      } catch {}
    }, 4000);
    return () => clearInterval(timer);
  }, [active?.id, busy]);
  useEffect(() => {
    if (page === "adventure")
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [active?.events?.length, page]);
  useEffect(() => {
    if (hero) setNote(hero.notes || "");
  }, [active?.id, hero?.id]);
  async function load(id, go = true) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/game?id=" + id);
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setActive(data);
      localStorage.setItem("aether-active", id);
      if (go) setPage("adventure");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function perform(input) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api({
        id: active?.id,
        version: active?.version,
        ...input,
      });
      setActive(r);
      localStorage.setItem("aether-active", r.id);
      if (input.type === "turn" || input.type === "resolve") {
        setDraft("");
        setPage("adventure");
      }
      if (input.type === "create" || input.type === "join") {
        setCreator(null);
        setPage("adventure");
        refresh();
      }
      return r;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const navigate = (id) => {
    setPage(id);
    setMobile(false);
    setError("");
  };
  const start = (scenario = "sino") => {
    setCreator({ scenario });
    setError("");
  };
  const exportHero = () => {
    const blob = new Blob(
      [JSON.stringify({ format: "aether-character-v1", hero }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (hero.name || "personagem") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importHero = async (e) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 50000) throw Error("Ficha muito grande.");
      const data = JSON.parse(await f.text());
      if (data.format !== "aether-character-v1" || !classes[data.hero?.class])
        throw Error("Formato de ficha inválido.");
      setCreator({ scenario: "original", imported: data.hero });
      notify(
        "Identidade importada. Nível e recursos serão reiniciados conforme as regras.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      e.target.value = "";
    }
  };
  const Heading = ({ eyebrow, title, text, children }) => (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow || "CRÔNICAS DE AETHER"}</div>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  );
  const CharacterCard = () =>
    hero && (
      <div className="panel character-summary">
        <div className="character-avatar">
          {classes[hero.class].icon}
          <span>{hero.level}</span>
        </div>
        <h3>
          {hero.name} {hero.surname}
        </h3>
        <p>
          {hero.race} · {hero.class}
        </p>
        <div className="divider" />
        <Meter label="Pontos de vida" value={hero.hp} max={hero.maxHp} />
        <Meter
          label={classes[hero.class].resource}
          value={hero.resource}
          max={hero.maxResource}
          color="blue"
        />
        <div className="character-facts">
          <span>
            <Shield size={16} />
            {defense(hero)} Defesa
          </span>
          <span>
            <Coins size={16} />
            {hero.gold} Ouro
          </span>
        </div>
        <Meter
          label={"Nível " + hero.level}
          value={hero.xp}
          max={hero.level * 100}
          color="gold"
        />
        {hero.conditions.length > 0 && (
          <p className="danger-text">{hero.conditions.join(", ")}</p>
        )}
        <Button kind="outline full" onClick={() => navigate("character")}>
          Ver ficha completa <ArrowUpRight size={15} />
        </Button>
      </div>
    );
  const noCampaign = (
    <Empty
      title="Sua história ainda não começou"
      text="Crie um personagem e escolha um cenário para abrir este capítulo."
      action={() => start()}
    />
  );
  function content() {
    if (page === "home")
      return (
        <>
          <Heading
            eyebrow="SEU PRÓXIMO CAPÍTULO COMEÇA AQUI"
            title="Bem-vindo à taverna."
            text="Deixe o mundo lá fora. Uma nova história espera por você."
          >
            <Button
              kind="outline"
              onClick={() => setCreator({ scenario: "sino", joinCode: "" })}
            >
              <Users size={16} />
              Entrar em uma mesa
            </Button>
          </Heading>
          <section className="hero-banner">
            <div className="hero-shade" />
            <div className="hero-content">
              <Badge>
                <Sparkles size={12} /> SUA HISTÓRIA. SUAS ESCOLHAS.
              </Badge>
              <h2>
                Toda grande lenda
                <br />
                começa com
                <br />
                <em>uma escolha.</em>
              </h2>
              <p>
                Explore reinos esquecidos, desafie o destino e escreva sua
                própria aventura com um Mestre de inteligência artificial.
              </p>
              <Button kind="primary" onClick={() => start()}>
                <Plus size={18} />
                Nova aventura
                <ArrowUpRight size={18} />
              </Button>
              <div className="hero-details">
                <span>
                  <UserRound size={13} />
                  Jogue sozinho
                </span>
                <i />
                <span>
                  <Users size={14} />
                  Ou reúna seu grupo
                </span>
              </div>
            </div>
            <div className="hero-caption">
              <span>OS REINOS DE AETHER</span>
              <p>Há histórias que só você pode contar.</p>
            </div>
          </section>
          <div className="section-heading">
            <h2>
              Suas campanhas{" "}
              <span>{campaigns.length.toString().padStart(2, "0")}</span>
            </h2>
            <button className="text-button" onClick={() => start()}>
              Criar campanha <Plus size={15} />
            </button>
          </div>
          {loadError ? (
            <Empty
              title="Não foi possível carregar suas campanhas"
              text="Verifique sua conexão e tente novamente."
              action={refresh}
              label="Tentar novamente"
            />
          ) : campaigns.length ? (
            <div className="campaign-grid">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  className="campaign-card"
                  onClick={() => load(c.id)}
                >
                  <div className="mini-landscape">
                    <Badge green={c.started}>
                      {c.finished
                        ? "ARCO CONCLUÍDO"
                        : c.started
                          ? "EM ANDAMENTO"
                          : "PRONTA PARA COMEÇAR"}
                    </Badge>
                  </div>
                  <div>
                    <h3>{c.title}</h3>
                    <p>
                      {c.hero?.name} · {c.hero?.class} · Nível {c.hero?.level}
                    </p>
                    <div className="card-footer">
                      <span>
                        <Map size={13} />
                        {c.location}
                      </span>
                      <ArrowRight size={17} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="first-campaign">
              <div className="outline-dice">
                <Dices size={28} />
              </div>
              <div>
                <h3>O primeiro capítulo é seu.</h3>
                <p>Crie seu herói. O Mestre cuidará do inesperado.</p>
              </div>
              <Button kind="outline" onClick={() => start()}>
                Começar minha história <ArrowRight size={15} />
              </Button>
            </div>
          )}
          <div className="section-heading">
            <h2>Um mundo de possibilidades</h2>
            <span className="muted">Escolha onde sua lenda começa</span>
          </div>
          <div className="scenario-grid">
            {scenarios.slice(0, 3).map((s, i) => (
              <button
                key={s.id}
                className={"scenario-card scene-" + i}
                onClick={() => start(s.id)}
              >
                <div className="scenario-icon">
                  {i === 0 ? <Castle /> : i === 1 ? <Swords /> : <TreePine />}
                </div>
                <span className="eyebrow">{s.tag}</span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <span className="scenario-link">
                  Explorar cenário <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
          </div>
          <div className="help-strip">
            <BookOpen size={22} />
            <div>
              <strong>Primeira vez à mesa?</strong>
              <span>
                {" "}
                Você só precisa de imaginação. Nós ajudamos com o resto.
              </span>
            </div>
            <button className="text-button" onClick={() => setHelp(true)}>
              Conheça o jogo <ArrowRight size={15} />
            </button>
          </div>
        </>
      );
    if (page === "rules")
      return (
        <>
          <Heading
            title="O livro de regras"
            text="Sistema original D20 · Edição inicial"
          />
          <div className="rules-grid">
            {[
              [
                "O dado decide",
                "Testes: 1d20 + modificador do atributo. Modificador = piso((atributo − 10) / 2). CDs básicas: 9, 12 ou 16. A dificuldade da campanha ajusta a CD em −2, 0, +2 ou +4. Rolagens livres não resolvem testes pendentes.",
              ],
              [
                "Seu turno",
                "Uma ação por turno: atacar, usar habilidade, defender, avançar uma zona, consumir um item ou fugir. Iniciativa = 1d20 + Destreza. Ataques recebem +2 de proficiência. 20 natural sempre acerta e dobra o dano; 1 natural sempre falha.",
              ],
              [
                "Distância e defesa",
                "Armas alcançam 1 zona; o Mago alcança 4. A defesa é 10 + Destreza, com +2 para Guerreiros. Armadura reforçada concede +2. Defender concede +4 até seu próximo turno. Inimigos usam táticas automáticas de distância e vida.",
              ],
              [
                "Magia e habilidades",
                "Habilidades custam 3 pontos de recurso. Guerreiro, Mago e Ladino adicionam +4 ao dano; Clérigo cura 1d8 + Sabedoria +4 em si mesmo. Poções curam 2d6 +4. Éter restaura 6 pontos de recurso.",
              ],
              [
                "Descanso e mortalidade",
                "Descansar consome uma ração e avança 8 horas, restaurando vida e recurso. Com 0 de vida o personagem fica incapacitado. No modo de morte permanente, ele morre e não pode descansar. Nos outros modos, o descanso recupera o personagem.",
              ],
              [
                "Uma nova página",
                "Cada inimigo derrotado concede 50 XP e 10 moedas por sobrevivente. Missões concluídas concedem 100 XP e 25 moedas. Para subir do nível N, são necessários N × 100 XP. Cada nível concede 5 de vida, 1 de recurso e 1 ponto para atributo ou talento.",
              ],
              [
                "Justiça e continuidade",
                "Dados são gerados pelo servidor com aleatoriedade criptográfica e sem viés de módulo. Resultados, modificadores e CDs são registrados. A narrativa propõe acontecimentos; vida, custos, inventário e recompensas passam pelas regras.",
              ],
              [
                "Próximas expansões",
                "Cobertura, resistências elementais, criação de classes, fabricação, companheiros autônomos, ressurreição por missão, desfazer ações e edição completa do livro de regras são recursos futuros. O combate atual usa zonas e um conjunto reduzido de habilidades.",
              ],
            ].map(([title, text]) => (
              <div className="panel rule" key={title}>
                <BookOpen size={20} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </>
      );
    if (!active || !hero)
      return (
        <>
          <Heading
            title={nav.find((n) => n[0] === page)?.[1] || "Configurações"}
          />
          {noCampaign}
        </>
      );
    if (page === "adventure")
      return (
        <>
          <Heading
            eyebrow={"DIA " + state.day + " · " + state.location.toUpperCase()}
            title={state.title}
          >
            <div className="inline">
              <Badge green>
                <span className="live-dot" /> Salvamento automático
              </Badge>
              <Button kind="outline" onClick={() => setRollOpen(true)}>
                <Dices size={17} />
                Dados
              </Button>
            </div>
          </Heading>
          <div className="adventure-grid">
            <section className="panel story-panel">
              <div className="scene-bar">
                <span>
                  <Map size={15} />
                  {state.location}
                </span>
                <span>
                  <Moon size={14} />
                  {state.hour.toString().padStart(2, "0")}:00 · {state.weather}
                </span>
              </div>
              {state.finished && (
                <div className="success-banner">
                  <CheckCircle2 size={18} /> Arco concluído. Sua história está
                  salva; você pode continuar explorando.
                </div>
              )}
              <div className="story-scroll">
                {!state.started && !state.pending ? (
                  <div className="start-story">
                    <Sparkles size={38} />
                    <span className="eyebrow">
                      O MESTRE AGUARDA SUA CHEGADA
                    </span>
                    <h2>
                      O mundo está prestes
                      <br />a conhecer {hero.name}.
                    </h2>
                    <p>{state.premise}</p>
                    <Button
                      kind="primary"
                      disabled={busy || !configured}
                      onClick={() =>
                        perform({ type: "turn", text: "", kind: "action" })
                      }
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Sparkles size={17} />
                      )}
                      Iniciar minha aventura
                    </Button>
                    {!configured && (
                      <p className="danger-text">
                        Configure o Gemini no servidor para começar.
                      </p>
                    )}
                  </div>
                ) : (
                  active.events
                    .filter((e) => e.kind !== "chat")
                    .map((e) => (
                      <article key={e.id} className={"story-message " + e.kind}>
                        <div className="message-icon">
                          {e.kind === "master" ? (
                            <Sparkles size={17} />
                          ) : e.kind === "player" ? (
                            <UserRound size={16} />
                          ) : (
                            <Dices size={14} />
                          )}
                        </div>
                        <div>
                          <div className="message-author">
                            {e.author}
                            <span>
                              {new Date(e.created_at).toLocaleTimeString(
                                "pt-BR",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                          <p>{e.content}</p>
                        </div>
                      </article>
                    ))
                )}
                {busy && (
                  <div className="thinking">
                    <span />
                    <span />
                    <span />O Mestre está tecendo o próximo capítulo…
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              {state.pending ? (
                <div className="pending-test">
                  <Dices />
                  <div>
                    <strong>
                      Teste de {state.pending.plan.check.attribute}
                    </strong>
                    <p>{state.pending.plan.check.reason}</p>
                  </div>
                  <Button
                    disabled={busy || state.pending.user !== account.id}
                    kind="primary"
                    onClick={() => perform({ type: "resolve" })}
                  >
                    Rolar D20
                  </Button>
                </div>
              ) : state.combat ? (
                <Combat
                  s={state}
                  hero={hero}
                  target={target}
                  setTarget={setTarget}
                  busy={busy}
                  perform={perform}
                  onNegotiate={() => {
                    setDraft(
                      "Proponho uma trégua e tento negociar o fim do confronto.",
                    );
                    setKind("speech");
                  }}
                />
              ) : state.started && state.choices.length > 0 ? (
                <div className="choices">
                  {state.choices.map((c, i) => (
                    <button
                      key={i}
                      disabled={busy}
                      onClick={() =>
                        perform({ type: "turn", text: c, kind: "action" })
                      }
                    >
                      <span>{i + 1}</span>
                      {c}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              ) : null}
              {(state.started || state.pending) && (
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    perform({
                      type: "turn",
                      text: draft,
                      kind,
                      negotiate: !!state.combat,
                    });
                  }}
                >
                  <div className="composer-tabs">
                    {[
                      ["action", "Agir"],
                      ["speech", "Falar"],
                      ["question", "Perguntar ao Mestre"],
                    ].map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        className={kind === id ? "selected" : ""}
                        onClick={() => setKind(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="composer-input">
                    <textarea
                      aria-label="Sua ação"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={2000}
                      placeholder={
                        state.combat
                          ? "Negocie uma trégua ou pergunte sobre as regras…"
                          : "O que você faz? Sua imaginação é o limite."
                      }
                      rows={2}
                    />
                    <Button
                      type="submit"
                      disabled={busy || !draft.trim() || !!state.pending}
                      kind="primary"
                      aria-label="Enviar ação"
                    >
                      <Send size={19} />
                    </Button>
                  </div>
                  <small>
                    Suas decisões pertencem a você. O Mestre narra as
                    consequências.
                  </small>
                </form>
              )}
            </section>
            <aside className="adventure-aside">
              <CharacterCard />
              <div className="panel">
                <div className="panel-title">
                  <Flag size={17} />
                  <h3>Seu próximo passo</h3>
                </div>
                {state.quests.filter((q) => q.status === "Ativa").length ? (
                  state.quests
                    .filter((q) => q.status === "Ativa")
                    .map((q) => (
                      <div className="mini-quest" key={q.title}>
                        <strong>{q.title}</strong>
                        <p>{q.objective}</p>
                      </div>
                    ))
                ) : (
                  <p className="muted">
                    O mundo ainda guarda seus segredos. Converse, investigue e
                    escolha seu caminho.
                  </p>
                )}
                <button
                  className="text-button"
                  onClick={() => navigate("quests")}
                >
                  Ver missões <ArrowRight size={14} />
                </button>
              </div>
              <div className="quote">
                “Nem todos os que vagueiam procuram o mesmo destino.”
                <span>— Provérbio de Aether</span>
              </div>
            </aside>
          </div>
        </>
      );
    if (page === "character")
      return (
        <>
          <Heading
            title="Seu nome se tornará lenda."
            text="A ficha que acompanha cada escolha da sua jornada."
          >
            <Button kind="outline" onClick={exportHero}>
              <Download size={16} />
              Exportar ficha
            </Button>
          </Heading>
          <div className="character-layout">
            <CharacterCard />
            <div>
              <div className="panel">
                <div className="section-heading">
                  <h2>Atributos</h2>
                  <Badge>{hero.points} pontos disponíveis</Badge>
                </div>
                <div className="stats-grid">
                  {attributes.map((a) => (
                    <div className="stat" key={a}>
                      <span>{a}</span>
                      <strong>{hero.stats[a]}</strong>
                      <em>
                        {mod(hero.stats[a]) >= 0 ? "+" : ""}
                        {mod(hero.stats[a])}
                      </em>
                      <button
                        disabled={
                          busy || hero.points === 0 || hero.stats[a] >= 20
                        }
                        onClick={() =>
                          perform({ type: "attribute", attribute: a })
                        }
                        aria-label={"Aumentar " + a}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="character-facts">
                  <span>
                    Iniciativa: {mod(hero.stats.Destreza) >= 0 ? "+" : ""}
                    {mod(hero.stats.Destreza)}
                  </span>
                  <span>Percepção: {10 + mod(hero.stats.Sabedoria)}</span>
                  <span>Movimento: 1 zona</span>
                  <span>Proficiência: +2</span>
                </div>
              </div>
              <div className="panel biography">
                <h2>Além da ficha</h2>
                {[
                  ["Origem", hero.origin],
                  ["Personalidade", hero.personality],
                  ["Objetivo", hero.goal],
                  ["Aparência", hero.appearance],
                  ["Medos e fraquezas", hero.fear],
                  ["Relações", hero.relations],
                  ["Alinhamento", hero.alignment],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="eyebrow">{k}</span>
                    <p>{v || "Ainda não definido."}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      );
    if (page === "inventory")
      return (
        <>
          <Heading
            title="Tudo o que você carrega."
            text="Cada objeto pode ser o começo de uma história."
          >
            <Badge>
              <Coins size={14} />
              {hero.gold} moedas
            </Badge>
          </Heading>
          <div className="inventory-grid">
            {Object.entries(hero.inventory)
              .filter(([, n]) => n > 0)
              .map(([id, n]) => (
                <div className="panel item-card" key={id}>
                  <div className="item-symbol">
                    {items[id]?.type === "Arma" ? (
                      <Swords />
                    ) : items[id]?.type === "Armadura" ? (
                      <Shield />
                    ) : (
                      <Flame />
                    )}
                    <span>×{n}</span>
                  </div>
                  <Badge>{items[id]?.rarity}</Badge>
                  <h3>{items[id]?.name || id}</h3>
                  <p>{items[id]?.description}</p>
                  <div className="item-meta">
                    <span>{items[id]?.weight} kg</span>
                    <span>{items[id]?.value} moedas</span>
                  </div>
                  {["pocao", "eter"].includes(id) && (
                    <Button
                      kind="outline full"
                      disabled={busy || !!state.combat}
                      onClick={() => perform({ type: "item", item: id })}
                    >
                      Usar item
                    </Button>
                  )}
                  {["Arma", "Armadura"].includes(items[id]?.type) && (
                    <Button
                      kind="outline full"
                      disabled={busy || !!state.combat}
                      onClick={() => perform({ type: "equip", item: id })}
                    >
                      {hero.weapon === id || (id === "armadura" && hero.armor)
                        ? "Equipado"
                        : "Equipar"}
                    </Button>
                  )}
                </div>
              ))}
          </div>
          <div className="section-heading">
            <h2>Comércio local</h2>
            <span className="muted">Venda por metade do valor</span>
          </div>
          {state.npcs.some(
            (n) =>
              n.location === state.location && n.occupation === "Comerciante",
          ) ? (
            <div className="panel market">
              {Object.entries(items).map(([id, i]) => (
                <div key={id}>
                  <span>{i.name}</span>
                  <strong>{i.value} moedas</strong>
                  <Button
                    disabled={busy || !!state.combat || hero.gold < i.value}
                    onClick={() => perform({ type: "trade", item: id })}
                  >
                    Comprar
                  </Button>
                  <Button
                    disabled={
                      busy ||
                      !!state.combat ||
                      !hero.inventory[id] ||
                      hero.weapon === id ||
                      (id === "armadura" && hero.armor)
                    }
                    onClick={() =>
                      perform({ type: "trade", item: id, sell: true })
                    }
                  >
                    Vender
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Coins}
              title="Nenhum comerciante por perto"
              text="Procure um mercado ou negocie com um vendedor na aventura para comprar e vender itens."
            />
          )}
        </>
      );
    if (page === "skills")
      return (
        <>
          <Heading
            title="Escolha quem você vai se tornar."
            text={hero.class + " · A cada nível, um novo caminho."}
          >
            <Badge>{hero.points} pontos disponíveis</Badge>
          </Heading>
          <div className="skill-root">
            <span>{classes[hero.class].icon}</span>
            <h2>{classes[hero.class].skill}</h2>
            <p>
              Habilidade inicial · 3 de{" "}
              {classes[hero.class].resource.toLowerCase()} · Uma ação
            </p>
            <p>
              {hero.class === "Clérigo"
                ? "Cura em si: 1d8 + Sabedoria + 4."
                : "Ataque com +4 de dano adicional. Alcance: " +
                  (hero.class === "Mago" ? "4 zonas." : "1 zona.")}
            </p>
          </div>
          <div className="skill-tree">
            {talents.map((t) => (
              <div
                className={
                  "panel talent " +
                  (hero.talents.includes(t.id) ? "unlocked" : "")
                }
                key={t.id}
              >
                <div className="talent-icon">{t.icon}</div>
                <Badge>Nível {t.level}</Badge>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <Button
                  kind="outline full"
                  disabled={
                    busy ||
                    hero.points < 1 ||
                    hero.level < t.level ||
                    hero.talents.includes(t.id)
                  }
                  onClick={() => perform({ type: "talent", id: t.id })}
                >
                  {hero.talents.includes(t.id) ? (
                    <>
                      <Check size={15} />
                      Aprendido
                    </>
                  ) : hero.level < t.level ? (
                    "Requer nível " + t.level
                  ) : (
                    "Aprender · 1 ponto"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </>
      );
    if (page === "map")
      return (
        <>
          <Heading
            title="O horizonte não é um limite."
            text="Lugares descobertos durante a sua jornada. Selecione um destino para viajar."
          />
          <div className="world-map">
            <div className="map-title">
              A E T H E R<span>TERRAS CONHECIDAS</span>
            </div>
            <div className="map-compass">
              ✥<span>N</span>
            </div>
            <svg
              className="map-paths"
              viewBox="0 0 1000 500"
              preserveAspectRatio="none"
            >
              <path d="M 80 380 Q 300 300 420 240 T 810 120 M 420 240 Q 550 400 880 360" />
            </svg>
            <div className="mountains">
              <Mountain size={120} />
              <Mountain size={90} />
              <TreePine size={60} />
            </div>
            {state.locations.slice(0, 16).map((l, i) => (
              <button
                style={{
                  left: 12 + ((i * 23) % 72) + "%",
                  top: 25 + ((i * 31) % 50) + "%",
                }}
                className={
                  "map-pin " + (l.name === state.location ? "current" : "")
                }
                key={l.name}
                disabled={busy || !!state.combat || !!state.pending}
                onClick={() => {
                  setPage("adventure");
                  perform({
                    type: "turn",
                    text: "Quero viajar até " + l.name + ".",
                    kind: "action",
                  });
                }}
              >
                <span>
                  <Castle size={20} />
                </span>
                <strong>{l.name}</strong>
                {l.name === state.location && <small>VOCÊ ESTÁ AQUI</small>}
              </button>
            ))}
            <div className="map-footer">
              {state.locations.length} locais descobertos · Dia {state.day}
              <span>O desconhecido espera além da névoa.</span>
            </div>
          </div>
          <div className="locations-grid">
            {state.locations.map((l) => (
              <div className="panel" key={l.name}>
                <Map size={19} />
                <h3>{l.name}</h3>
                <p className="muted">{l.description}</p>
              </div>
            ))}
          </div>
        </>
      );
    if (page === "quests")
      return (
        <>
          <Heading
            title="Há um propósito em cada caminho."
            text="Objetivos, escolhas e consequências da sua aventura."
          />
          {state.quests.length ? (
            <div className="quest-list">
              {state.quests.map((q) => (
                <div className="panel quest-card" key={q.title}>
                  <div className="quest-symbol">
                    <Flag size={25} />
                  </div>
                  <div>
                    <Badge green={q.status === "Concluída"}>{q.status}</Badge>
                    <h2>{q.title}</h2>
                    <p>{q.objective}</p>
                    <span className="reward">
                      <Coins size={14} />
                      {q.reward}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Flag}
              title="O chamado ainda está por vir"
              text="Inicie a aventura e descubra quais histórias cruzarão o seu caminho."
              action={() => navigate("adventure")}
              label="Voltar à aventura"
            />
          )}
        </>
      );
    if (page === "journal")
      return (
        <>
          <Heading
            title="Para que nada seja esquecido."
            text="O registro das escolhas que moldaram o seu mundo."
          />
          <div className="journal-grid">
            <section className="panel">
              <h2>Memórias da jornada</h2>
              <label className="search-field">
                <Search size={16} />
                <input
                  aria-label="Buscar memórias"
                  placeholder="Buscar um acontecimento…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="timeline">
                {state.memory
                  .filter((m) =>
                    m.text.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((m, i) => (
                    <div key={i}>
                      <span>Dia {m.day}</span>
                      <p>{m.text}</p>
                    </div>
                  ))}
                {!state.memory.length && (
                  <p className="muted">As páginas ainda estão em branco.</p>
                )}
              </div>
            </section>
            <section className="panel personal-notes">
              <NotebookPen />
              <h2>Entre você e o papel</h2>
              <p className="muted">
                Anotações do personagem, salvas com a campanha.
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={10000}
                placeholder="Uma suspeita, um nome, algo para lembrar…"
                rows={15}
              />
              <Button
                kind="primary"
                disabled={busy}
                onClick={async () => {
                  if (await perform({ type: "notes", text: note }))
                    notify("Anotações salvas.");
                }}
              >
                Salvar anotações <Check size={16} />
              </Button>
            </section>
          </div>
        </>
      );
    if (page === "codex")
      return (
        <>
          <Heading
            title="Os rostos de uma história."
            text="Pessoas, conhecimentos e relações que você descobriu."
          />
          {state.npcs.length ? (
            <div className="inventory-grid">
              {state.npcs.map((n) => (
                <div className="panel npc-card" key={n.name}>
                  <div className="npc-avatar">
                    <UserRound size={28} />
                  </div>
                  <Badge
                    green={n.attitude === "Aliado" || n.attitude === "Amigável"}
                  >
                    {n.attitude}
                  </Badge>
                  <h3>{n.name}</h3>
                  <small>
                    {n.occupation} · {n.location}
                  </small>
                  <p>{n.description}</p>
                  <div className="divider" />
                  <span className="eyebrow">CONHECIMENTO REGISTRADO</span>
                  <p>{n.knowledge}</p>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={BookOpen}
              title="Cada encontro deixa uma marca"
              text="Os personagens encontrados serão registrados aqui durante a aventura."
            />
          )}
          <div className="help-strip">
            <Swords size={20} />
            <span>
              O bestiário ilustrado e companheiros com ações próprias estão
              previstos para uma próxima versão.
            </span>
          </div>
        </>
      );
    if (page === "room")
      return (
        <>
          <Heading
            title="Boas histórias pedem companhia."
            text="Até quatro aventureiros. Um mundo compartilhado."
          />
          <div className="journal-grid">
            <div className="panel">
              <h2>Sua mesa</h2>
              {Object.values(state.heroes).map((h) => (
                <div className="member-row" key={h.id}>
                  <span className="member-icon">{classes[h.class].icon}</span>
                  <div>
                    <strong>{h.name}</strong>
                    <p>
                      {h.race} · {h.class} · Nível {h.level}
                    </p>
                  </div>
                  <Badge>
                    {h.id === active.owner ? "Anfitrião" : "Jogador"}
                  </Badge>
                </div>
              ))}
              {active.code && (
                <>
                  <div className="divider" />
                  <span className="eyebrow">CÓDIGO DE CONVITE</span>
                  <div className="invite-code">
                    {active.code}
                    <button
                      aria-label="Copiar código"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(active.code)
                          .then(() => notify("Código copiado."))
                          .catch(() =>
                            setError(
                              "Não foi possível copiar. Selecione o código manualmente.",
                            ),
                          )
                      }
                    >
                      <Copy size={17} />
                    </button>
                  </div>
                  <Button
                    kind="outline full"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(location.origin + "/?sala=" + active.code)
                        .then(() => notify("Link de convite copiado."))
                        .catch(() =>
                          setError("Não foi possível copiar o link."),
                        )
                    }
                  >
                    <Users size={16} />
                    Copiar link de convite
                  </Button>
                  <p className="muted small">
                    Cada convidado precisa de acesso ao site e entra com a
                    própria conta. A hospedagem privada exige liberar acesso aos
                    convidados.
                  </p>
                </>
              )}
              <p className="muted small">
                Atualização compartilhada a cada 4 segundos. Durante um turno do
                Mestre, as outras ações aguardam.
              </p>
            </div>
            <div className="panel room-chat">
              <h2>Conversa à mesa</h2>
              <div className="chat-history">
                {active.events
                  .filter((e) => e.kind === "chat")
                  .map((e) => (
                    <div key={e.id}>
                      <strong>{e.author}</strong>
                      <p>{e.content}</p>
                    </div>
                  ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await perform({ type: "chat", text: chat })) setChat("");
                }}
              >
                <input
                  value={chat}
                  maxLength={1000}
                  placeholder="Fale com o grupo…"
                  onChange={(e) => setChat(e.target.value)}
                  aria-label="Mensagem para jogadores"
                />
                <Button
                  kind="primary"
                  disabled={busy || !chat.trim()}
                  aria-label="Enviar mensagem"
                >
                  <Send size={17} />
                </Button>
              </form>
            </div>
          </div>
        </>
      );
    if (page === "settings")
      return (
        <>
          <Heading
            title="A aventura, do seu jeito."
            text="Ajustes permitidos ao anfitrião entre os confrontos."
          />
          <div className="panel settings-panel">
            <Settings size={25} />
            <h2>Regras da campanha</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                perform({ type: "settings", ...Object.fromEntries(data) });
              }}
            >
              <label>
                Dificuldade
                <select name="difficulty" defaultValue={state.rules.difficulty}>
                  {["Fácil", "Normal", "Difícil", "Brutal"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Dados
                <select name="dice" defaultValue={state.rules.dice}>
                  {["Automáticos", "Manuais"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Limite de jogadores
                <input
                  name="maxPlayers"
                  type="number"
                  min={Object.keys(state.heroes).length}
                  max="4"
                  defaultValue={state.rules.maxPlayers}
                />
              </label>
              <p className="muted">
                Mortalidade: {state.rules.mortality} · Narrativa:{" "}
                {state.rules.narrative} · Tom: {state.rules.tone}. Essas
                escolhas são fixadas ao criar a campanha nesta versão.
              </p>
              <Button
                kind="primary"
                disabled={
                  busy ||
                  active.owner !== account.id ||
                  !!state.combat ||
                  !!state.pending
                }
              >
                Salvar configurações
              </Button>
            </form>
            <div className="divider" />
            <h3>Integração do Mestre</h3>
            <Badge green={configured}>
              {configured
                ? "Gemini configurado no servidor"
                : "Credencial não configurada"}
            </Badge>
            <p className="muted small">
              Erros de rede ou cota são apresentados sem inventar uma resposta.
              A ação só é salva depois de concluída e validada.
            </p>
          </div>
        </>
      );
    return null;
  }
  return (
    <div className="app-shell">
      <input
        hidden
        ref={fileRef}
        type="file"
        accept="application/json"
        onChange={importHero}
      />
      {mobile && (
        <div className="sidebar-backdrop" onClick={() => setMobile(false)} />
      )}
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <button className="brand" onClick={() => navigate("home")}>
          <div className="brand-mark">
            <Dices size={27} />
          </div>
          <div>
            <strong>AETHER</strong>
            <span>CRÔNICAS INFINITAS</span>
          </div>
        </button>
        <div className="sidebar-label">SUA JORNADA</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {id === "quests" &&
                state?.quests.filter((q) => q.status === "Ativa").length >
                  0 && (
                  <span className="nav-count">
                    {state.quests.filter((q) => q.status === "Ativa").length}
                  </span>
                )}
              {id === "home" && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-label">SEU GRIMÓRIO</div>
          <button
            onClick={() => navigate("rules")}
            className={page === "rules" ? "active" : ""}
          >
            <BookOpen size={18} />
            Livro de regras
          </button>
          <button
            onClick={() => navigate("settings")}
            className={page === "settings" ? "active" : ""}
          >
            <Settings size={18} />
            Configurações
          </button>
          <div className="sidebar-tip">
            <Sparkles size={17} />
            <p>
              Um mundo vivo.
              <br />
              <strong>Uma história só sua.</strong>
            </p>
            <span>EDIÇÃO DO AVENTUREIRO · V1</span>
          </div>
          <button
            className="profile"
            onClick={() =>
              account
                ? setHelp(true)
                : location.assign("/signin-with-chatgpt?return_to=/")
            }
          >
            <div className="profile-avatar">
              {account ? (
                account.name.slice(0, 1).toUpperCase()
              ) : (
                <UserRound size={17} />
              )}
            </div>
            <div>
              <strong>
                {account ? account.name.split("@")[0] : "Entre na taverna"}
              </strong>
              <small>
                {account ? "Aventureiro de Aether" : "Salvar sua jornada"}
              </small>
            </div>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="inline">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="topbar-brand">
              Seu portal para o extraordinário
            </span>
            <span className="breadcrumb">
              <Compass size={14} />
              <ChevronRight size={13} />
              {nav.find((n) => n[0] === page)?.[1] ||
                (page === "rules" ? "Livro de regras" : "Configurações")}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="status">
              <span className={configured ? "live-dot" : "offline-dot"} />
              {configured ? "Mestre configurado" : "Configurar Mestre"}
            </span>
            <button
              className="icon-button"
              aria-label="Ajuda"
              onClick={() => setHelp(true)}
            >
              <HelpCircle size={18} />
            </button>
            {account ? (
              <a
                className="icon-button"
                title="Sair da conta"
                href="/signout-with-chatgpt?return_to=/"
                target="_top"
              >
                <LogOut size={17} />
              </a>
            ) : (
              <a
                className="login-link"
                href="/signin-with-chatgpt?return_to=/"
                target="_top"
              >
                Entrar <ArrowRight size={14} />
              </a>
            )}
          </div>
        </header>
        <main>
          {error && (
            <div role="alert" className="error-banner">
              <span>{error}</span>
              <button aria-label="Fechar erro" onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}
          {content()}
          <footer>
            <span>CRÔNICAS DE AETHER</span>
            <span>Feito para quem nunca deixou de imaginar.</span>
            <button onClick={() => setHelp(true)}>
              Sobre esta edição <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {creator && (
        <Creator
          initial={creator}
          account={account}
          busy={busy}
          error={error}
          onClose={() => setCreator(null)}
          onCreate={perform}
          onImport={() => fileRef.current.click()}
        />
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Guia do aventureiro"
            className="modal guide"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Fechar"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
            <span className="eyebrow">GUIA DO AVENTUREIRO</span>
            <h2>
              Você decide.
              <br />O mundo responde.
            </h2>
            <ol>
              <li>
                <strong>Crie seu herói.</strong> Escolha classe, raça, atributos
                e uma história de origem.
              </li>
              <li>
                <strong>Entre em uma aventura.</strong> O Mestre IA apresenta o
                mundo e os primeiros caminhos.
              </li>
              <li>
                <strong>Diga o que você faz.</strong> Escolha uma sugestão ou
                escreva qualquer tentativa. Use “Perguntar ao Mestre” para
                dúvidas sobre regras.
              </li>
              <li>
                <strong>Deixe os dados falarem.</strong> Testes e combates usam
                resultados do servidor. O progresso é salvo automaticamente.
              </li>
            </ol>
            <div className="guide-note">
              <strong>O que esta edição entrega</strong>
              <p>
                Campanhas persistentes, criação de heróis, Mestre Gemini,
                escolhas livres, dados, combate por zonas, missões, níveis,
                talentos, inventário e salas de até 4 participantes com
                sincronização periódica.
              </p>
              <strong>Em desenvolvimento</strong>
              <p>
                Companheiros autônomos, cobertura e efeitos elementais, criação
                de classes, fabricação, desfazer ações e bestiário ilustrado. As
                táticas de inimigos atuais são automáticas por regras.
              </p>
            </div>
            <Button
              kind="primary"
              onClick={() => {
                setHelp(false);
                start();
              }}
            >
              Estou pronto para a aventura <ArrowRight size={16} />
            </Button>
          </section>
        </div>
      )}
      {rollOpen && (
        <div className="modal-backdrop" onClick={() => setRollOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Mesa de dados"
            className="modal dice-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Fechar"
              onClick={() => setRollOpen(false)}
            >
              <X />
            </button>
            <Dices size={38} />
            <h2>Deixe o destino falar.</h2>
            <div className="dice-options">
              {[4, 6, 8, 10, 12, 20, 100].map((n) => (
                <button
                  key={n}
                  className={dice === n ? "selected" : ""}
                  onClick={() => setDice(n)}
                >
                  D{n}
                </button>
              ))}
            </div>
            <label>
              Modificador
              <input
                type="number"
                min="-30"
                max="30"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
              />
            </label>
            <Button
              kind="primary full"
              disabled={busy || !hero || !!state?.combat || !!state?.pending}
              onClick={() => perform({ type: "roll", sides: dice, bonus })}
            >
              Rolar D{dice}
            </Button>
            <p className="muted small">
              Rolagens livres não substituem testes solicitados pelo Mestre.
            </p>
            <div className="roll-history">
              {state?.rolls
                .slice()
                .reverse()
                .slice(0, 20)
                .map((r) => (
                  <div key={r.id}>
                    <span className="roll-number">{r.total}</span>
                    <div>
                      <strong>{r.label}</strong>
                      <p>
                        D{r.sides}: {r.raw} {r.bonus >= 0 ? "+" : "−"}{" "}
                        {Math.abs(r.bonus)}
                        {r.dc !== null ? " · CD " + r.dc : ""}
                      </p>
                      <small>
                        {r.id.slice(0, 8)} ·{" "}
                        {new Date(r.time).toLocaleTimeString("pt-BR")}
                      </small>
                    </div>
                    {r.success !== null && (
                      <Badge green={r.success}>
                        {r.success ? "Sucesso" : "Fracasso"}
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Combat({ s, hero, target, setTarget, busy, perform, onNegotiate }) {
  const c = s.combat,
    current = c.order[c.index],
    mine = current.id === hero.id;
  const selected = c.enemies.some((e) => e.id === target && e.hp > 0)
    ? target
    : c.enemies.find((e) => e.hp > 0)?.id;
  const act = (action, extra = {}) =>
    perform({ type: "combat", action, target: selected, ...extra });
  return (
    <div className="combat-panel">
      <div className="section-heading">
        <h3>
          <Swords size={19} />
          Combate · Rodada {c.round}
        </h3>
        <Badge green={mine}>{mine ? "Seu turno" : current.name}</Badge>
      </div>
      <div className="turn-order">
        {c.order.map((t, i) => (
          <span className={i === c.index ? "current" : ""} key={t.id}>
            {t.name} <small>{t.initiative}</small>
          </span>
        ))}
      </div>
      <div className="enemy-list">
        {c.enemies.map((e) => (
          <button
            key={e.id}
            className={selected === e.id ? "selected" : ""}
            disabled={e.hp <= 0}
            onClick={() => setTarget(e.id)}
          >
            <Swords size={20} />
            <strong>{e.name}</strong>
            <span>
              Zona {e.position} · Defesa {e.defense}
            </span>
            <Meter label="Vida" value={e.hp} max={e.maxHp} />
          </button>
        ))}
      </div>
      <p className="muted small">
        Sua posição: zona {c.positions[hero.id]}. Alcance:{" "}
        {hero.class === "Mago" ? 4 : 1} zona(s).
      </p>
      <div className="combat-actions">
        <Button disabled={busy || !mine} onClick={() => act("attack")}>
          <Swords size={15} />
          Atacar
        </Button>
        <Button
          disabled={busy || !mine || hero.resource < 3}
          onClick={() => act("skill")}
        >
          <Sparkles size={15} />
          {classes[hero.class].skill} · 3
        </Button>
        <Button disabled={busy || !mine} onClick={() => act("move")}>
          <ArrowRight size={15} />
          Aproximar
        </Button>
        <Button disabled={busy || !mine} onClick={() => act("guard")}>
          <Shield size={15} />
          Defender
        </Button>
        <Button
          disabled={busy || !mine || !hero.inventory.pocao}
          onClick={() => act("item", { item: "pocao" })}
        >
          <Heart size={15} />
          Poção
        </Button>
        <Button disabled={busy || !mine} onClick={onNegotiate}>
          Negociar
        </Button>
        <Button disabled={busy || !mine} onClick={() => act("flee")}>
          Fugir
        </Button>
      </div>
      <div className="combat-log">
        {c.log.slice(-4).map((v, i) => (
          <p key={i}>{v}</p>
        ))}
      </div>
    </div>
  );
}

function Creator({
  initial,
  account,
  busy,
  error,
  onClose,
  onCreate,
  onImport,
}) {
  const [step, setStep] = useState(0),
    [hero, setHero] = useState({
      ...initialHero,
      ...(initial.imported
        ? Object.fromEntries(
            Object.keys(initialHero).map((k) => [
              k,
              initial.imported[k] ?? initialHero[k],
            ]),
          )
        : {}),
      stats: initial.imported ? { ...initialHero.stats } : initialHero.stats,
    }),
    [rules, setRules] = useState({ ...defaultRules }),
    [mode, setMode] = useState("solo"),
    [scenario, setScenario] = useState(initial.scenario || "sino"),
    [title, setTitle] = useState(""),
    [premise, setPremise] = useState(""),
    [code, setCode] = useState(initial.joinCode ?? ""),
    [advanced, setAdvanced] = useState(false);
  const joining = Object.hasOwn(initial, "joinCode"),
    spent = Object.values(hero.stats).reduce((a, b) => a + b - 8, 0);
  const change = (key, v) => setHero((h) => ({ ...h, [key]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    onCreate(
      joining
        ? { type: "join", code, hero }
        : { type: "create", hero, rules, mode, scenario, title, premise },
    );
  };
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Criar aventura"
        className="modal creator"
      >
        <button
          className="modal-close"
          aria-label="Fechar criador"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="creator-header">
          <span className="eyebrow">
            {joining ? "REÚNA O GRUPO" : "UMA NOVA PÁGINA"}
          </span>
          <h2>
            {
              [
                "Toda lenda tem um começo.",
                "Quem será você?",
                "Prepare sua jornada.",
              ][step]
            }
          </h2>
          <div className="wizard-steps">
            {["A aventura", "O personagem", "Seu destino"].map((label, i) => (
              <span className={step >= i ? "active" : ""} key={label}>
                <b>{step > i ? <Check size={12} /> : i + 1}</b>
                {label}
              </span>
            ))}
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="creator-body">
            {step === 0 ? (
              <>
                {joining ? (
                  <label>
                    Código da mesa
                    <input
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Cole o código do anfitrião"
                      maxLength={32}
                    />
                  </label>
                ) : (
                  <>
                    <div className="mode-grid">
                      {[
                        [
                          "solo",
                          "Uma jornada só sua",
                          "Você e o Mestre IA. No seu ritmo.",
                          UserRound,
                        ],
                        [
                          "multi",
                          "Aventure-se em grupo",
                          "Crie a mesa e convide até 3 amigos.",
                          Users,
                        ],
                      ].map(([id, label, text, Icon]) => (
                        <button
                          type="button"
                          key={id}
                          className={
                            "select-card " + (mode === id ? "selected" : "")
                          }
                          onClick={() => setMode(id)}
                        >
                          <Icon size={25} />
                          <strong>{label}</strong>
                          <p>{text}</p>
                          {mode === id && <CheckCircle2 size={16} />}
                        </button>
                      ))}
                    </div>
                    <span className="field-title">
                      ESCOLHA UM PONTO DE PARTIDA
                    </span>
                    <div className="scenario-options">
                      {scenarios.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={
                            "select-card " +
                            (scenario === s.id ? "selected" : "")
                          }
                          onClick={() => setScenario(s.id)}
                        >
                          <strong>{s.title}</strong>
                          <p>{s.description}</p>
                        </button>
                      ))}
                    </div>
                    <label>
                      Nome da campanha <small>opcional</small>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                          scenarios.find((s) => s.id === scenario)?.title
                        }
                        maxLength={90}
                      />
                    </label>
                    <label>
                      Seu cenário <small>opcional</small>
                      <textarea
                        value={premise}
                        onChange={(e) => setPremise(e.target.value)}
                        placeholder="Descreva o mundo ou uma ideia que gostaria de explorar…"
                        maxLength={2000}
                        rows={2}
                      />
                    </label>
                  </>
                )}
              </>
            ) : step === 1 ? (
              <>
                <div className="form-grid">
                  <label>
                    Nome
                    <input
                      required
                      minLength={2}
                      maxLength={60}
                      autoFocus
                      value={hero.name}
                      onChange={(e) => change("name", e.target.value)}
                      placeholder="Como vão contar sua lenda?"
                    />
                  </label>
                  <label>
                    Sobrenome
                    <input
                      value={hero.surname}
                      onChange={(e) => change("surname", e.target.value)}
                      maxLength={60}
                      placeholder="Sua família ou linhagem"
                    />
                  </label>
                  <label>
                    Raça
                    <select
                      value={hero.race}
                      onChange={(e) => change("race", e.target.value)}
                    >
                      {races.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Idade
                    <input
                      type="number"
                      min="18"
                      max="999"
                      value={hero.age}
                      onChange={(e) => change("age", Number(e.target.value))}
                    />
                  </label>
                </div>
                <span className="field-title">SEU CAMINHO</span>
                <div className="class-grid">
                  {Object.entries(classes).map(([name, c]) => (
                    <button
                      className={
                        "select-card " + (hero.class === name ? "selected" : "")
                      }
                      type="button"
                      key={name}
                      onClick={() => change("class", name)}
                    >
                      <span className="class-icon">{c.icon}</span>
                      <strong>{name}</strong>
                      <p>{c.description}</p>
                    </button>
                  ))}
                </div>
                <div className="section-heading">
                  <h3>Atributos iniciais</h3>
                  <Badge>{24 - spent} pontos restantes</Badge>
                </div>
                <p className="muted small">
                  Base 8 · Máximo inicial 16 · Cada aumento custa 1 ponto.
                </p>
                <div className="point-buy">
                  {attributes.map((a) => (
                    <div key={a}>
                      <span>{a}</span>
                      <button
                        type="button"
                        aria-label={"Diminuir " + a}
                        disabled={hero.stats[a] <= 8}
                        onClick={() =>
                          change("stats", {
                            ...hero.stats,
                            [a]: hero.stats[a] - 1,
                          })
                        }
                      >
                        −
                      </button>
                      <strong>{hero.stats[a]}</strong>
                      <button
                        type="button"
                        aria-label={"Aumentar " + a}
                        disabled={spent >= 24 || hero.stats[a] >= 16}
                        onClick={() =>
                          change("stats", {
                            ...hero.stats,
                            [a]: hero.stats[a] + 1,
                          })
                        }
                      >
                        +
                      </button>
                      <small>
                        {mod(hero.stats[a]) >= 0 ? "+" : ""}
                        {mod(hero.stats[a])}
                      </small>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-button advanced-toggle"
                  onClick={() => setAdvanced(!advanced)}
                >
                  {advanced ? "Recolher" : "Detalhar"} história e personalidade{" "}
                  <ChevronDown size={16} />
                </button>
                {advanced && (
                  <div className="form-grid">
                    {[
                      ["nickname", "Apelido"],
                      ["gender", "Gênero"],
                      ["origin", "História de origem"],
                      ["personality", "Personalidade, virtudes e defeitos"],
                      ["appearance", "Aparência física"],
                      ["goal", "Objetivo pessoal"],
                      ["fear", "Medos"],
                      ["relations", "Relações com o mundo"],
                      ["alignment", "Alinhamento moral"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <textarea
                          rows={2}
                          maxLength={key === "alignment" ? 60 : 1000}
                          value={hero[key]}
                          onChange={(e) => change(key, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="text-button"
                  onClick={onImport}
                >
                  <Upload size={15} />
                  Importar identidade de uma ficha
                </button>
              </>
            ) : (
              <>
                <div className="hero-review">
                  <div className="character-avatar">
                    {classes[hero.class].icon}
                  </div>
                  <div>
                    <h3>
                      {hero.name} {hero.surname}
                    </h3>
                    <p>
                      {hero.race} · {hero.class} · Nível 1
                    </p>
                    <Badge>{classes[hero.class].skill}</Badge>
                  </div>
                </div>
                {!joining && (
                  <div className="form-grid">
                    {[
                      [
                        "difficulty",
                        "Dificuldade",
                        ["Fácil", "Normal", "Difícil", "Brutal"],
                      ],
                      [
                        "tone",
                        "Estilo",
                        [
                          "Aventura heroica",
                          "Fantasia sombria",
                          "Exploração",
                          "Mistério",
                          "Política medieval",
                          "Sobrevivência",
                          "Misturado",
                        ],
                      ],
                      [
                        "mortality",
                        "Mortalidade",
                        [
                          "Sem morte permanente",
                          "Ressurreição",
                          "Morte permanente",
                        ],
                      ],
                      [
                        "narrative",
                        "Narração",
                        ["Resumida", "Equilibrada", "Detalhada"],
                      ],
                      ["dice", "Rolagens", ["Automáticos", "Manuais"]],
                    ].map(([key, label, values]) => (
                      <label key={key}>
                        {label}
                        <select
                          value={rules[key]}
                          onChange={(e) =>
                            setRules({ ...rules, [key]: e.target.value })
                          }
                        >
                          {values.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
                <div className="guide-note">
                  <Sparkles size={20} />
                  <p>
                    O Mestre vai construir a história a partir de suas escolhas.
                    Você pode escrever qualquer tentativa, conversar com
                    personagens e sair do caminho esperado.
                  </p>
                  <p>
                    Combate por zonas · Salvamento automático · Sistema D20
                    original
                  </p>
                </div>
                {!account && (
                  <div className="error-banner">
                    Entre na sua conta para salvar a campanha.{" "}
                    <a href="/signin-with-chatgpt?return_to=/" target="_top">
                      Entrar
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div className="creator-footer">
            {step > 0 ? (
              <Button
                type="button"
                kind="ghost"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft size={16} />
                Voltar
              </Button>
            ) : (
              <span className="muted small">
                Seu destino ainda não foi escrito.
              </span>
            )}
            <Button
              type="submit"
              kind="primary"
              disabled={busy || (step === 2 && !account)}
            >
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : step === 2 ? (
                <Sparkles size={17} />
              ) : null}
              {step < 2
                ? "Continuar"
                : joining
                  ? "Entrar na mesa"
                  : "Criar minha aventura"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
