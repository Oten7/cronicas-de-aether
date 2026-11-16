// Live exploratory test, never a scripted production conversation.
import { readFile, writeFile } from "node:fs/promises";
const origin = "http://127.0.0.1:5173";
const signed = await fetch(origin + "/signin-with-chatgpt?return_to=/", {
  redirect: "manual",
});
const cookie = signed.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
const { id } = JSON.parse(await readFile("outputs/live-campaign.json", "utf8"));
let c = await (
  await fetch(origin + "/api/game?id=" + id, { headers: { cookie } })
).json();
let decisions = 0,
  actions = 0;
while (!c.state.finished && decisions < 18 && actions++ < 90) {
  const s = c.state,
    h = s.heroes.local_seedy;
  let input;
  if (s.combat) {
    const e = s.combat.enemies.find((e) => e.hp > 0);
    const distance = Math.abs(e.position - s.combat.positions[h.id]);
    input = {
      type: "combat",
      target: e.id,
      action:
        h.hp < h.maxHp / 2 && h.inventory.pocao > 0
          ? "item"
          : distance > 1
            ? "move"
            : h.resource >= 3
              ? "skill"
              : "attack",
      item: "pocao",
    };
  } else if (s.pending) {
    input = { type: "resolve" };
  } else if (h.hp < h.maxHp * 0.6 && h.inventory.racao > 0) {
    input = { type: "rest" };
  } else {
    if (h.hp <= 0) break;
    const choices = s.choices;
    const choice =
      (decisions === 0 && process.argv[2]) ||
      choices.find(t => /libertar|devolver|entregar|concluir|retornar|desativar|resgatar|reunir/i.test(t)) ||
      choices.find((t) =>
        /investig|seguir|examinar|explor|aceit|entrar|abrir|devolver|entregar|libertar|desativar|proteger/i.test(
          t,
        ),
      ) ||
      choices[0] ||
      "Investigo o que posso fazer para resolver o conflito da vila.";
    input = { type: "turn", text: choice, kind: "action" };
    decisions++;
  }
  const response = await fetch(origin + "/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, cookie },
    body: JSON.stringify({ id, version: c.version, ...input }),
  });
  const next = await response.json();
  if (!response.ok) {
    console.log("PAUSED:", next.error);
    break;
  }
  c = next;
  console.log(
    JSON.stringify({
      action: actions,
      decisions,
      type: input.type,
      day: c.state.day,
      location: c.state.location,
      combat: !!c.state.combat,
      hp: c.state.heroes.local_seedy.hp,
      level: c.state.heroes.local_seedy.level,
      quests: c.state.quests.map((q) => ({ title: q.title, status: q.status })),
      finished: c.state.finished,
    }),
  );
  await writeFile(
    "outputs/playthrough-result.json",
    JSON.stringify(
      {
        decisions,
        actions,
        id,
        finished: c.state.finished,
        version: c.version,
      },
      null,
      2,
    ),
  );
  if (input.type === 'turn') await new Promise(resolve => setTimeout(resolve, 12000));
}
