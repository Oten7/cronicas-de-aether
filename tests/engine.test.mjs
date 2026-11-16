import test from "node:test";
import assert from "node:assert/strict";
import {
  newCampaign,
  newHero,
  roll,
  mechanical,
  startCombat,
  actCombat,
  experience,
  defense,
  enemyTurns,
} from "../server/engine.mjs";
import { attributes } from "../lib/catalog.mjs";
const input = () => ({
  hero: {
    name: "Liora",
    race: "Elfo",
    class: "Mago",
    stats: Object.fromEntries(attributes.map((a) => [a, 12])),
  },
});
test("vitória remove escolhas antigas e preserva adversários derrotados", () => {
  const s = newCampaign(input(), "u");
  s.npcs.push({name: "Sentinela"});
  s.choices = ["Atacar a sentinela"];
  startCombat(s, [{name: "Sentinela"}]);
  s.combat.enemies[0].hp = 0;
  enemyTurns(s);
  assert.equal(s.combat, null);
  assert.deepEqual(s.choices, []);
  assert.equal(s.defeatedEnemies[0].name, "Sentinela");
  assert.equal(s.npcs[0].defeated, true);
  assert.throws(() => startCombat(s, [{name: "Sentinela"}]));
  assert.equal(s.heroes.u.xp, 50);
});
test("atributos, classe e raça recebidos do navegador são validados", () => {
  const p = input();
  p.hero.stats.Força = 99;
  assert.throws(() => newCampaign(p, "u"));
  assert.throws(() => newHero({ ...input().hero, class: "Invencível" }, "u"));
  assert.throws(() => newHero({ ...input().hero, race: "Inventada" }, "u"));
});
test("personagem começa com valores mecânicos calculados, ignorando vida e ouro enviados", () => {
  const s = newCampaign(
    { hero: { ...input().hero, hp: 999, gold: 999999, level: 99 } },
    "u",
  );
  assert.equal(s.heroes.u.hp, 18);
  assert.equal(s.heroes.u.gold, 30);
  assert.equal(s.heroes.u.level, 1);
});
test("todos os dados ficam no intervalo e possuem identificador de auditoria", () => {
  for (const sides of [4, 6, 8, 10, 12, 20, 100])
    for (let i = 0; i < 100; i++) {
      const r = roll(sides, 2, 10);
      assert.ok(r.raw >= 1 && r.raw <= sides);
      assert.equal(r.total, r.raw + 2);
      assert.equal(r.success, r.total >= 10);
      assert.match(r.id, /^[a-f0-9-]{36}$/);
    }
  assert.throws(() => roll(3));
});
test("poção consome uma unidade e nunca ultrapassa vida máxima", () => {
  const s = newCampaign(input(), "u"),
    h = s.heroes.u;
  h.hp = h.maxHp - 1;
  mechanical(s, "u", { type: "item", item: "pocao" });
  assert.equal(h.hp, h.maxHp);
  assert.equal(h.inventory.pocao, 1);
  assert.throws(() => mechanical(s, "u", { type: "item", item: "pocao" }));
  assert.equal(h.inventory.pocao, 1);
});
test("descanso avança tempo, gasta comida e respeita morte permanente", () => {
  const s = newCampaign(input(), "u"),
    h = s.heroes.u;
  h.hp = 0;
  mechanical(s, "u", { type: "rest" });
  assert.equal(s.day, 2);
  assert.equal(s.hour, 1);
  assert.equal(h.inventory.racao, 2);
  assert.equal(h.hp, h.maxHp);
  h.dead = true;
  assert.throws(() => mechanical(s, "u", { type: "rest" }));
  assert.equal(h.inventory.racao, 2);
});
test("progressão exige experiência e cada talento só é comprado uma vez", () => {
  const s = newCampaign(input(), "u"),
    h = s.heroes.u;
  assert.throws(() => mechanical(s, "u", { type: "talent", id: "vitalidade" }));
  experience(h, 300, s);
  assert.equal(h.level, 3);
  assert.equal(h.points, 2);
  mechanical(s, "u", { type: "talent", id: "vitalidade" });
  assert.equal(h.points, 1);
  assert.throws(() => mechanical(s, "u", { type: "talent", id: "vitalidade" }));
});
test("comércio exige comerciante, saldo e posse de itens", () => {
  const s = newCampaign(input(), "u");
  assert.throws(() => mechanical(s, "u", { type: "trade", item: "pocao" }));
  s.npcs.push({ occupation: "Comerciante", location: s.location });
  mechanical(s, "u", { type: "trade", item: "pocao" });
  assert.equal(s.heroes.u.gold, 15);
  assert.equal(s.heroes.u.inventory.pocao, 3);
  assert.throws(() => mechanical(s, "u", { type: "trade", item: "armadura" }));
  assert.throws(() =>
    mechanical(s, "u", { type: "trade", item: "cajado", sell: true }),
  );
});
test("combate bloqueia outro jogador e ataques fora de alcance", () => {
  const p = input();
  p.hero.class = "Guerreiro";
  const s = newCampaign(p, "u");
  startCombat(s, [{ name: "Sentinela" }]);
  s.combat.order = [{ id: "u", enemy: false }];
  s.combat.index = 0;
  s.combat.enemies[0].position = 4;
  assert.throws(() =>
    actCombat(s, "intruso", { action: "attack", target: "enemy-0" }),
  );
  assert.throws(() =>
    actCombat(s, "u", { action: "attack", target: "enemy-0" }),
  );
  assert.throws(() => mechanical(s, "u", { type: "rest" }));
});
test("armadura equipada influencia a defesa e não pode ser vendida", () => {
  const s = newCampaign(input(), "u");
  const old = defense(s.heroes.u);
  s.heroes.u.inventory.armadura = 1;
  mechanical(s, "u", { type: "equip", item: "armadura" });
  assert.equal(defense(s.heroes.u), old + 2);
  s.npcs.push({ occupation: "Comerciante", location: s.location });
  assert.throws(() =>
    mechanical(s, "u", { type: "trade", item: "armadura", sell: true }),
  );
});
