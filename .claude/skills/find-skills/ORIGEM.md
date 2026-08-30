# De onde veio esta skill

`github.com/vercel-labs/skills` (MIT, Vercel Inc.), pasta `skills/find-skills/`, commit
`435076e`, copiada em 24/08/2026. Copiados `SKILL.md` e a `LICENSE` do repositório.

⚠️ **O nome pedido era `vercel-labs/find-skills`, e esse repositório não existe.** O
`find-skills` é uma pasta dentro de `vercel-labs/skills` — "The open agent skills tool",
o repositório do CLI `npx skills`. Ao atualizar, é lá que se procura.

⚠️ **Ela é a única skill daqui que INSTALA outras skills.** O passo 6 dela roda
`npx skills add <owner/repo@skill> -g -y` — com `-g` (global, no `~/.claude/skills/`, e
portanto valendo em todos os projetos desta máquina) e `-y` (sem perguntar). Instalar
skill de terceiro é trazer instrução que o modelo vai seguir: confirme antes, e prefira
sem o `-y`.

**O que ela NÃO faz:** procurar entre as skills que já estão neste repositório. O
inventário local é o [`SKILLS.md`](../../../SKILLS.md) da raiz — esta skill olha para
fora, para o catálogo do skills.sh.
