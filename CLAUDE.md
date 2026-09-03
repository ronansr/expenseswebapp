# SobControle, controle de despesas pessoais

Aplicação React + Vite + TypeScript sobre Supabase. Uma pessoa, um mês por vez:
entradas, despesas à vista, parceladas e fixas, com saldo projetado dia a dia.
Além disso, separa o dinheiro que é seu do que só passou pela sua conta, guarda
valor em metas, mantém uma reserva de emergência, acompanha investimentos com
rendimento real e avisa antes de você estourar o teto de uma categoria.

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

A migração `20260901090000_sobcontrole_investimentos_limites.sql` cria
`investimento` e `investimento_movimento`, e adiciona
`categoriadespesa.limite_mensal`. Enquanto ela não roda, a carteira aparece
vazia e o teto fica em zero: o aplicativo não quebra, só não oferece as duas
funções.

A migração `20260903100000_sobcontrole_origem_do_aporte.sql` adiciona
`investimento_movimento.origem_recurso`, que diz se o dinheiro saiu do
recebimento do mês. Enquanto ela não roda, o movimento entra como saída do mês,
que era o comportamento antigo, e a correção de origem avisa que falta rodar a
migração.

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

### Busca de despesa
`searchExpenses` filtra por nome, categoria, pessoa, observação, valor e número da
parcela, sem acento e por palavras soltas: cada termo digitado precisa aparecer em
algum lugar da despesa. Ela é **lente da tela de despesas, não filtro do mês**, e
por isso vive no estado da própria página: se entrasse em `state.expenses`, o
saldo do mês mudaria a cada letra digitada. O filtro de categoria, esse sim, é do
mês inteiro.

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

`aportes do mês` soma metas, reserva **e investimentos**, porque nos três casos o
dinheiro saiu da conta corrente mesmo continuando seu. Quem faz essa soma é
`aporteLiquidoMes`, e o mesmo conjunto alimenta `aportesPorDia` no gráfico. Do
investimento entra só o movimento marcado como saído do mês: ver
`origem_recurso` abaixo.

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

### Investimentos
Uma aplicação tem `tipo`, e o tipo diz de onde vem a taxa: `poupanca`, `cdi` e
`selic` (com `indice_percentual`, onde 110 significa 110% do índice),
`prefixado` (`taxa_fixa` em % ao ano) e `ipca` (`taxa_fixa` como juro real, com
a inflação entrando por fora).

**O rendimento nunca é gravado.** Ele é sempre derivado, em `src/lib/investments.ts`,
do tempo que cada movimento passou aplicado: um aporte de ontem não pode render
como se estivesse lá desde janeiro. CDI e Selic capitalizam em dias úteis (base
252), os demais em dias corridos. Mudar a taxa recalcula o histórico inteiro sem
migração de dados.

As taxas vêm das séries do SGS do Banco Central, em `src/services/rates.ts`:
4389 (CDI a.a.), 432 (meta Selic), 195 (poupança ao mês) e 433 (IPCA mensal,
composto em doze meses). O resultado fica em `localStorage` por doze horas. Sem
rede, cai no último valor guardado e, em último caso, no patamar do código, e
`aoVivo: false` obriga a interface a dizer que o número é estimativa. Estimativa
e extrato não podem parecer a mesma coisa na tela.

**Nem todo aporte sai do mês.** `investimento_movimento.origem_recurso` diz de
onde veio o dinheiro: `mes` desconta do saldo, `externo` só registra o que já era
seu. Cadastrar hoje uma aplicação que existe há dois anos não pode consumir o
salário deste mês, e era exatamente isso que acontecia antes da migração 003.
Quem decide é `saiuDoMes`, em `lib/selectors.ts`, e origem ausente vale como
`mes`, que preserva o histórico já lançado. O saldo bruto e o rendimento ignoram
a origem: o dinheiro está aplicado do mesmo jeito, venha de onde vier.

O extrato de cada aplicação, em `features/investments/MovementList.tsx`, deixa
corrigir a origem de um movimento já gravado. É por ali que uma carteira
cadastrada depois do fato para de descontar do mês errado.

Uma aplicação com `meta_id` preenchido vira lastro daquela meta: o progresso
passa a somar o guardado na meta mais o saldo bruto investido. O dinheiro
continua sendo um só, e o desconto do saldo do mês acontece uma vez, no
movimento que realmente aconteceu.

### Teto de gasto por categoria
`categoriadespesa.limite_mensal` guarda o teto. Zero desliga o aviso.

**O alerta é preditivo, e nunca é gravado.** `categoryAlerts` compara duas
certezas e fica com a maior: o comprometido, que é tudo já lançado no mês
inclusive o que vence depois de hoje, e o ritmo, que é o gasto por dia até agora
esticado até o último dia. A frase resultante diz onde o mês fecha e quanto dá
para gastar por dia sem estourar. Dizer "você gastou muito" depois do estouro não
muda decisão nenhuma.

### Projeção dos meses futuros
`src/lib/forecast.ts` monta a série do passado recente mais doze meses à frente.
O futuro não é chute: parcela futura já é linha no banco, porque
`buildInstallments` cria todas de uma vez. Despesa fixa só existe até o mês
aberto, então ela é projetada **em memória**, e a interface marca a barra do mês
previsto como vazada.

Gasto avulso não entra no futuro, então o real tende a ficar acima da barra, e a
tela diz isso. `marcosDeAlivio` acha os meses em que a conta cai de verdade e
nomeia o parcelamento que terminou e causou a folga.

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
    recurring/ installments/ goals/ investments/ reserve/ people/
    categories/ reports/ profile/
  hooks/        useSession, useDashboard, useLedger, useProfile, useTheme, useReveal
  lib/          supabase, format (datas e moeda), selectors (derivações),
                investments (juro composto), forecast (meses futuros), errors
  services/     acesso ao Supabase, único lugar que escreve
                rates.ts busca as séries do Banco Central
  styles/       tokens, base, layout, ui, charts, features, landing
  types/        contratos das tabelas
supabase/
  migrations/   SQL versionado do banco
```

`useDashboard` cuida do mês aberto, e `goToMonth` salta direto para um mês sem
passar pelos meses do caminho. `useLedger` cuida do que vive fora do mês
(pessoas, metas, reserva, investimentos e movimentos), porque o saldo de uma meta
é a soma de todos os aportes, não só os deste mês. As taxas de mercado seguem por
fora do `loading` da lista: a carteira aparece na hora e a taxa se acerta quando
a resposta chega. O resumo que junta os dois é
`monthOverview`, montado uma vez em `App.tsx` e passado por `PageProps`.

Regras de dependencia:
- `features/*` importa de `components`, `hooks`, `lib`, `services`. Nunca o contrario.
- `lib/selectors.ts`, `lib/investments.ts` e `lib/forecast.ts` são puros: recebem
  dados, devolvem dados. Sem `fetch`, sem estado.
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

- Barra de seleção de despesas: entra uma vez, 260ms, subindo 10px, porque
  aparecer do nada na base da tela desorienta.
- Escolha de mês no cabeçalho: popover de 140ms com origem no próprio título.

O que **não** anima, de propósito: marcar despesa como paga, alternar mês,
marcar uma despesa na seleção, navegar pela sidebar, filtrar categoria. São ações repetidas dezenas de vezes por
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
