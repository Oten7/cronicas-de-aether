// Explicit live integration check: calls Gemini and uses only the local preview database.
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { attributes } from "../lib/catalog.mjs";
const origin = "http://127.0.0.1:5173";
const sign = await fetch(origin + "/signin-with-chatgpt?return_to=/", {
  redirect: "manual",
});
const cookie = sign.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
assert.ok(cookie, "Local development sign-in must return a cookie.");
async function post(body) {
  const r = await fetch(origin + "/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie, origin },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error);
  return j;
}
const unauthorized = await fetch(origin + "/api/game", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(unauthorized.status, 401);
let c = await post({
  type: "create",
  title: "Validação — O sino de Pedrafria",
  scenario: "sino",
  rules: { difficulty: "Fácil" },
  hero: {
    name: "Liora",
    race: "Elfo",
    class: "Guerreiro",
    stats: Object.fromEntries(attributes.map((a) => [a, 12])),
    origin: "Uma guarda viajante procura o irmão desaparecido.",
    goal: "Proteger a vila e descobrir por que o sino toca.",
  },
});
console.log("PASS: autenticação e criação persistente");
c = await post({
  type: "turn",
  id: c.id,
  version: c.version,
  text: "",
  kind: "action",
});
assert.ok(c.state.started);
assert.ok(c.events.some((e) => e.kind === "master" && e.content.length > 50));
console.log("PASS: introdução original recebida do Gemini");
const hp = c.state.heroes.local_seedy.hp;
c = await post({
  type: "turn",
  id: c.id,
  version: c.version,
  text: "Explique as regras de descanso. Não avance a história.",
  kind: "question",
});
assert.equal(c.state.heroes.local_seedy.hp, hp);
console.log("PASS: pergunta de regras não alterou vida");
const input = {
  type: "notes",
  id: c.id,
  version: c.version,
  text: "Teste de persistência da jornada.",
};
const duplicate = await Promise.allSettled([post(input), post(input)]);
assert.equal(duplicate.filter((r) => r.status === "fulfilled").length, 1);
c = duplicate.find((r) => r.status === "fulfilled").value;
console.log("PASS: concorrência não duplicou a ação");
const loaded = await (
  await fetch(origin + "/api/game?id=" + c.id, { headers: { cookie } })
).json();
assert.equal(loaded.state.heroes.local_seedy.notes, input.text);
assert.equal(loaded.version, c.version);
console.log("PASS: retomada preservou versão e anotações");
await mkdir("outputs", { recursive: true });
await writeFile(
  "outputs/live-campaign.json",
  JSON.stringify({ id: c.id, version: c.version, passed: true }, null, 2),
);
