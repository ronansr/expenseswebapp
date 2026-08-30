import {Receipt} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {ExpenseRow} from './ExpenseRow';
import {CategoryFilter} from './CategoryFilter';
import {categoryTotals, groupByDueDate} from '../../lib/selectors';
import {dayLabel, money} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

export const ExpensesPage = ({dashboard, state, ledger, onNewExpense, onEditExpense, onDeleteExpense}: PageProps) => {
  const groups = groupByDueDate(state.expenses);
  const totals = categoryTotals(dashboard);

  return (
    <div className="enter" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      <div className="toolbar">
        <CategoryFilter
          categorias={dashboard.categoria_despesas}
          totals={totals}
          selected={state.categoryFilter}
          onChange={state.setCategoryFilter}
          grandTotal={state.totals.total}
        />
        <span className="text-muted" style={{fontSize: 13}}>
          {state.expenses.length} despesa(s), {money(state.totals.total)} no total
        </span>
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt size={22} />}
            title="Nenhuma despesa neste mês"
            description="Cadastre um lançamento ou limpe o filtro de categorias para ver o que já existe."
            action={<button type="button" className="btn btn-primary" onClick={onNewExpense}>Nova despesa</button>}
          />
        </Card>
      ) : (
        groups.map(([day, items]) => (
          <section className="expense-group" key={day}>
            <div className="expense-day">
              <strong>{dayLabel(day)}</strong>
              <span className="money">{money(items.reduce((acc, item) => acc + item.valor, 0))}</span>
            </div>
            <Card>
              {items.map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categorias={dashboard.categoria_despesas}
                  pessoas={ledger.pessoas}
                  onEdit={onEditExpense}
                  onDelete={onDeleteExpense}
                  onChanged={state.reload}
                />
              ))}
            </Card>
          </section>
        ))
      )}
    </div>
  );
};

export const ExpensesCard = ({
  dashboard,
  state,
  ledger,
  onEditExpense,
  onDeleteExpense,
  onNewExpense,
}: PageProps) => {
  const groups = groupByDueDate(state.expenses).slice(0, 2);
  return (
    <Card>
      <CardHeader
        title="Despesas do mês"
        subtitle={`${state.expenses.length} lançamento(s)`}
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={onNewExpense}>Adicionar</button>}
      />
      <div style={{padding: '12px 0 0'}}>
        {groups.length === 0 ? (
          <EmptyState
            icon={<Receipt size={22} />}
            title="Mês ainda vazio"
            description="Comece cadastrando as contas que vencem neste mês."
          />
        ) : (
          groups.map(([day, items]) => (
            <div key={day}>
              <div className="expense-day" style={{padding: '10px 20px 6px'}}>
                <strong>{dayLabel(day)}</strong>
                <span className="money">{money(items.reduce((acc, item) => acc + item.valor, 0))}</span>
              </div>
              {items.map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categorias={dashboard.categoria_despesas}
                  pessoas={ledger.pessoas}
                  onEdit={onEditExpense}
                  onDelete={onDeleteExpense}
                  onChanged={state.reload}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
