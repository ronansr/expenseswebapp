import {useEffect, useState} from 'react';
import {Wallet} from 'lucide-react';
import {useSession} from '../hooks/useSession';
import {useTheme} from '../hooks/useTheme';
import {useDashboard} from '../hooks/useDashboard';
import {useLedger} from '../hooks/useLedger';
import {useProfile} from '../hooks/useProfile';
import {Sidebar} from '../components/layout/Sidebar';
import {TopBar} from '../components/layout/TopBar';
import {MobileTabBar} from '../components/layout/MobileTabBar';
import {KpiSkeleton, RowsSkeleton} from '../components/ui/Skeleton';
import {LandingPage} from '../features/landing/LandingPage';
import {AuthScreen} from '../features/auth/AuthScreen';
import {OverviewPage} from '../features/overview/OverviewPage';
import {ExpensesPage} from '../features/expenses/ExpensesPage';
import {ExpenseFormModal} from '../features/expenses/ExpenseFormModal';
import {DeleteExpenseModal} from '../features/expenses/DeleteExpenseModal';
import {CalendarPage} from '../features/calendar/CalendarPage';
import {IncomePage} from '../features/income/IncomePage';
import {RecurringPage} from '../features/recurring/RecurringPage';
import {InstallmentsPage} from '../features/installments/InstallmentsPage';
import {CategoriesPage} from '../features/categories/CategoriesPage';
import {ReportsPage} from '../features/reports/ReportsPage';
import {PeoplePage} from '../features/people/PeoplePage';
import {GoalsPage} from '../features/goals/GoalsPage';
import {InvestmentsPage} from '../features/investments/InvestmentsPage';
import {ReservePage} from '../features/reserve/ReservePage';
import {ProfilePage} from '../features/profile/ProfilePage';
import {VIEW_TITLES, type ViewId} from './navigation';
import type {PageProps} from './pageProps';
import type {Despesa} from '../types';
import {initials, money} from '../lib/format';
import {aporteLiquidoMes, monthOverview, activeGains, reservaSaldo} from '../lib/selectors';

type Gate = 'landing' | 'auth';

export const App = () => {
  const {ready, authenticated, setAuthenticated} = useSession();
  const {theme, toggleTheme} = useTheme();
  const state = useDashboard(authenticated);
  const profile = useProfile(authenticated);
  const ledger = useLedger(authenticated);

  const [gate, setGate] = useState<Gate>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<ViewId>('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Despesa | null>(null);
  const [deleting, setDeleting] = useState<Despesa | null>(null);

  useEffect(() => {
    document.title = authenticated
      ? `SobControle, ${VIEW_TITLES[view].toLowerCase()}`
      : 'SobControle, controle de despesas';
  }, [authenticated, view]);

  if (!ready) {
    return (
      <div className="page" style={{maxWidth: 1180, margin: '0 auto'}}>
        <KpiSkeleton />
      </div>
    );
  }

  if (!authenticated) {
    if (gate === 'auth') {
      return (
        <AuthScreen
          initialMode={authMode}
          onAuthenticated={() => setAuthenticated(true)}
          onBack={() => setGate('landing')}
        />
      );
    }
    return (
      <LandingPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignIn={() => {
          setAuthMode('login');
          setGate('auth');
        }}
        onSignUp={() => {
          setAuthMode('register');
          setGate('auth');
        }}
      />
    );
  }

  const openNewExpense = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditExpense = (expense: Despesa) => {
    setEditing(expense);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const afterMutation = async () => {
    closeForm();
    setDeleting(null);
    await Promise.all([state.reload(), ledger.reload()]);
  };

  const signOut = () => {
    setAuthenticated(false);
    setGate('landing');
    setView('overview');
  };

  /* Metas e reserva mudam o saldo do mês, então o resumo é montado aqui, uma vez. */
  const overview = monthOverview({
    expenses: state.expenses,
    ganhos: state.dashboard ? activeGains(state.dashboard.mes_info.ganhos_mes) : [],
    aportesMes: aporteLiquidoMes(
      ledger.metaMovimentos,
      ledger.reservaMovimentos,
      state.mesId,
      ledger.investimentoMovimentos,
    ),
    reservaSaldo: reservaSaldo(ledger.reservaMovimentos),
  });

  const pageProps: PageProps | null = state.dashboard
    ? {
        dashboard: state.dashboard,
        state,
        ledger,
        overview,
        onNewExpense: openNewExpense,
        onEditExpense: openEditExpense,
        onDeleteExpense: setDeleting,
        onNavigate: setView,
      }
    : null;

  const subtitle = state.loading
    ? 'Carregando o mês...'
    : `${state.expenses.length} despesa(s), ${money(state.totals.total)}`;

  return (
    <div className="shell">
      <Sidebar view={view} onNavigate={setView} toPay={overview.proprias.toPay} />

      <div className="main">
        <TopBar
          mesId={state.mesId}
          subtitle={subtitle}
          refreshing={state.refreshing}
          theme={theme}
          initials={initials(profile?.name, profile?.email)}
          onShiftMonth={state.shiftMonth}
          onSelectMonth={state.goToMonth}
          onToday={state.goToCurrentMonth}
          onRefresh={state.refresh}
          onToggleTheme={toggleTheme}
          onNewExpense={openNewExpense}
          onProfile={() => setView('profile')}
        />

        <main className="page">
          {state.error && <p className="banner" role="alert">{state.error}</p>}
          {ledger.error && (
            <p className="banner" role="alert">
              {ledger.error} Se as tabelas de pessoas, metas e reserva ainda não existem, rode a migração em
              supabase/migrations no seu projeto Supabase.
            </p>
          )}

          {!pageProps ? (
            <>
              <KpiSkeleton />
              <div className="card"><RowsSkeleton /></div>
            </>
          ) : (
            <>
              {view === 'overview' && <OverviewPage {...pageProps} />}
              {view === 'expenses' && <ExpensesPage {...pageProps} />}
              {view === 'calendar' && <CalendarPage {...pageProps} />}
              {view === 'income' && <IncomePage {...pageProps} />}
              {view === 'recurring' && <RecurringPage {...pageProps} />}
              {view === 'installments' && <InstallmentsPage {...pageProps} />}
              {view === 'categories' && <CategoriesPage {...pageProps} />}
              {view === 'people' && <PeoplePage {...pageProps} />}
              {view === 'goals' && <GoalsPage {...pageProps} />}
              {view === 'investments' && <InvestmentsPage {...pageProps} />}
              {view === 'reserve' && <ReservePage {...pageProps} />}
              {view === 'reports' && <ReportsPage {...pageProps} />}
              {view === 'profile' && <ProfilePage {...pageProps} onSignOut={signOut} />}
            </>
          )}
        </main>
      </div>

      <MobileTabBar view={view} onNavigate={setView} onNewExpense={openNewExpense} />

      {formOpen && state.dashboard && (
        <ExpenseFormModal
          dashboard={state.dashboard}
          editing={editing}
          pessoas={ledger.pessoas}
          onClose={closeForm}
          onSaved={afterMutation}
        />
      )}

      {deleting && (
        <DeleteExpenseModal expense={deleting} onClose={() => setDeleting(null)} onDeleted={afterMutation} />
      )}
    </div>
  );
};

export const BootFallback = () => (
  <div className="boot" style={{display: 'grid', placeItems: 'center', minHeight: '100dvh', gap: 12}}>
    <Wallet size={22} />
    <p className="text-muted">Carregando o SobControle...</p>
  </div>
);
