import { generateStructured, MestreAIError } from '../server/ai/gemini.mjs';
try { process.loadEnvFile(new URL('../.dev.vars', import.meta.url)); } catch {}
try {
  const result = await generateStructured({
    env: process.env,
    instruction: 'Responda em português brasileiro. Este é um teste de conexão, sem alterar qualquer campanha.',
    context: { pedido: 'Escreva uma frase curta convidando um aventureiro para uma história de fantasia.' },
    schema: { type: 'object', properties: { mensagem: { type: 'string' } }, required: ['mensagem'], additionalProperties: false },
    validate: value => { if (typeof value?.mensagem !== 'string' || value.mensagem.length > 1000) throw new Error(); return value; },
  });
  console.log(JSON.stringify({ status: 'connected', provider: 'gemini', mensagem: result.mensagem }));
} catch (error) {
  console.error(JSON.stringify({ status: 'not_connected', code: error instanceof MestreAIError ? error.code : 'CONFIGURATION', message: error instanceof MestreAIError ? error.message : 'Não foi possível ler a configuração.' }));
  process.exitCode = 1;
}
