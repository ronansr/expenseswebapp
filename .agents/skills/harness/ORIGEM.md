# De onde veio esta skill

`github.com/revfactory/harness` (Apache 2.0), pasta `skills/harness/`, commit
`cceac68`, copiada em 24/08/2026. Copiados `SKILL.md`, `references/` e a `LICENSE`.

**Uma alteracao, de proposito:** a `description` original e **so em coreano**, e uma
descricao que o modelo nao reconhece e uma skill que nunca dispara para quem escreve em
portugues. Foi acrescentada uma frase em portugues/ingles ao FIM da descricao, sem tocar
no texto coreano. O corpo do `SKILL.md` continua em coreano.

⚠️ Ao reaplicar essa frase numa atualizacao, **use aspas simples dentro dela**: a
descricao e uma string YAML entre aspas duplas, e uma aspa dupla no meio quebra o
frontmatter — a skill some da lista sem dar erro.

⚠️ **Ela ESCREVE em `.claude/agents/` e `.claude/skills/`.** E uma meta-skill: o
produto dela e um time de agentes e as skills que eles usam, criados no repositorio.
Rode com o `git status` limpo, para o diff mostrar o que ela gerou.
