import type {useDashboard} from '../hooks/useDashboard';
import type {LedgerState} from '../hooks/useLedger';
import type {MonthOverview} from '../lib/selectors';
import type {DashboardData, Despesa} from '../types';
import type {ViewId} from './navigation';

export type DashboardState = ReturnType<typeof useDashboard>;

export type PageProps = {
  dashboard: DashboardData;
  state: DashboardState;
  ledger: LedgerState;
  overview: MonthOverview;
  onNewExpense: () => void;
  onEditExpense: (expense: Despesa) => void;
  onDeleteExpense: (expense: Despesa) => void;
  onNavigate: (view: ViewId) => void;
};
