---
name: codegraph
description: Grafo de codigo pre-indexado e local (CodeGraph) para responder perguntas de arquitetura sem varrer o repositorio com grep. Use quando a pergunta for "como funciona X", "quem chama esta funcao", "o que quebra se eu mudar isto", "por onde passa o fluxo de X ate Y", ou quando for preciso descobrir o raio de impacto de uma alteracao e quais testes ela afeta. Tambem use quando o usuario citar CodeGraph, pedir para indexar o projeto, ou reclamar que a busca por codigo esta gastando contexto demais.
metadata:
  upstream: "https://github.com/colbymchenry/codegraph"
  license: MIT
---

# CodeGraph — perguntar ao grafo em vez de varrer o repositorio

CodeGraph indexa o repositorio num grafo de simbolos (definicoes, chamadas, imports),
mantido em `.codegraph/` e sincronizado a cada alteracao. A pergunta de arquitetura
passa a ser **uma chamada** que devolve o codigo-fonte relevante mais os caminhos de
chamada entre ele — em vez de dez `grep` seguidos de dez `Read` de arquivo inteiro.
Roda 100% local, kernel em Rust.

⚠️ **Esta skill e um invólucro escrito por nós.** O repositorio de origem entrega um CLI
e um servidor MCP, nao um `SKILL.md`. Ver `ORIGEM.md`.

## Antes de qualquer coisa: existe indice?

```bash
codegraph status              # se o comando nao existe, nada disso vale — pule para grep/Read
```

Sem `.codegraph/` no projeto, **nao insista**: use as ferramentas normais de busca e
avise o usuario que o indice nao existe. Indexar e decisao dele, nao efeito colateral de
uma pergunta.

## Instalar (uma vez por maquina) e indexar (uma vez por projeto)

```bash
# 1. CLI — nao precisa de Node
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex   # Windows
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh  # macOS/Linux

# 2. ligar ao agente (escreve a config MCP do Codex, Cursor, Codex…)
codegraph install

# 3. indexar ESTE projeto
codegraph init
```

⚠️ **`codegraph install` nao indexa nada** e `codegraph init` nao configura agente
nenhum. Sao dois passos separados, e parar no primeiro deixa a ferramenta ligada e
vazia — o sintoma e o agente respondendo "nao ha indice" para toda pergunta.

⚠️ **Depois do `install`, o Codex precisa ser reiniciado** para carregar o servidor
MCP. Antes disso so o CLI funciona.

## Usar

Com o MCP ligado, a ferramenta e uma so: **`codegraph_explore`**. Ela responde "como
funciona X", um fluxo ("como X chega em Y") ou o levantamento de uma area, devolvendo o
fonte verbatim agrupado por arquivo, os caminhos de chamada e o raio de impacto. As
demais (`codegraph_node`, `_search`, `_callers`, `_callees`, `_impact`, `_files`,
`_status`) existem, mas ficam **fora da lista por padrao** — o que elas devolvem ja vem
embutido no `explore`.

Pela linha de comando:

```bash
codegraph explore "como o pedido do iFood entra no kanban"
codegraph node aplicar_status          # fonte do simbolo + quem o chama
codegraph callers guard_store          # quem chama
codegraph impact tenant_features       # o que quebra se mudar
codegraph affected --stdin --quiet     # quais testes a alteracao afeta (aceita git diff)
codegraph sync                         # atualizacao incremental
```

## O que nao acreditar cegamente

- **Indice atrasado mente sem errar.** A resposta MCP traz uma faixa `⚠️` nomeando os
  arquivos ainda pendentes de sincronizacao — quando ela aparecer, **leia o arquivo
  direto**. E o unico aviso que separa "resposta certa" de "resposta do codigo de dois
  minutos atras".
- **Grafo nao substitui leitura.** Ele acha o lugar; conferir a regra continua sendo ler
  o trecho. Para o que este repositorio decide em SQL (`public.tenant_features()`,
  `store_is_open()`), o grafo de simbolos nao ajuda — a regra nao esta no codigo da
  aplicacao.
- **`.codegraph/` nao vai para o git.** E indice derivado, muda a cada commit e pesa.
  Confira que ele esta no `.gitignore` antes do primeiro commit depois de indexar.
- **A ferramenta manda telemetria anonima por padrao**: `codegraph telemetry off`.
