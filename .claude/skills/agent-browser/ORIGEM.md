# De onde veio esta skill

`github.com/vercel-labs/agent-browser` (Apache-2.0, Vercel Inc.), pasta
`skills/agent-browser/`, commit `fbd046c` (26/08/2026, versão `0.35.1`),
copiada em 30/08/2026. Copiados o `SKILL.md` e a `LICENSE` do repositório.

⚠️ **O `SKILL.md` desta pasta é um STUB de descoberta, e é assim de propósito.**
O conteúdo de verdade não está nele: está no CLI, e sai por
`agent-browser skills get core` (mais `electron`, `slack`, `dogfood`,
`derive-client`, `vercel-sandbox`, `agentcore` — `agent-browser skills list`
mostra tudo). O upstream escreve isso no `AGENTS.md` deles em letras grandes:
funcionalidade nova entra no `skill-data/core/`, **nunca** neste arquivo.

**Isso não desfaz a doutrina de copiar em vez de referenciar — confirma-a.** O
que não pode sumir é o ponteiro, e ele agora está versionado aqui. O conteúdo
que o ponteiro alcança é servido por um programa instalado nesta máquina, e por
isso ele nunca fica velho em relação ao binário: as instruções e o CLI sobem
juntos, na mesma versão. Um stub copiado não envelhece porque não tem conteúdo
para envelhecer.

## As duas alterações locais

⚠️ **`hidden: true` foi removido do frontmatter.** No upstream ele existe para
o stub não poluir o `agent-browser skills list` — o listador **do CLI** —
continuando alcançável pelo `npx skills add` (CHANGELOG deles, #1253). Aqui a
pasta não é servida pelo CLI, então a chave não tem função nenhuma; e chave de
significado alheio no frontmatter é exatamente o que o
[`SKILLS.md`](../../../SKILLS.md) descreve como o pior modo de falhar — no dia
em que alguém a interpretasse, a skill sumiria da lista **sem erro nenhum**.

**A `description` foi complementada em português**, o mesmo remendo que a
`harness` precisou. A original é só em inglês, e a descrição é a única coisa que
o modelo lê para decidir usar a skill — "confere no navegador" e "tira um print
da tela" não disparariam nada.

## Como instalar (e o que NÃO fazer)

```bash
npm install -g agent-browser
agent-browser doctor          # confere Chrome, daemon, rede
```

⚠️ **Não ponha `agent-browser` no `package.json` do `pedidaqui/web`.** O
`Dockerfile` de lá roda `npm install` no estágio `deps` — sem `--omit=dev` —,
então até em `devDependencies` ele seria baixado dentro da imagem, com o
`postinstall` que busca o binário nativo, para uma ferramenta que nunca roda em
produção. É ferramenta de quem desenvolve, não do produto.

**Não foi preciso rodar `agent-browser install` nesta máquina**: o `doctor`
encontrou o Chrome que já estava instalado. Esse comando baixa o Chrome for
Testing e só é necessário onde não há Chrome nenhum — numa VPS, por exemplo, e
lá com `--with-deps`.

⚠️ **A primeira chamada é lenta** (o daemon sobe e o Chrome abre pela primeira
vez): passou de três minutos aqui. As seguintes voltam em segundos. É fácil
confundir com travamento e matar o processo no meio.

## Como atualizar

`agent-browser upgrade` (ou `npm i -g agent-browser@latest`) atualiza o CLI **e
o conteúdo das skills junto** — é o que essa arquitetura de stub compra. O
arquivo desta pasta só precisa ser recomparado quando o upstream mexer no stub:

```bash
git clone --depth 1 https://github.com/vercel-labs/agent-browser /tmp/ab
diff -u .claude/skills/agent-browser/SKILL.md /tmp/ab/skills/agent-browser/SKILL.md
```

Leia o diff antes de sobrescrever — as duas alterações locais acima somem em
silêncio num `cp -r` por cima.

## Verificado

30/08/2026, contra a stack de teste no ar: `agent-browser open
http://localhost:3001` seguido de `snapshot -i` devolveu a árvore de
acessibilidade da landing com os `@eN` (o seletor de tema como três `radio`, os
`heading` das seções, os `link` da grade de preços).
