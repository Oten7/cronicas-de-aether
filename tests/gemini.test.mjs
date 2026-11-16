import test from "node:test";
import assert from "node:assert/strict";
import { generateStructured } from "../server/ai/gemini.mjs";
test('falha temporária recebe apenas uma nova tentativa', async () => {
  let attempts=0;
  await assert.rejects(generateStructured({env:{GEMINI_API_KEY:'test'},instruction:'test',context:{},schema:{},validate:v=>v,fetchImpl:async()=>{attempts++;return new Response('upstream secret',{status:503});}}),e=>e.code==='PROVIDER'&&!e.message.includes('upstream secret'));
  assert.equal(attempts,2);
});
const defaults = {
  env: { GEMINI_API_KEY: "test-credential-not-real" },
  instruction: "Narrar",
  context: { action: "Explorar" },
  schema: { type: "object" },
  validate: (v) => {
    if (typeof v.narrativa !== "string") throw Error();
    return v;
  },
};
test("falta de chave impede chamada ao provedor", async () => {
  await assert.rejects(
    generateStructured({
      ...defaults,
      env: {},
      fetchImpl: () => assert.fail("não deve chamar"),
    }),
    { code: "KEY_MISSING" },
  );
});
test("usa somente texto final e valida o conteúdo sem alterar contexto", async () => {
  const original = structuredClone(defaults.context);
  const result = await generateStructured({
    ...defaults,
    fetchImpl: async (url, request) => {
      assert.equal(new URL(url).host, "generativelanguage.googleapis.com");
      assert.equal(
        request.headers["x-goog-api-key"],
        defaults.env.GEMINI_API_KEY,
      );
      assert.equal(JSON.parse(request.body).store, false);
      return Response.json({
        status: "completed",
        steps: [
          { type: "thought", content: [{ type: "text", text: "Não incluir" }] },
          {
            type: "model_output",
            content: [
              { type: "text", text: '{"narrativa":"A trilha se abre."}' },
            ],
          },
        ],
      });
    },
  });
  assert.equal(result.narrativa, "A trilha se abre.");
  assert.deepEqual(defaults.context, original);
});
test("limite de uso não produz narrativa falsa nem expõe erro bruto", async () => {
  await assert.rejects(
    generateStructured({
      ...defaults,
      fetchImpl: async () => new Response("segredo", { status: 429 }),
    }),
    (e) => e.code === "QUOTA" && !e.message.includes("segredo"),
  );
});
test("rejeita JSON inválido e valores que não passam na validação", async () => {
  for (const text of ["não é JSON", '{"vida":99999}']) {
    await assert.rejects(
      generateStructured({
        ...defaults,
        fetchImpl: async () =>
          Response.json({
            status: "completed",
            steps: [
              { type: "model_output", content: [{ type: "text", text }] },
            ],
          }),
      }),
      { code: "INVALID_RESPONSE" },
    );
  }
});
test("resposta incompleta não confirma um turno", async () => {
  await assert.rejects(
    generateStructured({
      ...defaults,
      fetchImpl: async () => Response.json({ status: "in_progress" }),
    }),
    { code: "INCOMPLETE" },
  );
});
