// Server-only: credentials are supplied by the server environment, never by a player.
export class MestreAIError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = "MestreAIError";
    this.code = code;
    this.status = status;
  }
}

export async function generateStructured({
  env,
  instruction,
  context,
  schema,
  validate,
  fetchImpl = fetch,
}) {
  if (typeof window !== "undefined")
    throw new Error("Módulo exclusivo do servidor.");
  const key = env.GEMINI_API_KEY?.trim();
  if (!key)
    throw new MestreAIError(
      "KEY_MISSING",
      "Configure GEMINI_API_KEY no servidor para ativar o Mestre IA.",
    );
  if (typeof validate !== "function")
    throw new TypeError("Uma validação de domínio é obrigatória.");
  let response;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetchImpl(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
          "Api-Revision": "2026-05-20",
        },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          model: env.GEMINI_MODEL || "gemini-3.5-flash-lite",
          store: false,
          system_instruction: instruction,
          input: JSON.stringify(context),
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema,
          },
        }),
      },
    );
    if (response.status < 500 || attempt === 1) break;
    await response.body?.cancel();
    await new Promise(resolve => setTimeout(resolve, 750));
    }
  } catch {
    throw new MestreAIError(
      "NETWORK",
      "Não foi possível alcançar o Mestre IA. O turno não deve ser confirmado; tente novamente.",
    );
  }
  // Do not expose raw upstream errors: they may contain credential or request data.
  if (response.status === 429)
    throw new MestreAIError(
      "QUOTA",
      "O Gemini atingiu o limite de uso. Confira a cota no Google AI Studio e tente mais tarde.",
      429,
    );
  if ([401, 403].includes(response.status))
    throw new MestreAIError(
      "AUTH",
      "A chave Gemini não possui acesso ao modelo selecionado. Confira a configuração do servidor.",
    );
  if (!response.ok)
    throw new MestreAIError(
      "PROVIDER",
      `O provedor de IA não concluiu a solicitação (HTTP ${response.status}). O progresso anterior foi preservado. Tente novamente.`,
    );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new MestreAIError(
      "INVALID_RESPONSE",
      "O provedor retornou uma resposta inválida.",
    );
  }
  if (data.status !== "completed")
    throw new MestreAIError(
      "INCOMPLETE",
      "A resposta do Mestre não foi concluída.",
    );
  const text = (Array.isArray(data.steps) ? data.steps : [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => (Array.isArray(step.content) ? step.content : []))
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
  if (!text || text.length > 100000)
    throw new MestreAIError(
      "INVALID_RESPONSE",
      "O Mestre retornou uma resposta vazia ou excessiva.",
    );
  try {
    // Return only domain-validated proposals. This adapter never mutates game state.
    return validate(JSON.parse(text));
  } catch {
    throw new MestreAIError(
      "INVALID_RESPONSE",
      "A resposta do Mestre não passou pela validação. O estado do jogo deve permanecer intacto.",
    );
  }
}
