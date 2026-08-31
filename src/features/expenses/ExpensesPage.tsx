import {useMemo, useState} from 'react';
import {CheckSquare, Receipt, X} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {ExpenseRow} from './ExpenseRow';
import {CategoryFilter} from './CategoryFilter';
import {SelectionBar} from './SelectionBar';
import {categoryTotals, groupByDueDate, STATUS_PAID} from '../../lib/selectors';
import {dayLabel, money} from '../../lib/format';
import type {Despesa} from '../../types';
import type {PageProps} from '../../app/pageProps';

export const ExpensesPage = ({
  dashboard,
  state,
  ledger,
  onNewExpense,
  onEditExpense,
  onDeleteExpense,
}: PageProps) => {
  const [selecionando, setSelecionando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  const groups = groupByDueDate(state.expenses);
  const totals = categoryTotals(dashboard);

  /**
   * Somar despesa na mão é o atrito que a seleção resolve, então o resumo já
   * quebra o total entre o que está pago e o que ainda vai sair da conta.
   */
  const resumo = useMemo(() => {
    const escolhidas = state.expenses.filter(item => selecionadas.includes(item.id));
    const pagas = escolhidas.filter(item => item.status === STATUS_PAID);
    const total = escolhidas.reduce((acc, item) => acc + item.valor, 0);
    const pago = pagas.reduce((acc, item) => acc + item.valor, 0);
    return {quantidade: escolhidas.length, total, pago, aPagar: total - pago};
  }, [state.expenses, selecionadas]);

  const alternar = (expense: Despesa) =>
    setSelecionadas(current =>
      current.includes(expense.id) ? current.filter(id => id !== expense.id) : [...current, expense.id],
    );

  const alternarDia = (itens: Despesa[]) => {
    const ids = itens.map(item => item.id);
    const todasMarcadas = ids.every(id => selecionadas.includes(id));
    setSelecionadas(current =>
      todasMarcadas
        ? current.filter(id => !ids.includes(id))
        : Array.from(new Set([...current, ...ids])),
    );
  };

  const sairDaSelecao = () => {
    setSelecionando(false);
    setSelecionadas([]);
  };

  const selecionarTudo = () => setSelecionadas(state.expenses.map(item => item.id));

  return (
    <div className="enter page-stack">
      <div className="toolbar">
        <CategoryFilter
          categorias={dashboard.categoria_despesas}
          totals={totals}
          selected={state.categoryFilter}
          onChange={state.setCategoryFilter}
          grandTotal={state.totals.total}
        />

        <button
          type="button"
          className={`btn btn-ghost ${selecionando ? 'is-active' : ''}`.trim()}
          onClick={() => (selecionando ? sairDaSelecao() : setSelecionando(true))}
          aria-pressed={selecionando}>
          {selecionando ? <X size={16} /> : <CheckSquare size={16} />}
          {selecionando ? 'Sair da seleção' : 'Selecionar'}
        </button>

        <span className="toolbar-note">
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
        groups.map(([day, items]) => {
          const todasDoDia = items.every(item => selecionadas.includes(item.id));
          return (
            <section className="expense-group" key={day}>
              <div className="expense-day">
                {selecionando && (
                  <label className="expense-day-select">
                    <input
                      type="checkbox"
                      checked={todasDoDia}
                      onChange={() => alternarDia(items)}
                      aria-label={`Selecionar as despesas de ${dayLabel(day)}`}
                    />
                  </label>
                )}
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
                    selectable={selecionando}
                    selected={selecionadas.includes(expense.id)}
                    onToggleSelect={alternar}
                  />
                ))}
              </Card>
            </section>
          );
        })
      )}

      {selecionando && (
        <SelectionBar
          quantidade={resumo.quantidade}
          total={resumo.total}
          pago={resumo.pago}
          aPagar={resumo.aPagar}
          onSelectAll={selecionarTudo}
          onClear={() => setSelecionadas([])}
          onExit={sairDaSelecao}
        />
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
      <div className="card-list">
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
