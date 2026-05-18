import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Filter,
  LineChart,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import {addMonths} from 'date-fns';
import {supabase} from './supabase';
import type {CategoriaDespesa, DashboardData, Despesa, ValorResumo} from './types';
import {authService, categoryService, dashboardService, expenseService, monthService, userService} from './services';
import {
  dayLabel,
  formatMoneyInput,
  money,
  monthLabel,
  normalizeGanhos,
  nowIso,
  parseMoney,
  toInputDate,
  toMesId,
  uuid,
} from './utils';
import './styles.css';

type View = 'dashboard' | 'expense' | 'profile' | 'income' | 'flow';

const statusText = (status: number) => (status === 1 ? 'Pago' : status === 2 ? 'Atrasado' : 'Pendente');

const errorMessage = (error: unknown, fallback = 'Erro ao carregar dados.') => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const supabaseError = error as {message?: string; details?: string; hint?: string; code?: string};
    return [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code]
      .filter(Boolean)
      .join(' ');
  }
  return fallback;
};

function AuthGate({onAuthenticated}: {onAuthenticated: () => void}) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'login') {
        await authService.login(email, password);
        onAuthenticated();
      }
      if (mode === 'register') {
        await authService.register(email, password, name);
        setMessage('Conta criada. Se o Supabase exigir confirmação, verifique seu email antes de entrar.');
        setMode('login');
      }
      if (mode === 'reset') {
        await authService.resetPassword(email);
        setMessage('Enviamos o link de redefinicao para seu email.');
        setMode('login');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel concluir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div className="logo-mark">E</div>
        <h1>Expenses</h1>
        <p>Acompanhe contas, receitas, parcelas e despesas fixas pelo navegador.</p>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Recuperar senha'}</h2>
        {mode === 'register' && (
          <label>
            Nome
            <input value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" />
          </label>
        )}
        <label>
          Email
          <input
            required
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="seu@email.com"
          />
        </label>
        {mode !== 'reset' && (
          <label>
            Senha
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Minimo 6 caracteres"
            />
          </label>
        )}
        {message && <p className="form-message">{message}</p>}
        <button className="primary" disabled={loading}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Enviar link'}
        </button>
        <div className="auth-links">
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Criar conta' : 'Ja tenho conta'}
          </button>
          <button type="button" onClick={() => setMode('reset')}>Esqueci minha senha</button>
        </div>
      </form>
    </main>
  );
}

function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(toMesId(new Date()));
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [editingExpense, setEditingExpense] = useState<Despesa | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const next = await dashboardService.get(currentMonth);
      setDashboard(next);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => {
      setAuthenticated(Boolean(data.session));
      setSessionReady(true);
    });
    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authenticated) loadDashboard();
  }, [authenticated, currentMonth]);

  const refresh = async () => {
    setSyncing(true);
    await loadDashboard();
    setSyncing(false);
  };

  const expenses = useMemo(() => {
    const list = dashboard?.despesas || [];
    return filterCategories.length
      ? list.filter(item => filterCategories.includes(item.categoriaId))
      : list;
  }, [dashboard, filterCategories]);

  const totals = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + item.valor, 0);
    const paid = expenses.filter(item => item.status === 1).reduce((sum, item) => sum + item.valor, 0);
    const pending = expenses.filter(item => item.status === 0).reduce((sum, item) => sum + item.valor, 0);
    const late = expenses.filter(item => item.status === 2).reduce((sum, item) => sum + item.valor, 0);
    const gains = dashboard?.mes_info.total_ganhos || 0;
    return {total, paid, pending, late, gains, currentBalance: gains - paid, predictedBalance: gains - total};
  }, [expenses, dashboard]);

  const openExpense = (expense?: Despesa) => {
    setEditingExpense(expense || null);
    setView('expense');
  };

  const afterMutation = async () => {
    setView('dashboard');
    setEditingExpense(null);
    await loadDashboard();
  };

  if (!sessionReady) return <div className="boot">Carregando Expenses...</div>;
  if (!authenticated) return <AuthGate onAuthenticated={() => setAuthenticated(true)} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Expenses Web</p>
          <h1>Contas de {monthLabel(currentMonth)}</h1>
        </div>
        <nav className="top-actions">
          <button title="Perfil" className="icon-button" onClick={() => setView('profile')}><User size={18} /></button>
          <button title="Atualizar" className="icon-button" onClick={refresh}><RefreshCw size={18} className={syncing ? 'spin' : ''} /></button>
          <button title="Sair" className="icon-button danger" onClick={async () => { await authService.logout(); setAuthenticated(false); }}><LogOut size={18} /></button>
        </nav>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {view === 'dashboard' && dashboard && (
        <DashboardView
          dashboard={dashboard}
          totals={totals}
          expenses={expenses}
          loading={loading}
          filterCategories={filterCategories}
          setFilterCategories={setFilterCategories}
          setCurrentMonth={setCurrentMonth}
          openExpense={openExpense}
          openIncome={() => setView('income')}
          openFlow={() => setView('flow')}
          reload={loadDashboard}
        />
      )}
      {view === 'expense' && dashboard && (
        <ExpenseForm
          dashboard={dashboard}
          editing={editingExpense}
          onCancel={() => setView('dashboard')}
          onSaved={afterMutation}
        />
      )}
      {view === 'profile' && dashboard && (
        <ProfileView onBack={() => setView('dashboard')} onSaved={afterMutation} />
      )}
      {view === 'income' && dashboard && (
        <IncomeMonthView dashboard={dashboard} onBack={() => setView('dashboard')} onSaved={afterMutation} />
      )}
      {view === 'flow' && dashboard && (
        <FlowView dashboard={dashboard} onBack={() => setView('dashboard')} />
      )}
    </main>
  );
}

function DashboardView({
  dashboard,
  totals,
  expenses,
  loading,
  filterCategories,
  setFilterCategories,
  setCurrentMonth,
  openExpense,
  openIncome,
  openFlow,
  reload,
}: {
  dashboard: DashboardData;
  totals: ReturnType<typeof App> extends never ? never : any;
  expenses: Despesa[];
  loading: boolean;
  filterCategories: string[];
  setFilterCategories: (ids: string[]) => void;
  setCurrentMonth: React.Dispatch<React.SetStateAction<string>>;
  openExpense: (expense?: Despesa) => void;
  openIncome: () => void;
  openFlow: () => void;
  reload: () => Promise<void>;
}) {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const grouped = useMemo(() => {
    const groups = new Map<string, Despesa[]>();
    expenses.forEach(item => {
      const key = toInputDate(item.vencimento);
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [expenses]);

  const filterTotals = useMemo(() => {
    const totalsByCategory = new Map<string, {count: number; total: number}>();
    dashboard.categoria_despesas.forEach(cat => totalsByCategory.set(cat.id, {count: 0, total: 0}));
    dashboard.despesas.forEach(item => {
      const current = totalsByCategory.get(item.categoriaId) || {count: 0, total: 0};
      totalsByCategory.set(item.categoriaId, {
        count: current.count + 1,
        total: current.total + item.valor,
      });
    });
    return totalsByCategory;
  }, [dashboard.categoria_despesas, dashboard.despesas]);

  const selectedFilterTotal = useMemo(
    () => filterCategories.reduce((sum, id) => sum + (filterTotals.get(id)?.total || 0), 0),
    [filterCategories, filterTotals],
  );

  const toggleFilter = (id: string) => {
    setFilterCategories(filterCategories.includes(id) ? filterCategories.filter(item => item !== id) : [...filterCategories, id]);
  };

  const allFilterIds = dashboard.categoria_despesas.map(cat => cat.id);

  return (
    <>
      <section className="summary-panel">
        <button className="icon-button light" onClick={() => setCurrentMonth(prev => toMesId(addMonths(new Date(`${prev}-01T12:00:00`), -1)))}><ChevronLeft size={20} /></button>
        <div className="summary-main">
          <span>Total de despesas</span>
          <strong>{money(totals.total)}</strong>
        </div>
        <button className="icon-button light" onClick={() => setCurrentMonth(prev => toMesId(addMonths(new Date(`${prev}-01T12:00:00`), 1)))}><ChevronRight size={20} /></button>
        <div className="summary-grid">
          <Metric label="Ganhos" value={totals.gains} />
          <Metric label="Ja paguei" value={totals.paid} />
          <Metric label="Pendentes" value={totals.pending} />
          <Metric label="Atrasadas" value={totals.late} tone="bad" />
          <Metric label="Saldo previsto" value={totals.predictedBalance} tone={totals.predictedBalance >= 0 ? 'good' : 'bad'} />
          <Metric label="Saldo atual" value={totals.currentBalance} tone={totals.currentBalance >= 0 ? 'good' : 'bad'} />
        </div>
      </section>

      <section className="toolbar">
        <div className="toolbar-title">
          <h2>Lista de despesas</h2>
          <p>{loading ? 'Carregando...' : `${expenses.length} despesa(s)`}</p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary" onClick={openFlow}><LineChart size={17} /> Fluxo</button>
          <button className="secondary" onClick={openIncome}><Settings size={17} /> Ganhos do mes</button>
          <button className="primary" onClick={() => openExpense()}><Plus size={18} /> Nova despesa</button>
        </div>
      </section>

      <section className="filter-bar">
        <div className="filter-menu">
          <button className="secondary filter-trigger" onClick={() => setFilterMenuOpen(open => !open)}>
            <Filter size={16} />
            Categorias
            <span>{filterCategories.length ? `${filterCategories.length} selecionada(s)` : 'Todas'}</span>
            <ChevronDown size={16} />
          </button>
          {filterMenuOpen && (
            <div className="filter-popover">
              <div className="filter-popover-head">
                <strong>Filtrar categorias</strong>
                <button className="text-button" onClick={() => setFilterCategories(allFilterIds)}>Selecionar todas</button>
              </div>
              <div className="filter-options">
                {dashboard.categoria_despesas.map(cat => {
                  const stat = filterTotals.get(cat.id) || {count: 0, total: 0};
                  return (
                    <label className="filter-option" key={cat.id}>
                      <input
                        type="checkbox"
                        checked={filterCategories.includes(cat.id)}
                        onChange={() => toggleFilter(cat.id)}
                      />
                      <span>
                        <strong>{cat.descricao}</strong>
                        <small>{stat.count} despesa(s)</small>
                      </span>
                      <b>{money(stat.total)}</b>
                    </label>
                  );
                })}
              </div>
              <div className="filter-popover-foot">
                <span>{filterCategories.length ? `${filterCategories.length} categoria(s) · ${money(selectedFilterTotal)}` : `Todas · ${money(totals.total)}`}</span>
                <button className="text-button danger" onClick={() => setFilterCategories([])}>Limpar</button>
              </div>
            </div>
          )}
        </div>
        <div className="filter-summary">
          {filterCategories.length
            ? `Mostrando ${expenses.length} despesa(s) em ${filterCategories.length} categoria(s), total ${money(totals.total)}`
            : `Mostrando todas as categorias, total ${money(totals.total)}`}
        </div>
      </section>

      <section className="expense-list">
        {grouped.length === 0 && (
          <div className="empty-state">
            <CalendarDays size={38} />
            <h3>Nenhuma despesa neste mes</h3>
            <p>Cadastre uma despesa ou ajuste os filtros de categoria.</p>
          </div>
        )}
        {grouped.map(([day, items]) => (
          <div className="day-group" key={day}>
            <div className="day-header">
              <strong>{dayLabel(day)}</strong>
              <span>{money(items.reduce((sum, item) => sum + item.valor, 0))}</span>
            </div>
            {items.map(item => (
              <ExpenseRow key={item.id} expense={item} categorias={dashboard.categoria_despesas} onEdit={() => openExpense(item)} onChanged={reload} />
            ))}
          </div>
        ))}
      </section>
    </>
  );
}

function Metric({label, value, tone}: {label: string; value: number; tone?: 'good' | 'bad'}) {
  return <div className={`metric ${tone || ''}`}><span>{label}</span><strong>{money(value)}</strong></div>;
}

function ExpenseRow({
  expense,
  categorias,
  onEdit,
  onChanged,
}: {
  expense: Despesa;
  categorias: CategoriaDespesa[];
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'installments' | 'fixed-all' | 'fixed-from-month'>('single');
  const [deleting, setDeleting] = useState(false);
  const category = categorias.find(item => item.id === expense.categoriaId)?.descricao || 'Sem categoria';
  const deleteOptions = [
    {mode: 'single' as const, title: 'Apenas esta despesa', description: 'Remove somente este lançamento do mês atual.'},
    ...(expense.groupId ? [{mode: 'installments' as const, title: 'Todas as parcelas', description: 'Remove todos os lançamentos vinculados a esta compra parcelada.'}] : []),
    ...(expense.despesa_fixa_id ? [
      {mode: 'fixed-from-month' as const, title: 'Fixa a partir deste mês', description: 'Remove esta despesa fixa deste mês em diante.'},
      {mode: 'fixed-all' as const, title: 'Fixa em todos os meses', description: 'Remove todos os lançamentos desta despesa fixa.'},
    ] : []),
  ];
  const selectedDeleteOption = deleteOptions.find(option => option.mode === deleteMode) || deleteOptions[0];
  const remove = async () => {
    setDeleting(true);
    try {
      await expenseService.remove(expense, deleteMode);
      setDeleteModalOpen(false);
      await onChanged();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className={`expense-row status-${expense.status}`}>
      <div className="expense-main">
        <div className="expense-title">
          {expense.status === 1 && <CheckCircle2 size={17} />}
          <strong>{expense.descricao}</strong>
        </div>
      </div>
      <span className="expense-meta">{category}</span>
      <span className={`status-pill status-pill-${expense.status}`}>{statusText(expense.status)}</span>
      <div className="expense-tags">
        {expense.totalParcelas > 1 && <span>Parcela {expense.parcela}/{expense.totalParcelas}</span>}
        {expense.despesa_fixa_id && <span>Fixa</span>}
      </div>
      <strong className="expense-amount">{money(expense.valor)}</strong>
      <div className="row-actions">
        <button title="Marcar pago/pendente" className="icon-button" onClick={async () => { await expenseService.togglePaid(expense); await onChanged(); }}><CheckCircle2 size={17} /></button>
        <button title="Editar" className="icon-button" onClick={onEdit}><Edit3 size={17} /></button>
        <button title="Apagar" className="icon-button danger delete-button" onClick={() => setDeleteModalOpen(true)}><Trash2 size={17} /></button>
      </div>
      {deleteModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Excluir despesa">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Excluir despesa</p>
                <h2>{expense.descricao}</h2>
              </div>
              <button className="icon-button" onClick={() => setDeleteModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="delete-options">
              {deleteOptions.map(option => (
                <button
                  key={option.mode}
                  className={deleteMode === option.mode ? 'delete-option active' : 'delete-option'}
                  onClick={() => setDeleteMode(option.mode)}>
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="confirm-box">
              <strong>Confirmar exclusao</strong>
              <p>{selectedDeleteOption.description} Esta acao nao pode ser desfeita.</p>
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setDeleteModalOpen(false)}>Cancelar</button>
              <button className="primary danger-primary" disabled={deleting} onClick={remove}>
                <Trash2 size={17} /> {deleting ? 'Excluindo...' : 'Confirmar exclusao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function ExpenseForm({dashboard, editing, onCancel, onSaved}: {
  dashboard: DashboardData;
  editing: Despesa | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    vencimento: editing ? toInputDate(editing.vencimento) : `${dashboard.mes_info.id}-01`,
    descricao: editing?.descricao || '',
    valor: editing ? money(editing.valor) : '',
    informacao: editing?.informacao || '',
    parcela: editing?.parcela || 1,
    totalParcelas: editing?.totalParcelas || 1,
    categoriaId: editing?.categoriaId || '',
    paid: editing?.status === 1 || false,
    fixa: Boolean(editing?.despesa_fixa_id),
  });
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    await expenseService.save({
      id: editing?.id,
      vencimento: form.vencimento,
      descricao: form.descricao,
      categoriaId: form.categoriaId,
      valor: parseMoney(form.valor),
      informacao: form.informacao,
      parcela: Number(form.parcela),
      totalParcelas: Number(form.totalParcelas),
      paid: form.paid,
      fixa: form.fixa,
      editing,
    });
    setSaving(false);
    await onSaved();
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const cat = await categoryService.create(newCategory);
    setForm(prev => ({...prev, categoriaId: cat.id}));
    setNewCategory('');
  };

  return (
    <form className="workspace-form" onSubmit={submit}>
      <FormHeader title={editing ? 'Editar despesa' : 'Nova despesa'} onBack={onCancel} />
      <div className="form-grid">
        <label>Vencimento<input required type="date" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} /></label>
        <label>Valor<input required inputMode="numeric" value={form.valor} onChange={e => setForm({...form, valor: formatMoneyInput(e.target.value)})} placeholder="R$ 0,00" /></label>
        <label className="wide">Descricao<input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Nome da despesa" /></label>
        <label className="wide">Observacoes<input value={form.informacao} onChange={e => setForm({...form, informacao: e.target.value})} placeholder="Opcional" /></label>
        <label>Parcela atual<input min={1} type="number" value={form.parcela} onChange={e => setForm({...form, parcela: Number(e.target.value)})} /></label>
        <label>Total parcelas<input min={1} type="number" value={form.totalParcelas} onChange={e => setForm({...form, totalParcelas: Number(e.target.value)})} /></label>
        <label className="wide">Categoria
          <select required value={form.categoriaId} onChange={e => setForm({...form, categoriaId: e.target.value})}>
            <option value="">Selecione</option>
            {dashboard.categoria_despesas.map(cat => <option key={cat.id} value={cat.id}>{cat.descricao}</option>)}
          </select>
        </label>
        <div className="inline-create wide">
          <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nova categoria" />
          <button type="button" className="secondary" onClick={addCategory}><Plus size={16} /> Adicionar</button>
        </div>
        <label className="switch-line"><input type="checkbox" checked={form.fixa} onChange={e => setForm({...form, fixa: e.target.checked})} /> Despesa fixa</label>
        <label className="switch-line"><input type="checkbox" checked={form.paid} onChange={e => setForm({...form, paid: e.target.checked})} /> Ja foi paga</label>
      </div>
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

function ProfileView({onBack, onSaved}: {onBack: () => void; onSaved: () => Promise<void>}) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ganhos, setGanhos] = useState<ValorResumo[]>([]);

  useEffect(() => {
    userService.getUser().then(user => {
      setName(user?.name || '');
      setEmail(user?.email || '');
      setGanhos(normalizeGanhos(user?.ganhos_mensais));
      setLoading(false);
    });
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    await userService.updateProfile(name, email, ganhos);
    await onSaved();
  };

  return (
    <form className="workspace-form" onSubmit={save}>
      <FormHeader title="Dados pessoais" onBack={onBack} />
      {loading ? <p>Carregando...</p> : (
        <>
          <div className="form-grid">
            <label>Nome<input required value={name} onChange={e => setName(e.target.value)} /></label>
            <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          </div>
          <IncomeEditor ganhos={ganhos} setGanhos={setGanhos} title="Ganhos mensais recorrentes" />
          <DataPortability ganhos={ganhos} />
        </>
      )}
      <FormActions onCancel={onBack} />
    </form>
  );
}

function IncomeMonthView({dashboard, onBack, onSaved}: {dashboard: DashboardData; onBack: () => void; onSaved: () => Promise<void>}) {
  const [ganhos, setGanhos] = useState<ValorResumo[]>(normalizeGanhos(dashboard.mes_info.ganhos_mes));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    await monthService.updateGanhosMes(dashboard.mes_info, ganhos);
    await onSaved();
  };
  return (
    <form className="workspace-form" onSubmit={save}>
      <FormHeader title={`Ganhos de ${monthLabel(dashboard.mes_info.id)}`} onBack={onBack} />
      <IncomeEditor ganhos={ganhos} setGanhos={setGanhos} title="Entradas deste mes" />
      <FormActions onCancel={onBack} />
    </form>
  );
}

function IncomeEditor({ganhos, setGanhos, title}: {ganhos: ValorResumo[]; setGanhos: (items: ValorResumo[]) => void; title: string}) {
  const update = (index: number, patch: Partial<ValorResumo>) => {
    setGanhos(ganhos.map((item, idx) => idx === index ? {...item, ...patch, last_update: nowIso()} : item));
  };
  return (
    <section className="income-editor">
      <div className="section-heading">
        <h2>{title}</h2>
        <button type="button" className="secondary" onClick={() => setGanhos([...ganhos, {id: uuid(), descricao: '', valor: 0, dia_entrada: 1, add_date: nowIso(), last_update: nowIso()}])}><Plus size={16} /> Adicionar ganho</button>
      </div>
      {ganhos.map((item, index) => (
        <div className="income-row" key={item.id}>
          <input required value={item.descricao} onChange={e => update(index, {descricao: e.target.value})} placeholder="Descricao" />
          <input required inputMode="numeric" value={item.valor ? money(item.valor) : ''} onChange={e => update(index, {valor: parseMoney(formatMoneyInput(e.target.value))})} placeholder="R$ 0,00" />
          <input required type="number" min={1} max={31} value={item.dia_entrada || 1} onChange={e => update(index, {dia_entrada: Number(e.target.value)})} />
          <button type="button" className="icon-button danger" onClick={() => setGanhos(ganhos.filter((_, idx) => idx !== index))}><Trash2 size={16} /></button>
        </div>
      ))}
    </section>
  );
}

function FlowView({dashboard, onBack}: {dashboard: DashboardData; onBack: () => void}) {
  const ganhos = normalizeGanhos(dashboard.mes_info.ganhos_mes);
  const flow = [
    ...ganhos.filter(item => !item.logical_delete_date).map(item => ({
      id: `entrada-${item.id}`,
      date: `${dashboard.mes_info.id}-${String(item.dia_entrada || 1).padStart(2, '0')}`,
      type: 'Entrada',
      descricao: item.descricao,
      valor: item.valor,
    })),
    ...dashboard.despesas.map(item => ({
      id: `saida-${item.id}`,
      date: toInputDate(item.vencimento),
      type: 'Saida',
      descricao: item.descricao,
      valor: -item.valor,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  let balance = 0;
  const totalEntradas = ganhos.reduce((sum, item) => sum + item.valor, 0);
  const totalSaidas = dashboard.despesas.reduce((sum, item) => sum + item.valor, 0);

  return (
    <section className="workspace-form">
      <FormHeader title={`Fluxo de ${monthLabel(dashboard.mes_info.id)}`} onBack={onBack} />
      <div className="summary-grid flow-summary">
        <Metric label="Entradas" value={totalEntradas} />
        <Metric label="Saidas" value={totalSaidas} tone="bad" />
        <Metric label="Saldo previsto" value={totalEntradas - totalSaidas} tone={totalEntradas - totalSaidas >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="flow-list">
        {flow.map(item => {
          balance += item.valor;
          return (
            <div className="flow-row" key={item.id}>
              <div><strong>{dayLabel(item.date)}</strong><p>{item.type} · {item.descricao}</p></div>
              <div><strong className={item.valor >= 0 ? 'good-text' : 'bad-text'}>{money(Math.abs(item.valor))}</strong><p>Saldo {money(balance)}</p></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DataPortability({ganhos}: {ganhos: ValorResumo[]}) {
  const exportCsv = () => {
    const rows = [['descricao', 'valor', 'dia_entrada'], ...ganhos.map(item => [item.descricao, String(item.valor), String(item.dia_entrada || '')])];
    const blob = new Blob([rows.map(row => row.join(',')).join('\n')], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ganhos_mensais.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="portability">
      <h2>Exportar e importar dados</h2>
      <div className="toolbar-actions">
        <button type="button" className="secondary" onClick={exportCsv}><Download size={16} /> Exportar CSV</button>
        <label className="secondary file-button"><Upload size={16} /> Importar CSV<input type="file" accept=".csv" /></label>
      </div>
    </section>
  );
}

function FormHeader({title, onBack}: {title: string; onBack: () => void}) {
  return <div className="form-header"><button type="button" className="icon-button" onClick={onBack}><X size={18} /></button><h2>{title}</h2></div>;
}

function FormActions({saving, onCancel}: {saving?: boolean; onCancel: () => void}) {
  return (
    <div className="form-actions">
      <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
      <button className="primary" disabled={saving}><Save size={17} /> {saving ? 'Salvando...' : 'Salvar'}</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
