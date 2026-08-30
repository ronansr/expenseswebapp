# SobControle, controle de despesas pessoais

Aplicação React + Vite + TypeScript sobre Supabase. Uma pessoa, um mês por vez:
entradas, despesas à vista, parceladas e fixas, com saldo projetado dia a dia.
Além disso, separa o dinheiro que é seu do que só passou pela sua conta, guarda
valor em metas e mantém uma reserva de emergência.

```
npm run dev      # vite --host 0.0.0.0
npm run build    # tsc -b && vite build
npm run preview
```

Variáveis obrigatórias em `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Sem elas o app lança no boot, de propósito.

## Banco de dados

As migrações ficam em `supabase/migrations/`, em ordem cronológica. Rode no SQL
Editor do Supabase ou por `supabase db push`. Elas são idempotentes.

A migração `20260830120000_sobcontrole_pessoas_metas_reserva.sql` cria `pessoa`,
`meta`, `meta_movimento`, `reserva` e `reserva_movimento`, adiciona
`despesa.pessoa_id` e liga RLS por `auth.uid()` nas tabelas novas.

---

## 1. Regras de negocio (não mudam sem pedido explicito)

Estas regras vieram da versão anterior e foram **preservadas na repaginação**. O
código delas mora em `src/services/index.ts` e `src/lib/format.ts`. A camada
visual nunca recalcula nada por conta própria: ela lê de `src/lib/selectors.ts`,
que só deriva, nunca grava.

### Status da despesa
`status` é um inteiro: `0` pendente, `1` pago, `2` atrasado. Atrasado é calculado,
nunca digitado: uma despesa não paga cujo vencimento é anterior a hoje fica `2`.
Alternar o pago (`togglePaid`) recalcula o status pelo vencimento, e não volta
cegamente para `0`.

### Totais do mês
```
total    = soma de todas as despesas do mês (filtradas)
paid     = soma das despesas com status 1
pending  = soma das com status 0
late     = soma das com status 2
saldo atual    = total_ganhos - paid
saldo previsto = total_ganhos - total
```
`a pagar` da interface é `pending + late`. As fórmulas de saldo são as originais.

### Parcelamento
`expenseService.buildInstallments` gera, de uma vez, da parcela atual até a
última. Todas compartilham um `groupId`. Cada parcela cai no `mesId` do próprio
vencimento (`addMonthsIso`). Apenas a primeira herda o pago; as demais nascem com
status calculado pela data.

Ao **editar** uma despesa existente, só aquele lançamento é salvo. A geração em
cadeia acontece somente na criação.

### Despesas fixas
Uma despesa fixa carrega `despesa_fixa_id`. Ao abrir um mês,
`expenseService.ensureFixedExpensesUntil` cria as ocorrências que faltam desde o
primeiro mês em que a fixa apareceu, usando `fixedDueDateForMonth` (mantém o dia
do vencimento, e encurta para o último dia quando o mês é mais curto).

### Exclusão com alcance
`expenseService.remove` aceita quatro modos, e a interface só oferece os que se
aplicam ao lançamento:
`single` sempre, `installments` se houver `groupId`, `fixed-from-month` e
`fixed-all` se houver `despesa_fixa_id`. Toda exclusão e **logica**
(`logical_delete_date`), nunca fisica. O mesmo vale para categorias.

### Ganhos
`ganhos_mes` (do mês) e `ganhos_mensais` (do perfil) são listas de `ValorResumo`
serializadas como JSON em texto. Sempre passe por `normalizeGanhos` na leitura e
`serializeGanhos` na escrita. `dia_entrada` e o dia do mês em que a entrada cai, e
é ele que posiciona a entrada na projeção diária.

Salvar o perfil (`userService.updateProfile`) **replica os ganhos recorrentes nos
meses do mês atual em diante**, por id. Esse efeito colateral é intencional.

### Separação entre o que é seu e o que é de terceiros
Uma despesa com `pessoa_id` nulo é sua. Com `pessoa_id` preenchido, você pagou
por outra pessoa: o valor sai do banco hoje, mas não entra nos seus totais.

Uma entrada (`ValorResumo`) com `origem: 'reembolso'` ou `pessoa_id` preenchido é
devolução, não receita. Ela abate a dívida da pessoa e fica fora do seu saldo.
Os dois campos são novos no JSON e não exigiram migração.

```
saldo disponível = entradas próprias - despesas próprias pagas - aportes do mês
saldo projetado  = entradas próprias - despesas próprias totais - aportes do mês
a receber        = despesas de terceiros - devoluções recebidas
```

O extrato por pessoa soma **todos os meses**, não só o aberto: uma compra
parcelada em dez vezes atravessa o ano, e o saldo devedor só faz sentido inteiro.
Quem faz isso é `usePeopleHistory`, com `monthService.list` e
`expenseService.listByMonths`.

Excluir uma pessoa é exclusão lógica e não mexe nas despesas dela. As despesas
continuam vinculadas até você reeditá-las.

### Metas
Uma meta tem `valor_alvo`, `aporte_mensal` (só como lembrete) e `data_alvo`
opcional. O saldo guardado é a soma dos `meta_movimento`, com `resgate` entrando
negativo. Nada de campo `saldo` no banco: o valor sempre vem dos movimentos.

O aporte desconta do saldo do mês em que foi feito (`mes_id` do movimento) e
aparece no gráfico de fluxo como saída, no dia do movimento. O resgate faz o
caminho inverso.

### Reserva de emergência
Uma linha por usuário, criada sob demanda por `reservaService.ensure`. O saldo é
a soma de `reserva_movimento`, pela mesma regra das metas. O `objetivo` é o
colchão que você quer alcançar, e serve só para o percentual de progresso.

A reserva não entra no saldo projetado. Ela aparece ao lado dele: quando o mês
fecha negativo, a tela mostra o rombo, quanto a reserva cobre e o que sobraria.

### Mês
`mesId` é `yyyy-MM`. Cada mês tem tambem um `unique_id`, e as despesas apontam
para ele por `mesUniqueId`. `monthService.ensure` cria o mês se não existir,
copiando os ganhos recorrentes do perfil. Ao ler despesas, `mesId` e recuperado
pelo mapa de `unique_id`, não pelo campo bruto.

### Escrita e paginação
Toda leitura de lista passa por `fetchAll`, que página de 1000 em 1000. Toda
escrita usa `upsert` com `onConflict: 'id'` e `defaultToNull: false`, para não
apagar colunas ausentes no payload.

---

## 2. Estrutura de pastas

```
src/
  app/          App.tsx, navegação, tipos de página
  components/
    layout/     Sidebar, TopBar, MobileTabBar
    ui/         Card, Modal, Field, Switch, Segmented, Skeleton, EmptyState, ...
    charts/     CashflowChart, CategoryDonut
  features/     uma pasta por área do produto
    landing/ auth/ overview/ expenses/ calendar/ income/
    recurring/ installments/ goals/ reserve/ people/
    categories/ reports/ profile/
  hooks/        useSession, useDashboard, useLedger, useProfile, useTheme, useReveal
  lib/          supabase, format (datas e moeda), selectors (derivações), errors
  services/     acesso ao Supabase, único lugar que escreve
  styles/       tokens, base, layout, ui, charts, features, landing
  types/        contratos das tabelas
supabase/
  migrations/   SQL versionado do banco
```

`useDashboard` cuida do mês aberto. `useLedger` cuida do que vive fora do mês
(pessoas, metas, reserva e movimentos), porque o saldo de uma meta é a soma de
todos os aportes, não só os deste mês. O resumo que junta os dois é
`monthOverview`, montado uma vez em `App.tsx` e passado por `PageProps`.

Regras de dependencia:
- `features/*` importa de `components`, `hooks`, `lib`, `services`. Nunca o contrario.
- `lib/selectors.ts` é puro: recebe dados, devolve dados. Sem `fetch`, sem estado.
- Efeito colateral em banco só em `services/`.
- Estado do painel vive em `useDashboard`; nada de duplicar totais em componentes.

---

## 3. Skills obrigatórias

As skills estão em `.claude/skills/` e o inventario está em `SKILLS.md`.

**Antes de escrever a marcação de qualquer tela**, invoque
`design-motion-principles`. Nesta base a pesagem é **Emil primário, Jakub
secundário** (ferramenta de produtividade e painel de dados).

Para trabalho de identidade visual, landing e redesign, invoque `taste-skill`.
Ela declara não cobrir painel e tabela de dados, entao dentro do app valem dela
apenas as partes gerais: leitura do brief, travas de cor e raio, estados de
interface, contraste, disciplina de tipografia e a lista de tells.

Para copy voltada a pessoa (landing, emails, textos de ajuda), use `stop-slop`.
Para qualquer gráfico novo, siga a skill `dataviz` antes de escolher cores.

---

## 4. Sistema visual

**Leitura de design:** ferramenta de financas pessoal, uso diario, leitura rapida
de número. `DESIGN_VARIANCE 5 / MOTION_INTENSITY 3 / VISUAL_DENSITY 6`.

### Cor
Um acento de marca, o verde (`--brand-*`). Vermelho, ambar e azul são **cores de
estado reservadas** (saída, a pagar, entrada) e nunca viram enfeite. Neutros de
uma familia fria só. Nada de preto puro, nada de brilho neon.

Tema claro e escuro são dois conjuntos escolhidos, não uma inversao automática.
Os dois vivem em `src/styles/tokens.css`; o escuro e ativado por
`data-theme="dark"` no `<html>` e persistido em `localStorage`.

### Gráficos
Paletas validadas com o script da skill `dataviz`:

- **Fluxo de caixa** (`#2a78d6` entradas, `#e34948` saídas, `#008300` saldo): o par
  verde/vermelho fica na faixa 6 a 8 de separação para daltonismo, o que exige
  **codificação secundaria**. Ela existe por construção: saldo e linha com área,
  entradas e saídas são barras em sentidos opostos a partir do zero, e o tooltip
  nomeia cada serie. Não remova essa distinção de forma.
- **Rosca de categorias**: as seis primeiras posições da paleta categórica, em
  **ordem fixa, nunca reciclada**. Três delas ficam abaixo de 3:1 no fundo claro,
  o que obriga a **legenda com rotulo, valor e percentual sempre visível**. Ela e
  quem carrega a identidade, não a cor.
- Uma escala de valor por gráfico. Eixo duplo nunca.
- Acima de seis categorias, o resto vira "Outros". Não gere cor nova.

### Forma e tipografia
Escala de raio travada: **cartao 16px, controle 10px, pílula 999px**. Sombras
tingidas no tom do fundo.

Pilha de fonte do sistema. Todo dinheiro usa `font-variant-numeric: tabular-nums`
(classes `.money` e `.num`), para as colunas alinharem e o número não dancar.

### Movimento
Emil primário: nada de animação em interação de alta frequência, nada acima de
300ms na interface. Tokens em `--dur-*` e `--ease-*`.

O que anima, e por que:
- Modal e sheet: entrada de 190ms a 260ms com `opacity + translateY + scale(.975)`.
  No mobile sobe como folha. Saída sempre mais discreta que a entrada.
- Popover de filtro: 140ms, com `transform-origin` no gatilho.
- Troca de página: 190ms, só opacidade e 4px de deslocamento, uma vez.
- Botão no `:active`: `scale(.975)`, feedback tátil imediato.
- Landing: revelação ao rolar por `IntersectionObserver`, uma vez por elemento.

O que **não** anima, de propósito: marcar despesa como paga, alternar mês,
navegar pela sidebar, filtrar categoria. São ações repetidas dezenas de vezes por
sessão, e animação ali vira atrito.

Só `transform`, `opacity` e `filter` são animados. `prefers-reduced-motion` está
tratado globalmente em `base.css` e nos pontos que dependem de JavaScript.

### Carregamento e vazio
Esqueleto com a forma do conteúdo final (`components/ui/Skeleton.tsx`). Spinner
genérico só no botão de atualizar. Todo estado vazio diz como sair dele.

### Responsivo
Ponto de virada em 1024px: abaixo dele a sidebar some e a navegação vai para a
barra inferior fixa, com o botão central de lançamento. Grades usam CSS Grid com
`auto-fit`, nunca cálculo de porcentagem em flex. Alturas cheias usam `dvh`.
`env(safe-área-inset-bottom)` no rodapé, para o iPhone.

### Tells proibidos
Sem em-dash em texto visível. Sem etiqueta numerada de seção, sem faixa decorativa
de texto, sem ponto colorido que não signifique estado real, sem nome ou avatar
falso, sem número redondo demais em dado de exemplo, sem captura de tela fake
montada com `div`. A prévia da landing usa os **componentes reais** do painel.
