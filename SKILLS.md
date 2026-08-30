# As skills deste repositorio, e como leva-las para outro projeto

> **Nota desta copia (MeuFluxo).** Este arquivo veio do repositorio PediDaqui e
> descreve dez skills. Aqui foram copiadas oito, em `.claude/skills/`:
> `taste-skill`, `design-motion-principles`, `stop-slop`, `markitdown`,
> `codegraph`, `find-skills`, `harness` e `agent-browser`. Ficaram de fora
> `pedidaqui-marketing` e `moneyprinterturbo-video`, que so fazem sentido
> naquele produto. As obrigatorias deste projeto estao no `CLAUDE.md`.

Este arquivo é **portátil de propósito**: ele descreve cada skill que está em
[`.claude/skills/`](.claude/skills/) e diz como usá-la fora daqui, sem depender de nada
do PediDaqui. Copie este arquivo junto com as pastas.

> Skill é uma pasta com um `SKILL.md` dentro. O nome da **pasta** é o que se digita para
> invocar (`/stop-slop`), e o `description:` do frontmatter é o que faz o Claude
> resolver sozinho que ela se aplica. Não há instalador, registro nem build: a pasta
> existe, a skill existe.

---

## Onde a pasta pode ficar

| lugar | alcance | quando usar |
|---|---|---|
| `<projeto>/.claude/skills/<nome>/` | só aquele repositório | a skill é parte do padrão do projeto e precisa ir junto no `git` |
| `~/.claude/skills/<nome>/` | todos os projetos daquela máquina | ferramenta pessoal — `markitdown`, `stop-slop`, `codegraph` |

**A regra prática:** se a skill decide como o produto fica, ela pertence ao repositório
e é versionada (é o caso de `design-motion-principles` aqui). Se ela é hábito seu,
vai para o global — senão você a recopia em todo projeto novo e as cópias divergem.

```bash
# levar uma skill deste repo para outro projeto
cp -r .claude/skills/stop-slop  /caminho/do/outro/projeto/.claude/skills/

# ou torná-la global (vale em qualquer pasta, naquela máquina)
mkdir -p ~/.claude/skills && cp -r .claude/skills/stop-slop ~/.claude/skills/
```

Depois de copiar, **reinicie a sessão do Claude Code** — a lista de skills é lida na
abertura. Confira com `/skill-doctor` se alguma não aparecer.

⚠️ **`name:` do frontmatter e nome da pasta têm que ser iguais.** Divergindo, a skill
some da lista sem erro nenhum, e o sintoma é "ela simplesmente não dispara".

⚠️ **`description:` é a única coisa que o modelo lê para decidir usar a skill.** Uma
descrição vaga ("ajuda com design") nunca dispara. Ela precisa dizer *quando*, com as
palavras que a pessoa realmente digita — inclusive em português, se é em português que
você escreve. Foi por isso que a `harness` precisou de um remendo (ver o `ORIGEM.md`
dela).

⚠️ **Cada pasta COPIADA tem um `ORIGEM.md`** dizendo de qual repositório ela veio, em
qual commit, e o que foi alterado na cópia. **Leia-o antes de atualizar** — cinco das
nove têm conteúdo local que um `cp -r` por cima apaga em silêncio: `taste-skill`,
`harness` e `agent-browser` carregam uma alteração no frontmatter, e `markitdown` e
`codegraph` foram escritas inteiras por nós. A décima, `pedidaqui-marketing`, **não tem
`ORIGEM.md` porque não veio de lugar nenhum**: ela nasceu aqui e não tem upstream para
conferir.

---

## As dez skills

### `stop-slop` — tirar a cara de IA do texto
*hardikpandya/stop-slop · MIT · cópia fiel*

Regras de edição de **prosa**: corta muleta de ênfase, abertura de pigarro, advérbio,
a antítese "não é X, é Y" e as estruturas que denunciam texto gerado. Traz listas de
frases e de estruturas proibidas em `references/`.

**Use para** copy de site, e-mail, artigo de ajuda, post, README voltado a humano.
**Não use para** código, log ou documentação técnica interna — ali a repetição é
precisão, não vício.

---

### `taste-skill` — direção visual que não parece template
*Leonxlnx/taste-skill · cópia com uma linha alterada (`name`)*

Skill anti-slop de **frontend de vitrine**: lê o brief, escolhe uma direção de design
em vez do padrão genérico, e faz auditoria antes de redesenhar. É grande (~88 KB) e
contextual — nada nela dispara automaticamente.

**Use para** landing page, portfólio, página de vendas, redesign.
⚠️ **Não é para painel, tabela de dados nem fluxo de produto em várias etapas** — o
próprio arquivo diz isso na primeira linha. Ferramenta de trabalho tem outra régua.

---

### `design-motion-principles` — movimento e estados de carregamento
*kylezantos/design-motion-principles · MIT · cópia fiel*

Decide **se** algo deve animar (lente do Emil) e **como** (lente do Jakub), e audita
animação existente atrás de padrão de slop. Dois modos: criar e auditar — a auditoria
emite um relatório HTML com demonstrações em laço.

**Neste repositório ela é obrigatória**, e o `CLAUDE.md` a manda invocar antes de
escrever a marcação de qualquer tela. Levada para outro projeto, ela vira sugestão —
o que a torna obrigatória é a linha no `CLAUDE.md`, não a pasta.

---

### `markitdown` — arquivo fechado vira Markdown
*microsoft/markitdown · MIT · **o `SKILL.md` foi escrito por nós***

Converte PDF, Word, Excel, PowerPoint, imagem, áudio, HTML, CSV/JSON/XML, ZIP, EPub e
URL de YouTube em Markdown para consumo de LLM. Preserva estrutura (título, lista,
tabela, link) e descarta aparência.

**Use para** ler um contrato, uma planilha ou uma documentação em PDF que as ferramentas
normais de leitura não abrem.
**Precisa de** Python 3.10+ e `pip install 'markitdown[all]'` (ou `uvx`, sem instalar).
⚠️ **PDF escaneado sai vazio** — não há texto para extrair, e um resultado quase vazio
é fácil de confundir com "documento sem conteúdo".

---

### `codegraph` — grafo de código pré-indexado
*colbymchenry/codegraph · MIT · **o `SKILL.md` foi escrito por nós***

Indexa o repositório num grafo de símbolos, local, sincronizado a cada alteração. A
pergunta de arquitetura vira **uma** chamada que devolve o fonte relevante mais os
caminhos de chamada — em vez de dez `grep` e dez `Read`. Responde "quem chama isto",
"o que quebra se eu mudar", "quais testes esta alteração afeta".

**Precisa de** dois passos que não se substituem: `codegraph install` (liga ao agente,
via MCP) e `codegraph init` (indexa o projeto). E de reiniciar o Claude Code.
⚠️ **`.codegraph/` não vai para o git.** É índice derivado; muda a cada commit.
⚠️ Manda telemetria anônima por padrão: `codegraph telemetry off`.

---

### `agent-browser` — dirigir o navegador para conferir a tela
*vercel-labs/agent-browser · Apache 2.0 · cópia com a `description` complementada*

CLI nativo (Rust) que abre o Chrome por CDP e devolve a **árvore de acessibilidade** com
refs curtos (`@e1`, `@e2`) em vez de HTML — uma página inteira cabe em algumas centenas
de tokens. O laço é `open` → `snapshot -i` → `click @e1` / `fill @e2 "texto"` →
`snapshot` de novo. Também tira print, gera PDF, roda JavaScript, grava vídeo e guarda
sessão autenticada.

**Use para** conferir uma tela contra a stack que já está de pé (`localhost:3001`),
percorrer um fluxo inteiro — cardápio, sacola, checkout, painel —, caçar defeito de
layout e **provar** que a alteração funciona no navegador, não só no teste.

⚠️ **O `SKILL.md` daqui é um stub de propósito**: o conteúdo de verdade sai do CLI, por
`agent-browser skills get core`. É a única skill desta pasta que se atualiza sozinha —
`agent-browser upgrade` traz binário e instruções juntos, na mesma versão.
**Precisa de** `npm install -g agent-browser` e do Chrome (`agent-browser doctor` acha o
que já está instalado; `agent-browser install` baixa um onde não houver nenhum).
⚠️ **Não é dependência do `pedidaqui/web`** — o `Dockerfile` de lá roda `npm install`
sem `--omit=dev`, e ela entraria na imagem de produção. Ver o `ORIGEM.md` dela.

---

### `harness` — projetar um time de agentes
*revfactory/harness · Apache 2.0 · cópia com a `description` remendada*

Meta-skill: a partir de um domínio, ela **desenha o time de agentes**, define o papel de
cada um e **gera as skills** que eles vão usar, escrevendo em `.claude/agents/` e
`.claude/skills/`.

⚠️ **Ela escreve no repositório.** Rode com `git status` limpo, para o diff mostrar
exatamente o que ela gerou.
⚠️ **O corpo do `SKILL.md` é em coreano** (a descrição foi complementada em português).
Ela funciona, mas quem for editá-la vai precisar do original traduzido.

---

### `find-skills` — achar e instalar skill de fora
*vercel-labs/skills, pasta `skills/find-skills/` · MIT · cópia fiel*

Ensina a usar o `npx skills`, o gerenciador de pacotes do ecossistema aberto de skills:
busca no catálogo do [skills.sh](https://skills.sh/), confere reputação antes de
recomendar (contagem de instalações, autor, estrelas do repositório) e instala.

**Use quando** a pergunta for "existe uma skill para X?" ou quando faltar aqui uma
capacidade que provavelmente já existe pronta.
⚠️ **É a única skill daqui que instala outras.** O passo final dela roda
`npx skills add <owner/repo@skill> -g -y` — global e sem perguntar. Instalar skill de
terceiro é trazer instrução que o modelo vai seguir: confirme antes, e prefira sem o
`-y`.
⚠️ **Ela olha para fora.** O inventário do que já está aqui é este arquivo.

---

### `pedidaqui-marketing` — campanha e post com o produto certo
*escrita aqui · versionada de propósito*

É a **única skill deste repositório que não veio de fora**, e a única que fala do
PediDaqui. Ela não ensina marketing: manda para as skills de
`coreyhaines31/marketingskills` (instaladas no global) e carrega, antes de qualquer
peça, o produto real — posicionamento, ICP, os seis segmentos, a oferta e a lista do
que **ainda não pode ser prometido**.

**Use para** post de Instagram, criativo de anúncio pago, calendário de conteúdo,
copy de página, campanha por segmento.

⚠️ **O trabalho de verdade está no arquivo de contexto, não no `SKILL.md`.** As 50
skills daquele catálogo leem `.agents/product-marketing.md` **sozinhas, antes de
perguntar qualquer coisa** — é o ponto de extensão delas. Levando esta skill para
outro projeto, o que precisa ir junto (e ser reescrito para aquele produto) é o
`.agents/product-marketing.md`; sem ele, cada skill abre um questionário e produz
peça genérica.

⚠️ **Ela existe por causa de dois erros que só acontecem aqui.** O primeiro é preço:
o produto tem doutrina de fonte única (`GET /public/plans`), e um anúncio com o valor
antigo é a mesma cópia divergente que tirou a grade escrita à mão da landing — só que
fora do repositório, onde nenhum deploy conserta. O segundo é recurso pela metade:
"avisamos seu cliente no WhatsApp automaticamente" é falso enquanto o template da Meta
não sai, e quem assina por essa frase cancela no primeiro mês.

**Depende de** `stop-slop` (toda peça passa por ela) e das quatro do catálogo:
`social`, `ad-creative`, `content-strategy`, `copywriting`.

---

### `moneyprinterturbo-video` — vídeo curto a partir de um tema
*harry0703/MoneyPrinterTurbo · MIT · cópia fiel*

De um tema ou roteiro, entrega um **MP4 pronto**: busca imagens de banco (Pexels),
gera narração por TTS, legenda e trilha. Padrão 9:16, para vertical de rede social.

⚠️ **Esta skill executa, não aconselha.** Ela instala o MoneyPrinterTurbo na sua pasta
de usuário via `uv`, roda uma geração que leva dezenas de minutos e chama APIs de
terceiro — algumas pagas. O `mpt_agent.py` ao lado do `SKILL.md` é **código executável
vindo de fora**: releia o diff dele a cada atualização, não só o `SKILL.md`.

---

## Como atualizar uma cópia

Skill copiada não recebe atualização sozinha. O caminho é:

```bash
git clone --depth 1 https://github.com/<owner>/<repo> /tmp/upstream
diff -ru .claude/skills/<nome>/ /tmp/upstream/<caminho-do-skill>/
```

Leia o diff **antes** de sobrescrever, e confira o `ORIGEM.md` da pasta: `taste-skill`
(o `name`), `harness` e `agent-browser` (a `description`, e neste também um
`hidden: true` que saiu) e as duas skills escritas por nós têm alteração local que um
`cp -r` por cima apaga em silêncio.

## Por que copiar em vez de referenciar

É a mesma decisão que o `ORIGEM.md` do `design-motion-principles` já registrava: skill
que vive num repositório de terceiro some no dia em que ele for renomeado, arquivado ou
apagado. Padrão que depende de um link externo continuar de pé não é padrão. O custo é
este arquivo — atualizar é manual, e por isso está escrito como se faz.
