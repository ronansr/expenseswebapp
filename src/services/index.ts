import {addMonths} from 'date-fns';
import {supabase} from '../lib/supabase';
import type {
  CategoriaDespesa,
  DashboardData,
  Despesa,
  Investimento,
  InvestimentoMovimento,
  Mes,
  Meta,
  MetaMovimento,
  OrigemAporte,
  Pessoa,
  Reserva,
  ReservaMovimento,
  TipoInvestimento,
  TipoMovimento,
  UserData,
  ValorResumo,
} from '../types';
import {
  DEFAULT_CATEGORIES,
  addMonthsIso,
  expenseStatus,
  fixedDueDateForMonth,
  normalizeGanhos,
  nowIso,
  serializeGanhos,
  totalGanhosNoMes,
  toInputDate,
  toIsoFromInputDate,
  toMesId,
  uuid,
} from '../lib/format';

const PAGE_SIZE = 1000;

const requireUser = async () => {
  const {
    data: {session},
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user) throw new Error('Sessão expirada. Entre novamente.');
  return session.user;
};

const fetchAll = async <T,>(
  table: string,
  build: (from: number, to: number) => any,
): Promise<T[]> => {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const {data, error} = await build(from, to);
    if (error) throw error;
    rows.push(...((data || []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
};

export const authService = {
  async login(email: string, password: string) {
    const {error} = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    await userService.ensureUser({email: email.trim(), password});
  },

  async register(email: string, password: string, name?: string) {
    const {data, error} = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (data.session?.user) {
      await userService.ensureUser({
        id: data.session.user.id,
        email: data.session.user.email || email.trim(),
        password,
        name: name || '',
      });
      await categoryService.ensureDefaults();
    }
  },

  async resetPassword(email: string) {
    const {error} = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  },

  async logout() {
    const {error} = await supabase.auth.signOut();
    if (error) throw error;
  },
};

export const userService = {
  normalizeGanhos,
  serializeGanhos,

  async getUser(): Promise<UserData | null> {
    const user = await requireUser();
    const {data, error} = await supabase
      .from('userdata')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {...data, ganhos_mensais: normalizeGanhos(data.ganhos_mensais ?? data.ganhos_menais)};
  },

  async ensureUser(input: Partial<UserData>): Promise<UserData> {
    const authUser = await requireUser();
    const existing = await this.getUser();
    const now = nowIso();
    const record = {
      id: authUser.id,
      name: input.name ?? existing?.name ?? '',
      email: input.email ?? authUser.email ?? existing?.email ?? '',
      password: input.password ?? existing?.password ?? '',
      image_profile: input.image_profile ?? existing?.image_profile ?? null,
      extra_data: input.extra_data ?? existing?.extra_data ?? '',
      last_update: now,
      add_date: existing?.add_date || input.add_date || now,
      account_status: input.account_status ?? existing?.account_status ?? 1,
      last_sync: now,
      last_login: now,
      logical_delete_date: input.logical_delete_date ?? existing?.logical_delete_date ?? null,
      ganhos_mensais: serializeGanhos(input.ganhos_mensais ?? existing?.ganhos_mensais ?? []),
    };
    const {error} = await supabase.from('userdata').upsert(record, {
      onConflict: 'id',
      defaultToNull: false,
    });
    if (error) throw error;
    await categoryService.ensureDefaults();
    return {...record, ganhos_mensais: normalizeGanhos(record.ganhos_mensais)};
  },

  async updateProfile(name: string, email: string, ganhosMensais: ValorResumo[]) {
    const current = await this.ensureUser({name, email, ganhos_mensais: ganhosMensais});
    const currentMes = toMesId(new Date());
    await monthService.updateGanhosForFutureMonths(ganhosMensais, currentMes);
    return current;
  },
};

export const categoryService = {
  async list(): Promise<CategoriaDespesa[]> {
    const user = await requireUser();
    return fetchAll<CategoriaDespesa>('categoriadespesa', (from, to) =>
      supabase
        .from('categoriadespesa')
        .select('*')
        .eq('user_id', user.id)
        .order('descricao', {ascending: true})
        .range(from, to),
    ).then(rows =>
      rows
        .filter(row => !row.logical_delete_date)
        .map(row => ({...row, limite_mensal: Number(row.limite_mensal) || 0})),
    );
  },

  /** Teto mensal da categoria. Zero desliga o alerta, e e o valor padrao. */
  async setLimite(id: string, limite: number) {
    const now = nowIso();
    const {error} = await supabase
      .from('categoriadespesa')
      .update({limite_mensal: Math.max(limite, 0), last_update: now, last_sync: now})
      .eq('id', id);
    if (error) throw error;
  },

  async ensureDefaults() {
    const user = await requireUser();
    const existing = await this.list();
    if (existing.length) return;
    const now = nowIso();
    const rows = DEFAULT_CATEGORIES.map(descricao => ({
      id: uuid(),
      descricao,
      user_id: user.id,
      add_date: now,
      last_update: now,
      last_sync: now,
      informacao: '',
      extra_data: '',
    }));
    const {error} = await supabase.from('categoriadespesa').upsert(rows, {onConflict: 'id'});
    if (error) throw error;
  },

  async create(descricao: string) {
    const user = await requireUser();
    const now = nowIso();
    const row: CategoriaDespesa = {
      id: uuid(),
      descricao: descricao.trim(),
      user_id: user.id,
      add_date: now,
      last_update: now,
      last_sync: now,
      informacao: '',
      extra_data: '',
    };
    const {error} = await supabase.from('categoriadespesa').insert(row);
    if (error) throw error;
    return row;
  },

  async remove(id: string) {
    const now = nowIso();
    const {error} = await supabase
      .from('categoriadespesa')
      .update({logical_delete_date: now, last_update: now, last_sync: now})
      .eq('id', id);
    if (error) throw error;
  },
};

export const monthService = {
  async list(): Promise<Mes[]> {
    const user = await requireUser();
    return fetchAll<Mes>('mes', (from, to) =>
      supabase
        .from('mes')
        .select('*')
        .eq('user_id', user.id)
        .order('id', {ascending: true})
        .range(from, to),
    ).then(rows => rows.filter(row => !row.logical_delete_date));
  },

  async ensure(mesId: string): Promise<Mes> {
    const user = await requireUser();
    const {data, error} = await supabase
      .from('mes')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', mesId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data?.logical_delete_date) return this.create(mesId);
    if (data) return {...data, ganhos_mes: normalizeGanhos(data.ganhos_mes)};

    return this.create(mesId);
  },

  async create(mesId: string): Promise<Mes> {
    const user = await requireUser();
    const profile = await userService.getUser();
    const ganhos = normalizeGanhos(profile?.ganhos_mensais);
    const total = totalGanhosNoMes(ganhos, mesId);
    const now = nowIso();
    const row = {
      id: mesId,
      date: now,
      total_ganhos: total,
      total_despesas: 0,
      extra_data: '',
      last_update: now,
      add_date: now,
      last_sync: now,
      ganhos_mes: JSON.stringify(ganhos),
      unique_id: uuid(),
      user_id: user.id,
    };
    const {error: insertError} = await supabase.from('mes').insert(row);
    if (insertError) throw insertError;
    return {...row, ganhos_mes: ganhos};
  },

  async updateGanhosMes(mes: Mes, ganhos: ValorResumo[]) {
    const now = nowIso();
    const total = totalGanhosNoMes(ganhos, mes.id);
    const {error} = await supabase
      .from('mes')
      .update({
        ganhos_mes: JSON.stringify(ganhos),
        total_ganhos: total,
        last_update: now,
        last_sync: now,
      })
      .eq('id', mes.id)
      .eq('unique_id', mes.unique_id);
    if (error) throw error;
  },

  async updateGanhosForFutureMonths(ganhos: ValorResumo[], fromMesId: string) {
    const meses = (await this.list()).filter(mes => mes.id >= fromMesId);
    for (const mes of meses) {
      const ganhosAtuais = normalizeGanhos(mes.ganhos_mes);
      const byId = new Map(ganhosAtuais.map(item => [item.id, item]));
      ganhos.forEach(ganho => byId.set(ganho.id, ganho));
      const next = Array.from(byId.values());
      await this.updateGanhosMes(mes, next);
    }
  },
};

export const expenseService = {
  async listByMonths(meses: Mes[]): Promise<Despesa[]> {
    const mesUniqueIds = meses.map(mes => mes.unique_id).filter(Boolean) as string[];
    if (!mesUniqueIds.length) return [];
    const mesIdByUnique = new Map(meses.map(mes => [mes.unique_id, mes.id]));
    const rows = await fetchAll<Despesa>('despesa', (from, to) =>
      supabase
        .from('despesa')
        .select('*')
        .in('mesUniqueId', mesUniqueIds)
        .is('logical_delete_date', null)
        .order('vencimento', {ascending: true})
        .range(from, to),
    );
    return rows.map(row => ({
      ...row,
      mesUniqueid: row.mesUniqueId || row.mesUniqueid,
      mesId: mesIdByUnique.get(row.mesUniqueId || row.mesUniqueid || '') || row.mesId,
    }));
  },

  async listByMes(mes: Mes): Promise<Despesa[]> {
    return (await this.listByMonths([mes])).filter(item => item.mesId === mes.id);
  },

  async saveMany(expenses: Despesa[]) {
    if (!expenses.length) return;
    const mesIds = Array.from(new Set(expenses.map(item => item.mesId)));
    const meses = await Promise.all(mesIds.map(id => monthService.ensure(id)));
    const uniqueByMesId = new Map(meses.map(mes => [mes.id, mes.unique_id]));
    const now = nowIso();
    const rows = expenses.map(expense => {
      const mesUniqueId = expense.mesUniqueid || expense.mesUniqueId || uniqueByMesId.get(expense.mesId);
      if (!mesUniqueId) throw new Error(`Mês ${expense.mesId} sem identificador remoto.`);
      const {mesUniqueid, ...rest} = expense;
      return {
        ...rest,
        mesUniqueId,
        add_date: expense.add_date || now,
        last_update: now,
        last_sync: now,
        extra_data: expense.extra_data || '',
        informacao: expense.informacao || '',
        groupId: expense.groupId || null,
        despesa_fixa_id: expense.despesa_fixa_id || null,
        pessoa_id: expense.pessoa_id || null,
      };
    });
    const {error} = await supabase.from('despesa').upsert(rows, {
      onConflict: 'id',
      defaultToNull: false,
    });
    if (error) throw error;
  },

  buildInstallments(input: Omit<Despesa, 'add_date' | 'last_update' | 'last_sync'>) {
    const groupId = input.totalParcelas > 1 ? input.groupId || uuid() : input.groupId || null;
    const rows: Despesa[] = [];
    for (let index = 0; index <= input.totalParcelas - input.parcela; index += 1) {
      const due = addMonthsIso(input.vencimento, index);
      rows.push({
        ...input,
        id: index === 0 ? input.id : uuid(),
        vencimento: due,
        parcela: input.parcela + index,
        groupId,
        mesId: toMesId(due),
        status: index === 0 && input.status === 1 ? 1 : expenseStatus(false, due),
      });
    }
    return rows;
  },

  async save(input: {
    id?: string;
    vencimento: string;
    descricao: string;
    categoriaId: string;
    valor: number;
    informacao?: string;
    parcela: number;
    totalParcelas: number;
    paid: boolean;
    fixa: boolean;
    pessoaId?: string | null;
    editing?: Despesa | null;
  }) {
    const dueIso = toIsoFromInputDate(input.vencimento);
    const base: Despesa = {
      id: input.id || uuid(),
      vencimento: dueIso,
      descricao: input.descricao.trim(),
      categoriaId: input.categoriaId,
      groupId: input.editing?.groupId || null,
      parcela: Number(input.parcela || 1),
      totalParcelas: Number(input.totalParcelas || 1),
      valor: input.valor,
      status: expenseStatus(input.paid, dueIso),
      informacao: input.informacao || '',
      extra_data: '',
      mesId: toMesId(dueIso),
      mesUniqueid: input.editing?.mesUniqueid || input.editing?.mesUniqueId || null,
      despesa_fixa_id: input.fixa ? input.editing?.despesa_fixa_id || uuid() : null,
      pessoa_id: input.pessoaId || null,
    };
    await this.saveMany(input.editing ? [base] : this.buildInstallments(base));
  },

  async togglePaid(expense: Despesa) {
    const now = nowIso();
    const {error} = await supabase
      .from('despesa')
      .update({status: nextStatus(expense), last_update: now, last_sync: now})
      .eq('id', expense.id);
    if (error) throw error;
  },

  async remove(expense: Despesa, mode: 'single' | 'installments' | 'fixed-all' | 'fixed-from-month' = 'single') {
    const now = nowIso();
    let query = supabase.from('despesa').update({
      logical_delete_date: now,
      last_update: now,
      last_sync: now,
    });
    if (mode === 'installments' && expense.groupId) query = query.eq('groupId', expense.groupId);
    else if (mode === 'fixed-all' && expense.despesa_fixa_id) query = query.eq('despesa_fixa_id', expense.despesa_fixa_id);
    else if (mode === 'fixed-from-month' && expense.despesa_fixa_id) {
      query = query.eq('despesa_fixa_id', expense.despesa_fixa_id).gte('mesId', expense.mesId);
    } else query = query.eq('id', expense.id);
    const {error} = await query;
    if (error) throw error;
  },

  async ensureFixedExpensesUntil(mesIdFinal: string) {
    const meses = (await monthService.list()).filter(mes => mes.id <= mesIdFinal);
    if (!meses.length) return;
    const all = await this.listByMonths(meses);
    const fixed = all.filter(item => item.despesa_fixa_id);
    const byFixed = new Map<string, Despesa[]>();
    fixed.forEach(item => {
      const key = item.despesa_fixa_id || '';
      byFixed.set(key, [...(byFixed.get(key) || []), item]);
    });
    const toCreate: Despesa[] = [];
    byFixed.forEach(items => {
      const ordered = [...items].sort((a, b) => a.mesId.localeCompare(b.mesId));
      const firstMes = ordered[0]?.mesId;
      const existing = new Set(ordered.map(item => item.mesId));
      meses.forEach(mes => {
        if (!firstMes || mes.id < firstMes || existing.has(mes.id)) return;
        const reference =
          [...ordered].filter(item => item.mesId < mes.id).sort((a, b) => b.mesId.localeCompare(a.mesId))[0] ||
          ordered[0];
        toCreate.push({
          ...reference,
          id: uuid(),
          vencimento: fixedDueDateForMonth(reference.vencimento, mes.id),
          mesId: mes.id,
          mesUniqueid: mes.unique_id,
          mesUniqueId: mes.unique_id,
          parcela: reference.parcela || 1,
          totalParcelas: reference.totalParcelas || 1,
          status: 0,
        });
        existing.add(mes.id);
      });
    });
    if (toCreate.length) await this.saveMany(toCreate);
  },
};

const nextStatus = (expense: Despesa) => {
  if (expense.status === 1) return expenseStatus(false, expense.vencimento);
  return 1;
};

export const dashboardService = {
  async get(mesId: string): Promise<DashboardData> {
    await categoryService.ensureDefaults();
    const mes = await monthService.ensure(mesId);
    await expenseService.ensureFixedExpensesUntil(mesId);
    const [categorias, despesas] = await Promise.all([
      categoryService.list(),
      expenseService.listByMes(mes),
    ]);
    return {
      mes_info: {...mes, ganhos_mes: normalizeGanhos(mes.ganhos_mes)},
      categoria_despesas: categorias,
      despesas,
    };
  },
};

const now = () => nowIso();

const stampNew = (userId: string) => ({
  user_id: userId,
  add_date: now(),
  last_update: now(),
  last_sync: now(),
});

const stampUpdate = () => ({last_update: now(), last_sync: now()});

/** Verdadeiro quando o banco reclamou de uma coluna que a migração ainda não criou. */
const colunaAusente = (error: unknown, coluna: string) =>
  String((error as {message?: string})?.message || '').includes(coluna);

/** Exclusão lógica, igual ao resto do aplicativo. Nada some do banco. */
const softDelete = async (table: string, id: string) => {
  const {error} = await supabase
    .from(table)
    .update({logical_delete_date: now(), ...stampUpdate()})
    .eq('id', id);
  if (error) throw error;
};

export const pessoaService = {
  async list(): Promise<Pessoa[]> {
    const user = await requireUser();
    return fetchAll<Pessoa>('pessoa', (from, to) =>
      supabase
        .from('pessoa')
        .select('*')
        .eq('user_id', user.id)
        .is('logical_delete_date', null)
        .order('nome', {ascending: true})
        .range(from, to),
    );
  },

  async create(nome: string, informacao = ''): Promise<Pessoa> {
    const user = await requireUser();
    const row: Pessoa = {
      id: uuid(),
      nome: nome.trim(),
      informacao,
      extra_data: '',
      ...stampNew(user.id),
    };
    const {error} = await supabase.from('pessoa').insert(row);
    if (error) throw error;
    return row;
  },

  async rename(id: string, nome: string) {
    const {error} = await supabase
      .from('pessoa')
      .update({nome: nome.trim(), ...stampUpdate()})
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Remover a pessoa não apaga o histórico: as despesas dela voltam a ser suas
   * apenas se você desvincular à mão. Aqui só marcamos a pessoa como excluída.
   */
  async remove(id: string) {
    await softDelete('pessoa', id);
  },
};

export const metaService = {
  async list(): Promise<Meta[]> {
    const user = await requireUser();
    const rows = await fetchAll<Meta>('meta', (from, to) =>
      supabase
        .from('meta')
        .select('*')
        .eq('user_id', user.id)
        .is('logical_delete_date', null)
        .order('add_date', {ascending: true})
        .range(from, to),
    );
    return rows.map(row => ({
      ...row,
      valor_alvo: Number(row.valor_alvo) || 0,
      aporte_mensal: Number(row.aporte_mensal) || 0,
    }));
  },

  async listMovimentos(): Promise<MetaMovimento[]> {
    const user = await requireUser();
    const rows = await fetchAll<MetaMovimento>('meta_movimento', (from, to) =>
      supabase
        .from('meta_movimento')
        .select('*')
        .eq('user_id', user.id)
        .is('logical_delete_date', null)
        .order('data', {ascending: true})
        .range(from, to),
    );
    return rows.map(row => ({...row, valor: Number(row.valor) || 0}));
  },

  /**
   * Cria e edita pela mesma porta. Ao editar, `add_date` e `concluida` vem do
   * registro atual: reescreve-los zeraria a ordem da lista e reabriria uma meta
   * que ja tinha sido fechada.
   */
  async save(input: {
    id?: string;
    descricao: string;
    valorAlvo: number;
    aporteMensal: number;
    dataAlvo?: string | null;
    informacao?: string;
    editando?: Meta | null;
  }): Promise<Meta> {
    const user = await requireUser();
    const row: Meta = {
      id: input.id || uuid(),
      descricao: input.descricao.trim(),
      valor_alvo: input.valorAlvo,
      aporte_mensal: input.aporteMensal,
      data_alvo: input.dataAlvo || null,
      concluida: input.editando?.concluida ?? false,
      informacao: input.informacao || '',
      extra_data: '',
      ...stampNew(user.id),
      add_date: input.editando?.add_date || now(),
    };
    const {error} = await supabase.from('meta').upsert(row, {onConflict: 'id', defaultToNull: false});
    if (error) throw error;
    return row;
  },

  async setConcluida(id: string, concluida: boolean) {
    const {error} = await supabase.from('meta').update({concluida, ...stampUpdate()}).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    await softDelete('meta', id);
  },

  async addMovimento(input: {
    metaId: string;
    mesId: string;
    valor: number;
    tipo: TipoMovimento;
    data?: string;
    informacao?: string;
  }): Promise<MetaMovimento> {
    const user = await requireUser();
    const row: MetaMovimento = {
      id: uuid(),
      meta_id: input.metaId,
      mes_id: input.mesId,
      data: input.data || now(),
      valor: Math.abs(input.valor),
      tipo: input.tipo,
      informacao: input.informacao || '',
      ...stampNew(user.id),
    };
    const {error} = await supabase.from('meta_movimento').insert(row);
    if (error) throw error;
    return row;
  },

  async removeMovimento(id: string) {
    await softDelete('meta_movimento', id);
  },
};

export const reservaService = {
  /** Uma linha por usuário. Se ainda não existir, criamos vazia. */
  async ensure(): Promise<Reserva> {
    const user = await requireUser();
    const {data, error} = await supabase
      .from('reserva')
      .select('*')
      .eq('user_id', user.id)
      .is('logical_delete_date', null)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      return {...data, objetivo: Number(data.objetivo) || 0, aporte_mensal: Number(data.aporte_mensal) || 0};
    }

    const row: Reserva = {
      id: uuid(),
      objetivo: 0,
      aporte_mensal: 0,
      informacao: '',
      extra_data: '',
      ...stampNew(user.id),
    };
    const {error: insertError} = await supabase.from('reserva').insert(row);
    if (insertError) throw insertError;
    return row;
  },

  async updateObjetivo(id: string, objetivo: number, aporteMensal: number) {
    const {error} = await supabase
      .from('reserva')
      .update({objetivo, aporte_mensal: aporteMensal, ...stampUpdate()})
      .eq('id', id);
    if (error) throw error;
  },

  async listMovimentos(): Promise<ReservaMovimento[]> {
    const user = await requireUser();
    const rows = await fetchAll<ReservaMovimento>('reserva_movimento', (from, to) =>
      supabase
        .from('reserva_movimento')
        .select('*')
        .eq('user_id', user.id)
        .is('logical_delete_date', null)
        .order('data', {ascending: true})
        .range(from, to),
    );
    return rows.map(row => ({...row, valor: Number(row.valor) || 0}));
  },

  async addMovimento(input: {
    mesId: string;
    valor: number;
    tipo: TipoMovimento;
    data?: string;
    informacao?: string;
  }): Promise<ReservaMovimento> {
    const user = await requireUser();
    const row: ReservaMovimento = {
      id: uuid(),
      mes_id: input.mesId,
      data: input.data || now(),
      valor: Math.abs(input.valor),
      tipo: input.tipo,
      informacao: input.informacao || '',
      ...stampNew(user.id),
    };
    const {error} = await supabase.from('reserva_movimento').insert(row);
    if (error) throw error;
    return row;
  },

  async removeMovimento(id: string) {
    await softDelete('reserva_movimento', id);
  },
};

export const investimentoService = {
  async list(): Promise<Investimento[]> {
    const user = await requireUser();
    const rows = await fetchAll<Investimento>('investimento', (from, to) =>
      supabase
        .from('investimento')
        .select('*')
        .eq('user_id', user.id)
        .is('logical_delete_date', null)
        .order('add_date', {ascending: true})
        .range(from, to),
    );
    /* Sem a migração 004 a coluna não existe, e nada é isento além da poupança. */
    return rows.map(row => ({
      ...row,
      indice_percentual: Number(row.indice_percentual) || 0,
      taxa_fixa: Number(row.taxa_fixa) || 0,
      isento_ir: Boolean(row.isento_ir),
    }));
  },

  async listMovimentos(): Promise<InvestimentoMovimento[]> {
    const user = await requireUser();
    const rows = await fetchAll<InvestimentoMovimento>('investimento_movimento', (from, to) =>
      supabase
        .from('investimento_movimento')
        .select('*')
        .eq('user_id', user.id)
        .is('logical_delete_date', null)
        .order('data', {ascending: true})
        .range(from, to),
    );
    /* Sem a migração 003 a coluna não existe, e origem ausente vale como 'mes'. */
    return rows.map(row => ({
      ...row,
      valor: Number(row.valor) || 0,
      origem_recurso: (row.origem_recurso as OrigemAporte) || 'mes',
    }));
  },

  /** Cria e edita pela mesma porta, preservando a data de abertura da aplicação. */
  async save(input: {
    id?: string;
    descricao: string;
    tipo: TipoInvestimento;
    indicePercentual: number;
    taxaFixa: number;
    metaId?: string | null;
    isentoIr?: boolean;
    liquidezDiaria?: boolean;
    informacao?: string;
    editando?: Investimento | null;
  }): Promise<Investimento> {
    const user = await requireUser();
    const {isento_ir, ...semIsencao} = {
      id: input.id || uuid(),
      descricao: input.descricao.trim(),
      tipo: input.tipo,
      indice_percentual: input.indicePercentual,
      taxa_fixa: input.taxaFixa,
      meta_id: input.metaId || null,
      isento_ir: input.isentoIr ?? false,
      liquidez_diaria: input.liquidezDiaria ?? true,
      informacao: input.informacao || '',
      extra_data: '',
      ...stampNew(user.id),
      add_date: input.editando?.add_date || now(),
    };
    const row: Investimento = {...semIsencao, isento_ir};

    const {error} = await supabase
      .from('investimento')
      .upsert(row, {onConflict: 'id', defaultToNull: false});
    if (error) {
      /*
       * A isenção chegou na migração 004. Enquanto ela não roda, a aplicação é
       * salva sem a marca em vez de a tela quebrar, e o cálculo trata como
       * tributada, que é o caso mais comum.
       */
      if (!colunaAusente(error, 'isento_ir')) throw error;
      const {error: semColuna} = await supabase
        .from('investimento')
        .upsert(semIsencao, {onConflict: 'id', defaultToNull: false});
      if (semColuna) throw semColuna;
      return {...row, isento_ir: false};
    }
    return row;
  },

  async remove(id: string) {
    await softDelete('investimento', id);
  },

  async addMovimento(input: {
    investimentoId: string;
    mesId: string;
    valor: number;
    tipo: TipoMovimento;
    data?: string;
    informacao?: string;
    /** 'mes' desconta do saldo do mês, 'externo' só registra o que já era seu. */
    origem?: OrigemAporte;
  }): Promise<InvestimentoMovimento> {
    const user = await requireUser();
    const {origem_recurso, ...semOrigem} = {
      id: uuid(),
      investimento_id: input.investimentoId,
      mes_id: input.mesId,
      data: input.data || now(),
      valor: Math.abs(input.valor),
      tipo: input.tipo,
      informacao: input.informacao || '',
      origem_recurso: input.origem || 'mes',
      ...stampNew(user.id),
    };
    const row: InvestimentoMovimento = {...semOrigem, origem_recurso};

    const {error} = await supabase.from('investimento_movimento').insert(row);
    if (error) {
      /*
       * A coluna chegou na migração 003. Enquanto ela não roda, o movimento
       * entra do jeito antigo, descontando do mês, em vez de a tela quebrar.
       */
      if (!colunaAusente(error, 'origem_recurso')) throw error;
      const {error: semColuna} = await supabase.from('investimento_movimento').insert(semOrigem);
      if (semColuna) throw semColuna;
      return {...row, origem_recurso: 'mes'};
    }
    return row;
  },

  /**
   * Corrige de onde veio o dinheiro de um movimento já lançado. É por aqui que
   * uma aplicação cadastrada depois do fato para de descontar do mês errado.
   */
  async setMovimentoOrigem(id: string, origem: OrigemAporte) {
    const {error} = await supabase
      .from('investimento_movimento')
      .update({origem_recurso: origem, ...stampUpdate()})
      .eq('id', id);
    if (error) {
      if (colunaAusente(error, 'origem_recurso')) {
        throw new Error(
          'Rode a migração 20260903100000 no Supabase para poder dizer de onde veio o dinheiro.',
        );
      }
      throw error;
    }
  },

  async removeMovimento(id: string) {
    await softDelete('investimento_movimento', id);
  },
};
