# Crônicas de Aether

## Baixar o aplicativo para Windows

**[Baixar Crônicas de Aether para Windows (.exe, 124 MB)](https://github.com/Oten7/cronicas-de-aether/releases/download/v1.0.0-windows/Instalar-Cronicas-de-Aether.exe)**

Instale e abra pelo atalho da área de trabalho. Esta edição tem janela própria, campanhas solo, salvamento no computador e exportação/restauração de backups. Não precisa abrir o site.

Cada jogador deve configurar sua própria chave Gemini em **Dados e Mestre IA**. Novas narrações precisam de internet e cota no provedor. Chaves e saves pessoais não estão incluídos no download. Campanhas do site e salas online não são sincronizadas com esta edição.

[Instruções completas e verificação SHA256](https://github.com/Oten7/cronicas-de-aether/releases/tag/v1.0.0-windows). Instalador para Windows 10/11 x64, ainda sem assinatura digital de editor.

## Versão web

RPG de mesa em português brasileiro com Mestre Gemini real, regras D20 no servidor e campanhas persistentes em Cloudflare D1. Esta é a primeira edição funcional, não a implementação integral de todas as expansões do projeto original.

## Funcionalidades

- Personagens com cinco raças, quatro classes, seis atributos por distribuição de pontos, identidade, origem, personalidade e objetivos.
- Campanhas solo, salas com até quatro participantes, convite por código/link, personagens vinculados às contas e chat.
- Mestre Gemini Interactions com ações livres, fala, perguntas sobre regras, escolhas sugeridas e encerramento do arco.
- Memória estruturada de personagens, NPCs, missões, locais, decisões, combate e eventos.
- Dados D4, D6, D8, D10, D12, D20 e D100, sorteio criptográfico no servidor, modificadores, CDs e registros. Testes automáticos ou solicitados manualmente.
- Combate por zonas com iniciativa, ataque, habilidade de classe, defesa, aproximação, poções, fuga e negociação. Táticas de inimigos programadas, sem chamadas de linguagem para cada ataque.
- Vida, recursos, equipamentos, inventário, compra/venda junto a comerciantes, ouro, níveis, XP, atributos e talentos validados no servidor.
- Descanso com consumo de comida, tempo, mapa de locais descobertos, diário pesquisável e anotações.
- Exportação/importação de identidade. Valores mecânicos são reiniciados em campanhas novas, sem aceitar ouro/níveis importados arbitrariamente.
- Autenticação Sites, autorização por participação, bloqueio de turno, versões e salvamento automático. Sincronização por consulta a cada quatro segundos, sem WebSockets.

## Expansões futuras

Identificadas também na interface: companheiros autônomos; cobertura e resistências elementais; árvores extensas específicas por classe; criação de classes e magias; fabricação; romances e reputação como sistemas numéricos; ressurreição por missão; retratos personalizados; desfazer ações; editor completo de regras e bestiário ilustrado. Raças são identidade narrativa nesta edição, sem bônus distintos. Os modos sem morte permanente e ressurreição recuperam o personagem por descanso.

## Executar localmente

Requisitos: Node.js 24, pnpm 11.25.0 e Git. Não requer chave OpenAI.

```sh
pnpm install --frozen-lockfile
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_living_maddog.sql
pnpm dev -- --hostname 127.0.0.1
```

Aplique a migração uma única vez por banco local. Endereço padrão: `http://127.0.0.1:5173/`.

Na prévia local, Entrar usa a identidade de desenvolvimento do starter Sites, exclusiva de loopback. Em produção, Sites autentica os visitantes. Não exponha o servidor de desenvolvimento à internet. O Worker compilado deve rodar atrás do Sites, que injeta identidade confiável.

## Mestre IA

Consulte [GEMINI.md](GEMINI.md). `scripts/configurar-gemini.ps1` recebe a chave em entrada oculta e grava `.dev.vars`, ignorado pelo Git.

```dotenv
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_API_KEY=<sua-chave-local>
```

Na hospedagem, cadastre `GEMINI_API_KEY` como segredo. Nunca publique `.dev.vars`, `.env*` ou `.sites-runtime/`. A faixa gratuita tem cotas e condições próprias. Falhas são apresentadas sem inventar narrativa.

## Arquitetura

| Local | Responsabilidade |
|---|---|
| `app/page.jsx`, `app/globals.css` | Interface responsiva e criador |
| `app/api/game/route.js` | Autorização, operações, concorrência e persistência |
| `server/engine.mjs` | Regras, sorteio, combate e progressão |
| `server/master.mjs` | Planejamento, testes, propostas e narração |
| `server/ai/gemini.mjs` | Cliente de IA com timeout e validação obrigatória |
| `lib/catalog.mjs` | Classes, raças, itens e talentos |
| `db/schema.ts`, `drizzle/` | Schema e migrações D1 |

O Mestre propõe consequências estruturadas. O servidor valida limites e aplica recompensas fixas, sem aceitar alterações livres de vida, ouro, XP ou inventário. Uma resposta inválida ou falha de narração não confirma a transação. Perguntas não avançam o mundo. Testes manuais exigem o jogador responsável.

Todos os eventos permanecem no banco. A conversa carrega os 100 mais recentes; o diário mantém os fatos estruturados antigos. O contexto da IA inclui fichas, missões, NPCs, locais e as 100 memórias mais recentes. Campanhas muito longas ainda precisam de busca semântica e compactação.

## Validação

```sh
pnpm test
node node_modules/typescript/bin/tsc --noEmit
pnpm build
node scripts/verificar-gemini.mjs
```

Os testes automatizados não chamam APIs. `tests/live-game.mjs` e `tests/playthrough.mjs` são verificações explícitas com uso real de Gemini e dados de teste na prévia local; podem consumir cota. Não execute contra produção.

Validação desta versão: 20 testes automatizados aprovados; compilação e TypeScript aprovados; criação, autenticação, concorrência e retomada verificadas pela API local. A partida exploratória com Gemini chegou à conclusão de uma missão e do arco, após exploração, combate, uso de recursos e evolução ao nível 2. As falhas transitórias do provedor preservaram o progresso. Essa partida não substitui a validação de todas as possíveis narrativas.

A revisão visual automatizada ficou pendente: a ferramenta de navegador recusou acesso à prévia local. Compilação, tipos, regras e integração do servidor foram verificados separadamente. Teste visual em celular e teste simultâneo com duas contas ainda precisam de validação.

## Hospedagem e compartilhamento

Vinext, React e Cloudflare Workers com build Sites preservado. `.openai/hosting.json` identifica a hospedagem e o binding D1 `DB`.

O site começa privado. Convites de campanha não alteram o acesso da hospedagem; amigos também precisam receber acesso ao site. O anfitrião controla configurações e cada participante controla somente a própria ficha.

## Arte

`public/aether-landscape.png` foi gerada com a ferramenta integrada de imagens. Prompt: paisagem panorâmica medieval, cidadela em ruínas sobre um penhasco, rio e vale, montanhas enevoadas, pinheiros, luzes âmbar, crepúsculo em carvão/oliva/verde-azulado, sem texto, castelo à direita e espaço escuro à esquerda.

## GitHub

Publicar somente após implementar e validar a primeira edição, conforme solicitado. Segredos, banco local, dados de teste e artefatos de execução devem permanecer fora do repositório.

## Inicializador Windows legado (código anterior)

O código descrito abaixo é o inicializador antigo do site, não o aplicativo independente distribuído na Release 1.0.0. Para instalar o aplicativo com saves locais, use o download no início desta página.

`desktop/` contém o código C# e o script de compilação do executável de acesso ao jogo online. Ele abre a publicação em uma janela do Edge com a sessão normal do navegador, ou oferece o navegador padrão se não encontrar Edge. Não incorpora servidor, chave de API nem modo offline. Windows 10/11 com .NET Framework 4.8; não requer instalação ou privilégios de administrador.

Execute `powershell -ExecutionPolicy Bypass -File desktop/build.ps1` no Windows para gerar `outputs/windows/Cronicas de Aether.exe`, o ZIP e o SHA256. A compilação usa somente recursos locais do Windows. `--check` verifica a presença do Edge sem abrir o navegador (retorno 0: encontrado; 2: ausente). Compilação, diagnóstico e conteúdo do ZIP verificados; abertura visual e login pela janela do aplicativo ainda não verificados. O binário não possui assinatura digital comercial.
