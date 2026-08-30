import type {
  CategoriaDespesa,
  DashboardData,
  Despesa,
  Meta,
  MetaMovimento,
  Pessoa,
  ReservaMovimento,
  ValorResumo,
} from '../types';
import {
  daysInMonth,
  dayNumber,
  fixedDueDateForMonth,
  normalizeGanhos,
  toInputDate,
} from './format';

export const STATUS_PAID = 1;
export const STATUS_PENDING = 0;
export const STATUS_LATE = 2;

export type MonthTotals = {
  total: number;
  paid: number;
  pending: number;
  late: number;
  toPay: number;
  toPayCount: number;
  gains: number;
  currentBalance: number;
  predictedBalance: number;
};

const sum = (items: Despesa[]) => items.reduce((acc, item) => acc + (item.valor || 0), 0);

/**
 * Totais do mês. Fórmulas idênticas as da versão anterior:
 * saldo atual = ganhos - pagas, saldo previsto = ganhos - total.
 */
export const monthTotals = (expenses: Despesa[], gains: number): MonthTotals => {
  const paidItems = expenses.filter(item => item.status === STATUS_PAID);
  const pendingItems = expenses.filter(item => item.status === STATUS_PENDING);
  const lateItems = expenses.filter(item => item.status === STATUS_LATE);
  const total = sum(expenses);
  const paid = sum(paidItems);
  const pending = sum(pendingItems);
  const late = sum(lateItems);
  return {
    total,
    paid,
    pending,
    late,
    toPay: pending + late,
    toPayCount: pendingItems.length + lateItems.length,
    gains,
    currentBalance: gains - paid,
    predictedBalance: gains - total,
  };
};

export const groupByDueDate = (expenses: Despesa[]) => {
  const groups = new Map<string, Despesa[]>();
  expenses.forEach(item => {
    const key = toInputDate(item.vencimento);
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
};

export const activeGains = (source: unknown): ValorResumo[] =>
  normalizeGanhos(source).filter(item => !item.logical_delete_date);

export type DayFlow = {day: number; entradas: number; saidas: number; saldo: number};

/** 'tudo' mostra o dinheiro que passa pela conta. 'próprio' tira o que e de terceiros. */
export type FlowScope = 'tudo' | 'proprio';

export type DayMovement = {day: number; valor: number};

export type FlowOptions = {
  scope?: FlowScope;
  /** Aportes em metas e reserva. Positivo sai do fluxo, negativo volta para ele. */
  aportes?: DayMovement[];
};

/**
 * Fluxo diario acumulado do mês: entradas pelo dia_entrada, saídas pelo
 * vencimento, e os aportes de metas e reserva no dia em que você os fez.
 */
export const dailyFlow = (dashboard: DashboardData, options: FlowOptions = {}): DayFlow[] => {
  const scope = options.scope || 'tudo';
  const mesId = dashboard.mes_info.id;
  const last = daysInMonth(mesId);
  const gains = activeGains(dashboard.mes_info.ganhos_mes).filter(
    item => scope === 'tudo' || !isReimbursement(item),
  );
  const despesas = dashboard.despesas.filter(item => scope === 'tudo' || isOwnExpense(item));
  const entradas = new Array<number>(last + 1).fill(0);
  const saidas = new Array<number>(last + 1).fill(0);

  gains.forEach(item => {
    const day = Math.min(Math.max(item.dia_entrada || 1, 1), last);
    entradas[day] += item.valor || 0;
  });
  despesas.forEach(item => {
    const day = Math.min(Math.max(dayNumber(item.vencimento), 1), last);
    saidas[day] += item.valor || 0;
  });
  (options.aportes || []).forEach(item => {
    const day = Math.min(Math.max(item.day, 1), last);
    if (item.valor >= 0) saidas[day] += item.valor;
    else entradas[day] += Math.abs(item.valor);
  });

  let running = 0;
  const flow: DayFlow[] = [];
  for (let day = 1; day <= last; day += 1) {
    running += entradas[day] - saidas[day];
    flow.push({day, entradas: entradas[day], saidas: saidas[day], saldo: running});
  }
  return flow;
};

export type CategorySlice = {id: string; label: string; total: number; share: number; count: number};

const CATEGORY_SLOTS = 6;

/** Fatias por categoria em ordem fixa de cor. Acima de 6, o resto vira "Outros". */
export const categoryBreakdown = (expenses: Despesa[], categorias: CategoriaDespesa[]): CategorySlice[] => {
  const label = new Map(categorias.map(item => [item.id, item.descricao]));
  const totals = new Map<string, {total: number; count: number}>();
  expenses.forEach(item => {
    const current = totals.get(item.categoriaId) || {total: 0, count: 0};
    totals.set(item.categoriaId, {total: current.total + item.valor, count: current.count + 1});
  });

  const ranked = Array.from(totals.entries())
    .map(([id, value]) => ({id, label: label.get(id) || 'Sem categoria', ...value}))
    .sort((a, b) => b.total - a.total);

  const grand = ranked.reduce((acc, item) => acc + item.total, 0);
  const head = ranked.slice(0, CATEGORY_SLOTS);
  const tail = ranked.slice(CATEGORY_SLOTS);
  const slices = head.map(item => ({...item, share: grand ? item.total / grand : 0}));

  if (tail.length) {
    const total = tail.reduce((acc, item) => acc + item.total, 0);
    slices.push({
      id: '__outros__',
      label: 'Outros',
      total,
      count: tail.reduce((acc, item) => acc + item.count, 0),
      share: grand ? total / grand : 0,
    });
  }
  return slices;
};

export const categoryTotals = (dashboard: DashboardData) => {
  const map = new Map<string, {count: number; total: number}>();
  dashboard.categoria_despesas.forEach(cat => map.set(cat.id, {count: 0, total: 0}));
  dashboard.despesas.forEach(item => {
    const current = map.get(item.categoriaId) || {count: 0, total: 0};
    map.set(item.categoriaId, {count: current.count + 1, total: current.total + item.valor});
  });
  return map;
};

export const upcomingPayments = (expenses: Despesa[]) =>
  expenses
    .filter(item => item.status !== STATUS_PAID)
    .sort((a, b) => toInputDate(a.vencimento).localeCompare(toInputDate(b.vencimento)));

export type RecurringGroup = {
  id: string;
  descricao: string;
  valor: number;
  categoriaId: string;
  proximoVencimento: string;
  sample: Despesa;
};

/** Despesas fixas do mês, uma linha por despesa_fixa_id, com a próxima ocorrencia. */
export const recurringGroups = (dashboard: DashboardData): RecurringGroup[] => {
  const groups = new Map<string, Despesa>();
  dashboard.despesas
    .filter(item => item.despesa_fixa_id)
    .forEach(item => {
      const key = item.despesa_fixa_id as string;
      const current = groups.get(key);
      if (!current || toInputDate(item.vencimento) < toInputDate(current.vencimento)) groups.set(key, item);
    });

  const [year, month] = dashboard.mes_info.id.split('-').map(Number);
  const nextMesId = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

  return Array.from(groups.entries()).map(([id, sample]) => ({
    id,
    descricao: sample.descricao,
    valor: sample.valor,
    categoriaId: sample.categoriaId,
    proximoVencimento: fixedDueDateForMonth(sample.vencimento, nextMesId),
    sample,
  }));
};

export type InstallmentGroup = {
  id: string;
  descricao: string;
  valor: number;
  parcela: number;
  totalParcelas: number;
  vencimento: string;
  sample: Despesa;
};

/** Compras parceladas visiveis no mês, uma linha por groupId. */
export const installmentGroups = (dashboard: DashboardData): InstallmentGroup[] =>
  dashboard.despesas
    .filter(item => item.totalParcelas > 1)
    .map(item => ({
      id: item.groupId || item.id,
      descricao: item.descricao,
      valor: item.valor,
      parcela: item.parcela,
      totalParcelas: item.totalParcelas,
      vencimento: item.vencimento,
      sample: item,
    }))
    .sort((a, b) => a.descricao.localeCompare(b.descricao));

export type CalendarCell = {
  key: string;
  day: number | null;
  dateInput: string;
  entradas: number;
  saidas: number;
};

/** Grade do calendário comecando na segunda-feira, com células vazias no início. */
export const calendarCells = (
  dashboard: DashboardData,
  offset: number,
  options: FlowOptions = {},
): CalendarCell[] => {
  const mesId = dashboard.mes_info.id;
  const flow = dailyFlow(dashboard, options);
  const cells: CalendarCell[] = [];
  for (let index = 0; index < offset; index += 1) {
    cells.push({key: `pad-${index}`, day: null, dateInput: '', entradas: 0, saidas: 0});
  }
  flow.forEach(item => {
    cells.push({
      key: `${mesId}-${item.day}`,
      day: item.day,
      dateInput: `${mesId}-${String(item.day).padStart(2, '0')}`,
      entradas: item.entradas,
      saidas: item.saidas,
    });
  });
  return cells;
};


// =============================================================================
// Separacao entre o que e seu e o que e de terceiros
// =============================================================================

/** Uma despesa sem pessoa vinculada e sua. */
export const isOwnExpense = (expense: Despesa) => !expense.pessoa_id;

/** Uma entrada marcada como reembolso devolve um gasto de terceiro. */
export const isReimbursement = (gain: ValorResumo) =>
  gain.origem === 'reembolso' || Boolean(gain.pessoa_id);

export const splitExpenses = (expenses: Despesa[]) => ({
  proprias: expenses.filter(isOwnExpense),
  terceiros: expenses.filter(item => !isOwnExpense(item)),
});

export const splitGains = (ganhos: ValorResumo[]) => ({
  proprias: ganhos.filter(item => !isReimbursement(item)),
  reembolsos: ganhos.filter(isReimbursement),
});

const sumGains = (ganhos: ValorResumo[]) => ganhos.reduce((acc, item) => acc + (item.valor || 0), 0);

export type MonthOverview = {
  /** Totais só do que e seu. */
  proprias: MonthTotals;
  /** Totais só do que você pagou por outra pessoa. */
  terceiros: MonthTotals;
  entradasProprias: number;
  reembolsos: number;
  aReceber: number;
  aportesMes: number;
  reservaSaldo: number;
  saldoDisponivel: number;
  saldoProjetado: number;
  saldoComReserva: number;
};

/**
 * O número que o usuário quer ver e o próprio, já descontado o que ele guardou.
 * Gasto de terceiro entra na conta do banco, mas não no seu saldo.
 */
export const monthOverview = (input: {
  expenses: Despesa[];
  ganhos: ValorResumo[];
  aportesMes: number;
  reservaSaldo: number;
}): MonthOverview => {
  const {proprias, terceiros} = splitExpenses(input.expenses);
  const gains = splitGains(input.ganhos);
  const entradasProprias = sumGains(gains.proprias);
  const reembolsos = sumGains(gains.reembolsos);

  const totaisProprias = monthTotals(proprias, entradasProprias);
  const totaisTerceiros = monthTotals(terceiros, reembolsos);

  const saldoDisponivel = entradasProprias - totaisProprias.paid - input.aportesMes;
  const saldoProjetado = entradasProprias - totaisProprias.total - input.aportesMes;

  return {
    proprias: totaisProprias,
    terceiros: totaisTerceiros,
    entradasProprias,
    reembolsos,
    aReceber: totaisTerceiros.total - reembolsos,
    aportesMes: input.aportesMes,
    reservaSaldo: input.reservaSaldo,
    saldoDisponivel,
    saldoProjetado,
    saldoComReserva: saldoProjetado + input.reservaSaldo,
  };
};

export type PessoaLedger = {
  pessoa: Pessoa;
  lancado: number;
  reembolsado: number;
  aReceber: number;
  despesas: Despesa[];
};

/** Extrato por pessoa: o que você pagou por ela e o que ela já devolveu. */
export const peopleLedger = (
  pessoas: Pessoa[],
  expenses: Despesa[],
  ganhos: ValorResumo[],
): PessoaLedger[] =>
  pessoas.map(pessoa => {
    const despesas = expenses.filter(item => item.pessoa_id === pessoa.id);
    const lancado = despesas.reduce((acc, item) => acc + item.valor, 0);
    const reembolsado = ganhos
      .filter(item => item.pessoa_id === pessoa.id)
      .reduce((acc, item) => acc + (item.valor || 0), 0);
    return {pessoa, lancado, reembolsado, aReceber: lancado - reembolsado, despesas};
  });

// =============================================================================
// Metas e reserva
// =============================================================================

type Movimento = {valor: number; tipo: string; mes_id: string; data: string};

const saldoDeMovimentos = (movimentos: Movimento[]) =>
  movimentos.reduce((acc, item) => acc + (item.tipo === 'resgate' ? -item.valor : item.valor), 0);

export const metaSaldo = (movimentos: MetaMovimento[], metaId: string) =>
  saldoDeMovimentos(movimentos.filter(item => item.meta_id === metaId));

export const reservaSaldo = (movimentos: ReservaMovimento[]) => saldoDeMovimentos(movimentos);

export const movimentosDoMes = <T extends Movimento>(movimentos: T[], mesId: string) =>
  movimentos.filter(item => item.mes_id === mesId);

/** Quanto saiu do bolso neste mês para metas e reserva, já descontados os resgates. */
export const aporteLiquidoMes = (
  metaMovimentos: MetaMovimento[],
  reservaMovimentos: ReservaMovimento[],
  mesId: string,
) =>
  saldoDeMovimentos(movimentosDoMes(metaMovimentos, mesId)) +
  saldoDeMovimentos(movimentosDoMes(reservaMovimentos, mesId));

/** Aportes do mês posicionados no dia em que aconteceram, para entrar no gráfico. */
export const aportesPorDia = (
  metaMovimentos: MetaMovimento[],
  reservaMovimentos: ReservaMovimento[],
  mesId: string,
): DayMovement[] =>
  [...movimentosDoMes(metaMovimentos, mesId), ...movimentosDoMes(reservaMovimentos, mesId)].map(item => ({
    day: dayNumber(item.data),
    valor: item.tipo === 'resgate' ? -item.valor : item.valor,
  }));

export type MetaProgress = {
  meta: Meta;
  saldo: number;
  falta: number;
  progresso: number;
  aporteNoMes: number;
};

export const metaProgress = (
  metas: Meta[],
  movimentos: MetaMovimento[],
  mesId: string,
): MetaProgress[] =>
  metas.map(meta => {
    const saldo = metaSaldo(movimentos, meta.id);
    const alvo = meta.valor_alvo || 0;
    const aporteNoMes = saldoDeMovimentos(
      movimentosDoMes(movimentos, mesId).filter(item => item.meta_id === meta.id),
    );
    return {
      meta,
      saldo,
      falta: Math.max(alvo - saldo, 0),
      progresso: alvo > 0 ? Math.min(saldo / alvo, 1) : 0,
      aporteNoMes,
    };
  });
