import {addMonths} from 'date-fns';
import {supabase} from './supabase';
import type {CategoriaDespesa, DashboardData, Despesa, Mes, UserData, ValorResumo} from './types';
import {
  DEFAULT_CATEGORIES,
  addMonthsIso,
  expenseStatus,
  fixedDueDateForMonth,
  normalizeGanhos,
  nowIso,
  serializeGanhos,
  toInputDate,
  toIsoFromInputDate,
  toMesId,
  uuid,
} from './utils';

const PAGE_SIZE = 1000;

const requireUser = async () => {
  const {
    data: {session},
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user) throw new Error('Sessao expirada. Entre novamente.');
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
    ).then(rows => rows.filter(row => !row.logical_delete_date));
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
    const total = ganhos.reduce((sum, item) => sum + (item.valor || 0), 0);
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
    const total = ganhos.reduce((sum, item) => sum + (item.valor || 0), 0);
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
      if (!mesUniqueId) throw new Error(`Mes ${expense.mesId} sem identificador remoto.`);
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
