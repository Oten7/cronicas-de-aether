import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  newCampaign,
  newHero,
  mechanical,
  demand,
  clean,
  remember,
} from "../../../server/engine.mjs";
import { masterTurn, resolvePending } from "../../../server/master.mjs";

export const dynamic = "force-dynamic";
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const database = () => {
  if (!env.DB) throw Error("Banco de dados ainda não configurado.");
  return env.DB;
};
async function member(db, id, user) {
  const m = await db
    .prepare("SELECT user FROM members WHERE campaign = ? AND user = ?")
    .bind(id, user)
    .first();
  demand(m, "Você não participa desta campanha.");
}
async function view(db, id, user) {
  await member(db, id, user);
  const c = await db
    .prepare("SELECT * FROM campaigns WHERE id = ?")
    .bind(id)
    .first();
  const rows = await db
    .prepare(
      "SELECT * FROM events WHERE campaign = ? ORDER BY created_at DESC LIMIT 100",
    )
    .bind(id)
    .all();
  return {
    id: c.id,
    owner: c.owner,
    version: c.version,
    updatedAt: c.updated_at,
    code: c.owner === user ? c.code : null,
    state: JSON.parse(c.state),
    events: rows.results.reverse(),
  };
}
export async function GET(request) {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return json({
        user: null,
        configured: !!env.GEMINI_API_KEY,
        campaigns: [],
      });
    const db = database();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) return json(await view(db, id, user.userId));
    const results = await db
      .prepare(
        "SELECT c.id,c.title,c.state,c.updated_at,c.owner FROM campaigns c JOIN members m ON m.campaign=c.id WHERE m.user = ? ORDER BY c.updated_at DESC",
      )
      .bind(user.userId)
      .all();
    return json({
      user: { id: user.userId, name: user.displayName },
      configured: !!env.GEMINI_API_KEY,
      campaigns: results.results.map((c) => {
        const s = JSON.parse(c.state);
        return {
          id: c.id,
          title: c.title,
          updatedAt: c.updated_at,
          hero: s.heroes[user.userId],
          location: s.location,
          mode: s.mode,
          started: s.started,
          finished: s.finished,
        };
      }),
    });
  } catch (e) {
    return json({ error: e.message || "Falha ao carregar campanhas." }, 400);
  }
}
export async function POST(request) {
  let lock = null;
  let db;
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return json({ error: "Origem inválida." }, 403);
    const user = await getChatGPTUser();
    if (!user) return json({ error: "Entre na sua conta para jogar." }, 401);
    const raw = await request.text();
    demand(raw.length < 40000, "Solicitação muito grande.");
    const input = JSON.parse(raw);
    db = database();
    const uid = user.userId;
    if (input.type === "create") {
      const s = newCampaign(input, uid),
        id = crypto.randomUUID(),
        code = crypto
          .randomUUID()
          .replaceAll("-", "")
          .slice(0, 16)
          .toUpperCase();
      await db.batch([
        db
          .prepare(
            "INSERT INTO campaigns(id,owner,title,state,version,locked_until,updated_at,code) VALUES(?,?,?,?,0,0,?,?)",
          )
          .bind(id, uid, s.title, JSON.stringify(s), Date.now(), code),
        db
          .prepare("INSERT INTO members(campaign,user) VALUES(?,?)")
          .bind(id, uid),
      ]);
      return json(await view(db, id, uid));
    }
    let id = clean(input.id, 100);
    if (input.type === "join") {
      const c = await db
        .prepare("SELECT id FROM campaigns WHERE code = ?")
        .bind(clean(input.code, 32).toUpperCase())
        .first();
      demand(c, "Código de sala não encontrado.");
      id = c.id;
    } else await member(db, id, uid);
    const row = await db
      .prepare("SELECT * FROM campaigns WHERE id = ?")
      .bind(id)
      .first();
    demand(row, "Campanha não encontrada.");
    if (input.type === "chat") {
      const content = clean(input.text, 1000);
      demand(content, "Escreva uma mensagem.");
      await db
        .prepare(
          "INSERT INTO events(id,campaign,kind,author,content,created_at) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          "chat",
          user.displayName,
          content,
          Date.now(),
        )
        .run();
      return json(await view(db, id, uid));
    }
    if (input.type !== "join")
      demand(
        input.version === row.version,
        "A campanha mudou. Atualize e tente novamente.",
      );
    const token = Date.now() + 300000;
    const acquired = await db
      .prepare(
        "UPDATE campaigns SET locked_until=? WHERE id=? AND version=? AND locked_until < ?",
      )
      .bind(token, id, row.version, Date.now())
      .run();
    demand(
      acquired.meta.changes === 1,
      "O Mestre está resolvendo outro turno. Aguarde.",
    );
    lock = { id, token };
    const s = JSON.parse(row.state);
    let response = null;
    let eventText = "";
    let eventKind = "system";
    let join = false;
    if (input.type === "join") {
      demand(
        !s.combat && !s.pending,
        "Aguarde o fim do combate ou teste para entrar.",
      );
      demand(!s.heroes[uid], "Você já participa desta campanha.");
      demand(
        Object.keys(s.heroes).length < s.rules.maxPlayers,
        "A sala está cheia.",
      );
      s.heroes[uid] = newHero(input.hero, uid);
      s.mode = "multi";
      join = true;
      eventText = s.heroes[uid].name + " entrou na campanha.";
      remember(s, eventText);
    } else if (input.type === "turn") {
      response = await masterTurn(s, uid, input, env);
      eventKind = "master";
      eventText = response.narration;
    } else if (input.type === "resolve") {
      response = await resolvePending(s, uid, env);
      eventKind = "master";
      eventText = response.narration;
    } else if (input.type === "settings") {
      demand(row.owner === uid, "Somente o anfitrião pode alterar as regras.");
      demand(
        !s.combat && !s.pending,
        "Termine o confronto antes de editar as regras.",
      );
      if (["Fácil", "Normal", "Difícil", "Brutal"].includes(input.difficulty))
        s.rules.difficulty = input.difficulty;
      if (["Automáticos", "Manuais"].includes(input.dice))
        s.rules.dice = input.dice;
      const max = Number(input.maxPlayers);
      demand(
        Number.isInteger(max) &&
          max >= Object.keys(s.heroes).length &&
          max <= 4,
        "Limite entre os participantes atuais e 4.",
      );
      s.rules.maxPlayers = max;
      eventText = "As regras da campanha foram atualizadas pelo anfitrião.";
    } else {
      mechanical(s, uid, input);
      eventText =
        input.type === "notes"
          ? "Anotações pessoais salvas."
          : s.lastOutcome ||
            "Ação de " + s.heroes[uid].name + ": " + input.type;
    }
    const statements = [
      db
        .prepare(
          "UPDATE campaigns SET state=?,version=version+1,updated_at=? WHERE id=? AND version=? AND locked_until=?",
        )
        .bind(JSON.stringify(s), Date.now(), id, row.version, token),
    ];
    if (join)
      statements.push(
        db
          .prepare("INSERT INTO members(campaign,user) SELECT ?,? WHERE EXISTS(SELECT 1 FROM campaigns WHERE id=? AND version=? AND locked_until=?)")
          .bind(id, uid, id, row.version + 1, token),
      );
    if (input.type === "turn" && input.text)
      statements.push(
        db
          .prepare(
            "INSERT INTO events(id,campaign,kind,author,content,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM campaigns WHERE id=? AND version=? AND locked_until=?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            "player",
            s.heroes[uid].name,
            clean(input.text, 2000),
            Date.now() - 1,
            id, row.version + 1, token,
          ),
      );
    statements.push(
      db
        .prepare(
          "INSERT INTO events(id,campaign,kind,author,content,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM campaigns WHERE id=? AND version=? AND locked_until=?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          eventKind,
          eventKind === "master" ? "Mestre IA" : "Sistema",
          eventText,
          Date.now(),
          id, row.version + 1, token,
        ),
    );
    statements.push(db.prepare('UPDATE campaigns SET locked_until=0 WHERE id=? AND version=? AND locked_until=?').bind(id,row.version+1,token));
    const committed = await db.batch(statements);
    demand(
      committed[0].meta.changes === 1,
      "Conflito de salvamento. Recarregue a campanha.",
    );
    lock = null;
    return json(await view(db, id, uid));
  } catch (e) {
    return json(
      {
        error: e.message || "Não foi possível completar a ação.",
        code: e.code || "ACTION_FAILED",
      },
      e.status || 400,
    );
  } finally {
    if (lock && db)
      await db
        .prepare(
          "UPDATE campaigns SET locked_until=0 WHERE id=? AND locked_until=?",
        )
        .bind(lock.id, lock.token)
        .run();
  }
}
