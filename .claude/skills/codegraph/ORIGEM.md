# De onde veio esta skill

**O `SKILL.md` desta pasta foi escrito por nós**, em 24/08/2026. Nao ha skill oficial: o
`github.com/colbymchenry/codegraph` (MIT, commit `44e1812`) entrega um CLI e um
servidor MCP. As pastas `.claude/skills/` que existem la dentro sao do
desenvolvimento **do proprio CodeGraph**, nao para consumo.

⚠️ **Esta skill nao funciona sozinha.** Ela ensina a usar uma ferramenta que precisa
estar instalada (`codegraph install`) e um indice que precisa ter sido construido
(`codegraph init`). Sem os dois, o certo e ela mandar voltar para `grep` e `Read`
— e e o que ela manda.

Ao atualizar, o que se compara e o `README.md` de origem, secoes **CLI Reference** e
**MCP Tools**. A superficie MCP ja mudou uma vez: hoje so `codegraph_explore` aparece
por padrao, e as outras sete ficam ocultas atras de `CODEGRAPH_MCP_TOOLS`.
