import {useMemo, useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {ExpenseRow} from '../expenses/ExpenseRow';
import {calendarCells} from '../../lib/selectors';
import {compactMoney, dayLabel, firstWeekdayOffset, isSameDayAsToday, money, toInputDate} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

const DOW = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

export const CalendarPage = ({dashboard, state, ledger, onEditExpense, onDeleteExpense, onNewExpense}: PageProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const cells = useMemo(
    () => calendarCells(dashboard, firstWeekdayOffset(state.mesId)),
    [dashboard, state.mesId],
  );
  const dayExpenses = selected
    ? state.expenses.filter(item => toInputDate(item.vencimento) === selected)
    : [];

  return (
    <div className="enter" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      <Card>
        <CardHeader
          title="Calendário do mês"
          subtitle="Verde e entrada, vermelho e saída. Toque em um dia para ver os lançamentos."
        />
        <div className="card-body">
          <div className="cal-grid" role="grid">
            {DOW.map(day => (
              <div className="cal-dow" key={day}>{day}</div>
            ))}
            {cells.map(cell =>
              cell.day === null ? (
                <div className="cal-day is-outside" key={cell.key} aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  key={cell.key}
                  className={[
                    'cal-day',
                    isSameDayAsToday(cell.dateInput) ? 'is-today' : '',
                    selected === cell.dateInput ? 'is-selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelected(current => (current === cell.dateInput ? null : cell.dateInput))}
                  aria-pressed={selected === cell.dateInput}>
                  <span className="cal-num">{cell.day}</span>
                  {cell.entradas > 0 && <span className="cal-in">+{compactMoney(cell.entradas)}</span>}
                  {cell.saidas > 0 && <span className="cal-out">-{compactMoney(cell.saidas)}</span>}
                </button>
              ),
            )}
          </div>
        </div>
      </Card>

      {selected && (
        <Card>
          <CardHeader
            title={dayLabel(selected)}
            subtitle={`${dayExpenses.length} despesa(s), ${money(dayExpenses.reduce((acc, item) => acc + item.valor, 0))}`}
          />
          <div style={{marginTop: 12}}>
            {dayExpenses.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={22} />}
                title="Sem despesas neste dia"
                description="Nenhum lançamento vence nesta data."
                action={<button type="button" className="btn btn-ghost" onClick={onNewExpense}>Nova despesa</button>}
              />
            ) : (
              dayExpenses.map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categorias={dashboard.categoria_despesas}
                  pessoas={ledger.pessoas}
                  onEdit={onEditExpense}
                  onDelete={onDeleteExpense}
                  onChanged={state.reload}
                />
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
