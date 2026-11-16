import {
  attributes,
  classes,
  races,
  items,
  talents,
  defaultRules,
  scenarios,
} from "../lib/catalog.mjs";
export const mod = (n) => Math.floor((n - 10) / 2);
export function demand(test, message) {
  if (!test) throw new Error(message);
}
export function clean(value, max = 1000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}
export function roll(sides = 20, bonus = 0, dc = null, label = "Rolagem") {
  demand([4, 6, 8, 10, 12, 20, 100].includes(sides), "Dado inválido.");
  const limit = Math.floor(4294967296 / sides) * sides;
  let n;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= limit);
  const raw = (n % sides) + 1;
  return {
    id: crypto.randomUUID(),
    time: Date.now(),
    sides,
    raw,
    bonus,
    total: raw + bonus,
    dc,
    success: dc === null ? null : raw + bonus >= dc,
    label,
  };
}
export function newHero(input, user) {
  demand(
    input && classes[input.class] && races.includes(input.race),
    "Escolha classe e raça válidas.",
  );
  demand(clean(input.name, 60).length >= 2, "Dê um nome ao seu personagem.");
  const stats = {};
  let spent = 0;
  for (const a of attributes) {
    const v = Number(input.stats?.[a] ?? 10);
    demand(
      Number.isInteger(v) && v >= 8 && v <= 16,
      "Atributos devem estar entre 8 e 16.",
    );
    stats[a] = v;
    spent += v - 8;
  }
  demand(spent <= 24, "Você dispõe de 24 pontos acima da base 8.");
  const cls = classes[input.class],
    hp = cls.hp + mod(stats.Constituição) * 2;
  return {
    id: user,
    name: clean(input.name, 60),
    surname: clean(input.surname, 60),
    nickname: clean(input.nickname, 40),
    age: Math.max(18, Math.min(999, Number(input.age) || 25)),
    gender: clean(input.gender, 40),
    race: input.race,
    class: input.class,
    stats,
    origin: clean(input.origin),
    appearance: clean(input.appearance),
    personality: clean(input.personality),
    goal: clean(input.goal),
    fear: clean(input.fear),
    alignment: clean(input.alignment, 60),
    relations: clean(input.relations),
    hp,
    maxHp: hp,
    resource: 10,
    maxResource: 10,
    level: 1,
    xp: 0,
    gold: 30,
    weapon: cls.weapon,
    armor: false,
    inventory: { [cls.weapon]: 1, pocao: 2, racao: 3 },
    talents: [],
    points: 0,
    conditions: [],
    dead: false,
    notes: "",
  };
}
export function defense(hero) {
  return (
    10 +
    mod(hero.stats.Destreza) +
    (hero.class === "Guerreiro" ? 2 : 0) +
    (hero.armor ? 2 : 0) +
    (hero.talents.includes("guardiao") ? 1 : 0)
  );
}
export function newCampaign(input, user) {
  const hero = newHero(input.hero, user);
  const selected =
    scenarios.find((x) => x.id === input.scenario) || scenarios[0];
  const rules = { ...defaultRules };
  for (const [key, values] of Object.entries({
    difficulty: ["Fácil", "Normal", "Difícil", "Brutal"],
    tone: [
      "Aventura heroica",
      "Fantasia sombria",
      "Exploração",
      "Mistério",
      "Política medieval",
      "Sobrevivência",
      "Misturado",
    ],
    mortality: ["Sem morte permanente", "Ressurreição", "Morte permanente"],
    narrative: ["Resumida", "Equilibrada", "Detalhada"],
    dice: ["Automáticos", "Manuais"],
  }))
    if (values.includes(input.rules?.[key])) rules[key] = input.rules[key];
  return {
    title: clean(input.title, 90) || selected.title,
    scenario: selected.id,
    premise: clean(input.premise, 2000) || selected.description,
    rules,
    mode: input.mode === "multi" ? "multi" : "solo",
    heroes: { [user]: hero },
    started: false,
    finished: false,
    day: 1,
    hour: 17,
    weather: "Céu encoberto",
    location: selected.location,
    scene: "",
    locations: [{ name: selected.location, description: selected.description }],
    npcs: [],
    quests: [],
    memory: [],
    defeatedEnemies: [],
    choices: [],
    rolls: [],
    combat: null,
    pending: null,
    lastOutcome: "",
    turnCount: 0,
  };
}
export function remember(s, text) {
  s.memory.push({ day: s.day, text: clean(text, 700) });
}
export function recordRoll(s, r) {
  s.rolls.push(r);
  s.rolls = s.rolls.slice(-100);
  return r;
}
export function experience(h, amount, s) {
  h.xp += amount;
  while (h.level < s.rules.maxLevel && h.xp >= h.level * 100) {
    h.xp -= h.level * 100;
    h.level++;
    h.maxHp += 5;
    h.hp = Math.min(h.maxHp, h.hp + 5);
    h.maxResource++;
    h.resource = h.maxResource;
    h.points++;
  }
}
export function passTime(s, hours) {
  s.hour += hours;
  while (s.hour >= 24) {
    s.hour -= 24;
    s.day++;
  }
  s.weather = ["Céu encoberto", "Chuva fina", "Céu limpo", "Névoa"][s.day % 4];
}
export function startCombat(s, enemies) {
  demand(!s.combat, "Já existe um combate.");
  demand(!enemies.some(e => (s.defeatedEnemies || []).some(d => d.name.toLocaleLowerCase('pt-BR') === e.name.toLocaleLowerCase('pt-BR') && d.location === s.location)), "Este adversário já foi derrotado neste local.");
  const party = Object.values(s.heroes).filter((h) => !h.dead && h.hp > 0);
  const difficulty = { Fácil: 0.7, Normal: 1, Difícil: 1.2, Brutal: 1.5 }[
    s.rules.difficulty
  ];
  const level = Math.max(...party.map((h) => h.level));
  const foes = enemies
    .slice(0, Math.min(4, party.length + 1))
    .map((e, i) => ({
      id: "enemy-" + i,
      name: clean(e.name, 60),
      hp: Math.round((10 + level * 4) * difficulty),
      maxHp: Math.round((10 + level * 4) * difficulty),
      defense: 10 + Math.min(5, level),
      attack: 2 + level,
      damage: 6,
      position: i + 2,
    }));
  demand(foes.length > 0, "Encontro vazio.");
  const order = [
    ...party.map((h) => ({
      id: h.id,
      name: h.name,
      enemy: false,
      initiative: recordRoll(
        s,
        roll(20, mod(h.stats.Destreza), null, "Iniciativa: " + h.name),
      ).total,
    })),
    ...foes.map((e) => ({
      id: e.id,
      name: e.name,
      enemy: true,
      initiative: recordRoll(s, roll(20, 2, null, "Iniciativa: " + e.name))
        .total,
    })),
  ].sort((a, b) => b.initiative - a.initiative);
  s.combat = {
    enemies: foes,
    order,
    index: 0,
    round: 1,
    guard: {},
    log: [],
    positions: Object.fromEntries(party.map((h) => [h.id, 0])),
  };
  enemyTurns(s);
}
function damageHero(s, h, damage) {
  h.hp = Math.max(0, h.hp - damage);
  if (h.hp === 0) {
    h.conditions = ["Incapacitado"];
    if (s.rules.mortality === "Morte permanente") {
      h.dead = true;
      h.conditions = ["Morto"];
      remember(s, h.name + " morreu permanentemente.");
    }
  }
}
function finishCombat(s) {
  const c = s.combat;
  if (!c) return true;
  if (c.enemies.every((e) => e.hp <= 0)) {
    s.defeatedEnemies ||= [];
    for (const e of c.enemies) {
      s.defeatedEnemies.push({ name: e.name, location: s.location, day: s.day });
      const npc = s.npcs.find(n => n.name === e.name);
      if (npc) npc.defeated = true;
    }
    for (const h of Object.values(s.heroes)) {
      if (!h.dead) {
        experience(h, 50 * c.enemies.length, s);
        h.gold += 10 * c.enemies.length;
      }
    }
    remember(
      s,
      "Vitória contra " +
        c.enemies.map((e) => e.name).join(", ") +
        ". Recompensas entregues.",
    );
    s.lastOutcome = "Vitória! Experiência e ouro distribuídos pelo servidor.";
    s.choices = [];
    s.combat = null;
    return true;
  }
  if (Object.values(s.heroes).every((h) => h.dead || h.hp <= 0)) {
    remember(s, "O grupo foi derrotado.");
    s.lastOutcome = "O grupo foi derrotado.";
    s.choices = [];
    s.combat = null;
    return true;
  }
  return false;
}
function advance(s) {
  const c = s.combat;
  c.index = (c.index + 1) % c.order.length;
  if (c.index === 0) c.round++;
}
export function enemyTurns(s) {
  let safety = 0;
  while (s.combat && safety++ < 30) {
    if (finishCombat(s)) break;
    const c = s.combat,
      t = c.order[c.index];
    if (!t.enemy) {
      const h = s.heroes[t.id];
      if (h?.hp > 0 && !h.dead) break;
      advance(s);
      continue;
    }
    const e = c.enemies.find((x) => x.id === t.id);
    if (e.hp > 0) {
      // Rule-driven tactical AI: target the nearest living hero; ties favor lower HP.
      const targets = Object.values(s.heroes)
        .filter((h) => h.hp > 0 && !h.dead)
        .sort(
          (a, b) =>
            Math.abs(c.positions[a.id] - e.position) -
              Math.abs(c.positions[b.id] - e.position) || a.hp - b.hp,
        );
      const h = targets[0];
      if (h) {
        if (Math.abs(c.positions[h.id] - e.position) > 1)
          e.position += Math.sign(c.positions[h.id] - e.position);
        if (Math.abs(c.positions[h.id] - e.position) <= 1) {
          const attack = recordRoll(
            s,
            roll(
              20,
              e.attack,
              defense(h) + (c.guard[h.id] ? 4 : 0),
              e.name + " ataca " + h.name,
            ),
          );
          if (attack.raw === 20 || (attack.raw !== 1 && attack.success)) {
            const d =
              recordRoll(s, roll(e.damage, 1, null, "Dano de " + e.name))
                .total * (attack.raw === 20 ? 2 : 1);
            damageHero(s, h, d);
            c.log.push(e.name + " causou " + d + " de dano em " + h.name + ".");
          } else c.log.push(e.name + " errou o ataque.");
        } else c.log.push(e.name + " se aproxima.");
      }
    }
    advance(s);
  }
  finishCombat(s);
}
export function actCombat(s, user, input) {
  const h = s.heroes[user],
    c = s.combat;
  demand(c && c.order[c.index].id === user, "Aguarde seu turno.");
  demand(h.hp > 0 && !h.dead, "Seu personagem não pode agir.");
  c.guard[user] = false;
  const e = c.enemies.find((e) => e.id === input.target && e.hp > 0);
  const action = input.action;
  if (["attack", "skill"].includes(action)) {
    const healing = action === "skill" && h.class === "Clérigo";
    if (action === "skill") {
      demand(h.resource >= 3, "Recurso insuficiente.");
    }
    if (!healing) {
      demand(e, "Escolha um inimigo vivo.");
      const range = h.class === "Mago" ? 4 : 1;
      demand(
        Math.abs(c.positions[user] - e.position) <= range,
        "Alvo fora do alcance. Use Aproximar.",
      );
    }
    if (action === "skill") h.resource -= 3;
    if (healing) {
      const r = recordRoll(
        s,
        roll(8, mod(h.stats.Sabedoria) + 4, null, "Luz restauradora"),
      );
      h.hp = Math.min(h.maxHp, h.hp + r.total);
      c.log.push(h.name + " recuperou " + r.total + " de vida.");
    } else {
      const bonus =
        mod(h.stats[classes[h.class].attribute]) +
        2 +
        (h.talents.includes("precisao") ? 1 : 0);
      const a = recordRoll(
        s,
        roll(20, bonus, e.defense, h.name + " ataca " + e.name),
      );
      if (a.raw === 20 || (a.raw !== 1 && a.success)) {
        const d =
          recordRoll(
            s,
            roll(
              items[h.weapon].damage,
              Math.max(0, mod(h.stats[classes[h.class].attribute])) +
                (action === "skill" ? 4 : 0) +
                (h.talents.includes("maestria") ? 2 : 0),
              null,
              "Dano",
            ),
          ).total * (a.raw === 20 ? 2 : 1);
        e.hp = Math.max(0, e.hp - d);
        c.log.push(
          h.name +
            " causou " +
            d +
            " de dano" +
            (a.raw === 20 ? " crítico" : "") +
            ".",
        );
      } else
        c.log.push(
          h.name +
            (a.raw === 1 ? " teve uma falha crítica." : " errou o ataque."),
        );
    }
  } else if (action === "guard") {
    c.guard[user] = true;
    c.log.push(h.name + " se protege: +4 de defesa até seu próximo turno.");
  } else if (action === "move") {
    demand(e, "Escolha um inimigo.");
    c.positions[user] += Math.sign(e.position - c.positions[user]);
    c.log.push(h.name + " avançou uma zona.");
  } else if (action === "item") {
    useItem(s, h, input.item);
    c.log.push(h.name + " usou " + items[input.item].name + ".");
  } else if (action === "flee") {
    const r = recordRoll(
      s,
      roll(20, mod(h.stats.Destreza), 12, "Fuga coletiva"),
    );
    if (r.success) {
      remember(s, "O grupo escapou do combate.");
      s.combat = null;
      s.lastOutcome = "O grupo conseguiu fugir.";
      s.choices = [];
      return;
    }
    c.log.push("A fuga falhou.");
  } else throw Error("Ação inválida.");
  s.lastOutcome = c.log.slice(-1)[0];
  if (!finishCombat(s)) {
    advance(s);
    enemyTurns(s);
  }
  if (s.combat) s.combat.log = s.combat.log.slice(-40);
}
export function useItem(s, h, id) {
  demand(["pocao", "eter"].includes(id), "Este item não pode ser consumido.");
  demand(h.inventory[id] > 0, "Item indisponível.");
  demand(!h.dead && h.hp > 0, "Personagem incapacitado.");
  if (id === "pocao") {
    demand(h.hp < h.maxHp, "A vida já está completa.");
    const a = recordRoll(s, roll(6, 4, null, "Poção")),
      b = recordRoll(s, roll(6, 0, null, "Poção"));
    h.hp = Math.min(h.maxHp, h.hp + a.total + b.total);
  } else {
    demand(h.resource < h.maxResource, "O recurso já está completo.");
    h.resource = Math.min(h.maxResource, h.resource + 6);
  }
  h.inventory[id]--;
}
export function mechanical(s, user, input) {
  const h = s.heroes[user];
  demand(h, "Personagem não encontrado.");
  if (input.type === "combat") {
    actCombat(s, user, input);
    return;
  }
  if (input.type === "notes") {
    h.notes = clean(input.text, 10000);
    return;
  }
  demand(!s.combat, "Conclua sua ação pela interface de combate.");
  demand(!s.pending, "Resolva primeiro o teste pendente.");
  if (input.type === "roll") {
    demand(
      Number.isInteger(input.bonus) && Math.abs(input.bonus) <= 30,
      "Modificador inválido.",
    );
    recordRoll(
      s,
      roll(Number(input.sides), input.bonus, null, "Rolagem livre — " + h.name),
    );
    return;
  }
  if (input.type === "rest") {
    demand(!h.dead, "Morte permanente: crie outro personagem.");
    demand(h.inventory.racao > 0, "É necessária uma ração.");
    h.inventory.racao--;
    passTime(s, 8);
    h.hp = h.maxHp;
    h.resource = h.maxResource;
    h.conditions = [];
    remember(s, h.name + " descansou por 8 horas e consumiu uma ração.");
    return;
  }
  demand(!h.dead && h.hp > 0, "Seu personagem está incapacitado.");
  if (input.type === "item") {
    useItem(s, h, input.item);
    return;
  }
  if (input.type === "talent") {
    const t = talents.find((t) => t.id === input.id);
    demand(
      t && h.level >= t.level && h.points > 0 && !h.talents.includes(t.id),
      "Talento indisponível.",
    );
    h.points--;
    h.talents.push(t.id);
    if (t.id === "vitalidade") {
      h.maxHp += 6;
      h.hp += 6;
    }
    if (t.id === "foco") {
      h.maxResource += 3;
      h.resource += 3;
    }
    return;
  }
  if (input.type === "attribute") {
    demand(
      attributes.includes(input.attribute) &&
        h.points > 0 &&
        h.stats[input.attribute] < 20,
      "Atributo indisponível.",
    );
    h.points--;
    h.stats[input.attribute]++;
    return;
  }
  if (input.type === "trade") {
    const item = items[input.item];
    demand(
      item &&
        s.npcs.some(
          (n) => n.location === s.location && n.occupation === "Comerciante",
        ),
      "Encontre um comerciante nesta localização.",
    );
    if (input.sell) {
      demand(
        h.inventory[input.item] > 0 &&
          input.item !== h.weapon &&
          !(input.item === "armadura" && h.armor),
        "Item indisponível ou equipado.",
      );
      h.inventory[input.item]--;
      h.gold += Math.floor(item.value / 2);
    } else {
      demand(h.gold >= item.value, "Ouro insuficiente.");
      h.gold -= item.value;
      h.inventory[input.item] = (h.inventory[input.item] || 0) + 1;
    }
    return;
  }
  if (input.type === "equip") {
    demand(h.inventory[input.item] > 0, "Você não possui este item.");
    if (input.item === "armadura") h.armor = !h.armor;
    else {
      demand(items[input.item]?.type === "Arma", "Item não equipável.");
      h.weapon = input.item;
    }
    return;
  }
  throw Error("Operação desconhecida.");
}
