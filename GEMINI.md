# Mestre IA com Gemini

O adaptador servidor está em `server/ai/gemini.mjs`, conectado ao Mestre em `server/master.mjs`. Ele exige validação de domínio e não modifica fichas, dados ou inventário diretamente. O motor em `server/engine.mjs` controla as mecânicas.

1. Crie uma chave em https://aistudio.google.com/api-keys usando um projeto elegível à faixa gratuita.
2. Na pasta do projeto, execute `pwsh -File ./scripts/configurar-gemini.ps1`. Cole a chave no campo oculto do terminal, nunca no chat.
3. Execute `node ./scripts/verificar-gemini.mjs` para testar a conexão real.

O arquivo `.dev.vars` está ignorado pelo Git. Não inclua chaves em commits ou arquivos públicos. A configuração local não configura automaticamente o segredo na hospedagem.

Modelo inicial: `gemini-3.5-flash-lite`; editável com `GEMINI_MODEL`. O uso gratuito tem cotas e condições da conta e, conforme a documentação, pode ser usado pelo Google para melhorar produtos. Não ative faturamento pago sem revisar os preços. A chave OpenAI existente é preservada e não é usada pelo adaptador Gemini.

Testes isolados (sem uso de API): `node --test tests/gemini.test.mjs`.

Referências consultadas em 16/11/2026:
- https://aistudio.google.com/docs/get-started
- https://aistudio.google.com/docs/structured-output
- https://aistudio.google.com/docs/pricing

Publicação no GitHub: somente após concluir e validar a aplicação, conforme solicitado.
