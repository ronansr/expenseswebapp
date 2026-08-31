import {ChevronLeft, ChevronRight, Moon, Plus, RefreshCw, Sun} from 'lucide-react';
import {MonthPicker} from './MonthPicker';
import type {Theme} from '../../hooks/useTheme';

type Props = {
  mesId: string;
  subtitle: string;
  refreshing: boolean;
  theme: Theme;
  initials: string;
  onShiftMonth: (amount: number) => void;
  onSelectMonth: (mesId: string) => void;
  onToday: () => void;
  onRefresh: () => void;
  onToggleTheme: () => void;
  onNewExpense: () => void;
  onProfile: () => void;
};

export const TopBar = ({
  mesId,
  subtitle,
  refreshing,
  theme,
  initials,
  onShiftMonth,
  onSelectMonth,
  onToday,
  onRefresh,
  onToggleTheme,
  onNewExpense,
  onProfile,
}: Props) => (
  <header className="topbar">
    <div className="month-nav">
      <button type="button" className="icon-btn" onClick={() => onShiftMonth(-1)} aria-label="Mês anterior">
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="icon-btn" onClick={() => onShiftMonth(1)} aria-label="Próximo mês">
        <ChevronRight size={18} />
      </button>
    </div>

    <MonthPicker mesId={mesId} subtitle={subtitle} onSelect={onSelectMonth} />

    <div className="topbar-actions">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onToday}>Hoje</button>
      <button type="button" className="icon-btn" onClick={onRefresh} aria-label="Atualizar dados">
        <RefreshCw size={17} className={refreshing ? 'spin' : undefined} />
      </button>
      <button
        type="button"
        className="icon-btn theme-toggle"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <button type="button" className="btn btn-primary" onClick={onNewExpense}>
        <Plus size={17} />
        <span className="lancamento-label">Lançamento</span>
      </button>
      <button type="button" className="avatar" onClick={onProfile} aria-label="Perfil e configurações">
        {initials}
      </button>
    </div>
  </header>
);
